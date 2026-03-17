import { FeedItem, FeedItemType } from './models/feed.models';

const OPPORTUNITY_TYPES: readonly FeedItemType[] = ['OFFER', 'REQUEST', 'TENDER', 'CAPACITY'];

export function isFeedOpportunityType(type: FeedItemType | null | undefined): boolean {
  return Boolean(type && OPPORTUNITY_TYPES.includes(type));
}

export function buildFeedFavoriteKey(item: Pick<FeedItem, 'id' | 'type'>): string | null {
  const itemId = item.id?.trim();
  if (!itemId) {
    return null;
  }

  return isFeedOpportunityType(item.type) ? `opportunity:${itemId}` : itemId;
}

export function resolveFeedConnectionMatchId(
  item: Pick<FeedItem, 'type' | 'connectionMatchId'> | null | undefined
): number | null {
  if (!item || !isFeedOpportunityType(item.type)) {
    return null;
  }

  const matchId = item.connectionMatchId;
  if (!Number.isFinite(matchId ?? NaN)) {
    return null;
  }

  const normalized = Math.trunc(matchId as number);
  return normalized > 0 ? normalized : null;
}
