import {
  environment,
  EnvironmentConfig,
  ContentSecurityPolicyConfig,
  HomeFeedPanelLimitsConfig,
} from '../environments/environment';

type AuthMode = EnvironmentConfig['AUTH_MODE'];
type FeatureFlags = EnvironmentConfig['FEATURE_FLAGS'];

export type RuntimeConfigKey = keyof EnvironmentConfig;

export type RuntimeSource = Partial<Record<RuntimeConfigKey, unknown>>;

interface ParserParams<K extends RuntimeConfigKey> {
  value: unknown;
  fallback: EnvironmentConfig[K];
}

type Parser<K extends RuntimeConfigKey> = (params: ParserParams<K>) => EnvironmentConfig[K];

type RuntimeConfigParsers = {
  [K in RuntimeConfigKey]: Parser<K>;
};

const AUTH_MODE_MAP: Record<string, AuthMode> = {
  'local-only': 'local-only',
  local: 'local-only',
  'sso-only': 'sso-only',
  sso: 'sso-only',
  hybrid: 'hybrid',
};

const ALLOWED_CSP_KEYWORDS = new Set([
  "'self'",
  "'none'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  "'unsafe-hashes'",
  "'strict-dynamic'",
  "'wasm-unsafe-eval'",
  "'report-sample'",
]);

const ALLOWED_CSP_SCHEMES = ['data:', 'blob:'];

const WILDCARD_ORIGIN_PATTERN = /^(https?|wss?):\/\/[*.][\w.-]+(?::\d+)?$/i;

const CSP_DIRECTIVE_KEYS: (keyof ContentSecurityPolicyConfig)[] = [
  'connectSrc',
  'fontSrc',
  'imgSrc',
  'scriptSrc',
  'styleSrc',
];

const DEFAULT_CSP_CONFIG: ContentSecurityPolicyConfig = {
  connectSrc: [],
  fontSrc: [],
  imgSrc: [],
  scriptSrc: [],
  styleSrc: [],
};

const HOME_FEED_PANEL_LIMIT_KEYS: (keyof HomeFeedPanelLimitsConfig)[] = [
  'alerts',
  'opportunities',
  'indicators',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseBooleanValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
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
  }

  return fallback;
}

function coerceBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
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

  return Boolean(value);
}

function parseStringValue(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (value === undefined || value === null) {
    return fallback;
  }

  const coerced = String(value).trim();
  return coerced.length > 0 ? coerced : fallback;
}

function parseNullableStringValue(value: unknown, fallback: string | null): string | null {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  const coerced = String(value).trim();
  return coerced.length > 0 ? coerced : fallback;
}

function parseFeatureFlags(value: unknown, fallback: FeatureFlags): FeatureFlags {
  if (!value) {
    return fallback;
  }

  if (isRecord(value)) {
    return Object.entries(value).reduce<FeatureFlags>((acc, [flagKey, flagValue]) => {
      acc[flagKey] = coerceBoolean(flagValue);
      return acc;
    }, { ...fallback });
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(trimmed) as FeatureFlags;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.entries(parsed).reduce<FeatureFlags>((acc, [flagKey, flagValue]) => {
          acc[flagKey] = coerceBoolean(flagValue);
          return acc;
        }, { ...fallback });
      }
    } catch {
      // Fallback to comma separated parsing below.
    }

    const result: FeatureFlags = { ...fallback };
    for (const chunk of trimmed.split(',')) {
      const entry = chunk.trim();
      if (!entry) {
        continue;
      }
      const [flagKey, rawValue] = entry.split('=');
      if (!flagKey) {
        continue;
      }
      const normalizedKey = flagKey.trim();
      if (!normalizedKey) {
        continue;
      }
      const valuePart = rawValue ?? 'true';
      result[normalizedKey] = coerceBoolean(valuePart);
    }

    return result;
  }

  return fallback;
}

function parsePositiveIntegerValue(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = Math.trunc(value);
    return normalized > 0 ? normalized : fallback;
  }

  if (typeof value === 'string') {
    const normalized = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(normalized) && normalized > 0) {
      return normalized;
    }
  }

  return fallback;
}

function parseHomeFeedPanelLimits(
  value: unknown,
  fallback: HomeFeedPanelLimitsConfig,
): HomeFeedPanelLimitsConfig {
  let source: Record<string, unknown> | null = null;

  if (isRecord(value)) {
    source = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      const parsed = parseJson(trimmed);
      if (isRecord(parsed)) {
        source = parsed;
      }
    }
  }

  if (!source) {
    return { ...fallback };
  }

  return HOME_FEED_PANEL_LIMIT_KEYS.reduce<HomeFeedPanelLimitsConfig>((acc, key) => {
    acc[key] = parsePositiveIntegerValue(source[key], fallback[key]);
    return acc;
  }, { ...fallback });
}

function parseAuthMode(value: unknown, fallback: AuthMode): AuthMode {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return AUTH_MODE_MAP[normalized] ?? fallback;
}

function toArrayCandidates(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Fall through to comma/space splitting.
    }

    return trimmed.split(/[,\s]+/);
  }

  return [];
}

function sanitizeWildcardOrigin(candidate: string): string | null {
  if (!WILDCARD_ORIGIN_PATTERN.test(candidate)) {
    return null;
  }

  const normalized = candidate.replace(/\/$/, '');
  return normalized;
}

export function sanitizeCspSource(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const lowered = trimmed.toLowerCase();
  if (ALLOWED_CSP_KEYWORDS.has(lowered)) {
    return trimmed;
  }

  for (const scheme of ALLOWED_CSP_SCHEMES) {
    if (lowered === scheme || lowered.startsWith(`${scheme}`)) {
      return scheme;
    }
  }

  if (trimmed.includes('*')) {
    return sanitizeWildcardOrigin(trimmed);
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) {
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

function parseCspSources(value: unknown, fallback: string[]): string[] {
  const sources = new Set<string>();

  for (const candidate of fallback ?? []) {
    const sanitizedFallback = sanitizeCspSource(candidate);
    if (sanitizedFallback) {
      sources.add(sanitizedFallback);
    }
  }

  for (const candidate of toArrayCandidates(value)) {
    const sanitized = sanitizeCspSource(typeof candidate === 'string' ? candidate : String(candidate));
    if (sanitized) {
      sources.add(sanitized);
    }
  }

  return Array.from(sources);
}

function normalizeDirectiveKey(key: keyof ContentSecurityPolicyConfig): [keyof ContentSecurityPolicyConfig, string] {
  const camelCaseKey = key;
  const kebabCaseKey = key.replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`);
  return [camelCaseKey, kebabCaseKey];
}

function parseContentSecurityPolicy(
  value: unknown,
  fallback: ContentSecurityPolicyConfig,
): ContentSecurityPolicyConfig {
  const base = fallback ?? DEFAULT_CSP_CONFIG;

  if (!value || !isRecord(value)) {
    return {
      connectSrc: parseCspSources(undefined, base.connectSrc),
      fontSrc: parseCspSources(undefined, base.fontSrc),
      imgSrc: parseCspSources(undefined, base.imgSrc),
      scriptSrc: parseCspSources(undefined, base.scriptSrc),
      styleSrc: parseCspSources(undefined, base.styleSrc),
    };
  }

  const result: ContentSecurityPolicyConfig = {
    connectSrc: [],
    fontSrc: [],
    imgSrc: [],
    scriptSrc: [],
    styleSrc: [],
  };

  for (const directive of CSP_DIRECTIVE_KEYS) {
    const [camelCaseKey, kebabCaseKey] = normalizeDirectiveKey(directive);
    const candidate = (value as Record<string, unknown>)[camelCaseKey] ?? (value as Record<string, unknown>)[kebabCaseKey];
    result[directive] = parseCspSources(candidate, base[directive] ?? []);
  }

  return result;
}

const RUNTIME_CONFIG_PARSERS: RuntimeConfigParsers = {
  API_URL: ({ value, fallback }) => parseStringValue(value, fallback),
  API_WITH_CREDENTIALS: ({ value, fallback }) => parseBooleanValue(value, fallback),
  API_TOKEN: ({ value, fallback }) => parseNullableStringValue(value, fallback),
  HOMEPAGE_PREVIEW_TOKEN: ({ value, fallback }) => parseNullableStringValue(value, fallback),
  I18N_PREFIX: ({ value, fallback }) => parseStringValue(value, fallback),
  HOME_FEED_PANEL_LIMITS: ({ value, fallback }) => parseHomeFeedPanelLimits(value, fallback),
  FEATURE_FLAGS: ({ value, fallback }) => parseFeatureFlags(value, fallback),
  AUTH_MODE: ({ value, fallback }) => parseAuthMode(value, fallback),
  NOTIFICATION_WEBHOOK_URL: ({ value, fallback }) => parseNullableStringValue(value, fallback),
  ANALYTICS_ENDPOINT: ({ value, fallback }) => parseNullableStringValue(value, fallback),
  CONTENT_SECURITY_POLICY: ({ value, fallback }) => parseContentSecurityPolicy(value, fallback),
};

export function normalizeRuntimeSource(source: unknown): RuntimeSource {
  if (!isRecord(source)) {
    return {};
  }

  return Object.keys(environment).reduce<RuntimeSource>((acc, key) => {
    const typedKey = key as RuntimeConfigKey;
    if (source[typedKey] !== undefined) {
      acc[typedKey] = source[typedKey];
    }
    return acc;
  }, {});
}

function parseRuntimeEntry<K extends RuntimeConfigKey>(
  key: K,
  merged: Record<RuntimeConfigKey, unknown>,
  base: EnvironmentConfig,
): EnvironmentConfig[K] {
  const parser = RUNTIME_CONFIG_PARSERS[key] as Parser<K>;
  return parser({ value: merged[key], fallback: base[key] });
}

export function createRuntimeConfigSnapshot(overrides?: RuntimeSource): EnvironmentConfig {
  const base: EnvironmentConfig = { ...environment };
  const merged = { ...base, ...(overrides ?? {}) } as Record<RuntimeConfigKey, unknown>;
  const keys = Object.keys(environment) as RuntimeConfigKey[];
  const snapshot = {} as Record<RuntimeConfigKey, EnvironmentConfig[RuntimeConfigKey]>;

  for (const key of keys) {
    snapshot[key] = parseRuntimeEntry(key, merged, base);
  }

  return snapshot as EnvironmentConfig;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function resolveCspDirectiveFromEnv(
  env: Record<string, string | undefined>,
  key: keyof ContentSecurityPolicyConfig,
): string[] | undefined {
  const envKey = `CSP_${key.replace(/([A-Z])/g, (match) => `_${match.toUpperCase()}`)}`.toUpperCase();
  const raw = env[envKey];
  if (raw === undefined) {
    return undefined;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  const parsed = parseJson(trimmed);
  if (Array.isArray(parsed)) {
    return parsed.map((entry) => (typeof entry === 'string' ? entry : String(entry)));
  }

  return trimmed.split(/[,\s]+/).filter(Boolean);
}

function buildContentSecurityPolicyFromEnv(env: Record<string, string | undefined>): ContentSecurityPolicyConfig | undefined {
  const config: ContentSecurityPolicyConfig = {
    connectSrc: [],
    fontSrc: [],
    imgSrc: [],
    scriptSrc: [],
    styleSrc: [],
  };

  let hasDirective = false;

  for (const directive of CSP_DIRECTIVE_KEYS) {
    const override = resolveCspDirectiveFromEnv(env, directive);
    if (override) {
      config[directive] = override;
      hasDirective = true;
    }
  }

  if (!hasDirective) {
    return undefined;
  }

  return config;
}

export function readRuntimeConfigFromProcessEnv(
  env?: Record<string, string | undefined>,
): RuntimeSource {
  const globalProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const sourceEnv = env ?? globalProcess?.env ?? {};
  const keys = Object.keys(environment) as RuntimeConfigKey[];
  const overrides: RuntimeSource = {};

  for (const key of keys) {
    const value = sourceEnv[key];
    if (value !== undefined) {
      overrides[key] = value;
    }
  }

  if (overrides.CONTENT_SECURITY_POLICY === undefined) {
    const cspFromEnv = buildContentSecurityPolicyFromEnv(sourceEnv);
    if (cspFromEnv) {
      overrides.CONTENT_SECURITY_POLICY = cspFromEnv;
    }
  }

  return overrides;
}

export function summarizeRuntimeConfig(config: EnvironmentConfig): Record<string, string> {
  return Object.entries(config).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === null) {
      acc[key] = 'null';
      return acc;
    }

    if (Array.isArray(value)) {
      acc[key] = `[array:${value.length}]`;
      return acc;
    }

    if (typeof value === 'object') {
      acc[key] = '[object]';
      return acc;
    }

    const stringValue = String(value);
    acc[key] = stringValue.length > 0 ? '<set>' : '<empty>';
    return acc;
  }, {});
}
