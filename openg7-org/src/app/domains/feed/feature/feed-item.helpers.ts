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
