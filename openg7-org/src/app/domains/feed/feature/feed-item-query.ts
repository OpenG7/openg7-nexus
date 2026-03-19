import { FeedFilterState, FeedItem, FeedSort, FeedItemType, FlowMode } from './models/feed.models';

export type FeedItemSourceKind = FeedItem['source']['kind'];

export interface FeedItemsQuery {
  readonly type?: FeedItemType | null;
  readonly mode?: FlowMode | null;
  readonly sectorId?: string | null;
  readonly fromProvinceId?: string | null;
  readonly toProvinceId?: string | null;
  readonly search?: string | null;
  readonly sort?: FeedSort | null;
  readonly sourceKinds?: readonly FeedItemSourceKind[] | null;
  readonly excludedSourceKinds?: readonly FeedItemSourceKind[] | null;
  readonly tagSet?: ReadonlySet<string> | null;
  readonly limit?: number | null;
}

export const FEED_LABOR_TAGS: ReadonlySet<string> = new Set([
  'labor',
  'workforce',
  'talent',
  'welding',
  'staffing',
  'crew',
  'skills',
]);

export const FEED_TRANSPORT_TAGS: ReadonlySet<string> = new Set([
  'transport',
  'logistics',
  'rail',
  'shipping',
  'freight',
  'cold-chain',
  'port',
  'aviation',
]);

export function toFeedItemsQuery(filters: FeedFilterState): FeedItemsQuery {
  return {
    type: filters.type,
    mode: filters.mode,
    sectorId: filters.sectorId,
    fromProvinceId: filters.fromProvinceId,
    toProvinceId: filters.toProvinceId,
    search: filters.search,
    sort: filters.sort,
  };
}

export function queryFeedItems(items: readonly FeedItem[], query: FeedItemsQuery): FeedItem[] {
  const filtered = items
    .filter((item) => matchesFeedItemQuery(item, query))
    .sort((left, right) => compareFeedItems(left, right, query.sort ?? 'NEWEST'));

  const limit = normalizeLimit(query.limit);
  if (limit == null) {
    return filtered;
  }

  return filtered.slice(0, limit);
}

export function matchesFeedItemQuery(item: FeedItem, query: FeedItemsQuery): boolean {
  if (query.type && item.type !== query.type) {
    return false;
  }

  if (query.mode && query.mode !== 'BOTH' && item.mode !== query.mode) {
    return false;
  }

  if (query.sectorId && item.sectorId !== query.sectorId) {
    return false;
  }

  if (query.fromProvinceId && item.fromProvinceId !== query.fromProvinceId) {
    return false;
  }

  if (query.toProvinceId && item.toProvinceId !== query.toProvinceId) {
    return false;
  }

  const sourceKind = item.source?.kind ?? 'COMPANY';
  if (query.sourceKinds?.length && !query.sourceKinds.includes(sourceKind)) {
    return false;
  }

  if (query.excludedSourceKinds?.length && query.excludedSourceKinds.includes(sourceKind)) {
    return false;
  }

  if (query.tagSet && !matchesFeedItemTags(item, query.tagSet)) {
    return false;
  }

  const search = normalizeSearch(query.search);
  if (search && !buildFeedSearchHaystack(item).includes(search)) {
    return false;
  }

  return true;
}

export function compareFeedItems(left: FeedItem, right: FeedItem, sort: FeedSort = 'NEWEST'): number {
  if (sort !== 'NEWEST') {
    const scoreDiff = resolveFeedSortScore(right, sort) - resolveFeedSortScore(left, sort);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
  }

  const createdAtDiff = (right.createdAt ?? '').localeCompare(left.createdAt ?? '');
  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }

  return (right.id ?? '').localeCompare(left.id ?? '');
}

export function buildFeedSearchHaystack(item: FeedItem): string {
  return [
    item.title,
    item.summary,
    item.source?.label ?? '',
    item.sectorId ?? '',
    item.fromProvinceId ?? '',
    item.toProvinceId ?? '',
    ...(item.tags ?? []),
  ]
    .join(' ')
    .toLowerCase();
}

export function matchesFeedItemTags(item: FeedItem, tags: ReadonlySet<string>): boolean {
  return (item.tags ?? []).some((tag) => tags.has(tag.toLowerCase()));
}

function resolveFeedSortScore(item: FeedItem, sort: FeedSort): number {
  if (sort === 'URGENCY') {
    return item.urgency ?? 0;
  }

  if (sort === 'VOLUME') {
    return item.volumeScore ?? item.quantity?.value ?? 0;
  }

  if (sort === 'CREDIBILITY') {
    return item.credibility ?? 0;
  }

  return 0;
}

function normalizeSearch(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function normalizeLimit(value: number | null | undefined): number | null {
  if (!Number.isFinite(value) || (value as number) <= 0) {
    return null;
  }

  return Math.trunc(value as number);
}
