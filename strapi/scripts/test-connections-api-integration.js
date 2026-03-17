/* eslint-disable no-console */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const ACCOUNT_PROFILE_UID = 'api::account-profile.account-profile';
const TEST_DB_FILENAME = `db.connections.integration.${process.pid}.${Date.now()}.sqlite`;
const TEST_PASSWORD = 'S3cureConnection!123';
const CONNECTION_ACTIONS = [
  'api::connection.connection.create',
  'api::connection.connection.history',
  'api::connection.connection.findOne',
  'api::connection.connection.updateStatus',
];

function applyTestEnvironment() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.STRAPI_ENV = process.env.STRAPI_ENV || 'test';
  process.env.STRAPI_SEED_AUTO = 'false';
  process.env.DATABASE_CLIENT = 'sqlite';
  process.env.DATABASE_FILENAME = TEST_DB_FILENAME;
  process.env.HOST = '127.0.0.1';
  process.env.PORT = '0';
  process.env.APP_KEYS = process.env.APP_KEYS || 'connection-test-app-key-a,connection-test-app-key-b';
  process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || 'connection-test-api-token-salt';
  process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'connection-test-admin-jwt-secret';
  process.env.TRANSFER_TOKEN_SALT =
    process.env.TRANSFER_TOKEN_SALT || 'connection-test-transfer-token-salt';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'connection-test-jwt-secret';
  process.env.ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY || 'connection-test-encryption-key-123456789';
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

async function ensureConnectionPermissions(strapi) {
  await ensureRolePermissions(strapi, 'authenticated', CONNECTION_ACTIONS);
}

async function createAuthenticatedUser(baseUrl, runId, suffix) {
  const email = `connections.integration.${runId}.${suffix}@example.test`;

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
  assert.ok(register.body?.user?.id, 'Expected user id from register response.');

  return {
    jwt: register.body.jwt,
    userId: register.body.user.id,
  };
}

function buildConnectionPayload(runId, overrides = {}) {
  return {
    data: {
      match: 1000,
      intro_message: `Connection intro ${runId}: this proposal includes enough detail for validation checks.`,
      buyer_profile: 101,
      buyer_organization: 'Hydro Quebec Transition',
      supplier_profile: 202,
      supplier_organization: 'Prairie Electrolyzers Inc.',
      locale: 'fr',
      attachments: ['nda', 'rfq'],
      logistics_plan: {
        incoterm: 'DAP',
        transports: ['ROAD', 'RAIL'],
      },
      meeting_proposal: [
        '2030-01-15T13:30:00.000Z',
        '2030-01-16T15:00:00.000Z',
      ],
      ...overrides,
    },
  };
}

async function upsertAccountProfile(strapi, userId, organization) {
  const found = await strapi.entityService.findMany(ACCOUNT_PROFILE_UID, {
    filters: {
      user: {
        id: userId,
      },
    },
    limit: 1,
  });
  const existing = Array.isArray(found) ? found[0] : found;

  if (existing?.id) {
    await strapi.entityService.update(ACCOUNT_PROFILE_UID, existing.id, {
      data: {
        organization,
      },
    });
    return;
  }

  await strapi.entityService.create(ACCOUNT_PROFILE_UID, {
    data: {
      user: userId,
      organization,
    },
  });
}

async function run() {
  applyTestEnvironment();
  await cleanupDatabase();

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    await ensureConnectionPermissions(app);
    await app.server.listen();

    const address = app.server.httpServer.address();
    const port = typeof address === 'object' && address ? address.port : 1337;
    const baseUrl = `http://127.0.0.1:${port}`;
    const runId = String(Date.now());

    const userA = await createAuthenticatedUser(baseUrl, runId, 'a');
    const userB = await createAuthenticatedUser(baseUrl, runId, 'b');
    const userC = await createAuthenticatedUser(baseUrl, runId, 'c');

    await upsertAccountProfile(app, userA.userId, 'Hydro Quebec Transition');
    await upsertAccountProfile(app, userB.userId, 'Prairie Electrolyzers Inc.');
    await upsertAccountProfile(app, userC.userId, 'Unrelated Trading House');

    const unauthorizedCreate = await requestJson(`${baseUrl}/api/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildConnectionPayload(runId)),
    });
    assertAuthFailure(unauthorizedCreate.status, 'POST /api/connections unauthenticated');

    const unauthorizedHistory = await requestJson(`${baseUrl}/api/connections`);
    assertAuthFailure(unauthorizedHistory.status, 'GET /api/connections unauthenticated');

    const invalidPayload = await requestJson(`${baseUrl}/api/connections`, {
      method: 'POST',
      headers: authHeaders(userA.jwt),
      body: JSON.stringify(
        buildConnectionPayload(runId, {
          intro_message: 'short',
          attachments: ['nda', 'invalid-attachment'],
        })
      ),
    });
    assert.equal(invalidPayload.status, 400, 'Expected payload validation to reject invalid create request.');

    const created = await requestJson(`${baseUrl}/api/connections`, {
      method: 'POST',
      headers: authHeaders(userA.jwt),
      body: JSON.stringify(buildConnectionPayload(runId)),
    });
    assert.equal(created.status, 201, `Expected connection create success (${created.text})`);
    assert.ok(created.body?.data?.id, 'Expected created connection id.');
    assert.equal(created.body?.data?.attributes?.status, 'pending', 'Expected initial pending status.');
    assert.equal(created.body?.data?.attributes?.stage, 'reply', 'Expected initial reply stage.');

    const connectionId = created.body.data.id;

    const historyA = await requestJson(`${baseUrl}/api/connections`, {
      headers: { Authorization: `Bearer ${userA.jwt}` },
    });
    assert.equal(historyA.status, 200, 'Expected history request to succeed for owner.');
    assert.ok(Array.isArray(historyA.body?.data), 'Expected history list.');
    assert.ok(historyA.body.data.some((item) => item.id === connectionId), 'Expected owner history to include connection.');

    const historyB = await requestJson(`${baseUrl}/api/connections`, {
      headers: { Authorization: `Bearer ${userB.jwt}` },
    });
    assert.equal(historyB.status, 200, 'Expected history request to succeed for the second actor.');
    assert.ok(Array.isArray(historyB.body?.data), 'Expected second history list.');
    assert.ok(
      historyB.body.data.some((item) => item.id === connectionId),
      'Expected the counterparty history to include the shared connection.'
    );

    const historyC = await requestJson(`${baseUrl}/api/connections`, {
      headers: { Authorization: `Bearer ${userC.jwt}` },
    });
    assert.equal(historyC.status, 200, 'Expected unrelated history request to succeed.');
    assert.ok(Array.isArray(historyC.body?.data), 'Expected unrelated history list.');
    assert.ok(
      historyC.body.data.every((item) => item.id !== connectionId),
      'Expected unrelated users to remain isolated from the connection.'
    );

    const findOneA = await requestJson(`${baseUrl}/api/connections/${encodeURIComponent(String(connectionId))}`, {
      headers: { Authorization: `Bearer ${userA.jwt}` },
    });
    assert.equal(findOneA.status, 200, 'Expected owner findOne to succeed.');
    assert.equal(findOneA.body?.data?.id, connectionId, 'Expected findOne to return requested connection.');

    const findOneB = await requestJson(`${baseUrl}/api/connections/${encodeURIComponent(String(connectionId))}`, {
      headers: { Authorization: `Bearer ${userB.jwt}` },
    });
    assert.equal(findOneB.status, 200, 'Expected the counterparty findOne to succeed.');
    assert.equal(findOneB.body?.data?.id, connectionId, 'Expected counterparty findOne to return the connection.');

    const findOneC = await requestJson(`${baseUrl}/api/connections/${encodeURIComponent(String(connectionId))}`, {
      headers: { Authorization: `Bearer ${userC.jwt}` },
    });
    assert.equal(findOneC.status, 404, 'Expected unrelated findOne to be denied as not found.');

    const updateByOtherUser = await requestJson(
      `${baseUrl}/api/connections/${encodeURIComponent(String(connectionId))}/status`,
      {
        method: 'PATCH',
        headers: authHeaders(userB.jwt),
        body: JSON.stringify({ data: { status: 'inDiscussion' } }),
      }
    );
    assert.equal(updateByOtherUser.status, 200, 'Expected the counterparty status update to succeed.');
    assert.equal(
      updateByOtherUser.body?.data?.attributes?.status,
      'inDiscussion',
      'Expected the counterparty to advance the shared status.'
    );

    const updateByUnrelatedUser = await requestJson(
      `${baseUrl}/api/connections/${encodeURIComponent(String(connectionId))}/status`,
      {
        method: 'PATCH',
        headers: authHeaders(userC.jwt),
        body: JSON.stringify({ data: { status: 'completed' } }),
      }
    );
    assert.equal(updateByUnrelatedUser.status, 404, 'Expected unrelated status update to be denied.');

    const statusInDiscussion = await requestJson(
      `${baseUrl}/api/connections/${encodeURIComponent(String(connectionId))}/status`,
      {
        method: 'PATCH',
        headers: authHeaders(userA.jwt),
        body: JSON.stringify({ data: { status: 'inDiscussion', note: 'first call completed' } }),
      }
    );
    assert.equal(statusInDiscussion.status, 200, 'Expected valid status transition to succeed.');
    assert.equal(
      statusInDiscussion.body?.data?.attributes?.status,
      'inDiscussion',
      'Expected updated status to be inDiscussion.'
    );
    assert.equal(
      statusInDiscussion.body?.data?.attributes?.stage,
      'meeting',
      'Expected stage to advance with status transition.'
    );
    assert.ok(
      Array.isArray(statusInDiscussion.body?.data?.attributes?.statusHistory) &&
        statusInDiscussion.body.data.attributes.statusHistory.length >= 2,
      'Expected status history to persist transitions.'
    );

    const invalidTransition = await requestJson(
      `${baseUrl}/api/connections/${encodeURIComponent(String(connectionId))}/status`,
      {
        method: 'PATCH',
        headers: authHeaders(userA.jwt),
        body: JSON.stringify({ data: { status: 'pending' } }),
      }
    );
    assert.equal(invalidTransition.status, 400, 'Expected invalid status transition to be rejected.');

    const statusCompleted = await requestJson(
      `${baseUrl}/api/connections/${encodeURIComponent(String(connectionId))}/status`,
      {
        method: 'PATCH',
        headers: authHeaders(userA.jwt),
        body: JSON.stringify({ data: { status: 'completed' } }),
      }
    );
    assert.equal(statusCompleted.status, 200, 'Expected second valid status transition to succeed.');
    assert.equal(statusCompleted.body?.data?.attributes?.status, 'completed', 'Expected completed status.');

    const statusFilter = await requestJson(
      `${baseUrl}/api/connections?status=${encodeURIComponent('completed')}`,
      {
        headers: { Authorization: `Bearer ${userA.jwt}` },
      }
    );
    assert.equal(statusFilter.status, 200, 'Expected status filter query to succeed.');
    assert.ok(
      statusFilter.body?.data?.every((entry) => entry.attributes?.status === 'completed'),
      'Expected status filter to only return completed connections.'
    );

    console.log('Connections integration tests passed.');
  } finally {
    await app.destroy();
    await cleanupDatabase();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
