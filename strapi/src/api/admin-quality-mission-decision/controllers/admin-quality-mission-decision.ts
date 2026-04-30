import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';

const MISSION_DECISION_UID =
  'api::admin-quality-mission-decision.admin-quality-mission-decision' as any;

const ALLOWED_KINDS = new Set(['core', 'safety-net', 'governance']);
const ALLOWED_STATUSES = new Set([
  'proposed',
  'approved',
  'in-progress',
  'proof-returned',
  'done',
  'deferred',
  'rejected',
  'blocked',
]);

interface MissionDecisionEntity {
  readonly id?: number | string;
  readonly recommendationId?: unknown;
  readonly entryId?: unknown;
  readonly kind?: unknown;
  readonly status?: unknown;
  readonly title?: unknown;
  readonly message?: unknown;
  readonly operatorPrompt?: unknown;
  readonly metadata?: unknown;
  readonly decidedByUserId?: unknown;
  readonly createdAt?: unknown;
  readonly updatedAt?: unknown;
}

interface MissionDecisionPayload {
  readonly recommendationId: string;
  readonly entryId: string;
  readonly kind: string;
  readonly status: string;
  readonly title: string | null;
  readonly message: string | null;
  readonly operatorPrompt: string | null;
  readonly metadata: Record<string, unknown>;
  readonly decidedByUserId: string | null;
}

function normalizeString(value: unknown, maxLength = 320): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function normalizeObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
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

function toMissionDecisionResponse(entity: MissionDecisionEntity) {
  return {
    id: entity.id != null ? String(entity.id) : null,
    recommendationId: typeof entity.recommendationId === 'string' ? entity.recommendationId : '',
    entryId: typeof entity.entryId === 'string' ? entity.entryId : '',
    kind: typeof entity.kind === 'string' ? entity.kind : 'core',
    status: typeof entity.status === 'string' ? entity.status : 'proposed',
    title: typeof entity.title === 'string' ? entity.title : null,
    message: typeof entity.message === 'string' ? entity.message : null,
    operatorPrompt: typeof entity.operatorPrompt === 'string' ? entity.operatorPrompt : null,
    metadata: normalizeObject(entity.metadata),
    decidedByUserId: typeof entity.decidedByUserId === 'string' ? entity.decidedByUserId : null,
    createdAt: typeof entity.createdAt === 'string' ? entity.createdAt : null,
    updatedAt: typeof entity.updatedAt === 'string' ? entity.updatedAt : null,
  };
}

function sanitizePayload(
  body: unknown,
  recommendationIdParam: unknown,
  userId: unknown,
): MissionDecisionPayload {
  const record =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const recommendationId =
    normalizeString(recommendationIdParam, 180) ?? normalizeString(record.recommendationId, 180);
  const entryId = normalizeString(record.entryId, 180);
  const kind = normalizeString(record.kind, 40);
  const status = normalizeString(record.status, 40);

  if (!recommendationId) {
    throw new Error('recommendationId is required.');
  }
  if (!entryId) {
    throw new Error('entryId is required.');
  }
  if (!kind || !ALLOWED_KINDS.has(kind)) {
    throw new Error('kind is invalid.');
  }
  if (!status || !ALLOWED_STATUSES.has(status)) {
    throw new Error('status is invalid.');
  }

  return {
    recommendationId,
    entryId,
    kind,
    status,
    title: normalizeString(record.title, 220),
    message: normalizeString(record.message, 1_000),
    operatorPrompt: normalizeString(record.operatorPrompt, 2_000),
    metadata: normalizeObject(record.metadata),
    decidedByUserId: userId == null ? null : String(userId),
  };
}

async function findDecisionByRecommendationId(
  strapi: Core.Strapi,
  recommendationId: string,
): Promise<MissionDecisionEntity | null> {
  const existing = await strapi.entityService.findMany(MISSION_DECISION_UID, {
    filters: {
      recommendationId,
    },
    limit: 1,
  });

  return (normalizeFindManyResult(existing)[0] as MissionDecisionEntity | undefined) ?? null;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(ctx: Context) {
    const entries = await strapi.entityService.findMany(MISSION_DECISION_UID, {
      sort: ['updatedAt:desc'],
    });

    ctx.body = {
      data: {
        generatedAt: new Date().toISOString(),
        decisions: normalizeFindManyResult(entries).map((entry) =>
          toMissionDecisionResponse(entry as MissionDecisionEntity),
        ),
      },
    };
  },

  async upsert(ctx: Context) {
    try {
      const payload = sanitizePayload(
        ctx.request.body,
        ctx.params?.recommendationId,
        ctx.state?.user?.id,
      );
      const existing = await findDecisionByRecommendationId(strapi, payload.recommendationId);
      const saved = existing?.id
        ? await strapi.entityService.update(MISSION_DECISION_UID, existing.id, {
            data: payload as any,
          })
        : await strapi.entityService.create(MISSION_DECISION_UID, {
            data: payload as any,
          });

      ctx.body = {
        data: toMissionDecisionResponse(saved as MissionDecisionEntity),
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Invalid admin quality mission decision payload.';
      ctx.badRequest(message);
    }
  },

  async delete(ctx: Context) {
    const recommendationId = normalizeString(ctx.params?.recommendationId, 180);
    if (!recommendationId) {
      ctx.badRequest('recommendationId is required.');
      return;
    }

    const existing = await findDecisionByRecommendationId(strapi, recommendationId);
    if (!existing?.id) {
      ctx.body = {
        data: {
          recommendationId,
          deleted: false,
        },
      };
      return;
    }

    await strapi.entityService.delete(MISSION_DECISION_UID, existing.id);
    ctx.body = {
      data: {
        recommendationId,
        deleted: true,
      },
    };
  },
});
