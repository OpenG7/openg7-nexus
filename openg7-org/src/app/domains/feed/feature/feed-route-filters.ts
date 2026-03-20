import { ParamMap } from '@angular/router';
import { resolveCorridorContext } from '@app/core/config/corridor-context';

import { FeedFilterState, FeedItemCategory, FeedItemType, FeedSort, FlowMode } from './models/feed.models';

type MaybeString = string | null | undefined;

const SORT_OPTIONS = new Set<FeedSort>(['NEWEST', 'URGENCY', 'VOLUME', 'CREDIBILITY']);
const CATEGORY_OPTIONS = new Set<FeedItemCategory>(['OPPORTUNITY', 'ALERT', 'INDICATOR']);
const TYPE_OPTIONS = new Set<FeedItemType>([
  'OFFER',
  'REQUEST',
  'ALERT',
  'TENDER',
  'CAPACITY',
  'INDICATOR',
]);
const MODE_OPTIONS = new Set<FlowMode>(['EXPORT', 'IMPORT', 'BOTH']);

export function parseFeedFilters(query: Pick<ParamMap, 'get'>): FeedFilterState {
  const sortParam = normalizeString(query.get('sort'))?.toUpperCase();
  const sort = SORT_OPTIONS.has(sortParam as FeedSort) ? (sortParam as FeedSort) : 'NEWEST';
  const categoryParam = normalizeString(query.get('category'))?.toUpperCase();
  const category = CATEGORY_OPTIONS.has(categoryParam as FeedItemCategory)
    ? (categoryParam as FeedItemCategory)
    : null;
  const typeParam = normalizeString(query.get('type'))?.toUpperCase();
  const type = TYPE_OPTIONS.has(typeParam as FeedItemType) ? (typeParam as FeedItemType) : null;
  const modeParam = normalizeString(query.get('mode'))?.toUpperCase();
  const mode = MODE_OPTIONS.has(modeParam as FlowMode) ? (modeParam as FlowMode) : 'BOTH';
  const corridorContext = resolveCorridorContext(normalizeString(query.get('corridorId')));
  const sectorId =
    normalizeString(query.get('sector')) ??
    normalizeString(query.get('sectorId')) ??
    null;
  const fromProvinceId =
    normalizeString(query.get('fromProvince')) ??
    normalizeString(query.get('fromProvinceId')) ??
    corridorContext?.fromProvinceId ??
    null;
  const toProvinceId =
    normalizeString(query.get('toProvince')) ??
    normalizeString(query.get('toProvinceId')) ??
    corridorContext?.toProvinceId ??
    null;
  const search = normalizeString(query.get('q')) ?? '';

  return {
    fromProvinceId,
    toProvinceId,
    sectorId,
    category,
    type,
    mode,
    sort,
    search,
  };
}

function normalizeString(value: MaybeString): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}
