/* eslint-disable no-console */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const TEST_DB_FILENAME = `db.importation.integration.${process.pid}.${Date.now()}.sqlite`;

function applyTestEnvironment() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.STRAPI_ENV = process.env.STRAPI_ENV || 'test';
  process.env.STRAPI_SEED_AUTO = 'false';
  process.env.DATABASE_CLIENT = 'sqlite';
  process.env.DATABASE_FILENAME = TEST_DB_FILENAME;
  process.env.HOST = '127.0.0.1';
  process.env.PORT = '0';
  process.env.APP_KEYS = process.env.APP_KEYS || 'importation-test-app-key-a,importation-test-app-key-b';
  process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || 'importation-test-api-token-salt';
  process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'importation-test-admin-jwt-secret';
  process.env.TRANSFER_TOKEN_SALT = process.env.TRANSFER_TOKEN_SALT || 'importation-test-transfer-token-salt';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'importation-test-jwt-secret';
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'importation-test-encryption-key-123456789';
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

    const flows = await requestJson(`${baseUrl}/api/import-flows?period=month&originScope=usmca`);
    assert.equal(flows.status, 200, 'Expected import-flows to succeed.');
    assert.ok(Array.isArray(flows.body?.timeline), 'Expected import-flows timeline array.');
    assert.ok(Array.isArray(flows.body?.flows), 'Expected import-flows flows array.');
    assert.equal(flows.body.flows[0]?.originCode, 'US', 'Expected USMCA response to be led by US data.');

    const commodities = await requestJson(`${baseUrl}/api/import-commodities?period=month&originScope=g7&hsSections=85`);
    assert.equal(commodities.status, 200, 'Expected import-commodities to succeed.');
    assert.ok(Array.isArray(commodities.body?.top), 'Expected import-commodities top array.');
    assert.ok(
      commodities.body.top.every((entry) => String(entry.hsCode || '').startsWith('85')),
      'Expected hsSections filter to constrain returned top commodities.'
    );

    const riskFlags = await requestJson(`${baseUrl}/api/import-risk-flags?originScope=g7&hsSections=85`);
    assert.equal(riskFlags.status, 200, 'Expected import-risk-flags to succeed.');
    assert.ok(Array.isArray(riskFlags.body), 'Expected import-risk-flags array response.');

    const suppliers = await requestJson(`${baseUrl}/api/import-suppliers?originScope=indo_pacific`);
    assert.equal(suppliers.status, 200, 'Expected import-suppliers to succeed.');
    assert.ok(Array.isArray(suppliers.body?.suppliers), 'Expected import-suppliers list.');
    assert.ok(
      suppliers.body.suppliers.every((supplier) => ['JP', 'KR'].includes(supplier.originCode)),
      'Expected indo_pacific suppliers only.'
    );

    const knowledge = await requestJson(`${baseUrl}/api/import-knowledge?lang=en`);
    assert.equal(knowledge.status, 200, 'Expected import-knowledge to succeed.');
    assert.equal(knowledge.body?.cta?.id, 'cta-en', 'Expected English knowledge payload.');

    const annotations = await requestJson(`${baseUrl}/api/import-annotations`);
    assert.equal(annotations.status, 200, 'Expected import-annotations to succeed.');
    assert.ok(Array.isArray(annotations.body?.annotations), 'Expected import-annotations payload.');

    const watchlistsBefore = await requestJson(`${baseUrl}/api/import-watchlists`);
    assert.equal(watchlistsBefore.status, 200, 'Expected import-watchlists GET to succeed.');
    const initialCount = watchlistsBefore.body?.watchlists?.length ?? 0;

    const createdWatchlist = await requestJson(`${baseUrl}/api/import-watchlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ontario Battery Lane',
        filters: {
          periodGranularity: 'month',
          periodValue: '2026-03',
          originScope: 'usmca',
          originCodes: [],
          hsSections: ['85'],
          compareMode: false,
          compareWith: null,
        },
      }),
    });
    assert.equal(createdWatchlist.status, 201, 'Expected watchlist creation to succeed.');
    assert.equal(createdWatchlist.body?.name, 'Ontario Battery Lane', 'Expected created watchlist payload.');

    const watchlistsAfter = await requestJson(`${baseUrl}/api/import-watchlists`);
    assert.equal(watchlistsAfter.status, 200, 'Expected import-watchlists GET after create to succeed.');
    assert.equal((watchlistsAfter.body?.watchlists?.length ?? 0), initialCount + 1, 'Expected created watchlist to be persisted in memory.');

    const updatedWatchlist = await requestJson(`${baseUrl}/api/import-watchlists/${createdWatchlist.body?.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ontario Battery Lane Updated',
      }),
    });
    assert.equal(updatedWatchlist.status, 200, 'Expected watchlist update to succeed.');
    assert.equal(updatedWatchlist.body?.name, 'Ontario Battery Lane Updated', 'Expected updated watchlist payload.');

    const schedule = await requestJson(`${baseUrl}/api/import-reports/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period: 'month',
        recipients: ['ops@example.test'],
        format: 'csv',
        frequency: 'monthly',
      }),
    });
    assert.equal(schedule.status, 202, 'Expected import report scheduling to succeed.');
    assert.equal(schedule.body?.scheduled, true, 'Expected scheduling acknowledgement payload.');
    assert.ok(schedule.body?.reportId, 'Expected persisted report schedule id.');

    const scheduledReports = await app.entityService.findMany('api::import-report-schedule.import-report-schedule', {
      sort: ['createdAt:desc'],
    });
    assert.ok(Array.isArray(scheduledReports), 'Expected persisted report schedules collection.');
    assert.equal(scheduledReports.length, 1, 'Expected a persisted scheduled report entry.');
    assert.deepEqual(scheduledReports[0]?.recipients, ['ops@example.test'], 'Expected recipients to be stored.');

    console.log('Importation integration tests passed.');
  } finally {
    await app.destroy();
    await cleanupDatabase();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});