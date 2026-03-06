/* eslint-disable no-console */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const TEST_DB_FILENAME = `db.company-import-bulk.integration.${process.pid}.${Date.now()}.sqlite`;
const TEST_PASSWORD = 'S3cureImport!123';
const COMPANY_UID = 'api::company.company';
const SECTOR_UID = 'api::sector.sector';
const PROVINCE_UID = 'api::province.province';
const BULK_IMPORT_ACTIONS = [
  'api::company-import.company-import-bulk.start',
  'api::company-import.company-import-bulk.status',
  'api::company-import.company-import-bulk.cancel',
  'api::company-import.company-import-bulk.report',
  'api::company-import.company-import-bulk.errors',
  'api::company-import.company-import-bulk.events',
];

function applyTestEnvironment() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.STRAPI_ENV = process.env.STRAPI_ENV || 'test';
  process.env.STRAPI_SEED_AUTO = 'false';
  process.env.DATABASE_CLIENT = 'sqlite';
  process.env.DATABASE_FILENAME = TEST_DB_FILENAME;
  process.env.HOST = '127.0.0.1';
  process.env.PORT = '0';
  process.env.APP_KEYS = process.env.APP_KEYS || 'company-import-bulk-test-app-key-a,company-import-bulk-test-app-key-b';
  process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || 'company-import-bulk-test-api-token-salt';
  process.env.ADMIN_JWT_SECRET =
    process.env.ADMIN_JWT_SECRET || 'company-import-bulk-test-admin-jwt-secret';
  process.env.TRANSFER_TOKEN_SALT =
    process.env.TRANSFER_TOKEN_SALT || 'company-import-bulk-test-transfer-token-salt';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'company-import-bulk-test-jwt-secret';
  process.env.ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY || 'company-import-bulk-test-encryption-key-123456789';
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

function authHeaders(jwt, extra = {}) {
  return {
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function assertAuthFailure(status, context) {
  if (status !== 401 && status !== 403) {
    throw new Error(`${context}: expected 401/403, received ${status}`);
  }
}

async function ensureRolePermissions(strapi, roleType, actions) {
  const roleQuery = strapi.db.query('plugin::users-permissions.role');
  const permissionQuery = strapi.db.query('plugin::users-permissions.permission');
  const role = await roleQuery.findOne({ where: { type: roleType } });
  if (!role?.id) {
    throw new Error(`Role "${roleType}" not found.`);
  }

  for (const action of actions) {
    const existing = await permissionQuery.findOne({
      where: {
        role: role.id,
        action,
      },
    });
    if (!existing) {
      await permissionQuery.create({
        data: {
          role: role.id,
          action,
        },
      });
    }
  }
}

async function createAuthenticatedUser(baseUrl, runId) {
  const email = `company-import-bulk.integration.${runId}@example.test`;
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
  assert.ok(register.body?.jwt, 'Expected JWT from register.');
  return {
    jwt: register.body.jwt,
    userId: register.body.user.id,
  };
}

async function seedReferenceData(strapi, runId) {
  const publishedAt = new Date().toISOString();
  const sector = await strapi.entityService.create(SECTOR_UID, {
    data: {
      name: `Energy ${runId}`,
      slug: `energy-${runId}`,
      publishedAt,
    },
  });
  const province = await strapi.entityService.create(PROVINCE_UID, {
    data: {
      name: `Quebec ${runId}`,
      code: 'QC',
      slug: `qc-${runId}`,
      publishedAt,
    },
  });
  return { sector, province };
}

function buildImportEntry(runId, suffix, sector, province) {
  return {
    businessId: `BULK-${runId}-${suffix}`,
    name: `Bulk Integration ${suffix}`,
    sectors: [sector],
    location: {
      lat: 45.5017,
      lng: -73.5673,
      province,
      country: 'Canada',
    },
    contacts: {
      website: `https://${String(suffix).toLowerCase()}.bulk.integration.test`,
      email: `contact+${String(suffix).toLowerCase()}@bulk.integration.test`,
    },
  };
}

async function pollJobStatus(baseUrl, jwt, jobId, timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const status = await requestJson(`${baseUrl}/api/import/companies/jobs/${jobId}`, {
      method: 'GET',
      headers: authHeaders(jwt),
    });
    if (status.status === 200 && ['completed', 'failed', 'cancelled'].includes(status.body?.state)) {
      return status.body;
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(`Timed out waiting for job ${jobId} completion.`);
}

async function findCompaniesByBusinessId(strapi, businessIds) {
  const results = await strapi.entityService.findMany(COMPANY_UID, {
    filters: {
      businessId: {
        $in: businessIds,
      },
    },
    publicationState: 'preview',
    limit: businessIds.length + 5,
  });
  if (Array.isArray(results)) {
    return results;
  }
  return results ? [results] : [];
}

async function run() {
  applyTestEnvironment();
  await cleanupDatabase();

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    await ensureRolePermissions(app, 'authenticated', BULK_IMPORT_ACTIONS);
    const runId = String(Date.now());
    const references = await seedReferenceData(app, runId);

    await app.server.listen();
    const address = app.server.httpServer.address();
    const port = typeof address === 'object' && address ? address.port : 1337;
    const baseUrl = `http://127.0.0.1:${port}`;
    const session = await createAuthenticatedUser(baseUrl, runId);

    const unauthorized = await requestJson(`${baseUrl}/api/import/companies/bulk-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companies: [buildImportEntry(runId, 'UNAUTH', references.sector.name, references.province.code)],
      }),
    });
    assertAuthFailure(unauthorized.status, 'POST /api/import/companies/bulk-import unauthenticated');

    const alpha = buildImportEntry(runId, 'ALPHA', references.sector.name, 'QC');
    const bravo = buildImportEntry(runId, 'BRAVO', references.sector.slug, references.province.name);
    const payload = { companies: [alpha, bravo] };

    const firstStart = await requestJson(`${baseUrl}/api/import/companies/bulk-import`, {
      method: 'POST',
      headers: authHeaders(session.jwt, { 'Idempotency-Key': `bulk-${runId}` }),
      body: JSON.stringify(payload),
    });
    assert.equal(firstStart.status, 202, `Expected start response 202 (${firstStart.text})`);
    assert.ok(firstStart.body?.jobId, 'Expected jobId in start response.');
    assert.ok(firstStart.body?.statusUrl, 'Expected statusUrl in start response.');
    assert.ok(firstStart.body?.eventsUrl, 'Expected eventsUrl in start response.');
    assert.ok(firstStart.body?.reportUrl, 'Expected reportUrl in start response.');

    const duplicateStart = await requestJson(`${baseUrl}/api/import/companies/bulk-import`, {
      method: 'POST',
      headers: authHeaders(session.jwt, { 'Idempotency-Key': `bulk-${runId}` }),
      body: JSON.stringify(payload),
    });
    assert.equal(duplicateStart.status, 202, 'Expected idempotent start to return 202.');
    assert.equal(
      duplicateStart.body?.jobId,
      firstStart.body.jobId,
      'Expected idempotent request to return same jobId.'
    );

    const status = await pollJobStatus(baseUrl, session.jwt, firstStart.body.jobId);
    assert.equal(status.state, 'completed', 'Expected job to complete successfully.');
    assert.equal(status.progress.total, 2, 'Expected total row count.');
    assert.equal(status.progress.ok, 2, 'Expected successful row count.');
    assert.equal(status.progress.failed, 0, 'Expected failed row count.');

    const report = await requestJson(`${baseUrl}/api/import/companies/jobs/${firstStart.body.jobId}/report`, {
      method: 'GET',
      headers: authHeaders(session.jwt),
    });
    assert.equal(report.status, 200, 'Expected report endpoint to succeed.');
    assert.equal(
      report.body?.report?.summary?.processed,
      2,
      'Expected report summary processed count.'
    );

    const errorsJson = await requestJson(
      `${baseUrl}/api/import/companies/jobs/${firstStart.body.jobId}/errors?format=json`,
      {
        method: 'GET',
        headers: authHeaders(session.jwt),
      }
    );
    assert.equal(errorsJson.status, 200, 'Expected errors endpoint (json) to succeed.');
    assert.equal(errorsJson.body?.count, 0, 'Expected no row errors for successful import.');

    const errorsCsv = await fetch(`${baseUrl}/api/import/companies/jobs/${firstStart.body.jobId}/errors?format=csv`, {
      method: 'GET',
      headers: authHeaders(session.jwt),
    });
    assert.equal(errorsCsv.status, 200, 'Expected errors endpoint (csv) to succeed.');
    assert.match(
      errorsCsv.headers.get('content-type') ?? '',
      /text\/csv/i,
      'Expected CSV content type.'
    );

    const persisted = await findCompaniesByBusinessId(app, [alpha.businessId, bravo.businessId]);
    assert.equal(persisted.length, 2, 'Expected two persisted companies after bulk import.');

    console.log('Company bulk import integration tests passed.');
  } finally {
    await app.destroy();
    await cleanupDatabase();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
