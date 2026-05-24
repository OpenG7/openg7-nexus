/**
 * Git-based staleness audit for admin-quality-matrix.json.
 *
 * For each entry that has impactRules prefixes and a reviewedAt date, checks
 * whether any git commits touched those paths after the review date. Entries
 * with activity after reviewedAt are flagged as potentially stale.
 *
 * Usage:
 *   node scripts/audit-admin-quality-staleness.mjs           # human-readable report
 *   node scripts/audit-admin-quality-staleness.mjs --json    # machine-readable JSON
 *   node scripts/audit-admin-quality-staleness.mjs --fail    # exits 1 if stale entries found
 */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { loadMatrixSnapshot, normalizeMatrixEntries, repoRoot } from './admin-quality-matrix-model.mjs';

export function collectImpactPrefixes(entry) {
  const rules = Array.isArray(entry.impactRules) ? entry.impactRules : [];
  return rules.flatMap((rule) =>
    Array.isArray(rule?.prefixes)
      ? rule.prefixes.filter((p) => typeof p === 'string' && p.trim())
      : [],
  );
}

export function gitCommitsAfter(date, prefixes, gitRoot) {
  if (!prefixes.length || !date) return [];
  const escapedPrefixes = prefixes.map((p) => `"${p}"`).join(' ');
  try {
    const out = execSync(
      `git -C "${gitRoot}" log --after="${date}" --oneline -- ${escapedPrefixes}`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    ).trim();
    return out ? out.split('\n').filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function auditStaleness(snapshot, gitRoot) {
  const entries = normalizeMatrixEntries(snapshot);
  const stale = [];
  const upToDate = [];
  const skipped = [];

  for (const entry of entries) {
    const prefixes = collectImpactPrefixes(entry);
    const reviewedAt = typeof entry.reviewedAt === 'string' ? entry.reviewedAt.trim() : null;

    if (!reviewedAt || !prefixes.length) {
      skipped.push({ id: entry.id, reason: !reviewedAt ? 'reviewedAt manquant' : 'aucun impactRules' });
      continue;
    }

    const commits = gitCommitsAfter(reviewedAt, prefixes, gitRoot);
    if (commits.length > 0) {
      stale.push({ id: entry.id, domain: entry.domain, reviewedAt, commitCount: commits.length, recentCommits: commits.slice(0, 3) });
    } else {
      upToDate.push({ id: entry.id, reviewedAt });
    }
  }

  return { stale, upToDate, skipped };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const asJson = process.argv.includes('--json');
  const failOnStale = process.argv.includes('--fail');

  const snapshot = loadMatrixSnapshot();
  const { stale, upToDate, skipped } = auditStaleness(snapshot, repoRoot);

  if (asJson) {
    process.stdout.write(JSON.stringify({ stale, upToDate, skipped }, null, 2));
    process.stdout.write('\n');
  } else {
    process.stdout.write(`Audit fraîcheur admin-quality-matrix — ${new Date().toISOString().slice(0, 10)}\n\n`);
    process.stdout.write(`  A jour   : ${upToDate.length}\n`);
    process.stdout.write(`  Périmées : ${stale.length}\n`);
    process.stdout.write(`  Ignorées : ${skipped.length} (reviewedAt absent ou pas d'impactRules)\n`);

    if (stale.length > 0) {
      process.stdout.write('\nEntrées potentiellement périmées :\n');
      for (const entry of stale) {
        process.stdout.write(`\n  [${entry.id}] ${entry.domain}\n`);
        process.stdout.write(`    reviewedAt  : ${entry.reviewedAt}\n`);
        process.stdout.write(`    commits post-revue : ${entry.commitCount}\n`);
        for (const commit of entry.recentCommits) {
          process.stdout.write(`      • ${commit}\n`);
        }
      }
      process.stdout.write('\nAction requise : mettre à jour reviewedAt, observedGap et nextMove pour chaque entrée périmée.\n');
    }
  }

  if (failOnStale && stale.length > 0) {
    process.exit(1);
  }
}
