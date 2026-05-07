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
type MatrixSignalId =
  | 'summary'
  | 'business'
  | 'implementation'
  | 'e2e'
  | 'readiness'
  | 'priority';
type MatrixSignalConfirmationSource =
  | 'repo-signal'
  | 'proof-returned'
  | 'done'
  | 'pull-request-merged';
type MatrixCoverageSignalId = 'summary' | 'business' | 'implementation' | 'e2e';

interface MatrixSignalDispatchState {
  readonly pending: boolean;
  readonly requestedAt: string | null;
  readonly confirmedAt: string | null;
  readonly confirmationSource: MatrixSignalConfirmationSource | null;
  readonly workflow: string | null;
  readonly ref: string | null;
}

type MatrixSignalDispatchSnapshot = Partial<Record<MatrixSignalId, MatrixSignalDispatchState>>;

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
  readonly metadata?: unknown;
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

const COVERAGE_SIGNAL_IDS: readonly MatrixCoverageSignalId[] = [
  'summary',
  'business',
  'implementation',
  'e2e',
];

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

function normalizeInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
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

function normalizeObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeBoolean(value: unknown): boolean {
  return Boolean(value);
}

function normalizeSignalId(value: unknown): MatrixSignalId | null {
  return value === 'summary' ||
    value === 'business' ||
    value === 'implementation' ||
    value === 'e2e' ||
    value === 'readiness' ||
    value === 'priority'
    ? value
    : null;
}

function normalizeFindManyResult<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function toMatrixEntryResponse(
  entity: MatrixEntryEntity,
  signalDispatch: MatrixSignalDispatchSnapshot = {},
) {
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
    signalDispatch,
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

function coverageSignalLabel(signalId: MatrixCoverageSignalId): string {
  switch (signalId) {
    case 'summary':
      return 'Synthese';
    case 'business':
      return 'Metier';
    case 'implementation':
      return 'Implementation';
    default:
      return 'E2E';
  }
}

function signalConfirmedTimestamp(
  dispatchState: MatrixSignalDispatchState | null | undefined,
): number | null {
  if (!dispatchState?.confirmedAt) {
    return null;
  }

  const timestamp = new Date(dispatchState.confirmedAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function signalConfirmedAfterReview(
  dispatchState: MatrixSignalDispatchState | null | undefined,
  deadline: number | null,
): boolean {
  const timestamp = signalConfirmedTimestamp(dispatchState);
  if (timestamp == null) {
    return false;
  }

  return deadline == null || timestamp > deadline;
}

function signalEscalationSteps(
  signalId: MatrixCoverageSignalId,
  dispatchState: MatrixSignalDispatchState | null | undefined,
): number {
  switch (dispatchState?.confirmationSource) {
    case 'proof-returned':
    case 'done':
      return signalId === 'implementation' ? 2 : 1;
    case 'repo-signal':
    case 'pull-request-merged':
      return signalId === 'e2e' ? 0 : 1;
    default:
      return 0;
  }
}

function statusForSignal(state: MatrixCoverageState, signalId: MatrixCoverageSignalId): MatrixStatus {
  switch (signalId) {
    case 'summary':
      return state.summaryStatus;
    case 'business':
      return state.businessStatus;
    case 'implementation':
      return state.implementationStatus;
    default:
      return state.e2eStatus;
  }
}

function setStatusForSignal(
  state: MatrixCoverageState,
  signalId: MatrixCoverageSignalId,
  status: MatrixStatus,
): MatrixCoverageState {
  switch (signalId) {
    case 'summary':
      return { ...state, summaryStatus: status };
    case 'business':
      return { ...state, businessStatus: status };
    case 'implementation':
      return { ...state, implementationStatus: status };
    default:
      return { ...state, e2eStatus: status };
  }
}

function signalConfirmationReason(
  signalId: MatrixCoverageSignalId,
  dispatchState: MatrixSignalDispatchState,
): string {
  const label = coverageSignalLabel(signalId);

  switch (dispatchState.confirmationSource) {
    case 'proof-returned':
      return `${label} confirme par retour de preuve.`;
    case 'done':
      return `${label} confirme par mission terminee.`;
    case 'pull-request-merged':
      return `${label} confirme par pull request mergee.`;
    case 'repo-signal':
      return `${label} confirme par signal repo apres merge.`;
    default:
      return `${label} en attente de confirmation.`;
  }
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

function buildLatestSignalGuidanceByEntryId(
  decisions: readonly MissionDecisionEntity[],
): Map<string, Map<MatrixSignalId, MissionDecisionEntity>> {
  const latestByEntryId = new Map<string, Map<MatrixSignalId, MissionDecisionEntity>>();

  for (const decision of decisions) {
    const entryId = normalizeString(decision.entryId, 180);
    if (!entryId) {
      continue;
    }

    const metadata = normalizeObject(decision.metadata);
    if (normalizeString(metadata.traceType, 80) !== 'signal-guidance') {
      continue;
    }

    const signalId = normalizeSignalId(metadata.signalId);
    if (!signalId) {
      continue;
    }

    const existingBySignal = latestByEntryId.get(entryId) ?? new Map<MatrixSignalId, MissionDecisionEntity>();
    const current = existingBySignal.get(signalId);
    const currentTimestamp = missionDecisionTimestamp(current);
    const nextTimestamp = missionDecisionTimestamp(decision);
    if (!current || (nextTimestamp ?? 0) > (currentTimestamp ?? 0)) {
      existingBySignal.set(signalId, decision);
    }
    latestByEntryId.set(entryId, existingBySignal);
  }

  return latestByEntryId;
}

function buildLatestServerConfirmationByEntryId(
  decisions: readonly MissionDecisionEntity[],
): Map<string, MissionDecisionEntity> {
  const latestByEntryId = new Map<string, MissionDecisionEntity>();

  for (const decision of decisions) {
    const entryId = normalizeString(decision.entryId, 180);
    const status = normalizeString(decision.status, 40);
    if (!entryId || (status !== 'proof-returned' && status !== 'done')) {
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

function resolveSignalDispatchSnapshot(
  entry: MatrixEntryEntity,
  latestSignalGuidanceBySignal: Map<MatrixSignalId, MissionDecisionEntity> | undefined,
  latestServerConfirmation: MissionDecisionEntity | null | undefined,
): MatrixSignalDispatchSnapshot {
  if (!latestSignalGuidanceBySignal?.size) {
    return {};
  }

  const repoSignalAt = normalizeDate(entry.lastRepoSignalAt);
  const repoSignalTimestamp = repoSignalAt ? new Date(repoSignalAt).getTime() : null;
  const confirmationDecisionTimestamp = missionDecisionTimestamp(latestServerConfirmation);
  const confirmationDecisionStatus = normalizeString(latestServerConfirmation?.status, 40);
  const snapshot: MatrixSignalDispatchSnapshot = {};

  for (const [signalId, decision] of latestSignalGuidanceBySignal.entries()) {
    const requestedTimestamp = missionDecisionTimestamp(decision);
    const requestedAt = requestedTimestamp == null ? null : new Date(requestedTimestamp).toISOString();
    const metadata = normalizeObject(decision.metadata);
    const trackedPullRequestNumber = normalizeInteger(metadata.proofPullRequestNumber);
    const trackedProofBranch =
      normalizeString(metadata.proofPullRequestBranch, 200) ??
      normalizeString(metadata.proofBranch, 200);
    const trackedPullRequestMergedAt = normalizeDate(metadata.proofPullRequestMergedAt);
    const trackedPullRequestMergedTimestamp = trackedPullRequestMergedAt
      ? new Date(trackedPullRequestMergedAt).getTime()
      : null;
    const hasExactPullRequestTracking =
      trackedPullRequestNumber != null || (trackedProofBranch != null && trackedProofBranch.length > 0);

    let confirmedAt: string | null = null;
    let confirmationSource: MatrixSignalConfirmationSource | null = null;

    if (
      requestedTimestamp != null &&
      trackedPullRequestMergedTimestamp != null &&
      trackedPullRequestMergedTimestamp > requestedTimestamp
    ) {
      confirmedAt = new Date(trackedPullRequestMergedTimestamp).toISOString();
      confirmationSource = 'pull-request-merged';
    }

    if (
      !hasExactPullRequestTracking &&
      requestedTimestamp != null &&
      repoSignalTimestamp != null &&
      Number.isFinite(repoSignalTimestamp) &&
      repoSignalTimestamp > requestedTimestamp
    ) {
      confirmedAt = new Date(repoSignalTimestamp).toISOString();
      confirmationSource = 'repo-signal';
    }

    if (
      requestedTimestamp != null &&
      confirmationDecisionTimestamp != null &&
      confirmationDecisionTimestamp > requestedTimestamp
    ) {
      const nextConfirmedAt = new Date(confirmationDecisionTimestamp).toISOString();
      if (!confirmedAt || confirmationDecisionTimestamp > new Date(confirmedAt).getTime()) {
        confirmedAt = nextConfirmedAt;
        confirmationSource = confirmationDecisionStatus === 'proof-returned' ? 'proof-returned' : 'done';
      }
    }

    snapshot[signalId] = {
      pending: !confirmedAt,
      requestedAt,
      confirmedAt,
      confirmationSource,
      workflow: normalizeString(metadata.workflow, 160),
      ref: normalizeString(metadata.ref, 160),
    };
  }

  return snapshot;
}

function entryNeedsRecalculation(
  entry: MatrixEntryEntity,
  latestCompletedDecision: MissionDecisionEntity | null | undefined,
  signalDispatch: MatrixSignalDispatchSnapshot = {},
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
  if (decisionTimestamp != null && decisionTimestamp > deadline) {
    return true;
  }

  return COVERAGE_SIGNAL_IDS.some((signalId) =>
    signalConfirmedAfterReview(signalDispatch[signalId], deadline),
  );
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
  signalDispatch: MatrixSignalDispatchSnapshot = {},
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

  const signalDrivenReasons = COVERAGE_SIGNAL_IDS.flatMap((signalId) => {
    const dispatchState = signalDispatch[signalId];
    if (!dispatchState || !signalConfirmedAfterReview(dispatchState, deadline)) {
      return [];
    }

    return [signalConfirmationReason(signalId, dispatchState)];
  });

  if (signalDrivenReasons.length) {
    reasons.push(...signalDrivenReasons);
  }

  if (!repoSignalNewer && !completedDecisionNewer && !signalDrivenReasons.length) {
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

  const hasActionableSignalCoverage = COVERAGE_SIGNAL_IDS.some((signalId) => {
    const dispatchState = signalDispatch[signalId];
    return (
      dispatchState != null &&
      signalConfirmedAfterReview(dispatchState, deadline) &&
      signalEscalationSteps(signalId, dispatchState) > 0
    );
  });

  if (repoSignalNewer && !completedDecisionNewer && !hasActionableSignalCoverage) {
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

  let proposedBase: MatrixCoverageState = {
    summaryStatus: current.summaryStatus,
    businessStatus: current.businessStatus,
    implementationStatus: proposedImplementationStatus,
    e2eStatus: proposedE2EStatus,
    managementBucket: current.managementBucket,
    needsProductWorkFirst: current.needsProductWorkFirst,
  };

  for (const signalId of COVERAGE_SIGNAL_IDS) {
    const dispatchState = signalDispatch[signalId];
    if (!dispatchState || !signalConfirmedAfterReview(dispatchState, deadline)) {
      continue;
    }

    const steps = signalEscalationSteps(signalId, dispatchState);
    if (steps <= 0) {
      continue;
    }

    proposedBase = setStatusForSignal(
      proposedBase,
      signalId,
      escalateStatus(statusForSignal(proposedBase, signalId), steps),
    );
  }

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
    confidence:
      repoSignalNewer && (decisionPrompt || hasActionableSignalCoverage) ? 'high' : 'medium',
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
    const rawDecisions = await strapi.entityService.findMany(MISSION_DECISION_UID, {
      sort: ['updatedAt:desc'],
      limit: 1_000,
    });

    const entries = normalizeFindManyResult(rawEntries) as MatrixEntryEntity[];
    const decisions = normalizeFindManyResult(rawDecisions) as MissionDecisionEntity[];
    const latestSignalGuidanceByEntryId = buildLatestSignalGuidanceByEntryId(decisions);
    const latestServerConfirmationByEntryId = buildLatestServerConfirmationByEntryId(decisions);
    const generatedAt = resolveGeneratedAt(entries);

    ctx.body = {
      data: {
        generatedAt,
        sourceStatus: sourceStatusFor(generatedAt),
        sourceMessage: sourceMessageFor(generatedAt),
        entries: entries.map((entry) => {
          const entryId = normalizeString(entry.entryId, 180) ?? '';
          return toMatrixEntryResponse(
            entry,
            resolveSignalDispatchSnapshot(
              entry,
              latestSignalGuidanceByEntryId.get(entryId),
              latestServerConfirmationByEntryId.get(entryId),
            ),
          );
        }),
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
      const decisions = normalizeFindManyResult(rawDecisions) as MissionDecisionEntity[];
      const latestCompletedDecisionByEntryId = buildLatestCompletedDecisionByEntryId(decisions);
      const latestSignalGuidanceByEntryId = buildLatestSignalGuidanceByEntryId(decisions);
      const latestServerConfirmationByEntryId = buildLatestServerConfirmationByEntryId(decisions);

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

        return entryNeedsRecalculation(
          entry,
          latestCompletedDecisionByEntryId.get(entryId),
          resolveSignalDispatchSnapshot(
            entry,
            latestSignalGuidanceByEntryId.get(entryId),
            latestServerConfirmationByEntryId.get(entryId),
          ),
        );
      });

      const recalculatedEntries = scopedEntries.map((entry) =>
        buildRecalculationEntry(
          entry,
          latestCompletedDecisionByEntryId.get(normalizeString(entry.entryId, 180) ?? ''),
          resolveSignalDispatchSnapshot(
            entry,
            latestSignalGuidanceByEntryId.get(normalizeString(entry.entryId, 180) ?? ''),
            latestServerConfirmationByEntryId.get(normalizeString(entry.entryId, 180) ?? ''),
          ),
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

      const decisions = normalizeFindManyResult(
        await strapi.entityService.findMany(MISSION_DECISION_UID, {
          filters: {
            entryId: payload.entryId,
          },
          sort: ['updatedAt:desc'],
          limit: 50,
        }),
      ) as MissionDecisionEntity[];
      const latestDecision = buildLatestCompletedDecisionByEntryId(decisions).get(payload.entryId) ?? null;
      const proposal = buildRecalculationEntry(
        entry,
        latestDecision,
        resolveSignalDispatchSnapshot(
          entry,
          buildLatestSignalGuidanceByEntryId(decisions).get(payload.entryId),
          buildLatestServerConfirmationByEntryId(decisions).get(payload.entryId),
        ),
      );

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