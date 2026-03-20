#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const templatePath = path.resolve(__dirname, '../config/runtime-config.template.json');
const outputPath = path.resolve(__dirname, '../public/runtime-config.js');

const REQUIRED_STRING_KEYS = ['API_URL'];
const AUTH_MODE_MAP = new Map([
  ['local-only', 'local-only'],
  ['local', 'local-only'],
  ['sso-only', 'sso-only'],
  ['sso', 'sso-only'],
  ['hybrid', 'hybrid'],
]);

const CSP_DIRECTIVE_KEYS = ['scriptSrc', 'styleSrc', 'imgSrc', 'fontSrc', 'connectSrc'];
const HOME_FEED_PANEL_LIMIT_KEYS = ['alerts', 'opportunities', 'indicators'];

function coerceString(key, fallback, { required = false } = {}) {
  const raw = process.env[key];
  if (raw === undefined) {
    if (required && !fallback) {
      throw new Error(`Missing required environment variable ${key}`);
    }
    return fallback;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    if (required) {
      throw new Error(`Environment variable ${key} cannot be empty`);
    }
    return fallback;
  }

  return trimmed;
}

function coerceNullableString(key, fallback) {
  const raw = process.env[key];
  if (raw === undefined) {
    return fallback;
  }

  const trimmed = raw.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null') {
    return null;
  }

  return trimmed;
}

function normalizeBoolean(value) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized !== 'false' && normalized !== '0' && normalized !== 'off';
  }

  return Boolean(value);
}

function coerceFeatureFlags(key, fallback) {
  const raw = process.env[key];
  if (raw === undefined) {
    return fallback;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed).reduce((acc, [flagKey, value]) => {
        acc[flagKey] = normalizeBoolean(value);
        return acc;
      }, { ...fallback });
    }
  } catch {
    // Fallback to comma separated parsing below.
  }

  const result = { ...fallback };
  for (const chunk of trimmed.split(',')) {
    const entry = chunk.trim();
    if (!entry) {
      continue;
    }
    const [flagKey, value] = entry.split('=');
    if (!flagKey) {
      continue;
    }
    const normalizedValue = value ?? 'true';
    result[flagKey.trim()] = normalizeBoolean(normalizedValue);
  }

  return result;
}

function coercePositiveInteger(value, fallback) {
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

function coerceHomeFeedPanelLimits(key, fallback) {
  const raw = process.env[key];
  if (raw === undefined) {
    return fallback;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return fallback;
  }

  const parsed = parseJson(trimmed);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${key} must be a JSON object with numeric alerts/opportunities/indicators values.`);
  }

  return HOME_FEED_PANEL_LIMIT_KEYS.reduce((acc, panelKey) => {
    acc[panelKey] = coercePositiveInteger(parsed[panelKey], fallback[panelKey]);
    return acc;
  }, { ...fallback });
}

function coerceBoolean(key, fallback) {
  const raw = process.env[key];
  if (raw === undefined) {
    return fallback;
  }

  if (typeof raw === 'string') {
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
  }

  if (typeof raw === 'boolean') {
    return raw;
  }

  return fallback;
}

function coerceAuthMode(key, fallback) {
  const raw = process.env[key];
  if (raw === undefined) {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  return AUTH_MODE_MAP.get(normalized) ?? fallback;
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function toArrayCandidates(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    const parsed = parseJson(trimmed);
    if (Array.isArray(parsed)) {
      return parsed;
    }

    return trimmed.split(/[,\s]+/);
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [value];
}

function coerceDirectiveCandidates(value, fallback = []) {
  const normalize = (candidate) => {
    if (typeof candidate !== 'string') {
      candidate = String(candidate ?? '');
    }

    const trimmed = candidate.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const unique = new Set();

  if (value === undefined) {
    for (const entry of Array.isArray(fallback) ? fallback : []) {
      const normalized = normalize(entry);
      if (normalized) {
        unique.add(normalized);
      }
    }
    return Array.from(unique);
  }

  for (const entry of toArrayCandidates(value)) {
    const normalized = normalize(entry);
    if (normalized) {
      unique.add(normalized);
    }
  }

  return Array.from(unique);
}

function coerceContentSecurityPolicy(template) {
  const base = template && typeof template === 'object' ? template : {};
  const config = CSP_DIRECTIVE_KEYS.reduce((acc, key) => {
    acc[key] = coerceDirectiveCandidates(undefined, base[key] ?? []);
    return acc;
  }, {});

  const rawConfig = process.env.CONTENT_SECURITY_POLICY;
  if (typeof rawConfig === 'string') {
    const trimmed = rawConfig.trim();
    if (trimmed) {
      const parsed = parseJson(trimmed);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('CONTENT_SECURITY_POLICY must be a JSON object describing CSP directives.');
      }

      for (const key of CSP_DIRECTIVE_KEYS) {
        const camelValue = parsed[key];
        const kebabValue = parsed[key.replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`)];
        const candidate = camelValue !== undefined ? camelValue : kebabValue;
        if (candidate !== undefined) {
          config[key] = coerceDirectiveCandidates(candidate, []);
        }
      }
    }
  }

  for (const key of CSP_DIRECTIVE_KEYS) {
    const envKey = `CSP_${key.replace(/([A-Z])/g, (match) => `_${match.toUpperCase()}`)}`.toUpperCase();
    const raw = process.env[envKey];
    if (typeof raw !== 'string') {
      continue;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      config[key] = [];
      continue;
    }

    config[key] = coerceDirectiveCandidates(trimmed, []);
  }

  return config;
}

async function loadTemplate() {
  const contents = await readFile(templatePath, 'utf8');
  return JSON.parse(contents);
}

async function buildRuntimeConfig() {
  const template = await loadTemplate();
  const config = { ...template };

  for (const key of REQUIRED_STRING_KEYS) {
    config[key] = coerceString(key, template[key], { required: true });
  }

  config.API_TOKEN = coerceNullableString('API_TOKEN', template.API_TOKEN);
  config.HOMEPAGE_PREVIEW_TOKEN = coerceNullableString('HOMEPAGE_PREVIEW_TOKEN', template.HOMEPAGE_PREVIEW_TOKEN);
  config.I18N_PREFIX = coerceString('I18N_PREFIX', template.I18N_PREFIX);
  config.HOME_FEED_PANEL_LIMITS = coerceHomeFeedPanelLimits(
    'HOME_FEED_PANEL_LIMITS',
    template.HOME_FEED_PANEL_LIMITS
  );
  config.API_WITH_CREDENTIALS = coerceBoolean('API_WITH_CREDENTIALS', template.API_WITH_CREDENTIALS);
  config.FEATURE_FLAGS = coerceFeatureFlags('FEATURE_FLAGS', template.FEATURE_FLAGS);
  config.AUTH_MODE = coerceAuthMode('AUTH_MODE', template.AUTH_MODE);
  config.NOTIFICATION_WEBHOOK_URL = coerceNullableString('NOTIFICATION_WEBHOOK_URL', template.NOTIFICATION_WEBHOOK_URL);
  config.ANALYTICS_ENDPOINT = coerceNullableString('ANALYTICS_ENDPOINT', template.ANALYTICS_ENDPOINT);
  config.CONTENT_SECURITY_POLICY = coerceContentSecurityPolicy(template.CONTENT_SECURITY_POLICY);

  return config;
}

async function writeRuntimeConfig(config) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const serialized = JSON.stringify(config, null, 2);
  const banner = '// This file is generated by scripts/generate-runtime-config.mjs\n';
  const body = `window.__OG7_CONFIG__ = ${serialized};\n`;
  await writeFile(outputPath, `${banner}${body}`, 'utf8');
}

function summarize(config) {
  return Object.entries(config).reduce((acc, [key, value]) => {
    if (value === null) {
      acc[key] = 'null';
      return acc;
    }

    if (typeof value === 'object') {
      acc[key] = JSON.stringify(value);
      return acc;
    }

    const stringValue = String(value);
    acc[key] = stringValue.length > 0 ? '<set>' : '<empty>';
    return acc;
  }, {});
}

async function main() {
  try {
    const config = await buildRuntimeConfig();
    await writeRuntimeConfig(config);
    const relativeOutput = path.relative(path.resolve(__dirname, '..'), outputPath);
    console.log(`[runtime-config] Wrote ${relativeOutput}`);
    console.log('[runtime-config] Summary:', summarize(config));
  } catch (error) {
    console.error('[runtime-config] Failed to generate manifest');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
}

await main();
