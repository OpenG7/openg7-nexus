import type { Core } from '@strapi/strapi';

const SAVED_SEARCH_UID = 'api::saved-search.saved-search' as any;
const ALLOWED_SCOPES = new Set(['all', 'companies', 'partners', 'feed', 'map', 'opportunities']);
const ALLOWED_FREQUENCIES = new Set(['realtime', 'daily', 'weekly']);

interface AuthenticatedUser {
  id: number | string;
}

interface SavedSearchEntity {
  id: number | string;
  name?: unknown;
  scope?: unknown;
  filters?: unknown;
  notifyEnabled?: unknown;
  frequency?: unknown;
  lastRunAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface SavedSearchCreatePayload {
  name: string;
  scope: string;
  filters: Record<string, unknown>;
  notifyEnabled: boolean;
  frequency: string;
}

type SavedSearchUpdatePayload = Partial<SavedSearchCreatePayload> & {
  lastRunAt?: string | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeId(value: unknown): number | string | null {
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

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function sanitizeScope(value: unknown): string {
  const normalized = normalizeString(value)?.toLowerCase() ?? 'all';
  if (!ALLOWED_SCOPES.has(normalized)) {
    throw new Error(`scope must be one of: ${Array.from(ALLOWED_SCOPES).join(', ')}.`);
  }
  return normalized;
}

function sanitizeFrequency(value: unknown): string {
  const normalized = normalizeString(value)?.toLowerCase() ?? 'daily';
  if (!ALLOWED_FREQUENCIES.has(normalized)) {
    throw new Error(`frequency must be one of: ${Array.from(ALLOWED_FREQUENCIES).join(', ')}.`);
  }
  return normalized;
}

function sanitizeFilters(value: unknown): Record<string, unknown> {
  if (value == null) {
    return {};
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('filters must be an object.');
  }
  return value as Record<string, unknown>;
}

function sanitizeCreatePayload(payload: unknown): SavedSearchCreatePayload {
  const record = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const name = normalizeString(record.name);
  if (!name) {
    throw new Error('name is required.');
  }
  if (name.length > 120) {
    throw new Error('name must be at most 120 characters.');
  }

  return {
    name,
    scope: sanitizeScope(record.scope),
    filters: sanitizeFilters(record.filters),
    notifyEnabled: normalizeBoolean(record.notifyEnabled, false),
    frequency: sanitizeFrequency(record.frequency),
  };
}

function sanitizeUpdatePayload(payload: unknown): SavedSearchUpdatePayload {
  const record = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const has = (key: string) => Object.prototype.hasOwnProperty.call(record, key);
  const next: SavedSearchUpdatePayload = {};

  if (has('name')) {
    const name = normalizeString(record.name);
    if (!name) {
      throw new Error('name cannot be empty.');
    }
    if (name.length > 120) {
      throw new Error('name must be at most 120 characters.');
    }
    next.name = name;
  }

  if (has('scope')) {
    next.scope = sanitizeScope(record.scope);
  }

  if (has('filters')) {
    next.filters = sanitizeFilters(record.filters);
  }

  if (has('notifyEnabled')) {
    next.notifyEnabled = normalizeBoolean(record.notifyEnabled, false);
  }

  if (has('frequency')) {
    next.frequency = sanitizeFrequency(record.frequency);
  }

  if (has('lastRunAt')) {
    const lastRunAt = normalizeString(record.lastRunAt);
    next.lastRunAt = lastRunAt ?? null;
  }

  if (Object.keys(next).length === 0) {
    throw new Error('At least one field must be provided.');
  }

  return next;
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

function toSavedSearchResponse(entity: SavedSearchEntity) {
  return {
    id: String(entity.id),
    name: typeof entity.name === 'string' ? entity.name : '',
    scope: typeof entity.scope === 'string' ? entity.scope : 'all',
    filters:
      entity.filters && typeof entity.filters === 'object' && !Array.isArray(entity.filters)
        ? (entity.filters as Record<string, unknown>)
        : {},
    notifyEnabled: Boolean(entity.notifyEnabled),
    frequency: typeof entity.frequency === 'string' ? entity.frequency : 'daily',
    lastRunAt: typeof entity.lastRunAt === 'string' ? entity.lastRunAt : null,
    createdAt: typeof entity.createdAt === 'string' ? entity.createdAt : null,
    updatedAt: typeof entity.updatedAt === 'string' ? entity.updatedAt : null,
  };
}

async function findSavedSearchForUser(
  strapi: Core.Strapi,
  userId: number | string,
  savedSearchId: number | string,
): Promise<SavedSearchEntity | null> {
  const existing = await strapi.entityService.findMany(SAVED_SEARCH_UID, {
    filters: {
      id: savedSearchId,
      user: {
        id: userId,
      },
    },
    limit: 1,
  });

  const entries = normalizeFindManyResult(existing);
  return (entries[0] as SavedSearchEntity | undefined) ?? null;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async me(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    const entries = await strapi.entityService.findMany(SAVED_SEARCH_UID, {
      filters: {
        user: {
          id: currentUser.id,
        },
      },
      sort: ['updatedAt:desc'],
    });

    ctx.body = normalizeFindManyResult(entries).map((entry) =>
      toSavedSearchResponse(entry as SavedSearchEntity),
    );
  },

  async createMe(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    try {
      const payload = sanitizeCreatePayload(ctx.request.body);
      const created = await strapi.entityService.create(SAVED_SEARCH_UID, {
        data: {
          ...payload,
          user: currentUser.id,
        } as any,
      });

      ctx.status = 201;
      ctx.body = toSavedSearchResponse(created as SavedSearchEntity);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid saved-search payload.';
      return ctx.badRequest(message);
    }
  },

  async updateMe(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    const savedSearchId = normalizeId(ctx.params?.id);
    if (!savedSearchId) {
      return ctx.badRequest('id is required.');
    }

    const existing = await findSavedSearchForUser(strapi, currentUser.id, savedSearchId);
    if (!existing?.id) {
      return ctx.notFound('savedSearch.notFound');
    }

    try {
      const payload = sanitizeUpdatePayload(ctx.request.body);
      const updated = await strapi.entityService.update(SAVED_SEARCH_UID, existing.id, {
        data: payload as any,
      });

      ctx.body = toSavedSearchResponse(updated as SavedSearchEntity);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid saved-search payload.';
      return ctx.badRequest(message);
    }
  },

  async deleteMe(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    const savedSearchId = normalizeId(ctx.params?.id);
    if (!savedSearchId) {
      return ctx.badRequest('id is required.');
    }

    const existing = await findSavedSearchForUser(strapi, currentUser.id, savedSearchId);
    if (!existing?.id) {
      return ctx.notFound('savedSearch.notFound');
    }

    await strapi.entityService.delete(SAVED_SEARCH_UID, existing.id);
    ctx.body = {
      id: String(existing.id),
      deleted: true,
    };
  },
});
