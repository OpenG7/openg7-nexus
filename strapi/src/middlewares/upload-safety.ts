import type { Context, Next } from 'koa';

interface UploadSafetyConfig {
  enabled?: boolean;
  maxFileSizeBytes?: number;
  allowedMimeTypes?: string[];
  uploadPathPattern?: string;
}

interface UploadedFileLike {
  mimetype?: unknown;
  size?: unknown;
  originalFilename?: unknown;
}

const DEFAULT_UPLOAD_PATH_PATTERN = '^/(?:api/)?upload(?:/.*)?$';
const DEFAULT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
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

function normalizeMimeType(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeMimeTypeList(values: unknown[]): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    const normalized = normalizeMimeType(value);
    if (normalized) {
      unique.add(normalized);
    }
  }
  return Array.from(unique);
}

function parseMimeTypeEnv(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }
  const entries = value
    .split(/[\s,;]+/)
    .map((entry) => normalizeMimeType(entry))
    .filter((entry): entry is string => Boolean(entry));

  return normalizeMimeTypeList(entries);
}

function collectFiles(value: unknown, target: UploadedFileLike[]): void {
  if (!value) {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectFiles(item, target);
    }
    return;
  }
  if (typeof value !== 'object') {
    return;
  }

  const record = value as Record<string, unknown>;
  if ('mimetype' in record || 'size' in record || 'originalFilename' in record) {
    target.push(record as UploadedFileLike);
    return;
  }

  for (const nested of Object.values(record)) {
    collectFiles(nested, target);
  }
}

function parseUploadPathPattern(value: unknown): RegExp {
  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      return new RegExp(value.trim());
    } catch {
      return new RegExp(DEFAULT_UPLOAD_PATH_PATTERN);
    }
  }
  return new RegExp(DEFAULT_UPLOAD_PATH_PATTERN);
}

function buildAllowedMimeTypes(config: UploadSafetyConfig): string[] {
  const fromConfig = Array.isArray(config.allowedMimeTypes)
    ? normalizeMimeTypeList(config.allowedMimeTypes)
    : [];
  if (fromConfig.length > 0) {
    return fromConfig;
  }

  const fromEnv = parseMimeTypeEnv(process.env.UPLOAD_ALLOWED_MIME_TYPES);
  if (fromEnv.length > 0) {
    return fromEnv;
  }

  return DEFAULT_ALLOWED_MIME_TYPES;
}

function buildErrorResponse(
  status: number,
  name: string,
  message: string,
  details: Record<string, unknown>,
) {
  return {
    data: null,
    error: {
      status,
      name,
      message,
      details,
    },
  };
}

export default (config: UploadSafetyConfig = {}, { strapi }: { strapi: any }) => {
  const enabled = parseBoolean(config.enabled ?? process.env.UPLOAD_SAFETY_ENABLED, true);
  const maxFileSizeBytes = parsePositiveInteger(
    config.maxFileSizeBytes ?? process.env.UPLOAD_MAX_FILE_SIZE_BYTES,
    DEFAULT_MAX_FILE_SIZE_BYTES,
  );
  const allowedMimeTypes = buildAllowedMimeTypes(config);
  const allowedMimeTypeSet = new Set(allowedMimeTypes);
  const uploadPathPattern = parseUploadPathPattern(
    config.uploadPathPattern ?? process.env.UPLOAD_PATH_PATTERN,
  );

  return async (ctx: Context, next: Next) => {
    if (!enabled || ctx.method !== 'POST' || !uploadPathPattern.test(ctx.path)) {
      return next();
    }

    const requestWithFiles = ctx.request as Context['request'] & { files?: unknown };
    const files: UploadedFileLike[] = [];
    collectFiles(requestWithFiles.files, files);

    if (files.length === 0) {
      return next();
    }

    for (const file of files) {
      const mimeType = normalizeMimeType(file.mimetype);
      if (!mimeType || !allowedMimeTypeSet.has(mimeType)) {
        strapi.log?.warn?.(
          `[security] Upload blocked due to unsupported mime type: ${mimeType ?? 'unknown'}`,
        );
        ctx.status = 415;
        ctx.body = buildErrorResponse(
          415,
          'UnsupportedMediaTypeError',
          'Uploaded file type is not allowed.',
          {
            code: 'UPLOAD_UNSUPPORTED_MIME_TYPE',
            allowedMimeTypes,
            receivedMimeType: mimeType,
          },
        );
        return;
      }

      if (
        typeof file.size === 'number' &&
        Number.isFinite(file.size) &&
        file.size > maxFileSizeBytes
      ) {
        strapi.log?.warn?.(
          `[security] Upload blocked due to max file size (${file.size} > ${maxFileSizeBytes}).`,
        );
        ctx.status = 413;
        ctx.body = buildErrorResponse(
          413,
          'PayloadTooLargeError',
          'Uploaded file exceeds the configured size limit.',
          {
            code: 'UPLOAD_FILE_TOO_LARGE',
            maxFileSizeBytes,
            actualFileSizeBytes: file.size,
          },
        );
        return;
      }
    }

    return next();
  };
};
