import { Injectable } from '@angular/core';
import { NavigationExtras } from '@angular/router';

import { resolveFeedConnectionMatchId } from '../feed-item.helpers';
import { FeedItem } from '../models/feed.models';

export type OpportunityEngagementSource =
  | 'feed'
  | 'home-feed-panels'
  | 'trade-map'
  | 'corridors-realtime';
export type OpportunityEngagementFallback = 'detail' | 'drawer';
export type OpportunityEngagementSourceQueryParams = Readonly<
  Record<string, string | null | undefined>
>;

export const OPPORTUNITY_ENGAGEMENT_CONTEXT_QUERY_PARAM_KEYS = [
  'source',
  'corridorId',
  'feedItemId',
  'priority',
  'partner',
  'sector',
  'sectorId',
  'type',
  'fromProvince',
  'fromProvinceId',
  'toProvince',
  'toProvinceId',
  'mode',
  'q',
  'sort',
] as const;

export function isOpportunityEngagementSource(
  value: string | null,
): value is OpportunityEngagementSource {
  return (
    value === 'feed' ||
    value === 'home-feed-panels' ||
    value === 'trade-map' ||
    value === 'corridors-realtime'
  );
}

export interface OpportunityEngagementNavigation {
  readonly commands: [string, ...(string | number)[]];
  readonly extras?: NavigationExtras;
  readonly route: string;
}

export type OpportunityEngagementDecision =
  | { readonly kind: 'redirect-login'; readonly navigation: OpportunityEngagementNavigation }
  | { readonly kind: 'open-existing-offer'; readonly navigation: OpportunityEngagementNavigation }
  | {
      readonly kind: 'open-linkup';
      readonly navigation: OpportunityEngagementNavigation;
      readonly matchId: number;
    }
  | { readonly kind: 'open-detail'; readonly navigation: OpportunityEngagementNavigation }
  | { readonly kind: 'open-drawer' };

export interface OpportunityEngagementRequest {
  readonly item: Pick<FeedItem, 'id' | 'type' | 'connectionMatchId'>;
  readonly source: OpportunityEngagementSource;
  readonly fallback: OpportunityEngagementFallback;
  readonly currentUrl?: string | null;
  readonly requiresAuthentication?: boolean;
  readonly isAuthenticated?: boolean;
  readonly existingOfferId?: string | null;
  readonly sourceQueryParams?: OpportunityEngagementSourceQueryParams;
}

@Injectable({ providedIn: 'root' })
export class OpportunityEngagementService {
  plan(request: OpportunityEngagementRequest): OpportunityEngagementDecision {
    if (request.requiresAuthentication && !request.isAuthenticated) {
      return {
        kind: 'redirect-login',
        navigation: this.buildLoginNavigation(request.currentUrl, this.resolveFallbackUrl(request)),
      };
    }

    const existingOfferId = this.normalizeId(request.existingOfferId);
    if (existingOfferId) {
      return {
        kind: 'open-existing-offer',
        navigation: this.buildExistingOfferNavigation(existingOfferId),
      };
    }

    const itemId = this.normalizeId(request.item.id);
    const matchId = resolveFeedConnectionMatchId(request.item);
    if (matchId) {
      return {
        kind: 'open-linkup',
        navigation: this.buildLinkupNavigation(
          matchId,
          request.source,
          itemId,
          request.sourceQueryParams,
        ),
        matchId,
      };
    }

    if (request.fallback === 'detail') {
      return {
        kind: 'open-detail',
        navigation: this.buildOpportunityDetailNavigation(
          itemId,
          request.source,
          request.sourceQueryParams,
        ),
      };
    }

    return { kind: 'open-drawer' };
  }

  buildLoginNavigation(
    currentUrl: string | null | undefined,
    fallbackUrl = '/feed',
  ): OpportunityEngagementNavigation {
    return {
      commands: ['/login'],
      extras: {
        queryParams: {
          redirect: this.normalizeInternalUrl(currentUrl, fallbackUrl),
        },
      },
      route: '/login',
    };
  }

  buildLinkupNavigation(
    matchId: number,
    source: OpportunityEngagementSource,
    itemId?: string | null,
    sourceQueryParams?: OpportunityEngagementSourceQueryParams,
  ): OpportunityEngagementNavigation {
    const normalizedItemId = this.normalizeId(itemId);

    return {
      commands: ['/linkup', matchId],
      extras: {
        queryParams: this.buildSourceQueryParams(source, normalizedItemId, sourceQueryParams),
      },
      route: `/linkup/${matchId}`,
    };
  }

  buildOpportunityDetailNavigation(
    itemId: string | null | undefined,
    source: OpportunityEngagementSource,
    sourceQueryParams?: OpportunityEngagementSourceQueryParams,
  ): OpportunityEngagementNavigation {
    const normalizedItemId = this.normalizeId(itemId);
    const commands: OpportunityEngagementNavigation['commands'] = normalizedItemId
      ? ['/feed', 'opportunities', normalizedItemId]
      : ['/feed'];
    const route = normalizedItemId ? `/feed/opportunities/${normalizedItemId}` : '/feed';

    return {
      commands,
      extras: {
        queryParams: this.buildSourceQueryParams(source, normalizedItemId, sourceQueryParams),
      },
      route,
    };
  }

  buildExistingOfferNavigation(offerId: string): OpportunityEngagementNavigation {
    return {
      commands: ['/alerts'],
      extras: {
        queryParams: {
          section: 'offers',
          offerId,
        },
      },
      route: '/alerts',
    };
  }

  normalizeInternalUrl(value: string | null | undefined, fallbackUrl = '/feed'): string {
    const normalizedFallback = this.normalizeLocalUrl(fallbackUrl) ?? '/feed';
    return this.normalizeLocalUrl(value) ?? normalizedFallback;
  }

  private resolveFallbackUrl(request: OpportunityEngagementRequest): string {
    const itemId = this.normalizeId(request.item.id);
    if (request.fallback === 'detail') {
      return itemId ? `/feed/opportunities/${itemId}` : '/feed';
    }
    if (request.source === 'home-feed-panels') {
      return itemId ? `/feed/opportunities/${itemId}` : '/';
    }
    return '/feed';
  }

  private normalizeId(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();
    return normalized.length ? normalized : null;
  }

  private buildSourceQueryParams(
    source: OpportunityEngagementSource,
    itemId: string | null,
    sourceQueryParams?: OpportunityEngagementSourceQueryParams,
  ): Record<string, string> {
    const queryParams: Record<string, string> = {};

    for (const [key, value] of Object.entries(sourceQueryParams ?? {})) {
      if (key === 'source' || key === 'feedItemId') {
        continue;
      }

      const normalized = this.normalizeId(value);
      if (normalized) {
        queryParams[key] = normalized;
      }
    }

    queryParams['source'] = source;
    if (itemId) {
      queryParams['feedItemId'] = itemId;
    }

    return queryParams;
  }

  private normalizeLocalUrl(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    if (normalized.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(normalized)) {
      return null;
    }

    return normalized.startsWith('/') ? normalized : `/${normalized.replace(/^\/+/, '')}`;
  }
}
