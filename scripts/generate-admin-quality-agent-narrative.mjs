/**
 * Triggers AI narrative generation for one or all admin quality matrix entries.
 *
 * Calls POST /api/admin/quality/matrix/entries/:entryId/agent-suggest on the
 * running Strapi instance. The handler creates suggest-narrative proposals for
 * observedGap and nextMove that operators can accept in the admin UI.
 *
 * Usage:
 *   node scripts/generate-admin-quality-agent-narrative.mjs --entry GEO-001
 *   node scripts/generate-admin-quality-agent-narrative.mjs --all
 *   node scripts/generate-admin-quality-agent-narrative.mjs --all --dry-run
 *   node scripts/generate-admin-quality-agent-narrative.mjs --all --url http://localhost:1337
 *   node scripts/generate-admin-quality-agent-narrative.mjs --all --delay 2000
 *
 * Env:
 *   STRAPI_EXPORT_TOKEN   preferred — a dedicated export/admin API token
 *   STRAPI_OWNER_JWT      fallback — owner JWT from a logged-in session
 */
import https from 'node:https';
import http from 'node:http';
import { pathToFileURL } from 'node:url';

function parseArgs() {
  const args = process.argv.slice(2);

  const urlIndex = args.indexOf('--url');
  const entryIndex = args.indexOf('--entry');
  const delayIndex = args.indexOf('--delay');

  return {
    baseUrl: urlIndex !== -1 ? args[urlIndex + 1] : (process.env.STRAPI_URL ?? 'http://localhost:1337'),
    token: process.env.STRAPI_EXPORT_TOKEN ?? process.env.STRAPI_OWNER_JWT ?? '',
    entryId: entryIndex !== -1 ? args[entryIndex + 1] : null,
    all: args.includes('--all'),
    dryRun: args.includes('--dry-run'),
    delayMs: delayIndex !== -1 ? Number(args[delayIndex + 1]) : 1000,
  };
}

function httpRequest(url, token, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const bodyStr = body != null ? JSON.stringify(body) : null;

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(bodyStr != null ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
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
    if (bodyStr != null) {
      req.write(bodyStr);
    }
    req.end();
  });
}

async function fetchAllEntryIds(baseUrl, token) {
  const response = await httpRequest(`${baseUrl}/api/admin/quality/matrix/export`, token);
  const entries = response?.data?.entries;
  if (!Array.isArray(entries)) {
    throw new Error('Unexpected export response — cannot list entries.');
  }
  return entries.map((e) => e.id).filter(Boolean);
}

async function suggestNarrative(baseUrl, token, entryId) {
  return httpRequest(
    `${baseUrl}/api/admin/quality/matrix/entries/${encodeURIComponent(entryId)}/agent-suggest`,
    token,
    'POST',
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { baseUrl, token, entryId, all, dryRun, delayMs } = parseArgs();

  if (!token) {
    process.stderr.write(
      'Missing auth token. Set STRAPI_EXPORT_TOKEN or STRAPI_OWNER_JWT env var.\n',
    );
    process.exit(1);
  }

  if (!entryId && !all) {
    process.stderr.write('Specify --entry <id> or --all.\n');
    process.exit(1);
  }

  let entryIds;

  if (all) {
    process.stdout.write(`Fetching entry list from ${baseUrl}…\n`);
    try {
      entryIds = await fetchAllEntryIds(baseUrl, token);
    } catch (error) {
      process.stderr.write(`Failed to fetch entry list: ${error.message}\n`);
      process.exit(1);
    }
    process.stdout.write(`Found ${entryIds.length} entr(y/ies).\n`);
  } else {
    entryIds = [entryId];
  }

  if (dryRun) {
    process.stdout.write(`(dry-run) Would generate narratives for:\n`);
    entryIds.forEach((id) => process.stdout.write(`  - ${id}\n`));
    process.stdout.write('(dry-run: nothing sent)\n');
    process.exit(0);
  }

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < entryIds.length; i++) {
    const id = entryIds[i];
    process.stdout.write(`[${i + 1}/${entryIds.length}] ${id} … `);

    try {
      const result = await suggestNarrative(baseUrl, token, id);
      const proposals = result?.data?.proposals ?? [];
      const proposalIds = proposals.map((p) => p.id ?? p.proposalId ?? '?').join(', ');
      process.stdout.write(`✓ ${proposals.length} proposal(s) created${proposals.length ? ` (${proposalIds})` : ''}\n`);
      succeeded++;
    } catch (error) {
      process.stdout.write(`✗ ${error.message}\n`);
      failed++;
    }

    if (i < entryIds.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  process.stdout.write(
    `\nDone — ${succeeded} succeeded, ${failed} failed (${entryIds.length} total).\n`,
  );
  if (failed > 0) {
    process.exit(1);
  }
}
