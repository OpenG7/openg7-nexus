import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  checkBucketConsistency,
  checkFilesExist,
  checkReviewedAt,
  collectEvidencePaths,
  collectSourceRefPaths,
  isCheckableFilePath,
  validateMatrix,
} from '../validate-admin-quality-matrix.mjs';

// ─── isCheckableFilePath ─────────────────────────────────────────────────────

test('isCheckableFilePath — true for known repo prefixes', () => {
  assert.ok(isCheckableFilePath('openg7-org/e2e/map.spec.ts'));
  assert.ok(isCheckableFilePath('strapi/src/api/foo.ts'));
  assert.ok(isCheckableFilePath('packages/alpha/src/widget.ts'));
  assert.ok(isCheckableFilePath('scripts/seed.mjs'));
  assert.ok(isCheckableFilePath('shared/contracts/types.ts'));
});

test('isCheckableFilePath — false for doc titles and empty strings', () => {
  assert.equal(isCheckableFilePath(''), false);
  assert.equal(isCheckableFilePath('  '), false);
  assert.equal(isCheckableFilePath('Cas d\'usage en langage courant'), false);
  assert.equal(isCheckableFilePath('_dev/ol-demo - Corridor Intelligence'), false);
  assert.equal(isCheckableFilePath(null), false);
  assert.equal(isCheckableFilePath(42), false);
});

// ─── collectSourceRefPaths ───────────────────────────────────────────────────

test('collectSourceRefPaths — extracts checkable paths only', () => {
  const entry = {
    sourceRefs: [
      { type: 'e2e', path: 'openg7-org/e2e/map.spec.ts' },
      { type: 'doc', path: 'Analyse fonctionnelle — Centre de mises en relation' },
      { type: 'selector', selectors: ['map-frame'] },
      { type: 'e2e', path: 'openg7-org/e2e/feed.spec.ts' },
    ],
  };
  const paths = collectSourceRefPaths(entry);
  assert.deepEqual(paths, ['openg7-org/e2e/map.spec.ts', 'openg7-org/e2e/feed.spec.ts']);
});

test('collectSourceRefPaths — empty sourceRefs returns empty array', () => {
  assert.deepEqual(collectSourceRefPaths({ sourceRefs: [] }), []);
  assert.deepEqual(collectSourceRefPaths({}), []);
});

// ─── collectEvidencePaths ────────────────────────────────────────────────────

test('collectEvidencePaths — prefixes evidence items with openg7-org/', () => {
  const entry = { evidence: ['e2e/map.spec.ts', 'e2e/corridors.spec.ts'] };
  assert.deepEqual(collectEvidencePaths(entry), [
    'openg7-org/e2e/map.spec.ts',
    'openg7-org/e2e/corridors.spec.ts',
  ]);
});

test('collectEvidencePaths — skips non-string and empty items', () => {
  assert.deepEqual(collectEvidencePaths({ evidence: ['', null, 42] }), []);
  assert.deepEqual(collectEvidencePaths({}), []);
});

// ─── checkReviewedAt ─────────────────────────────────────────────────────────

test('checkReviewedAt — null when reviewedAt is a non-empty string', () => {
  assert.equal(checkReviewedAt({ id: 'x', reviewedAt: '2026-05-17' }), null);
});

test('checkReviewedAt — error when reviewedAt is missing', () => {
  const error = checkReviewedAt({ id: 'my-entry' });
  assert.ok(error?.includes('my-entry'));
  assert.ok(error?.includes('reviewedAt'));
});

test('checkReviewedAt — error when reviewedAt is empty string', () => {
  assert.ok(checkReviewedAt({ id: 'x', reviewedAt: '' }));
  assert.ok(checkReviewedAt({ id: 'x', reviewedAt: '   ' }));
});

// ─── checkFilesExist ─────────────────────────────────────────────────────────

test('checkFilesExist — no errors when all paths are non-checkable', () => {
  const entry = {
    id: 'x',
    sourceRefs: [{ type: 'doc', path: 'Some document title' }],
    evidence: [],
  };
  assert.deepEqual(checkFilesExist(entry), []);
});

test('checkFilesExist — error for missing checkable path', () => {
  const entry = {
    id: 'missing-entry',
    sourceRefs: [{ type: 'e2e', path: 'openg7-org/e2e/does-not-exist.spec.ts' }],
    evidence: [],
  };
  const errors = checkFilesExist(entry);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].includes('missing-entry'));
  assert.ok(errors[0].includes('openg7-org/e2e/does-not-exist.spec.ts'));
});

test('checkFilesExist — error for missing evidence file', () => {
  const entry = {
    id: 'stale-entry',
    sourceRefs: [],
    evidence: ['e2e/ghost-spec.spec.ts'],
  };
  const errors = checkFilesExist(entry);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].includes('openg7-org/e2e/ghost-spec.spec.ts'));
});

// ─── checkBucketConsistency ──────────────────────────────────────────────────

test('checkBucketConsistency — no errors for covered + summaryStatus oui', () => {
  const entry = { id: 'x', summaryStatus: 'oui', managementBucket: 'covered', e2eStatus: 'oui' };
  assert.deepEqual(checkBucketConsistency(entry), []);
});

test('checkBucketConsistency — no errors for proof-gap + summaryStatus non', () => {
  const entry = { id: 'x', summaryStatus: 'non', managementBucket: 'proof-gap', e2eStatus: 'non' };
  assert.deepEqual(checkBucketConsistency(entry), []);
});

test('checkBucketConsistency — error: summaryStatus oui but not covered', () => {
  const entry = { id: 'x', summaryStatus: 'oui', managementBucket: 'proof-gap', e2eStatus: 'oui' };
  const errors = checkBucketConsistency(entry);
  assert.equal(errors.length, 2);
  assert.ok(errors.some((e) => e.includes('summaryStatus=oui')));
  assert.ok(errors.some((e) => e.includes('e2eStatus=oui') && e.includes('proof-gap')));
});

test('checkBucketConsistency — error: covered but summaryStatus not oui', () => {
  const entry = { id: 'x', summaryStatus: 'non', managementBucket: 'covered', e2eStatus: 'partiel' };
  const errors = checkBucketConsistency(entry);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].includes('managementBucket=covered'));
});

test('checkBucketConsistency — error: e2eStatus oui but proof-gap', () => {
  const entry = { id: 'x', summaryStatus: 'non', managementBucket: 'proof-gap', e2eStatus: 'oui' };
  const errors = checkBucketConsistency(entry);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].includes('e2eStatus=oui') && errors[0].includes('proof-gap'));
});

// ─── validateMatrix ──────────────────────────────────────────────────────────

test('validateMatrix — no errors on a valid minimal snapshot', () => {
  const snapshot = {
    entries: [
      {
        id: 'valid-entry',
        reviewedAt: '2026-05-01',
        summaryStatus: 'non',
        e2eStatus: 'non',
        managementBucket: 'proof-gap',
        sourceRefs: [],
        evidence: [],
      },
    ],
  };
  assert.deepEqual(validateMatrix(snapshot), []);
});

test('validateMatrix — accumulates errors across entries', () => {
  const snapshot = {
    entries: [
      {
        id: 'entry-a',
        summaryStatus: 'oui',
        managementBucket: 'proof-gap',
        e2eStatus: 'oui',
        sourceRefs: [],
        evidence: [],
      },
      {
        id: 'entry-b',
        reviewedAt: '2026-01-01',
        summaryStatus: 'non',
        managementBucket: 'covered',
        e2eStatus: 'non',
        sourceRefs: [],
        evidence: [],
      },
    ],
  };
  const errors = validateMatrix(snapshot);
  assert.ok(errors.some((e) => e.includes('entry-a') && e.includes('reviewedAt')));
  assert.ok(errors.some((e) => e.includes('entry-a') && e.includes('summaryStatus=oui')));
  assert.ok(errors.some((e) => e.includes('entry-b') && e.includes('managementBucket=covered')));
});

test('validateMatrix — empty entries list returns no errors', () => {
  assert.deepEqual(validateMatrix({ entries: [] }), []);
  assert.deepEqual(validateMatrix({}), []);
});
