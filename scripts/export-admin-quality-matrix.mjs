/**
 * Exports the admin quality matrix from the Strapi DB into the canonical JSON file.
 *
 * The DB is the source of truth for editorial content (observedGap, nextMove,
 * managementBucket, etc.). This script pulls the current state from Strapi and
 * writes the result to admin-quality-matrix.json, then regenerates the impact map.
 *
 * Usage:
 *   node scripts/export-admin-quality-matrix.mjs
 *   node scripts/export-admin-quality-matrix.mjs --url http://localhost:1337
 *   node scripts/export-admin-quality-matrix.mjs --dry-run    # print to stdout, no write
 */
import { writeFileSync } from 'node:fs';
import https from 'node:https';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildImpactMapFromMatrix, impactMapPath, matrixSnapshotPath } from './admin-quality-matrix-model.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  const urlIndex = args.indexOf('--url');
  return {
    baseUrl: urlIndex !== -1 ? args[urlIndex + 1] : (process.env.STRAPI_URL ?? 'http://localhost:1337'),
    token: process.env.STRAPI_EXPORT_TOKEN ?? process.env.STRAPI_OWNER_JWT ?? '',
    dryRun: args.includes('--dry-run'),
  };
}

function request(url, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Invalid JSON response: ${data.slice(0, 200)}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { baseUrl, token, dryRun } = parseArgs();

  if (!token) {
    process.stderr.write(
      'Missing auth token. Set STRAPI_EXPORT_TOKEN or STRAPI_OWNER_JWT env var.\n',
    );
    process.exit(1);
  }

  process.stdout.write(`Fetching matrix export from ${baseUrl}…\n`);

  let exportData;
  try {
    const response = await request(`${baseUrl}/api/admin/quality/matrix/export`, token);
    exportData = response?.data;
  } catch (error) {
    process.stderr.write(`Export request failed: ${error.message}\n`);
    process.exit(1);
  }

  if (!exportData || !Array.isArray(exportData.entries)) {
    process.stderr.write('Unexpected export response shape — aborting.\n');
    process.exit(1);
  }

  const matrixJson = {
    schemaVersion: exportData.schemaVersion ?? 2,
    generatedAt: exportData.generatedAt,
    entries: exportData.entries,
    globalImpactRules: exportData.globalImpactRules ?? [],
  };

  if (dryRun) {
    process.stdout.write(stableJson(matrixJson));
    process.stdout.write('\n(dry-run: nothing written)\n');
    process.exit(0);
  }

  writeFileSync(matrixSnapshotPath, stableJson(matrixJson), 'utf8');
  process.stdout.write(`Written → ${matrixSnapshotPath}\n`);

  const impactMap = buildImpactMapFromMatrix(matrixJson);
  writeFileSync(impactMapPath, stableJson(impactMap), 'utf8');
  process.stdout.write(`Written → ${impactMapPath}\n`);
  process.stdout.write(`Export complete. ${matrixJson.entries.length} entries.\n`);
}
