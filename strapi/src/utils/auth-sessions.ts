import crypto from 'node:crypto';

import type { Core } from '@strapi/strapi';

const SESSION_STORE_PLUGIN = 'openg7-auth-sessions';
const SESSION_KEY_PREFIX = 'user';
const DEFAULT_SESSION_VERSION = 1;
const MAX_SESSION_HISTORY = 25;
const SESSION_TOUCH_INTERVAL_MS = 60_000;
const DEFAULT_SESSION_IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000;
const SESSION_IDLE_TIMEOUT_MS = resolveSessionIdleTimeoutMs();

type SessionRevokeReason = 'logout-others' | 'security' | 'idle-timeout' | null;

export interface SessionTokenClaims {
  id: string | number;
  sid: string | null;
  sv: number | null;
  iat: number | null;
}

export interface SessionSnapshotItem {
  id: string;
  version: number;
  createdAt: string;
  lastSeenAt: string;
  status: 'active' | 'revoked';
  current: boolean;
  revokedAt: string | null;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface SessionSnapshot {
  version: number;
  sessions: SessionSnapshotItem[];
}

export interface CreatedSession {
  id: string;
  version: number;
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
  revokedReason: SessionRevokeReason;
  userAgent: string | null;
  ipAddress: string | null;
}

interface StoredSessionState {
  version: number;
  sessions: CreatedSession[];
  updatedAt: string;
}

interface ValidationResult {
  valid: boolean;
  reason: string | null;
}

function normalizeString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, maxLength);
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

function parseVersion(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 1) {
    return Math.floor(value);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 1) {
      return parsed;
    }
  }
  return DEFAULT_SESSION_VERSION;
}

function resolveSessionIdleTimeoutMs(): number | null {
  const raw = process.env.AUTH_SESSION_IDLE_TIMEOUT_MS;
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return DEFAULT_SESSION_IDLE_TIMEOUT_MS;
  }

  const normalized = raw.trim().toLowerCase();
  if (['0', 'off', 'none', 'false', 'disabled'].includes(normalized)) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return DEFAULT_SESSION_IDLE_TIMEOUT_MS;
}

function normalizeSession(value: unknown): CreatedSession | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = normalizeString(record.id, 120);
  if (!id) {
    return null;
  }

  const createdAt = normalizeIsoDate(record.createdAt) ?? new Date().toISOString();
  const lastSeenAt = normalizeIsoDate(record.lastSeenAt) ?? createdAt;
  const revokedAt = normalizeIsoDate(record.revokedAt);
  const revokedReasonRaw = normalizeString(record.revokedReason, 60);
  const revokedReason: SessionRevokeReason =
    revokedReasonRaw === 'logout-others' ||
    revokedReasonRaw === 'security' ||
    revokedReasonRaw === 'idle-timeout'
      ? revokedReasonRaw
      : null;

  return {
    id,
    version: parseVersion(record.version),
    createdAt,
    lastSeenAt,
    revokedAt,
    revokedReason,
    userAgent: normalizeString(record.userAgent, 320),
    ipAddress: normalizeString(record.ipAddress, 120),
  };
}

function normalizeSessionState(value: unknown): StoredSessionState {
  const now = new Date().toISOString();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      version: DEFAULT_SESSION_VERSION,
      sessions: [],
      updatedAt: now,
    };
  }

  const record = value as Record<string, unknown>;
  const rawSessions = Array.isArray(record.sessions) ? record.sessions : [];
  const unique = new Set<string>();
  const sessions: CreatedSession[] = [];

  for (const entry of rawSessions) {
    const normalized = normalizeSession(entry);
    if (!normalized || unique.has(normalized.id)) {
      continue;
    }
    unique.add(normalized.id);
    sessions.push(normalized);
    if (sessions.length >= MAX_SESSION_HISTORY * 2) {
      break;
    }
  }

  sessions.sort((left, right) => {
    return new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime();
  });

  return {
    version: parseVersion(record.version),
    sessions: sessions.slice(0, MAX_SESSION_HISTORY),
    updatedAt: normalizeIsoDate(record.updatedAt) ?? now,
  };
}

function readForwardedForHeader(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const first = value.split(',')[0]?.trim();
  return first ? first.slice(0, 120) : null;
}

function resolveClientIp(ctx: Record<string, unknown>): string | null {
  const request = (ctx.request ?? {}) as Record<string, unknown>;
  const requestIp = normalizeString(request.ip, 120);
  if (requestIp) {
    return requestIp;
  }

  const headers = (ctx.headers ?? {}) as Record<string, unknown>;
  const forwarded = readForwardedForHeader(
    headers['x-forwarded-for'] ?? headers['X-Forwarded-For'],
  );
  return forwarded;
}

function resolveUserAgent(ctx: Record<string, unknown>): string | null {
  const headers = (ctx.headers ?? {}) as Record<string, unknown>;
  return normalizeString(headers['user-agent'] ?? headers['User-Agent'], 320);
}

function sessionStore(strapi: Core.Strapi, userId: number | string) {
  return strapi.store({
    type: 'plugin',
    name: SESSION_STORE_PLUGIN,
    key: `${SESSION_KEY_PREFIX}:${String(userId)}`,
  });
}

async function readState(
  strapi: Core.Strapi,
  userId: number | string,
): Promise<StoredSessionState> {
  const store = sessionStore(strapi, userId);
  const raw = await store.get();
  return normalizeSessionState(raw);
}

async function writeState(
  strapi: Core.Strapi,
  userId: number | string,
  state: StoredSessionState,
): Promise<void> {
  const store = sessionStore(strapi, userId);
  await store.set({ value: state });
}

function generateSessionId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

function upsertSession(
  state: StoredSessionState,
  session: CreatedSession,
  options: { keepHistory?: boolean } = {},
): StoredSessionState {
  const keepHistory = options.keepHistory ?? true;
  const nextSessions = [session, ...state.sessions.filter((entry) => entry.id !== session.id)];

  nextSessions.sort((left, right) => {
    return new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime();
  });

  const effectiveSessions = keepHistory ? nextSessions.slice(0, MAX_SESSION_HISTORY) : [session];
  return {
    version: state.version,
    sessions: effectiveSessions,
    updatedAt: new Date().toISOString(),
  };
}

function shouldTouchSession(lastSeenAt: string, now: Date): boolean {
  const previous = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(previous)) {
    return true;
  }
  return now.getTime() - previous >= SESSION_TOUCH_INTERVAL_MS;
}

function hasSessionIdleTimedOut(lastSeenAt: string, now: Date): boolean {
  if (SESSION_IDLE_TIMEOUT_MS == null) {
    return false;
  }

  const previous = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(previous)) {
    return true;
  }

  return now.getTime() - previous >= SESSION_IDLE_TIMEOUT_MS;
}

export async function extractSessionTokenClaims(
  strapi: Core.Strapi,
  ctx: Record<string, unknown>,
): Promise<SessionTokenClaims | null> {
  try {
    const jwtService = strapi.plugin('users-permissions').service('jwt') as {
      getToken(input: unknown): Promise<unknown>;
    };
    const payload = await jwtService.getToken(ctx);
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const record = payload as Record<string, unknown>;
    const id = record.id;
    if (typeof id !== 'string' && typeof id !== 'number') {
      return null;
    }

    const sid = normalizeString(record.sid, 120);
    const sv =
      typeof record.sv === 'number' && Number.isFinite(record.sv) ? Math.floor(record.sv) : null;
    const iat =
      typeof record.iat === 'number' && Number.isFinite(record.iat) ? Math.floor(record.iat) : null;

    return {
      id,
      sid,
      sv,
      iat,
    };
  } catch {
    return null;
  }
}

export async function createSessionForUser(
  strapi: Core.Strapi,
  userId: number | string,
  ctx: Record<string, unknown>,
): Promise<CreatedSession> {
  const state = await readState(strapi, userId);
  const now = new Date().toISOString();

  const session: CreatedSession = {
    id: generateSessionId(),
    version: state.version,
    createdAt: now,
    lastSeenAt: now,
    revokedAt: null,
    revokedReason: null,
    userAgent: resolveUserAgent(ctx),
    ipAddress: resolveClientIp(ctx),
  };

  const nextState = upsertSession(state, session);
  await writeState(strapi, userId, nextState);

  return session;
}

export function issueSessionJwt(
  strapi: Core.Strapi,
  userId: number | string,
  session: { id: string; version: number },
): string {
  const jwtService = strapi.plugin('users-permissions').service('jwt') as {
    issue(payload: Record<string, unknown>): string;
  };

  return jwtService.issue({
    id: userId,
    sid: session.id,
    sv: session.version,
  });
}

export async function validateSessionForToken(
  strapi: Core.Strapi,
  userId: number | string,
  claims: SessionTokenClaims | null,
  ctx?: Record<string, unknown>,
): Promise<ValidationResult> {
  const state = await readState(strapi, userId);

  if (!claims?.sid || claims.sv == null) {
    if (state.version === DEFAULT_SESSION_VERSION && state.sessions.length === 0) {
      return { valid: true, reason: null };
    }
    return { valid: false, reason: 'missing-claims' };
  }

  if (claims.sv !== state.version) {
    return { valid: false, reason: 'stale-version' };
  }

  const current = state.sessions.find(
    (entry) => entry.id === claims.sid && entry.version === state.version,
  );

  if (!current || current.revokedAt) {
    return { valid: false, reason: 'session-revoked' };
  }

  const now = new Date();
  if (hasSessionIdleTimedOut(current.lastSeenAt, now)) {
    const expired: CreatedSession = {
      ...current,
      revokedAt: now.toISOString(),
      revokedReason: 'idle-timeout',
    };
    const nextState = upsertSession(state, expired);
    await writeState(strapi, userId, nextState);
    return { valid: false, reason: 'idle-timeout' };
  }

  if (!ctx) {
    return { valid: true, reason: null };
  }

  if (!shouldTouchSession(current.lastSeenAt, now)) {
    return { valid: true, reason: null };
  }

  const touched: CreatedSession = {
    ...current,
    lastSeenAt: now.toISOString(),
    userAgent: current.userAgent ?? resolveUserAgent(ctx),
    ipAddress: current.ipAddress ?? resolveClientIp(ctx),
  };

  const nextState = upsertSession(state, touched);
  await writeState(strapi, userId, nextState);
  return { valid: true, reason: null };
}

export async function getSessionSnapshot(
  strapi: Core.Strapi,
  userId: number | string,
  claims: SessionTokenClaims | null,
): Promise<SessionSnapshot> {
  const state = await readState(strapi, userId);
  const currentSessionId = claims?.sid ?? null;
  const currentVersion = claims?.sv ?? null;

  const sessions = state.sessions.map((session) => {
    const status: 'active' | 'revoked' = session.revokedAt ? 'revoked' : 'active';

    return {
      id: session.id,
      version: session.version,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      status,
      current:
        session.id === currentSessionId &&
        currentVersion != null &&
        session.version === currentVersion &&
        !session.revokedAt,
      revokedAt: session.revokedAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
    };
  });

  return {
    version: state.version,
    sessions,
  };
}

export async function rotateSessionsAndCreateCurrent(
  strapi: Core.Strapi,
  userId: number | string,
  ctx: Record<string, unknown>,
): Promise<{ session: CreatedSession; revokedCount: number }> {
  const state = await readState(strapi, userId);
  const now = new Date().toISOString();
  const revokedCount = state.sessions.filter((session) => !session.revokedAt).length;

  const revokedSessions = state.sessions.map((session) => {
    if (session.revokedAt) {
      return session;
    }
    return {
      ...session,
      revokedAt: now,
      revokedReason: 'logout-others' as const,
      lastSeenAt: session.lastSeenAt ?? now,
    };
  });

  const version = Math.max(DEFAULT_SESSION_VERSION, state.version + 1);
  const nextState: StoredSessionState = {
    version,
    sessions: revokedSessions.slice(0, MAX_SESSION_HISTORY),
    updatedAt: now,
  };
  await writeState(strapi, userId, nextState);

  const session = await createSessionForUser(strapi, userId, ctx);
  return { session, revokedCount };
}
