import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { FEATURE_FLAGS } from '@app/core/config/environment.tokens';
import { HttpClientService } from '@app/core/http/http-client.service';
import {
  FEED_LABOR_TAGS,
  FEED_TRANSPORT_TAGS,
  FeedItemsQuery,
  queryFeedItems,
} from '@app/domains/feed/feature/feed-item-query';
import { FeedItem } from '@app/domains/feed/feature/models/feed.models';
import { AppState } from '@app/state/app.state';
import { selectCatalogFeedItems } from '@app/state/catalog/catalog.selectors';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

export type HomeFeedScope = 'canada' | 'g7' | 'world';
export type HomeFeedFilter = 'all' | 'offer' | 'request' | 'labor' | 'transport';

export interface HomeFeedQuery {
  readonly scope: HomeFeedScope;
  readonly filter: HomeFeedFilter;
  readonly search: string;
  readonly limit?: number;
}

interface HomeFeedResponse {
  readonly data: FeedItem[];
}

@Injectable({ providedIn: 'root' })
export class HomeFeedService {
  private readonly http = inject(HttpClientService);
  private readonly store = inject(Store<AppState>);
  private readonly featureFlags = inject(FEATURE_FLAGS, { optional: true });
  private readonly catalogFeedItems = this.store.selectSignal(selectCatalogFeedItems);
  private readonly useMocks = this.featureFlags?.['homeFeedMocks'] ?? true;

  loadHighlights(query: HomeFeedQuery): Observable<FeedItem[]> {
    if (this.useMocks) {
      return of(this.filterMockItems(this.catalogFeedItems(), query));
    }
    const params = this.buildParams(query);
    return this.http
      .get<HomeFeedResponse | FeedItem[]>('/api/feed/highlights', { params })
      .pipe(map((response) => this.normalizeResponse(response)));
  }

  private buildParams(query: HomeFeedQuery): HttpParams {
    let params = new HttpParams().set('scope', query.scope);

    if (query.search) {
      params = params.set('q', query.search);
    }

    if (query.limit) {
      params = params.set('limit', String(query.limit));
    }

    if (query.filter && query.filter !== 'all') {
      const { type, tag } = this.mapFilterToApi(query.filter);
      if (type) {
        params = params.set('type', type);
      }
      if (tag) {
        params = params.set('tag', tag);
      }
      params = params.set('filter', query.filter);
    }

    return params;
  }

  private mapFilterToApi(filter: HomeFeedFilter): { type?: string; tag?: string } {
    switch (filter) {
      case 'offer':
        return { type: 'OFFER' };
      case 'request':
        return { type: 'REQUEST' };
      case 'labor':
        return { tag: 'labor' };
      case 'transport':
        return { tag: 'transport' };
      default:
        return {};
    }
  }

  private normalizeResponse(response: HomeFeedResponse | FeedItem[] | null | undefined): FeedItem[] {
    if (!response) {
      return [];
    }
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  private filterMockItems(items: FeedItem[], query: HomeFeedQuery): FeedItem[] {
    return queryFeedItems(items, this.toMockQuery(query));
  }

  private toMockQuery(query: HomeFeedQuery): FeedItemsQuery {
    let sourceKinds: FeedItemsQuery['sourceKinds'] = null;
    let excludedSourceKinds: FeedItemsQuery['excludedSourceKinds'] = null;
    let type: FeedItemsQuery['type'] = null;
    let tagSet: FeedItemsQuery['tagSet'] = null;

    switch (query.scope) {
      case 'g7':
        sourceKinds = ['GOV', 'PARTNER'];
        break;
      case 'world':
        excludedSourceKinds = ['GOV'];
        break;
      default:
        break;
    }

    switch (query.filter) {
      case 'offer':
        type = 'OFFER';
        break;
      case 'request':
        type = 'REQUEST';
        break;
      case 'labor':
        tagSet = FEED_LABOR_TAGS;
        break;
      case 'transport':
        tagSet = FEED_TRANSPORT_TAGS;
        break;
      default:
        break;
    }

    return {
      search: query.search,
      sort: 'NEWEST',
      limit: query.limit,
      sourceKinds,
      excludedSourceKinds,
      type,
      tagSet,
    };
  }
}
