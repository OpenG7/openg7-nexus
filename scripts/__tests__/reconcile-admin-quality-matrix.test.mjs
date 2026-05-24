import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
  buildProposals,
  hashId,
  proposalId,
  slugify,
} from '../reconcile-admin-quality-matrix.mjs';

const FIXTURE_DIR = path.join(import.meta.dirname, 'fixtures');

function loadFixture(name) {
  return JSON.parse(readFileSync(path.join(FIXTURE_DIR, name), 'utf8'));
}

// ─── slugify ────────────────────────────────────────────────────────────────

test('slugify — lowercases and strips accents', () => {
  assert.equal(slugify('Évaluation Qualité'), 'evaluation-qualite');
});

test('slugify — collapses non-alphanumeric to single dash', () => {
  assert.equal(slugify('foo  /  bar'), 'foo-bar');
});

test('slugify — trims leading and trailing dashes', () => {
  assert.equal(slugify('---hello---'), 'hello');
});

test('slugify — truncates at 72 chars', () => {
  const long = 'a'.repeat(100);
  assert.equal(slugify(long).length, 72);
});

test('slugify — returns fallback for empty string', () => {
  assert.equal(slugify(''), 'unmapped-source');
  assert.equal(slugify('---'), 'unmapped-source');
});

test('slugify — handles non-string input via String()', () => {
  assert.equal(slugify(42), '42');
});

// ─── hashId ─────────────────────────────────────────────────────────────────

test('hashId — returns 16-char hex string', () => {
  const result = hashId(['type', 'entry', 'value']);
  assert.equal(typeof result, 'string');
  assert.equal(result.length, 16);
  assert.match(result, /^[0-9a-f]{16}$/);
});

test('hashId — is deterministic', () => {
  const a = hashId(['a', 'b', 'c']);
  const b = hashId(['a', 'b', 'c']);
  assert.equal(a, b);
});

test('hashId — differs when parts differ', () => {
  assert.notEqual(hashId(['a', 'b']), hashId(['a', 'c']));
  assert.notEqual(hashId(['a', 'b']), hashId(['b', 'a']));
});

test('hashId — empty parts list produces consistent result', () => {
  const a = hashId([]);
  const b = hashId([]);
  assert.equal(a, b);
  assert.equal(a.length, 16);
});

// ─── proposalId ─────────────────────────────────────────────────────────────

test('proposalId — format is type::entryId::hash', () => {
  const id = proposalId('add-source-ref', 'my-entry', { type: 'e2e', path: 'e2e/spec.ts' });
  assert.match(id, /^add-source-ref::my-entry::[0-9a-f]{16}$/);
});

test('proposalId — uses "candidate" when entryId is null', () => {
  const id = proposalId('create-entry', null, { type: 'selector', value: 'data-og7=foo' });
  assert.ok(id.startsWith('create-entry::candidate::'));
});

test('proposalId — is deterministic for same inputs', () => {
  const ref = { type: 'e2e', path: 'e2e/alpha.spec.ts', value: 'alpha' };
  assert.equal(
    proposalId('add-source-ref', 'entry-alpha', ref),
    proposalId('add-source-ref', 'entry-alpha', ref),
  );
});

test('proposalId — differs for different source refs', () => {
  const a = proposalId('add-source-ref', 'entry-x', { type: 'e2e', value: 'foo' });
  const b = proposalId('add-source-ref', 'entry-x', { type: 'e2e', value: 'bar' });
  assert.notEqual(a, b);
});

test('proposalId — handles null sourceRef gracefully', () => {
  const id = proposalId('mark-stale', 'entry-x', null);
  assert.match(id, /^mark-stale::entry-x::[0-9a-f]{16}$/);
});

// ─── buildProposals ─────────────────────────────────────────────────────────

const GENERATED_AT = '2025-01-01T00:00:00.000Z';

test('buildProposals — produces add-source-ref proposals from discovery.proposals', () => {
  const discovery = loadFixture('discovery-snapshot.json');
  const proposals = buildProposals(discovery, GENERATED_AT, { maxCreateProposals: 20 });

  const addSourceRefs = proposals.filter((p) => p.type === 'add-source-ref');
  assert.equal(addSourceRefs.length, discovery.proposals.length);
  for (const p of addSourceRefs) {
    assert.equal(p.status, 'proposed');
    assert.ok(typeof p.proposalId === 'string');
    assert.ok(p.payload?.sourceRef);
  }
});

test('buildProposals — produces mark-stale for entries with no discovered source', () => {
  const discovery = loadFixture('discovery-snapshot.json');
  const proposals = buildProposals(discovery, GENERATED_AT, { maxCreateProposals: 20 });

  const stale = proposals.filter((p) => p.type === 'mark-stale');
  const expectedStaleEntries = discovery.entries.filter(
    (e) => e.discoveredSourceRefCount === 0,
  );
  assert.equal(stale.length, expectedStaleEntries.length);
  for (const p of stale) {
    assert.equal(p.confidence, 'medium');
    assert.ok(p.payload?.currentNeed);
    assert.ok(p.payload?.suggestedAction);
  }
});

test('buildProposals — produces create-entry proposals from unmappedSources', () => {
  const discovery = loadFixture('discovery-snapshot.json');
  const proposals = buildProposals(discovery, GENERATED_AT, { maxCreateProposals: 20 });

  const createEntries = proposals.filter((p) => p.type === 'create-entry');
  assert.equal(createEntries.length, discovery.unmappedSources.length);
  for (const p of createEntries) {
    assert.ok(p.payload?.candidateEntry?.id);
    assert.ok(p.payload?.candidateEntry?.need);
  }
});

test('buildProposals — respects maxCreateProposals limit', () => {
  const discovery = loadFixture('discovery-snapshot.json');
  const proposals = buildProposals(discovery, GENERATED_AT, { maxCreateProposals: 0 });

  const createEntries = proposals.filter((p) => p.type === 'create-entry');
  assert.equal(createEntries.length, 0);
});

test('buildProposals — strapi-api unmapped source gets medium confidence', () => {
  const discovery = loadFixture('discovery-snapshot.json');
  const proposals = buildProposals(discovery, GENERATED_AT, { maxCreateProposals: 20 });

  const fromStrapiApi = proposals.find(
    (p) => p.type === 'create-entry' && p.entryId.includes('gamma'),
  );
  assert.ok(fromStrapiApi, 'should produce a create-entry for the strapi-api unmapped source');
  assert.equal(fromStrapiApi.confidence, 'medium');
});

test('buildProposals — all proposal IDs are unique', () => {
  const discovery = loadFixture('discovery-snapshot.json');
  const proposals = buildProposals(discovery, GENERATED_AT, { maxCreateProposals: 20 });

  const ids = proposals.map((p) => p.proposalId);
  const unique = new Set(ids);
  assert.equal(unique.size, ids.length, 'proposal IDs must be unique');
});

test('buildProposals — proposal IDs are stable across calls', () => {
  const discovery = loadFixture('discovery-snapshot.json');
  const first = buildProposals(discovery, GENERATED_AT, { maxCreateProposals: 20 });
  const second = buildProposals(discovery, GENERATED_AT, { maxCreateProposals: 20 });

  for (let i = 0; i < first.length; i++) {
    assert.equal(first[i].proposalId, second[i].proposalId);
  }
});
