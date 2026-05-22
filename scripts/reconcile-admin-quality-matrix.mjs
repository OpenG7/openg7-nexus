import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  loadMatrixSnapshot,
  normalizeMatrixEntries,
  repoRoot,
  uniqueSorted,
} from './admin-quality-matrix-model.mjs';
import { discoverAdminQualityNeeds } from './discover-admin-quality-needs.mjs';

const DEFAULT_DISCOVERY_OUTPUT = 'admin-quality-needs-discovery.json';
const DEFAULT_PROPOSALS_OUTPUT = 'admin-quality-needs-proposals.json';
const DEFAULT_MARKDOWN_OUTPUT = 'admin-quality-needs-proposals.md';

function parseArguments(rawArguments) {
  const parsed = new Map();
  for (let index = 0; index < rawArguments.length; index += 1) {
    const token = rawArguments[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const [key, inlineValue] = token.slice(2).split(/=(.*)/s, 2);
    const next = rawArguments[index + 1];
    const value = inlineValue ?? (next && !next.startsWith('--') ? next : 'true');
    if (inlineValue === undefined && value !== 'true') {
      index += 1;
    }
    parsed.set(key, value);
  }
  return parsed;
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function slugify(value) {
  const slug = String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return slug || 'unmapped-source';
}

function hashId(parts) {
  return createHash('sha256').update(parts.join('\n')).digest('hex').slice(0, 16);
}

function sourceRefIdentity(sourceRef) {
  return [
    sourceRef?.type ?? '',
    sourceRef?.path ?? '',
    sourceRef?.value ?? '',
    sourceRef?.key ?? '',
    sourceRef?.label ?? '',
  ];
}

function proposalId(type, entryId, sourceRef) {
  const base = [type, entryId ?? 'new-entry', ...sourceRefIdentity(sourceRef)];
  return `${type}::${entryId ?? 'candidate'}::${hashId(base)}`;
}

function sourceTitle(sourceRef) {
  return sourceRef.label ?? sourceRef.value ?? sourceRef.key ?? sourceRef.path ?? 'source';
}

function proposalSource(generatedAt, reason) {
  return {
    agent: 'admin-quality-needs-reconciler',
    generatedAt,
    reason,
  };
}

function addSourceRefProposal(generatedAt, proposal) {
  const sourceRef = proposal.sourceRef;
  return {
    proposalId: proposalId('add-source-ref', proposal.entryId, sourceRef),
    type: 'add-source-ref',
    status: 'proposed',
    entryId: proposal.entryId,
    confidence: proposal.confidence,
    title: `Add source reference to ${proposal.entryId}`,
    summary: `Attach ${sourceRef.type} source ${sourceTitle(sourceRef)} to the existing matrix entry.`,
    source: proposalSource(generatedAt, sourceRef.matchReason ?? 'discovered-source-ref'),
    payload: {
      sourceRef,
    },
  };
}

function createEntryProposal(generatedAt, sourceRef) {
  const baseName =
    sourceRef.value ?? sourceRef.label ?? sourceRef.key ?? sourceRef.path ?? 'source';
  const candidateEntryId = `candidate-${slugify(baseName)}`;
  return {
    proposalId: proposalId('create-entry', candidateEntryId, sourceRef),
    type: 'create-entry',
    status: 'proposed',
    entryId: candidateEntryId,
    confidence: sourceRef.type === 'e2e' || sourceRef.type === 'strapi-api' ? 'medium' : 'low',
    title: `Create matrix entry for ${sourceTitle(sourceRef)}`,
    summary:
      'A source was discovered without a confident mapping to an existing admin quality matrix entry.',
    source: proposalSource(generatedAt, 'unmapped-source'),
    payload: {
      candidateEntry: {
        id: candidateEntryId,
        domain: sourceTitle(sourceRef),
        need: `Review whether ${sourceTitle(sourceRef)} represents a distinct business need.`,
        acceptanceCriteria: [
          'A product owner confirms whether this source is a distinct business need.',
          'The accepted entry receives impactRules and at least one executable or documentary sourceRef.',
        ],
        sourceRefs: [sourceRef],
        impactRules: sourceRef.path ? [{ type: 'path-prefix', prefixes: [sourceRef.path] }] : [],
        confidence: sourceRef.type === 'e2e' || sourceRef.type === 'strapi-api' ? 'medium' : 'low',
      },
    },
  };
}

function markStaleProposal(generatedAt, entry) {
  return {
    proposalId: `mark-stale::${entry.entryId}::${hashId([entry.entryId, 'no-discovered-source'])}`,
    type: 'mark-stale',
    status: 'proposed',
    entryId: entry.entryId,
    confidence: 'medium',
    title: `Review stale matrix entry ${entry.entryId}`,
    summary:
      'No current repository source was matched to this matrix entry during needs reconciliation.',
    source: proposalSource(generatedAt, 'no-discovered-source'),
    payload: {
      currentNeed: entry.need,
      suggestedAction: 'Review sourceRefs, impactRules, or scope status before changing coverage.',
    },
  };
}

function buildProposals(discovery, generatedAt, options) {
  const addSourceRefProposals = discovery.proposals.map((proposal) =>
    addSourceRefProposal(generatedAt, proposal),
  );
  const staleProposals = discovery.entries
    .filter((entry) => entry.discoveredSourceRefCount === 0)
    .map((entry) => markStaleProposal(generatedAt, entry));
  const createEntryProposals = discovery.unmappedSources
    .slice(0, options.maxCreateProposals)
    .map((sourceRef) => createEntryProposal(generatedAt, sourceRef));

  return [...addSourceRefProposals, ...staleProposals, ...createEntryProposals];
}

function summarizeByType(proposals) {
  const summary = {};
  for (const proposal of proposals) {
    summary[proposal.type] = (summary[proposal.type] ?? 0) + 1;
  }
  return summary;
}

function renderMarkdown(report) {
  const lines = [
    '# Admin Quality Needs Proposals',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Matrix entries: ${report.matrix.entryCount}`,
    `- Sources scanned: ${report.discovery.sourceCounts.total}`,
    `- Proposals: ${report.summary.proposalCount}`,
    `- Entries touched: ${report.summary.entriesTouched}`,
    '',
    '## Proposal Types',
    '',
  ];

  for (const [type, count] of Object.entries(report.summary.byType)) {
    lines.push(`- ${type}: ${count}`);
  }

  lines.push('', '## Top Proposals', '');
  for (const proposal of report.proposals.slice(0, 40)) {
    lines.push(
      `- ${proposal.type} / ${proposal.confidence} / ${proposal.entryId}: ${proposal.summary}`,
    );
  }

  if (report.proposals.length > 40) {
    lines.push('', `_${report.proposals.length - 40} additional proposal(s) in JSON output._`);
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}

function firstArgument(args, key) {
  return args.get(key) ?? null;
}

function resolveProposalsIngestUrl(args) {
  const explicit = firstArgument(args, 'proposals-ingest-url') ?? firstArgument(args, 'ingest-url');
  if (explicit) {
    return explicit;
  }

  if (process.env.ADMIN_QUALITY_MATRIX_PROPOSALS_INGEST_URL) {
    return process.env.ADMIN_QUALITY_MATRIX_PROPOSALS_INGEST_URL;
  }

  const matrixIngestUrl =
    process.env.ADMIN_QUALITY_MATRIX_INGEST_URL ?? process.env.ADMIN_QUALITY_INGEST_URL;
  return matrixIngestUrl ? matrixIngestUrl.replace(/\/ingest\/?$/, '/proposals/ingest') : null;
}

async function ingestProposals(args, report) {
  if (!args.has('ingest')) {
    return { status: 'not-requested', message: null };
  }

  const ingestUrl = resolveProposalsIngestUrl(args);
  const ingestToken =
    firstArgument(args, 'ingest-token') ??
    process.env.ADMIN_QUALITY_MATRIX_PROPOSALS_INGEST_TOKEN ??
    process.env.ADMIN_QUALITY_MATRIX_INGEST_TOKEN ??
    process.env.STRAPI_ADMIN_QUALITY_INGEST_TOKEN ??
    null;

  if (!ingestUrl || !ingestToken) {
    const message = 'Proposal ingest requested but URL or token is missing.';
    if (args.has('require-ingest')) {
      throw new Error(message);
    }
    return { status: 'skipped', message };
  }

  const response = await fetch(ingestUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ingestToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      generatedAt: report.generatedAt,
      correlationId: report.correlationId,
      source: 'admin-quality-needs-reconciler',
      proposals: report.proposals,
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Proposal ingest failed with HTTP ${response.status}: ${body}`);
  }

  return { status: 'success', message: body ? body.slice(0, 2_000) : null };
}

export function reconcileAdminQualityMatrix(options = {}) {
  const generatedAt = new Date().toISOString();
  const matrixSnapshot = loadMatrixSnapshot();
  const matrixEntries = normalizeMatrixEntries(matrixSnapshot);
  const discovery = discoverAdminQualityNeeds();
  const proposals = buildProposals(discovery, generatedAt, {
    maxCreateProposals: options.maxCreateProposals ?? 20,
  });
  const entriesTouched = uniqueSorted(proposals.map((proposal) => proposal.entryId));

  return {
    generatedAt,
    correlationId: `needs-reconcile-${generatedAt}`,
    matrix: {
      schemaVersion: matrixSnapshot.schemaVersion ?? null,
      generatedAt: matrixSnapshot.generatedAt ?? null,
      entryCount: matrixEntries.length,
    },
    discovery,
    summary: {
      proposalCount: proposals.length,
      entriesTouched: entriesTouched.length,
      byType: summarizeByType(proposals),
    },
    proposals,
  };
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const maxCreateProposals = Number.parseInt(args.get('max-create-proposals') ?? '20', 10);
  const report = reconcileAdminQualityMatrix({
    maxCreateProposals: Number.isFinite(maxCreateProposals) ? maxCreateProposals : 50,
  });
  report.ingest = await ingestProposals(args, report);
  const discoveryOutput = path.resolve(
    repoRoot,
    args.get('discovery-output') ?? DEFAULT_DISCOVERY_OUTPUT,
  );
  const proposalsOutput = path.resolve(repoRoot, args.get('output') ?? DEFAULT_PROPOSALS_OUTPUT);
  const markdownOutput = path.resolve(
    repoRoot,
    args.get('markdown-output') ?? DEFAULT_MARKDOWN_OUTPUT,
  );

  writeFileSync(discoveryOutput, stableJson(report.discovery), 'utf8');
  writeFileSync(proposalsOutput, stableJson(report), 'utf8');
  writeFileSync(markdownOutput, renderMarkdown(report), 'utf8');

  process.stdout.write(
    `Reconciled ${report.discovery.sourceCounts.total} source(s) into ${report.summary.proposalCount} proposal(s).\n`,
  );
  process.stdout.write(`Wrote ${proposalsOutput}\n`);
  process.stdout.write(`Wrote ${markdownOutput}\n`);
  if (report.ingest.status !== 'not-requested') {
    process.stdout.write(`Ingest: ${report.ingest.status}\n`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
