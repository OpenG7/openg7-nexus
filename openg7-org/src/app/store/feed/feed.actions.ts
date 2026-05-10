import { createActionGroup, emptyProps, props } from '@ngrx/store';

import {
  FeedComposerDraft,
  FeedFilterState,
  FeedItem,
  FeedRealtimeEnvelope,
  FeedSnapshot,
} from '../../domains/feed/feature/models/feed.models';

export const FeedActions = createActionGroup({
  source: 'Feed',
  events: {
    'Load Initial': props<{ replace?: boolean }>(),
    'Load Page': props<{ cursor?: string | null; append?: boolean }>(),
    'Load Success': props<{ items: readonly FeedItem[]; cursor: string | null; append: boolean }>(),
    'Load Failure': props<{ error: string }>(),
    'Receive Realtime Envelope': props<{ envelope: FeedRealtimeEnvelope }>(),
    'Apply Filters': props<{ filters: FeedFilterState }>(),
    'Optimistic Publish': props<{
      draft: FeedComposerDraft;
      item: FeedItem;
      idempotencyKey: string;
    }>(),
    'Publish Success': props<{ tempId: string; item: FeedItem }>(),
    'Publish Failure': props<{ tempId: string; error: string }>(),
    'Set Connection Error': props<{ error: string | null }>(),
    'Set Connection Status': props<{ connected: boolean; reconnecting: boolean }>(),
    'Hydrate Snapshot': props<{ snapshot: FeedSnapshot }>(),
    'Mark Onboarding Seen': emptyProps(),
    'Open Drawer': props<{ itemId: string | null }>(),
  },
});
