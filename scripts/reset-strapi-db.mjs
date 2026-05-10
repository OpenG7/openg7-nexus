#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const strapiDir = path.join(rootDir, 'strapi');
const strapiEnvPath = path.join(strapiDir, '.env');
const strapiPackageJsonPath = path.join(strapiDir, 'package.json');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const skipSeed = args.has('--no-seed');

function parseDotEnv(raw) {
  const result = {};
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex < 0) {
      continue;
    }
    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function loadStrapiEnv() {
  if (!fs.existsSync(strapiEnvPath)) {
    return {};
  }
  const raw = fs.readFileSync(strapiEnvPath, 'utf8');
  return parseDotEnv(raw);
}

function resolveEnv(name, fallback, envFile) {
  const fromProcess = process.env[name];
  if (typeof fromProcess === 'string' && fromProcess.length > 0) {
    return fromProcess;
  }
  const fromEnvFile = envFile[name];
  if (typeof fromEnvFile === 'string' && fromEnvFile.length > 0) {
    return fromEnvFile;
  }
  return fallback;
}

function runOrFail(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    cwd: rootDir,
    ...options,
  });

  if (result.status !== 0) {
    const code = result.status ?? 1;
    process.exit(code);
  }
}

function resetSqlite(envFile) {
  const dbFilename = resolveEnv('DATABASE_FILENAME', 'db.sqlite', envFile);
  const dbPath = path.join(strapiDir, 'data', dbFilename);

  if (!fs.existsSync(dbPath)) {
    console.log(`[strapi-db-reset] SQLite file not found: ${dbPath}`);
    return;
  }

  if (dryRun) {
    console.log(`[strapi-db-reset] [dry-run] Would delete SQLite file: ${dbPath}`);
    return;
  }

  fs.rmSync(dbPath, { force: true });
  console.log(`[strapi-db-reset] Deleted SQLite file: ${dbPath}`);
}

async function resetPostgres(envFile) {
  const requireFromStrapi = createRequire(strapiPackageJsonPath);
  const { Client } = requireFromStrapi('pg');

  const host = resolveEnv('DATABASE_HOST', 'localhost', envFile);
  const port = Number(resolveEnv('DATABASE_PORT', '5432', envFile));
  const database = resolveEnv('DATABASE_NAME', 'openg7_cms', envFile);
  const user = resolveEnv('DATABASE_USERNAME', 'openg7', envFile);
  const password = resolveEnv('DATABASE_PASSWORD', '', envFile);
  const schema = resolveEnv('DATABASE_SCHEMA', 'public', envFile);

  if (dryRun) {
    console.log(
      `[strapi-db-reset] [dry-run] Would reset PostgreSQL schema "${schema}" on ${host}:${port}/${database}`,
    );
    return;
  }

  const client = new Client({
    host,
    port,
    database,
    user,
    password,
  });

  await client.connect();
  try {
    const escapedSchema = `"${schema.replace(/"/g, '""')}"`;
    await client.query(`DROP SCHEMA IF EXISTS ${escapedSchema} CASCADE`);
    await client.query(`CREATE SCHEMA ${escapedSchema}`);
  } finally {
    await client.end();
  }

  console.log(
    `[strapi-db-reset] Reset PostgreSQL schema "${schema}" on ${host}:${port}/${database}`,
  );
}

async function main() {
  const envFile = loadStrapiEnv();
  const databaseClient = resolveEnv('DATABASE_CLIENT', 'sqlite', envFile).toLowerCase();

  console.log(`[strapi-db-reset] database client: ${databaseClient}`);

  if (databaseClient === 'sqlite') {
    resetSqlite(envFile);
  } else if (databaseClient === 'postgres') {
    await resetPostgres(envFile);
  } else {
    console.error(
      `[strapi-db-reset] Unsupported DATABASE_CLIENT "${databaseClient}". Expected "sqlite" or "postgres".`,
    );
    process.exit(1);
  }

  if (skipSeed) {
    console.log('[strapi-db-reset] Seed step skipped (--no-seed).');
    return;
  }

  if (dryRun) {
    console.log('[strapi-db-reset] [dry-run] Would run: yarn --cwd strapi seed:dev');
    return;
  }

  console.log('[strapi-db-reset] Running seed pipeline...');
  runOrFail('yarn', ['--cwd', 'strapi', 'seed:dev']);
  console.log('[strapi-db-reset] Done.');
}

main().catch((error) => {
  console.error('[strapi-db-reset] Failed:', error);
  process.exit(1);
});
