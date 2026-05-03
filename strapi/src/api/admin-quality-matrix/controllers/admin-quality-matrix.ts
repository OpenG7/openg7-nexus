import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';

const MATRIX_ENTRY_UID = 'api::admin-quality-matrix.admin-quality-matrix-entry' as any;
const MISSION_DECISION_UID =
  'api::admin-quality-mission-decision.admin-quality-mission-decision' as any;
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

interface MatrixRecalculatePayload {
  readonly scope: 'refresh-required' | 'selected-entry' | 'all';
  readonly entryId: string | null;
}

interface MatrixApplyProposalPayload {
  readonly entryId: string;
}

interface MissionDecisionEntity {
  readonly id?: number | string;
  readonly entryId?: unknown;
  readonly status?: unknown;
  readonly title?: unknown;
  readonly message?: unknown;
  readonly operatorPrompt?: unknown;
  readonly createdAt?: unknown;
  readonly updatedAt?: unknown;
}

interface MatrixCoverageState {
  readonly summaryStatus: MatrixStatus;
  readonly businessStatus: MatrixStatus;
  readonly implementationStatus: MatrixStatus;
  readonly e2eStatus: MatrixStatus;
  readonly managementBucket: MatrixBucket;
  readonly needsProductWorkFirst: boolean;
}

type MatrixRecalculationResult =
  | 'unchanged'
  | 'proposal-review-required'
  | 'blocked-insufficient-proof'
  | 'blocked-conflicting-signals';

type MatrixRecalculationConfidence = 'low' | 'medium' | 'high';

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

function normalizeBoolean(value: unknown): boolean {
  return Boolean(value);
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

function toCoverageState(entity: MatrixEntryEntity): MatrixCoverageState {
  return {
    summaryStatus: normalizeStatus(entity.summaryStatus),
    businessStatus: normalizeStatus(entity.businessStatus),
    implementationStatus: normalizeStatus(entity.implementationStatus),
    e2eStatus: normalizeStatus(entity.e2eStatus),
    managementBucket: normalizeBucket(entity.managementBucket),
    needsProductWorkFirst: normalizeBoolean(entity.needsProductWorkFirst),
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

function sanitizeRecalculatePayload(body: unknown): MatrixRecalculatePayload {
  const record =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const scope = normalizeString(record.scope, 40);
  const entryId = normalizeString(record.entryId, 180);

  if (scope === 'selected-entry' && !entryId) {
    throw new Error('entryId is required when scope=selected-entry.');
  }

  return {
    scope:
      scope === 'selected-entry' || scope === 'all' || scope === 'refresh-required'
        ? scope
        : 'refresh-required',
    entryId,
  };
}

function sanitizeApplyProposalPayload(body: unknown): MatrixApplyProposalPayload {
  const record =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const entryId = normalizeString(record.entryId, 180);

  if (!entryId) {
    throw new Error('entryId is required.');
  }

  return { entryId };
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

function reviewedAtDeadline(entry: MatrixEntryEntity): number | null {
  const reviewedAt = normalizeString(entry.reviewedAt, 40);
  if (!reviewedAt) {
    return null;
  }

  const timestamp = Date.parse(`${reviewedAt}T23:59:59.999Z`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function missionDecisionTimestamp(decision: MissionDecisionEntity | null | undefined): number | null {
  if (!decision) {
    return null;
  }

  const updatedAt = normalizeDate(decision.updatedAt);
  if (updatedAt) {
    return new Date(updatedAt).getTime();
  }

  const createdAt = normalizeDate(decision.createdAt);
  return createdAt ? new Date(createdAt).getTime() : null;
}

function statusRank(status: MatrixStatus): number {
  switch (status) {
    case 'oui':
      return 3;
    case 'partiel':
      return 2;
    case 'hors MVP':
      return 1;
    default:
      return 0;
  }
}

function statusFromRank(rank: number): MatrixStatus {
  if (rank >= 3) {
    return 'oui';
  }
  if (rank === 2) {
    return 'partiel';
  }
  if (rank === 1) {
    return 'hors MVP';
  }
  return 'non';
}

function escalateStatus(status: MatrixStatus, steps = 1): MatrixStatus {
  if (status === 'hors MVP') {
    return status;
  }

  return statusFromRank(Math.min(3, statusRank(status) + Math.max(steps, 0)));
}

function summarizeStatus(state: MatrixCoverageState): MatrixStatus {
  if (
    state.summaryStatus === 'hors MVP' &&
    state.businessStatus === 'hors MVP' &&
    state.implementationStatus === 'hors MVP' &&
    state.e2eStatus === 'hors MVP'
  ) {
    return 'hors MVP';
  }

  const ranks = [
    state.businessStatus,
    state.implementationStatus,
    state.e2eStatus,
  ]
    .filter((status) => status !== 'hors MVP')
    .map((status) => statusRank(status));

  if (!ranks.length) {
    return state.summaryStatus;
  }

  return statusFromRank(Math.min(...ranks));
}

function buildLatestCompletedDecisionByEntryId(
  decisions: readonly MissionDecisionEntity[],
): Map<string, MissionDecisionEntity> {
  const latestByEntryId = new Map<string, MissionDecisionEntity>();

  for (const decision of decisions) {
    const entryId = normalizeString(decision.entryId, 180);
    if (!entryId || normalizeString(decision.status, 40) !== 'done') {
      continue;
    }

    const current = latestByEntryId.get(entryId);
    const currentTimestamp = missionDecisionTimestamp(current);
    const nextTimestamp = missionDecisionTimestamp(decision);
    if (!current || (nextTimestamp ?? 0) > (currentTimestamp ?? 0)) {
      latestByEntryId.set(entryId, decision);
    }
  }

  return latestByEntryId;
}

function entryNeedsRecalculation(
  entry: MatrixEntryEntity,
  latestCompletedDecision: MissionDecisionEntity | null | undefined,
): boolean {
  const deadline = reviewedAtDeadline(entry);
  if (deadline == null) {
    return true;
  }

  const repoSignalAt = normalizeDate(entry.lastRepoSignalAt);
  const repoSignalTimestamp = repoSignalAt ? new Date(repoSignalAt).getTime() : Number.NaN;
  if (Number.isFinite(repoSignalTimestamp) && repoSignalTimestamp > deadline) {
    return true;
  }

  const decisionTimestamp = missionDecisionTimestamp(latestCompletedDecision);
  return decisionTimestamp != null && decisionTimestamp > deadline;
}

function hasCoverageDelta(current: MatrixCoverageState, proposed: MatrixCoverageState): boolean {
  return (
    current.summaryStatus !== proposed.summaryStatus ||
    current.businessStatus !== proposed.businessStatus ||
    current.implementationStatus !== proposed.implementationStatus ||
    current.e2eStatus !== proposed.e2eStatus ||
    current.managementBucket !== proposed.managementBucket ||
    current.needsProductWorkFirst !== proposed.needsProductWorkFirst
  );
}

function buildRecalculationEntry(
  entry: MatrixEntryEntity,
  latestCompletedDecision: MissionDecisionEntity | null | undefined,
) {
  const current = toCoverageState(entry);
  const deadline = reviewedAtDeadline(entry);
  const repoSignalAt = normalizeDate(entry.lastRepoSignalAt);
  const repoSignalTimestamp = repoSignalAt ? new Date(repoSignalAt).getTime() : Number.NaN;
  const repoSignalNewer = deadline == null || (Number.isFinite(repoSignalTimestamp) && repoSignalTimestamp > deadline);
  const decisionTimestamp = missionDecisionTimestamp(latestCompletedDecision);
  const completedDecisionNewer = deadline == null || (decisionTimestamp != null && decisionTimestamp > deadline);
  const decisionTitle = normalizeString(latestCompletedDecision?.title, 220);
  const decisionMessage = normalizeString(latestCompletedDecision?.message, 1_000);
  const decisionPrompt = normalizeString(latestCompletedDecision?.operatorPrompt, 2_000);
  const reasons: string[] = [];
  const evidence = [
    ...normalizeEvidence(entry.evidence),
    normalizeString(entry.lastRepoSignalSummary, 1_000),
    decisionTitle,
    decisionMessage,
  ].filter((value): value is string => Boolean(value));

  if (repoSignalNewer) {
    reasons.push('Un signal repo plus recent que la derniere revue a ete detecte.');
  }
  if (completedDecisionNewer) {
    reasons.push('Une mission marquee done est plus recente que la derniere revue.');
  }

  if (!repoSignalNewer && !completedDecisionNewer) {
    return {
      entryId: normalizeString(entry.entryId, 180) ?? '',
      domain: normalizeString(entry.domain, 240) ?? '',
      result: 'unchanged' as MatrixRecalculationResult,
      confidence: 'low' as MatrixRecalculationConfidence,
      current,
      proposed: null,
      reasons: ['Aucun signal plus recent que reviewedAt.'],
      evidence,
      factualSignals: {
        reviewedAt: normalizeString(entry.reviewedAt, 40),
        repoSignalAt,
        repoSignalCommit: normalizeString(entry.lastRepoSignalCommit, 180),
        repoSignalSource: normalizeString(entry.lastRepoSignalSource, 180),
        latestDecisionAt:
          decisionTimestamp == null ? null : new Date(decisionTimestamp).toISOString(),
      },
    };
  }

  if (repoSignalNewer && !completedDecisionNewer) {
    return {
      entryId: normalizeString(entry.entryId, 180) ?? '',
      domain: normalizeString(entry.domain, 240) ?? '',
      result: 'blocked-insufficient-proof' as MatrixRecalculationResult,
      confidence: 'low' as MatrixRecalculationConfidence,
      current,
      proposed: null,
      reasons: [
        ...reasons,
        'Le merge ne suffit pas a promouvoir les statuts sans preuve QA ou validation humaine.',
      ],
      evidence,
      factualSignals: {
        reviewedAt: normalizeString(entry.reviewedAt, 40),
        repoSignalAt,
        repoSignalCommit: normalizeString(entry.lastRepoSignalCommit, 180),
        repoSignalSource: normalizeString(entry.lastRepoSignalSource, 180),
        latestDecisionAt: null,
      },
    };
  }

  let proposedImplementationStatus = current.implementationStatus;
  if (completedDecisionNewer) {
    proposedImplementationStatus = escalateStatus(
      current.implementationStatus,
      repoSignalNewer ? 2 : 1,
    );
  }

  let proposedE2EStatus = current.e2eStatus;
  if (completedDecisionNewer && repoSignalNewer) {
    proposedE2EStatus = escalateStatus(current.e2eStatus, 1);
  }

  const proposedBase: MatrixCoverageState = {
    summaryStatus: current.summaryStatus,
    businessStatus: current.businessStatus,
    implementationStatus: proposedImplementationStatus,
    e2eStatus: proposedE2EStatus,
    managementBucket: current.managementBucket,
    needsProductWorkFirst: current.needsProductWorkFirst,
  };
  const proposedSummaryStatus = summarizeStatus(proposedBase);
  const proposedManagementBucket =
    proposedSummaryStatus === 'oui' && proposedBase.e2eStatus === 'oui'
      ? 'covered'
      : proposedBase.needsProductWorkFirst && !repoSignalNewer
        ? 'product-gap'
        : 'proof-gap';
  const proposed: MatrixCoverageState = {
    ...proposedBase,
    summaryStatus: proposedSummaryStatus,
    managementBucket: proposedManagementBucket,
  };

  return {
    entryId: normalizeString(entry.entryId, 180) ?? '',
    domain: normalizeString(entry.domain, 240) ?? '',
    result: hasCoverageDelta(current, proposed)
      ? ('proposal-review-required' as MatrixRecalculationResult)
      : ('unchanged' as MatrixRecalculationResult),
    confidence: repoSignalNewer && decisionPrompt ? 'high' : 'medium',
    current,
    proposed,
    reasons: decisionPrompt
      ? [...reasons, 'Le prompt operateur renforce la confiance sur le retour de mission.']
      : reasons,
    evidence,
    factualSignals: {
      reviewedAt: normalizeString(entry.reviewedAt, 40),
      repoSignalAt,
      repoSignalCommit: normalizeString(entry.lastRepoSignalCommit, 180),
      repoSignalSource: normalizeString(entry.lastRepoSignalSource, 180),
      latestDecisionAt:
        decisionTimestamp == null ? null : new Date(decisionTimestamp).toISOString(),
    },
  };
}

async function findLatestCompletedDecisionForEntry(
  strapi: Core.Strapi,
  entryId: string,
): Promise<MissionDecisionEntity | null> {
  const decisions = await strapi.entityService.findMany(MISSION_DECISION_UID, {
    filters: {
      entryId,
      status: 'done',
    },
    sort: ['updatedAt:desc'],
    limit: 10,
  });

  return (normalizeFindManyResult(decisions)[0] as MissionDecisionEntity | undefined) ?? null;
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

  async recalculate(ctx: Context) {
    try {
      const payload = sanitizeRecalculatePayload(ctx.request.body);
      const rawEntries = await strapi.entityService.findMany(MATRIX_ENTRY_UID, {
        sort: ['priority:desc', 'domain:asc'],
        limit: 500,
      });
      const rawDecisions = await strapi.entityService.findMany(MISSION_DECISION_UID, {
        sort: ['updatedAt:desc'],
        limit: 1_000,
      });

      const entries = normalizeFindManyResult(rawEntries) as MatrixEntryEntity[];
      const latestCompletedDecisionByEntryId = buildLatestCompletedDecisionByEntryId(
        normalizeFindManyResult(rawDecisions) as MissionDecisionEntity[],
      );

      const scopedEntries = entries.filter((entry) => {
        const entryId = normalizeString(entry.entryId, 180);
        if (!entryId) {
          return false;
        }

        if (payload.scope === 'all') {
          return true;
        }

        if (payload.scope === 'selected-entry') {
          return entryId === payload.entryId;
        }

        return entryNeedsRecalculation(entry, latestCompletedDecisionByEntryId.get(entryId));
      });

      const recalculatedEntries = scopedEntries.map((entry) =>
        buildRecalculationEntry(
          entry,
          latestCompletedDecisionByEntryId.get(normalizeString(entry.entryId, 180) ?? ''),
        ),
      );

      ctx.body = {
        data: {
          generatedAt: new Date().toISOString(),
          scope: payload.scope,
          summary: {
            analyzedCount: recalculatedEntries.length,
            proposalCount: recalculatedEntries.filter(
              (entry) => entry.result === 'proposal-review-required',
            ).length,
            unchangedCount: recalculatedEntries.filter((entry) => entry.result === 'unchanged')
              .length,
            blockedCount: recalculatedEntries.filter((entry) => entry.result.startsWith('blocked-'))
              .length,
          },
          entries: recalculatedEntries,
        },
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Invalid admin quality matrix recalculation payload.';
      ctx.badRequest(message);
    }
  },

  async applyProposal(ctx: Context) {
    try {
      const payload = sanitizeApplyProposalPayload(ctx.request.body);
      const entry = await findEntryByEntryId(strapi, payload.entryId);
      if (!entry?.id) {
        ctx.notFound('admin.quality.matrix.entry-not-found');
        return;
      }

      const latestDecision = await findLatestCompletedDecisionForEntry(strapi, payload.entryId);
      const proposal = buildRecalculationEntry(entry, latestDecision);

      if (proposal.result !== 'proposal-review-required' || !proposal.proposed) {
        ctx.badRequest('No applicable recalculation proposal is available for this entry.');
        return;
      }

      const appliedAt = new Date().toISOString();
      const updated = await strapi.entityService.update(MATRIX_ENTRY_UID, entry.id, {
        data: {
          summaryStatus: proposal.proposed.summaryStatus,
          businessStatus: proposal.proposed.businessStatus,
          implementationStatus: proposal.proposed.implementationStatus,
          e2eStatus: proposal.proposed.e2eStatus,
          managementBucket: proposal.proposed.managementBucket,
          needsProductWorkFirst: proposal.proposed.needsProductWorkFirst,
          reviewedAt: appliedAt.slice(0, 10),
        } as any,
      });

      ctx.body = {
        data: {
          appliedAt,
          entry: toMatrixEntryResponse(updated as MatrixEntryEntity),
          proposal,
        },
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Invalid admin quality matrix apply-proposal payload.';
      ctx.badRequest(message);
    }
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