import { readFileSync } from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { PassThrough } from 'node:stream';

import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';

const MATRIX_ENTRY_UID = 'api::admin-quality-matrix.admin-quality-matrix-entry' as any;
const MISSION_DECISION_UID =
  'api::admin-quality-mission-decision.admin-quality-mission-decision' as any;
const NEED_PROPOSAL_UID = 'api::admin-quality-need-proposal.admin-quality-need-proposal' as any;
const EMPTY_GENERATED_AT = '2026-04-11T00:00:00.000Z';
const STALE_AFTER_DAYS = 7;
const MS_PER_DAY = 86_400_000;

type MatrixStatus = 'oui' | 'partiel' | 'non' | 'hors MVP';
type MatrixPriority = 'basse' | 'moyenne' | 'haute';
type MatrixBucket = 'covered' | 'proof-gap' | 'product-gap' | 'scope-limit';
type MatrixDiscoveryConfidence = 'low' | 'medium' | 'high';
type MatrixSourceStatus = 'fresh' | 'stale' | 'fallback';
type MatrixImpactMode = 'provided' | 'targeted' | 'global' | 'none';
type MatrixRecalculationScope = 'refresh-required' | 'selected-entry' | 'all';
type MatrixSignalId = 'summary' | 'business' | 'implementation' | 'e2e' | 'readiness' | 'priority';
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
  readonly lastRepoSignalAt?: unknown;
  readonly lastRepoSignalCommit?: unknown;
  readonly lastRepoSignalSource?: unknown;
  readonly lastRepoSignalSummary?: unknown;
  readonly lastRecalculationAt?: unknown;
  readonly lastRecalculationScope?: unknown;
  readonly lastRecalculationAutomatic?: unknown;
  readonly lastRecalculationResult?: unknown;
  readonly lastRecalculationPlan?: unknown;
  readonly lastAppliedProposal?: unknown;
  readonly editHistory?: unknown;
  readonly agentObservedGap?: unknown;
  readonly agentNextMove?: unknown;
  readonly agentNarrativeGeneratedAt?: unknown;
  readonly agentNarrativeModel?: unknown;
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
  readonly proofManifest: MatrixProofManifest | null;
}

interface MatrixProofManifest {
  readonly commitSha: string | null;
  readonly workflowRunId: string | null;
  readonly workflow: string | null;
  readonly generatedAt: string;
  readonly entryIds: readonly string[];
  readonly checks: readonly string[];
  readonly specs: readonly string[];
  readonly artifactUrl: string | null;
  readonly status: string;
}

interface MatrixRecalculatePayload {
  readonly scope: MatrixRecalculationScope;
  readonly entryId: string | null;
}

interface MatrixApplyProposalPayload {
  readonly entryId: string;
}

interface MatrixImpactResolution {
  readonly entryIds: readonly string[];
  readonly mode: MatrixImpactMode;
  readonly reason: string;
}

interface MatrixImpactRule {
  readonly entryIds: readonly string[];
  readonly prefixes: readonly string[];
}

interface MatrixImpactMap {
  readonly rules: readonly MatrixImpactRule[];
  readonly globalPrefixes: readonly string[];
}

interface MatrixIngestImpactResolution {
  readonly providedEntryIds: readonly string[];
  readonly derivedEntryIds: readonly string[];
  readonly resolvedEntryIds: readonly string[];
  readonly impactMode: MatrixImpactMode;
  readonly impactReason: string;
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

interface MatrixNeedProposalEntity {
  readonly id?: number | string;
  readonly proposalId?: unknown;
  readonly entryId?: unknown;
  readonly type?: unknown;
  readonly status?: unknown;
  readonly confidence?: unknown;
  readonly title?: unknown;
  readonly summary?: unknown;
  readonly source?: unknown;
  readonly payload?: unknown;
  readonly history?: unknown;
  readonly correlationId?: unknown;
  readonly reportedAt?: unknown;
  readonly createdAt?: unknown;
  readonly updatedAt?: unknown;
}

interface MatrixNeedProposalPayload {
  readonly proposalId: string;
  readonly entryId: string;
  readonly type: MatrixNeedProposalType;
  readonly status: MatrixNeedProposalStatus;
  readonly confidence: MatrixDiscoveryConfidence;
  readonly title: string | null;
  readonly summary: string | null;
  readonly source: Record<string, unknown>;
  readonly payload: Record<string, unknown>;
}

interface MatrixNeedProposalsIngestPayload {
  readonly generatedAt: string;
  readonly correlationId: string;
  readonly source: string;
  readonly proposals: readonly MatrixNeedProposalPayload[];
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
type MatrixPilotPriority = 'now' | 'next' | 'later' | 'blocked';
type MatrixPilotBucket =
  | 'ready-to-build'
  | 'needs-proof'
  | 'needs-product-call'
  | 'blocked-by-api'
  | 'ready-to-close';
type MatrixPilotActionType =
  | 'implement-feature'
  | 'add-test'
  | 'fix-proof-gap'
  | 'update-contract'
  | 'run-validation'
  | 'review-product-scope'
  | 'close-entry';
type MatrixNeedProposalType = 'add-source-ref' | 'create-entry' | 'mark-stale' | 'suggest-narrative';
type MatrixNarrativeField = 'observedGap' | 'nextMove' | 'managementBucket' | 'needsProductWorkFirst' | 'priority';
type MatrixNeedProposalStatus = 'proposed' | 'accepted' | 'rejected' | 'superseded';

interface MatrixDevelopmentCommand {
  readonly score: number;
  readonly bucket: MatrixPilotBucket;
  readonly priority: MatrixPilotPriority;
  readonly actionType: MatrixPilotActionType;
  readonly rationale: readonly string[];
  readonly targetFiles: readonly string[];
  readonly acceptanceCriteria: readonly string[];
  readonly suggestedCommands: readonly string[];
  readonly expectedEvidence: readonly string[];
  readonly blockingReason: string | null;
}

interface MatrixRecalculationEntryResponse {
  readonly entryId: string;
  readonly domain: string;
  readonly result: MatrixRecalculationResult;
  readonly confidence: MatrixRecalculationConfidence;
  readonly current: MatrixCoverageState;
  readonly proposed: MatrixCoverageState | null;
  readonly reasons: readonly string[];
  readonly evidence: readonly string[];
  readonly factualSignals: {
    readonly reviewedAt: string | null;
    readonly repoSignalAt: string | null;
    readonly repoSignalCommit: string | null;
    readonly repoSignalSource: string | null;
    readonly latestDecisionAt: string | null;
  };
  readonly pilot: MatrixDevelopmentCommand;
}

const COVERAGE_SIGNAL_IDS: readonly MatrixCoverageSignalId[] = [
  'summary',
  'business',
  'implementation',
  'e2e',
];

function matrixImpactMapPath(): string {
  const candidates = [
    path.resolve(process.cwd(), '..', 'tools', 'admin-quality-matrix-impact-map.json'),
    path.resolve(process.cwd(), 'tools', 'admin-quality-matrix-impact-map.json'),
    path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      '..',
      'tools',
      'admin-quality-matrix-impact-map.json',
    ),
    path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      '..',
      '..',
      'tools',
      'admin-quality-matrix-impact-map.json',
    ),
  ];

  for (const candidate of candidates) {
    try {
      readFileSync(candidate, 'utf8');
      return candidate;
    } catch {
      // Try the next runtime layout candidate.
    }
  }

  return candidates[0];
}

function normalizeImpactMapRule(value: unknown): MatrixImpactRule | null {
  const record = normalizeObject(value);
  const entryIds = normalizeStringArray(record.entryIds);
  const prefixes = normalizeStringArray(record.prefixes);
  if (!entryIds.length || !prefixes.length) {
    return null;
  }

  return { entryIds, prefixes };
}

function loadMatrixImpactMap(): MatrixImpactMap {
  const raw = readFileSync(matrixImpactMapPath(), 'utf8');
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const rules = Array.isArray(parsed.rules)
    ? parsed.rules
        .map((rule) => normalizeImpactMapRule(rule))
        .filter((rule): rule is MatrixImpactRule => rule !== null)
    : [];

  return {
    rules,
    globalPrefixes: normalizeStringArray(parsed.globalPrefixes),
  };
}

const MATRIX_IMPACT_MAP = loadMatrixImpactMap();

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

function normalizeDiscoveryConfidence(value: unknown): MatrixDiscoveryConfidence {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'medium';
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

  return value.filter(
    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
  );
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
  );
}

function normalizeObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeJsonObjects(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeObject(item)).filter((item) => Object.keys(item).length > 0);
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

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0))).sort();
}

function matchesMatrixPrefix(file: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => file === prefix || file.startsWith(prefix));
}

function resolveChangedFileImpact(
  changedFiles: readonly string[],
  knownEntryIds: readonly string[],
): MatrixImpactResolution {
  if (!changedFiles.length) {
    return {
      entryIds: [],
      mode: 'none',
      reason: 'No changed file provided.',
    };
  }

  const matchedEntryIds = new Set<string>();
  let requiresGlobalRefresh = false;
  let touchedProductCode = false;

  for (const file of changedFiles) {
    if (matchesMatrixPrefix(file, MATRIX_IMPACT_MAP.globalPrefixes)) {
      requiresGlobalRefresh = true;
    }

    if (file.startsWith('openg7-org/src/') || file.startsWith('strapi/src/')) {
      touchedProductCode = true;
    }

    for (const rule of MATRIX_IMPACT_MAP.rules) {
      if (matchesMatrixPrefix(file, rule.prefixes)) {
        rule.entryIds.forEach((entryId) => matchedEntryIds.add(entryId));
      }
    }
  }

  if (requiresGlobalRefresh || (touchedProductCode && matchedEntryIds.size === 0)) {
    return {
      entryIds: uniqueSorted(knownEntryIds),
      mode: 'global',
      reason: requiresGlobalRefresh
        ? 'Global matrix infrastructure changed.'
        : 'Product code changed without a specific impact mapping.',
    };
  }

  return {
    entryIds: uniqueSorted(Array.from(matchedEntryIds)),
    mode: matchedEntryIds.size > 0 ? 'targeted' : 'none',
    reason:
      matchedEntryIds.size > 0
        ? 'Targeted impact map matched changed files.'
        : 'No matrix-impacting file detected.',
  };
}

function resolveIngestImpact(
  payload: MatrixIngestPayload,
  knownEntryIds: readonly string[],
): MatrixIngestImpactResolution {
  const fileImpact = resolveChangedFileImpact(payload.changedFiles, knownEntryIds);
  const providedEntryIds = uniqueSorted(payload.impactedEntryIds);
  const derivedEntryIds = uniqueSorted(fileImpact.entryIds);
  const resolvedEntryIds = uniqueSorted([...providedEntryIds, ...derivedEntryIds]);

  if (fileImpact.mode === 'none' && providedEntryIds.length) {
    return {
      providedEntryIds,
      derivedEntryIds,
      resolvedEntryIds,
      impactMode: 'provided',
      impactReason: 'Explicit impacted entry ids provided.',
    };
  }

  return {
    providedEntryIds,
    derivedEntryIds,
    resolvedEntryIds,
    impactMode: fileImpact.mode,
    impactReason: fileImpact.reason,
  };
}

function normalizeRecalculationScope(value: unknown): MatrixRecalculationScope | null {
  return value === 'selected-entry' || value === 'all' || value === 'refresh-required'
    ? value
    : null;
}

function toStoredRecalculationResponse(entity: MatrixEntryEntity) {
  const plan = normalizeObject(entity.lastRecalculationPlan);
  const entry = normalizeObject(plan.entry);
  const generatedAt = normalizeDate(plan.generatedAt) ?? normalizeDate(entity.lastRecalculationAt);
  const scope =
    normalizeRecalculationScope(plan.scope) ??
    normalizeRecalculationScope(entity.lastRecalculationScope);

  if (!generatedAt || !scope || !Object.keys(entry).length) {
    return null;
  }

  return {
    generatedAt,
    scope,
    automatic:
      typeof plan.automatic === 'boolean'
        ? plan.automatic
        : normalizeBoolean(entity.lastRecalculationAutomatic),
    entry,
  };
}

function toMatrixEntryResponse(
  entity: MatrixEntryEntity,
  signalDispatch: MatrixSignalDispatchSnapshot = {},
) {
  return {
    id: normalizeString(entity.entryId) ?? '',
    domain: normalizeString(entity.domain) ?? '',
    need: normalizeString(entity.need) ?? '',
    acceptanceCriteria: normalizeStringArray(entity.acceptanceCriteria),
    sourceRefs: normalizeJsonObjects(entity.sourceRefs),
    impactRules: normalizeJsonObjects(entity.impactRules),
    confidence: normalizeDiscoveryConfidence(entity.confidence),
    lastDiscoveredAt: normalizeDate(entity.lastDiscoveredAt)?.slice(0, 10) ?? null,
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
    lastRecalculation: toStoredRecalculationResponse(entity),
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

function sanitizeProofManifest(value: unknown): MatrixProofManifest | null {
  const record = normalizeObject(value);
  if (!Object.keys(record).length) {
    return null;
  }

  const entryIds = uniqueSorted(normalizeStringArray(record.entryIds));
  if (!entryIds.length) {
    return null;
  }

  return {
    commitSha: normalizeString(record.commitSha, 180),
    workflowRunId:
      normalizeString(record.workflowRunId, 120) ?? normalizeString(record.workflowRunNumber, 120),
    workflow: normalizeString(record.workflow, 180),
    generatedAt: normalizeDate(record.generatedAt) ?? new Date().toISOString(),
    entryIds,
    checks: normalizeStringArray(record.checks),
    specs: normalizeStringArray(record.specs),
    artifactUrl: normalizeString(record.artifactUrl, 500),
    status: normalizeString(record.status, 80) ?? 'unknown',
  };
}

function sanitizeIngestPayload(body: unknown): MatrixIngestPayload {
  const record =
    body && typeof body === 'object' && !Array.isArray(body)
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
  const proofManifest = sanitizeProofManifest(record.proofManifest);

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
    proofManifest,
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

  const normalizedScope = normalizeRecalculationScope(scope);

  return {
    scope: normalizedScope ?? 'refresh-required',
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

function normalizeNeedProposalType(value: unknown): MatrixNeedProposalType | null {
  return value === 'add-source-ref' ||
    value === 'create-entry' ||
    value === 'mark-stale' ||
    value === 'suggest-narrative'
    ? value
    : null;
}

function normalizeNarrativeField(value: unknown): MatrixNarrativeField | null {
  return value === 'observedGap' ||
    value === 'nextMove' ||
    value === 'managementBucket' ||
    value === 'needsProductWorkFirst' ||
    value === 'priority'
    ? value
    : null;
}

function normalizeNeedProposalStatus(value: unknown): MatrixNeedProposalStatus {
  return value === 'accepted' || value === 'rejected' || value === 'superseded'
    ? value
    : 'proposed';
}

function sanitizeNeedProposal(value: unknown): MatrixNeedProposalPayload | null {
  const record = normalizeObject(value);
  const proposalId = normalizeString(record.proposalId, 240);
  const entryId = normalizeString(record.entryId, 180);
  const type = normalizeNeedProposalType(record.type);
  if (!proposalId || !entryId || !type) {
    return null;
  }

  return {
    proposalId,
    entryId,
    type,
    status: normalizeNeedProposalStatus(record.status),
    confidence: normalizeDiscoveryConfidence(record.confidence),
    title: normalizeString(record.title, 220),
    summary: normalizeString(record.summary, 2_000),
    source: normalizeObject(record.source),
    payload: normalizeObject(record.payload),
  };
}

function sanitizeNeedProposalsIngestPayload(body: unknown): MatrixNeedProposalsIngestPayload {
  const record = normalizeObject(body);
  const generatedAt = normalizeDate(record.generatedAt) ?? new Date().toISOString();
  const correlationId =
    normalizeString(record.correlationId, 180) ??
    normalizeString(record.runId, 180) ??
    `needs-reconcile-${generatedAt}`;
  const source = normalizeString(record.source, 120) ?? 'admin-quality-needs-reconciler';
  const proposals = Array.isArray(record.proposals)
    ? record.proposals
        .map((proposal) => sanitizeNeedProposal(proposal))
        .filter((proposal): proposal is MatrixNeedProposalPayload => proposal !== null)
    : [];

  if (!proposals.length) {
    throw new Error('At least one valid proposal is required.');
  }

  return {
    generatedAt,
    correlationId,
    source,
    proposals,
  };
}

function normalizeHistory(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeObject(item)).filter((item) => Object.keys(item).length > 0);
}

function toNeedProposalResponse(entity: MatrixNeedProposalEntity) {
  return {
    id: entity.id != null ? String(entity.id) : null,
    proposalId: normalizeString(entity.proposalId, 240) ?? '',
    entryId: normalizeString(entity.entryId, 180) ?? '',
    type: normalizeNeedProposalType(entity.type) ?? 'add-source-ref',
    status: normalizeNeedProposalStatus(entity.status),
    confidence: normalizeDiscoveryConfidence(entity.confidence),
    title: normalizeString(entity.title, 220),
    summary: normalizeString(entity.summary, 2_000),
    source: normalizeObject(entity.source),
    payload: normalizeObject(entity.payload),
    history: normalizeHistory(entity.history),
    correlationId: normalizeString(entity.correlationId, 180),
    reportedAt: normalizeDate(entity.reportedAt),
    createdAt: normalizeDate(entity.createdAt),
    updatedAt: normalizeDate(entity.updatedAt),
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

async function findNeedProposalByProposalId(
  strapi: Core.Strapi,
  proposalId: string,
): Promise<MatrixNeedProposalEntity | null> {
  const existing = await strapi.entityService.findMany(NEED_PROPOSAL_UID, {
    filters: { proposalId },
    limit: 1,
  });

  return (normalizeFindManyResult(existing)[0] as MatrixNeedProposalEntity | undefined) ?? null;
}

async function persistNeedProposal(
  strapi: Core.Strapi,
  proposal: MatrixNeedProposalPayload,
  ingest: MatrixNeedProposalsIngestPayload,
): Promise<{ entity: MatrixNeedProposalEntity; created: boolean }> {
  const existing = await findNeedProposalByProposalId(strapi, proposal.proposalId);
  const previousStatus = normalizeNeedProposalStatus(existing?.status);
  const lockedStatus = previousStatus === 'accepted' || previousStatus === 'rejected';
  const nextStatus = existing?.id && lockedStatus ? previousStatus : proposal.status;
  const history = [
    ...normalizeHistory(existing?.history),
    {
      event: existing?.id ? 'updated-from-ingest' : 'created-from-ingest',
      at: ingest.generatedAt,
      source: ingest.source,
      correlationId: ingest.correlationId,
      previousStatus: existing?.id ? previousStatus : null,
      nextStatus,
    },
  ].slice(-50);
  const data = {
    proposalId: proposal.proposalId,
    entryId: proposal.entryId,
    type: proposal.type,
    status: nextStatus,
    confidence: proposal.confidence,
    title: proposal.title,
    summary: proposal.summary,
    source: proposal.source,
    payload: proposal.payload,
    history,
    correlationId: ingest.correlationId,
    reportedAt: ingest.generatedAt,
  };

  if (existing?.id) {
    const entity = await strapi.entityService.update(NEED_PROPOSAL_UID, existing.id, {
      data: data as any,
    });
    return { entity: entity as MatrixNeedProposalEntity, created: false };
  }

  const entity = await strapi.entityService.create(NEED_PROPOSAL_UID, {
    data: data as any,
  });
  return { entity: entity as MatrixNeedProposalEntity, created: true };
}

async function findKnownEntryIds(strapi: Core.Strapi): Promise<string[]> {
  const rawEntries = await strapi.entityService.findMany(MATRIX_ENTRY_UID, {
    fields: ['entryId'],
    publicationState: 'preview',
    limit: 500,
  } as any);
  const entries = normalizeFindManyResult(rawEntries) as MatrixEntryEntity[];

  return uniqueSorted(
    entries
      .map((entry) => normalizeString(entry.entryId, 180))
      .filter((entryId): entryId is string => Boolean(entryId)),
  );
}

function reviewedAtDeadline(entry: MatrixEntryEntity): number | null {
  const reviewedAt = normalizeString(entry.reviewedAt, 40);
  if (!reviewedAt) {
    return null;
  }

  const timestamp = Date.parse(`${reviewedAt}T23:59:59.999Z`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function missionDecisionTimestamp(
  decision: MissionDecisionEntity | null | undefined,
): number | null {
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

  const ranks = [state.businessStatus, state.implementationStatus, state.e2eStatus]
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

function statusForSignal(
  state: MatrixCoverageState,
  signalId: MatrixCoverageSignalId,
): MatrixStatus {
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

function hasApiSignal(entry: MatrixEntryEntity, evidence: readonly string[]): boolean {
  const haystack = [
    normalizeString(entry.need, 1_000),
    normalizeString(entry.observedGap, 1_000),
    normalizeString(entry.nextMove, 1_000),
    normalizeString(entry.lastRepoSignalSummary, 1_000),
    ...evidence,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();

  return /\b(api|endpoint|openapi|contract|contrat|strapi|schema|seed)\b/.test(haystack);
}

function evidenceTargetFiles(evidence: readonly string[]): string[] {
  return evidence
    .filter((item) => /[\\/]/.test(item) && !/^https?:\/\//i.test(item))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function pilotCoverageRationale(current: MatrixCoverageState): string[] {
  const rationale: string[] = [];

  if (current.summaryStatus !== 'oui') {
    rationale.push(`La synthese matrice reste ${current.summaryStatus}.`);
  }
  if (current.implementationStatus !== 'oui') {
    rationale.push(`La couverture implementation reste ${current.implementationStatus}.`);
  }
  if (current.e2eStatus !== 'oui') {
    rationale.push(`La preuve E2E reste ${current.e2eStatus}.`);
  }
  if (current.managementBucket === 'proof-gap') {
    rationale.push('La ligne est classee proof-gap: une preuve executable manque encore.');
  }
  if (current.managementBucket === 'product-gap' || current.needsProductWorkFirst) {
    rationale.push('La ligne demande un arbitrage produit avant promotion de couverture.');
  }

  return rationale;
}

function resolvePilotActionType(
  entry: MatrixEntryEntity,
  current: MatrixCoverageState,
  result: MatrixRecalculationResult,
  proposed: MatrixCoverageState | null,
  evidence: readonly string[],
): MatrixPilotActionType {
  if (result === 'blocked-conflicting-signals') {
    return 'review-product-scope';
  }

  if (hasApiSignal(entry, evidence) && current.implementationStatus !== 'oui') {
    return 'update-contract';
  }

  if (result === 'blocked-insufficient-proof') {
    return 'fix-proof-gap';
  }

  if (proposed?.managementBucket === 'covered' && proposed.summaryStatus === 'oui') {
    return 'close-entry';
  }

  if (
    current.summaryStatus !== 'oui' &&
    current.businessStatus === 'oui' &&
    current.implementationStatus === 'oui' &&
    current.e2eStatus === 'oui' &&
    current.managementBucket === 'covered'
  ) {
    return 'close-entry';
  }

  if (current.needsProductWorkFirst || current.managementBucket === 'product-gap') {
    return 'review-product-scope';
  }

  if (current.e2eStatus !== 'oui') {
    return 'add-test';
  }

  if (current.implementationStatus !== 'oui') {
    return 'implement-feature';
  }

  return 'run-validation';
}

function resolvePilotBucket(
  actionType: MatrixPilotActionType,
  result: MatrixRecalculationResult,
  apiSignal: boolean,
): MatrixPilotBucket {
  if (actionType === 'close-entry') {
    return 'ready-to-close';
  }

  if (apiSignal && actionType === 'update-contract') {
    return 'blocked-by-api';
  }

  if (actionType === 'review-product-scope') {
    return 'needs-product-call';
  }

  if (
    actionType === 'fix-proof-gap' ||
    actionType === 'add-test' ||
    result.startsWith('blocked-')
  ) {
    return 'needs-proof';
  }

  return 'ready-to-build';
}

function pilotScoreFor(
  entry: MatrixEntryEntity,
  current: MatrixCoverageState,
  result: MatrixRecalculationResult,
  confidence: MatrixRecalculationConfidence,
): number {
  const priority = normalizePriority(entry.priority);
  let score = priority === 'haute' ? 35 : priority === 'moyenne' ? 25 : 15;

  if (result === 'proposal-review-required') {
    score += 30;
  } else if (result.startsWith('blocked-')) {
    score += 22;
  } else {
    score += 8;
  }

  score += current.summaryStatus === 'non' ? 18 : current.summaryStatus === 'partiel' ? 10 : 0;
  score +=
    current.implementationStatus === 'non'
      ? 18
      : current.implementationStatus === 'partiel'
        ? 9
        : 0;
  score += current.e2eStatus === 'non' ? 16 : current.e2eStatus === 'partiel' ? 8 : 0;
  score +=
    current.managementBucket === 'proof-gap'
      ? 12
      : current.managementBucket === 'product-gap'
        ? 8
        : 0;
  score += confidence === 'high' ? 10 : confidence === 'medium' ? 5 : 0;
  score -= current.needsProductWorkFirst ? 6 : 0;

  return Math.max(0, Math.min(100, score));
}

function pilotPriorityFor(score: number, bucket: MatrixPilotBucket): MatrixPilotPriority {
  if (bucket === 'needs-product-call' || bucket === 'blocked-by-api') {
    return 'blocked';
  }

  if (score >= 75) {
    return 'now';
  }

  if (score >= 50) {
    return 'next';
  }

  return 'later';
}

function pilotTargetFiles(
  actionType: MatrixPilotActionType,
  evidence: readonly string[],
): string[] {
  const files = evidenceTargetFiles(evidence);
  if (files.length) {
    return files;
  }

  switch (actionType) {
    case 'update-contract':
      return [
        'packages/contracts/spec/openapi.json',
        'strapi/src/api',
        'openg7-org/src/app/core/api',
      ];
    case 'add-test':
    case 'fix-proof-gap':
      return ['openg7-org/e2e', 'openg7-org/src/app'];
    case 'implement-feature':
      return ['openg7-org/src/app', 'strapi/src/api'];
    case 'close-entry':
      return ['strapi/src/api/admin-quality-matrix/controllers/admin-quality-matrix.ts'];
    default:
      return ['openg7-org/src/app', 'strapi/src/api'];
  }
}

function pilotSuggestedCommands(actionType: MatrixPilotActionType): string[] {
  switch (actionType) {
    case 'update-contract':
      return ['yarn codegen', 'yarn test'];
    case 'add-test':
    case 'fix-proof-gap':
      return ['yarn test:e2e:smoke'];
    case 'close-entry':
      return ['yarn workspace @openg7/strapi test:integration:admin-quality-matrix'];
    default:
      return ['yarn prebuild:web'];
  }
}

function pilotAcceptanceCriteria(actionType: MatrixPilotActionType): string[] {
  switch (actionType) {
    case 'close-entry':
      return [
        'La proposition QA est appliquee par un Owner apres verification humaine.',
        'Le recalcul suivant ne laisse plus de proposition ouverte pour cette entree.',
      ];
    case 'review-product-scope':
      return [
        'La decision produit clarifie si le besoin reste dans le MVP.',
        'La matrice garde une trace de la decision avant toute promotion de statut.',
      ];
    case 'update-contract':
      return [
        'Le contrat API ou schema source est mis a jour avant le front consommateur.',
        'La generation de contrats et les tests de forme passent localement.',
      ];
    case 'add-test':
    case 'fix-proof-gap':
      return [
        'Une preuve executable couvre le parcours ou le signal mentionne par la matrice.',
        'La preuve est reliee a cette entree via evidence ou signal de mission.',
      ];
    default:
      return [
        'Le changement livre le prochain mouvement de la matrice sans regression visible.',
        'Les validations ciblees passent et produisent une preuve reutilisable.',
      ];
  }
}

function pilotExpectedEvidence(actionType: MatrixPilotActionType): string[] {
  switch (actionType) {
    case 'close-entry':
      return ['Matrice mise a jour', 'Recalcul sans nouvelle proposition'];
    case 'review-product-scope':
      return ['Decision mission produit', 'Note de cadrage liee a l entree'];
    case 'update-contract':
      return ['OpenAPI ou schema Strapi versionne', 'Types contrats regeneres'];
    case 'add-test':
    case 'fix-proof-gap':
      return ['Spec ou test E2E vert', 'Trace de preuve dans evidence'];
    default:
      return ['Build ou test cible vert', 'Signal repo plus recent que la revue'];
  }
}

function pilotBlockingReason(
  bucket: MatrixPilotBucket,
  result: MatrixRecalculationResult,
): string | null {
  if (bucket === 'blocked-by-api') {
    return 'Le contrat API ou schema doit etre stabilise avant de piloter le developpement applicatif.';
  }

  if (bucket === 'needs-product-call') {
    return 'Une decision produit est requise avant toute promotion de couverture.';
  }

  if (result.startsWith('blocked-')) {
    return 'La matrice detecte un signal insuffisant pour promouvoir le statut sans preuve supplementaire.';
  }

  return null;
}

function buildDevelopmentCommand(
  entry: MatrixEntryEntity,
  recalculation: {
    readonly result: MatrixRecalculationResult;
    readonly confidence: MatrixRecalculationConfidence;
    readonly current: MatrixCoverageState;
    readonly proposed: MatrixCoverageState | null;
    readonly reasons: readonly string[];
    readonly evidence: readonly string[];
  },
): MatrixDevelopmentCommand {
  const actionType = resolvePilotActionType(
    entry,
    recalculation.current,
    recalculation.result,
    recalculation.proposed,
    recalculation.evidence,
  );
  const apiSignal = hasApiSignal(entry, recalculation.evidence);
  const bucket = resolvePilotBucket(actionType, recalculation.result, apiSignal);
  const score = pilotScoreFor(
    entry,
    recalculation.current,
    recalculation.result,
    recalculation.confidence,
  );
  const rationale = [...recalculation.reasons, ...pilotCoverageRationale(recalculation.current)];

  return {
    score,
    bucket,
    priority: pilotPriorityFor(score, bucket),
    actionType,
    rationale: rationale.length
      ? rationale
      : ['La matrice ne detecte pas de signal plus fort que la derniere revue.'],
    targetFiles: pilotTargetFiles(actionType, recalculation.evidence),
    acceptanceCriteria: pilotAcceptanceCriteria(actionType),
    suggestedCommands: pilotSuggestedCommands(actionType),
    expectedEvidence: pilotExpectedEvidence(actionType),
    blockingReason: pilotBlockingReason(bucket, recalculation.result),
  };
}

function withDevelopmentCommand<
  T extends {
    readonly result: MatrixRecalculationResult;
    readonly confidence: MatrixRecalculationConfidence;
    readonly current: MatrixCoverageState;
    readonly proposed: MatrixCoverageState | null;
    readonly reasons: readonly string[];
    readonly evidence: readonly string[];
  },
>(entry: MatrixEntryEntity, recalculation: T): T & { readonly pilot: MatrixDevelopmentCommand } {
  return {
    ...recalculation,
    pilot: buildDevelopmentCommand(entry, recalculation),
  };
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
    const status = normalizeString(decision.status, 40);
    if (!entryId || (status !== 'done' && status !== 'proof-returned')) {
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

    const existingBySignal =
      latestByEntryId.get(entryId) ?? new Map<MatrixSignalId, MissionDecisionEntity>();
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
    const requestedAt =
      requestedTimestamp == null ? null : new Date(requestedTimestamp).toISOString();
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
      trackedPullRequestNumber != null ||
      (trackedProofBranch != null && trackedProofBranch.length > 0);

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
        confirmationSource =
          confirmationDecisionStatus === 'proof-returned' ? 'proof-returned' : 'done';
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
): MatrixRecalculationEntryResponse {
  const current = toCoverageState(entry);
  const deadline = reviewedAtDeadline(entry);
  const repoSignalAt = normalizeDate(entry.lastRepoSignalAt);
  const repoSignalTimestamp = repoSignalAt ? new Date(repoSignalAt).getTime() : Number.NaN;
  const repoSignalNewer =
    deadline == null || (Number.isFinite(repoSignalTimestamp) && repoSignalTimestamp > deadline);
  const decisionTimestamp = missionDecisionTimestamp(latestCompletedDecision);
  const completedDecisionNewer =
    deadline == null || (decisionTimestamp != null && decisionTimestamp > deadline);
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
    reasons.push(
      'Une mission avec preuve retournee ou done est plus recente que la derniere revue.',
    );
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
    return withDevelopmentCommand(entry, {
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
    });
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
    return withDevelopmentCommand(entry, {
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
    });
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

  return withDevelopmentCommand(entry, {
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
  });
}

function buildRecalculationSummary(entries: readonly MatrixRecalculationEntryResponse[]) {
  return {
    analyzedCount: entries.length,
    proposalCount: entries.filter((entry) => entry.result === 'proposal-review-required').length,
    unchangedCount: entries.filter((entry) => entry.result === 'unchanged').length,
    blockedCount: entries.filter((entry) => entry.result.startsWith('blocked-')).length,
  };
}

async function persistRecalculationPlan(
  strapi: Core.Strapi,
  entry: MatrixEntryEntity,
  recalculation: MatrixRecalculationEntryResponse,
  scope: MatrixRecalculationScope,
  automatic: boolean,
  generatedAt: string,
): Promise<void> {
  if (!entry.id) {
    return;
  }

  await strapi.entityService.update(MATRIX_ENTRY_UID, entry.id, {
    data: {
      lastRecalculationAt: generatedAt,
      lastRecalculationScope: scope,
      lastRecalculationAutomatic: automatic,
      lastRecalculationResult: recalculation.result,
      lastRecalculationPlan: {
        generatedAt,
        scope,
        automatic,
        entry: recalculation,
      },
    } as any,
  });
}

function proofManifestDecisionStatus(status: string): 'proof-returned' | 'blocked' | 'approved' {
  const normalized = status.toLowerCase();
  if (/\b(success|succeeded|passed|completed|green|ok)\b/.test(normalized)) {
    return 'proof-returned';
  }
  if (/\b(fail|failed|error|cancelled|canceled|red)\b/.test(normalized)) {
    return 'blocked';
  }
  return 'approved';
}

async function persistProofManifestDecisions(
  strapi: Core.Strapi,
  manifest: MatrixProofManifest | null,
  fallbackCommitSha: string,
): Promise<string[]> {
  if (!manifest) {
    return [];
  }

  const persistedEntryIds: string[] = [];
  const proofKey =
    manifest.workflowRunId ?? manifest.commitSha ?? fallbackCommitSha.slice(0, 12) ?? 'unknown';
  const status = proofManifestDecisionStatus(manifest.status);

  for (const entryId of manifest.entryIds) {
    const existingEntry = await findEntryByEntryId(strapi, entryId);
    if (!existingEntry?.id) {
      continue;
    }

    const recommendationId = `${entryId}::proof-manifest::${proofKey}`;
    const existingDecision = normalizeFindManyResult(
      await strapi.entityService.findMany(MISSION_DECISION_UID, {
        filters: { recommendationId },
        limit: 1,
      }),
    )[0] as MissionDecisionEntity | undefined;
    const data = {
      recommendationId,
      entryId,
      kind: 'governance',
      status,
      title: `CI proof manifest - ${entryId}`,
      message: `Manifest ${manifest.status} for ${manifest.workflow ?? 'workflow'} on ${manifest.commitSha ?? fallbackCommitSha}.`,
      operatorPrompt: 'Relire le manifest CI avant toute promotion automatique de matrice.',
      metadata: {
        traceType: 'proof-manifest',
        commitSha: manifest.commitSha ?? fallbackCommitSha,
        workflowRunId: manifest.workflowRunId,
        workflow: manifest.workflow,
        generatedAt: manifest.generatedAt,
        checks: manifest.checks,
        specs: manifest.specs,
        artifactUrl: manifest.artifactUrl,
        status: manifest.status,
      },
      decidedByUserId: 'ci',
    };

    if (existingDecision?.id) {
      await strapi.entityService.update(MISSION_DECISION_UID, existingDecision.id, {
        data: data as any,
      });
    } else {
      await strapi.entityService.create(MISSION_DECISION_UID, {
        data: data as any,
      });
    }
    persistedEntryIds.push(entryId);
  }

  return persistedEntryIds;
}

function pilotActionTitle(actionType: MatrixPilotActionType): string {
  switch (actionType) {
    case 'implement-feature':
      return 'Implementer la prochaine surface';
    case 'add-test':
      return 'Ajouter la preuve QA';
    case 'fix-proof-gap':
      return 'Combler le gap de preuve';
    case 'update-contract':
      return 'Mettre a jour le contrat API';
    case 'review-product-scope':
      return 'Arbitrer le scope produit';
    case 'close-entry':
      return 'Cloturer la ligne matrice';
    default:
      return 'Valider la ligne matrice';
  }
}

async function ensurePilotMissionDecision(
  strapi: Core.Strapi,
  recalculation: MatrixRecalculationEntryResponse,
): Promise<void> {
  if (recalculation.pilot.priority === 'later') {
    return;
  }

  const recommendationId = `${recalculation.entryId}::core`;
  const existing = normalizeFindManyResult(
    await strapi.entityService.findMany(MISSION_DECISION_UID, {
      filters: { recommendationId },
      limit: 1,
    }),
  )[0] as MissionDecisionEntity | undefined;
  const existingStatus = normalizeString(existing?.status, 40);
  if (
    existingStatus &&
    existingStatus !== 'proposed' &&
    existingStatus !== 'deferred' &&
    existingStatus !== 'rejected'
  ) {
    return;
  }

  const data = {
    recommendationId,
    entryId: recalculation.entryId,
    kind: 'core',
    status: 'proposed',
    title: pilotActionTitle(recalculation.pilot.actionType),
    message: recalculation.pilot.rationale.join('\n'),
    operatorPrompt: [
      `Objectif: ${pilotActionTitle(recalculation.pilot.actionType)} pour ${recalculation.domain}.`,
      '',
      'Fichiers cibles:',
      ...recalculation.pilot.targetFiles.map((item) => `- ${item}`),
      '',
      'Commandes suggerees:',
      ...recalculation.pilot.suggestedCommands.map((item) => `- ${item}`),
      '',
      'Preuves attendues:',
      ...recalculation.pilot.expectedEvidence.map((item) => `- ${item}`),
    ].join('\n'),
    metadata: {
      traceType: 'pilot-command',
      generatedAt: new Date().toISOString(),
      result: recalculation.result,
      confidence: recalculation.confidence,
      pilot: recalculation.pilot,
    },
    decidedByUserId: 'system',
  };

  if (existing?.id) {
    await strapi.entityService.update(MISSION_DECISION_UID, existing.id, {
      data: data as any,
    });
  } else {
    await strapi.entityService.create(MISSION_DECISION_UID, {
      data: data as any,
    });
  }
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
    .flatMap((entry) => [
      normalizeDate(entry.updatedAt),
      normalizeDate(entry.createdAt),
      normalizeDate(entry.reviewedAt),
    ])
    .filter((value): value is string => value !== null)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return EMPTY_GENERATED_AT;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

// ─── Chat agent helpers ───────────────────────────────────────────────────────

const CHAT_SYSTEM_PROMPT_TEMPLATE = `Tu es un analyste expert de la matrice qualité de la plateforme OpenG7.
Tu aides l'équipe à identifier les besoins non couverts, les écarts observés et les prochaines actions.
Réponds en français. Sois précis, concis et actionnable.

## Matrice qualité actuelle

{MATRIX_CONTEXT}

## Format des propositions

Quand tu veux proposer une modification ou un ajout, insère dans ta réponse des balises XML au format suivant.

Pour suggérer un texte pour observedGap ou nextMove d'une entrée existante :
<og7:proposal type="suggest-narrative" entryId="ID_ENTREE" field="observedGap">
Texte suggéré ici
</og7:proposal>

Pour proposer une nouvelle entrée candidate :
<og7:proposal type="create-entry">
{"id":"NOUVEAU-ID","domain":"Domaine","need":"Description du besoin"}
</og7:proposal>

Ces propositions seront soumises à l'équipe pour validation dans l'onglet Propositions.`;

function chatSseEvent(stream: PassThrough, type: string, data: Record<string, unknown>): void {
  stream.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
}

async function openaiStreamMessages(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ReadonlyArray<{ role: string; content: string }>,
  onChunk: (text: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      stream: true,
      max_tokens: 4096,
      temperature: 0.4,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    });

    const req = https.request(
      {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let fullText = '';
        let sseBuffer = '';

        res.on('data', (chunk: Buffer) => {
          sseBuffer += chunk.toString();
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) {
              continue;
            }
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') {
              continue;
            }
            try {
              const event = JSON.parse(jsonStr) as Record<string, unknown>;
              const choices = event['choices'] as Array<Record<string, unknown>> | undefined;
              const delta = choices?.[0]?.['delta'] as Record<string, unknown> | undefined;
              if (typeof delta?.['content'] === 'string') {
                fullText += delta['content'];
                onChunk(delta['content']);
              }
            } catch {
              // ignore malformed SSE lines
            }
          }
        });

        res.on('end', () => resolve(fullText));
        res.on('error', reject);
      },
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function loadAgentSystemDocs(): string {
  try {
    const docsPath = path.resolve(
      __dirname,
      '..', '..', '..', '..', '..', '..', 'docs', 'agent-context.md',
    );
    const content = readFileSync(docsPath, 'utf8');
    const MAX_CHARS = 60_000;
    return content.length > MAX_CHARS ? content.slice(0, MAX_CHARS) + '\n\n[... tronqué]' : content;
  } catch {
    return '';
  }
}

async function buildChatSystemPrompt(
  strapiInstance: Core.Strapi,
  entryIds?: string[],
): Promise<string> {
  let entries: Record<string, unknown>[] = [];
  try {
    const findOptions: Record<string, unknown> = {
      limit: 200,
      publicationState: 'preview',
    };
    if (entryIds && entryIds.length > 0) {
      findOptions['filters'] = { entryId: { $in: entryIds } };
    }
    const result = await (strapiInstance.entityService as any).findMany(
      MATRIX_ENTRY_UID,
      findOptions,
    );
    entries = Array.isArray(result) ? result : [];
  } catch {
    entries = [];
  }

  const lines: string[] = [];
  for (const entry of entries) {
    const id = String(entry['entryId'] ?? '');
    const domain = String(entry['domain'] ?? '');
    const need = String(entry['need'] ?? '');
    const bucket = String(entry['managementBucket'] ?? '');
    const priority = String(entry['priority'] ?? '');
    const gap = typeof entry['observedGap'] === 'string' ? entry['observedGap'] : '';
    const move = typeof entry['nextMove'] === 'string' ? entry['nextMove'] : '';
    const e2e = String(entry['e2eStatus'] ?? '');
    const summary = String(entry['summaryStatus'] ?? '');
    const reviewed = typeof entry['reviewedAt'] === 'string' ? entry['reviewedAt'].slice(0, 10) : '';
    const needsProduct = Boolean(entry['needsProductWorkFirst']);
    lines.push(
      `[${id}] ${domain} — ${need}\n  bucket: ${bucket} | priorité: ${priority} | e2e: ${e2e} | summary: ${summary}` +
        (reviewed ? ` | révisé: ${reviewed}` : '') +
        (needsProduct ? ' | ⚠ travail produit requis' : '') +
        (gap ? `\n  écart: ${gap.slice(0, 300)}` : '') +
        (move ? `\n  action: ${move.slice(0, 300)}` : ''),
    );
  }

  const matrixContext = lines.length > 0 ? lines.join('\n\n') : 'Aucune entrée disponible.';
  const systemDocs = loadAgentSystemDocs();

  let prompt = CHAT_SYSTEM_PROMPT_TEMPLATE.replace('{MATRIX_CONTEXT}', matrixContext);
  if (systemDocs) {
    prompt += `\n\n---\n\n## Documentation système OpenG7\n\n${systemDocs}`;
  }
  return prompt;
}

function extractChatProposals(
  text: string,
): Array<{ type: string; entryId?: string; field?: string; body: string }> {
  const proposals: Array<{ type: string; entryId?: string; field?: string; body: string }> = [];
  const tagRegex = /<og7:proposal\s+([^>]+?)>([\s\S]*?)<\/og7:proposal>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(text)) !== null) {
    const attrsStr = match[1];
    const body = match[2].trim();
    const attrs: Record<string, string> = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }
    if (attrs['type']) {
      proposals.push({
        type: attrs['type'],
        entryId: attrs['entryId'],
        field: attrs['field'],
        body,
      });
    }
  }

  return proposals;
}

// ─────────────────────────────────────────────────────────────────────────────

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async listNeedProposals(ctx: Context) {
    const rawProposals = await strapi.entityService.findMany(NEED_PROPOSAL_UID, {
      sort: ['updatedAt:desc'],
      limit: 500,
    });
    const proposals = normalizeFindManyResult(rawProposals) as MatrixNeedProposalEntity[];

    ctx.body = {
      data: {
        generatedAt: new Date().toISOString(),
        proposals: proposals.map((proposal) => toNeedProposalResponse(proposal)),
      },
    };
  },

  async patchNeedProposal(ctx: Context) {
    const { proposalId } = ctx.params as Record<string, unknown>;
    const normalizedProposalId = normalizeString(proposalId, 240);
    if (!normalizedProposalId) {
      ctx.badRequest('proposalId path parameter is required.');
      return;
    }

    const body = normalizeObject(ctx.request.body);
    const rawStatus = normalizeString(body.status, 40);
    if (rawStatus !== 'accepted' && rawStatus !== 'rejected') {
      ctx.badRequest('status must be "accepted" or "rejected".');
      return;
    }
    const nextStatus = rawStatus as 'accepted' | 'rejected';
    const note = normalizeString(body.note, 500);

    const existing = await findNeedProposalByProposalId(strapi, normalizedProposalId);
    if (!existing?.id) {
      ctx.notFound('Proposal not found.');
      return;
    }

    const previousStatus = normalizeNeedProposalStatus(existing.status);
    if (previousStatus === 'accepted' || previousStatus === 'rejected') {
      ctx.badRequest(`Proposal is already ${previousStatus} and cannot be changed.`);
      return;
    }

    const updatedAt = new Date().toISOString();
    const history = [
      ...normalizeHistory(existing.history),
      {
        event: nextStatus === 'accepted' ? 'accepted-by-operator' : 'rejected-by-operator',
        at: updatedAt,
        previousStatus,
        nextStatus,
        note: note ?? null,
      },
    ].slice(-50);

    const updated = await strapi.entityService.update(NEED_PROPOSAL_UID, existing.id, {
      data: { status: nextStatus, history } as any,
    });

    if (nextStatus === 'accepted' && normalizeNeedProposalType(existing.type) === 'suggest-narrative') {
      const payload = normalizeObject(existing.payload);
      const field = normalizeNarrativeField(payload.field);
      const suggestedValue = normalizeString(payload.suggestedValue as unknown, 4_000);
      if (field && suggestedValue !== null) {
        const targetEntry = await findEntryByEntryId(
          strapi,
          normalizeString(existing.entryId, 180) ?? '',
        );
        if (targetEntry?.id) {
          const at = new Date().toISOString();
          const editHistory = [
            ...normalizeHistory(targetEntry.editHistory),
            {
              event: 'accepted-agent-suggestion',
              at,
              field,
              previousValue: normalizeString((targetEntry as Record<string, unknown>)[field] as unknown, 4_000) ?? null,
              nextValue: suggestedValue,
              proposalId: normalizedProposalId,
            },
          ].slice(-50);

          const entryUpdate: Record<string, unknown> = { editHistory };
          if (field === 'observedGap') entryUpdate.observedGap = suggestedValue;
          else if (field === 'nextMove') entryUpdate.nextMove = suggestedValue;
          else if (field === 'managementBucket') entryUpdate.managementBucket = suggestedValue;
          else if (field === 'needsProductWorkFirst') entryUpdate.needsProductWorkFirst = suggestedValue === 'true';
          else if (field === 'priority') entryUpdate.priority = suggestedValue;

          await strapi.entityService.update(MATRIX_ENTRY_UID, targetEntry.id, {
            data: entryUpdate as any,
          });
        }
      }
    }

    ctx.body = { data: toNeedProposalResponse(updated as MatrixNeedProposalEntity) };
  },

  async ingestNeedProposals(ctx: Context) {
    if (!requireIngestToken(ctx)) {
      return;
    }

    try {
      const payload = sanitizeNeedProposalsIngestPayload(ctx.request.body);
      const results = await Promise.all(
        payload.proposals.map((proposal) => persistNeedProposal(strapi, proposal, payload)),
      );
      const createdProposalIds = results
        .filter((result) => result.created)
        .map((result) => normalizeString(result.entity.proposalId, 240) ?? '')
        .filter(Boolean);
      const updatedProposalIds = results
        .filter((result) => !result.created)
        .map((result) => normalizeString(result.entity.proposalId, 240) ?? '')
        .filter(Boolean);

      ctx.body = {
        data: {
          generatedAt: payload.generatedAt,
          correlationId: payload.correlationId,
          source: payload.source,
          proposalCount: results.length,
          createdProposalIds,
          updatedProposalIds,
          proposals: results.map((result) => toNeedProposalResponse(result.entity)),
        },
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Invalid admin quality need proposals ingest payload.';
      ctx.badRequest(message);
    }
  },

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
      const generatedAt = new Date().toISOString();

      await Promise.all(
        scopedEntries.map((entry, index) => {
          const recalculation = recalculatedEntries[index];
          return recalculation
            ? Promise.all([
                persistRecalculationPlan(
                  strapi,
                  entry,
                  recalculation,
                  payload.scope,
                  false,
                  generatedAt,
                ),
                ensurePilotMissionDecision(strapi, recalculation),
              ]).then(() => undefined)
            : Promise.resolve();
        }),
      );

      ctx.body = {
        data: {
          generatedAt,
          scope: payload.scope,
          summary: buildRecalculationSummary(recalculatedEntries),
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
      const latestDecision =
        buildLatestCompletedDecisionByEntryId(decisions).get(payload.entryId) ?? null;
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
      const impact = resolveIngestImpact(payload, await findKnownEntryIds(strapi));
      const updatedEntryIds: string[] = [];
      const updatedEntries: MatrixEntryEntity[] = [];
      const signalSummary = [
        payload.summary,
        `impact=${impact.impactMode}`,
        payload.workflow ? `workflow=${payload.workflow}` : null,
        payload.branch ? `branch=${payload.branch}` : null,
        payload.changedFiles.length ? `${payload.changedFiles.length} fichiers modifies` : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join(' | ')
        .slice(0, 1000);

      for (const entryId of impact.resolvedEntryIds) {
        const existing = await findEntryByEntryId(strapi, entryId);
        if (!existing?.id) {
          continue;
        }

        const updated = await strapi.entityService.update(MATRIX_ENTRY_UID, existing.id, {
          data: {
            lastRepoSignalAt: payload.mergedAt,
            lastRepoSignalCommit: payload.commitSha,
            lastRepoSignalSource: payload.source,
            lastRepoSignalSummary: signalSummary,
          } as any,
        });
        updatedEntryIds.push(entryId);
        updatedEntries.push(updated as MatrixEntryEntity);
      }

      const proofManifestEntryIds = await persistProofManifestDecisions(
        strapi,
        payload.proofManifest,
        payload.commitSha,
      );
      const recalculationTargetEntriesById = new Map<string, MatrixEntryEntity>();
      for (const entry of updatedEntries) {
        const entryId = normalizeString(entry.entryId, 180);
        if (entryId) {
          recalculationTargetEntriesById.set(entryId, entry);
        }
      }
      for (const entryId of proofManifestEntryIds) {
        if (recalculationTargetEntriesById.has(entryId)) {
          continue;
        }
        const entry = await findEntryByEntryId(strapi, entryId);
        if (entry) {
          recalculationTargetEntriesById.set(entryId, entry);
        }
      }
      const recalculationTargetEntries = Array.from(recalculationTargetEntriesById.values());

      const rawDecisions = await strapi.entityService.findMany(MISSION_DECISION_UID, {
        sort: ['updatedAt:desc'],
        limit: 1_000,
      });
      const decisions = normalizeFindManyResult(rawDecisions) as MissionDecisionEntity[];
      const latestCompletedDecisionByEntryId = buildLatestCompletedDecisionByEntryId(decisions);
      const latestSignalGuidanceByEntryId = buildLatestSignalGuidanceByEntryId(decisions);
      const latestServerConfirmationByEntryId = buildLatestServerConfirmationByEntryId(decisions);
      const recalculationGeneratedAt = new Date().toISOString();
      const recalculatedEntries = recalculationTargetEntries.map((entry) => {
        const entryId = normalizeString(entry.entryId, 180) ?? '';
        return buildRecalculationEntry(
          entry,
          latestCompletedDecisionByEntryId.get(entryId),
          resolveSignalDispatchSnapshot(
            entry,
            latestSignalGuidanceByEntryId.get(entryId),
            latestServerConfirmationByEntryId.get(entryId),
          ),
        );
      });

      await Promise.all(
        recalculationTargetEntries.map((entry, index) => {
          const recalculation = recalculatedEntries[index];
          return recalculation
            ? Promise.all([
                persistRecalculationPlan(
                  strapi,
                  entry,
                  recalculation,
                  'refresh-required',
                  true,
                  recalculationGeneratedAt,
                ),
                ensurePilotMissionDecision(strapi, recalculation),
              ]).then(() => undefined)
            : Promise.resolve();
        }),
      );

      ctx.body = {
        data: {
          mergedAt: payload.mergedAt,
          commitSha: payload.commitSha,
          impactMode: impact.impactMode,
          impactReason: impact.impactReason,
          providedEntryIds: impact.providedEntryIds,
          derivedEntryIds: impact.derivedEntryIds,
          resolvedEntryIds: impact.resolvedEntryIds,
          updatedEntryIds,
          proofManifestEntryIds,
          ignoredEntryIds: impact.resolvedEntryIds.filter(
            (entryId) => !updatedEntryIds.includes(entryId),
          ),
          recalculation: {
            generatedAt: recalculationGeneratedAt,
            scope: 'refresh-required',
            summary: buildRecalculationSummary(recalculatedEntries),
            entries: recalculatedEntries,
          },
        },
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Invalid admin quality matrix ingest payload.';
      ctx.badRequest(message);
    }
  },

  async exportMatrix(ctx: Context) {
    const rawEntries = await strapi.entityService.findMany(MATRIX_ENTRY_UID, {
      limit: 500,
      publicationState: 'preview',
    } as any);
    const entries = (normalizeFindManyResult(rawEntries) as MatrixEntryEntity[])
      .sort((a, b) =>
        (normalizeString(a.entryId, 180) ?? '').localeCompare(
          normalizeString(b.entryId, 180) ?? '',
        ),
      )
      .map((entity) => ({
        id: normalizeString(entity.entryId, 180) ?? '',
        domain: normalizeString(entity.domain) ?? '',
        need: normalizeString(entity.need) ?? '',
        acceptanceCriteria: normalizeStringArray(entity.acceptanceCriteria),
        sourceRefs: normalizeJsonObjects(entity.sourceRefs),
        impactRules: normalizeJsonObjects(entity.impactRules),
        confidence: normalizeDiscoveryConfidence(entity.confidence),
        lastDiscoveredAt: normalizeDate(entity.lastDiscoveredAt)?.slice(0, 10) ?? null,
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
        reviewedAt: normalizeDate(entity.reviewedAt)?.slice(0, 10) ?? null,
        agentObservedGap: normalizeString(entity.agentObservedGap) ?? null,
        agentNextMove: normalizeString(entity.agentNextMove) ?? null,
        agentNarrativeGeneratedAt: normalizeDate(entity.agentNarrativeGeneratedAt) ?? null,
        agentNarrativeModel: normalizeString(entity.agentNarrativeModel) ?? null,
      }));

    let globalRules: unknown[] = [];
    let schemaVersion: unknown = 2;
    try {
      const globalRulesPath = path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        '..',
        'tools',
        'admin-quality-matrix-global-rules.json',
      );
      const globalRulesJson = JSON.parse(readFileSync(globalRulesPath, 'utf8'));
      globalRules = Array.isArray(globalRulesJson.globalImpactRules)
        ? globalRulesJson.globalImpactRules
        : [];
      schemaVersion = globalRulesJson.schemaVersion ?? 2;
    } catch {
      strapi.log?.warn?.('admin-quality-matrix-global-rules.json not found, exporting without globalImpactRules.');
    }

    ctx.body = {
      data: {
        schemaVersion,
        generatedAt: new Date().toISOString(),
        entries,
        globalImpactRules: globalRules,
      },
    };
  },

  async editMatrixEntry(ctx: Context) {
    const { entryId: rawEntryId } = ctx.params as Record<string, unknown>;
    const entryId = normalizeString(rawEntryId, 180);
    if (!entryId) {
      ctx.badRequest('entryId path parameter is required.');
      return;
    }

    const entry = await findEntryByEntryId(strapi, entryId);
    if (!entry?.id) {
      ctx.notFound('Matrix entry not found.');
      return;
    }

    const body = normalizeObject(ctx.request.body);
    const at = new Date().toISOString();

    const allowedFields: MatrixNarrativeField[] = [
      'observedGap',
      'nextMove',
      'managementBucket',
      'needsProductWorkFirst',
      'priority',
    ];
    const updates: Record<string, unknown> = {};
    const changedFields: string[] = [];

    for (const field of allowedFields) {
      if (!(field in body)) continue;
      const raw = body[field];
      if (field === 'observedGap' || field === 'nextMove') {
        const val = normalizeString(raw as unknown, 4_000);
        if (val !== null) { updates[field] = val; changedFields.push(field); }
      } else if (field === 'managementBucket') {
        const val = normalizeBucket(raw);
        if (val) { updates[field] = val; changedFields.push(field); }
      } else if (field === 'needsProductWorkFirst') {
        updates[field] = Boolean(raw); changedFields.push(field);
      } else if (field === 'priority') {
        const val = normalizePriority(raw);
        if (val) { updates[field] = val; changedFields.push(field); }
      }
    }

    if (body.reviewedAt !== undefined) {
      const val = normalizeDate(body.reviewedAt)?.slice(0, 10);
      if (val) { updates.reviewedAt = val; changedFields.push('reviewedAt'); }
    }
    if (body.summaryStatus !== undefined) {
      updates.summaryStatus = normalizeStatus(body.summaryStatus); changedFields.push('summaryStatus');
    }
    if (body.businessStatus !== undefined) {
      updates.businessStatus = normalizeStatus(body.businessStatus); changedFields.push('businessStatus');
    }
    if (body.implementationStatus !== undefined) {
      updates.implementationStatus = normalizeStatus(body.implementationStatus); changedFields.push('implementationStatus');
    }
    if (body.e2eStatus !== undefined) {
      updates.e2eStatus = normalizeStatus(body.e2eStatus); changedFields.push('e2eStatus');
    }

    if (!changedFields.length) {
      ctx.badRequest('No valid fields to update.');
      return;
    }

    const previousValues: Record<string, unknown> = {};
    for (const field of changedFields) {
      previousValues[field] = (entry as Record<string, unknown>)[field] ?? null;
    }

    const editHistory = [
      ...normalizeHistory(entry.editHistory),
      { event: 'edited-by-operator', at, fields: changedFields, previousValues },
    ].slice(-50);

    const updated = await strapi.entityService.update(MATRIX_ENTRY_UID, entry.id, {
      data: { ...updates, editHistory } as any,
    });

    ctx.body = { data: toMatrixEntryResponse(updated as MatrixEntryEntity) };
  },

  async agentSuggestNarrative(ctx: Context) {
    const { entryId: rawEntryId } = ctx.params as Record<string, unknown>;
    const entryId = normalizeString(rawEntryId, 180);
    if (!entryId) {
      ctx.badRequest('entryId path parameter is required.');
      return;
    }

    const entry = await findEntryByEntryId(strapi, entryId);
    if (!entry?.id) {
      ctx.notFound('Matrix entry not found.');
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      ctx.internalServerError('OPENAI_API_KEY is not configured.');
      return;
    }

    const body = normalizeObject(ctx.request.body);
    const gitContext = normalizeString(body.gitContext as unknown, 2_000) ?? '';
    const requestedFields: MatrixNarrativeField[] = ['observedGap', 'nextMove'];

    const entryContext = [
      `Entrée : ${normalizeString(entry.entryId, 180)}`,
      `Domaine : ${normalizeString(entry.domain)}`,
      `Besoin : ${normalizeString(entry.need)}`,
      `e2eStatus : ${normalizeStatus(entry.e2eStatus)}`,
      `managementBucket : ${normalizeBucket(entry.managementBucket)}`,
      `observedGap actuel : ${normalizeString(entry.observedGap) ?? '(vide)'}`,
      `nextMove actuel : ${normalizeString(entry.nextMove) ?? '(vide)'}`,
      gitContext ? `Activité git récente :\n${gitContext}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const prompt = `Tu es un expert en qualité logicielle. Analyse l'entrée de matrice admin quality ci-dessous et propose une valeur améliorée pour observedGap et nextMove.

${entryContext}

Réponds uniquement en JSON avec ce format exact :
{
  "observedGap": "...",
  "nextMove": "...",
  "rationale": "..."
}`;

    let aiResponse: { observedGap?: string; nextMove?: string; rationale?: string } = {};
    try {
      const responseText = await new Promise<string>((resolve, reject) => {
        const bodyData = JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 600,
        });
        const req = https.request(
          {
            hostname: 'api.openai.com',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'Content-Length': Buffer.byteLength(bodyData),
            },
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data));
          },
        );
        req.on('error', reject);
        req.write(bodyData);
        req.end();
      });

      const parsed = JSON.parse(responseText);
      const content = parsed?.choices?.[0]?.message?.content ?? '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      strapi.log?.error?.('agentSuggestNarrative: OpenAI call failed', error);
      ctx.internalServerError('AI narrative generation failed.');
      return;
    }

    const modelId = 'gpt-4o-mini';
    const generatedAt = new Date().toISOString();
    const createdProposalIds: string[] = [];

    for (const field of requestedFields) {
      const suggestedValue = normalizeString(aiResponse[field] as unknown, 4_000);
      if (!suggestedValue) continue;

      const proposalId = `suggest-narrative::${entryId}::${field}::${Date.now()}`;
      await strapi.entityService.create(NEED_PROPOSAL_UID, {
        data: {
          proposalId,
          entryId,
          type: 'suggest-narrative',
          status: 'proposed',
          confidence: 'medium',
          title: `Suggestion IA — ${field} (${entryId})`,
          summary: suggestedValue.slice(0, 200),
          source: { agent: 'openai', model: modelId, generatedAt },
          payload: {
            field,
            suggestedValue,
            rationale: normalizeString(aiResponse.rationale as unknown, 1_000) ?? '',
          },
          history: [
            {
              event: 'created-by-agent',
              at: generatedAt,
              model: modelId,
            },
          ],
          reportedAt: generatedAt,
        } as any,
      });
      createdProposalIds.push(proposalId);
    }

    await strapi.entityService.update(MATRIX_ENTRY_UID, entry.id, {
      data: {
        agentObservedGap: normalizeString(aiResponse.observedGap as unknown, 4_000) ?? null,
        agentNextMove: normalizeString(aiResponse.nextMove as unknown, 4_000) ?? null,
        agentNarrativeGeneratedAt: generatedAt,
        agentNarrativeModel: modelId,
      } as any,
    });

    ctx.body = { data: { entryId, createdProposalIds, generatedAt, model: modelId } };
  },

  async chatWithAgent(ctx: Context) {
    const apiKey = process.env['OPENAI_API_KEY']?.trim();
    if (!apiKey) {
      ctx.status = 503;
      ctx.body = { error: 'OPENAI_API_KEY not configured' };
      return;
    }

    const reqBody = ctx.request.body as Record<string, unknown>;
    const rawMessages = Array.isArray(reqBody?.['messages']) ? reqBody['messages'] : [];
    if (rawMessages.length === 0) {
      ctx.status = 400;
      ctx.body = { error: 'messages is required and must be a non-empty array' };
      return;
    }

    const messages = (rawMessages as Array<Record<string, unknown>>)
      .filter(
        (m) =>
          (m['role'] === 'user' || m['role'] === 'assistant') &&
          typeof m['content'] === 'string',
      )
      .map((m) => ({ role: m['role'] as string, content: m['content'] as string }));

    if (messages.length === 0) {
      ctx.status = 400;
      ctx.body = { error: 'No valid messages provided' };
      return;
    }

    const context = (reqBody?.['context'] as Record<string, unknown>) ?? {};
    const entryIds = Array.isArray(context['entryIds'])
      ? (context['entryIds'] as string[]).filter((id) => typeof id === 'string')
      : undefined;

    const model = 'gpt-4o';
    const systemPrompt = await buildChatSystemPrompt(strapi, entryIds);

    const stream = new PassThrough();
    ctx.set('Content-Type', 'text/event-stream');
    ctx.set('Cache-Control', 'no-cache');
    ctx.set('Connection', 'keep-alive');
    ctx.set('X-Accel-Buffering', 'no');
    ctx.body = stream;
    ctx.status = 200;

    try {
      const fullText = await openaiStreamMessages(apiKey, model, systemPrompt, messages, (chunk) => {
        chatSseEvent(stream, 'text', { content: chunk });
      });

      const proposals = extractChatProposals(fullText);
      const createdProposalIds: string[] = [];
      const generatedAt = new Date().toISOString();

      for (const proposal of proposals) {
        try {
          if (
            proposal.type === 'suggest-narrative' &&
            proposal.entryId &&
            (proposal.field === 'observedGap' || proposal.field === 'nextMove')
          ) {
            const proposalId = `suggest-narrative::${proposal.entryId}::${proposal.field}::chat::${Date.now()}`;
            await strapi.entityService.create(NEED_PROPOSAL_UID, {
              data: {
                proposalId,
                entryId: proposal.entryId,
                type: 'suggest-narrative',
                status: 'proposed',
                confidence: 'medium',
                title: `Suggestion IA chat — ${proposal.field} (${proposal.entryId})`,
                summary: `Proposé lors d'une session de chat le ${generatedAt.slice(0, 10)}`,
                source: { agent: 'openai', model, generatedAt },
                payload: {
                  field: proposal.field,
                  suggestedValue: proposal.body,
                  rationale: 'Proposé via chat agent',
                },
                history: [{ event: 'created-by-chat', at: generatedAt, model }],
                reportedAt: generatedAt,
              } as any,
            });
            createdProposalIds.push(proposalId);
            chatSseEvent(stream, 'proposal-created', {
              proposalId,
              type: 'suggest-narrative',
              entryId: proposal.entryId,
              field: proposal.field,
            });
          } else if (proposal.type === 'create-entry') {
            let candidate: Record<string, unknown> = {};
            try {
              candidate = JSON.parse(proposal.body);
            } catch {
              candidate = { need: proposal.body };
            }
            const entryId = typeof candidate['id'] === 'string' ? candidate['id'] : `chat-entry-${Date.now()}`;
            const proposalId = `create-entry::${entryId}::chat::${Date.now()}`;
            await strapi.entityService.create(NEED_PROPOSAL_UID, {
              data: {
                proposalId,
                entryId,
                type: 'create-entry',
                status: 'proposed',
                confidence: 'low',
                title: `Nouvelle entrée candidate — ${entryId}`,
                summary: `Proposée lors d'une session de chat le ${generatedAt.slice(0, 10)}`,
                source: { agent: 'openai', model, generatedAt },
                payload: { candidateEntry: candidate },
                history: [{ event: 'created-by-chat', at: generatedAt, model }],
                reportedAt: generatedAt,
              } as any,
            });
            createdProposalIds.push(proposalId);
            chatSseEvent(stream, 'proposal-created', {
              proposalId,
              type: 'create-entry',
              entryId,
            });
          }
        } catch {
          // individual proposal creation failures should not abort the stream
        }
      }

      chatSseEvent(stream, 'done', { generatedAt, proposalCount: createdProposalIds.length });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      chatSseEvent(stream, 'error', { message });
    } finally {
      stream.end();
    }
  },
});
