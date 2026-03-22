import type { Core } from '@strapi/strapi';

import type { SessionTokenClaims } from '../../../utils/auth-sessions';
import { validateSessionForToken } from '../../../utils/auth-sessions';
import {
  broadcastFeedEnvelope,
  registerFeedStreamClient,
  unregisterFeedStreamClient,
} from '../services/feed-stream';

const FEED_UID = 'api::feed.feed' as any;
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

const FEED_TYPES = new Set(['OFFER', 'REQUEST', 'ALERT', 'TENDER', 'CAPACITY', 'INDICATOR']);
const FEED_MODES = new Set(['EXPORT', 'IMPORT', 'BOTH']);
const FEED_ORIGIN_TYPES = new Set(['alert', 'opportunity', 'indicator']);
const FEED_SOURCES = new Set(['GOV', 'COMPANY', 'PARTNER', 'USER']);
const FEED_STATUSES = new Set(['confirmed', 'pending', 'failed']);
const FEED_SORTS = new Set(['NEWEST', 'URGENCY', 'VOLUME', 'CREDIBILITY']);
const QUANTITY_UNITS = new Set(['MW', 'MWh', 'bbl_d', 'ton', 'kg', 'hours', 'cad', 'usd']);
const HOME_FEED_SCOPES = new Set(['canada', 'g7', 'world']);
const HOME_FEED_FILTERS = new Set(['all', 'offer', 'request', 'labor', 'transport']);
const HOME_FEED_LABOR_TAGS = new Set([
  'labor',
  'workforce',
  'talent',
  'welding',
  'staffing',
  'crew',
  'skills',
]);
const HOME_FEED_TRANSPORT_TAGS = new Set([
  'transport',
  'logistics',
  'rail',
  'shipping',
  'freight',
  'cold-chain',
  'port',
  'aviation',
]);
const HIGHLIGHTS_CACHE_CONTROL = 'public, max-age=30, stale-while-revalidate=30';
const DEFAULT_HIGHLIGHTS_POOL_LIMIT = 250;
const MAX_HIGHLIGHTS_POOL_LIMIT = 500;

type FeedSort = 'NEWEST' | 'URGENCY' | 'VOLUME' | 'CREDIBILITY';
type FeedMode = 'EXPORT' | 'IMPORT' | 'BOTH';
type FeedType = 'OFFER' | 'REQUEST' | 'ALERT' | 'TENDER' | 'CAPACITY' | 'INDICATOR';
type FeedOriginType = 'alert' | 'opportunity' | 'indicator';
type FeedSourceKind = 'GOV' | 'COMPANY' | 'PARTNER' | 'USER';
type FeedStatus = 'confirmed' | 'pending' | 'failed';
type FeedQuantityUnit = 'MW' | 'MWh' | 'bbl_d' | 'ton' | 'kg' | 'hours' | 'cad' | 'usd';
type HomeFeedScope = 'canada' | 'g7' | 'world';
type HomeFeedFilter = 'all' | 'offer' | 'request' | 'labor' | 'transport';

interface AuthenticatedUser {
  id: number | string;
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  blocked?: boolean | null;
}

interface FeedQuantity {
  readonly value: number;
  readonly unit: FeedQuantityUnit;
}

interface FeedGeoPoint {
  readonly lat: number;
  readonly lng: number;
}

interface FeedGeo {
  readonly from?: FeedGeoPoint;
  readonly to?: FeedGeoPoint;
}

interface FeedResponseItem {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string | null;
  readonly type: FeedType;
  readonly sectorId: string | null;
  readonly title: string;
  readonly summary: string;
  readonly fromProvinceId: string | null;
  readonly toProvinceId: string | null;
  readonly mode: FeedMode;
  readonly quantity: FeedQuantity | null;
  readonly urgency: 1 | 2 | 3 | null;
  readonly credibility: 1 | 2 | 3 | null;
  readonly volumeScore: number | null;
  readonly tags: readonly string[];
  readonly originType: FeedOriginType | null;
  readonly originId: string | null;
  readonly connectionMatchId?: number | null;
  readonly source: {
    readonly kind: FeedSourceKind;
    readonly label: string;
    readonly url?: string;
  };
  readonly status: FeedStatus;
  readonly accessibilitySummary: string | null;
  readonly metadata?: Record<string, unknown> | null;
  readonly geo?: FeedGeo;
}

interface FeedCreatePayload {
  readonly type: FeedType;
  readonly title: string;
  readonly summary: string;
  readonly sectorId: string | null;
  readonly fromProvinceId: string | null;
  readonly toProvinceId: string | null;
  readonly mode: FeedMode;
  readonly quantity: FeedQuantity | null;
  readonly urgency: 1 | 2 | 3;
  readonly credibility: 1 | 2 | 3;
  readonly tags: readonly string[];
  readonly originType: FeedOriginType | null;
  readonly originId: string | null;
  readonly connectionMatchId: number | null;
  readonly accessibilitySummary: string | null;
  readonly metadata?: Record<string, unknown> | null;
  readonly geo?: FeedGeo;
}

interface FeedPublicationFormMetadata {
  readonly formKey?: string | null;
  readonly schemaVersion?: number | null;
}

interface FeedCursor {
  v: 1;
  sort: FeedSort;
  marker: {
    id: string;
    createdAt: string;
    score: number;
  };
}

interface FeedHighlightsQuery {
  readonly scope: HomeFeedScope;
  readonly filter: HomeFeedFilter;
  readonly search: string | null;
  readonly limit: number;
  readonly type: FeedType | null;
  readonly tag: string | null;
}

function normalizeString(value: unknown, maxLength = 500): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, maxLength);
}

function normalizeId(value: unknown): number | string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const numeric = Number.parseInt(normalized, 10);
  if (Number.isFinite(numeric) && String(numeric) === normalized) {
    return numeric;
  }

  return normalized;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePositiveInteger(value: unknown): number | null {
  const parsed = normalizeInteger(value);
  return parsed != null && parsed > 0 ? parsed : null;
}

function normalizeSort(value: unknown): FeedSort {
  const normalized = normalizeString(value, 40)?.toUpperCase() ?? 'NEWEST';
  if (!FEED_SORTS.has(normalized)) {
    return 'NEWEST';
  }
  return normalized as FeedSort;
}

function normalizeFeedType(value: unknown): FeedType | null {
  const normalized = normalizeString(value, 24)?.toUpperCase();
  if (!normalized || !FEED_TYPES.has(normalized)) {
    return null;
  }
  return normalized as FeedType;
}

function normalizeFeedMode(value: unknown): FeedMode | null {
  const normalized = normalizeString(value, 16)?.toUpperCase();
  if (!normalized || !FEED_MODES.has(normalized)) {
    return null;
  }
  return normalized as FeedMode;
}

function normalizeOriginType(value: unknown): FeedOriginType | null {
  const normalized = normalizeString(value, 24)?.toLowerCase();
  if (!normalized || !FEED_ORIGIN_TYPES.has(normalized)) {
    return null;
  }
  return normalized as FeedOriginType;
}

function normalizeSourceKind(value: unknown): FeedSourceKind {
  const normalized = normalizeString(value, 24)?.toUpperCase();
  if (!normalized || !FEED_SOURCES.has(normalized)) {
    return 'USER';
  }
  return normalized as FeedSourceKind;
}

function normalizeStatus(value: unknown): FeedStatus {
  const normalized = normalizeString(value, 16)?.toLowerCase();
  if (!normalized || !FEED_STATUSES.has(normalized)) {
    return 'confirmed';
  }
  return normalized as FeedStatus;
}

function normalizeQuantityUnit(value: unknown): FeedQuantityUnit | null {
  const normalized = normalizeString(value, 16);
  if (!normalized || !QUANTITY_UNITS.has(normalized)) {
    return null;
  }
  return normalized as FeedQuantityUnit;
}

function normalizeFeedTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();
  for (const entry of value) {
    const normalized = normalizeString(entry, 40);
    if (!normalized) {
      continue;
    }
    unique.add(normalized);
    if (unique.size >= 20) {
      break;
    }
  }

  return Array.from(unique);
}

function normalizeHomeFeedScope(value: unknown): HomeFeedScope {
  const normalized = normalizeString(value, 20)?.toLowerCase() ?? 'canada';
  if (!HOME_FEED_SCOPES.has(normalized)) {
    return 'canada';
  }
  return normalized as HomeFeedScope;
}

function normalizeHomeFeedFilter(value: unknown): HomeFeedFilter {
  const normalized = normalizeString(value, 20)?.toLowerCase() ?? 'all';
  if (!HOME_FEED_FILTERS.has(normalized)) {
    return 'all';
  }
  return normalized as HomeFeedFilter;
}

function normalizeFeedGeoPoint(value: unknown): FeedGeoPoint | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const lat = normalizeNumber(record.lat);
  const lng = normalizeNumber(record.lng);
  if (lat == null || lng == null) {
    return null;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { lat, lng };
}

function normalizeFeedGeo(value: unknown): FeedGeo | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const from = normalizeFeedGeoPoint(record.from);
  const to = normalizeFeedGeoPoint(record.to);
  if (!from && !to) {
    return undefined;
  }
  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
}

function sanitizeMetadataValue(value: unknown, depth = 0): unknown {
  if (value == null || depth > 4) {
    return undefined;
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized ? normalized.slice(0, 2000) : undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    const normalized = value
      .slice(0, 50)
      .map(entry => sanitizeMetadataValue(entry, depth + 1))
      .filter(entry => entry !== undefined);
    return normalized.length ? normalized : undefined;
  }
  if (typeof value !== 'object') {
    return undefined;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .slice(0, 50)
    .flatMap(([key, entry]) => {
      const normalizedKey = key.trim();
      if (!normalizedKey) {
        return [];
      }
      const normalizedValue = sanitizeMetadataValue(entry, depth + 1);
      return normalizedValue === undefined ? [] : [[normalizedKey, normalizedValue] as const];
    });

  return entries.length ? Object.fromEntries(entries) : undefined;
}

function sanitizeMetadata(value: unknown): Record<string, unknown> | null {
  const normalized = sanitizeMetadataValue(value, 0);
  if (!normalized || typeof normalized !== 'object' || Array.isArray(normalized)) {
    return null;
  }
  return normalized as Record<string, unknown>;
}

function readPublicationFormKey(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const metadata = value as { publicationForm?: FeedPublicationFormMetadata | null };
  return normalizeString(metadata.publicationForm?.formKey, 160);
}

function humanizeSearchToken(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim();
}

function collectMetadataSearchTokens(value: unknown, tokens: string[] = [], depth = 0): string[] {
  if (value == null || depth > 4) {
    return tokens;
  }

  if (typeof value === 'string') {
    const normalized = humanizeSearchToken(value);
    if (normalized) {
      tokens.push(normalized);
    }
    return tokens;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    tokens.push(String(value));
    return tokens;
  }

  if (Array.isArray(value)) {
    for (const entry of value.slice(0, 50)) {
      collectMetadataSearchTokens(entry, tokens, depth + 1);
    }
    return tokens;
  }

  if (typeof value !== 'object') {
    return tokens;
  }

  for (const [key, entry] of Object.entries(value as Record<string, unknown>).slice(0, 50)) {
    const normalizedKey = humanizeSearchToken(key);
    if (normalizedKey) {
      tokens.push(normalizedKey);
    }
    collectMetadataSearchTokens(entry, tokens, depth + 1);
  }

  return tokens;
}

function buildMetadataSearchText(value: unknown): string | null {
  const tokens = Array.from(new Set(collectMetadataSearchTokens(value).map(token => token.trim()).filter(Boolean)));
  return tokens.length ? tokens.join(' ').slice(0, 5000) : null;
}

function normalizeUrgencyOrCredibility(value: unknown, fallback: 1 | 2 | 3): 1 | 2 | 3 {
  const parsed = normalizeInteger(value);
  if (parsed === 1 || parsed === 2 || parsed === 3) {
    return parsed;
  }
  return fallback;
}

function resolveSortField(sort: FeedSort): 'urgency' | 'volumeScore' | 'credibility' | null {
  switch (sort) {
    case 'URGENCY':
      return 'urgency';
    case 'VOLUME':
      return 'volumeScore';
    case 'CREDIBILITY':
      return 'credibility';
    default:
      return null;
  }
}

function resolveSortScore(sort: FeedSort, item: FeedResponseItem): number {
  switch (sort) {
    case 'URGENCY':
      return item.urgency ?? 0;
    case 'VOLUME':
      return item.volumeScore ?? 0;
    case 'CREDIBILITY':
      return item.credibility ?? 0;
    default:
      return 0;
  }
}

function parseCursor(raw: string | null | undefined): FeedCursor | null {
  if (!raw) {
    return null;
  }

  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as Partial<FeedCursor>;
    if (parsed?.v !== 1) {
      return null;
    }
    if (!parsed.sort || !FEED_SORTS.has(parsed.sort)) {
      return null;
    }
    if (!parsed.marker || typeof parsed.marker !== 'object') {
      return null;
    }

    const marker = parsed.marker as FeedCursor['marker'];
    const createdAt = normalizeString(marker.createdAt, 60);
    const id = normalizeString(marker.id, 80);
    const score = normalizeNumber(marker.score);
    if (!createdAt || !id || score == null) {
      return null;
    }

    return {
      v: 1,
      sort: parsed.sort as FeedSort,
      marker: {
        createdAt,
        id,
        score,
      },
    };
  } catch {
    return null;
  }
}

function encodeCursor(sort: FeedSort, item: FeedResponseItem): string {
  const token: FeedCursor = {
    v: 1,
    sort,
    marker: {
      id: item.id,
      createdAt: item.createdAt,
      score: resolveSortScore(sort, item),
    },
  };
  return Buffer.from(JSON.stringify(token), 'utf8').toString('base64url');
}

function normalizeFindManyResult<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}

function normalizeIsoDate(value: unknown, fallback = new Date().toISOString()): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed.toISOString();
}

function mapFeedEntity(entity: Record<string, unknown>): FeedResponseItem {
  const quantityValue = normalizeNumber(entity.quantityValue);
  const quantityUnit = normalizeQuantityUnit(entity.quantityUnit);
  const quantity =
    quantityValue != null && quantityUnit
      ? {
          value: quantityValue,
          unit: quantityUnit,
        }
      : null;

  const sourceLabel = normalizeString(entity.sourceLabel, 180) ?? 'OpenG7';
  const sourceUrl = normalizeString(entity.sourceUrl, 500);
  const connectionMatchId = normalizePositiveInteger(entity.connectionMatchId);

  const mapped: FeedResponseItem = {
    id: String(entity.id),
    createdAt: normalizeIsoDate(entity.createdAt),
    updatedAt: entity.updatedAt ? normalizeIsoDate(entity.updatedAt) : null,
    type: normalizeFeedType(entity.type) ?? 'OFFER',
    sectorId: normalizeString(entity.sectorId, 80),
    title: normalizeString(entity.title, 180) ?? '',
    summary: normalizeString(entity.summary, 5000) ?? '',
    fromProvinceId: normalizeString(entity.fromProvinceId, 20),
    toProvinceId: normalizeString(entity.toProvinceId, 20),
    mode: normalizeFeedMode(entity.mode) ?? 'BOTH',
    quantity,
    urgency: normalizeUrgencyOrCredibility(entity.urgency, 1),
    credibility: normalizeUrgencyOrCredibility(entity.credibility, 1),
    volumeScore: normalizeNumber(entity.volumeScore),
    tags: normalizeFeedTags(entity.tags),
    originType: normalizeOriginType(entity.originType),
    originId: normalizeString(entity.originId, 120),
    ...(connectionMatchId ? { connectionMatchId } : {}),
    source: {
      kind: normalizeSourceKind(entity.sourceKind),
      label: sourceLabel,
      ...(sourceUrl ? { url: sourceUrl } : {}),
    },
    status: normalizeStatus(entity.status),
    accessibilitySummary: normalizeString(entity.accessibilitySummary, 5000),
    ...(sanitizeMetadata(entity.metadata) ? { metadata: sanitizeMetadata(entity.metadata) } : {}),
    ...(normalizeFeedGeo(entity.geo) ? { geo: normalizeFeedGeo(entity.geo) } : {}),
  };

  return mapped;
}

function sanitizeCreatePayload(input: unknown): FeedCreatePayload {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const source = raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
    ? (raw.data as Record<string, unknown>)
    : raw;

  const type = normalizeFeedType(source.type);
  if (!type) {
    throw new Error('type is required and must be a supported feed type.');
  }

  const title = normalizeString(source.title, 160);
  if (!title || title.length < 3) {
    throw new Error('title is required and must be at least 3 characters long.');
  }

  const summary = normalizeString(source.summary, 5000);
  if (!summary || summary.length < 10) {
    throw new Error('summary is required and must be at least 10 characters long.');
  }

  const mode = normalizeFeedMode(source.mode) ?? 'BOTH';
  const sectorId = normalizeString(source.sectorId, 80);
  const fromProvinceId = normalizeString(source.fromProvinceId, 20);
  const toProvinceId = normalizeString(source.toProvinceId, 20);

  const quantityRaw =
    source.quantity && typeof source.quantity === 'object' && !Array.isArray(source.quantity)
      ? (source.quantity as Record<string, unknown>)
      : null;
  let quantity: FeedQuantity | null = null;
  if (quantityRaw) {
    const quantityValue = normalizeNumber(quantityRaw.value);
    const quantityUnit = normalizeQuantityUnit(quantityRaw.unit);
    if (quantityValue == null || quantityValue <= 0 || !quantityUnit) {
      throw new Error('quantity must include a positive numeric value and a supported unit.');
    }
    quantity = {
      value: quantityValue,
      unit: quantityUnit,
    };
  }

  const urgency = normalizeUrgencyOrCredibility(source.urgency, 1);
  const credibility = normalizeUrgencyOrCredibility(source.credibility, 1);
  const tags = normalizeFeedTags(source.tags);
  const originType = normalizeOriginType(source.originType);
  const originId = normalizeString(source.originId, 120);
  if ((originType && !originId) || (!originType && originId)) {
    throw new Error('originType and originId must either both be provided or both be omitted.');
  }
  const connectionMatchIdRaw = source.connectionMatchId;
  const connectionMatchId =
    connectionMatchIdRaw == null ? null : normalizePositiveInteger(connectionMatchIdRaw);
  if (connectionMatchIdRaw != null && connectionMatchId == null) {
    throw new Error('connectionMatchId must be a positive integer when provided.');
  }
  const accessibilitySummary = normalizeString(source.accessibilitySummary, 5000);
  const metadata = sanitizeMetadata(source.metadata);
  const geo = normalizeFeedGeo(source.geo);

  return {
    type,
    title,
    summary,
    sectorId,
    fromProvinceId,
    toProvinceId,
    mode,
    quantity,
    urgency,
    credibility,
    tags,
    originType,
    originId,
    connectionMatchId,
    accessibilitySummary,
    ...(metadata ? { metadata } : {}),
    ...(geo ? { geo } : {}),
  };
}

function parseLimit(value: unknown): number {
  const parsed = normalizeInteger(value);
  if (parsed == null) {
    return DEFAULT_PAGE_LIMIT;
  }
  if (parsed < 1) {
    return 1;
  }
  if (parsed > MAX_PAGE_LIMIT) {
    return MAX_PAGE_LIMIT;
  }
  return parsed;
}

function parseRequestFilters(query: Record<string, unknown>): {
  readonly limit: number;
  readonly sort: FeedSort;
  readonly type: FeedType | null;
  readonly mode: FeedMode | null;
  readonly sectorId: string | null;
  readonly formKey: string | null;
  readonly fromProvinceId: string | null;
  readonly toProvinceId: string | null;
  readonly search: string | null;
  readonly cursor: FeedCursor | null;
} {
  const limit = parseLimit(query.limit);
  const sort = normalizeSort(query.sort);
  const type = normalizeFeedType(query.type);
  const mode = normalizeFeedMode(query.mode);
  const sectorId = normalizeString(query.sector ?? query.sectorId, 80);
  const formKey = normalizeString(query.formKey, 160);
  const fromProvinceId = normalizeString(query.fromProvince ?? query.fromProvinceId, 20);
  const toProvinceId = normalizeString(query.toProvince ?? query.toProvinceId, 20);
  const search = normalizeString(query.q, 120);
  const cursor = parseCursor(normalizeString(query.cursor, 600));

  return {
    limit,
    sort,
    type,
    mode,
    sectorId,
    formKey,
    fromProvinceId,
    toProvinceId,
    search,
    cursor,
  };
}

function mapHighlightsFilterToType(filter: HomeFeedFilter): FeedType | null {
  if (filter === 'offer') {
    return 'OFFER';
  }
  if (filter === 'request') {
    return 'REQUEST';
  }
  return null;
}

function resolveHighlightsTagSet(filter: HomeFeedFilter): ReadonlySet<string> | null {
  if (filter === 'labor') {
    return HOME_FEED_LABOR_TAGS;
  }
  if (filter === 'transport') {
    return HOME_FEED_TRANSPORT_TAGS;
  }
  return null;
}

function parseHighlightsQuery(query: Record<string, unknown>): FeedHighlightsQuery {
  const scope = normalizeHomeFeedScope(query.scope);
  const filter = normalizeHomeFeedFilter(query.filter);
  const filterType = mapHighlightsFilterToType(filter);
  const explicitType = normalizeFeedType(query.type);
  const tag = normalizeString(query.tag, 40)?.toLowerCase() ?? null;
  const search = normalizeString(query.q ?? query.search, 120)?.toLowerCase() ?? null;

  return {
    scope,
    filter,
    search,
    limit: parseLimit(query.limit),
    type: filterType ?? explicitType,
    tag,
  };
}

function buildSort(sort: FeedSort): string[] {
  const primary = resolveSortField(sort);
  if (!primary) {
    return ['createdAt:desc', 'id:desc'];
  }
  return [`${primary}:desc`, 'createdAt:desc', 'id:desc'];
}

function buildCursorFilter(sort: FeedSort, cursor: FeedCursor): Record<string, unknown> {
  const cursorId = normalizeId(cursor.marker.id);
  if (cursorId == null) {
    return {};
  }

  if (sort === 'NEWEST') {
    return {
      $or: [
        {
          createdAt: {
            $lt: cursor.marker.createdAt,
          },
        },
        {
          createdAt: cursor.marker.createdAt,
          id: {
            $lt: cursorId,
          },
        },
      ],
    };
  }

  const scoreField = resolveSortField(sort);
  if (!scoreField) {
    return {};
  }

  return {
    $or: [
      {
        [scoreField]: {
          $lt: cursor.marker.score,
        },
      },
      {
        [scoreField]: cursor.marker.score,
        createdAt: {
          $lt: cursor.marker.createdAt,
        },
      },
      {
        [scoreField]: cursor.marker.score,
        createdAt: cursor.marker.createdAt,
        id: {
          $lt: cursorId,
        },
      },
    ],
  };
}

function createFilters(parsed: ReturnType<typeof parseRequestFilters>): Record<string, unknown> {
  const conditions: Record<string, unknown>[] = [
    {
      status: 'confirmed',
    },
  ];

  if (parsed.type) {
    conditions.push({ type: parsed.type });
  }
  if (parsed.mode) {
    conditions.push({ mode: parsed.mode });
  }
  if (parsed.sectorId) {
    conditions.push({ sectorId: parsed.sectorId });
  }
  if (parsed.formKey) {
    conditions.push({ publicationFormKey: parsed.formKey });
  }
  if (parsed.fromProvinceId) {
    conditions.push({ fromProvinceId: parsed.fromProvinceId });
  }
  if (parsed.toProvinceId) {
    conditions.push({ toProvinceId: parsed.toProvinceId });
  }

  if (parsed.search) {
    conditions.push({
      $or: [
        {
          title: {
            $containsi: parsed.search,
          },
        },
        {
          summary: {
            $containsi: parsed.search,
          },
        },
        {
          sourceLabel: {
            $containsi: parsed.search,
          },
        },
        {
          searchText: {
            $containsi: parsed.search,
          },
        },
      ],
    });
  }

  if (parsed.cursor) {
    conditions.push(buildCursorFilter(parsed.sort, parsed.cursor));
  }

  if (conditions.length === 1) {
    return conditions[0];
  }
  return {
    $and: conditions,
  };
}

function createHighlightsBaseFilters(parsed: FeedHighlightsQuery): Record<string, unknown> {
  const conditions: Record<string, unknown>[] = [
    {
      status: 'confirmed',
    },
  ];

  if (parsed.scope === 'g7') {
    conditions.push({
      sourceKind: {
        $in: ['GOV', 'PARTNER'],
      },
    });
  } else if (parsed.scope === 'world') {
    conditions.push({
      sourceKind: {
        $ne: 'GOV',
      },
    });
  }

  if (parsed.type) {
    conditions.push({
      type: parsed.type,
    });
  }

  if (conditions.length === 1) {
    return conditions[0];
  }
  return {
    $and: conditions,
  };
}

function matchesHighlightsScope(item: FeedResponseItem, scope: HomeFeedScope): boolean {
  const kind = item.source.kind;
  if (scope === 'canada') {
    return true;
  }
  if (scope === 'g7') {
    return kind === 'GOV' || kind === 'PARTNER';
  }
  return kind !== 'GOV';
}

function normalizeLowercaseTags(tags: readonly string[] | null | undefined): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }
  const normalized: string[] = [];
  for (const tag of tags) {
    if (typeof tag !== 'string') {
      continue;
    }
    const value = tag.trim().toLowerCase();
    if (!value) {
      continue;
    }
    normalized.push(value);
  }
  return normalized;
}

function matchesHighlightsFilter(
  item: FeedResponseItem,
  filter: HomeFeedFilter,
  type: FeedType | null,
  tag: string | null
): boolean {
  if (type && item.type !== type) {
    return false;
  }

  const lowerTags = normalizeLowercaseTags(item.tags);
  const setFilter = resolveHighlightsTagSet(filter);
  if (setFilter) {
    return lowerTags.some((entry) => setFilter.has(entry));
  }

  if (tag) {
    return lowerTags.includes(tag);
  }

  return true;
}

function matchesHighlightsSearch(item: FeedResponseItem, search: string | null): boolean {
  if (!search) {
    return true;
  }

  const haystack = [
    item.title,
    item.summary,
    item.source.label,
    item.sectorId ?? '',
    item.fromProvinceId ?? '',
    item.toProvinceId ?? '',
    buildMetadataSearchText(item.metadata) ?? '',
    ...item.tags,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(search);
}

function compareByNewestThenId(left: FeedResponseItem, right: FeedResponseItem): number {
  const createdAtCompare = right.createdAt.localeCompare(left.createdAt);
  if (createdAtCompare !== 0) {
    return createdAtCompare;
  }
  return right.id.localeCompare(left.id);
}

function buildSourceLabel(user: AuthenticatedUser): string {
  const firstName = normalizeString(user.firstName, 80);
  const lastName = normalizeString(user.lastName, 80);
  const fullName = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  if (fullName) {
    return fullName;
  }
  return (
    normalizeString(user.email, 180) ??
    normalizeString(user.username, 180) ??
    `User ${String(user.id)}`
  );
}

function normalizeIdempotencyKey(ctx: Record<string, unknown>): string | null {
  const headers =
    ctx?.request && typeof ctx.request === 'object'
      ? (((ctx.request as Record<string, unknown>).header as Record<string, unknown>) ?? {})
      : {};
  return normalizeString(headers['idempotency-key'], 140);
}

async function resolveCurrentUser(
  strapi: Core.Strapi,
  ctx: Record<string, unknown>
): Promise<AuthenticatedUser | null> {
  const state = (ctx.state ?? {}) as Record<string, unknown>;
  const currentUser = (state.user ?? null) as AuthenticatedUser | null;
  if (!currentUser?.id) {
    return null;
  }

  const claims = await (async (): Promise<SessionTokenClaims | null> => {
    const headers =
      ctx.request && typeof ctx.request === 'object'
        ? ((ctx.request as Record<string, unknown>).header as Record<string, unknown>)
        : null;
    const authorization = normalizeString(headers?.authorization, 2048);
    if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
      return {
        id: currentUser.id,
        sid: null,
        sv: null,
        iat: null,
      };
    }

    try {
      const token = authorization.slice(7).trim();
      const jwtService = strapi.plugin('users-permissions').service('jwt') as {
        verify(token: string): Promise<Record<string, unknown>>;
      };
      const payload = await jwtService.verify(token);
      const sid = normalizeString(payload.sid, 120);
      const sv = normalizeInteger(payload.sv);
      const iat = normalizeInteger(payload.iat);
      return {
        id: currentUser.id,
        sid,
        sv,
        iat,
      };
    } catch {
      return null;
    }
  })();

  const validation = await validateSessionForToken(strapi, currentUser.id, claims, ctx);
  if (!validation.valid) {
    return null;
  }

  if (currentUser.blocked === true) {
    return null;
  }

  return currentUser;
}

function generateEventId(itemId: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `feed-${Date.now()}-${itemId}-${random}`;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async index(ctx: Record<string, unknown>) {
    const currentUser = await resolveCurrentUser(strapi, ctx);
    if (!currentUser) {
      return (ctx as any).unauthorized();
    }

    const query =
      ctx.request && typeof ctx.request === 'object'
        ? (((ctx.request as Record<string, unknown>).query as Record<string, unknown>) ?? {})
        : {};

    const parsed = parseRequestFilters(query);
    if (query.cursor && !parsed.cursor) {
      return (ctx as any).badRequest('cursor is invalid.');
    }

    if (parsed.cursor && parsed.cursor.sort !== parsed.sort) {
      return (ctx as any).badRequest('cursor sort does not match requested sort.');
    }

    const entities = normalizeFindManyResult(
      await strapi.entityService.findMany(FEED_UID, {
        filters: createFilters(parsed),
        sort: buildSort(parsed.sort),
        limit: parsed.limit + 1,
      })
    );

    const hasMore = entities.length > parsed.limit;
    const pageEntities = hasMore ? entities.slice(0, parsed.limit) : entities;
    const items = pageEntities.map((entity) => mapFeedEntity(entity as Record<string, unknown>));
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(parsed.sort, items[items.length - 1])
      : null;

    (ctx as any).body = {
      data: items,
      cursor: nextCursor,
    };
  },

  async findOne(ctx: Record<string, unknown>) {
    const currentUser = await resolveCurrentUser(strapi, ctx);
    if (!currentUser) {
      return (ctx as any).unauthorized();
    }

    const params = (ctx.params ?? {}) as Record<string, unknown>;
    const rawId = normalizeString(params.id, 80);
    if (!rawId) {
      return (ctx as any).badRequest('id is required.');
    }

    const normalizedId = normalizeId(rawId);
    if (normalizedId == null) {
      return (ctx as any).badRequest('id is invalid.');
    }

    const entity = normalizeFindManyResult(
      await strapi.entityService.findMany(FEED_UID, {
        filters: {
          id: normalizedId,
          status: 'confirmed',
        },
        limit: 1,
      })
    )[0] as Record<string, unknown> | undefined;

    if (!entity) {
      return (ctx as any).notFound('Feed item not found.');
    }

    (ctx as any).body = {
      data: mapFeedEntity(entity),
    };
  },

  async highlights(ctx: Record<string, unknown>) {
    const query =
      ctx.request && typeof ctx.request === 'object'
        ? (((ctx.request as Record<string, unknown>).query as Record<string, unknown>) ?? {})
        : {};
    const parsed = parseHighlightsQuery(query);
    const poolLimit = Math.min(
      MAX_HIGHLIGHTS_POOL_LIMIT,
      Math.max(parsed.limit * 8, DEFAULT_HIGHLIGHTS_POOL_LIMIT)
    );

    const entities = normalizeFindManyResult(
      await strapi.entityService.findMany(FEED_UID, {
        filters: createHighlightsBaseFilters(parsed),
        sort: ['createdAt:desc', 'id:desc'],
        limit: poolLimit,
      })
    );

    const items = entities
      .map((entity) => mapFeedEntity(entity as Record<string, unknown>))
      .filter(
        (item) =>
          matchesHighlightsScope(item, parsed.scope) &&
          matchesHighlightsFilter(item, parsed.filter, parsed.type, parsed.tag) &&
          matchesHighlightsSearch(item, parsed.search)
      )
      .sort(compareByNewestThenId)
      .slice(0, parsed.limit);

    const setHeader = (ctx as any).set;
    if (typeof setHeader === 'function') {
      setHeader.call(ctx, 'Cache-Control', HIGHLIGHTS_CACHE_CONTROL);
    }

    (ctx as any).body = {
      data: items,
      meta: {
        scope: parsed.scope,
        filter: parsed.filter,
        search: parsed.search ?? '',
        limit: parsed.limit,
        count: items.length,
      },
    };
  },

  async create(ctx: Record<string, unknown>) {
    const currentUser = await resolveCurrentUser(strapi, ctx);
    if (!currentUser) {
      return (ctx as any).unauthorized();
    }

    const body =
      ctx.request && typeof ctx.request === 'object'
        ? (ctx.request as Record<string, unknown>).body
        : undefined;

    let payload: FeedCreatePayload;
    try {
      payload = sanitizeCreatePayload(body);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid feed payload.';
      return (ctx as any).badRequest(message);
    }

    const idempotencyKey = normalizeIdempotencyKey(ctx);
    if (idempotencyKey) {
      const existing = normalizeFindManyResult(
        await strapi.entityService.findMany(FEED_UID, {
          filters: {
            user: { id: currentUser.id },
            idempotencyKey,
          },
          sort: ['createdAt:desc'],
          limit: 1,
        })
      )[0] as Record<string, unknown> | undefined;

      if (existing) {
        (ctx as any).body = {
          data: mapFeedEntity(existing),
        };
        return;
      }
    }

    const volumeScore = payload.quantity ? payload.quantity.value : 0;
    const created = (await strapi.entityService.create(FEED_UID, {
      data: {
        user: currentUser.id,
        type: payload.type,
        title: payload.title,
        summary: payload.summary,
        sectorId: payload.sectorId,
        fromProvinceId: payload.fromProvinceId,
        toProvinceId: payload.toProvinceId,
        mode: payload.mode,
        quantityValue: payload.quantity?.value ?? null,
        quantityUnit: payload.quantity?.unit ?? null,
        urgency: payload.urgency,
        credibility: payload.credibility,
        volumeScore,
        tags: payload.tags,
        originType: payload.originType,
        originId: payload.originId,
        connectionMatchId: payload.connectionMatchId,
        sourceKind: 'USER',
        sourceLabel: buildSourceLabel(currentUser),
        sourceUrl: null,
        status: 'confirmed',
        accessibilitySummary: payload.accessibilitySummary,
        metadata: payload.metadata ?? null,
        publicationFormKey: readPublicationFormKey(payload.metadata),
        searchText: buildMetadataSearchText(payload.metadata),
        geo: payload.geo ?? null,
        idempotencyKey: idempotencyKey ?? null,
      } as any,
    })) as Record<string, unknown>;

    const item = mapFeedEntity(created);
    const envelopeEventId = generateEventId(item.id);
    broadcastFeedEnvelope({
      eventId: envelopeEventId,
      type: 'feed.item.created',
      payload: item,
      cursor: encodeCursor('NEWEST', item),
    });

    (ctx as any).status = 201;
    (ctx as any).body = {
      data: item,
    };
  },

  async stream(ctx: Record<string, unknown>) {
    const currentUser = await resolveCurrentUser(strapi, ctx);
    if (!currentUser) {
      return (ctx as any).unauthorized();
    }

    const response = (ctx as any).res as {
      statusCode: number;
      setHeader: (name: string, value: string) => void;
      flushHeaders?: () => void;
    };

    response.statusCode = 200;
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders?.();

    (ctx as any).respond = false;

    const clientId = registerFeedStreamClient(response as any, String(currentUser.id));
    const cleanup = () => unregisterFeedStreamClient(clientId);

    const request = (ctx as any).req as {
      on: (event: string, listener: () => void) => void;
      setTimeout?: (timeout: number) => void;
    };

    request.setTimeout?.(0);
    request.on('close', cleanup);
    request.on('end', cleanup);
    request.on('error', cleanup);
  },
});
