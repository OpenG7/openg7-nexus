import type { AdminQualityNotificationAction } from '../admin-quality.tokens';
import { buildDelegationPlan } from '../pages/admin-quality-delegation';

import { resolveAdminAiProviderOption } from './admin-ai-providers';
import type { AdminOpsCodexScope } from './admin-ops.service';
import type { AdminQualityMatrixEntry } from './admin-quality-matrix.service';

const MAX_AGENT_TASK_ACTIONS = 4;
const TASK_LABEL_MAX_LENGTH = 34;
const CODEX_PROVIDER = 'codex' as const;

export interface AdminQualityAgentTaskActionInput {
  readonly entryId: string;
  readonly domain: string;
  readonly actionLabel: string;
  readonly task?: string | null;
  readonly targetFiles?: readonly string[];
  readonly nextMove?: string | null;
}

export function buildAdminQualityAgentTaskActions(
  entries: readonly AdminQualityMatrixEntry[],
): readonly AdminQualityNotificationAction[] {
  return entries
    .filter(isCodexDevelopmentCandidate)
    .slice()
    .sort(compareCodexDevelopmentCandidates)
    .slice(0, MAX_AGENT_TASK_ACTIONS)
    .map((entry) => {
      const plan = buildDelegationPlan(entry);
      return buildAdminQualityAgentTaskAction({
        entryId: entry.id,
        domain: entry.domain,
        actionLabel: actionLabelForEntry(entry),
        task: plan.codexPrompt,
        targetFiles: plan.targetFiles,
        nextMove: entry.nextMove,
      });
    });
}

export function buildAdminQualityAgentTaskAction(
  input: AdminQualityAgentTaskActionInput,
): AdminQualityNotificationAction {
  const targetFiles = input.targetFiles ?? [];
  const codexModel = resolveAdminAiProviderOption(CODEX_PROVIDER).defaultModel;

  return {
    id: `admin-quality-agent-task-${sanitizeActionId(input.entryId)}`,
    label: compactTaskLabel(`Codex ${input.actionLabel}`, input.domain),
    kind: 'codex-dispatch',
    codexDispatch: {
      provider: CODEX_PROVIDER,
      task: input.task?.trim() || buildFallbackCodexTask(input),
      scope: resolveCodexScope(targetFiles),
      baseBranch: 'main',
      draftPr: true,
      model: codexModel,
      effort: null,
    },
  };
}

function buildFallbackCodexTask(input: AdminQualityAgentTaskActionInput): string {
  return [
    `Objectif: ${input.actionLabel} pour le domaine "${input.domain}".`,
    `Entry id: ${input.entryId}`,
    input.nextMove ? `Resultat attendu: ${input.nextMove}` : null,
    '',
    'Utilise la matrice admin-quality pour generer le developpement cible, garder les changements limites au scope et proposer les validations pertinentes.',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

function resolveCodexScope(targetFiles: readonly string[]): AdminOpsCodexScope {
  if (targetFiles.length && targetFiles.every((file) => file.startsWith('strapi/'))) {
    return 'strapi';
  }
  if (targetFiles.some((file) => file.startsWith('packages/contracts/'))) {
    return 'packages-contracts';
  }
  if (targetFiles.some((file) => file.startsWith('packages/tooling/'))) {
    return 'packages-tooling';
  }
  if (targetFiles.some((file) => file.startsWith('openg7-org/'))) {
    return 'openg7-org';
  }
  return 'repository-root';
}

function isCodexDevelopmentCandidate(entry: AdminQualityMatrixEntry): boolean {
  if (isEntryFullyGreen(entry) || entry.managementBucket === 'scope-limit') {
    return false;
  }

  return entry.e2eStatus !== 'oui' || entry.implementationStatus !== 'oui';
}

function compareCodexDevelopmentCandidates(
  left: AdminQualityMatrixEntry,
  right: AdminQualityMatrixEntry,
): number {
  return scoreForEntry(right) - scoreForEntry(left) || left.domain.localeCompare(right.domain);
}

function scoreForEntry(entry: AdminQualityMatrixEntry): number {
  return (
    priorityRank(entry.priority) * 24 +
    statusGap(entry.implementationStatus) * 18 +
    statusGap(entry.e2eStatus) * 18 +
    (entry.managementBucket === 'product-gap' || entry.needsProductWorkFirst ? 18 : 0) +
    (entry.managementBucket === 'proof-gap' ? 16 : 0)
  );
}

function actionLabelForEntry(entry: AdminQualityMatrixEntry): string {
  if (entry.managementBucket === 'product-gap' || entry.needsProductWorkFirst) {
    return 'Surface';
  }

  if (entry.e2eStatus !== 'oui' || entry.managementBucket === 'proof-gap') {
    return 'Preuve';
  }

  if (entry.implementationStatus !== 'oui') {
    return 'Dev';
  }

  return 'Decision';
}

function compactTaskLabel(actionLabel: string, domain: string): string {
  const normalizedAction = actionLabel.trim() || 'Codex';
  const normalizedDomain = domain.trim() || 'chantier';
  return shorten(`${normalizedAction}: ${normalizedDomain}`, TASK_LABEL_MAX_LENGTH);
}

function shorten(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function sanitizeActionId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

function isEntryFullyGreen(entry: AdminQualityMatrixEntry): boolean {
  return (
    entry.managementBucket === 'covered' &&
    entry.summaryStatus === 'oui' &&
    entry.businessStatus === 'oui' &&
    entry.implementationStatus === 'oui' &&
    entry.e2eStatus === 'oui'
  );
}

function priorityRank(priority: AdminQualityMatrixEntry['priority']): number {
  switch (priority) {
    case 'haute':
      return 3;
    case 'moyenne':
      return 2;
    default:
      return 1;
  }
}

function statusGap(status: AdminQualityMatrixEntry['implementationStatus']): number {
  switch (status) {
    case 'oui':
      return 0;
    case 'partiel':
      return 1;
    case 'hors MVP':
      return 1;
    default:
      return 2;
  }
}