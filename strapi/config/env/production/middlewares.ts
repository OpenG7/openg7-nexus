const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:4200',
  'http://localhost:4000',
  'http://127.0.0.1:4200',
  'http://127.0.0.1:4000',
];
const DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function sanitizeOrigin(candidate?: string | null): string | null {
  if (!candidate) {
    return null;
  }

  try {
    const parsed = new URL(candidate.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    parsed.pathname = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.origin;
  } catch {
    return null;
  }
}

function parseOrigins(raw: string | undefined, defaults: string[] = []): string[] {
  const origins = new Set<string>();

  for (const origin of defaults) {
    const sanitized = sanitizeOrigin(origin);
    if (sanitized) {
      origins.add(sanitized);
    }
  }

  if (!raw) {
    return Array.from(origins);
  }

  for (const chunk of raw.split(/[\s,]+/)) {
    const sanitized = sanitizeOrigin(chunk);
    if (sanitized) {
      origins.add(sanitized);
    }
  }

  return Array.from(origins);
}

function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (typeof raw !== 'string') {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
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

function parseInteger(raw: string | undefined, fallback: number): number {
  if (typeof raw !== 'string') {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
}

function parsePositiveInteger(raw: string | undefined, fallback: number): number {
  const parsed = parseInteger(raw, fallback);
  return parsed > 0 ? parsed : fallback;
}

function collectUploadAssetOrigins(): string[] {
  const configuredOrigins = parseOrigins(process.env.UPLOAD_ASSET_ORIGINS);
  const derivedOrigins = [process.env.UPLOAD_S3_BASE_URL, process.env.UPLOAD_S3_ENDPOINT]
    .map((candidate) => sanitizeOrigin(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));

  return Array.from(new Set([...configuredOrigins, ...derivedOrigins]));
}

const allowedOrigins = parseOrigins(process.env.CORS_ALLOWED_ORIGINS, DEFAULT_ALLOWED_ORIGINS);
const allowCredentials = parseBoolean(process.env.CORS_ALLOW_CREDENTIALS, true);
const uploadAssetOrigins = collectUploadAssetOrigins();
const uploadMaxFileSizeBytes = parsePositiveInteger(
  process.env.UPLOAD_MAX_FILE_SIZE_BYTES,
  DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES,
);
const uploadBodyLimit = `${Math.max(2, Math.ceil(uploadMaxFileSizeBytes / (1024 * 1024)) + 1)}mb`;

const sessionDriver = (process.env.STRAPI_SESSION_DRIVER || 'redis').toLowerCase();
const enableRateLimit =
  sessionDriver === 'redis' && parseBoolean(process.env.RATE_LIMIT_ENABLED, true);

function buildRedisProviderOptions() {
  const options: Record<string, unknown> = {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInteger(process.env.REDIS_PORT, 6379),
  };

  if (process.env.REDIS_USERNAME) {
    options.username = process.env.REDIS_USERNAME;
  }

  if (process.env.REDIS_PASSWORD) {
    options.password = process.env.REDIS_PASSWORD;
  }

  if (process.env.REDIS_DB) {
    options.db = parseInteger(process.env.REDIS_DB, 0);
  }

  if (parseBoolean(process.env.REDIS_TLS, false)) {
    options.tls = {};
  }

  return options;
}

const rateLimitIntervalMs = parseInteger(process.env.RATE_LIMIT_INTERVAL_MS, 60_000);
const rateLimitMaxRequests = parseInteger(process.env.RATE_LIMIT_MAX, 250);
const rateLimitPrefix = process.env.RATE_LIMIT_PREFIX || 'strapi::rl::';
const sessionCookieDomain = process.env.STRAPI_SESSION_COOKIE_DOMAIN || undefined;
const sessionCookieMaxAge = parseInteger(process.env.STRAPI_SESSION_COOKIE_MAXAGE, 0);

export default [
  {
    name: 'global::healthcheck',
    config: {
      checkDatabase: parseBoolean(process.env.STRAPI_HEALTHCHECK_CHECK_DATABASE, true),
      databaseTimeoutMs: parseInteger(process.env.STRAPI_HEALTHCHECK_DATABASE_TIMEOUT_MS, 1_000),
    },
  },
  'strapi::errors',
  {
    name: 'global::metrics',
    config: {
      slowRequestThresholdMs: parseInteger(process.env.STRAPI_SLOW_REQUEST_THRESHOLD_MS, 1_500),
    },
  },
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', ...uploadAssetOrigins],
          'media-src': ["'self'", 'data:', 'blob:', ...uploadAssetOrigins],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      origin: allowedOrigins,
      headers: [
        'Content-Type',
        'Authorization',
        'Origin',
        'Accept',
        'Idempotency-Key',
        'Access-Control-Allow-Credentials',
        'Access-Control-Allow-Headers',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      credentials: allowCredentials,
    },
  },
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      multipart: true,
      formLimit: uploadBodyLimit,
      jsonLimit: '1mb',
      textLimit: '1mb',
      formidable: {
        maxFileSize: uploadMaxFileSizeBytes,
        multiples: true,
      },
    },
  },
  'global::upload-safety',
  'global::activation-email-cooldown',
  {
    name: 'strapi::session',
    config: {
      enabled: true,
      cookie: {
        domain: sessionCookieDomain,
        httpOnly: true,
        sameSite: process.env.STRAPI_SESSION_COOKIE_SAMESITE || 'lax',
        secure: parseBoolean(process.env.STRAPI_SESSION_COOKIE_SECURE, true),
        maxAge: sessionCookieMaxAge > 0 ? sessionCookieMaxAge : undefined,
      },
      ...(sessionDriver === 'redis'
        ? {
            store: {
              type: 'redis',
              config: {
                keyPrefix: process.env.STRAPI_SESSION_REDIS_PREFIX || 'strapi:sess:',
                ttl: parseInteger(process.env.STRAPI_SESSION_TTL, 24 * 60 * 60 * 1000),
                ...buildRedisProviderOptions(),
              },
            },
          }
        : {}),
    },
  },
  enableRateLimit
    ? {
        name: 'strapi::rateLimit',
        config: {
          enabled: true,
          interval: rateLimitIntervalMs,
          max: rateLimitMaxRequests,
          prefixKey: rateLimitPrefix,
          provider: {
            type: 'redis',
            options: buildRedisProviderOptions(),
          },
        },
      }
    : null,
  'strapi::favicon',
  'strapi::public',
].filter(Boolean);
