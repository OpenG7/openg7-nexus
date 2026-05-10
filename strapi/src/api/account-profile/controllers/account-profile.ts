import type { Core } from '@strapi/strapi';

import {
  extractSessionTokenClaims,
  getSessionSnapshot,
  issueSessionJwt,
  rotateSessionsAndCreateCurrent,
} from '../../../utils/auth-sessions';
import { readWebhookSecurityConfig, validateWebhookUrl } from '../../../utils/webhook-url';

const ACCOUNT_PROFILE_UID = 'api::account-profile.account-profile' as any;
const USER_FAVORITE_UID = 'api::user-favorite.user-favorite' as any;
const SAVED_SEARCH_UID = 'api::saved-search.saved-search' as any;
const USER_ALERT_UID = 'api::user-alert.user-alert' as any;

type AccountStatus = 'active' | 'emailNotConfirmed' | 'disabled';

const ALERT_SEVERITIES = ['info', 'success', 'warning', 'critical'] as const;
const ALERT_SOURCES = ['saved-search', 'system'] as const;
const ALERT_FREQUENCIES = ['instant', 'daily-digest'] as const;
const TIME_WINDOW_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const WEBHOOK_SECURITY_CONFIG = readWebhookSecurityConfig();

type AlertSeverity = (typeof ALERT_SEVERITIES)[number];
type AlertSource = (typeof ALERT_SOURCES)[number];
type AlertFrequency = (typeof ALERT_FREQUENCIES)[number];

interface NotificationChannels {
  inApp: boolean;
  email: boolean;
  webhook: boolean;
}

interface NotificationFilters {
  severities: AlertSeverity[];
  sources: AlertSource[];
}

interface NotificationQuietHours {
  enabled: boolean;
  start: string | null;
  end: string | null;
  timezone: string | null;
}

interface NotificationPreferences {
  emailOptIn: boolean;
  webhookUrl: string | null;
  channels: NotificationChannels;
  filters: NotificationFilters;
  frequency: AlertFrequency;
  quietHours: NotificationQuietHours;
}

interface SanitizedProfileInput {
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  organization: string | null;
  phone: string | null;
  avatarUrl: string | null;
  sectorPreferences: string[];
  provincePreferences: string[];
  notificationPreferences: NotificationPreferences;
}

interface EmailChangeInput {
  currentPassword: string;
  email: string;
}

interface UserRole {
  type?: string;
  name?: string;
}

interface AuthenticatedUser {
  id: number | string;
}

interface UsersPermissionsUser {
  id: number | string;
  email?: string | null;
  username?: string | null;
  password?: string | null;
  confirmed?: boolean | null;
  blocked?: boolean | null;
  role?: UserRole | null;
}

interface FavoriteEntity {
  id: number | string;
  entityType?: unknown;
  entityId?: unknown;
  metadata?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
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

interface UserAlertEntity {
  id: number | string;
  title?: unknown;
  message?: unknown;
  severity?: unknown;
  sourceType?: unknown;
  sourceId?: unknown;
  metadata?: unknown;
  readAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  return normalized.toLowerCase();
}

function normalizeStringList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();
  for (const entry of value) {
    const normalized = normalizeString(entry);
    if (!normalized) {
      continue;
    }
    if (normalized.length > maxLength) {
      continue;
    }
    unique.add(normalized);
    if (unique.size >= maxItems) {
      break;
    }
  }

  return Array.from(unique);
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

function normalizeAllowedList<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: readonly T[],
): T[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const allowedSet = new Set<string>(allowed);
  const entries = new Set<T>();

  for (const entry of value) {
    const normalized = normalizeString(entry)?.toLowerCase();
    if (!normalized || !allowedSet.has(normalized)) {
      continue;
    }
    entries.add(normalized as T);
  }

  return entries.size > 0 ? Array.from(entries) : [...fallback];
}

function normalizeTime(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  return TIME_WINDOW_PATTERN.test(normalized) ? normalized : null;
}

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function isValidUrl(value: string, options: { httpsOnly?: boolean } = {}): boolean {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }
    if (options.httpsOnly && url.protocol !== 'https:') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function validateLength(value: string | null, label: string, max: number): void {
  if (!value) {
    return;
  }
  if (value.length > max) {
    throw new Error(`${label} must be at most ${max} characters long.`);
  }
}

function validatePhone(value: string | null): void {
  if (!value) {
    return;
  }
  if (!/^[+()0-9.\-\s]{7,24}$/.test(value)) {
    throw new Error('phone must be a valid phone number.');
  }
}

function validateUrl(
  value: string | null,
  label: string,
  options: { httpsOnly?: boolean } = {},
): void {
  if (!value) {
    return;
  }
  if (!isValidUrl(value, options)) {
    if (options.httpsOnly) {
      throw new Error(`${label} must be a valid HTTPS URL.`);
    }
    throw new Error(`${label} must be a valid URL.`);
  }
}

function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  const record = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const channelsRaw =
    record.channels && typeof record.channels === 'object'
      ? (record.channels as Record<string, unknown>)
      : {};
  const filtersRaw =
    record.filters && typeof record.filters === 'object'
      ? (record.filters as Record<string, unknown>)
      : {};
  const quietHoursRaw =
    record.quietHours && typeof record.quietHours === 'object'
      ? (record.quietHours as Record<string, unknown>)
      : {};

  const webhookUrl = normalizeString(record.webhookUrl);
  const channels: NotificationChannels = {
    inApp: normalizeBoolean(channelsRaw.inApp, true),
    email: normalizeBoolean(channelsRaw.email, normalizeBoolean(record.emailOptIn, false)),
    webhook: normalizeBoolean(channelsRaw.webhook, Boolean(webhookUrl)),
  };

  const quietHoursEnabled = normalizeBoolean(quietHoursRaw.enabled, false);
  const quietTimezone = normalizeString(quietHoursRaw.timezone);
  const normalizedTimezone = quietTimezone && isValidTimezone(quietTimezone) ? quietTimezone : null;

  return {
    emailOptIn: channels.email,
    webhookUrl: channels.webhook ? webhookUrl : null,
    channels,
    filters: {
      severities: normalizeAllowedList(filtersRaw.severities, ALERT_SEVERITIES, ALERT_SEVERITIES),
      sources: normalizeAllowedList(filtersRaw.sources, ALERT_SOURCES, ALERT_SOURCES),
    },
    frequency: normalizeAllowedList([record.frequency], ALERT_FREQUENCIES, [
      ALERT_FREQUENCIES[0],
    ])[0],
    quietHours: {
      enabled: quietHoursEnabled,
      start: quietHoursEnabled ? normalizeTime(quietHoursRaw.start) : null,
      end: quietHoursEnabled ? normalizeTime(quietHoursRaw.end) : null,
      timezone: quietHoursEnabled ? normalizedTimezone : null,
    },
  };
}

function validateNotificationPreferences(preferences: NotificationPreferences): void {
  if (preferences.channels.webhook && !preferences.webhookUrl) {
    throw new Error(
      'notificationPreferences.webhookUrl is required when webhook channel is enabled.',
    );
  }

  if (preferences.webhookUrl) {
    const webhookValidation = validateWebhookUrl(preferences.webhookUrl, WEBHOOK_SECURITY_CONFIG);
    if (!webhookValidation.valid) {
      throw new Error(`notificationPreferences.webhookUrl ${webhookValidation.message}`);
    }
  }

  if (!preferences.filters.severities.length) {
    throw new Error('notificationPreferences.filters.severities must include at least one value.');
  }
  if (!preferences.filters.sources.length) {
    throw new Error('notificationPreferences.filters.sources must include at least one value.');
  }

  if (!preferences.quietHours.enabled) {
    return;
  }

  if (!preferences.quietHours.start || !preferences.quietHours.end) {
    throw new Error(
      'notificationPreferences.quietHours.start and end are required when quiet hours are enabled.',
    );
  }

  if (preferences.quietHours.start === preferences.quietHours.end) {
    throw new Error('notificationPreferences.quietHours.start and end must differ.');
  }

  if (!preferences.quietHours.timezone) {
    throw new Error(
      'notificationPreferences.quietHours.timezone is required when quiet hours are enabled.',
    );
  }

  validateLength(
    preferences.quietHours.timezone,
    'notificationPreferences.quietHours.timezone',
    80,
  );
}

function sanitizePayload(payload: unknown): SanitizedProfileInput {
  const record = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const notificationPreferences = normalizeNotificationPreferences(record.notificationPreferences);

  const sanitized: SanitizedProfileInput = {
    firstName: normalizeString(record.firstName),
    lastName: normalizeString(record.lastName),
    jobTitle: normalizeString(record.jobTitle),
    organization: normalizeString(record.organization),
    phone: normalizeString(record.phone),
    avatarUrl: normalizeString(record.avatarUrl),
    sectorPreferences: normalizeStringList(record.sectorPreferences, 20, 40),
    provincePreferences: normalizeStringList(record.provincePreferences, 20, 20),
    notificationPreferences,
  };

  validateLength(sanitized.firstName, 'firstName', 80);
  validateLength(sanitized.lastName, 'lastName', 80);
  validateLength(sanitized.jobTitle, 'jobTitle', 120);
  validateLength(sanitized.organization, 'organization', 120);
  validatePhone(sanitized.phone);
  validateUrl(sanitized.avatarUrl, 'avatarUrl');
  validateNotificationPreferences(sanitized.notificationPreferences);

  return sanitized;
}

function sanitizeEmailChangePayload(payload: unknown): EmailChangeInput {
  const record = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const currentPassword = normalizeString(record.currentPassword);
  const email = normalizeEmail(record.email);

  if (!currentPassword) {
    throw new Error('currentPassword is required.');
  }
  if (!email) {
    throw new Error('email is required.');
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new Error('email must be a valid email address.');
  }

  return {
    currentPassword,
    email,
  };
}

function mapRoles(user: UsersPermissionsUser): string[] {
  const role = user.role;
  if (!role) {
    return [];
  }

  const roles = new Set<string>();
  if (typeof role.type === 'string' && role.type.trim().length > 0) {
    roles.add(role.type.trim().toLowerCase());
  }
  if (typeof role.name === 'string' && role.name.trim().length > 0) {
    roles.add(role.name.trim().toLowerCase());
  }

  return Array.from(roles);
}

function resolveAccountStatus(user: UsersPermissionsUser): AccountStatus {
  if (user.blocked === true) {
    return 'disabled';
  }
  if (user.confirmed !== true) {
    return 'emailNotConfirmed';
  }
  return 'active';
}

async function findProfileByUser(strapi: Core.Strapi, userId: number | string) {
  const existing = await strapi.entityService.findMany(ACCOUNT_PROFILE_UID, {
    filters: {
      user: {
        id: userId,
      },
    },
    limit: 1,
  });

  if (Array.isArray(existing)) {
    return existing[0] ?? null;
  }

  return existing ?? null;
}

async function fetchUserById(
  strapi: Core.Strapi,
  userId: number | string,
): Promise<UsersPermissionsUser | null> {
  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: userId },
    populate: ['role'],
  });

  return (user as UsersPermissionsUser | null) ?? null;
}

function mapResponse(user: UsersPermissionsUser, profile: Record<string, unknown> | null) {
  const source = profile ?? {};
  const notificationPreferences = normalizeNotificationPreferences(source.notificationPreferences);

  return {
    id: String(user.id),
    email: user.email ?? '',
    roles: mapRoles(user),
    confirmed: user.confirmed === true,
    blocked: user.blocked === true,
    accountStatus: resolveAccountStatus(user),
    firstName: typeof source.firstName === 'string' ? source.firstName : null,
    lastName: typeof source.lastName === 'string' ? source.lastName : null,
    jobTitle: typeof source.jobTitle === 'string' ? source.jobTitle : null,
    organization: typeof source.organization === 'string' ? source.organization : null,
    phone: typeof source.phone === 'string' ? source.phone : null,
    avatarUrl: typeof source.avatarUrl === 'string' ? source.avatarUrl : null,
    sectorPreferences: Array.isArray(source.sectorPreferences)
      ? (source.sectorPreferences as string[])
      : [],
    provincePreferences: Array.isArray(source.provincePreferences)
      ? (source.provincePreferences as string[])
      : [],
    notificationPreferences,
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

function sanitizeObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function mapFavoriteForExport(entry: FavoriteEntity) {
  return {
    id: String(entry.id),
    entityType: typeof entry.entityType === 'string' ? entry.entityType : null,
    entityId: typeof entry.entityId === 'string' ? entry.entityId : null,
    metadata: sanitizeObject(entry.metadata),
    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : null,
    updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : null,
  };
}

function mapSavedSearchForExport(entry: SavedSearchEntity) {
  return {
    id: String(entry.id),
    name: typeof entry.name === 'string' ? entry.name : null,
    scope: typeof entry.scope === 'string' ? entry.scope : null,
    filters: sanitizeObject(entry.filters) ?? {},
    notifyEnabled: Boolean(entry.notifyEnabled),
    frequency: typeof entry.frequency === 'string' ? entry.frequency : null,
    lastRunAt: typeof entry.lastRunAt === 'string' ? entry.lastRunAt : null,
    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : null,
    updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : null,
  };
}

function mapAlertForExport(entry: UserAlertEntity) {
  return {
    id: String(entry.id),
    title: typeof entry.title === 'string' ? entry.title : null,
    message: typeof entry.message === 'string' ? entry.message : null,
    severity: typeof entry.severity === 'string' ? entry.severity : null,
    sourceType: typeof entry.sourceType === 'string' ? entry.sourceType : null,
    sourceId: typeof entry.sourceId === 'string' ? entry.sourceId : null,
    metadata: sanitizeObject(entry.metadata),
    readAt: typeof entry.readAt === 'string' ? entry.readAt : null,
    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : null,
    updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : null,
  };
}

function buildExportFilename(date = new Date()): string {
  const safe = date.toISOString().replace(/[:.]/g, '-');
  return `openg7-account-export-${safe}.json`;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async me(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    const user = await fetchUserById(strapi, currentUser.id);
    if (!user) {
      return ctx.unauthorized();
    }

    const profile = await findProfileByUser(strapi, currentUser.id);
    ctx.body = mapResponse(user, profile as Record<string, unknown> | null);
  },

  async exportMe(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    const user = await fetchUserById(strapi, currentUser.id);
    if (!user) {
      return ctx.unauthorized();
    }

    const profile = await findProfileByUser(strapi, currentUser.id);
    const favoritesRaw = await strapi.entityService.findMany(USER_FAVORITE_UID, {
      filters: {
        user: {
          id: currentUser.id,
        },
      },
      sort: ['createdAt:desc'],
      limit: 1000,
    });
    const savedSearchesRaw = await strapi.entityService.findMany(SAVED_SEARCH_UID, {
      filters: {
        user: {
          id: currentUser.id,
        },
      },
      sort: ['updatedAt:desc'],
      limit: 1000,
    });
    const alertsRaw = await strapi.entityService.findMany(USER_ALERT_UID, {
      filters: {
        user: {
          id: currentUser.id,
        },
      },
      sort: ['createdAt:desc'],
      limit: 1000,
    });

    const exportedAt = new Date().toISOString();
    const payload = {
      exportedAt,
      formatVersion: 1,
      account: mapResponse(user, profile as Record<string, unknown> | null),
      favorites: normalizeFindManyResult(favoritesRaw).map((entry) =>
        mapFavoriteForExport(entry as FavoriteEntity),
      ),
      savedSearches: normalizeFindManyResult(savedSearchesRaw).map((entry) =>
        mapSavedSearchForExport(entry as SavedSearchEntity),
      ),
      alerts: normalizeFindManyResult(alertsRaw).map((entry) =>
        mapAlertForExport(entry as UserAlertEntity),
      ),
    };

    ctx.set('Content-Type', 'application/json; charset=utf-8');
    ctx.set('Content-Disposition', `attachment; filename="${buildExportFilename()}"`);
    ctx.body = payload;
  },

  async sessionsMe(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    const claims = await extractSessionTokenClaims(strapi, ctx as Record<string, unknown>);
    const snapshot = await getSessionSnapshot(strapi, currentUser.id, claims);

    ctx.body = snapshot;
  },

  async logoutOtherSessions(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    const { session, revokedCount } = await rotateSessionsAndCreateCurrent(
      strapi,
      currentUser.id,
      ctx as Record<string, unknown>,
    );
    const jwt = issueSessionJwt(strapi, currentUser.id, session);

    const user = await fetchUserById(strapi, currentUser.id);
    if (!user) {
      return ctx.unauthorized();
    }

    const profile = await findProfileByUser(strapi, currentUser.id);
    const claims = {
      id: currentUser.id,
      sid: session.id,
      sv: session.version,
      iat: null,
    };
    const snapshot = await getSessionSnapshot(strapi, currentUser.id, claims);

    ctx.body = {
      jwt,
      user: mapResponse(user, profile as Record<string, unknown> | null),
      sessionsRevoked: revokedCount,
      sessionVersion: snapshot.version,
      sessions: snapshot.sessions,
    };
  },

  async updateMe(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    try {
      const payload = sanitizePayload(ctx.request.body);
      const existing = await findProfileByUser(strapi, currentUser.id);

      const data = {
        ...payload,
        user: currentUser.id,
      };

      const profile = existing?.id
        ? await strapi.entityService.update(ACCOUNT_PROFILE_UID, existing.id, { data: data as any })
        : await strapi.entityService.create(ACCOUNT_PROFILE_UID, { data: data as any });

      const user = await fetchUserById(strapi, currentUser.id);
      if (!user) {
        return ctx.unauthorized();
      }

      ctx.body = mapResponse(user, profile as Record<string, unknown>);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid profile payload.';
      return ctx.badRequest(message);
    }
  },

  async requestEmailChange(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    try {
      const payload = sanitizeEmailChangePayload(ctx.request.body);
      const user = await fetchUserById(strapi, currentUser.id);
      if (!user) {
        return ctx.unauthorized();
      }

      if (typeof user.password !== 'string' || user.password.length === 0) {
        return ctx.badRequest('Unable to update email for this account.');
      }

      const userService = strapi.plugin('users-permissions').service('user') as any;
      const validPassword = await userService.validatePassword(
        payload.currentPassword,
        user.password,
      );
      if (!validPassword) {
        return ctx.badRequest('The provided current password is invalid.');
      }

      if (user.blocked === true) {
        return ctx.badRequest('Your account has been blocked by an administrator');
      }

      const currentEmail = normalizeEmail(user.email) ?? '';
      if (payload.email === currentEmail) {
        if (user.confirmed !== true) {
          await userService.sendConfirmationEmail(user);
        }

        return ctx.send({
          email: user.email ?? payload.email,
          sent: user.confirmed !== true,
          accountStatus: resolveAccountStatus(user),
        });
      }

      const conflictingUserCount = await strapi.db.query('plugin::users-permissions.user').count({
        where: {
          id: { $ne: user.id },
          $or: [{ email: payload.email }, { username: payload.email }],
        },
      });

      if (conflictingUserCount > 0) {
        return ctx.badRequest('Email is already in use.');
      }

      const shouldSyncUsername =
        typeof user.username === 'string' &&
        user.username.trim().length > 0 &&
        normalizeEmail(user.username) === currentEmail;

      const updatePayload: Record<string, unknown> = {
        email: payload.email,
        confirmed: false,
        confirmationToken: null,
      };

      if (shouldSyncUsername) {
        updatePayload.username = payload.email;
      }

      const nextUser = await userService.edit(user.id, updatePayload);

      await userService.sendConfirmationEmail(nextUser);

      return ctx.send({
        email: payload.email,
        sent: true,
        accountStatus: 'emailNotConfirmed',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to request email change.';
      return ctx.badRequest(message);
    }
  },
});
