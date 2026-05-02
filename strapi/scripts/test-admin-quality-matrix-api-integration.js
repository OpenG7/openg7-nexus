/* eslint-disable no-console */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const TEST_DB_FILENAME = `db.admin-quality-matrix.integration.${process.pid}.${Date.now()}.sqlite`;
const MATRIX_ENTRY_UID = 'api::admin-quality-matrix.admin-quality-matrix-entry';

function applyTestEnvironment() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.STRAPI_ENV = process.env.STRAPI_ENV || 'test';
  process.env.STRAPI_SEED_AUTO = 'false';
  process.env.DATABASE_CLIENT = 'sqlite';
  process.env.DATABASE_FILENAME = TEST_DB_FILENAME;
  process.env.HOST = '127.0.0.1';
  process.env.PORT = '0';
  process.env.APP_KEYS = process.env.APP_KEYS || 'admin-quality-matrix-test-app-key-a,admin-quality-matrix-test-app-key-b';
  process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || 'admin-quality-matrix-test-api-token-salt';
  process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-quality-matrix-test-admin-jwt-secret';
  process.env.TRANSFER_TOKEN_SALT = process.env.TRANSFER_TOKEN_SALT || 'admin-quality-matrix-test-transfer-token-salt';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'admin-quality-matrix-test-jwt-secret';
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'admin-quality-matrix-test-encryption-key-123456789';
  process.env.STRAPI_ADMIN_QUALITY_INGEST_TOKEN = 'matrix-ingest-test-token';
}

async function cleanupDatabase() {
  const basePath = path.join(__dirname, '..', 'data', TEST_DB_FILENAME);
  const candidates = [basePath, `${basePath}-wal`, `${basePath}-shm`];
  await Promise.all(
    candidates.map(async (candidate) => {
      try {
        await fs.rm(candidate, { force: true });
      } catch {
        // Ignore cleanup errors.
      }
    }),
  );
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  return { response, status: response.status, body, text };
}

function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...extra,
  };
}

function normalizeFindManyResult(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}

async function createMatrixEntry(strapi, entryId) {
  return strapi.entityService.create(MATRIX_ENTRY_UID, {
    data: {
      entryId,
      domain: 'Trust et validation',
      need: 'Historiser les decisions de confiance.',
      summaryStatus: 'oui',
      businessStatus: 'oui',
      implementationStatus: 'oui',
      e2eStatus: 'oui',
      priority: 'moyenne',
      managementBucket: 'covered',
      needsProductWorkFirst: false,
      observedGap: 'Le flux critique est deja prouve.',
      nextMove: 'Maintenir la regression existante.',
      evidence: ['e2e/admin-trust-visibility.spec.ts'],
      reviewedAt: '2026-04-07',
    },
  });
}

async function findMatrixEntryByEntryId(strapi, entryId) {
  const entries = normalizeFindManyResult(
    await strapi.entityService.findMany(MATRIX_ENTRY_UID, {
      filters: {
        entryId: {
          $eq: entryId,
        },
      },
      publicationState: 'preview',
      limit: 1,
    }),
  );

  return entries[0] ?? null;
}

async function run() {
  applyTestEnvironment();
  await cleanupDatabase();

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    await createMatrixEntry(app, 'trust-validation');

    await app.server.listen();
    const address = app.server.httpServer.address();
    const port = typeof address === 'object' && address ? address.port : 1337;
    const baseUrl = `http://127.0.0.1:${port}`;

    const unauthorized = await requestJson(`${baseUrl}/api/admin/quality/matrix/ingest`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        mergedAt: '2026-05-02T12:00:00.000Z',
        commitSha: 'abc123',
        source: 'github-actions',
        impactedEntryIds: ['trust-validation'],
      }),
    });
    assert.equal(unauthorized.status, 401, 'Expected ingest without bearer token to be rejected.');

    const invalidPayload = await requestJson(`${baseUrl}/api/admin/quality/matrix/ingest`, {
      method: 'POST',
      headers: authHeaders({ Authorization: 'Bearer matrix-ingest-test-token' }),
      body: JSON.stringify({
        mergedAt: '2026-05-02T12:00:00.000Z',
        impactedEntryIds: ['trust-validation'],
      }),
    });
    assert.equal(invalidPayload.status, 400, 'Expected ingest payload without commitSha to fail.');

    const ok = await requestJson(`${baseUrl}/api/admin/quality/matrix/ingest`, {
      method: 'POST',
      headers: authHeaders({ Authorization: 'Bearer matrix-ingest-test-token' }),
      body: JSON.stringify({
        mergedAt: '2026-05-02T12:00:00.000Z',
        commitSha: 'abc123def456',
        source: 'github-actions',
        workflow: 'Admin Quality Matrix Sync',
        branch: 'main',
        summary: 'targeted sync after merge to main',
        changedFiles: ['openg7-org/src/app/domains/feed/feature/feed.page.ts'],
        impactedEntryIds: ['trust-validation', 'unknown-entry'],
      }),
    });
    assert.equal(ok.status, 200, 'Expected valid ingest request to succeed.');
    assert.deepEqual(ok.body?.data?.updatedEntryIds, ['trust-validation']);
    assert.deepEqual(ok.body?.data?.ignoredEntryIds, ['unknown-entry']);

    const updated = await findMatrixEntryByEntryId(app, 'trust-validation');
    assert.ok(updated, 'Expected matrix entry to still exist after ingest.');
    assert.equal(updated.lastRepoSignalCommit, 'abc123def456');
    assert.equal(updated.lastRepoSignalSource, 'github-actions');
    assert.equal(updated.lastRepoSignalAt, '2026-05-02T12:00:00.000Z');
    assert.match(updated.lastRepoSignalSummary, /targeted sync after merge to main/i);

    console.log('Admin quality matrix ingest integration test passed.');
  } finally {
    await app.destroy();
    await cleanupDatabase();
  }
}

run().catch(async (error) => {
  console.error(error);
  await cleanupDatabase();
  process.exit(1);
});