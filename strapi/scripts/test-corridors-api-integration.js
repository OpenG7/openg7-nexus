/* eslint-disable no-console */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const TEST_DB_FILENAME = `db.corridors.integration.${process.pid}.${Date.now()}.sqlite`;
const TEST_PASSWORD = 'S3cureCorridors!123';

function applyTestEnvironment() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.STRAPI_ENV = process.env.STRAPI_ENV || 'test';
  process.env.STRAPI_SEED_AUTO = 'false';
  process.env.DATABASE_CLIENT = 'sqlite';
  process.env.DATABASE_FILENAME = TEST_DB_FILENAME;
  process.env.HOST = '127.0.0.1';
  process.env.PORT = '0';
  process.env.APP_KEYS =
    process.env.APP_KEYS || 'corridors-test-app-key-a,corridors-test-app-key-b';
  process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || 'corridors-test-api-token-salt';
  process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'corridors-test-admin-jwt-secret';
  process.env.TRANSFER_TOKEN_SALT =
    process.env.TRANSFER_TOKEN_SALT || 'corridors-test-transfer-token-salt';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'corridors-test-jwt-secret';
  process.env.ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY || 'corridors-test-encryption-key-123456789';
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

async function createAuthenticatedUser(baseUrl, runId) {
  const email = `corridors.integration.${runId}@example.test`;

  const register = await requestJson(`${baseUrl}/api/auth/local/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: email,
      email,
      password: TEST_PASSWORD,
    }),
  });

  assert.equal(register.status, 200, 'Expected register to succeed.');
  assert.ok(register.body?.user?.id, 'Expected user id from register response.');
  return register.body.user.id;
}

async function seedFeedEntity(strapi, userId, runId, suffix, overrides = {}) {
  return strapi.entityService.create('api::feed.feed', {
    data: {
      user: userId,
      type: 'OFFER',
      title: `Corridor Seed ${runId} ${suffix}`,
      summary: `Corridor integration payload ${runId} ${suffix}`,
      sectorId: 'energy',
      fromProvinceId: 'qc',
      toProvinceId: 'on',
      mode: 'EXPORT',
      urgency: 1,
      credibility: 2,
      volumeScore: 10,
      tags: ['corridor', runId],
      sourceKind: 'USER',
      sourceLabel: 'Integration Seeder',
      status: 'confirmed',
      ...overrides,
    },
  });
}

function assertSnapshotShape(snapshot) {
  assert.ok(snapshot && typeof snapshot === 'object', 'Expected a snapshot object.');
  assert.ok(Array.isArray(snapshot.items), 'Expected snapshot.items to be an array.');
  assert.ok(
    snapshot.status && typeof snapshot.status === 'object',
    'Expected snapshot.status object.',
  );
  assert.match(
    String(snapshot.status.level || ''),
    /^(ok|warning|critical|info)$/,
    'Expected a valid status level.',
  );
  assert.equal(
    snapshot.cta?.labelKey,
    'home.corridorsRealtime.cta.viewMap',
    'Expected CTA label key.',
  );
  assert.ok(snapshot.timestamp, 'Expected timestamp in snapshot.');
  assert.ok(
    !Number.isNaN(new Date(snapshot.timestamp).getTime()),
    'Expected an ISO-compatible timestamp.',
  );
}

async function run() {
  applyTestEnvironment();
  await cleanupDatabase();

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    await app.server.listen();

    const address = app.server.httpServer.address();
    const port = typeof address === 'object' && address ? address.port : 1337;
    const baseUrl = `http://127.0.0.1:${port}`;
    const runId = String(Date.now());

    const fallbackResponse = await requestJson(`${baseUrl}/api/corridors/realtime`);
    assert.equal(fallbackResponse.status, 200, 'Expected public corridors endpoint to succeed.');
    assertSnapshotShape(fallbackResponse.body);
    assert.equal(
      fallbackResponse.body.items.length,
      0,
      'Expected empty fallback when no feed data exists.',
    );
    assert.equal(
      fallbackResponse.body.status.level,
      'info',
      'Expected informational status for empty fallback payload.',
    );

    const userId = await createAuthenticatedUser(baseUrl, runId);

    await seedFeedEntity(app, userId, runId, 'QC-ON-OFFER', {
      type: 'OFFER',
      fromProvinceId: 'qc',
      toProvinceId: 'on',
      urgency: 2,
      status: 'confirmed',
    });
    await seedFeedEntity(app, userId, runId, 'QC-ON-REQUEST', {
      type: 'REQUEST',
      fromProvinceId: 'qc',
      toProvinceId: 'on',
      urgency: 1,
      status: 'confirmed',
    });
    await seedFeedEntity(app, userId, runId, 'BC-AB-OFFER', {
      type: 'OFFER',
      fromProvinceId: 'bc',
      toProvinceId: 'ab',
      urgency: 3,
      status: 'confirmed',
    });
    await seedFeedEntity(app, userId, runId, 'BC-AB-REQUEST', {
      type: 'REQUEST',
      fromProvinceId: 'bc',
      toProvinceId: 'ab',
      urgency: 3,
      status: 'confirmed',
    });
    await seedFeedEntity(app, userId, runId, 'MB-ON-OFFER', {
      type: 'OFFER',
      fromProvinceId: 'mb',
      toProvinceId: 'on',
      urgency: 1,
      status: 'confirmed',
    });
    await seedFeedEntity(app, userId, runId, 'FAILED-SHOULD-BE-IGNORED', {
      type: 'OFFER',
      fromProvinceId: 'sk',
      toProvinceId: 'ab',
      urgency: 3,
      status: 'failed',
    });
    await seedFeedEntity(app, userId, runId, 'NO-ROUTE-IGNORED', {
      fromProvinceId: null,
      toProvinceId: null,
      status: 'confirmed',
    });

    const realtime = await requestJson(`${baseUrl}/api/corridors/realtime?limit=2`);
    assert.equal(realtime.status, 200, 'Expected realtime endpoint to succeed with seeded data.');
    assertSnapshotShape(realtime.body);
    assert.equal(realtime.body.items.length, 2, 'Expected limit=2 to cap returned corridor items.');

    const firstItem = realtime.body.items[0];
    assert.equal(firstItem.id, 'bc-ab', 'Expected highest urgency corridor to be ranked first.');
    assert.equal(firstItem.route, 'BC -> AB', 'Expected normalized route formatting.');
    assert.match(
      firstItem.label,
      /active updates/,
      'Expected label compatible with frontend rendering.',
    );
    assert.match(firstItem.meta, /offers|requests/i, 'Expected summarized corridor metadata.');

    const itemIds = realtime.body.items.map((item) => item.id);
    assert.ok(
      !itemIds.includes('sk-ab'),
      'Expected failed feed entries to be excluded from aggregation.',
    );
    assert.equal(
      realtime.body.status.labelKey,
      'home.corridorsRealtime.status.capacityReached',
      'Expected status label key aligned with home widget translations.',
    );
    assert.match(
      realtime.response.headers.get('cache-control') || '',
      /max-age=15/i,
      'Expected short cache header for realtime payload.',
    );

    const capped = await requestJson(`${baseUrl}/api/corridors/realtime?limit=999`);
    assert.equal(capped.status, 200, 'Expected capped request to succeed.');
    assert.ok(
      capped.body.items.length <= 12,
      'Expected hard upper bound on returned corridor items.',
    );

    console.log('Corridors integration tests passed.');
  } finally {
    await app.destroy();
    await cleanupDatabase();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
