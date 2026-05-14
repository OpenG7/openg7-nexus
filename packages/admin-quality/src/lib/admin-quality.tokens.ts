import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface AdminQualityMatrixPort<
  TSnapshot = unknown,
  TRecalculationScope = string,
  TRecalculationSnapshot = unknown,
  TApplyProposalResult = unknown,
> {
  loadMatrix(): Observable<TSnapshot>;
  recalculateMatrix(
    scope: TRecalculationScope,
    entryId?: string | null,
  ): Observable<TRecalculationSnapshot>;
  applyMatrixProposal(entryId: string): Observable<TApplyProposalResult>;
}

export interface AdminQualityOpsPort<
  TSecuritySnapshot = unknown,
  TAiProofSnapshot = unknown,
  TDispatchRequest = unknown,
  TDispatchResponse = unknown,
> {
  getSecurity(): Observable<TSecuritySnapshot>;
  getAiProofs(): Observable<TAiProofSnapshot>;
  dispatchCodexWorkflow(payload: TDispatchRequest): Observable<TDispatchResponse>;
}

export interface AdminQualityMissionDecisionsPort<
  TDecisionSnapshot = unknown,
  TDecisionSaveInput = unknown,
  TDecisionRecord = unknown,
> {
  loadDecisions(): Observable<TDecisionSnapshot>;
  saveDecision(input: TDecisionSaveInput): Observable<TDecisionRecord>;
  deleteDecision(
    recommendationId: string,
  ): Observable<{ recommendationId: string; deleted: boolean }>;
}

export interface AdminQualityNotificationOptions {
  readonly title?: string | null;
  readonly source?: string | null;
  readonly context?: unknown;
  readonly metadata?: Record<string, unknown> | null;
  readonly actions?: readonly AdminQualityNotificationAction[];
}

export type AdminQualityCodexProvider = 'codex' | 'copilot' | 'claude' | 'gemini';

export type AdminQualityCodexScope =
  | 'openg7-org'
  | 'strapi'
  | 'packages-contracts'
  | 'packages-tooling'
  | 'repository-root';

export interface AdminQualityCodexDispatch {
  readonly provider: AdminQualityCodexProvider;
  readonly task: string;
  readonly scope: AdminQualityCodexScope;
  readonly baseBranch?: string | null;
  readonly draftPr?: boolean | null;
  readonly model?: string | null;
  readonly effort?: string | null;
}

export interface AdminQualityNotificationAction {
  readonly id: string;
  readonly label: string;
  readonly kind: 'copy' | 'route' | 'snooze' | 'dismiss' | 'codex-dispatch';
  readonly command?: string | null;
  readonly route?: string | null;
  readonly durationMs?: number | null;
  readonly codexDispatch?: AdminQualityCodexDispatch | null;
}

export interface AdminQualityNotificationPort {
  success(message: string, options?: AdminQualityNotificationOptions): string | void;
  info(message: string, options?: AdminQualityNotificationOptions): string | void;
  error(message: string, options?: AdminQualityNotificationOptions): string | void;
}

export interface AdminQualityRouteConfig {
  readonly adminHome: string;
  readonly adminOps: string;
  readonly adminQuality: string;
}

export const DEFAULT_ADMIN_QUALITY_ROUTE_CONFIG: AdminQualityRouteConfig = {
  adminHome: '/admin',
  adminOps: '/admin/ops',
  adminQuality: '/admin/quality',
};

export const ADMIN_QUALITY_MATRIX_PORT = new InjectionToken<AdminQualityMatrixPort>(
  'ADMIN_QUALITY_MATRIX_PORT',
);

export const ADMIN_QUALITY_OPS_PORT = new InjectionToken<AdminQualityOpsPort>(
  'ADMIN_QUALITY_OPS_PORT',
);

export const ADMIN_QUALITY_MISSION_DECISIONS_PORT =
  new InjectionToken<AdminQualityMissionDecisionsPort>('ADMIN_QUALITY_MISSION_DECISIONS_PORT');

export const ADMIN_QUALITY_NOTIFICATIONS = new InjectionToken<AdminQualityNotificationPort>(
  'ADMIN_QUALITY_NOTIFICATIONS',
);

export const ADMIN_QUALITY_ROUTE_CONFIG = new InjectionToken<AdminQualityRouteConfig>(
  'ADMIN_QUALITY_ROUTE_CONFIG',
  {
    factory: () => DEFAULT_ADMIN_QUALITY_ROUTE_CONFIG,
  },
);
