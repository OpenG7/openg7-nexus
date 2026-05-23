export type AdminQualityMatrixStatus = 'oui' | 'partiel' | 'non' | 'hors MVP';
export type AdminQualityMatrixPriority = 'basse' | 'moyenne' | 'haute';
export type AdminQualityMatrixBucket = 'covered' | 'proof-gap' | 'product-gap' | 'scope-limit';
export type AdminQualityMatrixSourceStatus = 'fresh' | 'stale' | 'fallback';
export type AdminQualityMatrixSignalId =
  | 'summary'
  | 'business'
  | 'implementation'
  | 'e2e'
  | 'readiness'
  | 'priority';
export type AdminQualityMatrixSignalConfirmationSource =
  | 'repo-signal'
  | 'proof-returned'
  | 'done'
  | 'pull-request-merged';
export type AdminQualityMatrixDiscoveryConfidence = 'low' | 'medium' | 'high';

export interface AdminQualityMatrixSourceRef {
  readonly type: string;
  readonly path: string | null;
  readonly value: string | null;
  readonly label: string | null;
}

export interface AdminQualityMatrixImpactRule {
  readonly type: string;
  readonly prefixes: readonly string[];
}

export interface AdminQualityMatrixSignalDispatchState {
  readonly pending: boolean;
  readonly requestedAt: string | null;
  readonly confirmedAt: string | null;
  readonly confirmationSource: AdminQualityMatrixSignalConfirmationSource | null;
  readonly workflow: string | null;
  readonly ref: string | null;
}

export interface AdminQualityMatrixEntry {
  readonly id: string;
  readonly domain: string;
  readonly need: string;
  readonly acceptanceCriteria?: readonly string[];
  readonly sourceRefs?: readonly AdminQualityMatrixSourceRef[];
  readonly impactRules?: readonly AdminQualityMatrixImpactRule[];
  readonly confidence?: AdminQualityMatrixDiscoveryConfidence;
  readonly lastDiscoveredAt?: string | null;
  readonly summaryStatus: AdminQualityMatrixStatus;
  readonly businessStatus: AdminQualityMatrixStatus;
  readonly implementationStatus: AdminQualityMatrixStatus;
  readonly e2eStatus: AdminQualityMatrixStatus;
  readonly priority: AdminQualityMatrixPriority;
  readonly managementBucket: AdminQualityMatrixBucket;
  readonly needsProductWorkFirst: boolean;
  readonly observedGap: string;
  readonly nextMove: string;
  readonly evidence: readonly string[];
  readonly reviewedAt: string;
  readonly repoSignalAt: string | null;
  readonly repoSignalCommit: string | null;
  readonly repoSignalSource: string | null;
  readonly repoSignalSummary: string | null;
  readonly signalDispatch: Partial<
    Record<AdminQualityMatrixSignalId, AdminQualityMatrixSignalDispatchState>
  >;
  readonly lastRecalculation?: AdminQualityMatrixStoredRecalculation | null;
  readonly agentObservedGap?: string | null;
  readonly agentNextMove?: string | null;
  readonly agentNarrativeGeneratedAt?: string | null;
  readonly agentNarrativeModel?: string | null;
}

export interface AdminQualityMatrixEditPayload {
  readonly observedGap?: string | null;
  readonly nextMove?: string | null;
  readonly managementBucket?: AdminQualityMatrixBucket | null;
  readonly needsProductWorkFirst?: boolean | null;
  readonly priority?: AdminQualityMatrixPriority | null;
  readonly reviewedAt?: string | null;
}

export interface AdminQualityAgentSuggestionProposal {
  readonly id: string | null;
  readonly proposalId: string;
  readonly field: string;
  readonly suggestedValue: string;
}

export interface AdminQualityAgentSuggestionResult {
  readonly entryId: string;
  readonly proposals: readonly AdminQualityAgentSuggestionProposal[];
  readonly generatedAt: string;
  readonly model: string | null;
}

export interface AdminQualityMatrixSnapshot {
  readonly generatedAt: string;
  readonly sourceStatus: AdminQualityMatrixSourceStatus;
  readonly sourceMessage: string | null;
  readonly entries: readonly AdminQualityMatrixEntry[];
}

export type AdminQualityMatrixRecalculationScope = 'refresh-required' | 'selected-entry' | 'all';

export type AdminQualityMatrixRecalculationResult =
  | 'unchanged'
  | 'proposal-review-required'
  | 'blocked-insufficient-proof'
  | 'blocked-conflicting-signals';

export type AdminQualityMatrixRecalculationConfidence = 'low' | 'medium' | 'high';
export type AdminQualityMatrixPilotPriority = 'now' | 'next' | 'later' | 'blocked';
export type AdminQualityMatrixPilotBucket =
  | 'ready-to-build'
  | 'needs-proof'
  | 'needs-product-call'
  | 'blocked-by-api'
  | 'ready-to-close';
export type AdminQualityMatrixPilotActionType =
  | 'implement-feature'
  | 'add-test'
  | 'fix-proof-gap'
  | 'update-contract'
  | 'run-validation'
  | 'review-product-scope'
  | 'close-entry';

export interface AdminQualityMatrixDevelopmentCommand {
  readonly score: number;
  readonly bucket: AdminQualityMatrixPilotBucket;
  readonly priority: AdminQualityMatrixPilotPriority;
  readonly actionType: AdminQualityMatrixPilotActionType;
  readonly rationale: readonly string[];
  readonly targetFiles: readonly string[];
  readonly acceptanceCriteria: readonly string[];
  readonly suggestedCommands: readonly string[];
  readonly expectedEvidence: readonly string[];
  readonly blockingReason: string | null;
}

export interface AdminQualityMatrixCoverageProposal {
  readonly summaryStatus: AdminQualityMatrixStatus;
  readonly businessStatus: AdminQualityMatrixStatus;
  readonly implementationStatus: AdminQualityMatrixStatus;
  readonly e2eStatus: AdminQualityMatrixStatus;
  readonly managementBucket: AdminQualityMatrixBucket;
  readonly needsProductWorkFirst: boolean;
}

export interface AdminQualityMatrixRecalculationEntry {
  readonly entryId: string;
  readonly domain: string;
  readonly result: AdminQualityMatrixRecalculationResult;
  readonly confidence: AdminQualityMatrixRecalculationConfidence;
  readonly current: AdminQualityMatrixCoverageProposal;
  readonly proposed: AdminQualityMatrixCoverageProposal | null;
  readonly reasons: readonly string[];
  readonly evidence: readonly string[];
  readonly pilot: AdminQualityMatrixDevelopmentCommand;
  readonly factualSignals: {
    readonly reviewedAt: string | null;
    readonly repoSignalAt: string | null;
    readonly repoSignalCommit: string | null;
    readonly repoSignalSource: string | null;
    readonly latestDecisionAt: string | null;
  };
}

export interface AdminQualityMatrixRecalculationSnapshot {
  readonly generatedAt: string;
  readonly scope: AdminQualityMatrixRecalculationScope;
  readonly summary: {
    readonly analyzedCount: number;
    readonly proposalCount: number;
    readonly unchangedCount: number;
    readonly blockedCount: number;
  };
  readonly entries: readonly AdminQualityMatrixRecalculationEntry[];
}

export interface AdminQualityMatrixStoredRecalculation {
  readonly generatedAt: string;
  readonly scope: AdminQualityMatrixRecalculationScope;
  readonly automatic: boolean;
  readonly entry: AdminQualityMatrixRecalculationEntry;
}

export interface AdminQualityMatrixApplyProposalResult {
  readonly appliedAt: string;
  readonly entry: AdminQualityMatrixEntry;
  readonly proposal: AdminQualityMatrixRecalculationEntry;
}

export type AdminQualityNeedProposalType =
  | 'add-source-ref'
  | 'create-entry'
  | 'mark-stale'
  | 'suggest-narrative';
export type AdminQualityNeedProposalStatus = 'proposed' | 'accepted' | 'rejected' | 'superseded';

export interface AdminQualityNeedProposal {
  readonly id: string | null;
  readonly proposalId: string;
  readonly entryId: string;
  readonly type: AdminQualityNeedProposalType;
  readonly status: AdminQualityNeedProposalStatus;
  readonly confidence: AdminQualityMatrixDiscoveryConfidence;
  readonly title: string | null;
  readonly summary: string | null;
  readonly source: Record<string, unknown>;
  readonly payload: Record<string, unknown>;
  readonly history: readonly Record<string, unknown>[];
  readonly correlationId: string | null;
  readonly reportedAt: string | null;
  readonly updatedAt: string | null;
}

export interface AdminQualityNeedProposalsSnapshot {
  readonly generatedAt: string;
  readonly proposals: readonly AdminQualityNeedProposal[];
}
