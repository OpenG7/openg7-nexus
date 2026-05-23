import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
  buildImpactMapFromMatrix,
  normalizeMatrixEntries,
  normalizePathPrefixRule,
  normalizePathPrefixRules,
  normalizeStringArray,
  uniqueSorted,
} from '../admin-quality-matrix-model.mjs';

const FIXTURE_DIR = path.join(import.meta.dirname, 'fixtures');

function loadFixture(name) {
  return JSON.parse(readFileSync(path.join(FIXTURE_DIR, name), 'utf8'));
}

test('normalizeStringArray — filters non-strings and empty values', () => {
  assert.deepEqual(normalizeStringArray(['a', '', 'b', null, 42, '  c  ']), ['a', 'b', 'c']);
  assert.deepEqual(normalizeStringArray(null), []);
  assert.deepEqual(normalizeStringArray(undefined), []);
  assert.deepEqual(normalizeStringArray([]), []);
});

test('uniqueSorted — deduplicates and sorts', () => {
  assert.deepEqual(uniqueSorted(['b', 'a', 'b', 'c', 'a']), ['a', 'b', 'c']);
  assert.deepEqual(uniqueSorted([]), []);
  assert.deepEqual(uniqueSorted([null, '', 'x']), ['x']);
});

test('normalizePathPrefixRule — returns null for missing prefixes', () => {
  assert.equal(normalizePathPrefixRule({}), null);
  assert.equal(normalizePathPrefixRule({ prefixes: [] }), null);
  assert.equal(normalizePathPrefixRule(null), null);
});

test('normalizePathPrefixRule — normalizes valid rule', () => {
  const result = normalizePathPrefixRule({ prefixes: ['packages/alpha/', 'packages/alpha/'] });
  assert.deepEqual(result, { type: 'path-prefix', prefixes: ['packages/alpha/'] });
});

test('normalizePathPrefixRule — preserves explicit type', () => {
  const result = normalizePathPrefixRule({ type: 'custom', prefixes: ['src/'] });
  assert.equal(result?.type, 'custom');
});

test('normalizePathPrefixRules — handles array and single rule', () => {
  const rules = normalizePathPrefixRules([
    { prefixes: ['a/'] },
    { prefixes: [] },
    { prefixes: ['b/'] },
  ]);
  assert.equal(rules.length, 2);
});

test('normalizeMatrixEntries — filters invalid entries from fixture', () => {
  const snapshot = loadFixture('matrix-minimal.json');
  const entries = normalizeMatrixEntries(snapshot);
  assert.equal(entries.length, 3);
  assert.ok(entries.every((e) => typeof e.id === 'string'));
});

test('normalizeMatrixEntries — returns empty array for missing entries', () => {
  assert.deepEqual(normalizeMatrixEntries({}), []);
  assert.deepEqual(normalizeMatrixEntries(null), []);
  assert.deepEqual(normalizeMatrixEntries({ entries: 'not-array' }), []);
});

test('buildImpactMapFromMatrix — produces rules from fixture', () => {
  const snapshot = loadFixture('matrix-minimal.json');
  const impactMap = buildImpactMapFromMatrix(snapshot);

  assert.ok(Array.isArray(impactMap.rules));
  assert.ok(Array.isArray(impactMap.globalPrefixes));

  const alphaRule = impactMap.rules.find(
    (r) => r.entryIds.includes('test-entry-alpha'),
  );
  assert.ok(alphaRule, 'should have rule for test-entry-alpha');
  assert.ok(alphaRule.prefixes.includes('packages/alpha/'));

  const betaRule = impactMap.rules.find(
    (r) => r.entryIds.includes('test-entry-beta'),
  );
  assert.ok(betaRule, 'should have rule for test-entry-beta');
  assert.ok(betaRule.prefixes.includes('packages/beta/'));
  assert.ok(betaRule.prefixes.includes('openg7-org/src/beta/'));
});

test('buildImpactMapFromMatrix — includes global impact prefixes', () => {
  const snapshot = loadFixture('matrix-minimal.json');
  const impactMap = buildImpactMapFromMatrix(snapshot);
  assert.ok(impactMap.globalPrefixes.includes('contracts/'));
  assert.ok(impactMap.globalPrefixes.includes('shared/'));
});

test('buildImpactMapFromMatrix — entry without impactRules produces no rules', () => {
  const snapshot = loadFixture('matrix-minimal.json');
  const impactMap = buildImpactMapFromMatrix(snapshot);
  const noRuleEntry = impactMap.rules.find(
    (r) => r.entryIds.includes('test-entry-no-impact-rules'),
  );
  assert.equal(noRuleEntry, undefined);
});
