import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  Routes,
  UrlMatchResult,
  UrlSegment,
} from '@angular/router';
import { FeedActions } from '@app/store/feed/feed.actions';
import { selectFeedError, selectFeedHydrated } from '@app/store/feed/feed.selectors';
import { Store } from '@ngrx/store';
import { firstValueFrom, merge, timer } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

import { parseFeedFilters } from './feed-route-filters';
import { FeedRealtimeService } from './services/feed-realtime.service';
const LEGACY_ALERT_PREFIXES = ['alert-', 'alerte-'] as const;
const LEGACY_INDICATOR_PREFIXES = ['indicator-', 'indicateur-'] as const;

const setupFeedResolver: ResolveFn<boolean> = async route => {
  const store = inject(Store);
  const feed = inject(FeedRealtimeService);
  const filters = parseFeedFilters(route.queryParamMap);
  store.dispatch(FeedActions.applyFilters({ filters }));
  if (!feed.hasHydrated()) {
    feed.loadInitial();
  }
  await firstValueFrom(
    merge(
      store.select(selectFeedHydrated).pipe(
        filter((hydrated): hydrated is true => hydrated === true),
        take(1),
        map(() => true)
      ),
      store.select(selectFeedError).pipe(
        filter((error): error is string => Boolean(error)),
        take(1),
        map(() => false)
      ),
      timer(4000).pipe(
        take(1),
        map(() => false)
      )
    )
  );
  return true;
};

export const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',
        resolve: { setup: setupFeedResolver },
        loadComponent: () => import('./feed.page').then(m => m.FeedPage),
      },
      {
        path: 'opportunities/:itemId',
        loadComponent: () =>
          import('./pages/feed-opportunity-detail.page').then(m => m.FeedOpportunityDetailPage),
      },
      {
        path: 'opportunity/:itemId',
        loadComponent: () =>
          import('./pages/feed-opportunity-detail.page').then(m => m.FeedOpportunityDetailPage),
      },
      {
        path: 'alerts/:itemId',
        loadComponent: () =>
          import('./pages/feed-alert-detail.page').then(m => m.FeedAlertDetailPage),
      },
      {
        matcher: createLegacyPrefixedItemMatcher(LEGACY_ALERT_PREFIXES),
        loadComponent: () =>
          import('./pages/feed-alert-detail.page').then(m => m.FeedAlertDetailPage),
      },
      {
        path: 'indicators/:itemId',
        loadComponent: () =>
          import('./pages/feed-indicator-detail.page').then(m => m.FeedIndicatorDetailPage),
      },
      {
        matcher: createLegacyPrefixedItemMatcher(LEGACY_INDICATOR_PREFIXES),
        loadComponent: () =>
          import('./pages/feed-indicator-detail.page').then(m => m.FeedIndicatorDetailPage),
      },
      {
        path: 'indicator/:itemId',
        loadComponent: () =>
          import('./pages/feed-indicator-detail.page').then(m => m.FeedIndicatorDetailPage),
      },
      {
        path: ':itemId',
        loadComponent: () =>
          import('./pages/feed-opportunity-detail.page').then(m => m.FeedOpportunityDetailPage),
      },
    ],
  },
];

export default routes;

function createLegacyPrefixedItemMatcher(prefixes: readonly string[]) {
  return (segments: UrlSegment[]): UrlMatchResult | null => {
    if (segments.length !== 1) {
      return null;
    }

    const [segment] = segments;
    const path = segment.path.toLowerCase();
    if (!prefixes.some(prefix => path.startsWith(prefix))) {
      return null;
    }

    return {
      consumed: [segment],
      posParams: {
        itemId: segment,
      },
    };
  };
}
