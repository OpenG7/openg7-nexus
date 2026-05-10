import type { Core } from '@strapi/strapi';

const FEED_ACTION_UID = 'api::feed-action.feed-action' as any;
const TARGET_TYPES = new Set(['opportunity', 'alert', 'indicator', 'feed-item']);
const ACTION_TYPES = new Set([
  'save',
  'unsave',
  'subscribe',
  'report-update',
  'report-opportunity',
  'archive',
  'duplicate',
  'share',
  'create-indicator-alert',
]);
const STATUSES = new Set(['completed', 'queued', 'failed']);

interface AuthenticatedUser {
  id: number | string;
}

interface FeedActionPayload {
  targetType: string;
  targetId: string;
  action: string;
  status: string;
  sourceRoute: string | null;
  targetRoute: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  correlationId: string | null;
}

interface FeedActionEntity extends Record<string, unknown> {
  id: number | string;
}

function normalizeString(value: unknown, maxLength = 500): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, maxLength) : null;
}

function normalizeEnum(value: unknown, allowed: Set<string>, fallback?: string): string | null {
  const normalized = normalizeString(value, 80)?.toLowerCase();
  if (normalized && allowed.has(normalized)) {
    return normalized;
  }
  return fallback ?? null;
}

function normalizeMetadata(value: unknown): Record<string, unknown> | null {
  if (value == null) {
    return null;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('metadata must be an object.');
  }
  return value as Record<string, unknown>;
}

function normalizeIsoDate(value: unknown): string | null {
  const normalized = normalizeString(value, 80);
  if (!normalized) {
    return null;
  }
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function normalizeIdempotencyKey(ctx: Record<string, unknown>): string | null {
  const headers =
    ctx.request && typeof ctx.request === 'object'
      ? (((ctx.request as Record<string, unknown>).header as Record<string, unknown>) ?? {})
      : {};
  return normalizeString(headers['idempotency-key'], 140);
}

function normalizeFindManyResult<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function sanitizePayload(payload: unknown): FeedActionPayload {
  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const targetType = normalizeEnum(record.targetType, TARGET_TYPES);
  const targetId = normalizeString(record.targetId, 180);
  const action = normalizeEnum(record.action, ACTION_TYPES);
  const status = normalizeEnum(record.status, STATUSES, 'completed') ?? 'completed';
  const occurredAt = normalizeIsoDate(record.occurredAt) ?? new Date().toISOString();

  if (!targetType) {
    throw new Error('targetType is required.');
  }
  if (!targetId) {
    throw new Error('targetId is required.');
  }
  if (!action) {
    throw new Error('action is required.');
  }

  return {
    targetType,
    targetId,
    action,
    status,
    sourceRoute: normalizeString(record.sourceRoute, 240),
    targetRoute: normalizeString(record.targetRoute, 240),
    metadata: normalizeMetadata(record.metadata),
    occurredAt,
    correlationId: normalizeString(record.correlationId, 160),
  };
}

function toFeedActionResponse(entity: FeedActionEntity) {
  return {
    id: String(entity.id),
    targetType: typeof entity.targetType === 'string' ? entity.targetType : 'feed-item',
    targetId: typeof entity.targetId === 'string' ? entity.targetId : '',
    action: typeof entity.action === 'string' ? entity.action : 'save',
    status: typeof entity.status === 'string' ? entity.status : 'completed',
    sourceRoute: typeof entity.sourceRoute === 'string' ? entity.sourceRoute : null,
    targetRoute: typeof entity.targetRoute === 'string' ? entity.targetRoute : null,
    metadata:
      entity.metadata && typeof entity.metadata === 'object' && !Array.isArray(entity.metadata)
        ? (entity.metadata as Record<string, unknown>)
        : null,
    occurredAt: typeof entity.occurredAt === 'string' ? entity.occurredAt : '',
    createdAt: typeof entity.createdAt === 'string' ? entity.createdAt : null,
    updatedAt: typeof entity.updatedAt === 'string' ? entity.updatedAt : null,
    correlationId: typeof entity.correlationId === 'string' ? entity.correlationId : null,
    idempotencyKey: typeof entity.idempotencyKey === 'string' ? entity.idempotencyKey : null,
  };
}

function buildListFilters(userId: number | string, query: Record<string, unknown>) {
  const filters: Record<string, unknown> = {
    user: {
      id: userId,
    },
  };
  const targetType = normalizeEnum(query.targetType, TARGET_TYPES);
  const targetId = normalizeString(query.targetId, 180);
  const action = normalizeEnum(query.action, ACTION_TYPES);

  if (targetType) {
    filters.targetType = targetType;
  }
  if (targetId) {
    filters.targetId = targetId;
  }
  if (action) {
    filters.action = action;
  }

  return filters;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async me(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    const entries = await strapi.entityService.findMany(FEED_ACTION_UID, {
      filters: buildListFilters(currentUser.id, ctx.request?.query ?? {}),
      sort: ['occurredAt:desc', 'createdAt:desc'],
      limit: 100,
    });

    ctx.body = {
      data: normalizeFindManyResult(entries).map((entry) =>
        toFeedActionResponse(entry as FeedActionEntity),
      ),
    };
  },

  async createMe(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    let payload: FeedActionPayload;
    try {
      payload = sanitizePayload(ctx.request.body);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid feed action payload.';
      return ctx.badRequest(message);
    }

    const idempotencyKey = normalizeIdempotencyKey(ctx);
    if (idempotencyKey) {
      const existing = normalizeFindManyResult(
        await strapi.entityService.findMany(FEED_ACTION_UID, {
          filters: {
            user: { id: currentUser.id },
            idempotencyKey,
          },
          sort: ['createdAt:desc'],
          limit: 1,
        }),
      )[0] as FeedActionEntity | undefined;

      if (existing) {
        ctx.body = {
          data: toFeedActionResponse(existing),
        };
        return;
      }
    }

    const created = await strapi.entityService.create(FEED_ACTION_UID, {
      data: {
        user: currentUser.id,
        targetType: payload.targetType,
        targetId: payload.targetId,
        action: payload.action,
        status: payload.status,
        sourceRoute: payload.sourceRoute,
        targetRoute: payload.targetRoute,
        metadata: payload.metadata,
        occurredAt: payload.occurredAt,
        correlationId: payload.correlationId,
        idempotencyKey,
      } as any,
    });

    ctx.status = 201;
    ctx.body = {
      data: toFeedActionResponse(created as FeedActionEntity),
    };
  },
});
