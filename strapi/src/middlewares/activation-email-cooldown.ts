import { createHash } from 'crypto';

import Redis from 'ioredis';
import type { Context, Next } from 'koa';

interface ActivationEmailCooldownConfig {
  enabled?: boolean;
  cooldownMs?: number;
  keyPrefix?: string;
  useRedis?: boolean;
}

interface CooldownResult {
  allowed: boolean;
  retryAfterMs: number;
}

interface CooldownStore {
  hit(key: string, ttlMs: number): Promise<CooldownResult>;
}

interface RedisOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, unknown>;
}

const ACTIVATION_EMAIL_PATH = /\/auth\/send-email-confirmation\/?$/;
const DEFAULT_KEY_PREFIX = 'strapi::activation-email-cooldown::';
const DEFAULT_COOLDOWN_MS = 120_000;

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
}

function buildRedisOptions(): RedisOptions {
  const options: RedisOptions = {
    host: process.env.REDIS_HOST || 'redis',
    port: parsePositiveInteger(process.env.REDIS_PORT, 6379),
  };

  if (process.env.REDIS_USERNAME) {
    options.username = process.env.REDIS_USERNAME;
  }
  if (process.env.REDIS_PASSWORD) {
    options.password = process.env.REDIS_PASSWORD;
  }
  if (process.env.REDIS_DB) {
    options.db = parsePositiveInteger(process.env.REDIS_DB, 0);
  }
  if (parseBoolean(process.env.REDIS_TLS, false)) {
    options.tls = {};
  }

  return options;
}

function asErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

class MemoryCooldownStore implements CooldownStore {
  private readonly expiries = new Map<string, number>();

  async hit(key: string, ttlMs: number): Promise<CooldownResult> {
    const now = Date.now();
    const expiry = this.expiries.get(key);
    if (typeof expiry === 'number' && expiry > now) {
      return { allowed: false, retryAfterMs: expiry - now };
    }

    this.expiries.set(key, now + ttlMs);

    // Opportunistic cleanup to keep memory bounded without a timer.
    if (this.expiries.size > 10_000) {
      for (const [candidateKey, candidateExpiry] of this.expiries) {
        if (candidateExpiry <= now) {
          this.expiries.delete(candidateKey);
        }
      }
    }

    return { allowed: true, retryAfterMs: 0 };
  }
}

class RedisCooldownStore implements CooldownStore {
  constructor(private readonly client: Redis) {}

  async hit(key: string, ttlMs: number): Promise<CooldownResult> {
    const result = await this.client.set(key, '1', 'PX', ttlMs, 'NX');
    if (result === 'OK') {
      return { allowed: true, retryAfterMs: 0 };
    }

    const pttl = await this.client.pttl(key);
    const retryAfterMs = pttl > 0 ? pttl : ttlMs;
    return { allowed: false, retryAfterMs };
  }
}

export default (config: ActivationEmailCooldownConfig = {}, { strapi }: { strapi: any }) => {
  const sessionDriver = (process.env.STRAPI_SESSION_DRIVER || '').trim().toLowerCase();
  const enabled =
    config.enabled ?? parseBoolean(process.env.ACTIVATION_EMAIL_COOLDOWN_ENABLED, true);
  const cooldownMs = parsePositiveInteger(
    config.cooldownMs ?? process.env.ACTIVATION_EMAIL_COOLDOWN_MS,
    DEFAULT_COOLDOWN_MS,
  );
  const keyPrefix = String(
    config.keyPrefix ?? process.env.ACTIVATION_EMAIL_COOLDOWN_PREFIX ?? DEFAULT_KEY_PREFIX,
  );
  const useRedis =
    config.useRedis ??
    parseBoolean(process.env.ACTIVATION_EMAIL_COOLDOWN_USE_REDIS, sessionDriver === 'redis');

  let store: CooldownStore = new MemoryCooldownStore();
  let redisFallbackLogged = false;

  if (enabled && useRedis) {
    try {
      const client = new Redis(buildRedisOptions());
      store = new RedisCooldownStore(client);
      client.on('error', (error) => {
        if (!redisFallbackLogged) {
          redisFallbackLogged = true;
          strapi.log?.warn?.(
            `[security] Activation-email cooldown Redis store failed (${asErrorMessage(
              error,
            )}). Falling back to in-memory storage.`,
          );
        }
        store = new MemoryCooldownStore();
        void client.disconnect();
      });
    } catch (error) {
      strapi.log?.warn?.(
        `[security] Activation-email cooldown Redis init failed (${asErrorMessage(
          error,
        )}). Using in-memory storage.`,
      );
    }
  }

  return async (ctx: Context, next: Next) => {
    if (!enabled) {
      return next();
    }

    if (ctx.method !== 'POST' || !ACTIVATION_EMAIL_PATH.test(ctx.path)) {
      return next();
    }

    const body = (ctx.request.body ?? {}) as Record<string, unknown>;
    const email = normalizeEmail(body.email);
    const ip = ctx.request.ip || ctx.ip || 'unknown';
    const fingerprint = `${ip}::${email || 'missing-email'}`;
    const hashedFingerprint = createHash('sha256').update(fingerprint).digest('hex');
    const key = `${keyPrefix}${hashedFingerprint}`;

    try {
      const result = await store.hit(key, cooldownMs);
      if (result.allowed) {
        return next();
      }

      const retryAfterSeconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
      ctx.set('Retry-After', String(retryAfterSeconds));
      ctx.status = 429;
      ctx.body = {
        data: null,
        error: {
          status: 429,
          name: 'TooManyRequestsError',
          message: 'Please wait before requesting another activation email.',
          details: {
            code: 'ACTIVATION_EMAIL_COOLDOWN',
            retryAfterSeconds,
          },
        },
      };
      return;
    } catch (error) {
      strapi.log?.warn?.(
        `[security] Activation-email cooldown check failed (${asErrorMessage(
          error,
        )}). Request allowed.`,
      );
      return next();
    }
  };
};
