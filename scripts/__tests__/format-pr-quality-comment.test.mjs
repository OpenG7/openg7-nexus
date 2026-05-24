import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
  formatComment,
  formatImpactSection,
  formatProposalsSection,
} from '../format-pr-quality-comment.mjs';

const FIXTURE_DIR = path.join(import.meta.dirname, 'fixtures');

function loadFixture(name) {
  return JSON.parse(readFileSync(path.join(FIXTURE_DIR, name), 'utf8'));
}

test('formatImpactSection — returns empty string for null', () => {
  assert.equal(formatImpactSection(null), '');
  assert.equal(formatImpactSection(undefined), '');
});

test('formatImpactSection — renders global impact', () => {
  const impact = loadFixture('impact-global.json');
  const result = formatImpactSection(impact);
  assert.ok(result.includes('🌐 Global'));
  assert.ok(result.includes('Global impact rule matched'));
  assert.ok(result.includes('2'));
});

test('formatImpactSection — lists entry IDs', () => {
  const impact = loadFixture('impact-global.json');
  const result = formatImpactSection(impact);
  assert.ok(result.includes('test-entry-alpha'));
  assert.ok(result.includes('test-entry-beta'));
});

test('formatImpactSection — shows changed files in details', () => {
  const impact = loadFixture('impact-global.json');
  const result = formatImpactSection(impact);
  assert.ok(result.includes('shared/contracts/types.ts'));
  assert.ok(result.includes('Fichiers modifiés'));
});

test('formatImpactSection — targeted mode badge', () => {
  const result = formatImpactSection({ mode: 'targeted', reason: 'path match', entryIds: [], changedFiles: [] });
  assert.ok(result.includes('🎯 Ciblé'));
});

test('formatImpactSection — provided mode badge', () => {
  const result = formatImpactSection({ mode: 'provided', reason: 'explicit', entryIds: [], changedFiles: [] });
  assert.ok(result.includes('📌 Fourni'));
});

test('formatProposalsSection — returns empty string for null', () => {
  assert.equal(formatProposalsSection(null), '');
  assert.equal(formatProposalsSection(undefined), '');
});

test('formatProposalsSection — renders summary from fixture', () => {
  const proposals = loadFixture('proposals-snapshot.json');
  const result = formatProposalsSection(proposals);
  assert.ok(result.includes('3'));
  assert.ok(result.includes('🔗 Source'));
  assert.ok(result.includes('✨ Nouvelle entrée'));
  assert.ok(result.includes('🔍 À piloter'));
});

test('formatProposalsSection — renders top proposals table', () => {
  const proposals = loadFixture('proposals-snapshot.json');
  const result = formatProposalsSection(proposals);
  assert.ok(result.includes('test-entry-alpha'));
  assert.ok(result.includes('test-entry-beta'));
  assert.ok(result.includes('candidate-gamma-endpoint'));
});

test('formatProposalsSection — confidence emoji mapping', () => {
  const proposals = loadFixture('proposals-snapshot.json');
  const result = formatProposalsSection(proposals);
  assert.ok(result.includes('🟢'));
  assert.ok(result.includes('🟡'));
});

test('formatProposalsSection — handles flat proposals array (no discovery wrapper)', () => {
  const flatProposals = {
    proposals: [
      {
        proposalId: 'add-source-ref::entry-x::000',
        type: 'add-source-ref',
        status: 'proposed',
        entryId: 'entry-x',
        confidence: 'low',
        summary: 'Test proposal',
      },
    ],
    summary: { proposalCount: 1, entriesTouched: 1, byType: { 'add-source-ref': 1 } },
  };
  const result = formatProposalsSection(flatProposals);
  assert.ok(result.includes('entry-x'));
  assert.ok(result.includes('1'));
});

test('formatComment — includes PR number and marker', () => {
  const impact = loadFixture('impact-global.json');
  const proposals = loadFixture('proposals-snapshot.json');
  const result = formatComment(impact, proposals, '42');
  assert.ok(result.includes('<!-- og7-admin-quality-review -->'));
  assert.ok(result.includes('PR #42'));
});

test('formatComment — works with only impact', () => {
  const impact = loadFixture('impact-global.json');
  const result = formatComment(impact, null, '10');
  assert.ok(result.includes('🌐 Global'));
  assert.ok(!result.includes('Propositions de besoins'));
});

test('formatComment — works with only proposals', () => {
  const proposals = loadFixture('proposals-snapshot.json');
  const result = formatComment(null, proposals, '10');
  assert.ok(result.includes('Propositions de besoins'));
  assert.ok(!result.includes('Impact matrice qualité'));
});

test('formatComment — includes workflow attribution footer', () => {
  const impact = loadFixture('impact-global.json');
  const result = formatComment(impact, null, null);
  assert.ok(result.includes('admin-quality-matrix-sync'));
  assert.ok(result.includes('Généré automatiquement'));
});

test('formatComment — escapes pipe characters in summary to avoid table breakage', () => {
  const proposals = {
    proposals: [
      {
        proposalId: 'add-source-ref::entry-x::000',
        type: 'add-source-ref',
        status: 'proposed',
        entryId: 'entry-x',
        confidence: 'medium',
        summary: 'This | has | pipes',
      },
    ],
    summary: { proposalCount: 1, entriesTouched: 1, byType: { 'add-source-ref': 1 } },
  };
  const result = formatProposalsSection(proposals);
  assert.ok(!result.match(/(?<!\\)\|.*This.*(?<!\\)\|.*has.*(?<!\\)\|/), 'raw pipes in summary should be escaped');
});
