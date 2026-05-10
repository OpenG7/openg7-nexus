import type { Context, Next } from 'koa';

interface HealthcheckConfig {
  checkDatabase?: boolean;
  databaseTimeoutMs?: number;
}

type HealthStatus = 'ok' | 'degraded';

interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  checks: {
    database?: {
      status: HealthStatus | 'unknown';
      latencyMs?: number;
      error?: string;
    };
  };
}

const DEFAULT_TIMEOUT_MS = 1_000;

async function checkDatabaseConnectivity(
  strapi: any,
  timeoutMs: number,
): Promise<{ status: HealthStatus | 'unknown'; latencyMs?: number; error?: string }> {
  const connection = strapi?.db?.connection;
  if (!connection || typeof connection.raw !== 'function') {
    return { status: 'unknown' };
  }

  const timeout = timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;
  const start = process.hrtime.bigint();

  try {
    let handle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise((_, reject) => {
      handle = setTimeout(() => {
        reject(new Error('timeout'));
      }, timeout);
    });

    await Promise.race([connection.raw('select 1'), timeoutPromise]);
    if (handle) {
      clearTimeout(handle);
    }

    const durationNs = Number(process.hrtime.bigint() - start);
    const latencyMs = Math.round((durationNs / 1_000_000) * 100) / 100;
    return { status: 'ok', latencyMs };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown-error';
    return { status: 'degraded', error: message };
  }
}

export default (config: HealthcheckConfig = {}, { strapi }: { strapi: any }) => {
  const shouldCheckDatabase = config.checkDatabase !== false;
  const timeoutMs =
    typeof config.databaseTimeoutMs === 'number' ? config.databaseTimeoutMs : DEFAULT_TIMEOUT_MS;

  return async (ctx: Context, next: Next) => {
    if (ctx.path !== '/healthz') {
      return next();
    }

    if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
      ctx.status = 405;
      ctx.set('Allow', 'GET, HEAD');
      return;
    }

    const payload: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {},
    };

    if (shouldCheckDatabase) {
      const result = await checkDatabaseConnectivity(strapi, timeoutMs);
      payload.checks.database = result;
      if (result.status === 'degraded') {
        payload.status = 'degraded';
      }
    }

    const statusCode = payload.status === 'ok' ? 200 : 503;
    ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    ctx.set('Content-Type', 'application/json');
    ctx.status = statusCode;

    if (ctx.method === 'HEAD') {
      return;
    }

    ctx.body = payload;
  };
};
