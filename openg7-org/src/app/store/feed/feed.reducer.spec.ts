import { FeedComposerDraft, FeedItem } from '../../domains/feed/feature/models/feed.models';

import { FeedActions } from './feed.actions';
import { feedReducer } from './feed.reducer';

function createDraft(): FeedComposerDraft {
  return {
    type: 'REQUEST',
    title: 'Winter balancing support',
    summary: 'Cross-border balancing support required after the weather alert.',
    sectorId: 'energy',
    fromProvinceId: 'on',
    toProvinceId: 'qc',
    mode: 'IMPORT',
    originType: 'alert',
    originId: 'alert-001',
    tags: ['linked-alert'],
  };
}

function createItem(id: string, overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id,
    createdAt: '2026-03-17T10:00:00.000Z',
    updatedAt: '2026-03-17T10:00:00.000Z',
    type: 'REQUEST',
    sectorId: 'energy',
    title: 'Winter balancing support',
    summary: 'Cross-border balancing support required after the weather alert.',
    fromProvinceId: 'on',
    toProvinceId: 'qc',
    mode: 'IMPORT',
    originType: 'alert',
    originId: 'alert-001',
    tags: ['linked-alert'],
    source: {
      kind: 'USER',
      label: 'You',
    },
    status: 'confirmed',
    ...overrides,
  };
}

describe('feedReducer', () => {
  it('preserves the incoming order when a non-newest page load replaces the feed items', () => {
    const highVolumeOlder = createItem('request-002', {
      createdAt: '2026-02-02T13:20:00.000Z',
      updatedAt: '2026-02-02T13:20:00.000Z',
      quantity: { value: 15000, unit: 'bbl_d' },
    });
    const mediumVolumeOldest = createItem('request-008', {
      createdAt: '2026-01-30T19:25:00.000Z',
      updatedAt: '2026-01-30T19:25:00.000Z',
      quantity: { value: 5000, unit: 'bbl_d' },
    });
    const lowVolumeNewest = createItem('request-001', {
      createdAt: '2026-02-03T09:05:00.000Z',
      updatedAt: '2026-02-03T09:05:00.000Z',
      quantity: { value: 300, unit: 'MW' },
    });

    const state = feedReducer(
      undefined,
      FeedActions.loadSuccess({
        items: [highVolumeOlder, mediumVolumeOldest, lowVolumeNewest],
        cursor: null,
        append: false,
      })
    );

    expect(state.items.map(item => item.id)).toEqual(['request-002', 'request-008', 'request-001']);
  });

  it('preserves server order when appending a follow-up page', () => {
    const firstPage = feedReducer(
      undefined,
      FeedActions.loadSuccess({
        items: [
          createItem('request-002', {
            createdAt: '2026-02-02T13:20:00.000Z',
            updatedAt: '2026-02-02T13:20:00.000Z',
          }),
          createItem('request-008', {
            createdAt: '2026-01-30T19:25:00.000Z',
            updatedAt: '2026-01-30T19:25:00.000Z',
          }),
        ],
        cursor: 'cursor-1',
        append: false,
      })
    );

    const appended = feedReducer(
      firstPage,
      FeedActions.loadSuccess({
        items: [
          createItem('request-001', {
            createdAt: '2026-02-03T09:05:00.000Z',
            updatedAt: '2026-02-03T09:05:00.000Z',
          }),
          createItem('request-010', {
            createdAt: '2026-01-29T17:55:00.000Z',
            updatedAt: '2026-01-29T17:55:00.000Z',
          }),
        ],
        cursor: null,
        append: true,
      })
    );

    expect(appended.items.map(item => item.id)).toEqual([
      'request-002',
      'request-008',
      'request-001',
      'request-010',
    ]);
  });

  it('does not mark a locally published item as unread when the same item arrives over realtime', () => {
    const optimisticIdempotencyKey = 'publish-123';
    const optimisticItem = createItem(`optimistic-${optimisticIdempotencyKey}`, {
      optimisticIdempotencyKey,
      status: 'pending',
    });
    const confirmedItem = createItem('feed-item-1');

    const optimisticState = feedReducer(
      undefined,
      FeedActions.optimisticPublish({
        draft: createDraft(),
        item: optimisticItem,
        idempotencyKey: optimisticIdempotencyKey,
      })
    );
    const confirmedState = feedReducer(
      optimisticState,
      FeedActions.publishSuccess({
        tempId: optimisticItem.id,
        item: confirmedItem,
      })
    );
    const realtimeState = feedReducer(
      confirmedState,
      FeedActions.receiveRealtimeEnvelope({
        envelope: {
          type: 'feed.item.created',
          payload: confirmedItem,
          cursor: null,
        },
      })
    );

    expect(confirmedState.unseenIds).toEqual([]);
    expect(confirmedState.localPublishedIds).toEqual([confirmedItem.id]);
    expect(realtimeState.unseenIds).toEqual([]);
    expect(realtimeState.localPublishedIds).toEqual([]);
  });

  it('keeps marking remote realtime items as unread', () => {
    const remoteItem = createItem('feed-item-remote', {
      source: {
        kind: 'GOV',
        label: 'IESO',
      },
    });

    const state = feedReducer(
      undefined,
      FeedActions.receiveRealtimeEnvelope({
        envelope: {
          type: 'feed.item.created',
          payload: remoteItem,
          cursor: null,
        },
      })
    );

    expect(state.unseenIds).toEqual([remoteItem.id]);
    expect(state.localPublishedIds).toEqual([]);
  });
});
