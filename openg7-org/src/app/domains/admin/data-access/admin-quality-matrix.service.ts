import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { STRAPI_ROUTES } from '@app/core/api/strapi.routes';
import { SUPPRESS_ERROR_TOAST } from '@app/core/http/error.interceptor.tokens';
import { HttpClientService } from '@app/core/http/http-client.service';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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

interface AdminQualityMatrixResponse {
  readonly generatedAt?: string | null;
  readonly sourceStatus?: AdminQualityMatrixSourceStatus | null;
  readonly sourceMessage?: string | null;
  readonly entries?: readonly Partial<AdminQualityMatrixEntry>[] | null;
}

interface AdminQualityMatrixRecalculationEntryResponse {
  readonly entryId?: string | null;
  readonly domain?: string | null;
  readonly result?: AdminQualityMatrixRecalculationResult | null;
  readonly confidence?: AdminQualityMatrixRecalculationConfidence | null;
  readonly current?: Partial<AdminQualityMatrixCoverageProposal> | null;
  readonly proposed?: Partial<AdminQualityMatrixCoverageProposal> | null;
  readonly reasons?: readonly string[] | null;
  readonly evidence?: readonly string[] | null;
  readonly pilot?: Partial<AdminQualityMatrixDevelopmentCommand> | null;
  readonly factualSignals?: {
    readonly reviewedAt?: string | null;
    readonly repoSignalAt?: string | null;
    readonly repoSignalCommit?: string | null;
    readonly repoSignalSource?: string | null;
    readonly latestDecisionAt?: string | null;
  } | null;
}

interface AdminQualityMatrixRecalculationResponse {
  readonly generatedAt?: string | null;
  readonly scope?: AdminQualityMatrixRecalculationScope | null;
  readonly summary?: {
    readonly analyzedCount?: number | null;
    readonly proposalCount?: number | null;
    readonly unchangedCount?: number | null;
    readonly blockedCount?: number | null;
  } | null;
  readonly entries?: ReadonlyArray<AdminQualityMatrixRecalculationEntryResponse> | null;
}

interface AdminQualityMatrixApplyProposalResponse {
  readonly appliedAt?: string | null;
  readonly entry?: Partial<AdminQualityMatrixEntry> | null;
  readonly proposal?: AdminQualityMatrixRecalculationEntryResponse | null;
}

interface StrapiDataResponse<T> {
  readonly data: T;
}

const EMPTY_SNAPSHOT: AdminQualityMatrixSnapshot = {
  generatedAt: '2026-04-11T00:00:00.000Z',
  sourceStatus: 'fallback',
  sourceMessage: 'La matrice QA embarquee est indisponible; affichage du fallback vide.',
  entries: [],
};

const EMPTY_RECALCULATION_SNAPSHOT: AdminQualityMatrixRecalculationSnapshot = {
  generatedAt: EMPTY_SNAPSHOT.generatedAt,
  scope: 'refresh-required',
  summary: {
    analyzedCount: 0,
    proposalCount: 0,
    unchangedCount: 0,
    blockedCount: 0,
  },
  entries: [],
};

const STALE_AFTER_DAYS = 7;
const MS_PER_DAY = 86_400_000;

@Injectable({ providedIn: 'root' })
export class AdminQualityMatrixService {
  private readonly http = inject(HttpClientService);
  private readonly silentOptions = {
    context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
  };
  private readonly silentMutationOptions = {
    context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
    withCredentials: false,
  };

  loadMatrix(): Observable<AdminQualityMatrixSnapshot> {
    return this.http
      .get<
        StrapiDataResponse<AdminQualityMatrixResponse>
      >(STRAPI_ROUTES.admin.qualityMatrix, this.silentOptions)
      .pipe(
        map((response) => this.normalizeSnapshot(response.data)),
        catchError((error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 401 || error.status === 403)
          ) {
            return throwError(() => error);
          }

          return of(EMPTY_SNAPSHOT);
        }),
      );
  }

  recalculateMatrix(
    scope: AdminQualityMatrixRecalculationScope,
    entryId?: string | null,
  ): Observable<AdminQualityMatrixRecalculationSnapshot> {
    return this.http
      .post<StrapiDataResponse<AdminQualityMatrixRecalculationResponse>>(
        STRAPI_ROUTES.admin.qualityMatrixRecalculate,
        {
          scope,
          entryId: entryId ?? null,
        },
        this.silentMutationOptions,
      )
      .pipe(map((response) => this.normalizeRecalculationSnapshot(response.data)));
  }

  applyMatrixProposal(entryId: string): Observable<AdminQualityMatrixApplyProposalResult> {
    return this.http
      .post<
        StrapiDataResponse<AdminQualityMatrixApplyProposalResponse>
      >(STRAPI_ROUTES.admin.qualityMatrixApplyProposal, { entryId }, this.silentMutationOptions)
      .pipe(map((response) => this.normalizeApplyProposalResult(response.data)));
  }

  private normalizeSnapshot(
    response: AdminQualityMatrixResponse | null | undefined,
  ): AdminQualityMatrixSnapshot {
    const generatedAt =
      typeof response?.generatedAt === 'string' && response.generatedAt.trim()
        ? response.generatedAt
        : EMPTY_SNAPSHOT.generatedAt;

    const entries = Array.isArray(response?.entries)
      ? response.entries
          .map((entry) => this.normalizeEntry(entry))
          .filter((entry): entry is AdminQualityMatrixEntry => entry !== null)
      : [];

    return {
      generatedAt,
      sourceStatus:
        response?.sourceStatus === 'fresh' ||
        response?.sourceStatus === 'stale' ||
        response?.sourceStatus === 'fallback'
          ? response.sourceStatus
          : this.resolveSourceStatus(generatedAt),
      sourceMessage:
        typeof response?.sourceMessage === 'string' || response?.sourceMessage === null
          ? response.sourceMessage
          : this.resolveSourceMessage(generatedAt),
      entries,
    };
  }

  private normalizeEntry(
    entry: Partial<AdminQualityMatrixEntry> | null | undefined,
  ): AdminQualityMatrixEntry | null {
    if (
      !entry ||
      typeof entry.id !== 'string' ||
      typeof entry.domain !== 'string' ||
      typeof entry.need !== 'string'
    ) {
      return null;
    }

    return {
      id: entry.id,
      domain: entry.domain,
      need: entry.need,
      summaryStatus: this.normalizeStatus(entry.summaryStatus),
      businessStatus: this.normalizeStatus(entry.businessStatus),
      implementationStatus: this.normalizeStatus(entry.implementationStatus),
      e2eStatus: this.normalizeStatus(entry.e2eStatus),
      priority: this.normalizePriority(entry.priority),
      managementBucket: this.normalizeBucket(entry.managementBucket),
      needsProductWorkFirst: Boolean(entry.needsProductWorkFirst),
      observedGap: typeof entry.observedGap === 'string' ? entry.observedGap : '',
      nextMove: typeof entry.nextMove === 'string' ? entry.nextMove : '',
      evidence: Array.isArray(entry.evidence)
        ? entry.evidence.filter((item): item is string => typeof item === 'string')
        : [],
      reviewedAt:
        typeof entry.reviewedAt === 'string' && entry.reviewedAt.trim()
          ? entry.reviewedAt
          : EMPTY_SNAPSHOT.generatedAt.slice(0, 10),
      repoSignalAt:
        typeof entry.repoSignalAt === 'string' && entry.repoSignalAt.trim()
          ? entry.repoSignalAt
          : null,
      repoSignalCommit:
        typeof entry.repoSignalCommit === 'string' && entry.repoSignalCommit.trim()
          ? entry.repoSignalCommit
          : null,
      repoSignalSource:
        typeof entry.repoSignalSource === 'string' && entry.repoSignalSource.trim()
          ? entry.repoSignalSource
          : null,
      repoSignalSummary:
        typeof entry.repoSignalSummary === 'string' && entry.repoSignalSummary.trim()
          ? entry.repoSignalSummary
          : null,
      signalDispatch: this.normalizeSignalDispatch(entry.signalDispatch),
      lastRecalculation: this.normalizeStoredRecalculation(entry.lastRecalculation),
    };
  }

  private normalizeSignalDispatch(
    value:
      | Partial<Record<AdminQualityMatrixSignalId, AdminQualityMatrixSignalDispatchState>>
      | null
      | undefined,
  ): Partial<Record<AdminQualityMatrixSignalId, AdminQualityMatrixSignalDispatchState>> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const normalized: Partial<
      Record<AdminQualityMatrixSignalId, AdminQualityMatrixSignalDispatchState>
    > = {};
    const signalIds: readonly AdminQualityMatrixSignalId[] = [
      'summary',
      'business',
      'implementation',
      'e2e',
      'readiness',
      'priority',
    ];

    for (const signalId of signalIds) {
      const state = value[signalId];
      if (!state || typeof state !== 'object') {
        continue;
      }

      normalized[signalId] = {
        pending: Boolean(state.pending),
        requestedAt:
          typeof state.requestedAt === 'string' && state.requestedAt.trim()
            ? state.requestedAt
            : null,
        confirmedAt:
          typeof state.confirmedAt === 'string' && state.confirmedAt.trim()
            ? state.confirmedAt
            : null,
        confirmationSource:
          state.confirmationSource === 'repo-signal' ||
          state.confirmationSource === 'proof-returned' ||
          state.confirmationSource === 'done' ||
          state.confirmationSource === 'pull-request-merged'
            ? state.confirmationSource
            : null,
        workflow:
          typeof state.workflow === 'string' && state.workflow.trim() ? state.workflow : null,
        ref: typeof state.ref === 'string' && state.ref.trim() ? state.ref : null,
      };
    }

    return normalized;
  }

  private normalizeCoverageProposal(
    proposal: Partial<AdminQualityMatrixCoverageProposal> | null | undefined,
  ): AdminQualityMatrixCoverageProposal | null {
    if (!proposal) {
      return null;
    }

    return {
      summaryStatus: this.normalizeStatus(proposal.summaryStatus),
      businessStatus: this.normalizeStatus(proposal.businessStatus),
      implementationStatus: this.normalizeStatus(proposal.implementationStatus),
      e2eStatus: this.normalizeStatus(proposal.e2eStatus),
      managementBucket: this.normalizeBucket(proposal.managementBucket),
      needsProductWorkFirst: Boolean(proposal.needsProductWorkFirst),
    };
  }

  private normalizeRecalculationSnapshot(
    response: AdminQualityMatrixRecalculationResponse | null | undefined,
  ): AdminQualityMatrixRecalculationSnapshot {
    const entries: AdminQualityMatrixRecalculationEntry[] = [];
    if (Array.isArray(response?.entries)) {
      response.entries.forEach((entry) => {
        const current = this.normalizeCoverageProposal(entry.current);
        if (!current || typeof entry.entryId !== 'string' || !entry.entryId.trim()) {
          return;
        }

        entries.push({
          entryId: entry.entryId,
          domain: typeof entry.domain === 'string' ? entry.domain : '',
          result:
            entry.result === 'proposal-review-required' ||
            entry.result === 'blocked-insufficient-proof' ||
            entry.result === 'blocked-conflicting-signals' ||
            entry.result === 'unchanged'
              ? entry.result
              : 'unchanged',
          confidence:
            entry.confidence === 'high' || entry.confidence === 'medium' ? entry.confidence : 'low',
          current,
          proposed: this.normalizeCoverageProposal(entry.proposed),
          reasons: Array.isArray(entry.reasons)
            ? entry.reasons.filter((value: unknown): value is string => typeof value === 'string')
            : [],
          evidence: Array.isArray(entry.evidence)
            ? entry.evidence.filter((value: unknown): value is string => typeof value === 'string')
            : [],
          pilot: this.normalizeDevelopmentCommand(entry.pilot, entry.result),
          factualSignals: {
            reviewedAt:
              typeof entry.factualSignals?.reviewedAt === 'string'
                ? entry.factualSignals.reviewedAt
                : null,
            repoSignalAt:
              typeof entry.factualSignals?.repoSignalAt === 'string'
                ? entry.factualSignals.repoSignalAt
                : null,
            repoSignalCommit:
              typeof entry.factualSignals?.repoSignalCommit === 'string'
                ? entry.factualSignals.repoSignalCommit
                : null,
            repoSignalSource:
              typeof entry.factualSignals?.repoSignalSource === 'string'
                ? entry.factualSignals.repoSignalSource
                : null,
            latestDecisionAt:
              typeof entry.factualSignals?.latestDecisionAt === 'string'
                ? entry.factualSignals.latestDecisionAt
                : null,
          },
        });
      });
    }

    return {
      generatedAt:
        typeof response?.generatedAt === 'string' && response.generatedAt.trim()
          ? response.generatedAt
          : EMPTY_RECALCULATION_SNAPSHOT.generatedAt,
      scope:
        response?.scope === 'selected-entry' ||
        response?.scope === 'all' ||
        response?.scope === 'refresh-required'
          ? response.scope
          : 'refresh-required',
      summary: {
        analyzedCount: Number(response?.summary?.analyzedCount ?? entries.length),
        proposalCount: Number(
          response?.summary?.proposalCount ??
            entries.filter((entry) => entry.result === 'proposal-review-required').length,
        ),
        unchangedCount: Number(
          response?.summary?.unchangedCount ??
            entries.filter((entry) => entry.result === 'unchanged').length,
        ),
        blockedCount: Number(
          response?.summary?.blockedCount ??
            entries.filter((entry) => entry.result.startsWith('blocked-')).length,
        ),
      },
      entries,
    };
  }

  private normalizeStoredRecalculation(
    value: Partial<AdminQualityMatrixStoredRecalculation> | null | undefined,
  ): AdminQualityMatrixStoredRecalculation | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const entry = this.normalizeRecalculationEntry(value.entry);
    if (!entry) {
      return null;
    }

    return {
      generatedAt:
        typeof value.generatedAt === 'string' && value.generatedAt.trim()
          ? value.generatedAt
          : EMPTY_RECALCULATION_SNAPSHOT.generatedAt,
      scope:
        value.scope === 'selected-entry' ||
        value.scope === 'all' ||
        value.scope === 'refresh-required'
          ? value.scope
          : 'refresh-required',
      automatic: Boolean(value.automatic),
      entry,
    };
  }

  private normalizeRecalculationEntry(
    entry: AdminQualityMatrixRecalculationEntryResponse | null | undefined,
  ): AdminQualityMatrixRecalculationEntry | null {
    const current = this.normalizeCoverageProposal(entry?.current);
    if (!current || typeof entry?.entryId !== 'string' || !entry.entryId.trim()) {
      return null;
    }

    return {
      entryId: entry.entryId,
      domain: typeof entry.domain === 'string' ? entry.domain : '',
      result:
        entry.result === 'proposal-review-required' ||
        entry.result === 'blocked-insufficient-proof' ||
        entry.result === 'blocked-conflicting-signals' ||
        entry.result === 'unchanged'
          ? entry.result
          : 'unchanged',
      confidence:
        entry.confidence === 'high' || entry.confidence === 'medium' ? entry.confidence : 'low',
      current,
      proposed: this.normalizeCoverageProposal(entry.proposed),
      reasons: Array.isArray(entry.reasons)
        ? entry.reasons.filter((value: unknown): value is string => typeof value === 'string')
        : [],
      evidence: Array.isArray(entry.evidence)
        ? entry.evidence.filter((value: unknown): value is string => typeof value === 'string')
        : [],
      pilot: this.normalizeDevelopmentCommand(entry.pilot, entry.result),
      factualSignals: {
        reviewedAt:
          typeof entry.factualSignals?.reviewedAt === 'string'
            ? entry.factualSignals.reviewedAt
            : null,
        repoSignalAt:
          typeof entry.factualSignals?.repoSignalAt === 'string'
            ? entry.factualSignals.repoSignalAt
            : null,
        repoSignalCommit:
          typeof entry.factualSignals?.repoSignalCommit === 'string'
            ? entry.factualSignals.repoSignalCommit
            : null,
        repoSignalSource:
          typeof entry.factualSignals?.repoSignalSource === 'string'
            ? entry.factualSignals.repoSignalSource
            : null,
        latestDecisionAt:
          typeof entry.factualSignals?.latestDecisionAt === 'string'
            ? entry.factualSignals.latestDecisionAt
            : null,
      },
    };
  }

  private normalizeApplyProposalResult(
    response: AdminQualityMatrixApplyProposalResponse | null | undefined,
  ): AdminQualityMatrixApplyProposalResult {
    const entry = this.normalizeEntry(response?.entry);
    const proposal = this.normalizeRecalculationEntry(response?.proposal);

    if (!entry || !proposal) {
      throw new Error('Invalid admin quality matrix apply-proposal response.');
    }

    return {
      appliedAt:
        typeof response?.appliedAt === 'string' && response.appliedAt.trim()
          ? response.appliedAt
          : new Date().toISOString(),
      entry,
      proposal,
    };
  }

  private normalizeDevelopmentCommand(
    value: Partial<AdminQualityMatrixDevelopmentCommand> | null | undefined,
    result: AdminQualityMatrixRecalculationResult | null | undefined,
  ): AdminQualityMatrixDevelopmentCommand {
    const bucket = this.normalizePilotBucket(value?.bucket, result);

    return {
      score: this.clampScore(value?.score),
      bucket,
      priority: this.normalizePilotPriority(value?.priority, bucket),
      actionType: this.normalizePilotActionType(value?.actionType, result),
      rationale: this.normalizeStringList(value?.rationale),
      targetFiles: this.normalizeStringList(value?.targetFiles),
      acceptanceCriteria: this.normalizeStringList(value?.acceptanceCriteria),
      suggestedCommands: this.normalizeStringList(value?.suggestedCommands),
      expectedEvidence: this.normalizeStringList(value?.expectedEvidence),
      blockingReason:
        typeof value?.blockingReason === 'string' && value.blockingReason.trim()
          ? value.blockingReason
          : null,
    };
  }

  private normalizePilotBucket(
    value: unknown,
    result: AdminQualityMatrixRecalculationResult | null | undefined,
  ): AdminQualityMatrixPilotBucket {
    if (
      value === 'ready-to-build' ||
      value === 'needs-proof' ||
      value === 'needs-product-call' ||
      value === 'blocked-by-api' ||
      value === 'ready-to-close'
    ) {
      return value;
    }

    if (result === 'proposal-review-required') {
      return 'ready-to-close';
    }

    if (result?.startsWith('blocked-')) {
      return 'needs-proof';
    }

    return 'ready-to-build';
  }

  private normalizePilotPriority(
    value: unknown,
    bucket: AdminQualityMatrixPilotBucket,
  ): AdminQualityMatrixPilotPriority {
    if (value === 'now' || value === 'next' || value === 'later' || value === 'blocked') {
      return value;
    }

    return bucket === 'blocked-by-api' || bucket === 'needs-product-call' ? 'blocked' : 'next';
  }

  private normalizePilotActionType(
    value: unknown,
    result: AdminQualityMatrixRecalculationResult | null | undefined,
  ): AdminQualityMatrixPilotActionType {
    if (
      value === 'implement-feature' ||
      value === 'add-test' ||
      value === 'fix-proof-gap' ||
      value === 'update-contract' ||
      value === 'run-validation' ||
      value === 'review-product-scope' ||
      value === 'close-entry'
    ) {
      return value;
    }

    if (result === 'proposal-review-required') {
      return 'close-entry';
    }

    if (result?.startsWith('blocked-')) {
      return 'fix-proof-gap';
    }

    return 'run-validation';
  }

  private normalizeStringList(value: unknown): readonly string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
  }

  private clampScore(value: unknown): number {
    const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }

  private normalizeStatus(
    status: AdminQualityMatrixEntry['e2eStatus'] | undefined,
  ): AdminQualityMatrixStatus {
    return status === 'oui' || status === 'partiel' || status === 'non' || status === 'hors MVP'
      ? status
      : 'non';
  }

  private normalizePriority(
    priority: AdminQualityMatrixEntry['priority'] | undefined,
  ): AdminQualityMatrixPriority {
    return priority === 'haute' || priority === 'moyenne' || priority === 'basse'
      ? priority
      : 'moyenne';
  }

  private normalizeBucket(
    bucket: AdminQualityMatrixEntry['managementBucket'] | undefined,
  ): AdminQualityMatrixBucket {
    return bucket === 'covered' ||
      bucket === 'proof-gap' ||
      bucket === 'product-gap' ||
      bucket === 'scope-limit'
      ? bucket
      : 'proof-gap';
  }

  private resolveSourceStatus(generatedAt: string): AdminQualityMatrixSourceStatus {
    const generatedTime = new Date(generatedAt).getTime();
    if (!Number.isFinite(generatedTime)) {
      return 'fallback';
    }

    const ageDays = (Date.now() - generatedTime) / MS_PER_DAY;
    return ageDays > STALE_AFTER_DAYS ? 'stale' : 'fresh';
  }

  private resolveSourceMessage(generatedAt: string): string | null {
    const generatedTime = new Date(generatedAt).getTime();
    if (!Number.isFinite(generatedTime)) {
      return 'La date de generation de la matrice QA est invalide.';
    }

    const ageDays = Math.floor((Date.now() - generatedTime) / MS_PER_DAY);
    if (ageDays <= STALE_AFTER_DAYS) {
      return null;
    }

    return `La matrice QA date de ${ageDays} jours; relancer l'audit ou la generation avant arbitrage final.`;
  }
}
