import type { Context, Next } from 'koa';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

interface MetricsConfig {
  slowRequestThresholdMs?: number;
}

const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'strapi_' });

const requestDuration = new Histogram({
  name: 'strapi_http_request_duration_seconds',
  help: 'Time spent serving HTTP requests handled by Strapi.',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const requestCounter = new Counter({
  name: 'strapi_http_requests_total',
  help: 'Total number of HTTP requests handled by Strapi.',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

const DEFAULT_SLOW_THRESHOLD_MS = 1_500;

export default (config: MetricsConfig = {}, { strapi }: { strapi: any }) => {
  const slowThreshold =
    typeof config.slowRequestThresholdMs === 'number' && config.slowRequestThresholdMs > 0
      ? config.slowRequestThresholdMs
      : DEFAULT_SLOW_THRESHOLD_MS;

  return async (ctx: Context, next: Next) => {
    if (ctx.path === '/metrics') {
      if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
        ctx.status = 405;
        ctx.set('Allow', 'GET, HEAD');
        return;
      }

      ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      ctx.set('Content-Type', registry.contentType);
      ctx.status = 200;

      if (ctx.method === 'HEAD') {
        return;
      }

      ctx.body = await registry.metrics();
      return;
    }

    const startedAt = process.hrtime.bigint();

    try {
      await next();
    } finally {
      const durationNs = Number(process.hrtime.bigint() - startedAt);
      const durationMs = durationNs / 1_000_000;
      const durationSeconds = durationNs / 1_000_000_000;

      const route =
        typeof ctx._matchedRoute === 'string' && ctx._matchedRoute
          ? ctx._matchedRoute
          : ctx.path || 'unmatched';
      const labels = { method: ctx.method, route, status: String(ctx.status) };

      requestDuration.observe(labels, durationSeconds);
      requestCounter.inc(labels);

      if (durationMs >= slowThreshold) {
        const payload = {
          event: 'slow_request',
          component: 'strapi',
          method: ctx.method,
          route,
          status: ctx.status,
          durationMs: Math.round(durationMs),
        };
        strapi.log?.warn?.(
          `[observability] Slow Strapi request detected: ${JSON.stringify(payload)}`,
        );
      }
    }
  };
};

export function getStrapiMetricsRegistry(): Registry {
  return registry;
}
