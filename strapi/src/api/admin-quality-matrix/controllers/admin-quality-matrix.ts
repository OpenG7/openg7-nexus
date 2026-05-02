import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';

const MATRIX_ENTRY_UID = 'api::admin-quality-matrix.admin-quality-matrix-entry' as any;
const EMPTY_GENERATED_AT = '2026-04-11T00:00:00.000Z';
const STALE_AFTER_DAYS = 7;
const MS_PER_DAY = 86_400_000;

type MatrixStatus = 'oui' | 'partiel' | 'non' | 'hors MVP';
type MatrixPriority = 'basse' | 'moyenne' | 'haute';
type MatrixBucket = 'covered' | 'proof-gap' | 'product-gap' | 'scope-limit';
type MatrixSourceStatus = 'fresh' | 'stale' | 'fallback';

interface MatrixEntryEntity {
  readonly id?: number | string;
  readonly entryId?: unknown;
  readonly domain?: unknown;
  readonly need?: unknown;
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
  readonly lastRepoSignalAt?: unknown;
  readonly lastRepoSignalCommit?: unknown;
  readonly lastRepoSignalSource?: unknown;
  readonly lastRepoSignalSummary?: unknown;
  readonly createdAt?: unknown;
  readonly updatedAt?: unknown;
}

interface MatrixIngestPayload {
  readonly mergedAt: string;
  readonly commitSha: string;
  readonly source: string;
  readonly workflow: string | null;
  readonly branch: string | null;
  readonly summary: string | null;
  readonly changedFiles: readonly string[];
  readonly impactedEntryIds: readonly string[];
}

function normalizeString(value: unknown, maxLength = 1000): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeStatus(value: unknown): MatrixStatus {
  return value === 'oui' || value === 'partiel' || value === 'non' || value === 'hors MVP'
    ? value
    : 'non';
}

function normalizePriority(value: unknown): MatrixPriority {
  return value === 'basse' || value === 'moyenne' || value === 'haute' ? value : 'moyenne';
}

function normalizeBucket(value: unknown): MatrixBucket {
  return value === 'covered' ||
    value === 'proof-gap' ||
    value === 'product-gap' ||
    value === 'scope-limit'
    ? value
    : 'proof-gap';
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizeEvidence(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function normalizeFindManyResult<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function toMatrixEntryResponse(entity: MatrixEntryEntity) {
  return {
    id: normalizeString(entity.entryId) ?? '',
    domain: normalizeString(entity.domain) ?? '',
    need: normalizeString(entity.need) ?? '',
    summaryStatus: normalizeStatus(entity.summaryStatus),
    businessStatus: normalizeStatus(entity.businessStatus),
    implementationStatus: normalizeStatus(entity.implementationStatus),
    e2eStatus: normalizeStatus(entity.e2eStatus),
    priority: normalizePriority(entity.priority),
    managementBucket: normalizeBucket(entity.managementBucket),
    needsProductWorkFirst: Boolean(entity.needsProductWorkFirst),
    observedGap: normalizeString(entity.observedGap) ?? '',
    nextMove: normalizeString(entity.nextMove) ?? '',
    evidence: normalizeEvidence(entity.evidence),
    reviewedAt: normalizeDate(entity.reviewedAt)?.slice(0, 10) ?? EMPTY_GENERATED_AT.slice(0, 10),
    repoSignalAt: normalizeDate(entity.lastRepoSignalAt),
    repoSignalCommit: normalizeString(entity.lastRepoSignalCommit),
    repoSignalSource: normalizeString(entity.lastRepoSignalSource),
    repoSignalSummary: normalizeString(entity.lastRepoSignalSummary),
  };
}

function parseBearerToken(ctx: Context): string | null {
  const header = ctx.request.header.authorization;
  if (typeof header !== 'string') {
    return null;
  }

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function requireIngestToken(ctx: Context): boolean {
  const configuredToken = process.env.STRAPI_ADMIN_QUALITY_INGEST_TOKEN?.trim();
  if (!configuredToken) {
    ctx.internalServerError('admin.quality.matrix.ingest.token-missing');
    return false;
  }

  const receivedToken = parseBearerToken(ctx);
  if (!receivedToken || receivedToken !== configuredToken) {
    ctx.unauthorized();
    return false;
  }

  return true;
}

function sanitizeIngestPayload(body: unknown): MatrixIngestPayload {
  const record = body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};

  const mergedAt = normalizeDate(record.mergedAt) ?? new Date().toISOString();
  const commitSha = normalizeString(record.commitSha) ?? '';
  const source = normalizeString(record.source) ?? 'github-actions';
  const workflow = normalizeString(record.workflow);
  const branch = normalizeString(record.branch);
  const summary = normalizeString(record.summary, 1000);
  const changedFiles = normalizeStringArray(record.changedFiles);
  const impactedEntryIds = Array.from(new Set(normalizeStringArray(record.impactedEntryIds)));

  if (!commitSha) {
    throw new Error('commitSha is required.');
  }

  return {
    mergedAt,
    commitSha,
    source,
    workflow,
    branch,
    summary,
    changedFiles,
    impactedEntryIds,
  };
}

async function findEntryByEntryId(
  strapi: Core.Strapi,
  entryId: string,
): Promise<MatrixEntryEntity | null> {
  const existing = await strapi.entityService.findMany(MATRIX_ENTRY_UID, {
    filters: { entryId },
    limit: 1,
  });

  return (normalizeFindManyResult(existing)[0] as MatrixEntryEntity | undefined) ?? null;
}

function sourceStatusFor(generatedAt: string): MatrixSourceStatus {
  const generatedTime = new Date(generatedAt).getTime();
  if (!Number.isFinite(generatedTime)) {
    return 'fallback';
  }

  const ageDays = (Date.now() - generatedTime) / MS_PER_DAY;
  return ageDays > STALE_AFTER_DAYS ? 'stale' : 'fresh';
}

function sourceMessageFor(generatedAt: string): string | null {
  const generatedTime = new Date(generatedAt).getTime();
  if (!Number.isFinite(generatedTime)) {
    return 'La date de generation de la matrice QA est invalide.';
  }

  const ageDays = Math.floor((Date.now() - generatedTime) / MS_PER_DAY);
  if (ageDays <= STALE_AFTER_DAYS) {
    return null;
  }

  return `La matrice QA date de ${ageDays} jours; relancer l'audit ou la revue avant arbitrage final.`;
}

function resolveGeneratedAt(entries: readonly MatrixEntryEntity[]): string {
  const timestamps = entries
    .flatMap((entry) => [normalizeDate(entry.updatedAt), normalizeDate(entry.createdAt), normalizeDate(entry.reviewedAt)])
    .filter((value): value is string => value !== null)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return EMPTY_GENERATED_AT;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async snapshot(ctx: Context) {
    const rawEntries = await strapi.entityService.findMany(MATRIX_ENTRY_UID, {
      sort: ['priority:desc', 'domain:asc'],
      limit: 500,
    });

    const entries = normalizeFindManyResult(rawEntries) as MatrixEntryEntity[];
    const generatedAt = resolveGeneratedAt(entries);

    ctx.body = {
      data: {
        generatedAt,
        sourceStatus: sourceStatusFor(generatedAt),
        sourceMessage: sourceMessageFor(generatedAt),
        entries: entries.map((entry) => toMatrixEntryResponse(entry)),
      },
    };
  },

  async ingest(ctx: Context) {
    if (!requireIngestToken(ctx)) {
      return;
    }

    try {
      const payload = sanitizeIngestPayload(ctx.request.body);
      const updatedEntryIds: string[] = [];
      const signalSummary = [
        payload.summary,
        payload.workflow ? `workflow=${payload.workflow}` : null,
        payload.branch ? `branch=${payload.branch}` : null,
        payload.changedFiles.length ? `${payload.changedFiles.length} fichiers modifies` : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join(' | ')
        .slice(0, 1000);

      for (const entryId of payload.impactedEntryIds) {
        const existing = await findEntryByEntryId(strapi, entryId);
        if (!existing?.id) {
          continue;
        }

        await strapi.entityService.update(MATRIX_ENTRY_UID, existing.id, {
          data: {
            lastRepoSignalAt: payload.mergedAt,
            lastRepoSignalCommit: payload.commitSha,
            lastRepoSignalSource: payload.source,
            lastRepoSignalSummary: signalSummary,
          } as any,
        });
        updatedEntryIds.push(entryId);
      }

      ctx.body = {
        data: {
          mergedAt: payload.mergedAt,
          commitSha: payload.commitSha,
          updatedEntryIds,
          ignoredEntryIds: payload.impactedEntryIds.filter((entryId) => !updatedEntryIds.includes(entryId)),
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid admin quality matrix ingest payload.';
      ctx.badRequest(message);
    }
  },
});