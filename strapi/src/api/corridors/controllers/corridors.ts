import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';

const FEED_UID = 'api::feed.feed' as any;
const DEFAULT_CORRIDORS_LIMIT = 5;
const MAX_CORRIDORS_LIMIT = 12;
const FEED_PULL_LIMIT = 300;
const FALLBACK_TIMESTAMP = '1970-01-01T00:00:00.000Z';

type CorridorsStatusLevel = 'ok' | 'warning' | 'critical' | 'info';
type FeedType = 'OFFER' | 'REQUEST' | null;

interface CorridorsRealtimeStatus {
  readonly level: CorridorsStatusLevel;
  readonly labelKey: string;
}

interface CorridorsRealtimeItem {
  readonly id: string;
  readonly label: string;
  readonly route: string;
  readonly meta: string;
}

interface CorridorsRealtimeSnapshot {
  readonly titleKey: string;
  readonly subtitleKey: string;
  readonly items: readonly CorridorsRealtimeItem[];
  readonly status: CorridorsRealtimeStatus;
  readonly cta: {
    readonly labelKey: string;
  };
  readonly timestamp: string;
}

interface CorridorAccumulator {
  id: string;
  route: string;
  events: number;
  offers: number;
  requests: number;
  maxUrgency: 1 | 2 | 3;
  latestAt: string;
}

function normalizeFindManyResult<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return [...value];
  }
  return [value];
}

function normalizeString(value: unknown, maxLength = 120): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, maxLength);
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

function normalizeIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function normalizeProvinceId(value: unknown): string | null {
  const normalized = normalizeString(value, 20);
  return normalized ? normalized.toUpperCase() : null;
}

function normalizeFeedType(value: unknown): FeedType {
  const normalized = normalizeString(value, 24)?.toUpperCase();
  if (normalized === 'OFFER' || normalized === 'REQUEST') {
    return normalized;
  }
  return null;
}

function normalizeUrgency(value: unknown): 1 | 2 | 3 {
  const parsed = normalizeInteger(value);
  if (parsed === 1 || parsed === 2 || parsed === 3) {
    return parsed;
  }
  return 1;
}

function parseLimit(value: unknown): number {
  const parsed = normalizeInteger(value);
  if (parsed == null) {
    return DEFAULT_CORRIDORS_LIMIT;
  }
  if (parsed < 1) {
    return 1;
  }
  if (parsed > MAX_CORRIDORS_LIMIT) {
    return MAX_CORRIDORS_LIMIT;
  }
  return parsed;
}

function createEmptySnapshot(timestamp = new Date().toISOString()): CorridorsRealtimeSnapshot {
  return {
    titleKey: 'home.corridorsRealtime.title',
    subtitleKey: 'home.corridorsRealtime.subtitle',
    items: [],
    status: {
      level: 'info',
      labelKey: 'home.corridorsRealtime.status.monitoring',
    },
    cta: {
      labelKey: 'home.corridorsRealtime.cta.viewMap',
    },
    timestamp,
  };
}

function buildStatus(totalEvents: number, maxUrgency: number): CorridorsRealtimeStatus {
  if (totalEvents <= 0) {
    return {
      level: 'info',
      labelKey: 'home.corridorsRealtime.status.monitoring',
    };
  }

  if (maxUrgency >= 3 && totalEvents >= 6) {
    return {
      level: 'critical',
      labelKey: 'home.corridorsRealtime.status.capacityReached',
    };
  }

  if (maxUrgency >= 3 || totalEvents >= 4) {
    return {
      level: 'warning',
      labelKey: 'home.corridorsRealtime.status.capacityReached',
    };
  }

  return {
    level: 'ok',
    labelKey: 'home.corridorsRealtime.status.monitoring',
  };
}

function buildItemMeta(entry: CorridorAccumulator): string {
  if (entry.offers > 0 && entry.requests > 0) {
    return `${entry.offers} offers, ${entry.requests} requests`;
  }
  if (entry.offers > 0) {
    return `${entry.offers} offers`;
  }
  if (entry.requests > 0) {
    return `${entry.requests} requests`;
  }
  return `${entry.events} updates`;
}

function buildSnapshot(
  entities: readonly Record<string, unknown>[],
  limit: number,
): CorridorsRealtimeSnapshot {
  const corridors = new Map<string, CorridorAccumulator>();
  let latestTimestamp: string | null = null;

  for (const entity of entities) {
    const fromProvinceId = normalizeProvinceId(entity.fromProvinceId);
    const toProvinceId = normalizeProvinceId(entity.toProvinceId);
    if (!fromProvinceId && !toProvinceId) {
      continue;
    }

    const routeId = `${fromProvinceId ?? 'xx'}-${toProvinceId ?? 'xx'}`.toLowerCase();
    const route = `${fromProvinceId ?? '--'} -> ${toProvinceId ?? '--'}`;
    const createdAt = normalizeIsoDate(entity.createdAt) ?? FALLBACK_TIMESTAMP;

    const current = corridors.get(routeId) ?? {
      id: routeId,
      route,
      events: 0,
      offers: 0,
      requests: 0,
      maxUrgency: 1,
      latestAt: createdAt,
    };

    current.events += 1;
    const type = normalizeFeedType(entity.type);
    if (type === 'OFFER') {
      current.offers += 1;
    } else if (type === 'REQUEST') {
      current.requests += 1;
    }

    current.maxUrgency = Math.max(current.maxUrgency, normalizeUrgency(entity.urgency)) as
      | 1
      | 2
      | 3;
    if (createdAt.localeCompare(current.latestAt) > 0) {
      current.latestAt = createdAt;
    }

    corridors.set(routeId, current);

    if (!latestTimestamp || createdAt.localeCompare(latestTimestamp) > 0) {
      latestTimestamp = createdAt;
    }
  }

  const ranked = Array.from(corridors.values()).sort((left, right) => {
    const urgencyCompare = right.maxUrgency - left.maxUrgency;
    if (urgencyCompare !== 0) {
      return urgencyCompare;
    }

    const eventsCompare = right.events - left.events;
    if (eventsCompare !== 0) {
      return eventsCompare;
    }

    const latestCompare = right.latestAt.localeCompare(left.latestAt);
    if (latestCompare !== 0) {
      return latestCompare;
    }

    return left.id.localeCompare(right.id);
  });

  if (!ranked.length) {
    return createEmptySnapshot(latestTimestamp ?? new Date().toISOString());
  }

  const totalEvents = ranked.reduce((total, item) => total + item.events, 0);
  const highestUrgency = ranked.reduce((max, item) => Math.max(max, item.maxUrgency), 1);
  const status = buildStatus(totalEvents, highestUrgency);

  return {
    titleKey: 'home.corridorsRealtime.title',
    subtitleKey: 'home.corridorsRealtime.subtitle',
    items: ranked.slice(0, limit).map((entry) => ({
      id: entry.id,
      label: `${entry.events} active updates`,
      route: entry.route,
      meta: buildItemMeta(entry),
    })),
    status,
    cta: {
      labelKey: 'home.corridorsRealtime.cta.viewMap',
    },
    timestamp: latestTimestamp ?? new Date().toISOString(),
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async realtime(ctx: Context) {
    const query = (ctx.request.query ?? {}) as Record<string, unknown>;
    const limit = parseLimit(query.limit);

    try {
      const entities = normalizeFindManyResult(
        (await strapi.entityService.findMany(FEED_UID, {
          filters: {
            status: 'confirmed',
          },
          sort: ['createdAt:desc', 'id:desc'],
          limit: FEED_PULL_LIMIT,
        })) as Record<string, unknown> | Record<string, unknown>[] | null | undefined,
      );

      ctx.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=30');
      ctx.body = buildSnapshot(entities, limit);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      strapi.log.error(`Failed to build /api/corridors/realtime snapshot: ${message}`);

      ctx.set('Cache-Control', 'no-store');
      ctx.body = createEmptySnapshot();
    }
  },
});
