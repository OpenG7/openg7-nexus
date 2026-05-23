/**
 * Per-PR reviewedAt guard for admin-quality-matrix.json.
 *
 * For each impacted entry (from impact.json), checks whether reviewedAt was
 * bumped between the PR base and head. Entries whose reviewedAt is unchanged
 * are flagged as "not reviewed in this PR."
 *
 * Usage (CI):
 *   node scripts/check-admin-quality-reviewed-at.mjs \
 *     --base <base-sha> \
 *     --impact impact.json \
 *     > reviewed-at-check.json
 *
 * Output (stdout): JSON { reviewed: [...], notReviewed: [...], newEntries: [...] }
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { matrixSnapshotPath, repoRoot } from './admin-quality-matrix-model.mjs';

const MATRIX_REPO_PATH = 'openg7-org/src/assets/data/admin-quality-matrix.json';

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function readMatrixAtCommit(sha, gitRoot) {
  try {
    const raw = execSync(`git -C "${gitRoot}" show "${sha}:${MATRIX_REPO_PATH}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function indexByEntryId(snapshot) {
  const map = {};
  const entries = Array.isArray(snapshot?.entries) ? snapshot.entries : [];
  for (const entry of entries) {
    if (typeof entry?.id === 'string' && entry.id.trim()) {
      map[entry.id] = entry;
    }
  }
  return map;
}

export function checkReviewedAtForPR(impactedEntryIds, baseSha, gitRoot) {
  const baseSnapshot = readMatrixAtCommit(baseSha, gitRoot);
  const headSnapshot = readJson(matrixSnapshotPath);

  const baseIndex = indexByEntryId(baseSnapshot);
  const headIndex = indexByEntryId(headSnapshot);

  const reviewed = [];
  const notReviewed = [];
  const newEntries = [];

  for (const entryId of impactedEntryIds) {
    const base = baseIndex[entryId];
    const head = headIndex[entryId];

    if (!base) {
      newEntries.push({ entryId });
      continue;
    }

    const baseDate = base.reviewedAt ?? null;
    const headDate = head?.reviewedAt ?? null;

    if (headDate && headDate !== baseDate) {
      reviewed.push({ entryId, previousReviewedAt: baseDate, newReviewedAt: headDate });
    } else {
      notReviewed.push({ entryId, reviewedAt: baseDate });
    }
  }

  return { reviewed, notReviewed, newEntries };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);

  const baseShaIndex = args.indexOf('--base');
  const impactIndex = args.indexOf('--impact');

  const baseSha = baseShaIndex !== -1 ? args[baseShaIndex + 1] : null;
  const impactPath = impactIndex !== -1 ? args[impactIndex + 1] : null;

  if (!baseSha || !impactPath) {
    process.stderr.write('Usage: node check-admin-quality-reviewed-at.mjs --base <sha> --impact <impact.json>\n');
    process.exit(1);
  }

  const impact = readJson(path.resolve(impactPath));
  const impactedEntryIds = impact?.entryIds ?? [];

  const result = checkReviewedAtForPR(impactedEntryIds, baseSha, repoRoot);
  process.stdout.write(JSON.stringify(result, null, 2));
  process.stdout.write('\n');
}
