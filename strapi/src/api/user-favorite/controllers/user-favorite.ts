import type { Core } from '@strapi/strapi';

const USER_FAVORITE_UID = 'api::user-favorite.user-favorite' as any;

interface AuthenticatedUser {
  id: number | string;
}

interface FavoriteEntity {
  id: number | string;
  entityType?: unknown;
  entityId?: unknown;
  metadata?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface FavoritePayload {
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeEntityType(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return normalized.toLowerCase();
}

function normalizeFavoriteId(value: unknown): number | string | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const asInteger = Number.parseInt(normalized, 10);
  if (Number.isFinite(asInteger) && String(asInteger) === normalized) {
    return asInteger;
  }

  return normalized;
}

function sanitizeMetadata(value: unknown): Record<string, unknown> | null {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('metadata must be an object.');
  }

  return value as Record<string, unknown>;
}

function sanitizeFavoritePayload(payload: unknown): FavoritePayload {
  const record = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const entityType = normalizeEntityType(record.entityType);
  const entityId = normalizeString(record.entityId);
  const metadata = sanitizeMetadata(record.metadata);

  if (!entityType) {
    throw new Error('entityType is required.');
  }
  if (!/^[a-z0-9][a-z0-9:_-]*$/.test(entityType)) {
    throw new Error('entityType format is invalid.');
  }
  if (entityType.length > 48) {
    throw new Error('entityType must be at most 48 characters.');
  }

  if (!entityId) {
    throw new Error('entityId is required.');
  }
  if (entityId.length > 160) {
    throw new Error('entityId must be at most 160 characters.');
  }

  return {
    entityType,
    entityId,
    metadata,
  };
}

function toFavoriteResponse(entity: FavoriteEntity) {
  return {
    id: String(entity.id),
    entityType: typeof entity.entityType === 'string' ? entity.entityType : '',
    entityId: typeof entity.entityId === 'string' ? entity.entityId : '',
    metadata:
      entity.metadata && typeof entity.metadata === 'object' && !Array.isArray(entity.metadata)
        ? (entity.metadata as Record<string, unknown>)
        : null,
    createdAt: typeof entity.createdAt === 'string' ? entity.createdAt : null,
    updatedAt: typeof entity.updatedAt === 'string' ? entity.updatedAt : null,
  };
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

async function findFavoriteForUser(
  strapi: Core.Strapi,
  userId: number | string,
  favoriteId: number | string,
): Promise<FavoriteEntity | null> {
  const existing = await strapi.entityService.findMany(USER_FAVORITE_UID, {
    filters: {
      id: favoriteId,
      user: {
        id: userId,
      },
    },
    limit: 1,
  });

  const entries = normalizeFindManyResult(existing);
  return (entries[0] as FavoriteEntity | undefined) ?? null;
}

async function findFavoriteByTarget(
  strapi: Core.Strapi,
  userId: number | string,
  entityType: string,
  entityId: string,
): Promise<FavoriteEntity | null> {
  const existing = await strapi.entityService.findMany(USER_FAVORITE_UID, {
    filters: {
      user: {
        id: userId,
      },
      entityType,
      entityId,
    },
    limit: 1,
  });

  const entries = normalizeFindManyResult(existing);
  return (entries[0] as FavoriteEntity | undefined) ?? null;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async me(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    const entries = await strapi.entityService.findMany(USER_FAVORITE_UID, {
      filters: {
        user: {
          id: currentUser.id,
        },
      },
      sort: ['createdAt:desc'],
    });

    ctx.body = normalizeFindManyResult(entries).map((entry) =>
      toFavoriteResponse(entry as FavoriteEntity),
    );
  },

  async createMe(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    try {
      const payload = sanitizeFavoritePayload(ctx.request.body);
      const existing = await findFavoriteByTarget(
        strapi,
        currentUser.id,
        payload.entityType,
        payload.entityId,
      );

      if (existing?.id) {
        const updated = await strapi.entityService.update(USER_FAVORITE_UID, existing.id, {
          data: {
            metadata: payload.metadata,
          } as any,
        });

        ctx.body = toFavoriteResponse(updated as FavoriteEntity);
        return;
      }

      const created = await strapi.entityService.create(USER_FAVORITE_UID, {
        data: {
          user: currentUser.id,
          entityType: payload.entityType,
          entityId: payload.entityId,
          metadata: payload.metadata,
        } as any,
      });

      ctx.status = 201;
      ctx.body = toFavoriteResponse(created as FavoriteEntity);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid favorite payload.';
      return ctx.badRequest(message);
    }
  },

  async deleteMe(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    const favoriteId = normalizeFavoriteId(ctx.params?.id);
    if (!favoriteId) {
      return ctx.badRequest('id is required.');
    }

    const existing = await findFavoriteForUser(strapi, currentUser.id, favoriteId);
    if (!existing?.id) {
      return ctx.notFound('favorite.notFound');
    }

    await strapi.entityService.delete(USER_FAVORITE_UID, existing.id);
    ctx.body = {
      id: String(existing.id),
      deleted: true,
    };
  },
});
