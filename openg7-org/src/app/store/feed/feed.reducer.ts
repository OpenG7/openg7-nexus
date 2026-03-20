import { createReducer, on } from '@ngrx/store';

import {
  FeedFilterState,
  FeedItem,
  FeedRealtimeEnvelope,
  FeedSnapshot,
} from '../../domains/feed/feature/models/feed.models';

import { FeedActions } from './feed.actions';

export interface FeedState {
  readonly items: readonly FeedItem[];
  readonly itemIndex: Readonly<Record<string, number>>;
  readonly loading: boolean;
  readonly error: string | null;
  readonly cursor: string | null;
  readonly filters: FeedFilterState;
  readonly connected: boolean;
  readonly reconnecting: boolean;
  readonly connectionError: string | null;
  readonly optimisticMap: Readonly<Record<string, string>>; // tempId -> idempotencyKey
  readonly onboardingSeen: boolean;
  readonly drawerItemId: string | null;
  readonly hydrated: boolean;
  readonly unseenIds: readonly string[];
  readonly localPublishedIds: readonly string[];
}

const INITIAL_FILTERS: FeedFilterState = {
  fromProvinceId: null,
  toProvinceId: null,
  sectorId: null,
  category: null,
  type: null,
  mode: 'BOTH',
  sort: 'NEWEST',
  search: '',
};

const INITIAL_STATE: FeedState = {
  items: [],
  itemIndex: {},
  loading: false,
  error: null,
  cursor: null,
  filters: INITIAL_FILTERS,
  connected: false,
  reconnecting: false,
  connectionError: null,
  optimisticMap: {},
  onboardingSeen: false,
  drawerItemId: null,
  hydrated: false,
  unseenIds: [],
  localPublishedIds: [],
};

export const feedReducer = createReducer(
  INITIAL_STATE,
  on(FeedActions.loadInitial, state => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(FeedActions.loadPage, (state, { append }) => ({
    ...state,
    loading: true,
    error: null,
    items: append ? state.items : [],
    itemIndex: append ? state.itemIndex : {},
  })),
  on(FeedActions.loadSuccess, (state, { items, cursor, append }) => ({
    ...state,
    loading: false,
    error: null,
    cursor,
    ...mergeItems(append ? state.items : [], append ? state.itemIndex : {}, items),
    hydrated: true,
    unseenIds: append ? state.unseenIds : [],
    localPublishedIds: append ? state.localPublishedIds : [],
  })),
  on(FeedActions.loadFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(FeedActions.receiveRealtimeEnvelope, (state, { envelope }) =>
    reduceRealtimeEnvelope(state, envelope)
  ),
  on(FeedActions.applyFilters, (state, { filters }) => ({
    ...state,
    filters,
  })),
  on(FeedActions.optimisticPublish, (state, { item, idempotencyKey }) => {
    const optimisticId = `optimistic-${idempotencyKey}`;
    const optimisticItem = { ...item, id: optimisticId, status: 'pending' as const };
    const optimisticMap = { ...state.optimisticMap, [optimisticId]: idempotencyKey };
    const items = [optimisticItem, ...state.items];
    return {
      ...state,
      items,
      itemIndex: createItemIndex(items),
      optimisticMap,
      unseenIds: state.unseenIds.includes(optimisticId)
        ? state.unseenIds
        : [optimisticId, ...state.unseenIds],
    };
  }),
  on(FeedActions.publishSuccess, (state, { tempId, item }) => {
    const { [tempId]: _, ...optimisticMap } = state.optimisticMap;
    const items = state.items.map(existing =>
      existing.id === tempId ? { ...item, status: 'confirmed' as const } : existing
    );
    return {
      ...state,
      items,
      itemIndex: createItemIndex(items),
      optimisticMap,
      unseenIds: state.unseenIds.filter(id => id !== tempId && id !== item.id),
      localPublishedIds: state.localPublishedIds.includes(item.id)
        ? state.localPublishedIds
        : [item.id, ...state.localPublishedIds].slice(0, 50),
    };
  }),
  on(FeedActions.publishFailure, (state, { tempId, error }) => {
    if (!state.items.some(item => item.id === tempId)) {
      return state;
    }
    const items = state.items.map(item =>
      item.id === tempId ? { ...item, status: 'failed' as const, accessibilitySummary: error } : item
    );
    return {
      ...state,
      items,
      optimisticMap: state.optimisticMap,
    };
  }),
  on(FeedActions.setConnectionError, (state, { error }) => ({
    ...state,
    connectionError: error,
  })),
  on(FeedActions.setConnectionStatus, (state, { connected, reconnecting }) => ({
    ...state,
    connected,
    reconnecting,
  })),
  on(FeedActions.hydrateSnapshot, (state, { snapshot }) => ({
    ...state,
    items: snapshot.items,
    itemIndex: createItemIndex(snapshot.items),
    cursor: snapshot.cursor,
    filters: snapshot.filters,
    onboardingSeen: snapshot.onboardingSeen,
    hydrated: true,
    localPublishedIds: [],
  })),
  on(FeedActions.markOnboardingSeen, state => ({
    ...state,
    onboardingSeen: true,
  })),
  on(FeedActions.openDrawer, (state, { itemId }) => ({
    ...state,
    drawerItemId: itemId,
  }))
);

function mergeItems(
  current: readonly FeedItem[],
  currentIndex: Readonly<Record<string, number>>,
  next: readonly FeedItem[]
): { items: readonly FeedItem[]; itemIndex: Readonly<Record<string, number>> } {
  if (!next.length) {
    return { items: current, itemIndex: currentIndex };
  }

  const dedupedNext: FeedItem[] = [];
  const seenNext = new Map<string, FeedItem>();
  for (const item of next) {
    if (!item?.id) {
      continue;
    }
    const existing = seenNext.get(item.id);
    if (!existing || shouldReplace(existing, item)) {
      seenNext.set(item.id, item);
    }
  }
  dedupedNext.push(...seenNext.values());

  if (!dedupedNext.length) {
    return { items: current, itemIndex: currentIndex };
  }

  const items = current.slice();
  const indexLookup = new Map<string, number>();
  current.forEach((item, idx) => {
    if (item?.id) {
      indexLookup.set(item.id, idx);
    }
  });

  const rebuildIndexLookup = () => {
    indexLookup.clear();
    items.forEach((item, idx) => {
      if (item?.id) {
        indexLookup.set(item.id, idx);
      }
    });
  };

  let mutated = false;

  for (const item of dedupedNext) {
    const itemId = item.id;
    const existingIndex = indexLookup.get(itemId);

    if (existingIndex === undefined) {
      const insertAt = findInsertIndex(items, item.createdAt);
      items.splice(insertAt, 0, item);
      mutated = true;
      rebuildIndexLookup();
      continue;
    }

    const existingItem = items[existingIndex];
    if (!shouldReplace(existingItem, item)) {
      continue;
    }

    const createdAtChanged = (existingItem.createdAt ?? '') !== (item.createdAt ?? '');

    if (createdAtChanged) {
      items.splice(existingIndex, 1);
      const insertAt = findInsertIndex(items, item.createdAt);
      items.splice(insertAt, 0, item);
      rebuildIndexLookup();
    } else {
      items[existingIndex] = item;
      indexLookup.set(itemId, existingIndex);
    }
    mutated = true;
  }

  if (!mutated) {
    return { items: current, itemIndex: currentIndex };
  }

  const normalizedItems = items.slice();
  return {
    items: normalizedItems,
    itemIndex: createItemIndex(normalizedItems),
  };
}

function reduceRealtimeEnvelope(state: FeedState, envelope: FeedRealtimeEnvelope): FeedState {
  const { payload, type, cursor } = envelope;
  switch (type) {
    case 'feed.item.created': {
      const item = payload as FeedItem;
      const merged = mergeItems(state.items, state.itemIndex, [item]);
      const isLocalPublish = state.localPublishedIds.includes(item.id);
      return {
        ...state,
        ...merged,
        cursor: cursor ?? state.cursor,
        unseenIds: isLocalPublish || state.unseenIds.includes(item.id)
          ? state.unseenIds
          : [item.id, ...state.unseenIds].slice(0, 200),
        localPublishedIds: isLocalPublish
          ? state.localPublishedIds.filter(id => id !== item.id)
          : state.localPublishedIds,
      };
    }
    case 'feed.item.updated': {
      const item = payload as FeedItem;
      return {
        ...state,
        ...mergeItems(state.items, state.itemIndex, [item]),
      };
    }
    case 'feed.item.deleted': {
      const item = payload as FeedItem;
      const items = state.items.filter(existing => existing.id !== item.id);
      return {
        ...state,
        items,
        itemIndex: createItemIndex(items),
        unseenIds: state.unseenIds.filter(id => id !== item.id),
        localPublishedIds: state.localPublishedIds.filter(id => id !== item.id),
      };
    }
    default:
      return state;
  }
}

function createItemIndex(items: readonly FeedItem[]): Readonly<Record<string, number>> {
  const index: Record<string, number> = {};
  items.forEach((item, position) => {
    if (item?.id) {
      index[item.id] = position;
    }
  });
  return index;
}

function shouldReplace(existing: FeedItem, incoming: FeedItem): boolean {
  const incomingUpdatedAt = incoming.updatedAt ?? null;
  const existingUpdatedAt = existing.updatedAt ?? null;

  if (!incomingUpdatedAt) {
    return false;
  }

  if (!existingUpdatedAt) {
    return true;
  }

  return incomingUpdatedAt > existingUpdatedAt;
}

function findInsertIndex(items: readonly FeedItem[], createdAt: string | undefined | null): number {
  const target = createdAt ?? '';
  let low = 0;
  let high = items.length;

  while (low < high) {
    const mid = (low + high) >>> 1;
    const midValue = items[mid]?.createdAt ?? '';
    if (midValue.localeCompare(target) > 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

export function toFeedSnapshot(state: FeedState): FeedSnapshot {
  return {
    items: state.items,
    cursor: state.cursor,
    filters: state.filters,
    onboardingSeen: state.onboardingSeen,
  };
}
