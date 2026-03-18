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
