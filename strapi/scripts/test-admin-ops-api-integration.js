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
  'api::admin-ops.admin-ops.proofs',
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
  process.env.OPS_AI_GITHUB_TOKEN = 'ghs_admin_ops_test_token';
  process.env.OPS_AI_GITHUB_OWNER = 'OpenG7';
  process.env.OPS_AI_GITHUB_REPO = 'openg7-platform';
  process.env.OPS_AI_GITHUB_API_URL = 'https://api.github.test';
  process.env.OPS_AI_ALLOWED_SCOPES = 'openg7-org,strapi';
  process.env.OPS_AI_ALLOWED_BASE_BRANCHES = 'main,develop';
  process.env.OPS_AI_COPILOT_DISPATCH_ENABLED = 'true';
  process.env.OPS_AI_COPILOT_GITHUB_WORKFLOW = 'copilot-pr.yml';
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
    const parsedUrl = new URL(url);
    if (url === 'https://api.github.test/repos/OpenG7/openg7-platform/actions/secrets?per_page=100') {
      return new Response(
        JSON.stringify({
          total_count: 2,
          secrets: [{ name: 'OPENAI_API_KEY' }, { name: 'ANTHROPIC_API_KEY' }],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    if (parsedUrl.pathname.endsWith('/actions/workflows/codex-pr.yml/runs')) {
      return new Response(
        JSON.stringify({
          total_count: 1,
          workflow_runs: [
            {
              id: 501,
              run_number: 51,
              html_url: 'https://github.com/OpenG7/openg7-platform/actions/runs/501',
              status: 'completed',
              conclusion: 'success',
              head_branch: 'codex/qa-proof-501',
              created_at: '2026-04-30T00:00:00.000Z',
              updated_at: '2026-04-30T00:08:00.000Z',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    if (parsedUrl.pathname.endsWith('/actions/workflows/claude-pr.yml/runs')) {
      return new Response(
        JSON.stringify({
          total_count: 1,
          workflow_runs: [
            {
              id: 601,
              run_number: 18,
              html_url: 'https://github.com/OpenG7/openg7-platform/actions/runs/601',
              status: 'in_progress',
              conclusion: null,
              head_branch: 'claude/qa-proof-601',
              created_at: '2026-04-30T00:10:00.000Z',
              updated_at: '2026-04-30T00:11:00.000Z',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    if (parsedUrl.pathname.endsWith('/actions/workflows/gemini-pr.yml/runs')) {
      return new Response(
        JSON.stringify({ total_count: 0, workflow_runs: [] }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    if (parsedUrl.pathname.endsWith('/actions/workflows/copilot-pr.yml/runs')) {
      return new Response(
        JSON.stringify({
          total_count: 1,
          workflow_runs: [
            {
              id: 701,
              run_number: 7,
              html_url: 'https://github.com/OpenG7/openg7-platform/actions/runs/701',
              status: 'completed',
              conclusion: 'failure',
              head_branch: 'copilot/placeholder-701',
              created_at: '2026-04-30T00:12:00.000Z',
              updated_at: '2026-04-30T00:13:00.000Z',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    if (parsedUrl.pathname.endsWith('/actions/runs/501/artifacts')) {
      return new Response(
        JSON.stringify({
          total_count: 2,
          artifacts: [
            {
              id: 9001,
              name: 'playwright-report',
              size_in_bytes: 2048,
              expired: false,
            },
            {
              id: 9002,
              name: 'logs',
              size_in_bytes: 1024,
              expired: false,
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    if (parsedUrl.pathname.endsWith('/actions/runs/601/artifacts')) {
      return new Response(
        JSON.stringify({
          total_count: 1,
          artifacts: [
            {
              id: 9003,
              name: 'draft-proof',
              size_in_bytes: 512,
              expired: false,
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    if (parsedUrl.pathname.endsWith('/actions/runs/701/artifacts')) {
      return new Response(
        JSON.stringify({ total_count: 0, artifacts: [] }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    if (parsedUrl.pathname.endsWith('/pulls')) {
      const head = parsedUrl.searchParams.get('head');
      if (head === 'OpenG7:codex/qa-proof-501') {
        return new Response(
          JSON.stringify([
            {
              number: 321,
              title: 'Codex QA proof package',
              html_url: 'https://github.com/OpenG7/openg7-platform/pull/321',
              state: 'open',
              merged_at: null,
            },
          ]),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      if (head === 'OpenG7:claude/qa-proof-601') {
        return new Response(
          JSON.stringify([
            {
              number: 322,
              title: 'Claude draft improvements',
              html_url: 'https://github.com/OpenG7/openg7-platform/pull/322',
              state: 'open',
              merged_at: null,
            },
          ]),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (
      url ===
        'https://api.github.test/repos/OpenG7/openg7-platform/actions/workflows/codex-pr.yml/dispatches' ||
      url ===
        'https://api.github.test/repos/OpenG7/openg7-platform/actions/workflows/copilot-pr.yml/dispatches'
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
    assert.ok(Array.isArray(security.body?.data?.aiKeys), 'Expected ignition console modules.');
    assert.equal(
      security.body?.data?.aiKeys?.find((entry) => entry.provider === 'codex')?.state,
      'ready',
      'Expected Codex bay to be lit when OPENAI_API_KEY is present.',
    );
    assert.equal(
      security.body?.data?.aiKeys?.find((entry) => entry.provider === 'claude')?.state,
      'ready',
      'Expected Claude bay to be lit when ANTHROPIC_API_KEY is present.',
    );
    assert.equal(
      security.body?.data?.aiKeys?.find((entry) => entry.provider === 'gemini')?.state,
      'offline',
      'Expected Gemini bay to stay dark while GEMINI_API_KEY is missing.',
    );
    assert.equal(
      security.body?.data?.aiKeys?.find((entry) => entry.provider === 'copilot')?.state,
      'unsupported',
      'Expected Copilot bay to stay inactive until a stable key socket exists.',
    );

    const proofs = await requestJson(`${baseUrl}/api/admin/ops/ai/proofs`, {
      headers: authHeaders(adminUser.jwt),
    });
    assert.equal(proofs.status, 200, 'Expected admin proofs endpoint access.');
    assert.ok(Array.isArray(proofs.body?.data?.providers), 'Expected AI proof provider list.');
    assert.equal(
      proofs.body?.data?.providers?.find((entry) => entry.provider === 'codex')?.state,
      'completed',
      'Expected Codex latest proof package to be completed.',
    );
    assert.equal(
      proofs.body?.data?.providers?.find((entry) => entry.provider === 'codex')?.artifacts?.length,
      2,
      'Expected Codex proof package artifacts to be exposed.',
    );
    assert.equal(
      proofs.body?.data?.providers?.find((entry) => entry.provider === 'codex')?.pullRequest?.number,
      321,
      'Expected Codex latest proof package to surface its PR.',
    );
    assert.equal(
      proofs.body?.data?.providers?.find((entry) => entry.provider === 'claude')?.state,
      'in-progress',
      'Expected Claude proof package to surface the in-progress run.',
    );
    assert.equal(
      proofs.body?.data?.providers?.find((entry) => entry.provider === 'copilot')?.state,
      'failed',
      'Expected Copilot placeholder run to surface as failed evidence.',
    );
    assert.equal(
      proofs.body?.data?.providers?.find((entry) => entry.provider === 'gemini')?.state,
      'unavailable',
      'Expected Gemini to show no proof package when no workflow run exists.',
    );

    const invalidCodexDispatch = await requestJson(`${baseUrl}/api/admin/ops/ai/dispatch`, {
      method: 'POST',
      headers: authHeaders(adminUser.jwt),
      body: JSON.stringify({
        provider: 'copilot',
        task: 'Try an invalid scope.',
        scope: 'repository-root',
        baseBranch: 'main',
        draftPr: true,
      }),
    });
    assert.equal(invalidCodexDispatch.status, 400, 'Expected invalid codex scope to be rejected.');

    const copilotDispatch = await requestJson(`${baseUrl}/api/admin/ops/ai/dispatch`, {
      method: 'POST',
      headers: authHeaders(adminUser.jwt),
      body: JSON.stringify({
        provider: 'copilot',
        task: 'Fix the login empty state and add a focused test.',
        scope: 'openg7-org',
        baseBranch: 'main',
        draftPr: true,
        model: 'gpt-5.4',
        effort: 'medium',
      }),
    });
    assert.equal(copilotDispatch.status, 200, 'Expected provider dispatch endpoint access.');
    assert.equal(copilotDispatch.body?.data?.queued, true, 'Expected queued dispatch response.');
    assert.equal(copilotDispatch.body?.data?.selectedProvider, 'copilot', 'Expected provider echo.');
    assert.equal(workflowDispatchCalls.length, 1, 'Expected one GitHub workflow dispatch call.');

    const dispatchedPayload = JSON.parse(String(workflowDispatchCalls[0]?.init?.body ?? '{}'));
    assert.equal(dispatchedPayload.ref, 'main', 'Expected configured GitHub ref.');
    assert.equal(dispatchedPayload.inputs?.provider, 'copilot', 'Expected forwarded provider.');
    assert.equal(dispatchedPayload.inputs?.scope, 'openg7-org', 'Expected forwarded codex scope.');
    assert.equal(dispatchedPayload.inputs?.base_branch, 'main', 'Expected forwarded base branch.');
    assert.equal(dispatchedPayload.inputs?.draft_pr, 'true', 'Expected forwarded draft PR flag.');
    assert.equal(dispatchedPayload.inputs?.model, 'gpt-5.4', 'Expected forwarded model.');
    assert.equal(dispatchedPayload.inputs?.effort, 'medium', 'Expected forwarded effort.');
    assert.equal(
      workflowDispatchCalls[0]?.url,
      'https://api.github.test/repos/OpenG7/openg7-platform/actions/workflows/copilot-pr.yml/dispatches',
      'Expected the copilot workflow to be selected.',
    );

    const legacyCodexDispatch = await requestJson(`${baseUrl}/api/admin/ops/codex/dispatch`, {
      method: 'POST',
      headers: authHeaders(adminUser.jwt),
      body: JSON.stringify({
        task: 'Run the legacy Codex dispatch alias.',
        scope: 'openg7-org',
        baseBranch: 'main',
        draftPr: true,
      }),
    });
    assert.equal(legacyCodexDispatch.status, 200, 'Expected legacy codex alias to keep working.');
    assert.equal(workflowDispatchCalls.length, 2, 'Expected legacy alias dispatch to trigger a second call.');

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
