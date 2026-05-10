import type { NextFunction, Request, Response } from 'express';

interface Labels {
  method: string;
  route: string;
  status: string;
}

interface CounterMetric {
  inc(labels: Labels, value?: number): void;
}
interface HistogramMetric {
  observe(labels: Labels, value: number): void;
}
interface MetricsRegistry {
  contentType: string;
  metrics(): Promise<string>;
}
interface PromClientModule {
  collectDefaultMetrics: (options: { register?: MetricsRegistry; prefix?: string }) => void;
  Counter: new (options: {
    name: string;
    help: string;
    labelNames: string[];
    registers?: MetricsRegistry[];
  }) => CounterMetric;
  Histogram: new (options: {
    name: string;
    help: string;
    labelNames: string[];
    buckets?: number[];
    registers?: MetricsRegistry[];
  }) => HistogramMetric;
  Registry: new () => MetricsRegistry;
}

interface PrometheusToolkit {
  registry: MetricsRegistry;
  requestDuration: HistogramMetric;
  requestTotal: CounterMetric;
}

const FALLBACK_TOOLKIT: PrometheusToolkit = {
  registry: {
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
    async metrics() {
      return '# metrics_unavailable 1\n';
    },
  },
  requestDuration: {
    observe() {
      // no-op when prom-client is unavailable
    },
  },
  requestTotal: {
    inc() {
      // no-op when prom-client is unavailable
    },
  },
};

const toolkit: { current: PrometheusToolkit } = { current: FALLBACK_TOOLKIT };

async function initializePrometheus() {
  const moduleName = 'prom-client';
  const namespace = await import(moduleName).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[observability] prom-client unavailable: ${message}`);
    return null;
  });

  if (!namespace) {
    return;
  }

  const promClient =
    (namespace as { default?: PromClientModule }).default ?? (namespace as PromClientModule);

  if (!promClient) {
    return;
  }

  const registry = new promClient.Registry();
  promClient.collectDefaultMetrics({ register: registry, prefix: 'openg7_ssr_' });

  const requestDuration = new promClient.Histogram({
    name: 'openg7_ssr_http_request_duration_seconds',
    help: 'Time spent processing SSR HTTP requests.',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
  });

  const requestTotal = new promClient.Counter({
    name: 'openg7_ssr_http_requests_total',
    help: 'Total number of SSR HTTP requests served.',
    labelNames: ['method', 'route', 'status'],
    registers: [registry],
  });

  toolkit.current = {
    registry,
    requestDuration,
    requestTotal,
  };
}

void initializePrometheus();

const DEFAULT_SLOW_THRESHOLD_MS = 1_000;
const parsedSlowThreshold = Number.parseInt(process.env['SSR_SLOW_REQUEST_THRESHOLD_MS'] ?? '', 10);
const slowThresholdMs =
  Number.isFinite(parsedSlowThreshold) && parsedSlowThreshold > 0
    ? parsedSlowThreshold
    : DEFAULT_SLOW_THRESHOLD_MS;

function resolveRoute(req: Request): string {
  if (req.route?.path) {
    return req.baseUrl ? `${req.baseUrl}${req.route.path}` : req.route.path;
  }

  if (req.baseUrl) {
    return `${req.baseUrl}/*`;
  }

  return req.path || 'unmatched';
}

function logSlowRequest(labels: Labels, durationMs: number) {
  if (durationMs < slowThresholdMs) {
    return;
  }

  const payload = {
    event: 'slow_request',
    component: 'ssr',
    method: labels.method,
    route: labels.route,
    status: labels.status,
    durationMs: Math.round(durationMs),
  };

  console.warn(`[observability] Slow SSR request detected: ${JSON.stringify(payload)}`);
}

/**
 * Context: Registered by the SSR Express server (`src/server.ts`) for every incoming request except metrics.
 * Raison d’être: Emits Prometheus counters/histograms and logs slow SSR responses to feed operational dashboards.
 * @param {Request} req Express request representing the SSR call to observe.
 * @param {Response} res Express response used to hook lifecycle events.
 * @param {NextFunction} next Callback to continue the middleware chain after instrumentation wiring.
 * @returns {void} No direct return value; side-effects update metrics and logs.
 */
export function observabilityMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/metrics') {
    return next();
  }

  const start = process.hrtime.bigint();

  res.once('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationMs = durationNs / 1_000_000;
    const labels: Labels = {
      method: req.method,
      route: resolveRoute(req),
      status: String(res.statusCode),
    };

    toolkit.current.requestDuration.observe(labels, durationNs / 1_000_000_000);
    toolkit.current.requestTotal.inc(labels);

    logSlowRequest(labels, durationMs);
  });

  next();
}

/**
 * Context: Mounted on `/metrics` in `src/server.ts` so Prometheus scrapes SSR metrics over HTTP.
 * Raison d’être: Serves the registry content with appropriate caching and method handling for the monitoring stack.
 * @param {Request} req Express request potentially originating from Prometheus scrapers.
 * @param {Response} res Express response used to stream the metrics payload.
 * @returns {Promise<void>} Resolves after the metrics payload (or headers for HEAD) is sent.
 */
export async function metricsHandler(req: Request, res: Response) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).end();
    return;
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', toolkit.current.registry.contentType);

  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }

  res.status(200).send(await toolkit.current.registry.metrics());
}

/**
 * Context: Called by the health check route in `src/server.ts` to report runtime status to probes.
 * Raison d’être: Offers a lightweight JSON snapshot summarizing process uptime and memory for infrastructure monitors.
 * @returns {{ status: string; timestamp: string; uptime: number; memoryRss: number }} Structure consumed by health endpoints.
 */
export function createHealthSnapshot() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryRss: process.memoryUsage().rss,
  };
}
