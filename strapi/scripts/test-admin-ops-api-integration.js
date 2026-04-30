/* eslint-disable no-console */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const TEST_DB_FILENAME = `db.admin-ops.integration.${process.pid}.${Date.now()}.sqlite`;
const TEST_PASSWORD = 'S3cureAdminOps!123';
const OPS_ACTIONS = [
  'api::admin-ops.admin-ops.health',
  'api::admin-ops.admin-ops.backups',
  'api::admin-ops.admin-ops.imports',
  'api::admin-ops.admin-ops.security',
  'api::admin-ops.admin-ops.dispatchCodexWorkflow',
];

function applyTestEnvironment() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.STRAPI_ENV = process.env.STRAPI_ENV || 'test';
  process.env.STRAPI_SEED_AUTO = 'false';
  process.env.DATABASE_CLIENT = 'sqlite';
  process.env.DATABASE_FILENAME = TEST_DB_FILENAME;
  process.env.HOST = '127.0.0.1';
  process.env.PORT = '0';
  process.env.APP_KEYS = process.env.APP_KEYS || 'admin-ops-test-app-key-a,admin-ops-test-app-key-b';
  process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || 'admin-ops-test-api-token-salt';
  process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-ops-test-admin-jwt-secret';
  process.env.TRANSFER_TOKEN_SALT =
    process.env.TRANSFER_TOKEN_SALT || 'admin-ops-test-transfer-token-salt';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'admin-ops-test-jwt-secret';
  process.env.ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY || 'admin-ops-test-encryption-key-123456789';
  process.env.OPS_CODEX_DISPATCH_ENABLED = 'true';
  process.env.OPS_CODEX_GITHUB_TOKEN = 'ghs_admin_ops_test_token';
  process.env.OPS_CODEX_GITHUB_OWNER = 'OpenG7';
  process.env.OPS_CODEX_GITHUB_REPO = 'openg7-platform';
  process.env.OPS_CODEX_GITHUB_WORKFLOW = 'codex-pr.yml';
  process.env.OPS_CODEX_GITHUB_REF = 'main';
  process.env.OPS_CODEX_ALLOWED_SCOPES = 'openg7-org,strapi';
  process.env.OPS_CODEX_ALLOWED_BASE_BRANCHES = 'main,develop';
  process.env.OPS_CODEX_GITHUB_API_URL = 'https://api.github.test';
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

function authHeaders(jwt) {
  return {
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  };
}

function assertAuthFailure(status, context) {
  if (status !== 401 && status !== 403) {
    throw new Error(`${context}: expected 401/403, received ${status}`);
  }
}

async function ensureRoleWithPermissions(strapi, roleType, roleName, actions) {
  const roleQuery = strapi.db.query('plugin::users-permissions.role');
  const permissionQuery = strapi.db.query('plugin::users-permissions.permission');
  let role = await roleQuery.findOne({
    where: { type: roleType },
  });

  if (!role) {
    role = await roleQuery.create({
      data: {
        name: roleName,
        type: roleType,
      },
    });
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

  return role;
}

async function createAuthenticatedUser(baseUrl, runId, suffix) {
  const email = `admin.ops.integration.${runId}.${suffix}@example.test`;
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
  assert.ok(register.body?.user?.id, 'Expected user id from register.');
  return {
    jwt: register.body.jwt,
    userId: register.body.user.id,
  };
}

async function assignRoleToUser(strapi, userId, roleId) {
  const userQuery = strapi.db.query('plugin::users-permissions.user');
  await userQuery.update({
    where: { id: userId },
    data: { role: roleId },
  });
}

async function seedCompanies(strapi, runId) {
  const companyUid = 'api::company.company';
  const now = new Date().toISOString();
  await strapi.entityService.create(companyUid, {
    data: {
      name: `Admin Ops Imported ${runId}`,
      businessId: `OPS-IMPORT-${runId}`,
      status: 'approved',
      publishedAt: now,
      importMetadata: {
        source: 'province-upload',
        importedAt: now,
      },
    },
  });
  await strapi.entityService.create(companyUid, {
    data: {
      name: `Admin Ops Pending ${runId}`,
      businessId: `OPS-PENDING-${runId}`,
      status: 'pending',
      publishedAt: now,
    },
  });
}

async function run() {
  applyTestEnvironment();
  await cleanupDatabase();

  const originalFetch = global.fetch.bind(global);
  const workflowDispatchCalls = [];
  global.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (
      url ===
      'https://api.github.test/repos/OpenG7/openg7-platform/actions/workflows/codex-pr.yml/dispatches'
    ) {
      workflowDispatchCalls.push({ url, init });
      return new Response(null, { status: 204 });
    }
    return originalFetch(input, init);
  };

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    const adminRole = await ensureRoleWithPermissions(app, 'admin', 'Admin', OPS_ACTIONS);
    const ownerRole = await ensureRoleWithPermissions(app, 'owner', 'Owner', OPS_ACTIONS);

    await app.server.listen();
    const address = app.server.httpServer.address();
    const port = typeof address === 'object' && address ? address.port : 1337;
    const baseUrl = `http://127.0.0.1:${port}`;
    const runId = String(Date.now());

    const standardUser = await createAuthenticatedUser(baseUrl, runId, 'std');
    const adminUser = await createAuthenticatedUser(baseUrl, runId, 'admin');
    const ownerUser = await createAuthenticatedUser(baseUrl, runId, 'owner');
    await assignRoleToUser(app, adminUser.userId, adminRole.id);
    await assignRoleToUser(app, ownerUser.userId, ownerRole.id);
    await seedCompanies(app, runId);

    const unauthenticated = await requestJson(`${baseUrl}/api/admin/ops/health`);
    assertAuthFailure(unauthenticated.status, 'GET /api/admin/ops/health unauthenticated');

    const forbiddenForAuthenticated = await requestJson(`${baseUrl}/api/admin/ops/health`, {
      headers: authHeaders(standardUser.jwt),
    });
    assert.equal(
      forbiddenForAuthenticated.status,
      403,
      'Expected non-owner/admin authenticated user to be denied.'
    );

    const health = await requestJson(`${baseUrl}/api/admin/ops/health`, {
      headers: authHeaders(adminUser.jwt),
    });
    assert.equal(health.status, 200, 'Expected admin health endpoint access.');
    assert.ok(health.body?.data?.runtime?.nodeVersion, 'Expected health runtime nodeVersion.');

    const backups = await requestJson(`${baseUrl}/api/admin/ops/backups`, {
      headers: authHeaders(adminUser.jwt),
    });
    assert.equal(backups.status, 200, 'Expected admin backups endpoint access.');
    assert.ok(Array.isArray(backups.body?.data?.files), 'Expected backups file list.');

    const imports = await requestJson(`${baseUrl}/api/admin/ops/imports`, {
      headers: authHeaders(adminUser.jwt),
    });
    assert.equal(imports.status, 200, 'Expected admin imports endpoint access.');
    assert.ok(imports.body?.data?.totalCompanies >= 2, 'Expected imports snapshot company count.');
    assert.ok(imports.body?.data?.importedCompanies >= 1, 'Expected imported companies count.');

    const security = await requestJson(`${baseUrl}/api/admin/ops/security`, {
      headers: authHeaders(adminUser.jwt),
    });
    assert.equal(security.status, 200, 'Expected admin security endpoint access.');
    assert.ok(security.body?.data?.users?.total >= 2, 'Expected users total in security snapshot.');
    assert.ok(
      Array.isArray(security.body?.data?.uploads?.allowedMimeTypes),
      'Expected upload mime type list.'
    );

    const invalidCodexDispatch = await requestJson(`${baseUrl}/api/admin/ops/codex/dispatch`, {
      method: 'POST',
      headers: authHeaders(adminUser.jwt),
      body: JSON.stringify({
        task: 'Try an invalid scope.',
        scope: 'repository-root',
        baseBranch: 'main',
        draftPr: true,
      }),
    });
    assert.equal(invalidCodexDispatch.status, 400, 'Expected invalid codex scope to be rejected.');

    const codexDispatch = await requestJson(`${baseUrl}/api/admin/ops/codex/dispatch`, {
      method: 'POST',
      headers: authHeaders(adminUser.jwt),
      body: JSON.stringify({
        task: 'Fix the login empty state and add a focused test.',
        scope: 'openg7-org',
        baseBranch: 'main',
        draftPr: true,
        model: 'gpt-5.4',
        effort: 'medium',
      }),
    });
    assert.equal(codexDispatch.status, 200, 'Expected codex dispatch endpoint access.');
    assert.equal(codexDispatch.body?.data?.queued, true, 'Expected queued dispatch response.');
    assert.equal(workflowDispatchCalls.length, 1, 'Expected one GitHub workflow dispatch call.');

    const dispatchedPayload = JSON.parse(String(workflowDispatchCalls[0]?.init?.body ?? '{}'));
    assert.equal(dispatchedPayload.ref, 'main', 'Expected configured GitHub ref.');
    assert.equal(dispatchedPayload.inputs?.scope, 'openg7-org', 'Expected forwarded codex scope.');
    assert.equal(dispatchedPayload.inputs?.base_branch, 'main', 'Expected forwarded base branch.');
    assert.equal(dispatchedPayload.inputs?.draft_pr, 'true', 'Expected forwarded draft PR flag.');
    assert.equal(dispatchedPayload.inputs?.model, 'gpt-5.4', 'Expected forwarded model.');
    assert.equal(dispatchedPayload.inputs?.effort, 'medium', 'Expected forwarded effort.');

    const ownerHealth = await requestJson(`${baseUrl}/api/admin/ops/health`, {
      headers: authHeaders(ownerUser.jwt),
    });
    assert.equal(ownerHealth.status, 200, 'Expected owner health endpoint access.');
    assert.ok(ownerHealth.body?.data?.status, 'Expected owner health payload.');

    console.log('Admin ops integration tests passed.');
  } finally {
    global.fetch = originalFetch;
    await app.destroy();
    await cleanupDatabase();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
