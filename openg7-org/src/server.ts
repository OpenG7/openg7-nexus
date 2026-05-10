import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import express from 'express';

import { EnvironmentConfig } from './environments/environment';
import bootstrap from './main.server';
import {
  createHealthSnapshot,
  metricsHandler,
  observabilityMiddleware,
} from './observability/prometheus';
import {
  createRuntimeConfigSnapshot,
  readRuntimeConfigFromProcessEnv,
  sanitizeCspSource,
} from './runtime-config/runtime-config';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

const app = express();
const commonEngine = new CommonEngine();
const runtimeConfig = createRuntimeConfigSnapshot(readRuntimeConfigFromProcessEnv());

function appendCspSources(target: Set<string>, sources: string[]): void {
  for (const source of sources ?? []) {
    const sanitized = sanitizeCspSource(source);
    if (sanitized) {
      target.add(sanitized);
    }
  }
}

function collectConnectOrigins(config: EnvironmentConfig): Set<string> {
  const origins = new Set<string>();
  origins.add("'self'");

  const candidates = [config.API_URL, config.ANALYTICS_ENDPOINT, config.NOTIFICATION_WEBHOOK_URL];

  for (const candidate of candidates) {
    const sanitized = sanitizeUrl(candidate);
    if (!sanitized) {
      continue;
    }
    const origin = extractOrigin(sanitized);
    if (origin) {
      origins.add(origin);
    }
  }

  appendCspSources(origins, config.CONTENT_SECURITY_POLICY.connectSrc);

  return origins;
}

function buildDirective(name: string, values: Set<string>): string {
  return `${name} ${Array.from(values).join(' ')}`;
}

function buildContentSecurityPolicy(config: EnvironmentConfig): string {
  const cspConfig = config.CONTENT_SECURITY_POLICY;

  const defaultSrc = new Set<string>(["'self'"]);
  const scriptSrc = new Set<string>(["'self'"]);
  const styleSrc = new Set<string>(["'self'", "'unsafe-inline'"]);
  const imgSrc = new Set<string>(["'self'", 'data:']);
  const fontSrc = new Set<string>(["'self'"]);
  const connectSrc = collectConnectOrigins(config);

  appendCspSources(scriptSrc, cspConfig.scriptSrc);
  appendCspSources(styleSrc, cspConfig.styleSrc);
  appendCspSources(imgSrc, cspConfig.imgSrc);
  appendCspSources(fontSrc, cspConfig.fontSrc);

  const directives = [
    buildDirective('default-src', defaultSrc),
    buildDirective('script-src', scriptSrc),
    buildDirective('style-src', styleSrc),
    buildDirective('img-src', imgSrc),
    buildDirective('font-src', fontSrc),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "require-trusted-types-for 'script'",
    'trusted-types angular angular#bundler',
    buildDirective('connect-src', connectSrc),
  ];

  return directives.join('; ');
}

function sanitizeUrl(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      parsed.hash = '';
      const href = parsed.toString();
      return href.endsWith('/') ? href.slice(0, -1) : href;
    }
  } catch {
    return null;
  }
  return null;
}

function extractOrigin(value: string): string | null {
  if (value.startsWith('/')) {
    return null;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    return null;
  }
  return null;
}

const csp = buildContentSecurityPolicy(runtimeConfig);

app.use((_, res, next) => {
  res.setHeader('Content-Security-Policy', csp);
  next();
});

app.use(observabilityMiddleware);

function setHealthHeaders(res: express.Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'application/json');
}

app.get('/healthz', (_req, res) => {
  setHealthHeaders(res);
  res.status(200).json(createHealthSnapshot());
});

app.head('/healthz', (_req, res) => {
  setHealthHeaders(res);
  res.status(200).end();
});

app.get('/metrics', metricsHandler);

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.get(
  '**',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html',
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.get('**', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers } = req;

  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
    .then((html) => res.send(html))
    .catch((err) => {
      console.error(err?.stack || err);
      return next(err);
    });
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.warn(`Node Express server listening on http://localhost:${port}`);
  });
}

export default app;
