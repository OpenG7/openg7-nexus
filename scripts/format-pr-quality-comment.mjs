/**
 * Formats the admin quality impact + needs discovery results into a GitHub PR comment.
 * Reads JSON from stdin or a file path argument, writes markdown to stdout.
 *
 * Usage:
 *   node scripts/format-pr-quality-comment.mjs impact.json [proposals.json]
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function impactBadge(mode) {
  switch (mode) {
    case 'global':
      return '🌐 Global';
    case 'targeted':
      return '🎯 Ciblé';
    case 'provided':
      return '📌 Fourni';
    default:
      return '—';
  }
}

function proposalTypeBadge(type) {
  switch (type) {
    case 'add-source-ref':
      return '🔗 Source';
    case 'create-entry':
      return '✨ Nouvelle entrée';
    case 'mark-stale':
      return '🔍 À piloter';
    default:
      return type;
  }
}

function confidenceEmoji(confidence) {
  switch (confidence) {
    case 'high':
      return '🟢';
    case 'medium':
      return '🟡';
    default:
      return '🔴';
  }
}

function formatImpactSection(impact) {
  if (!impact) {
    return '';
  }

  const lines = [
    '## 🧭 Impact matrice qualité',
    '',
    `| Champ | Valeur |`,
    `|-------|--------|`,
    `| Mode | ${impactBadge(impact.mode)} |`,
    `| Raison | ${impact.reason ?? '—'} |`,
    `| Entrées impactées | ${(impact.entryIds ?? []).length} |`,
  ];

  if (impact.entryIds && impact.entryIds.length > 0) {
    lines.push('', '**Entrées touchées :**', '');
    for (const entryId of impact.entryIds) {
      lines.push(`- \`${entryId}\``);
    }
  }

  if (impact.changedFiles && impact.changedFiles.length > 0) {
    const preview = impact.changedFiles.slice(0, 8);
    const extra = impact.changedFiles.length - preview.length;
    lines.push('', '<details><summary>Fichiers modifiés</summary>', '');
    for (const file of preview) {
      lines.push(`- \`${file}\``);
    }
    if (extra > 0) {
      lines.push(`- _... et ${extra} autre(s)_`);
    }
    lines.push('</details>');
  }

  return lines.join('\n');
}

function formatProposalsSection(proposals) {
  if (!proposals) {
    return '';
  }

  const report = proposals;
  const allProposals = report.proposals ?? report.discovery?.proposals ?? [];
  const summary = report.summary ?? {};
  const sourceCounts = report.discovery?.sourceCounts ?? {};

  const lines = [
    '## 🤖 Propositions de besoins détectés',
    '',
    `| Champ | Valeur |`,
    `|-------|--------|`,
    `| Propositions totales | ${summary.proposalCount ?? allProposals.length} |`,
    `| Entrées touchées | ${summary.entriesTouched ?? '—'} |`,
    `| Sources scannées | ${sourceCounts.total ?? '—'} |`,
  ];

  if (summary.byType) {
    lines.push('', '**Par type :**', '');
    for (const [type, count] of Object.entries(summary.byType)) {
      lines.push(`- ${proposalTypeBadge(type)}: **${count}**`);
    }
  }

  const topProposals = allProposals.slice(0, 10);
  if (topProposals.length > 0) {
    lines.push('', '<details><summary>Top propositions</summary>', '', '| Type | Confiance | Entrée | Résumé |', '|------|-----------|--------|--------|');
    for (const p of topProposals) {
      const summary = (p.summary ?? '').slice(0, 80).replace(/\|/g, '\\|');
      lines.push(
        `| ${proposalTypeBadge(p.type)} | ${confidenceEmoji(p.confidence)} ${p.confidence} | \`${p.entryId}\` | ${summary} |`,
      );
    }
    const extra = allProposals.length - topProposals.length;
    if (extra > 0) {
      lines.push(`| | | | _... et ${extra} autre(s) dans le rapport complet_ |`);
    }
    lines.push('</details>');
  }

  return lines.join('\n');
}

export function formatReviewedAtSection(reviewedAtCheck) {
  if (!reviewedAtCheck) return '';

  const { notReviewed = [], reviewed = [], newEntries = [] } = reviewedAtCheck;

  if (notReviewed.length === 0 && newEntries.length === 0) {
    return [
      '## ✅ reviewedAt',
      '',
      `Toutes les entrées impactées ont un \`reviewedAt\` mis à jour dans cette PR.`,
    ].join('\n');
  }

  const lines = [
    '## ⚠️ reviewedAt non mis à jour',
    '',
    `${notReviewed.length} entrée(s) impactée(s) n'ont pas de \`reviewedAt\` mis à jour dans cette PR.`,
    `Pensez à mettre à jour \`reviewedAt\`, \`observedGap\` et \`nextMove\` dans \`admin-quality-matrix.json\`.`,
  ];

  if (notReviewed.length > 0) {
    lines.push('', '| Entrée | reviewedAt actuel |', '|--------|-------------------|');
    for (const entry of notReviewed) {
      lines.push(`| \`${entry.entryId}\` | ${entry.reviewedAt ?? '—'} |`);
    }
  }

  if (reviewed.length > 0) {
    lines.push('', '<details><summary>Entrées mises à jour dans cette PR</summary>', '');
    for (const entry of reviewed) {
      lines.push(`- \`${entry.entryId}\` : ${entry.previousReviewedAt} → ${entry.newReviewedAt}`);
    }
    lines.push('</details>');
  }

  if (newEntries.length > 0) {
    lines.push('', '<details><summary>Nouvelles entrées (pas de base de comparaison)</summary>', '');
    for (const entry of newEntries) {
      lines.push(`- \`${entry.entryId}\``);
    }
    lines.push('</details>');
  }

  return lines.join('\n');
}

function formatComment(impact, proposals, prNumber, reviewedAtCheck) {
  const sections = [
    `<!-- og7-admin-quality-review -->`,
    `## 🔍 Revue admin quality — PR #${prNumber ?? 'n/a'}`,
    '',
    formatImpactSection(impact),
    '',
    formatProposalsSection(proposals),
    '',
    formatReviewedAtSection(reviewedAtCheck),
    '',
    '---',
    `_Généré automatiquement par [admin-quality-matrix-sync](.github/workflows/pr-admin-quality-review.yml)_`,
  ].filter((section) => section !== undefined);

  return sections.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const impactPath = args[0] ?? null;
  const proposalsPath = args[1] ?? null;
  const reviewedAtPath = args[2] ?? null;
  const prNumber = process.env.PR_NUMBER ?? null;

  const impact = impactPath ? readJson(path.resolve(impactPath)) : null;
  const proposals = proposalsPath ? readJson(path.resolve(proposalsPath)) : null;
  const reviewedAtCheck = reviewedAtPath ? readJson(path.resolve(reviewedAtPath)) : null;

  if (!impact && !proposals) {
    process.stderr.write('At least one of impact.json or proposals.json is required.\n');
    process.exit(1);
  }

  process.stdout.write(formatComment(impact, proposals, prNumber, reviewedAtCheck));
  process.stdout.write('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { formatComment, formatImpactSection, formatProposalsSection };
