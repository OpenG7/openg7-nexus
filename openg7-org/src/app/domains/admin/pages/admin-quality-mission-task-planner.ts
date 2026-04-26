import { AdminQualityDelegationDifficulty } from './admin-quality-delegation';
import { AdminQualityMissionRecommendation } from './admin-quality-mission-control';

export type AdminQualityMissionTaskKind = 'alignment' | 'implementation' | 'validation' | 'proof';

export interface AdminQualityMissionTask {
  readonly id: string;
  readonly kind: AdminQualityMissionTaskKind;
  readonly headline: string;
  readonly support: string;
  readonly estimatedUnits: number;
  readonly blocking: boolean;
}

export interface AdminQualityMissionQuotaSummary {
  readonly availableUnits: number;
  readonly requiredUnits: number;
  readonly remainingUnits: number;
  readonly shortageUnits: number;
  readonly sufficient: boolean;
  readonly taskCount: number;
}

interface AdminQualityMissionUsageProfile {
  readonly alignment: number;
  readonly implementation: number;
  readonly validation: number;
  readonly proof: number;
}

const USAGE_PROFILES: Record<AdminQualityDelegationDifficulty, AdminQualityMissionUsageProfile> = {
  Easy: {
    alignment: 6,
    implementation: 8,
    validation: 4,
    proof: 5,
  },
  Medium: {
    alignment: 8,
    implementation: 10,
    validation: 5,
    proof: 6,
  },
  Hard: {
    alignment: 10,
    implementation: 14,
    validation: 6,
    proof: 8,
  },
};

export function buildMissionTasks(
  recommendation: AdminQualityMissionRecommendation,
  difficulty: AdminQualityDelegationDifficulty
): readonly AdminQualityMissionTask[] {
  const usage = USAGE_PROFILES[difficulty];
  const tasks: AdminQualityMissionTask[] = [];

  tasks.push({
    id: `${recommendation.id}::alignment`,
    kind: 'alignment',
    headline: recommendation.dependencies[0] ?? recommendation.title,
    support: recommendation.operatorPrompt,
    estimatedUnits: usage.alignment,
    blocking: true,
  });

  tasks.push(
    ...recommendation.targetFiles.map((file, index) => ({
      id: `${recommendation.id}::file::${index}`,
      kind: 'implementation' as const,
      headline: file,
      support: recommendation.summary,
      estimatedUnits: usage.implementation,
      blocking: false,
    }))
  );

  tasks.push(
    ...recommendation.validationCommands.map((command, index) => ({
      id: `${recommendation.id}::validation::${index}`,
      kind: 'validation' as const,
      headline: command,
      support: recommendation.acceptanceCriteria[index] ?? recommendation.acceptanceCriteria[0] ?? recommendation.whyNow,
      estimatedUnits: usage.validation,
      blocking: false,
    }))
  );

  tasks.push({
    id: `${recommendation.id}::proof`,
    kind: 'proof',
    headline: recommendation.acceptanceCriteria[0] ?? recommendation.title,
    support: recommendation.suggestedOwner,
    estimatedUnits: usage.proof,
    blocking: false,
  });

  return tasks;
}

export function summarizeMissionQuota(
  tasks: readonly AdminQualityMissionTask[],
  availableUnits: number
): AdminQualityMissionQuotaSummary {
  const requiredUnits = tasks.reduce((sum, task) => sum + task.estimatedUnits, 0);
  const remainingUnits = availableUnits - requiredUnits;

  return {
    availableUnits,
    requiredUnits,
    remainingUnits,
    shortageUnits: remainingUnits < 0 ? Math.abs(remainingUnits) : 0,
    sufficient: remainingUnits >= 0,
    taskCount: tasks.length,
  };
}
