/* eslint-disable no-console */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const TEST_DB_FILENAME = `db.company-import.integration.${process.pid}.${Date.now()}.sqlite`;
const TEST_PASSWORD = 'S3cureImport!123';
const IMPORT_ACTIONS = ['api::company-import.company-import.importCompanies'];
const COMPANY_UID = 'api::company.company';
const SECTOR_UID = 'api::sector.sector';
const PROVINCE_UID = 'api::province.province';

function applyTestEnvironment() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.STRAPI_ENV = process.env.STRAPI_ENV || 'test';
  process.env.STRAPI_SEED_AUTO = 'false';
  process.env.DATABASE_CLIENT = 'sqlite';
  process.env.DATABASE_FILENAME = TEST_DB_FILENAME;
  process.env.HOST = '127.0.0.1';
  process.env.PORT = '0';
  process.env.APP_KEYS =
    process.env.APP_KEYS || 'company-import-test-app-key-a,company-import-test-app-key-b';
  process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || 'company-import-test-api-token-salt';
  process.env.ADMIN_JWT_SECRET =
    process.env.ADMIN_JWT_SECRET || 'company-import-test-admin-jwt-secret';
  process.env.TRANSFER_TOKEN_SALT =
    process.env.TRANSFER_TOKEN_SALT || 'company-import-test-transfer-token-salt';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'company-import-test-jwt-secret';
  process.env.ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY || 'company-import-test-encryption-key-123456789';
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

async function ensureImportPermissions(strapi) {
  await ensureRolePermissions(strapi, 'authenticated', IMPORT_ACTIONS);
}

async function createAuthenticatedUser(baseUrl, runId) {
  const email = `company-import.integration.${runId}@example.test`;
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

function buildImportEntry(runId, suffix, overrides = {}) {
  return {
    businessId: `IT-${runId}-${suffix}`,
    name: `Integration Company ${suffix}`,
    sectors: ['Energy'],
    location: {
      lat: 46.8139,
      lng: -71.2082,
      province: 'QC',
      country: 'Canada',
    },
    contacts: {
      website: `https://${String(suffix).toLowerCase()}.integration.test`,
      email: `contact+${String(suffix).toLowerCase()}@integration.test`,
    },
    ...overrides,
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

async function findCompaniesByBusinessId(strapi, businessIds) {
  return normalizeFindManyResult(
    await strapi.entityService.findMany(COMPANY_UID, {
      filters: {
        businessId: {
          $in: businessIds,
        },
      },
      publicationState: 'preview',
      populate: {
        sector: true,
        province: true,
      },
      limit: businessIds.length + 5,
    }),
  );
}

async function findCompanyByBusinessId(strapi, businessId) {
  const entries = normalizeFindManyResult(
    await strapi.entityService.findMany(COMPANY_UID, {
      filters: {
        businessId: {
          $eq: businessId,
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
    await ensureImportPermissions(app);
    const runId = String(Date.now());
    const references = await seedReferenceData(app, runId);

    await app.server.listen();
    const address = app.server.httpServer.address();
    const port = typeof address === 'object' && address ? address.port : 1337;
    const baseUrl = `http://127.0.0.1:${port}`;

    const session = await createAuthenticatedUser(baseUrl, runId);

    const unauthorized = await requestJson(`${baseUrl}/api/import/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companies: [buildImportEntry(runId, 'UNAUTH')] }),
    });
    assertAuthFailure(unauthorized.status, 'POST /api/import/companies unauthenticated');

    const invalidShape = await requestJson(`${baseUrl}/api/import/companies`, {
      method: 'POST',
      headers: authHeaders(session.jwt),
      body: JSON.stringify({ data: {} }),
    });
    assert.equal(invalidShape.status, 400, 'Expected invalid payload shape to be rejected.');

    const alpha = buildImportEntry(runId, 'ALPHA', {
      sectors: [references.sector.name],
      location: {
        lat: 45.5017,
        lng: -73.5673,
        province: 'QC',
        country: 'Canada',
      },
    });
    const bravo = buildImportEntry(runId, 'BRAVO', {
      sectors: [references.sector.slug],
      location: {
        lat: 43.6532,
        lng: -79.3832,
        province: references.province.name,
        country: 'DE',
      },
    });
    const duplicateAlpha = buildImportEntry(runId, 'ALPHA');

    const firstImport = await requestJson(`${baseUrl}/api/import/companies`, {
      method: 'POST',
      headers: authHeaders(session.jwt),
      body: JSON.stringify({
        companies: [alpha, bravo, duplicateAlpha],
      }),
    });

    assert.equal(firstImport.status, 200, `Expected first import to succeed (${firstImport.text})`);
    assert.equal(
      firstImport.body?.data?.received,
      3,
      'Expected received count to include all entries.',
    );
    assert.equal(firstImport.body?.data?.processed, 2, 'Expected two processed entries.');
    assert.equal(firstImport.body?.data?.created, 2, 'Expected two created companies.');
    assert.equal(firstImport.body?.data?.updated, 0, 'Expected zero updates on first import.');
    assert.equal(
      firstImport.body?.data?.skipped,
      1,
      'Expected one skipped entry for duplicate payload id.',
    );
    assert.ok(
      Array.isArray(firstImport.body?.data?.errors) && firstImport.body.data.errors.length >= 1,
      'Expected duplicate payload error in first import.',
    );

    const createdCompanies = await findCompaniesByBusinessId(app, [
      alpha.businessId,
      bravo.businessId,
    ]);
    assert.equal(
      createdCompanies.length,
      2,
      'Expected two persisted companies after first import.',
    );

    const alphaEntity = createdCompanies.find((entry) => entry.businessId === alpha.businessId);
    assert.ok(alphaEntity, 'Expected first imported company to exist.');
    assert.equal(
      alphaEntity.status,
      'approved',
      'Expected imported company status to be approved.',
    );
    assert.equal(alphaEntity.country, 'CA', 'Expected country alias normalization to CA.');
    assert.ok(alphaEntity.sector?.id, 'Expected sector relation resolution.');
    assert.ok(alphaEntity.province?.id, 'Expected province relation resolution.');

    const alphaUpdated = buildImportEntry(runId, 'ALPHA', {
      name: 'Integration Company ALPHA Updated',
      contacts: {
        website: 'https://alpha-updated.integration.test',
      },
      location: {
        lat: 45.5088,
        lng: -73.554,
        province: 'QC',
        country: 'United Kingdom',
      },
    });
    const charlie = buildImportEntry(runId, 'CHARLIE', {
      sectors: ['unknown-sector'],
      location: {
        lat: 41.9028,
        lng: 12.4964,
        province: 'unknown-province',
        country: 'IT',
      },
    });

    const secondImport = await requestJson(`${baseUrl}/api/import/companies`, {
      method: 'POST',
      headers: authHeaders(session.jwt),
      body: JSON.stringify({
        data: {
          companies: [alphaUpdated, charlie],
        },
      }),
    });

    assert.equal(
      secondImport.status,
      200,
      `Expected second import to succeed (${secondImport.text})`,
    );
    assert.equal(secondImport.body?.data?.received, 2, 'Expected second import received count.');
    assert.equal(secondImport.body?.data?.processed, 2, 'Expected second import processed count.');
    assert.equal(
      secondImport.body?.data?.created,
      1,
      'Expected one created company on second import.',
    );
    assert.equal(
      secondImport.body?.data?.updated,
      1,
      'Expected one updated company on second import.',
    );
    assert.equal(
      secondImport.body?.data?.skipped,
      0,
      'Expected no skipped company on second import.',
    );

    const updatedAlpha = await findCompanyByBusinessId(app, alpha.businessId);
    assert.ok(updatedAlpha, 'Expected updated alpha company to exist.');
    assert.equal(updatedAlpha.name, alphaUpdated.name, 'Expected name update to be persisted.');
    assert.equal(
      updatedAlpha.website,
      'https://alpha-updated.integration.test',
      'Expected website update.',
    );
    assert.equal(updatedAlpha.country, 'UK', 'Expected country normalization to UK on update.');
    assert.equal(
      updatedAlpha.importMetadata?.source,
      'province-upload',
      'Expected import metadata source marker.',
    );

    const fullyRejected = await requestJson(`${baseUrl}/api/import/companies`, {
      method: 'POST',
      headers: authHeaders(session.jwt),
      body: JSON.stringify({
        companies: [
          {
            businessId: '',
            name: '',
            sectors: [],
            location: { lat: 0, lng: 0 },
            contacts: {},
          },
        ],
      }),
    });

    assert.equal(
      fullyRejected.status,
      400,
      'Expected 400 when no company entry can be processed in the import batch.',
    );
    assert.equal(
      fullyRejected.body?.data?.processed,
      0,
      'Expected fully rejected import to process zero entries.',
    );

    console.log('Company import integration tests passed.');
  } finally {
    await app.destroy();
    await cleanupDatabase();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
