/* eslint-disable no-console */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const TEST_DB_FILENAME = `db.feed.integration.${process.pid}.${Date.now()}.sqlite`;
const TEST_PASSWORD = 'S3cureFeed!123';
const FEED_AUTH_ACTIONS = [
  'api::feed.feed.index',
  'api::feed.feed.findOne',
  'api::feed.feed.create',
  'api::feed.feed.highlights',
  'api::feed.feed.stream',
];
const FEED_PUBLIC_ACTIONS = ['api::feed.feed.highlights'];
const LABOR_TAGS = new Set(['labor', 'workforce', 'talent', 'welding', 'staffing', 'crew', 'skills']);
const TRANSPORT_TAGS = new Set([
  'transport',
  'logistics',
  'rail',
  'shipping',
  'freight',
  'cold-chain',
  'port',
  'aviation',
]);

function applyTestEnvironment() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.STRAPI_ENV = process.env.STRAPI_ENV || 'test';
  process.env.STRAPI_SEED_AUTO = 'false';
  process.env.DATABASE_CLIENT = 'sqlite';
  process.env.DATABASE_FILENAME = TEST_DB_FILENAME;
  process.env.HOST = '127.0.0.1';
  process.env.PORT = '0';
  process.env.APP_KEYS = process.env.APP_KEYS || 'feed-test-app-key-a,feed-test-app-key-b';
  process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || 'feed-test-api-token-salt';
  process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'feed-test-admin-jwt-secret';
  process.env.TRANSFER_TOKEN_SALT =
    process.env.TRANSFER_TOKEN_SALT || 'feed-test-transfer-token-salt';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'feed-test-jwt-secret';
  process.env.ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY || 'feed-test-encryption-key-123456789';
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
  const role = await roleQuery.findOne({
    where: { type: roleType },
  });

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

  return role.id;
}

async function ensureFeedPermissions(strapi) {
  const authenticatedRoleId = await ensureRolePermissions(strapi, 'authenticated', FEED_AUTH_ACTIONS);
  await ensureRolePermissions(strapi, 'public', FEED_PUBLIC_ACTIONS);

  return authenticatedRoleId;
}

async function createAuthenticatedUser(baseUrl, runId) {
  const email = `feed.integration.${runId}@example.test`;

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
    email,
  };
}

function buildFeedPayload(runId, suffix, overrides = {}) {
  return {
    type: 'OFFER',
    title: `Feed Integration ${runId} ${suffix}`,
    summary: `Integration summary ${runId} ${suffix}`,
    sectorId: 'agri-food',
    fromProvinceId: 'qc',
    toProvinceId: 'on',
    mode: 'EXPORT',
    urgency: 2,
    credibility: 3,
    tags: ['integration', runId],
    quantity: {
      value: 42,
      unit: 'ton',
    },
    ...overrides,
  };
}

async function createFeedItem(baseUrl, jwt, payload, idempotencyKey) {
  const create = await requestJson(`${baseUrl}/api/feed`, {
    method: 'POST',
    headers: authHeaders(jwt, { 'Idempotency-Key': idempotencyKey }),
    body: JSON.stringify(payload),
  });

  assert.equal(create.status, 201, `Expected /api/feed POST to return 201 (${create.text})`);
  const item = create.body?.data;
  assert.ok(item?.id, 'Expected created feed item id.');
  return item;
}

async function seedFeedEntity(strapi, userId, runId, suffix, overrides = {}) {
  const created = await strapi.entityService.create('api::feed.feed', {
    data: {
      user: userId,
      type: 'OFFER',
      title: `Feed Seed ${runId} ${suffix}`,
      summary: `Seeded integration highlight ${runId} ${suffix}`,
      sectorId: 'energy',
      fromProvinceId: 'qc',
      toProvinceId: 'on',
      mode: 'EXPORT',
      quantityValue: 10,
      quantityUnit: 'ton',
      urgency: 2,
      credibility: 2,
      volumeScore: 10,
      tags: ['integration', runId],
      sourceKind: 'USER',
      sourceLabel: 'Integration Seeder',
      sourceUrl: null,
      status: 'confirmed',
      accessibilitySummary: null,
      geo: null,
      idempotencyKey: null,
      ...overrides,
    },
  });

  return created;
}

function lowerTags(item) {
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  return tags
    .filter((tag) => typeof tag === 'string')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

function hasAnyTag(item, acceptedTags) {
  const tags = lowerTags(item);
  return tags.some((tag) => acceptedTags.has(tag));
}

async function readSseEnvelope(response, timeoutMs) {
  if (!response.body) {
    throw new Error('SSE response did not provide a body stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const msLeft = Math.max(1, deadline - Date.now());
    const readResult = await Promise.race([
      reader.read(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timed out waiting for SSE event.')), msLeft);
      }),
    ]);

    if (!readResult || readResult.done) {
      throw new Error('SSE stream ended before receiving an event.');
    }

    buffer += decoder.decode(readResult.value, { stream: true });
    const normalized = buffer.replace(/\r\n/g, '\n');
    const blocks = normalized.split('\n\n');
    buffer = blocks.pop() ?? '';

    for (const block of blocks) {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const dataLines = lines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim());
      if (!dataLines.length) {
        continue;
      }

      const jsonPayload = dataLines.join('\n');
      try {
        const payload = JSON.parse(jsonPayload);
        if (payload && typeof payload === 'object') {
          return payload;
        }
      } catch {
        // Ignore malformed JSON and continue reading.
      }
    }
  }

  throw new Error('Timed out waiting for an SSE payload block.');
}

async function run() {
  applyTestEnvironment();
  await cleanupDatabase();

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    await ensureFeedPermissions(app);
    await app.server.listen();

    const address = app.server.httpServer.address();
    const port = typeof address === 'object' && address ? address.port : 1337;
    const baseUrl = `http://127.0.0.1:${port}`;
    const runId = String(Date.now());

    const session = await createAuthenticatedUser(baseUrl, runId);
    const jwt = session.jwt;

    const unauthorizedCreate = await requestJson(`${baseUrl}/api/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildFeedPayload(runId, 'UNAUTHORIZED')),
    });
    assertAuthFailure(unauthorizedCreate.status, 'POST /api/feed unauthenticated');
    const unauthorizedFindOne = await requestJson(`${baseUrl}/api/feed/1`, {
      method: 'GET',
    });
    assertAuthFailure(unauthorizedFindOne.status, 'GET /api/feed/:id unauthenticated');

    const unauthorizedStream = await fetch(`${baseUrl}/api/feed/stream`, {
      headers: { Accept: 'text/event-stream' },
    });
    assertAuthFailure(unauthorizedStream.status, 'GET /api/feed/stream unauthenticated');

    const offerA = await createFeedItem(
      baseUrl,
      jwt,
      buildFeedPayload(runId, 'ALPHA', {
        mode: 'EXPORT',
        fromProvinceId: 'qc',
        toProvinceId: 'on',
        connectionMatchId: 73,
      }),
      `feed-it-${runId}-alpha`
    );
    const offerB = await createFeedItem(
      baseUrl,
      jwt,
      buildFeedPayload(runId, 'BETA', { mode: 'IMPORT', fromProvinceId: 'de', toProvinceId: 'qc' }),
      `feed-it-${runId}-beta`
    );
    const offerC = await createFeedItem(
      baseUrl,
      jwt,
      buildFeedPayload(runId, 'GAMMA', { mode: 'BOTH', quantity: { value: 99, unit: 'kg' } }),
      `feed-it-${runId}-gamma`
    );
    const findOne = await requestJson(`${baseUrl}/api/feed/${encodeURIComponent(offerA.id)}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    assert.equal(findOne.status, 200, 'Expected /api/feed/:id read to succeed.');
    assert.equal(findOne.body?.data?.id, offerA.id, 'Expected /api/feed/:id payload to match the requested item.');
    assert.equal(offerA.connectionMatchId, 73, 'Expected feed create response to roundtrip connectionMatchId.');
    assert.equal(findOne.body?.data?.connectionMatchId, 73, 'Expected /api/feed/:id to include connectionMatchId.');

    const missing = await requestJson(`${baseUrl}/api/feed/999999999`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    assert.equal(missing.status, 404, 'Expected /api/feed/:id to return 404 for unknown ids.');

    await seedFeedEntity(app, session.userId, runId, 'H-GOV-LABOR', {
      type: 'OFFER',
      sourceKind: 'GOV',
      sourceLabel: 'Government Signal',
      tags: ['labor', 'crew', runId],
    });
    await seedFeedEntity(app, session.userId, runId, 'H-PARTNER-TRANSPORT', {
      type: 'REQUEST',
      sourceKind: 'PARTNER',
      sourceLabel: 'Partner Signal',
      mode: 'IMPORT',
      tags: ['transport', 'rail', runId],
    });
    await seedFeedEntity(app, session.userId, runId, 'H-COMPANY-TRANSPORT', {
      type: 'OFFER',
      sourceKind: 'COMPANY',
      sourceLabel: 'Company Signal',
      tags: ['transport', 'freight', runId],
    });
    await seedFeedEntity(app, session.userId, runId, 'H-USER-LABOR', {
      type: 'REQUEST',
      sourceKind: 'USER',
      sourceLabel: session.email,
      tags: ['welding', 'skills', runId],
    });
    await seedFeedEntity(app, session.userId, runId, 'H-FAILED', {
      type: 'OFFER',
      sourceKind: 'GOV',
      sourceLabel: 'Do Not Return',
      status: 'failed',
      tags: ['labor', runId],
    });

    const pageOne = await requestJson(
      `${baseUrl}/api/feed?type=OFFER&q=${encodeURIComponent(runId)}&limit=2`,
      { headers: { Authorization: `Bearer ${jwt}` } }
    );
    assert.equal(pageOne.status, 200, 'Expected page 1 read to succeed.');
    assert.equal(pageOne.body?.data?.length, 2, 'Expected two items in first page.');
    assert.ok(pageOne.body?.cursor, 'Expected cursor from first page.');

    const pageTwo = await requestJson(
      `${baseUrl}/api/feed?type=OFFER&q=${encodeURIComponent(runId)}&limit=2&cursor=${encodeURIComponent(pageOne.body.cursor)}`,
      { headers: { Authorization: `Bearer ${jwt}` } }
    );
    assert.equal(pageTwo.status, 200, 'Expected page 2 read to succeed.');
    assert.ok(Array.isArray(pageTwo.body?.data), 'Expected array payload on page 2.');
    assert.ok(pageTwo.body.data.length >= 1, 'Expected at least one item in second page.');

    const pageOneIds = new Set(pageOne.body.data.map((item) => item.id));
    for (const item of pageTwo.body.data) {
      assert.ok(!pageOneIds.has(item.id), 'Expected cursor pagination without duplicates.');
    }

    const modeFilter = await requestJson(
      `${baseUrl}/api/feed?type=OFFER&q=${encodeURIComponent(runId)}&mode=IMPORT&limit=5`,
      { headers: { Authorization: `Bearer ${jwt}` } }
    );
    assert.equal(modeFilter.status, 200, 'Expected mode filter read to succeed.');
    assert.equal(modeFilter.body?.data?.length, 1, 'Expected one IMPORT item for run marker.');
    assert.equal(modeFilter.body.data[0].id, offerB.id, 'Expected IMPORT filter to match offerB.');

    const templateOffer = await createFeedItem(
      baseUrl,
      jwt,
      buildFeedPayload(runId, 'FORM-ENERGY', {
        metadata: {
          publicationForm: {
            formKey: 'energy-surplus-offer',
            version: '1.0.0',
            title: 'Energy surplus offer',
          },
        },
      }),
      `feed-it-${runId}-form-energy`
    );
    await createFeedItem(
      baseUrl,
      jwt,
      buildFeedPayload(runId, 'FORM-COLD', {
        metadata: {
          publicationForm: {
            formKey: 'cold-chain-capacity-offer',
            version: '1.0.0',
            title: 'Cold chain capacity offer',
          },
        },
      }),
      `feed-it-${runId}-form-cold`
    );

    const formKeyFilter = await requestJson(
      `${baseUrl}/api/feed?type=OFFER&q=${encodeURIComponent(runId)}&formKey=energy-surplus-offer&limit=10`,
      { headers: { Authorization: `Bearer ${jwt}` } }
    );
    assert.equal(formKeyFilter.status, 200, 'Expected formKey filter read to succeed.');
    assert.ok(Array.isArray(formKeyFilter.body?.data), 'Expected formKey filter payload list.');
    assert.ok(formKeyFilter.body.data.length >= 1, 'Expected at least one formKey-filtered item.');
    assert.ok(
      formKeyFilter.body.data.some((item) => item.id === templateOffer.id),
      'Expected formKey filter to include the matching template publication.'
    );
    for (const item of formKeyFilter.body.data) {
      assert.equal(
        item.metadata?.publicationForm?.formKey,
        'energy-surplus-offer',
        'Expected formKey filter to only return matching template publications.'
      );
    }

    const highlightsPublic = await requestJson(
      `${baseUrl}/api/feed/highlights?scope=canada&filter=all&q=${encodeURIComponent(runId)}&limit=6`
    );
    assert.equal(highlightsPublic.status, 200, 'Expected public highlights read to succeed.');
    assert.ok(Array.isArray(highlightsPublic.body?.data), 'Expected highlights payload list.');
    assert.equal(highlightsPublic.body?.meta?.scope, 'canada', 'Expected highlights meta scope.');
    assert.equal(highlightsPublic.body?.meta?.filter, 'all', 'Expected highlights meta filter.');
    assert.equal(highlightsPublic.body?.meta?.search, runId, 'Expected highlights meta search.');
    assert.equal(highlightsPublic.body?.meta?.limit, 6, 'Expected highlights meta limit.');
    assert.ok(highlightsPublic.body.data.length <= 6, 'Expected highlights limit to be enforced.');
    assert.match(
      highlightsPublic.response.headers.get('cache-control') || '',
      /max-age=30/i,
      'Expected short-lived cache header on highlights response.'
    );

    const highlightsG7 = await requestJson(
      `${baseUrl}/api/feed/highlights?scope=g7&filter=all&q=${encodeURIComponent(runId)}&limit=20`
    );
    assert.equal(highlightsG7.status, 200, 'Expected g7 highlights read to succeed.');
    assert.ok(highlightsG7.body.data.length >= 1, 'Expected at least one g7 highlight.');
    for (const item of highlightsG7.body.data) {
      assert.ok(
        item.source?.kind === 'GOV' || item.source?.kind === 'PARTNER',
        'Expected g7 scope to only return GOV/PARTNER items.'
      );
    }

    const highlightsWorld = await requestJson(
      `${baseUrl}/api/feed/highlights?scope=world&filter=all&q=${encodeURIComponent(runId)}&limit=20`
    );
    assert.equal(highlightsWorld.status, 200, 'Expected world highlights read to succeed.');
    for (const item of highlightsWorld.body.data) {
      assert.notEqual(item.source?.kind, 'GOV', 'Expected world scope to exclude GOV items.');
    }

    const highlightsOffer = await requestJson(
      `${baseUrl}/api/feed/highlights?scope=canada&filter=offer&q=${encodeURIComponent(runId)}&limit=20`
    );
    assert.equal(highlightsOffer.status, 200, 'Expected offer filter read to succeed.');
    for (const item of highlightsOffer.body.data) {
      assert.equal(item.type, 'OFFER', 'Expected offer filter to return OFFER items only.');
    }

    const highlightsRequest = await requestJson(
      `${baseUrl}/api/feed/highlights?scope=canada&filter=request&q=${encodeURIComponent(runId)}&limit=20`
    );
    assert.equal(highlightsRequest.status, 200, 'Expected request filter read to succeed.');
    for (const item of highlightsRequest.body.data) {
      assert.equal(item.type, 'REQUEST', 'Expected request filter to return REQUEST items only.');
    }

    const highlightsLabor = await requestJson(
      `${baseUrl}/api/feed/highlights?scope=canada&filter=labor&q=${encodeURIComponent(runId)}&limit=20`
    );
    assert.equal(highlightsLabor.status, 200, 'Expected labor filter read to succeed.');
    for (const item of highlightsLabor.body.data) {
      assert.ok(hasAnyTag(item, LABOR_TAGS), 'Expected labor filter to match labor/workforce tags.');
    }

    const highlightsTransport = await requestJson(
      `${baseUrl}/api/feed/highlights?scope=canada&filter=transport&q=${encodeURIComponent(runId)}&limit=20`
    );
    assert.equal(highlightsTransport.status, 200, 'Expected transport filter read to succeed.');
    for (const item of highlightsTransport.body.data) {
      assert.ok(
        hasAnyTag(item, TRANSPORT_TAGS),
        'Expected transport filter to match transport/logistics tags.'
      );
    }

    const highlightsTagAndType = await requestJson(
      `${baseUrl}/api/feed/highlights?scope=canada&filter=all&type=REQUEST&tag=transport&q=${encodeURIComponent(runId)}&limit=20`
    );
    assert.equal(highlightsTagAndType.status, 200, 'Expected typed/tagged highlights read to succeed.');
    assert.ok(highlightsTagAndType.body.data.length >= 1, 'Expected at least one typed/tagged result.');
    for (const item of highlightsTagAndType.body.data) {
      assert.equal(item.type, 'REQUEST', 'Expected explicit type filter to be applied.');
      assert.ok(lowerTags(item).includes('transport'), 'Expected explicit tag filter to be applied.');
    }

    const stableQuery = `${baseUrl}/api/feed/highlights?scope=canada&filter=all&q=${encodeURIComponent(runId)}&limit=3`;
    const highlightsStableA = await requestJson(stableQuery);
    const highlightsStableB = await requestJson(stableQuery);
    assert.equal(highlightsStableA.status, 200, 'Expected stable query first read to succeed.');
    assert.equal(highlightsStableB.status, 200, 'Expected stable query second read to succeed.');
    const stableIdsA = highlightsStableA.body.data.map((item) => item.id);
    const stableIdsB = highlightsStableB.body.data.map((item) => item.id);
    assert.ok(stableIdsA.length <= 3, 'Expected stable highlights query to enforce limit.');
    assert.deepEqual(stableIdsA, stableIdsB, 'Expected stable highlights ordering for identical queries.');

    const streamAbort = new AbortController();
    const streamResponse = await fetch(`${baseUrl}/api/feed/stream`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'text/event-stream',
      },
      signal: streamAbort.signal,
    });
    assert.equal(streamResponse.status, 200, 'Expected authenticated stream to open.');
    assert.match(
      streamResponse.headers.get('content-type') || '',
      /^text\/event-stream/i,
      'Expected SSE content type.'
    );

    const streamedItem = await createFeedItem(
      baseUrl,
      jwt,
      buildFeedPayload(runId, 'DELTA-SSE', { summary: `SSE payload marker ${runId}` }),
      `feed-it-${runId}-delta-sse`
    );

    const envelope = await readSseEnvelope(streamResponse, 15000);
    assert.equal(envelope.type, 'feed.item.created', 'Expected feed.item.created SSE event.');
    assert.equal(envelope.payload?.id, streamedItem.id, 'Expected SSE payload to match created item.');
    assert.ok(envelope.eventId, 'Expected SSE envelope eventId.');

    streamAbort.abort();

    assert.ok(offerA.id && offerC.id, 'Smoke check created feed items.');
    console.log('Feed integration tests passed.');
  } finally {
    await app.destroy();
    await cleanupDatabase();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
