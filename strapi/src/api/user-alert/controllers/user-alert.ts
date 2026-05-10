import type { Core } from '@strapi/strapi';

import { readWebhookSecurityConfig, validateWebhookUrl } from '../../../utils/webhook-url';

const USER_ALERT_UID = 'api::user-alert.user-alert' as any;
const SAVED_SEARCH_UID = 'api::saved-search.saved-search' as any;
const ACCOUNT_PROFILE_UID = 'api::account-profile.account-profile' as any;
const ALLOWED_SEVERITIES = new Set(['info', 'success', 'warning', 'critical']);
const SOURCE_TYPE_SAVED_SEARCH = 'saved-search';
const SOURCE_TYPE_SYSTEM = 'system';
const DIGEST_SOURCE_ID_PREFIX = 'daily-digest';
const ALERT_FREQUENCIES = new Set(['instant', 'daily-digest']);
const RECENT_ALERT_WINDOW_MS = 24 * 60 * 60 * 1000;
const QUIET_HOURS_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DEFAULT_WEBHOOK_TIMEOUT_MS = 5000;
const WEBHOOK_SECURITY_CONFIG = readWebhookSecurityConfig();
const WEBHOOK_TIMEOUT_MS = (() => {
  const parsed = Number.parseInt(process.env.WEBHOOK_TIMEOUT_MS ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_WEBHOOK_TIMEOUT_MS;
})();

type AlertSeverity = 'info' | 'success' | 'warning' | 'critical';
type AlertSource = 'saved-search' | 'system';

interface NotificationPreferences {
  emailOptIn: boolean;
  webhookUrl: string | null;
  channels: {
    inApp: boolean;
    email: boolean;
    webhook: boolean;
  };
  filters: {
    severities: AlertSeverity[];
    sources: AlertSource[];
  };
  frequency: 'instant' | 'daily-digest';
  quietHours: {
    enabled: boolean;
    start: string | null;
    end: string | null;
    timezone: string | null;
  };
}

interface AuthenticatedUser {
  id: number | string;
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

interface SavedSearchEntity {
  id: number | string;
  name?: unknown;
  scope?: unknown;
  filters?: unknown;
  frequency?: unknown;
}

interface CreateUserAlertPayload {
  title: string;
  message: string;
  severity: string;
  sourceType: string | null;
  sourceId: string | null;
  metadata: Record<string, unknown> | null;
}

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
  return QUIET_HOURS_PATTERN.test(normalized) ? normalized : null;
}

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map((entry) => Number.parseInt(entry, 10));
  return hours * 60 + minutes;
}

function sanitizeSeverity(value: unknown): string {
  const normalized = normalizeString(value)?.toLowerCase() ?? 'info';
  if (!ALLOWED_SEVERITIES.has(normalized)) {
    throw new Error(`severity must be one of: ${Array.from(ALLOWED_SEVERITIES).join(', ')}.`);
  }
  return normalized;
}

function normalizeSeverity(value: unknown): string {
  const normalized = normalizeString(value)?.toLowerCase() ?? 'info';
  return ALLOWED_SEVERITIES.has(normalized) ? normalized : 'info';
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

function resolveNotificationPreferences(rawValue: unknown): NotificationPreferences {
  const record =
    rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
      ? (rawValue as Record<string, unknown>)
      : {};
  const channelsRaw =
    record.channels && typeof record.channels === 'object' && !Array.isArray(record.channels)
      ? (record.channels as Record<string, unknown>)
      : {};
  const filtersRaw =
    record.filters && typeof record.filters === 'object' && !Array.isArray(record.filters)
      ? (record.filters as Record<string, unknown>)
      : {};
  const quietHoursRaw =
    record.quietHours && typeof record.quietHours === 'object' && !Array.isArray(record.quietHours)
      ? (record.quietHours as Record<string, unknown>)
      : {};

  const webhookUrl = normalizeString(record.webhookUrl);
  const channels = {
    inApp: normalizeBoolean(channelsRaw.inApp, true),
    email: normalizeBoolean(channelsRaw.email, normalizeBoolean(record.emailOptIn, false)),
    webhook: normalizeBoolean(channelsRaw.webhook, Boolean(webhookUrl)),
  };

  const quietHoursEnabled = normalizeBoolean(quietHoursRaw.enabled, false);
  const timezoneRaw = normalizeString(quietHoursRaw.timezone);
  const timezone =
    quietHoursEnabled && timezoneRaw && isValidTimezone(timezoneRaw) ? timezoneRaw : null;

  const frequencyRaw = normalizeString(record.frequency)?.toLowerCase() ?? 'instant';
  const frequency = ALERT_FREQUENCIES.has(frequencyRaw)
    ? (frequencyRaw as NotificationPreferences['frequency'])
    : 'instant';

  return {
    emailOptIn: channels.email,
    webhookUrl: channels.webhook ? webhookUrl : null,
    channels,
    filters: {
      severities: normalizeAllowedList(
        filtersRaw.severities,
        ['info', 'success', 'warning', 'critical'],
        ['info', 'success', 'warning', 'critical'],
      ),
      sources: normalizeAllowedList(
        filtersRaw.sources,
        ['saved-search', 'system'],
        ['saved-search', 'system'],
      ),
    },
    frequency,
    quietHours: {
      enabled: quietHoursEnabled,
      start: quietHoursEnabled ? normalizeTime(quietHoursRaw.start) : null,
      end: quietHoursEnabled ? normalizeTime(quietHoursRaw.end) : null,
      timezone,
    },
  };
}

function readTimeInTimezone(timeZone: string, date = new Date()): string | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);

    const hour = parts.find((part) => part.type === 'hour')?.value ?? null;
    const minute = parts.find((part) => part.type === 'minute')?.value ?? null;
    if (!hour || !minute) {
      return null;
    }

    return `${hour}:${minute}`;
  } catch {
    return null;
  }
}

function readDateKeyInTimezone(timeZone: string, date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value ?? null;
    const month = parts.find((part) => part.type === 'month')?.value ?? null;
    const day = parts.find((part) => part.type === 'day')?.value ?? null;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Fall back to UTC key below.
  }

  return date.toISOString().slice(0, 10);
}

function isQuietHoursActive(preferences: NotificationPreferences, date = new Date()): boolean {
  if (!preferences.quietHours.enabled) {
    return false;
  }

  const start = preferences.quietHours.start;
  const end = preferences.quietHours.end;
  const timezone = preferences.quietHours.timezone;
  if (!start || !end || !timezone) {
    return false;
  }

  const currentTime = readTimeInTimezone(timezone, date);
  if (!currentTime) {
    return false;
  }

  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  const currentMinutes = toMinutes(currentTime);

  if (startMinutes === endMinutes) {
    return false;
  }

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

function sanitizeCreatePayload(payload: unknown): CreateUserAlertPayload {
  const record = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const title = normalizeString(record.title);
  const message = normalizeString(record.message);

  if (!title) {
    throw new Error('title is required.');
  }
  if (title.length > 140) {
    throw new Error('title must be at most 140 characters.');
  }

  if (!message) {
    throw new Error('message is required.');
  }
  if (message.length > 1000) {
    throw new Error('message must be at most 1000 characters.');
  }

  const sourceType = normalizeString(record.sourceType)?.toLowerCase() ?? null;
  const sourceId = normalizeString(record.sourceId);

  if (sourceType && !/^[a-z0-9][a-z0-9:_-]{0,47}$/.test(sourceType)) {
    throw new Error('sourceType format is invalid.');
  }

  if (sourceId && sourceId.length > 160) {
    throw new Error('sourceId must be at most 160 characters.');
  }

  return {
    title,
    message,
    severity: sanitizeSeverity(record.severity),
    sourceType,
    sourceId,
    metadata: sanitizeMetadata(record.metadata),
  };
}

function sanitizeMarkReadPayload(payload: unknown): { isRead: boolean } {
  const record = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, 'isRead')) {
    return { isRead: true };
  }

  return { isRead: normalizeBoolean(record.isRead, true) };
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

function toAlertResponse(entity: UserAlertEntity) {
  const readAt = typeof entity.readAt === 'string' ? entity.readAt : null;
  return {
    id: String(entity.id),
    title: typeof entity.title === 'string' ? entity.title : '',
    message: typeof entity.message === 'string' ? entity.message : '',
    severity: normalizeSeverity(entity.severity),
    sourceType: typeof entity.sourceType === 'string' ? entity.sourceType : null,
    sourceId: typeof entity.sourceId === 'string' ? entity.sourceId : null,
    metadata:
      entity.metadata && typeof entity.metadata === 'object' && !Array.isArray(entity.metadata)
        ? (entity.metadata as Record<string, unknown>)
        : null,
    isRead: Boolean(readAt),
    readAt,
    createdAt: typeof entity.createdAt === 'string' ? entity.createdAt : null,
    updatedAt: typeof entity.updatedAt === 'string' ? entity.updatedAt : null,
  };
}

function toTimestamp(candidate: string | null): number {
  if (!candidate) {
    return 0;
  }

  const parsed = Date.parse(candidate);
  return Number.isFinite(parsed) ? parsed : 0;
}

function severityRank(value: string): number {
  switch (value) {
    case 'critical':
      return 3;
    case 'warning':
      return 2;
    case 'success':
      return 1;
    default:
      return 0;
  }
}

function pickDigestSeverity(entries: readonly UserAlertEntity[]): AlertSeverity {
  let best: AlertSeverity = 'info';
  for (const entry of entries) {
    const next = normalizeSeverity(entry.severity) as AlertSeverity;
    if (severityRank(next) > severityRank(best)) {
      best = next;
    }
  }
  return best;
}

function buildDigestSourceId(dateKey: string): string {
  return `${DIGEST_SOURCE_ID_PREFIX}:${dateKey}`;
}

function buildDigestPayload(
  entries: readonly UserAlertEntity[],
  digestSourceId: string,
  dateKey: string,
): CreateUserAlertPayload {
  const count = entries.length;
  const topTitles = entries
    .slice(0, 3)
    .map((entry) => normalizeString(entry.title))
    .filter((title): title is string => Boolean(title));
  const suffix = topTitles.length > 0 ? ` (${topTitles.join(', ')})` : '';

  return {
    title: `Daily digest: ${count} updates`,
    message: `You have ${count} saved-search updates${suffix}.`,
    severity: pickDigestSeverity(entries),
    sourceType: SOURCE_TYPE_SAVED_SEARCH,
    sourceId: digestSourceId,
    metadata: {
      type: DIGEST_SOURCE_ID_PREFIX,
      dateKey,
      count,
      sourceType: SOURCE_TYPE_SAVED_SEARCH,
      generatedAt: new Date().toISOString(),
      items: entries.map((entry) => ({
        sourceId: normalizeString(entry.sourceId),
        title: normalizeString(entry.title),
        severity: normalizeSeverity(entry.severity),
      })),
    },
  };
}

function mergeDigestMetadata(
  payloadMetadata: Record<string, unknown> | null,
  existingMetadata: unknown,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(payloadMetadata ?? {}) };
  const existing = sanitizeMetadata(existingMetadata);
  const dispatchedAt = normalizeString(existing?.dispatchedAt);
  const dispatchedDateKey = normalizeString(existing?.dispatchedDateKey);

  if (dispatchedAt) {
    merged.dispatchedAt = dispatchedAt;
  }
  if (dispatchedDateKey) {
    merged.dispatchedDateKey = dispatchedDateKey;
  }

  return merged;
}

function isDigestDispatchedForDate(entry: UserAlertEntity | null, dateKey: string): boolean {
  if (!entry) {
    return false;
  }

  const metadata = sanitizeMetadata(entry.metadata);
  const dispatchedDateKey = normalizeString(metadata?.dispatchedDateKey);
  if (dispatchedDateKey) {
    return dispatchedDateKey === dateKey;
  }

  const dispatchedAt = normalizeString(metadata?.dispatchedAt);
  return Boolean(dispatchedAt && dispatchedAt.startsWith(dateKey));
}

function withDigestDispatchMetadata(
  metadata: unknown,
  dateKey: string,
  dispatchedAt: string,
): Record<string, unknown> {
  return {
    ...(sanitizeMetadata(metadata) ?? {}),
    dispatchedAt,
    dispatchedDateKey: dateKey,
  };
}

async function fetchNotificationPreferences(
  strapi: Core.Strapi,
  userId: number | string,
): Promise<NotificationPreferences> {
  const profile = await strapi.entityService.findMany(ACCOUNT_PROFILE_UID, {
    filters: {
      user: {
        id: userId,
      },
    },
    limit: 1,
  });

  const normalized = normalizeFindManyResult(profile);
  const first = normalized[0] as Record<string, unknown> | undefined;
  return resolveNotificationPreferences(first?.notificationPreferences);
}

async function fetchUserEmail(
  strapi: Core.Strapi,
  userId: number | string,
): Promise<string | null> {
  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: userId },
    select: ['email'],
  });

  return normalizeString((user as { email?: unknown } | null)?.email)?.toLowerCase() ?? null;
}

async function findDigestAlertForUser(
  strapi: Core.Strapi,
  userId: number | string,
  sourceId: string,
): Promise<UserAlertEntity | null> {
  const entries = await strapi.entityService.findMany(USER_ALERT_UID, {
    filters: {
      user: {
        id: userId,
      },
      sourceType: SOURCE_TYPE_SAVED_SEARCH,
      sourceId,
    },
    sort: ['createdAt:desc'],
    limit: 1,
  });

  return (normalizeFindManyResult(entries)[0] as UserAlertEntity | undefined) ?? null;
}

async function dispatchAlerts(
  strapi: Core.Strapi,
  userId: number | string,
  preferences: NotificationPreferences,
  generatedAlerts: readonly UserAlertEntity[],
  options: { quietHoursActive: boolean; digestMode: boolean },
): Promise<{ emailSent: boolean; webhookSent: boolean; failures: string[] }> {
  const failures: string[] = [];

  if (generatedAlerts.length === 0 || options.quietHoursActive) {
    return { emailSent: false, webhookSent: false, failures };
  }

  const topTitles = generatedAlerts
    .slice(0, 3)
    .map((entry) => normalizeString(entry.title))
    .filter((title): title is string => Boolean(title));

  const subject = options.digestMode
    ? `OpenG7 daily digest (${generatedAlerts.length})`
    : `OpenG7 alert update (${generatedAlerts.length})`;
  const text = topTitles.length
    ? `You have ${generatedAlerts.length} new OpenG7 alerts: ${topTitles.join(', ')}.`
    : `You have ${generatedAlerts.length} new OpenG7 alerts.`;

  let emailSent = false;
  if (preferences.channels.email && preferences.emailOptIn) {
    const email = await fetchUserEmail(strapi, userId);
    if (email) {
      try {
        await strapi.plugin('email').service('email').send({
          to: email,
          subject,
          text,
        });
        emailSent = true;
      } catch (error: unknown) {
        failures.push(error instanceof Error ? `email:${error.message}` : 'email:delivery_failed');
      }
    }
  }

  let webhookSent = false;
  if (preferences.channels.webhook && preferences.webhookUrl) {
    const webhookValidation = validateWebhookUrl(preferences.webhookUrl, WEBHOOK_SECURITY_CONFIG);
    if (!webhookValidation.valid || !webhookValidation.normalizedUrl) {
      failures.push(`webhook:blocked_${webhookValidation.code}`);
      strapi.log?.warn?.(
        `[security] Webhook delivery blocked for user ${String(
          userId,
        )}: ${webhookValidation.message}`,
      );
      return { emailSent, webhookSent: false, failures };
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), WEBHOOK_TIMEOUT_MS);

    try {
      const response = await fetch(webhookValidation.normalizedUrl, {
        method: 'POST',
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: String(userId),
          mode: options.digestMode ? 'digest' : 'instant',
          count: generatedAlerts.length,
          generatedAt: new Date().toISOString(),
          alerts: generatedAlerts.map((entry) => toAlertResponse(entry)),
        }),
      });

      if (!response.ok) {
        failures.push(`webhook:http_${response.status}`);
      } else {
        webhookSent = true;
      }
    } catch (error: unknown) {
      failures.push(
        error instanceof Error ? `webhook:${error.message}` : 'webhook:delivery_failed',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  return { emailSent, webhookSent, failures };
}

async function findAlertForUser(
  strapi: Core.Strapi,
  userId: number | string,
  alertId: number | string,
): Promise<UserAlertEntity | null> {
  const existing = await strapi.entityService.findMany(USER_ALERT_UID, {
    filters: {
      id: alertId,
      user: {
        id: userId,
      },
    },
    limit: 1,
  });

  const entries = normalizeFindManyResult(existing);
  return (entries[0] as UserAlertEntity | undefined) ?? null;
}

async function findAlertsForUser(
  strapi: Core.Strapi,
  userId: number | string,
  filters: Record<string, unknown>,
  limit = 100,
): Promise<UserAlertEntity[]> {
  const existing = await strapi.entityService.findMany(USER_ALERT_UID, {
    filters: {
      user: {
        id: userId,
      },
      ...filters,
    },
    sort: ['createdAt:desc'],
    limit,
  });

  return normalizeFindManyResult(existing) as UserAlertEntity[];
}

async function hasRecentSavedSearchAlert(
  strapi: Core.Strapi,
  userId: number | string,
  sourceId: string,
): Promise<boolean> {
  const threshold = new Date(Date.now() - RECENT_ALERT_WINDOW_MS).toISOString();
  const existing = await strapi.entityService.findMany(USER_ALERT_UID, {
    filters: {
      user: {
        id: userId,
      },
      sourceType: SOURCE_TYPE_SAVED_SEARCH,
      sourceId,
      createdAt: {
        $gte: threshold,
      },
    },
    limit: 1,
  });

  return normalizeFindManyResult(existing).length > 0;
}

function readSavedSearchQuery(entry: SavedSearchEntity): string | null {
  const filters = entry.filters;
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
    return null;
  }

  const query = (filters as Record<string, unknown>)['query'];
  return normalizeString(query);
}

function buildSavedSearchAlert(entry: SavedSearchEntity): CreateUserAlertPayload {
  const normalizedName = normalizeString(entry.name) ?? `Search ${String(entry.id)}`;
  const scope = normalizeString(entry.scope)?.toLowerCase() ?? 'all';
  const query = readSavedSearchQuery(entry);
  const frequency = normalizeString(entry.frequency)?.toLowerCase() ?? 'daily';

  const title = `Saved search update: ${normalizedName}`;
  const message = query
    ? `New activity matches "${query}" in ${scope}.`
    : `New activity detected in ${scope}.`;

  return {
    title,
    message,
    severity: frequency === 'realtime' ? 'warning' : 'info',
    sourceType: SOURCE_TYPE_SAVED_SEARCH,
    sourceId: String(entry.id),
    metadata: {
      savedSearchId: String(entry.id),
      scope,
      query,
      frequency,
    },
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async me(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    const preferences = await fetchNotificationPreferences(strapi, currentUser.id);
    if (!preferences.channels.inApp) {
      ctx.body = [];
      return;
    }

    const entries = await strapi.entityService.findMany(USER_ALERT_UID, {
      filters: {
        user: {
          id: currentUser.id,
        },
      },
      sort: ['createdAt:desc'],
      limit: 100,
    });

    const alerts = normalizeFindManyResult(entries)
      .map((entry) => toAlertResponse(entry as UserAlertEntity))
      .sort((left, right) => {
        const unreadOrder = Number(left.isRead) - Number(right.isRead);
        if (unreadOrder !== 0) {
          return unreadOrder;
        }
        return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
      });

    ctx.body = alerts;
  },

  async createMe(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    try {
      const payload = sanitizeCreatePayload(ctx.request.body);
      const created = await strapi.entityService.create(USER_ALERT_UID, {
        data: {
          ...payload,
          user: currentUser.id,
        } as any,
      });

      ctx.status = 201;
      ctx.body = toAlertResponse(created as UserAlertEntity);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid user-alert payload.';
      return ctx.badRequest(message);
    }
  },

  async generateFromSavedSearches(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    const preferences = await fetchNotificationPreferences(strapi, currentUser.id);
    const quietHoursActive = isQuietHoursActive(preferences);
    const digestMode = preferences.frequency === 'daily-digest' || quietHoursActive;

    const savedSearchesRaw = await strapi.entityService.findMany(SAVED_SEARCH_UID, {
      filters: {
        user: {
          id: currentUser.id,
        },
        notifyEnabled: true,
      },
      sort: ['updatedAt:desc'],
      limit: 50,
    });

    const savedSearches = normalizeFindManyResult(savedSearchesRaw) as SavedSearchEntity[];
    if (!savedSearches.length) {
      ctx.body = {
        count: 0,
        processed: 0,
        skipped: 0,
        filteredOut: 0,
        deferred: 0,
        generated: [],
        mode: digestMode ? 'digest' : 'instant',
        quietHoursActive,
      };
      return;
    }

    const now = new Date().toISOString();
    const generated: ReturnType<typeof toAlertResponse>[] = [];
    const dispatchCandidates: UserAlertEntity[] = [];
    const digestCandidates: UserAlertEntity[] = [];
    let skipped = 0;
    let filteredOut = 0;
    let deferred = 0;

    const allowSeverity = new Set(preferences.filters.severities);
    const allowSource = new Set(preferences.filters.sources);
    const inAppEnabled = preferences.channels.inApp;

    for (const savedSearch of savedSearches) {
      const sourceId = String(savedSearch.id);
      const alreadyGenerated = await hasRecentSavedSearchAlert(strapi, currentUser.id, sourceId);

      if (alreadyGenerated) {
        skipped += 1;
        continue;
      }

      const payload = buildSavedSearchAlert(savedSearch);
      const normalizedSeverity = normalizeSeverity(payload.severity) as AlertSeverity;
      const normalizedSource = (payload.sourceType ?? SOURCE_TYPE_SYSTEM) as AlertSource;

      if (!allowSeverity.has(normalizedSeverity) || !allowSource.has(normalizedSource)) {
        filteredOut += 1;
        continue;
      }

      const candidate: UserAlertEntity = {
        id: sourceId,
        title: payload.title,
        message: payload.message,
        severity: payload.severity,
        sourceType: payload.sourceType,
        sourceId: payload.sourceId,
        metadata: payload.metadata,
      };
      dispatchCandidates.push(candidate);

      if (digestMode) {
        digestCandidates.push(candidate);
        deferred += 1;
      } else if (inAppEnabled) {
        const created = await strapi.entityService.create(USER_ALERT_UID, {
          data: {
            ...payload,
            user: currentUser.id,
          } as any,
        });

        generated.push(toAlertResponse(created as UserAlertEntity));
      } else {
        deferred += 1;
      }

      try {
        await strapi.entityService.update(SAVED_SEARCH_UID, savedSearch.id, {
          data: {
            lastRunAt: now,
          } as any,
        });
      } catch {
        // Best-effort update: the alert is still valid even if this metadata update fails.
      }
    }

    let digestDispatchCandidates: UserAlertEntity[] = [];
    let digestAlertRecord: UserAlertEntity | null = null;
    let digestDateKey: string | null = null;
    let shouldDispatchDigest = true;

    if (digestCandidates.length > 0) {
      digestDateKey = readDateKeyInTimezone(preferences.quietHours.timezone ?? 'UTC', new Date());
      const digestSourceId = buildDigestSourceId(digestDateKey);
      const existingDigest = await findDigestAlertForUser(strapi, currentUser.id, digestSourceId);
      shouldDispatchDigest = !isDigestDispatchedForDate(existingDigest, digestDateKey);

      const digestPayload = buildDigestPayload(digestCandidates, digestSourceId, digestDateKey);
      const digestMetadata = mergeDigestMetadata(digestPayload.metadata, existingDigest?.metadata);

      if (existingDigest?.id) {
        const updated = await strapi.entityService.update(USER_ALERT_UID, existingDigest.id, {
          data: {
            title: digestPayload.title,
            message: digestPayload.message,
            severity: digestPayload.severity,
            metadata: digestMetadata,
            readAt: inAppEnabled ? null : (existingDigest.readAt ?? null),
          } as any,
        });
        digestAlertRecord = updated as UserAlertEntity;
      } else {
        const createdDigest = await strapi.entityService.create(USER_ALERT_UID, {
          data: {
            ...digestPayload,
            metadata: digestMetadata,
            user: currentUser.id,
          } as any,
        });
        digestAlertRecord = createdDigest as UserAlertEntity;
      }

      if (digestAlertRecord) {
        digestDispatchCandidates = [digestAlertRecord];
        if (inAppEnabled) {
          generated.push(toAlertResponse(digestAlertRecord));
        }
      }
    }

    const deliveryCandidates =
      digestMode && !shouldDispatchDigest
        ? []
        : digestMode
          ? digestDispatchCandidates
          : dispatchCandidates;
    const delivery = await dispatchAlerts(strapi, currentUser.id, preferences, deliveryCandidates, {
      quietHoursActive,
      digestMode,
    });

    if (
      digestMode &&
      digestAlertRecord?.id &&
      digestDateKey &&
      !quietHoursActive &&
      (delivery.emailSent || delivery.webhookSent)
    ) {
      const dispatchedAt = new Date().toISOString();
      const refreshedDigest = (await strapi.entityService.update(
        USER_ALERT_UID,
        digestAlertRecord.id,
        {
          data: {
            metadata: withDigestDispatchMetadata(
              digestAlertRecord.metadata,
              digestDateKey,
              dispatchedAt,
            ),
          } as any,
        },
      )) as UserAlertEntity;

      if (inAppEnabled) {
        const digestIndex = generated.findIndex(
          (entry) => String(entry.id) === String(refreshedDigest.id),
        );
        if (digestIndex >= 0) {
          generated[digestIndex] = toAlertResponse(refreshedDigest);
        }
      }
    }

    const processed = dispatchCandidates.length;
    ctx.status = processed > 0 || generated.length > 0 ? 201 : 200;
    ctx.body = {
      count: generated.length,
      processed,
      skipped,
      filteredOut,
      deferred,
      generated,
      mode: digestMode ? 'digest' : 'instant',
      quietHoursActive,
      delivery: {
        emailSent: delivery.emailSent,
        webhookSent: delivery.webhookSent,
        failures: delivery.failures,
      },
    };
  },

  async markReadMe(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    const alertId = normalizeId(ctx.params?.id);
    if (!alertId) {
      return ctx.badRequest('id is required.');
    }

    const existing = await findAlertForUser(strapi, currentUser.id, alertId);
    if (!existing?.id) {
      return ctx.notFound('userAlert.notFound');
    }

    try {
      const payload = sanitizeMarkReadPayload(ctx.request.body);
      const readAt = payload.isRead
        ? typeof existing.readAt === 'string'
          ? existing.readAt
          : new Date().toISOString()
        : null;

      const updated = await strapi.entityService.update(USER_ALERT_UID, existing.id, {
        data: {
          readAt,
        } as any,
      });

      ctx.body = toAlertResponse(updated as UserAlertEntity);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid user-alert payload.';
      return ctx.badRequest(message);
    }
  },

  async markAllReadMe(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    const readAt = new Date().toISOString();
    let updated = 0;

    while (true) {
      const unread = await findAlertsForUser(
        strapi,
        currentUser.id,
        {
          readAt: {
            $null: true,
          },
        },
        100,
      );

      if (!unread.length) {
        break;
      }

      for (const entry of unread) {
        await strapi.entityService.update(USER_ALERT_UID, entry.id, {
          data: {
            readAt,
          } as any,
        });
        updated += 1;
      }

      if (unread.length < 100) {
        break;
      }
    }

    ctx.body = {
      updated,
      readAt: updated > 0 ? readAt : null,
    };
  },

  async deleteReadMe(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    let deleted = 0;

    while (true) {
      const readEntries = await findAlertsForUser(
        strapi,
        currentUser.id,
        {
          readAt: {
            $notNull: true,
          },
        },
        100,
      );

      if (!readEntries.length) {
        break;
      }

      for (const entry of readEntries) {
        await strapi.entityService.delete(USER_ALERT_UID, entry.id);
        deleted += 1;
      }

      if (readEntries.length < 100) {
        break;
      }
    }

    ctx.body = {
      deleted,
    };
  },

  async deleteMe(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    const alertId = normalizeId(ctx.params?.id);
    if (!alertId) {
      return ctx.badRequest('id is required.');
    }

    const existing = await findAlertForUser(strapi, currentUser.id, alertId);
    if (!existing?.id) {
      return ctx.notFound('userAlert.notFound');
    }

    await strapi.entityService.delete(USER_ALERT_UID, existing.id);
    ctx.body = {
      id: String(existing.id),
      deleted: true,
    };
  },
});
