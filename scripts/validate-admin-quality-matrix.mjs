/**
 * Static consistency validation for admin-quality-matrix.json.
 *
 * Checks:
 *   1. reviewedAt present on every entry
 *   2. sourceRefs paths (e2e / strapi-api / route) exist on disk
 *   3. evidence files exist on disk
 *   4. managementBucket ↔ status cross-consistency
 *
 * Usage:
 *   node scripts/validate-admin-quality-matrix.mjs           # exits 1 on any error
 *   node scripts/validate-admin-quality-matrix.mjs --warn    # prints warnings, exits 0
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadMatrixSnapshot, normalizeMatrixEntries, repoRoot } from './admin-quality-matrix-model.mjs';

const FILE_PATH_PREFIXES = ['openg7-org/', 'strapi/', 'packages/', 'scripts/', 'shared/'];

export function isCheckableFilePath(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  return FILE_PATH_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export function collectSourceRefPaths(entry) {
  const refs = Array.isArray(entry.sourceRefs) ? entry.sourceRefs : [];
  return refs
    .map((ref) => (ref && typeof ref.path === 'string' ? ref.path.trim() : null))
    .filter((p) => p && isCheckableFilePath(p));
}

export function collectEvidencePaths(entry) {
  const evidence = Array.isArray(entry.evidence) ? entry.evidence : [];
  return evidence
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => `openg7-org/${item.trim()}`);
}

export function checkReviewedAt(entry) {
  if (typeof entry.reviewedAt !== 'string' || !entry.reviewedAt.trim()) {
    return `[${entry.id}] reviewedAt manquant.`;
  }
  return null;
}

export function checkFilesExist(entry) {
  const errors = [];
  const allPaths = [
    ...collectSourceRefPaths(entry),
    ...collectEvidencePaths(entry),
  ];
  for (const relPath of allPaths) {
    const abs = path.join(repoRoot, relPath);
    if (!existsSync(abs)) {
      errors.push(`[${entry.id}] Fichier introuvable : ${relPath}`);
    }
  }
  return errors;
}

export function checkBucketConsistency(entry) {
  const errors = [];
  const { id, summaryStatus, e2eStatus, managementBucket } = entry;

  if (summaryStatus === 'oui' && managementBucket !== 'covered') {
    errors.push(
      `[${id}] summaryStatus=oui mais managementBucket=${managementBucket} (attendu: covered).`,
    );
  }
  if (managementBucket === 'covered' && summaryStatus !== 'oui') {
    errors.push(
      `[${id}] managementBucket=covered mais summaryStatus=${summaryStatus} (attendu: oui).`,
    );
  }
  if (e2eStatus === 'oui' && managementBucket === 'proof-gap') {
    errors.push(
      `[${id}] e2eStatus=oui mais managementBucket=proof-gap — incohérent.`,
    );
  }
  return errors;
}

export function validateMatrix(snapshot) {
  const entries = normalizeMatrixEntries(snapshot);
  const errors = [];

  for (const entry of entries) {
    const reviewedAtError = checkReviewedAt(entry);
    if (reviewedAtError) errors.push(reviewedAtError);
    errors.push(...checkFilesExist(entry));
    errors.push(...checkBucketConsistency(entry));
  }

  return errors;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const warnOnly = process.argv.includes('--warn');
  const snapshot = loadMatrixSnapshot();
  const errors = validateMatrix(snapshot);

  if (errors.length === 0) {
    process.stdout.write('admin-quality-matrix.json validation passed.\n');
    process.exit(0);
  }

  const label = warnOnly ? 'WARN' : 'ERROR';
  for (const error of errors) {
    process.stderr.write(`${label}: ${error}\n`);
  }

  if (!warnOnly) {
    process.stderr.write(`\n${errors.length} erreur(s) de validation. Corrigez le JSON ou lancez avec --warn pour ignorer.\n`);
    process.exit(1);
  }
}
