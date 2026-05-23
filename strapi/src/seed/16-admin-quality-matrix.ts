import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { hasContentType, upsertByUID } from '../utils/seed-helpers';

const MATRIX_ENTRY_UID = 'api::admin-quality-matrix.admin-quality-matrix-entry';

interface MatrixSeedEntry {
  readonly id?: unknown;
  readonly domain?: unknown;
  readonly need?: unknown;
  readonly acceptanceCriteria?: unknown;
  readonly sourceRefs?: unknown;
  readonly impactRules?: unknown;
  readonly confidence?: unknown;
  readonly lastDiscoveredAt?: unknown;
  readonly summaryStatus?: unknown;
  readonly businessStatus?: unknown;
  readonly implementationStatus?: unknown;
  readonly e2eStatus?: unknown;
  readonly priority?: unknown;
  readonly managementBucket?: unknown;
  readonly needsProductWorkFirst?: unknown;
  readonly observedGap?: unknown;
  readonly nextMove?: unknown;
  readonly evidence?: unknown;
  readonly reviewedAt?: unknown;
}

interface MatrixSeedSnapshot {
  readonly entries?: readonly MatrixSeedEntry[];
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeStatus(value: unknown): 'oui' | 'partiel' | 'non' | 'hors MVP' {
  return value === 'oui' || value === 'partiel' || value === 'non' || value === 'hors MVP'
    ? value
    : 'non';
}

function normalizePriority(value: unknown): 'basse' | 'moyenne' | 'haute' {
  return value === 'basse' || value === 'moyenne' || value === 'haute' ? value : 'moyenne';
}

function normalizeBucket(value: unknown): 'covered' | 'proof-gap' | 'product-gap' | 'scope-limit' {
  return value === 'covered' ||
    value === 'proof-gap' ||
    value === 'product-gap' ||
    value === 'scope-limit'
    ? value
    : 'proof-gap';
}

function normalizeConfidence(value: unknown): 'low' | 'medium' | 'high' {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'medium';
}

function normalizeEvidence(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
  );
}

function normalizeJsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function matrixSnapshotPath(): string {
  return path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'openg7-org',
    'src',
    'assets',
    'data',
    'admin-quality-matrix.json',
  );
}

async function countExistingEntries(): Promise<number> {
  try {
    const existing = await strapi.entityService.findMany(MATRIX_ENTRY_UID as any, {
      limit: 1,
      fields: ['id'],
    } as any);
    return Array.isArray(existing) ? existing.length : 0;
  } catch {
    return 0;
  }
}

export default async function seedAdminQualityMatrix() {
  if (!hasContentType(MATRIX_ENTRY_UID)) {
    strapi.log?.warn?.(
      'Skipping admin quality matrix seed because the content type is unavailable.',
    );
    return;
  }

  // Bootstrap-only: skip if DB already has entries — the DB is now the source of truth.
  // Re-run yarn sync:admin-quality-matrix to force a resync from the JSON.
  const existingCount = await countExistingEntries();
  if (existingCount > 0) {
    strapi.log?.info?.(
      `Admin quality matrix seed skipped — ${existingCount} entr(y/ies) already in DB (bootstrap-only mode). Run yarn sync:admin-quality-matrix to resync.`,
    );
    return;
  }

  const raw = await readFile(matrixSnapshotPath(), 'utf8');
  const snapshot = JSON.parse(raw) as MatrixSeedSnapshot;
  const entries = Array.isArray(snapshot.entries) ? snapshot.entries : [];

  for (const entry of entries) {
    const entryId = normalizeString(entry.id);
    const domain = normalizeString(entry.domain);
    const need = normalizeString(entry.need);
    const reviewedAt = normalizeString(entry.reviewedAt);

    if (!entryId || !domain || !need || !reviewedAt) {
      continue;
    }

    await upsertByUID(
      MATRIX_ENTRY_UID,
      {
        entryId,
        domain,
        need,
        acceptanceCriteria: normalizeJsonArray(entry.acceptanceCriteria),
        sourceRefs: normalizeJsonArray(entry.sourceRefs),
        impactRules: normalizeJsonArray(entry.impactRules),
        confidence: normalizeConfidence(entry.confidence),
        lastDiscoveredAt: normalizeString(entry.lastDiscoveredAt) ?? reviewedAt,
        summaryStatus: normalizeStatus(entry.summaryStatus),
        businessStatus: normalizeStatus(entry.businessStatus),
        implementationStatus: normalizeStatus(entry.implementationStatus),
        e2eStatus: normalizeStatus(entry.e2eStatus),
        priority: normalizePriority(entry.priority),
        managementBucket: normalizeBucket(entry.managementBucket),
        needsProductWorkFirst: Boolean(entry.needsProductWorkFirst),
        observedGap: normalizeString(entry.observedGap) ?? '',
        nextMove: normalizeString(entry.nextMove) ?? '',
        evidence: normalizeEvidence(entry.evidence),
        reviewedAt,
      },
      { unique: { entryId } },
    );
  }

  strapi.log?.info?.(`Admin quality matrix seed complete — ${entries.length} entr(y/ies) bootstrapped.`);
}
