import { Injectable } from '@angular/core';
import { NavigationExtras } from '@angular/router';

import { resolveFeedConnectionMatchId } from '../feed-item.helpers';
import { FeedItem } from '../models/feed.models';

export type OpportunityEngagementSource = 'feed' | 'home-feed-panels';
export type OpportunityEngagementFallback = 'detail' | 'drawer';

export interface OpportunityEngagementNavigation {
  readonly commands: [string, ...(string | number)[]];
  readonly extras?: NavigationExtras;
  readonly route: string;
}

export type OpportunityEngagementDecision =
  | { readonly kind: 'redirect-login'; readonly navigation: OpportunityEngagementNavigation }
  | { readonly kind: 'open-existing-offer'; readonly navigation: OpportunityEngagementNavigation }
  | { readonly kind: 'open-linkup'; readonly navigation: OpportunityEngagementNavigation; readonly matchId: number }
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
        navigation: this.buildLinkupNavigation(matchId, request.source, itemId),
        matchId,
      };
    }

    if (request.fallback === 'detail') {
      return {
        kind: 'open-detail',
        navigation: this.buildOpportunityDetailNavigation(itemId, request.source),
      };
    }

    return { kind: 'open-drawer' };
  }

  buildLoginNavigation(currentUrl: string | null | undefined, fallbackUrl = '/feed'): OpportunityEngagementNavigation {
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
    itemId?: string | null
  ): OpportunityEngagementNavigation {
    const normalizedItemId = this.normalizeId(itemId);

    return {
      commands: ['/linkup', matchId],
      extras: {
        queryParams: {
          source,
          ...(normalizedItemId ? { feedItemId: normalizedItemId } : {}),
        },
      },
      route: `/linkup/${matchId}`,
    };
  }

  buildOpportunityDetailNavigation(
    itemId: string | null | undefined,
    source: OpportunityEngagementSource
  ): OpportunityEngagementNavigation {
    const normalizedItemId = this.normalizeId(itemId);
    const commands: OpportunityEngagementNavigation['commands'] = normalizedItemId
      ? ['/feed', 'opportunities', normalizedItemId]
      : ['/feed'];
    const route = normalizedItemId ? `/feed/opportunities/${normalizedItemId}` : '/feed';

    return {
      commands,
      extras: {
        queryParams: {
          source,
          ...(normalizedItemId ? { feedItemId: normalizedItemId } : {}),
        },
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
