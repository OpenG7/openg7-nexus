const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:4200',
  'https://localhost:4200',
  'http://127.0.0.1:4200',
  'https://127.0.0.1:4200',
];
const DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function parsePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

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

  for (const candidate of defaults) {
    const sanitized = sanitizeOrigin(candidate);
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

function collectUploadAssetOrigins(): string[] {
  const configuredOrigins = parseOrigins(process.env.UPLOAD_ASSET_ORIGINS);
  const rawCandidates = [process.env.UPLOAD_S3_BASE_URL, process.env.UPLOAD_S3_ENDPOINT];
  const derivedOrigins = rawCandidates
    .map((candidate) => sanitizeOrigin(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));

  return Array.from(new Set([...configuredOrigins, ...derivedOrigins]));
}

const allowedOrigins = parseOrigins(process.env.CORS_ALLOWED_ORIGINS, DEFAULT_ALLOWED_ORIGINS);
const allowCredentials = parseBoolean(process.env.CORS_ALLOW_CREDENTIALS, true);
const uploadAssetOrigins = collectUploadAssetOrigins();
const uploadMaxFileSizeBytes = parsePositiveInteger(
  process.env.UPLOAD_MAX_FILE_SIZE_BYTES,
  DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES
);
const uploadBodyLimit = `${Math.max(2, Math.ceil(uploadMaxFileSizeBytes / (1024 * 1024)) + 1)}mb`;

export default [
  {
    name: 'global::healthcheck',
    config: {
      checkDatabase: true,
      databaseTimeoutMs: 1000,
    },
  },
  'strapi::errors',
  {
    name: 'global::metrics',
    config: {
      slowRequestThresholdMs: 1500,
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
      origin: allowedOrigins,
      headers: [
        'Content-Type',
        'Authorization',
        'Origin',
        'Accept',
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
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
