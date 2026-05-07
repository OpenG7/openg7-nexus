/* eslint-disable no-console */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const TEST_DB_FILENAME = `db.admin-quality-matrix.integration.${process.pid}.${Date.now()}.sqlite`;
const MATRIX_ENTRY_UID = 'api::admin-quality-matrix.admin-quality-matrix-entry';
const TEST_PASSWORD = 'S3cureAdminQuality!123';
const MATRIX_ACTIONS = [
  'api::admin-quality-matrix.admin-quality-matrix.snapshot',
  'api::admin-quality-matrix.admin-quality-matrix.recalculate',
  'api::admin-quality-matrix.admin-quality-matrix.applyProposal',
];
const MISSION_DECISION_UID =
  'api::admin-quality-mission-decision.admin-quality-mission-decision';

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

async function createAuthenticatedUser(baseUrl, suffix) {
  const email = `admin.quality.matrix.${Date.now()}.${suffix}@example.test`;
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

async function createMatrixEntry(strapi, entryId) {
  return strapi.entityService.create(MATRIX_ENTRY_UID, {
    data: {
      entryId,
      domain: 'Trust et validation',
      need: 'Historiser les decisions de confiance.',
      summaryStatus: 'partiel',
      businessStatus: 'partiel',
      implementationStatus: 'partiel',
      e2eStatus: 'partiel',
      priority: 'moyenne',
      managementBucket: 'proof-gap',
      needsProductWorkFirst: false,
      observedGap: 'Une validation complementaire reste attendue.',
      nextMove: 'Rejouer la revue apres retour de mission.',
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

async function createMissionDecision(strapi, entryId) {
  return strapi.entityService.create(MISSION_DECISION_UID, {
    data: {
      recommendationId: `recalc-${entryId}`,
      entryId,
      kind: 'core',
      status: 'done',
      title: 'Decision completee',
      message: 'La mission a ramene une preuve exploitable.',
      operatorPrompt: 'Verifier la promotion implementation/e2e.',
      metadata: {
        source: 'integration-test',
      },
      decidedByUserId: '1',
    },
  });
}

async function createSignalGuidanceDecision(strapi, entryId, signalId, metadataOverrides = {}) {
  return strapi.entityService.create(MISSION_DECISION_UID, {
    data: {
      recommendationId: `${entryId}::signal-guidance::${signalId}`,
      entryId,
      kind: 'governance',
      status: 'approved',
      title: 'Signal guidance validated',
      message: 'Codex dispatch queued and waiting for implementation confirmation.',
      operatorPrompt: 'Wait for merge or proof-returned before reopening dispatch.',
      metadata: {
        traceType: 'signal-guidance',
        signalId,
        workflow: 'codex-pr.yml',
        ref: 'main',
        ...metadataOverrides,
      },
      decidedByUserId: '1',
    },
  });
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
    const ownerRole = await ensureRoleWithPermissions(app, 'owner', 'Owner', MATRIX_ACTIONS);
    const standardUser = await createAuthenticatedUser(baseUrl, 'standard');
    const ownerUser = await createAuthenticatedUser(baseUrl, 'owner');
    await assignRoleToUser(app, ownerUser.userId, ownerRole.id);

    const snapshotDenied = await requestJson(`${baseUrl}/api/admin/quality/matrix`, {
      headers: authHeaders({ Authorization: `Bearer ${standardUser.jwt}` }),
    });
    assert.equal(snapshotDenied.status, 403, 'Expected standard authenticated user to be denied.');

    const snapshotAllowed = await requestJson(`${baseUrl}/api/admin/quality/matrix`, {
      headers: authHeaders({ Authorization: `Bearer ${ownerUser.jwt}` }),
    });
    assert.equal(snapshotAllowed.status, 200, 'Expected owner user to access matrix snapshot.');
    assert.equal(snapshotAllowed.body?.data?.entries?.length, 1, 'Expected matrix snapshot payload.');
    assert.deepEqual(
      snapshotAllowed.body?.data?.entries?.[0]?.signalDispatch ?? {},
      {},
      'Expected no signal dispatch lock before any guidance is recorded.',
    );

    const repoMergedAt = new Date(Date.now() + 30_000).toISOString();
    const exactPullRequestMergedAt = new Date(Date.now() + 60_000).toISOString();
    await createSignalGuidanceDecision(app, 'trust-validation', 'business');
    const signalGuidanceDecision = await createSignalGuidanceDecision(app, 'trust-validation', 'e2e', {
      proofPullRequestNumber: 321,
      proofBranch: 'codex/qa-proof-501',
    });

    const snapshotWithPendingGuidance = await requestJson(`${baseUrl}/api/admin/quality/matrix`, {
      headers: authHeaders({ Authorization: `Bearer ${ownerUser.jwt}` }),
    });
    assert.equal(
      snapshotWithPendingGuidance.body?.data?.entries?.[0]?.signalDispatch?.e2e?.pending,
      true,
      'Expected the e2e signal to remain pending before any merge or proof-returned confirmation.',
    );

    const recalcDenied = await requestJson(`${baseUrl}/api/admin/quality/matrix/recalculate`, {
      method: 'POST',
      headers: authHeaders({ Authorization: `Bearer ${standardUser.jwt}` }),
      body: JSON.stringify({ scope: 'refresh-required' }),
    });
    assert.equal(recalcDenied.status, 403, 'Expected standard authenticated user to be denied recalculation.');

    const unauthorized = await requestJson(`${baseUrl}/api/admin/quality/matrix/ingest`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        mergedAt: repoMergedAt,
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
        mergedAt: repoMergedAt,
        impactedEntryIds: ['trust-validation'],
      }),
    });
    assert.equal(invalidPayload.status, 400, 'Expected ingest payload without commitSha to fail.');

    const ok = await requestJson(`${baseUrl}/api/admin/quality/matrix/ingest`, {
      method: 'POST',
      headers: authHeaders({ Authorization: 'Bearer matrix-ingest-test-token' }),
      body: JSON.stringify({
        mergedAt: repoMergedAt,
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
    assert.equal(updated.lastRepoSignalAt, repoMergedAt);
    assert.match(updated.lastRepoSignalSummary, /targeted sync after merge to main/i);

    const snapshotAfterRepoIngest = await requestJson(`${baseUrl}/api/admin/quality/matrix`, {
      headers: authHeaders({ Authorization: `Bearer ${ownerUser.jwt}` }),
    });
    assert.equal(
      snapshotAfterRepoIngest.body?.data?.entries?.[0]?.signalDispatch?.e2e?.pending,
      true,
      'Expected generic repo ingest to stay pending when the signal is already bound to an exact pull request.',
    );
    assert.equal(
      snapshotAfterRepoIngest.body?.data?.entries?.[0]?.signalDispatch?.e2e?.confirmationSource,
      null,
    );

    await app.entityService.update(MISSION_DECISION_UID, signalGuidanceDecision.id, {
      data: {
        metadata: {
          ...signalGuidanceDecision.metadata,
          proofPullRequestNumber: 321,
          proofBranch: 'codex/qa-proof-501',
          proofPullRequestMergedAt: exactPullRequestMergedAt,
        },
      },
    });

    const snapshotAfterExactPullRequestMerge = await requestJson(`${baseUrl}/api/admin/quality/matrix`, {
      headers: authHeaders({ Authorization: `Bearer ${ownerUser.jwt}` }),
    });
    assert.equal(
      snapshotAfterExactPullRequestMerge.body?.data?.entries?.[0]?.signalDispatch?.e2e?.pending,
      false,
      'Expected the saved exact pull request merge to confirm the e2e signal server-side.',
    );
    assert.equal(
      snapshotAfterExactPullRequestMerge.body?.data?.entries?.[0]?.signalDispatch?.e2e?.confirmationSource,
      'pull-request-merged',
    );

    await createMissionDecision(app, 'trust-validation');

    const recalcOk = await requestJson(`${baseUrl}/api/admin/quality/matrix/recalculate`, {
      method: 'POST',
      headers: authHeaders({ Authorization: `Bearer ${ownerUser.jwt}` }),
      body: JSON.stringify({ scope: 'refresh-required' }),
    });
    assert.equal(recalcOk.status, 200, 'Expected recalculation request to succeed for owner.');
    assert.equal(recalcOk.body?.data?.summary?.analyzedCount, 1);
    assert.equal(recalcOk.body?.data?.summary?.proposalCount, 1);
    assert.equal(recalcOk.body?.data?.entries?.[0]?.entryId, 'trust-validation');
    assert.equal(recalcOk.body?.data?.entries?.[0]?.result, 'proposal-review-required');
    assert.equal(recalcOk.body?.data?.entries?.[0]?.proposed?.summaryStatus, 'oui');
    assert.equal(recalcOk.body?.data?.entries?.[0]?.proposed?.businessStatus, 'oui');
    assert.equal(recalcOk.body?.data?.entries?.[0]?.proposed?.implementationStatus, 'oui');
    assert.equal(recalcOk.body?.data?.entries?.[0]?.proposed?.e2eStatus, 'oui');

    const applyDenied = await requestJson(`${baseUrl}/api/admin/quality/matrix/apply-proposal`, {
      method: 'POST',
      headers: authHeaders({ Authorization: `Bearer ${standardUser.jwt}` }),
      body: JSON.stringify({ entryId: 'trust-validation' }),
    });
    assert.equal(applyDenied.status, 403, 'Expected standard authenticated user to be denied proposal application.');

    const applyOk = await requestJson(`${baseUrl}/api/admin/quality/matrix/apply-proposal`, {
      method: 'POST',
      headers: authHeaders({ Authorization: `Bearer ${ownerUser.jwt}` }),
      body: JSON.stringify({ entryId: 'trust-validation' }),
    });
    assert.equal(applyOk.status, 200, 'Expected proposal application to succeed for owner.');
    assert.equal(applyOk.body?.data?.entry?.summaryStatus, 'oui');
    assert.equal(applyOk.body?.data?.entry?.businessStatus, 'oui');
    assert.equal(applyOk.body?.data?.entry?.implementationStatus, 'oui');
    assert.equal(applyOk.body?.data?.entry?.e2eStatus, 'oui');
    assert.equal(applyOk.body?.data?.entry?.managementBucket, 'covered');

    const applied = await findMatrixEntryByEntryId(app, 'trust-validation');
    assert.equal(applied.summaryStatus, 'oui');
    assert.equal(applied.businessStatus, 'oui');
    assert.equal(applied.implementationStatus, 'oui');
    assert.equal(applied.e2eStatus, 'oui');
    assert.equal(applied.managementBucket, 'covered');
    assert.equal(applied.reviewedAt, new Date().toISOString().slice(0, 10));

    const recalcAfterApply = await requestJson(`${baseUrl}/api/admin/quality/matrix/recalculate`, {
      method: 'POST',
      headers: authHeaders({ Authorization: `Bearer ${ownerUser.jwt}` }),
      body: JSON.stringify({ scope: 'refresh-required' }),
    });
    assert.equal(recalcAfterApply.status, 200, 'Expected recalculation after apply to succeed.');
    assert.equal(recalcAfterApply.body?.data?.summary?.proposalCount, 0);

    console.log('Admin quality matrix snapshot, ingest, and recalculation integration test passed.');
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