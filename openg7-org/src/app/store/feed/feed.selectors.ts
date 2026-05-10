import { createFeatureSelector, createSelector } from '@ngrx/store';

import { FeedState } from './feed.reducer';

export const selectFeedState = createFeatureSelector<FeedState>('feed');

export const selectFeedItems = createSelector(selectFeedState, (state) => state.items);

export const selectFeedLoading = createSelector(selectFeedState, (state) => state.loading);

export const selectFeedError = createSelector(selectFeedState, (state) => state.error);

export const selectFeedCursor = createSelector(selectFeedState, (state) => state.cursor);

export const selectFeedFilters = createSelector(selectFeedState, (state) => state.filters);

export const selectFeedConnectionState = createSelector(selectFeedState, (state) => ({
  connected: state.connected,
  reconnecting: state.reconnecting,
  error: state.connectionError,
}));

export const selectFeedOnboardingSeen = createSelector(
  selectFeedState,
  (state) => state.onboardingSeen,
);

export const selectFeedDrawerItemId = createSelector(
  selectFeedState,
  (state) => state.drawerItemId,
);

export const selectFeedHydrated = createSelector(selectFeedState, (state) => state.hydrated);

export const selectFeedUnreadCount = createSelector(
  selectFeedState,
  (state) => state.unseenIds.length,
);
