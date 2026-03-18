import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import {
  DestroyRef,
  Injectable,
  NgZone,
  PLATFORM_ID,
  TransferState,
  computed,
  effect,
  inject,
  makeStateKey,
} from '@angular/core';
import { FEATURE_FLAGS } from '@app/core/config/environment.tokens';
import { API_URL } from '@app/core/config/environment.tokens';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import { selectCatalogFeedItems } from '@app/state/catalog/catalog.selectors';
import {
  feedModeSig,
  feedSearchSig,
  feedSortSig,
  feedTypeSig,
  focusItemIdSig,
  fromProvinceIdSig,
  sectorIdSig,
  toProvinceIdSig,
} from '@app/state/shared-feed-signals';
import { FeedActions } from '@app/store/feed/feed.actions';
import { toFeedSnapshot } from '@app/store/feed/feed.reducer';
import {
  selectFeedConnectionState,
  selectFeedDrawerItemId,
  selectFeedCursor,
  selectFeedError,
  selectFeedFilters,
  selectFeedHydrated,
  selectFeedLoading,
  selectFeedItems,
  selectFeedOnboardingSeen,
  selectFeedState,
  selectFeedUnreadCount,
} from '@app/store/feed/feed.selectors';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
  FeedComposerDraft,
  FeedComposerValidationResult,
  FeedFilterState,
  FeedItem,
  FeedOriginType,
  FeedPublishOutcome,
  FeedRealtimeEnvelope,
  FeedSnapshot,
} from '../models/feed.models';

const STREAM_ENDPOINT = '/api/feed/stream';
const COLLECTION_ENDPOINT = '/api/feed';
const TRANSFER_STATE_KEY = makeStateKey<FeedSnapshot>('OG7_FEED_SNAPSHOT');
const MODERATION_TERMS = ['spam', 'fake', 'fraud'];
const MOCK_PAGE_LIMIT = 20;
const CATALOG_MOCK_PATH = 'assets/mocks/catalog.mock.json';

interface ItemResponse {
  readonly data: FeedItem | FeedItem[];
  readonly cursor?: string | null;
}

interface CatalogMockResponse {
  readonly feedItems?: readonly FeedItem[];
}

interface PublishContext {
  readonly normalizedDraft: FeedComposerDraft;
  readonly idempotencyKey: string;
  readonly optimisticItem: FeedItem;
}

@Injectable({ providedIn: 'root' })
export class FeedRealtimeService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(Store);
  private readonly zone = inject(NgZone);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly apiUrl = (inject(API_URL, { optional: true }) ?? '').replace(/\/$/, '');
  private readonly featureFlags = inject(FEATURE_FLAGS, { optional: true });
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly notifications = injectNotificationStore();
  private readonly translate = inject(TranslateService);
  private readonly useMockFeed = Boolean(
    this.featureFlags?.['feedMocks'] ?? this.featureFlags?.['homeFeedMocks']
  );

  private eventSource: EventSource | null = null;
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly seenEventIds: string[] = [];
  private connectionNotifiedDown = false;
  private lastFetchedFilters: FeedFilterState | null = null;
  private mockFeedCache: readonly FeedItem[] | null = null;
  private mockFeedRequest: Promise<readonly FeedItem[]> | null = null;

  private readonly catalogFeedItemsSig = this.store.selectSignal(selectCatalogFeedItems);
  private readonly filtersSig = this.store.selectSignal(selectFeedFilters);
  private readonly cursorSig = this.store.selectSignal(selectFeedCursor);
  private readonly hydratedSig = this.store.selectSignal(selectFeedHydrated);
  private readonly unreadSig = this.store.selectSignal(selectFeedUnreadCount);
  private readonly connectionSig = this.store.selectSignal(selectFeedConnectionState);
  private readonly itemsSig = this.store.selectSignal(selectFeedItems);
  private readonly loadingSig = this.store.selectSignal(selectFeedLoading);
  private readonly errorSig = this.store.selectSignal(selectFeedError);
  private readonly drawerSig = this.store.selectSignal(selectFeedDrawerItemId);
  private readonly stateSig = this.store.selectSignal(selectFeedState);
  private readonly onboardingSeenSig = this.store.selectSignal(selectFeedOnboardingSeen);

  readonly items = this.itemsSig;
  readonly loading = this.loadingSig;
  readonly error = this.errorSig;
  readonly onboardingSeen = this.onboardingSeenSig;

  readonly connectionState = {
    connected: computed(() => this.connectionSig().connected),
    reconnecting: computed(() => this.connectionSig().reconnecting),
    error: computed(() => this.connectionSig().error),
  };

  constructor() {
    const snapshot = this.transferState.get(TRANSFER_STATE_KEY, null);
    if (snapshot) {
      this.store.dispatch(FeedActions.hydrateSnapshot({ snapshot }));
      if (this.browser) {
        this.transferState.remove(TRANSFER_STATE_KEY);
      }
    }

    if (!this.browser) {
      effect(
        () => {
          const snapshot = toFeedSnapshot(this.stateSig());
          this.transferState.set(TRANSFER_STATE_KEY, snapshot);
        },
        { allowSignalWrites: true }
      );
    }

    effect(
      () => {
        const filters = this.filtersSig();
        this.updateSignalIfChanged(fromProvinceIdSig, filters.fromProvinceId);
        this.updateSignalIfChanged(toProvinceIdSig, filters.toProvinceId);
        this.updateSignalIfChanged(sectorIdSig, filters.sectorId);
        this.updateSignalIfChanged(feedTypeSig, filters.type);
        this.updateSignalIfChanged(feedModeSig, filters.mode);
        this.updateSignalIfChanged(feedSearchSig, filters.search);
        this.updateSignalIfChanged(feedSortSig, filters.sort);
      },
      { allowSignalWrites: true }
    );

    effect(
      () => {
        const filters: FeedFilterState = {
          fromProvinceId: fromProvinceIdSig(),
          toProvinceId: toProvinceIdSig(),
          sectorId: sectorIdSig(),
          type: feedTypeSig(),
          mode: feedModeSig(),
          sort: feedSortSig(),
          search: feedSearchSig(),
        };
        const current = this.filtersSig();
        if (!this.equalFilters(current, filters)) {
          this.store.dispatch(FeedActions.applyFilters({ filters }));
        }
      },
      { allowSignalWrites: true }
    );

    effect(() => {
      const hydrated = this.hydratedSig();
      const filters = this.filtersSig();
      if (!hydrated) {
        this.lastFetchedFilters = filters;
        return;
      }
      if (this.lastFetchedFilters && this.equalFilters(this.lastFetchedFilters, filters)) {
        return;
      }
      this.lastFetchedFilters = filters;
      this.fetchPage({ replace: true });
    });

    effect(
      () => {
        const itemId = this.drawerSig();
        if (focusItemIdSig() !== itemId) {
          focusItemIdSig.set(itemId);
        }
      },
      { allowSignalWrites: true }
    );

    if (this.browser) {
      if (this.useMockFeed) {
        this.store.dispatch(FeedActions.setConnectionStatus({ connected: true, reconnecting: false }));
        this.store.dispatch(FeedActions.setConnectionError({ error: null }));
      } else {
        this.connect();
      }
    }

    this.destroyRef.onDestroy(() => this.teardown());
  }

  hasHydrated(): boolean {
    return this.hydratedSig();
  }

  unreadCount(): number {
    return this.unreadSig();
  }

  connectionError(): string | null {
    return this.connectionSig().error;
  }

  loadInitial(): void {
    this.fetchPage({ replace: true });
  }

  loadMore(): void {
    const cursor = this.cursorSig();
    if (!cursor) {
      return;
    }
    this.fetchPage({ cursor, append: true });
  }

  reload(): void {
    this.fetchPage({ replace: true });
    this.refreshConnection();
  }

  async findItemById(itemId: string): Promise<FeedItem | null> {
    const normalizedId = itemId.trim();
    if (!normalizedId) {
      return null;
    }

    const existing = this.itemsSig().find(item => item.id === normalizedId);
    if (existing) {
      return this.normalizeItem(existing);
    }

    if (this.useMockFeed) {
      return this.resolveMockItemById(normalizedId);
    }

    const encodedId = encodeURIComponent(normalizedId);
    const url = this.composeUrl(`${COLLECTION_ENDPOINT}/${encodedId}`);

    try {
      const response = await firstValueFrom(this.http.get<ItemResponse | FeedItem>(url));
      return this.normalizeItemResponse(response);
    } catch (error) {
      const status = error instanceof HttpErrorResponse ? error.status : null;
      if (status === 0 || status === 401 || status === 403 || status === 404) {
        const fallbackItem = await this.resolveMockItemById(normalizedId);
        if (fallbackItem) {
          return fallbackItem;
        }
      }
      throw error;
    }
  }

  openDrawer(itemId: string | null): void {
    focusItemIdSig.set(itemId);
    this.store.dispatch(FeedActions.openDrawer({ itemId }));
  }

  markOnboardingSeen(): void {
    this.store.dispatch(FeedActions.markOnboardingSeen());
  }

  validateDraft(draft: FeedComposerDraft): FeedComposerValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const title = draft.title?.trim() ?? '';
    const summary = draft.summary?.trim() ?? '';
    if (!draft.type) {
      errors.push('feed.validation.typeRequired');
    }
    if (!draft.sectorId) {
      errors.push('feed.validation.sectorRequired');
    }
    if (title.length < 3) {
      errors.push('feed.validation.titleTooShort');
    }
    if (title.length > 160) {
      errors.push('feed.validation.titleTooLong');
    }
    if (summary.length < 10) {
      errors.push('feed.validation.summaryTooShort');
    }
    if (summary.length > 5000) {
      errors.push('feed.validation.summaryTooLong');
    }
    if (draft.quantity?.value !== undefined && draft.quantity?.value !== null) {
      if (!Number.isFinite(draft.quantity.value) || draft.quantity.value <= 0) {
        errors.push('feed.validation.quantityInvalid');
      }
      if (!draft.quantity.unit) {
        errors.push('feed.validation.quantityUnitRequired');
      }
    }
    const originType = this.normalizeOriginType(draft.originType);
    const originId = this.normalizeOriginId(draft.originId);
    if ((originType && !originId) || (!originType && originId)) {
      errors.push('feed.validation.originIncomplete');
    }
    if (draft.mode !== 'BOTH' && (!draft.fromProvinceId || !draft.toProvinceId)) {
      warnings.push('feed.validation.routeIncomplete');
    }
    const moderationText = `${title} ${summary}`.toLowerCase();
    for (const term of MODERATION_TERMS) {
      if (moderationText.includes(term)) {
        warnings.push('feed.validation.moderationFlag');
        break;
      }
    }
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  publish(draft: FeedComposerDraft): FeedComposerValidationResult {
    const validation = this.validateDraft(draft);
    if (!validation.valid) {
      return validation;
    }
    const context = this.createPublishContext(draft);
    this.store.dispatch(
      FeedActions.optimisticPublish({
        draft: context.normalizedDraft,
        item: context.optimisticItem,
        idempotencyKey: context.idempotencyKey,
      })
    );
    if (this.useMockFeed) {
      const confirmedItem = this.buildMockConfirmedItem(context.optimisticItem);
      this.cacheMockItem(confirmedItem);
      this.handlePublishSuccess({
        tempId: context.optimisticItem.id,
        item: confirmedItem,
        source: 'mock',
      });
      return validation;
    }
    const url = this.composeUrl(COLLECTION_ENDPOINT);
    const headers = new HttpHeaders({ 'Idempotency-Key': context.idempotencyKey });
    this.http.post<ItemResponse | FeedItem>(url, context.normalizedDraft, { headers }).subscribe({
      next: response => {
        const item = this.normalizeItemResponse(response);
        this.handlePublishSuccess({
          tempId: context.optimisticItem.id,
          item,
        });
      },
      error: error => {
        const message = this.extractError(error);
        this.handlePublishFailure({
          tempId: context.optimisticItem.id,
          error: message,
          context: error,
        });
      },
    });
    return validation;
  }

  async publishDraft(draft: FeedComposerDraft): Promise<FeedPublishOutcome> {
    const validation = this.validateDraft(draft);
    if (!validation.valid) {
      return {
        status: 'validation-error',
        validation,
      };
    }

    const context = this.createPublishContext(draft);
    this.store.dispatch(
      FeedActions.optimisticPublish({
        draft: context.normalizedDraft,
        item: context.optimisticItem,
        idempotencyKey: context.idempotencyKey,
      })
    );

    if (this.useMockFeed) {
      const confirmedItem = this.buildMockConfirmedItem(context.optimisticItem);
      this.cacheMockItem(confirmedItem);
      this.handlePublishSuccess({
        tempId: context.optimisticItem.id,
        item: confirmedItem,
        source: 'mock',
      });
      return {
        status: 'success',
        validation,
        item: confirmedItem,
      };
    }

    const url = this.composeUrl(COLLECTION_ENDPOINT);
    const headers = new HttpHeaders({ 'Idempotency-Key': context.idempotencyKey });

    try {
      const response = await firstValueFrom(
        this.http.post<ItemResponse | FeedItem>(url, context.normalizedDraft, { headers })
      );
      const item = this.normalizeItemResponse(response);
      this.handlePublishSuccess({
        tempId: context.optimisticItem.id,
        item,
      });
      return {
        status: 'success',
        validation,
        item,
      };
    } catch (error) {
      const message = this.extractError(error);
      this.handlePublishFailure({
        tempId: context.optimisticItem.id,
        error: message,
        context: error,
      });
      return {
        status: 'request-error',
        validation,
        error: message,
      };
    }
  }

  refreshConnection(): void {
    if (!this.browser || this.useMockFeed) {
      return;
    }
    this.scheduleReconnect(0);
  }

  private createPublishContext(draft: FeedComposerDraft): PublishContext {
    this.markOnboardingSeen();
    const normalizedDraft = this.normalizeDraft(draft);
    const idempotencyKey = this.generateIdempotencyKey();
    const optimisticItem = this.buildOptimisticItem(normalizedDraft, idempotencyKey);
    return {
      normalizedDraft,
      idempotencyKey,
      optimisticItem,
    };
  }

  private buildMockConfirmedItem(item: FeedItem): FeedItem {
    return {
      ...item,
      id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'confirmed',
      optimisticIdempotencyKey: undefined,
    };
  }

  private cacheMockItem(item: FeedItem): void {
    const existing = this.mockFeedCache ?? [];
    const withoutDuplicate = existing.filter(entry => entry.id !== item.id);
    this.mockFeedCache = [item, ...withoutDuplicate];
  }

  private handlePublishSuccess(options: {
    tempId: string;
    item: FeedItem;
    source?: 'api' | 'mock';
  }): void {
    const { tempId, item, source = 'api' } = options;
    this.store.dispatch(FeedActions.publishSuccess({ tempId, item }));
    this.emitAnalytics('feed.item.publish', {
      itemId: item.id,
      type: item.type,
      ...(source === 'mock' ? { source: 'mock' } : {}),
    });
    this.notifications.success(this.translate.instant('feed.notifications.publishSuccess'), {
      source: 'feed',
      metadata: {
        itemId: item.id,
        type: item.type,
        ...(source === 'mock' ? { source: 'mock' } : {}),
      },
    });
  }

  private handlePublishFailure(options: {
    tempId: string;
    error: string;
    context: unknown;
  }): void {
    const { tempId, error, context } = options;
    this.store.dispatch(FeedActions.publishFailure({ tempId, error }));
    this.emitAnalytics('feed.item.publish.failed', { reason: error });
    this.notifications.error(this.translate.instant('feed.notifications.publishFailure', { reason: error }), {
      source: 'feed',
      context,
      metadata: { reason: error },
      deliver: { email: true },
    });
  }

  private fetchPage(options: { cursor?: string | null; append?: boolean; replace?: boolean }): void {
    const { cursor, append, replace } = options;
    const filters = this.filtersSig();
    const params = this.buildParams({ ...filters, cursor });
    if (replace) {
      this.store.dispatch(FeedActions.loadInitial({ replace: true }));
    } else {
      this.store.dispatch(
        FeedActions.loadPage({ cursor: cursor ?? null, append: Boolean(append) })
      );
    }
    if (this.useMockFeed) {
      void this.resolveAndDispatchMockPage({
        filters,
        cursor: cursor ?? null,
        append: Boolean(append),
      });
      return;
    }
    const url = this.composeUrl(COLLECTION_ENDPOINT);
    this.http
      .get<ItemResponse>(url, { params })
      .subscribe({
        next: response => {
          const items = this.normalizeArrayResponse(response?.data);
          const nextCursor = response?.cursor ?? null;
          this.store.dispatch(FeedActions.loadSuccess({ items, cursor: nextCursor, append: Boolean(append) }));
          this.emitAnalytics('feed.page.loaded', { count: items.length, cursor: nextCursor });
        },
        error: error => {
          const message = this.extractError(error);
          this.store.dispatch(FeedActions.loadFailure({ error: message }));
          this.notifications.error(this.translate.instant('feed.notifications.loadError', { reason: message }), {
            source: 'feed',
            context: error,
            metadata: { cursor, append },
            deliver: { email: true },
          });
        },
      });
  }

  private async resolveAndDispatchMockPage(options: {
    filters: FeedFilterState;
    cursor: string | null;
    append: boolean;
  }): Promise<void> {
    const { filters, cursor, append } = options;
    try {
      const allItems = await this.resolveMockFeedItems();
      if (!this.equalFilters(filters, this.filtersSig())) {
        return;
      }

      const filtered = this.filterMockItems(allItems, filters);
      const offset = append ? this.parseMockCursor(cursor) : 0;
      const items = filtered.slice(offset, offset + MOCK_PAGE_LIMIT);
      const nextCursor =
        offset + MOCK_PAGE_LIMIT < filtered.length ? String(offset + MOCK_PAGE_LIMIT) : null;

      this.store.dispatch(
        FeedActions.loadSuccess({
          items,
          cursor: nextCursor,
          append,
        })
      );
      this.emitAnalytics('feed.page.loaded', { count: items.length, cursor: nextCursor, source: 'mock' });
    } catch (error) {
      const message = this.extractError(error);
      this.store.dispatch(FeedActions.loadFailure({ error: message }));
      this.notifications.error(this.translate.instant('feed.notifications.loadError', { reason: message }), {
        source: 'feed',
        context: error,
        metadata: { cursor, append, source: 'mock' },
        deliver: { email: true },
      });
    }
  }

  private connect(): void {
    if (!this.browser || this.eventSource || this.socket) {
      return;
    }
    const url = this.composeUrl(STREAM_ENDPOINT);
    if (typeof EventSource !== 'undefined') {
      this.openEventSource(url);
    } else {
      this.openWebSocket(url.replace(/^http/, 'ws'));
    }
  }

  private openEventSource(url: string): void {
    try {
      this.eventSource = new EventSource(url, { withCredentials: true } as EventSourceInit);
    } catch (error) {
      this.eventSource = null;
      this.openWebSocket(url.replace(/^http/, 'ws'));
      return;
    }
    this.store.dispatch(FeedActions.setConnectionStatus({ connected: false, reconnecting: true }));
    this.eventSource.onopen = () =>
      this.zone.run(() => {
        this.store.dispatch(FeedActions.setConnectionStatus({ connected: true, reconnecting: false }));
        this.reconnectAttempts = 0;
        this.notifyConnectionRestored('sse');
      });
    this.eventSource.onerror = () =>
      this.zone.run(() => {
        this.store.dispatch(FeedActions.setConnectionStatus({ connected: false, reconnecting: true }));
        this.notifyConnectionLost('sse');
        this.scheduleReconnect();
      });
    this.eventSource.onmessage = event =>
      this.zone.run(() => {
        this.handleIncomingEvent(event.data, event.lastEventId ?? undefined);
      });
  }

  private openWebSocket(url: string): void {
    try {
      this.socket = new WebSocket(url);
    } catch (error) {
      this.socket = null;
      this.notifyConnectionLost('ws');
      this.scheduleReconnect();
      return;
    }
    this.store.dispatch(FeedActions.setConnectionStatus({ connected: false, reconnecting: true }));
    this.socket.onopen = () =>
      this.zone.run(() => {
        this.store.dispatch(FeedActions.setConnectionStatus({ connected: true, reconnecting: false }));
        this.reconnectAttempts = 0;
        this.notifyConnectionRestored('ws');
      });
    this.socket.onerror = () =>
      this.zone.run(() => {
        this.store.dispatch(FeedActions.setConnectionStatus({ connected: false, reconnecting: true }));
        this.notifyConnectionLost('ws');
      });
    this.socket.onclose = () =>
      this.zone.run(() => {
        this.store.dispatch(FeedActions.setConnectionStatus({ connected: false, reconnecting: true }));
        this.notifyConnectionLost('ws');
        this.scheduleReconnect();
      });
    this.socket.onmessage = event =>
      this.zone.run(() => {
        this.handleIncomingEvent(event.data);
      });
  }

  private handleIncomingEvent(raw: unknown, eventId?: string): void {
    if (!raw) {
      return;
    }
    if (eventId && this.hasSeenEvent(eventId)) {
      return;
    }
    let envelope: FeedRealtimeEnvelope | null = null;
    try {
      envelope = typeof raw === 'string' ? (JSON.parse(raw) as FeedRealtimeEnvelope) : (raw as FeedRealtimeEnvelope);
    } catch (error) {
      console.warn('[feed] Failed to parse realtime payload', error);
      return;
    }
    if (!envelope) {
      return;
    }
    if (eventId) {
      this.trackEventId(eventId);
    }
    this.store.dispatch(FeedActions.receiveRealtimeEnvelope({ envelope }));
    if (envelope.type === 'feed.item.created') {
      this.emitAnalytics('feed.item.received', { itemId: (envelope.payload as FeedItem)?.id });
    }
  }

  private scheduleReconnect(delayMs?: number): void {
    if (!this.browser) {
      return;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    const delay =
      typeof delayMs === 'number'
        ? delayMs
        : Math.min(15000, [2000, 5000, 10000][this.reconnectAttempts] ?? 10000);
    const attempt = this.reconnectAttempts + 1;
    this.reconnectAttempts = attempt;
    this.reconnectTimer = setTimeout(() => {
      this.teardown();
      this.connect();
    }, delay);
    if (attempt === 1) {
      this.notifications.info(this.translate.instant('feed.notifications.reconnecting', { seconds: Math.round(delay / 1000) }), {
        source: 'feed',
        metadata: { attempt, delay },
      });
    }
  }

  private teardown(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private notifyConnectionLost(transport: 'sse' | 'ws'): void {
    if (this.connectionNotifiedDown) {
      return;
    }
    this.connectionNotifiedDown = true;
    this.notifications.error(this.translate.instant('feed.notifications.connectionLost'), {
      source: 'feed',
      metadata: { transport },
    });
  }

  private notifyConnectionRestored(transport: 'sse' | 'ws'): void {
    if (!this.connectionNotifiedDown) {
      return;
    }
    this.connectionNotifiedDown = false;
    this.notifications.success(this.translate.instant('feed.notifications.connectionRestored'), {
      source: 'feed',
      metadata: { transport },
    });
  }

  private buildParams(filters: FeedFilterState & { cursor?: string | null }): HttpParams {
    let params = new HttpParams();
    if (filters.cursor) {
      params = params.set('cursor', filters.cursor);
    }
    if (filters.fromProvinceId) {
      params = params.set('fromProvince', filters.fromProvinceId);
    }
    if (filters.toProvinceId) {
      params = params.set('toProvince', filters.toProvinceId);
    }
    if (filters.sectorId) {
      params = params.set('sector', filters.sectorId);
    }
    if (filters.type) {
      params = params.set('type', filters.type);
    }
    if (filters.mode && filters.mode !== 'BOTH') {
      params = params.set('mode', filters.mode);
    }
    if (filters.sort) {
      params = params.set('sort', filters.sort);
    }
    if (filters.search) {
      params = params.set('q', filters.search);
    }
    return params;
  }

  private async resolveMockFeedItems(): Promise<readonly FeedItem[]> {
    const catalogItems = this.catalogFeedItemsSig();
    if (catalogItems.length) {
      this.mockFeedCache = this.normalizeArrayResponse(catalogItems);
      return this.mockFeedCache;
    }

    if (this.mockFeedCache?.length) {
      return this.mockFeedCache;
    }

    if (!this.browser) {
      return [];
    }

    if (!this.mockFeedRequest) {
      this.mockFeedRequest = firstValueFrom(this.http.get<CatalogMockResponse>(CATALOG_MOCK_PATH))
        .then(payload => this.normalizeArrayResponse(payload?.feedItems ?? []))
        .then(items => {
          this.mockFeedCache = items;
          return items;
        })
        .finally(() => {
          this.mockFeedRequest = null;
        });
    }

    return this.mockFeedRequest;
  }

  private async resolveMockItemById(itemId: string): Promise<FeedItem | null> {
    const items = await this.resolveMockFeedItems();
    const item = items.find(entry => entry.id === itemId);
    return item ? this.normalizeItem(item) : null;
  }

  private filterMockItems(items: readonly FeedItem[], filters: FeedFilterState): FeedItem[] {
    const search = filters.search.trim().toLowerCase();

    return items
      .filter(item => {
        if (filters.type && item.type !== filters.type) {
          return false;
        }
        if (filters.mode !== 'BOTH' && item.mode !== filters.mode) {
          return false;
        }
        if (filters.sectorId && item.sectorId !== filters.sectorId) {
          return false;
        }
        if (filters.fromProvinceId && item.fromProvinceId !== filters.fromProvinceId) {
          return false;
        }
        if (filters.toProvinceId && item.toProvinceId !== filters.toProvinceId) {
          return false;
        }
        if (!search) {
          return true;
        }

        const haystack = [
          item.title,
          item.summary,
          item.source?.label ?? '',
          item.sectorId ?? '',
          item.fromProvinceId ?? '',
          item.toProvinceId ?? '',
          ...(item.tags ?? []),
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(search);
      })
      .sort((left, right) => this.compareMockItems(left, right, filters.sort));
  }

  private compareMockItems(left: FeedItem, right: FeedItem, sort: FeedFilterState['sort']): number {
    if (sort !== 'NEWEST') {
      const scoreDiff = this.mockSortScore(right, sort) - this.mockSortScore(left, sort);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
    }

    const createdAtDiff = (right.createdAt ?? '').localeCompare(left.createdAt ?? '');
    if (createdAtDiff !== 0) {
      return createdAtDiff;
    }
    return (right.id ?? '').localeCompare(left.id ?? '');
  }

  private mockSortScore(item: FeedItem, sort: FeedFilterState['sort']): number {
    if (sort === 'URGENCY') {
      return item.urgency ?? 0;
    }
    if (sort === 'VOLUME') {
      return item.volumeScore ?? item.quantity?.value ?? 0;
    }
    if (sort === 'CREDIBILITY') {
      return item.credibility ?? 0;
    }
    return 0;
  }

  private parseMockCursor(value: string | null): number {
    if (!value) {
      return 0;
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return parsed;
  }

  private composeUrl(path: string): string {
    const base = this.apiUrl || '';
    return `${base}${path}`;
  }

  private normalizeArrayResponse(data: FeedItem | readonly FeedItem[] | null | undefined): FeedItem[] {
    if (!data) {
      return [];
    }
    return Array.isArray(data)
      ? data.map(item => this.normalizeItem(item))
      : [this.normalizeItem(data as FeedItem)];
  }

  private normalizeItemResponse(response: ItemResponse | FeedItem): FeedItem {
    if (!response) {
      throw new Error('Empty response');
    }
    if ('data' in response) {
      const data = response.data;
      if (Array.isArray(data)) {
        return data.length ? this.normalizeItem(data[0]) : this.buildPlaceholderItem();
      }
      return this.normalizeItem(data as FeedItem);
    }
    return this.normalizeItem(response);
  }

  private normalizeItem(item: FeedItem): FeedItem {
    return {
      ...item,
      sectorId: item.sectorId ?? null,
      fromProvinceId: item.fromProvinceId ?? null,
      toProvinceId: item.toProvinceId ?? null,
      mode: item.mode ?? 'BOTH',
      quantity: item.quantity ?? null,
      urgency: item.urgency ?? null,
      credibility: item.credibility ?? null,
      tags: item.tags ?? [],
      originType: this.normalizeOriginType(item.originType),
      originId: this.normalizeOriginId(item.originId),
      connectionMatchId: this.normalizeConnectionMatchId(item.connectionMatchId),
      source: item.source ?? { kind: 'USER', label: this.translate.instant('feed.sourceUnknown') },
    };
  }

  private buildOptimisticItem(draft: FeedComposerDraft, key: string): FeedItem {
    const now = new Date().toISOString();
    return {
      id: `optimistic-${key}`,
      optimisticIdempotencyKey: key,
      type: draft.type ?? 'OFFER',
      sectorId: draft.sectorId ?? null,
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      createdAt: now,
      updatedAt: now,
      fromProvinceId: draft.fromProvinceId ?? null,
      toProvinceId: draft.toProvinceId ?? null,
      mode: draft.mode ?? 'BOTH',
      quantity: draft.quantity ?? null,
      tags: draft.tags ?? [],
      originType: this.normalizeOriginType(draft.originType),
      originId: this.normalizeOriginId(draft.originId),
      connectionMatchId: this.normalizeConnectionMatchId(draft.connectionMatchId),
      source: {
        kind: 'USER',
        label: this.translate.instant('feed.sourceYou'),
      },
      status: 'pending' as const,
    };
  }

  private normalizeDraft(draft: FeedComposerDraft): FeedComposerDraft {
    return {
      ...draft,
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      sectorId: draft.sectorId ?? null,
      fromProvinceId: draft.fromProvinceId ?? null,
      toProvinceId: draft.toProvinceId ?? null,
      mode: draft.mode ?? 'BOTH',
      quantity: draft.quantity ?? null,
      tags: draft.tags?.filter(Boolean) ?? [],
      originType: this.normalizeOriginType(draft.originType),
      originId: this.normalizeOriginId(draft.originId),
      connectionMatchId: this.normalizeConnectionMatchId(draft.connectionMatchId),
    };
  }

  private normalizeOriginType(value: FeedOriginType | string | null | undefined): FeedOriginType | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim().toLowerCase();
    if (!['alert', 'opportunity', 'indicator'].includes(normalized)) {
      return null;
    }
    return normalized as FeedOriginType;
  }

  private normalizeOriginId(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    return normalized.length ? normalized : null;
  }

  private normalizeConnectionMatchId(value: number | null | undefined): number | null {
    if (!Number.isFinite(value ?? NaN)) {
      return null;
    }
    const normalized = Math.trunc(value as number);
    return normalized > 0 ? normalized : null;
  }

  private extractError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim().length) {
        return error.error;
      }
      if (error.error?.message) {
        return error.error.message;
      }
      return error.message;
    }
    if (error instanceof Error && typeof error.message === 'string') {
      return error.message;
    }
    if (typeof error === 'object' && error && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string') {
        return message;
      }
    }
    return this.translate.instant('feed.error.generic');
  }

  private generateIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  private equalFilters(a: FeedFilterState, b: FeedFilterState): boolean {
    return (
      a.fromProvinceId === b.fromProvinceId &&
      a.toProvinceId === b.toProvinceId &&
      a.sectorId === b.sectorId &&
      a.type === b.type &&
      a.mode === b.mode &&
      a.sort === b.sort &&
      a.search === b.search
    );
  }

  private hasSeenEvent(eventId: string): boolean {
    return this.seenEventIds.includes(eventId);
  }

  private trackEventId(eventId: string): void {
    this.seenEventIds.unshift(eventId);
    if (this.seenEventIds.length > 200) {
      this.seenEventIds.length = 200;
    }
  }

  private updateSignalIfChanged<T>(target: { set(value: T): void; (): T }, value: T): void {
    if (target() !== value) {
      target.set(value);
    }
  }


  private emitAnalytics(event: string, payload: Record<string, unknown>): void {
    if (!this.browser) {
      return;
    }
    const dataLayer = (globalThis as { dataLayer?: unknown[] }).dataLayer;
    if (Array.isArray(dataLayer)) {
      dataLayer.push({ event, ...payload });
      return;
    }
    const globalRef = globalThis as { dispatchEvent?: (event: Event) => boolean };
    if (typeof globalRef.dispatchEvent === 'function') {
      const customEvent = new CustomEvent('og7-analytics', { detail: { event, payload } });
      globalRef.dispatchEvent(customEvent);
    }
  }

  private buildPlaceholderItem(): FeedItem {
    return {
      id: 'placeholder',
      type: 'OFFER',
      sectorId: null,
      title: '',
      summary: '',
      createdAt: new Date().toISOString(),
      fromProvinceId: null,
      toProvinceId: null,
      mode: 'BOTH',
      source: { kind: 'USER', label: this.translate.instant('feed.sourceUnknown') },
    };
  }
}
