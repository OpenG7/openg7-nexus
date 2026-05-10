#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const REQUIRED_ENV_VARS = [
  {
    key: 'API_URL',
    description: 'Base URL of the Strapi API exposed to the frontend',
  },
  {
    key: 'ANALYTICS_ENDPOINT',
    description: 'Endpoint that receives client analytics events',
  },
  {
    key: 'NOTIFICATION_WEBHOOK_URL',
    description: 'Webhook endpoint used to deliver notification emails',
  },
  {
    key: 'API_TOKEN',
    description: 'Read-only Strapi token injected into runtime-config.js',
  },
  {
    key: 'HOMEPAGE_PREVIEW_TOKEN',
    description: 'Token shared between Strapi and Angular for /preview/homepage',
  },
];

const PLACEHOLDER_VALUES = new Map([
  ['API_TOKEN', new Set(['og7_frontend_readonly_token'])],
  ['HOMEPAGE_PREVIEW_TOKEN', new Set(['preview-token'])],
]);

function isUnset(value, key) {
  if (value === undefined) {
    return true;
  }

  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim();
  if (!normalized) {
    return true;
  }

  const placeholders = PLACEHOLDER_VALUES.get(key);
  if (placeholders && placeholders.has(normalized)) {
    return true;
  }

  return normalized.toLowerCase() === 'null';
}

function formatError({ key, description }) {
  return `- ${key}: ${description}`;
}

function main() {
  const missing = REQUIRED_ENV_VARS.filter(({ key }) => isUnset(process.env[key], key));

  if (missing.length === 0) {
    console.log('[preprod-config] Runtime configuration variables detected.');
    return;
  }

  console.error(
    '[preprod-config] Missing required runtime configuration variables for preproduction:',
  );
  for (const info of missing) {
    console.error(formatError(info));
  }
  console.error(
    '\nSet these variables before building the preproduction bundle so runtime-config.js contains the expected endpoints.',
  );
  process.exitCode = 1;
}

main();
