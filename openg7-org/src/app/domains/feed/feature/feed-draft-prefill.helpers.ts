import { ParamMap, Params } from '@angular/router';

export const FEED_DRAFT_QUERY_PARAM_KEYS = [
  'draftSource',
  'draftAlertId',
  'draftOriginType',
  'draftOriginId',
  'draftConnectionMatchId',
  'draftType',
  'draftMode',
  'draftSectorId',
  'draftFromProvinceId',
  'draftToProvinceId',
  'draftTitle',
  'draftSummary',
  'draftTags',
] as const;

export type FeedDraftQueryParamKey = (typeof FEED_DRAFT_QUERY_PARAM_KEYS)[number];
export type FeedDraftPrefillQuery = Record<FeedDraftQueryParamKey, string | null>;

type FeedDraftPrefillValue = string | number | null | undefined;

export function readFeedDraftPrefillQuery(query: Pick<ParamMap, 'get'>): FeedDraftPrefillQuery {
  return FEED_DRAFT_QUERY_PARAM_KEYS.reduce<FeedDraftPrefillQuery>((prefill, key) => {
    prefill[key] = normalizeFeedDraftPrefillValue(query.get(key));
    return prefill;
  }, createEmptyFeedDraftPrefillQuery());
}

export function buildFeedDraftPrefillKey(query: Pick<ParamMap, 'get'>): string | null {
  return buildFeedDraftPrefillKeyFromValues(readFeedDraftPrefillQuery(query));
}

export function buildFeedDraftPrefillKeyFromValues(prefill: FeedDraftPrefillQuery): string | null {
  const values = FEED_DRAFT_QUERY_PARAM_KEYS.map(key => prefill[key] ?? '');
  return values.some(Boolean) ? values.join('|') : null;
}

export function buildFeedDraftPrefillQueryParams(
  prefill: Partial<Record<FeedDraftQueryParamKey, FeedDraftPrefillValue>>
): Params {
  return FEED_DRAFT_QUERY_PARAM_KEYS.reduce<Params>((queryParams, key) => {
    const value = normalizeFeedDraftPrefillValue(prefill[key]);
    if (value !== null) {
      queryParams[key] = value;
    }
    return queryParams;
  }, {});
}

export function buildFeedDraftPrefillClearQueryParams(): Record<FeedDraftQueryParamKey, null> {
  return FEED_DRAFT_QUERY_PARAM_KEYS.reduce<Record<FeedDraftQueryParamKey, null>>((queryParams, key) => {
    queryParams[key] = null;
    return queryParams;
  }, {} as Record<FeedDraftQueryParamKey, null>);
}

function createEmptyFeedDraftPrefillQuery(): FeedDraftPrefillQuery {
  return {
    draftSource: null,
    draftAlertId: null,
    draftOriginType: null,
    draftOriginId: null,
    draftConnectionMatchId: null,
    draftType: null,
    draftMode: null,
    draftSectorId: null,
    draftFromProvinceId: null,
    draftToProvinceId: null,
    draftTitle: null,
    draftSummary: null,
    draftTags: null,
  };
}

function normalizeFeedDraftPrefillValue(value: FeedDraftPrefillValue): string | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
