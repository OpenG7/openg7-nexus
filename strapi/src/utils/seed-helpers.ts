import type { UID as StrapiUID } from '@strapi/strapi';

export type UID = StrapiUID.ContentType | `api::${string}.${string}`;

function normalizeContentTypeUID(uid: UID): StrapiUID.ContentType {
  if (typeof uid !== 'string' || !uid.includes('::') || !uid.includes('.')) {
    throw new Error(`Invalid content type UID: ${uid}`);
  }

  return uid as StrapiUID.ContentType;
}

type Filters = Record<string, any>;

interface UpsertOptions {
  unique?: Filters;
}

export type SeedFailureStrategy = 'continue-on-error' | 'fail-fast';

function normalizeFirst<T>(entry: T | T[] | null | undefined): T | null {
  if (!entry) return null;
  if (Array.isArray(entry)) return entry[0] ?? null;
  return entry;
}

export function hasContentType(uid: UID): boolean {
  try {
    if (typeof (strapi as any).contentType === 'function') {
      return Boolean((strapi as any).contentType(uid));
    }
    if (typeof (strapi as any).getModel === 'function') {
      return Boolean((strapi as any).getModel(uid));
    }
  } catch (error) {
    return false;
  }
  return false;
}

export async function findOne(uid: UID, filters: Filters = {}): Promise<any | null> {
  const contentTypeUID = normalizeContentTypeUID(uid);
  const existing = await strapi.entityService.findMany(contentTypeUID, {
    filters,
    limit: 1,
  });
  return normalizeFirst(existing);
}

export async function findId(uid: UID, filters: Filters = {}): Promise<number | string | null> {
  const entry = await findOne(uid, filters);
  return entry?.id ?? null;
}

export async function upsertByUID(
  uid: UID,
  data: Record<string, any>,
  options: UpsertOptions = {},
) {
  const uniqueFilters = options.unique ?? { slug: (data as any).slug };
  if (!uniqueFilters || Object.values(uniqueFilters).every((value) => value === undefined)) {
    throw new Error(`Missing unique filters for ${uid}`);
  }

  const existing = await findOne(uid, uniqueFilters);

  if (existing?.id) {
    return strapi.entityService.update(normalizeContentTypeUID(uid), existing.id, { data });
  }

  return strapi.entityService.create(normalizeContentTypeUID(uid), { data });
}

function normalizeRoleType(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

export async function ensureRole(name: string) {
  const roleType = normalizeRoleType(name);
  const roleQuery = strapi.db.query('plugin::users-permissions.role');
  const roles = await roleQuery.findMany();
  const existingRole = roles.find((role: any) => role.name === name || role.type === roleType);

  if (existingRole) {
    return existingRole;
  }

  return roleQuery.create({
    data: {
      name,
      type: roleType,
    },
  });
}

export async function setRolePermissions(
  roleId: number | string,
  permissions: Record<string, Record<string, boolean>>,
) {
  const permissionQuery = strapi.db.query('plugin::users-permissions.permission');
  const managedActionPrefixes = Object.keys(permissions).map((uid) => `${uid}.`);

  const currentPermissions = await permissionQuery.findMany({
    where: { role: roleId },
  });

  for (const permission of currentPermissions) {
    if (!managedActionPrefixes.some((prefix) => permission.action?.startsWith(prefix))) {
      continue;
    }

    await permissionQuery.delete({ where: { id: permission.id } });
  }

  const enabledActions = new Set<string>();
  for (const [uid, actionMap] of Object.entries(permissions)) {
    for (const [action, enabled] of Object.entries(actionMap)) {
      if (enabled) {
        enabledActions.add(`${uid}.${action}`);
      }
    }
  }

  for (const action of enabledActions) {
    await permissionQuery.create({
      data: {
        action,
        role: roleId,
      },
    });
  }
}

export async function ensureLocale(code: 'fr' | 'en') {
  const plugin = strapi.plugin && strapi.plugin('i18n');
  const service = plugin?.service && plugin.service('locales');
  if (!service?.list) return;
  const list = await service.list();
  if (!list.find((l: any) => l.code === code)) {
    await service.create({ code, name: code.toUpperCase() });
  }
}

export function isDevOrIntegrationEnv() {
  const env = (process.env.STRAPI_ENV || process.env.NODE_ENV || '').toLowerCase();
  if (!env) return false;
  return ['development', 'dev', 'integration', 'test'].includes(env);
}

export function isAutoSeedEnabled() {
  const envValue = process.env.STRAPI_SEED_AUTO;

  if (envValue === 'false') {
    return false;
  }

  if (envValue === 'true') {
    return true;
  }

  const normalizedEnvironment = (
    process.env.STRAPI_ENV ||
    process.env.NODE_ENV ||
    ''
  ).toLowerCase();
  if (['production', 'prod'].includes(normalizedEnvironment)) {
    return false;
  }

  return true;
}

export function getSeedFailureStrategy(): SeedFailureStrategy {
  const envValue = (process.env.STRAPI_SEED_FAILURE_STRATEGY || '').toLowerCase();
  if (envValue === 'fail-fast' || envValue === 'continue-on-error') {
    return envValue;
  }

  if (process.env.CI === 'true') {
    return 'fail-fast';
  }

  return 'continue-on-error';
}
