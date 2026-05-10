import type {
  AdminQualityMissionKind,
  AdminQualityMissionStatus,
} from '../pages/admin-quality-mission-control';

export interface AdminQualityMissionDecisionRecord {
  readonly recommendationId: string;
  readonly entryId: string;
  readonly kind: AdminQualityMissionKind;
  readonly status: AdminQualityMissionStatus;
  readonly title: string | null;
  readonly message: string | null;
  readonly operatorPrompt: string | null;
  readonly metadata: Record<string, unknown>;
  readonly decidedByUserId: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface AdminQualityMissionDecisionSnapshot {
  readonly generatedAt: string;
  readonly decisions: readonly AdminQualityMissionDecisionRecord[];
}

export interface AdminQualityMissionDecisionSaveInput {
  readonly recommendationId: string;
  readonly entryId: string;
  readonly kind: AdminQualityMissionKind;
  readonly status: AdminQualityMissionStatus;
  readonly title: string;
  readonly message: string;
  readonly operatorPrompt: string;
  readonly metadata: Record<string, unknown>;
}
