/* eslint-disable no-console */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const TEST_DB_FILENAME = `db.hydrocarbon.integration.${process.pid}.${Date.now()}.sqlite`;
const TEST_PASSWORD = 'S3cureHydrocarbon!123';
const HYDROCARBON_ACTIONS = [
  'api::hydrocarbon-signal.hydrocarbon-signal.find',
  'api::hydrocarbon-signal.hydrocarbon-signal.findOne',
];

function applyTestEnvironment() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.STRAPI_ENV = process.env.STRAPI_ENV || 'test';
  process.env.STRAPI_SEED_AUTO = 'false';
  process.env.DATABASE_CLIENT = 'sqlite';
  process.env.DATABASE_FILENAME = TEST_DB_FILENAME;
  process.env.HOST = '127.0.0.1';
  process.env.PORT = '0';
  process.env.APP_KEYS = process.env.APP_KEYS || 'hydrocarbon-test-app-key-a,hydrocarbon-test-app-key-b';
  process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || 'hydrocarbon-test-api-token-salt';
  process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'hydrocarbon-test-admin-jwt-secret';
  process.env.TRANSFER_TOKEN_SALT = process.env.TRANSFER_TOKEN_SALT || 'hydrocarbon-test-transfer-token-salt';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'hydrocarbon-test-jwt-secret';
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'hydrocarbon-test-encryption-key-1234567';
}

async function cleanupDatabase() {
  const basePath = path.join(__dirname, '..', 'data', TEST_DB_FILENAME);
  const candidates = [basePath, `${basePath}-wal`, `${basePath}-shm`];
  await Promise.all(
    candidates.map(async candidate => {
      try {
        await fs.rm(candidate, { force: true });
      } catch {
        // Ignore cleanup errors.
      }
    })
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

async function ensureRolePermissions(strapi, roleType, actions) {
  const roleQuery = strapi.db.query('plugin::users-permissions.role');
  const permissionQuery = strapi.db.query('plugin::users-permissions.permission');
  const role = await roleQuery.findOne({ where: { type: roleType } });

  if (!role?.id) {
    throw new Error(`Role "${roleType}" not found.`);
  }

  for (const action of actions) {
    const existing = await permissionQuery.findOne({ where: { role: role.id, action } });
    if (!existing) {
      await permissionQuery.create({ data: { role: role.id, action } });
    }
  }
}

async function createAuthenticatedUser(baseUrl, runId) {
  const email = `hydrocarbon.integration.${runId}@example.test`;

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

async function seedHydrocarbonFeed(strapi, userId, suffix, overrides = {}) {
  const feed = await strapi.entityService.create('api::feed.feed', {
    data: {
      user: userId,
      type: 'OFFER',
      title: `Hydrocarbon Integration ${suffix}`,
      summary: `Hydrocarbon signal ${suffix}`,
      sectorId: 'energy',
      fromProvinceId: 'ab',
      toProvinceId: 'bc',
      mode: 'EXPORT',
      quantityValue: 48000,
      quantityUnit: 'bbl',
      urgency: 2,
      credibility: 3,
      volumeScore: 75,
      tags: ['hydrocarbon', 'alberta', 'integration'],
      sourceKind: 'COMPANY',
      sourceLabel: 'Northern Prairie Energy',
      status: 'confirmed',
      publicationFormKey: 'hydrocarbon-surplus-offer',
      metadata: {
        publicationForm: {
          formKey: 'hydrocarbon-surplus-offer',
        },
        extensions: {
          companyName: 'Northern Prairie Energy',
          publicationType: 'surplus',
          productType: 'crudeOil',
          businessReason: 'surplusStock',
          volumeBarrels: 48000,
          minimumLotBarrels: 12000,
          availableFrom: '2026-02-01',
          availableUntil: '2026-02-12',
          originSite: 'Edmonton terminal cluster',
          qualityGrade: 'wcs',
          logisticsMode: ['rail', 'storageTransfer'],
          targetScope: ['bc', 'refiningNetwork'],
          storagePressureLevel: 'high',
          priceReference: 'WCS less rail differential',
          contactChannel: 'Crude desk - western dispatch',
        },
      },
      ...overrides,
    },
  });

  await strapi.entityService.create('api::hydrocarbon-signal.hydrocarbon-signal', {
    data: {
      feedItemId: String(feed.id),
      sourceIdempotencyKey: null,
      feedItem: feed.id,
      owner: userId,
      title: feed.title,
      summary: feed.summary,
      companyName: 'Northern Prairie Energy',
      publicationType: feed.metadata?.extensions?.publicationType ?? 'surplus',
      productType: feed.metadata?.extensions?.productType ?? 'crudeOil',
      businessReason: feed.metadata?.extensions?.businessReason ?? 'surplusStock',
      volumeBarrels: Number(feed.quantityValue),
      quantityUnit: feed.quantityUnit,
      minimumLotBarrels: feed.metadata?.extensions?.minimumLotBarrels ?? 12000,
      availableFrom: feed.metadata?.extensions?.availableFrom ?? '2026-02-01',
      availableUntil: feed.metadata?.extensions?.availableUntil ?? '2026-02-12',
      estimatedDelayDays: feed.metadata?.extensions?.estimatedDelayDays ?? null,
      originProvinceId: feed.fromProvinceId,
      targetProvinceId: feed.toProvinceId,
      originSite: feed.metadata?.extensions?.originSite ?? 'Edmonton terminal cluster',
      qualityGrade: feed.metadata?.extensions?.qualityGrade ?? 'wcs',
      logisticsMode: feed.metadata?.extensions?.logisticsMode ?? ['rail', 'storageTransfer'],
      targetScope: feed.metadata?.extensions?.targetScope ?? ['bc', 'refiningNetwork'],
      storagePressureLevel: feed.metadata?.extensions?.storagePressureLevel ?? 'high',
      priceReference: feed.metadata?.extensions?.priceReference ?? 'WCS less rail differential',
      responseDeadline: null,
      contactChannel: feed.metadata?.extensions?.contactChannel ?? 'Crude desk - western dispatch',
      notes: null,
      tags: feed.tags,
      sourceKind: feed.sourceKind,
      sourceLabel: feed.sourceLabel,
      status: 'active',
    },
  });

  return feed;
}

async function run() {
  applyTestEnvironment();
  await cleanupDatabase();

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    await ensureRolePermissions(app, 'public', HYDROCARBON_ACTIONS);
    await app.server.listen();

    const address = app.server.httpServer.address();
    const port = typeof address === 'object' && address ? address.port : 1337;
    const baseUrl = `http://127.0.0.1:${port}`;
    const runId = String(Date.now());

    const empty = await requestJson(`${baseUrl}/api/hydrocarbon-signals`);
    assert.equal(empty.status, 200, 'Expected public hydrocarbon endpoint to succeed without data.');
    assert.deepEqual(empty.body?.data, [], 'Expected no hydrocarbon signals before seeding.');

    const userId = await createAuthenticatedUser(baseUrl, runId);
    const first = await seedHydrocarbonFeed(app, userId, 'SURPLUS-A');
    await seedHydrocarbonFeed(app, userId, 'SLOWDOWN-B', {
      title: 'Barrel slowdown on Alberta corridor',
      summary: 'Transport slowdown compressing dispatch capacity.',
      toProvinceId: 'sk',
      metadata: {
        publicationForm: {
          formKey: 'hydrocarbon-surplus-offer',
        },
        extensions: {
          companyName: 'Northern Prairie Energy',
          publicationType: 'slowdown',
          productType: 'crudeOil',
          businessReason: 'transportDisruption',
          volumeBarrels: 36500,
          minimumLotBarrels: 8000,
          availableFrom: '2026-02-03',
          availableUntil: '2026-02-09',
          estimatedDelayDays: 6,
          originSite: 'Hardisty routing hub',
          qualityGrade: 'wcs',
          logisticsMode: ['pipeline', 'storageTransfer'],
          targetScope: ['sk', 'storageNetwork'],
          storagePressureLevel: 'critical',
          priceReference: 'Temporary discount against WCS',
          contactChannel: 'Logistics coordination line',
        },
      },
    });

    const list = await requestJson(`${baseUrl}/api/hydrocarbon-signals?publicationType=surplus&originProvinceId=ab&limit=5`);
    assert.equal(list.status, 200, 'Expected hydrocarbon list endpoint to succeed.');
    assert.equal(list.body?.meta?.limit, 5, 'Expected limit to round-trip in response metadata.');
    assert.equal(list.body?.data?.length, 1, 'Expected publicationType filter to narrow the results.');
    assert.equal(list.body?.data?.[0]?.publicationType, 'surplus');
    assert.equal(list.body?.data?.[0]?.quantityUnit, 'bbl');
    assert.equal(list.body?.data?.[0]?.originProvinceId, 'ab');

    const detailById = await requestJson(`${baseUrl}/api/hydrocarbon-signals/${encodeURIComponent(String(first.id))}`);
    assert.equal(detailById.status, 200, 'Expected detail endpoint to resolve by feed item id.');
    assert.equal(detailById.body?.data?.feedItemId, String(first.id));
    assert.equal(detailById.body?.data?.companyName, 'Northern Prairie Energy');

    const missing = await requestJson(`${baseUrl}/api/hydrocarbon-signals/999999`);
    assert.equal(missing.status, 404, 'Expected 404 for an unknown hydrocarbon signal.');

    console.log('Hydrocarbon signals integration tests passed.');
  } finally {
    await app.destroy();
    await cleanupDatabase();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});