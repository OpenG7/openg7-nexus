import { Injectable, inject } from '@angular/core';

import {
  buildAdminQualityAgentTaskAction,
  buildAdminQualityAgentTaskActions,
} from './admin-quality-agent-actions';
import {
  AdminQualityMatrixEntry,
  AdminQualityMatrixSnapshot,
} from './admin-quality-matrix.service';
import { ADMIN_QUALITY_NOTIFICATIONS, ADMIN_QUALITY_ROUTE_CONFIG } from './admin-quality.ports';

export interface AdminQualityAgentWorkloadAdviceInput {
  readonly snapshot: AdminQualityMatrixSnapshot;
  readonly proofGapCount: number;
  readonly refreshRequiredCount: number;
}

export interface AdminQualityAgentNextWorkAdviceInput {
  readonly entryId: string;
  readonly domain: string;
  readonly actionLabel: string;
  readonly nextMove: string;
  readonly tone: string;
  readonly score: number;
}

const AGENT_SOURCE = 'admin-quality-agent';
const AGENT_WORKLOAD_DEDUPE_KEY = `${AGENT_SOURCE}:workload`;
const AGENT_NEXT_WORK_DEDUPE_PREFIX = `${AGENT_SOURCE}:next-work`;
const AGENT_SNOOZE_MS = 30 * 60 * 1000;

@Injectable()
export class AdminQualityAgentAdvisorService {
  private readonly notifications = inject(ADMIN_QUALITY_NOTIFICATIONS);
  private readonly routeConfig = inject(ADMIN_QUALITY_ROUTE_CONFIG);
  private workloadToastSignature: string | null = null;
  private nextWorkToastSignature: string | null = null;

  announceWorkload(input: AdminQualityAgentWorkloadAdviceInput): void {
    const openEntries = input.snapshot.entries.filter((entry) => !this.isEntryFullyGreen(entry));
    const automationReadyCount = openEntries.filter(
      (entry) => !this.isEntryBlockedForAgent(entry),
    ).length;
    const decisionCount = openEntries.length - automationReadyCount;
    const signature = [
      input.snapshot.generatedAt,
      openEntries.length,
      automationReadyCount,
      decisionCount,
      input.proofGapCount,
      input.refreshRequiredCount,
    ].join(':');

    if (signature === this.workloadToastSignature) {
      return;
    }

    this.workloadToastSignature = signature;

    if (!openEntries.length) {
      this.notifications.success(
        'Agent admin-quality: aucun chantier ouvert, la matrice est verte.',
        {
          title: 'Agent admin-quality',
          source: AGENT_SOURCE,
          actions: [this.openAgentCockpitAction(), this.snoozeAgentAction()],
          metadata: {
            kind: 'agent-workload',
            dedupeKey: AGENT_WORKLOAD_DEDUPE_KEY,
            openCount: 0,
          },
        },
      );
      return;
    }

    const taskActions = buildAdminQualityAgentTaskActions(openEntries);

    this.notifications.info(
      `Agent admin-quality: ${openEntries.length} chantier(s) ouvert(s), ${automationReadyCount} automatisable(s), ${decisionCount} decision(s) humaine(s), ${input.proofGapCount} preuve(s) a renforcer.`,
      {
        title: 'Agent admin-quality',
        source: AGENT_SOURCE,
        actions: taskActions.length
          ? taskActions
          : [this.openAgentCockpitAction(), this.snoozeAgentAction()],
        metadata: {
          kind: 'agent-workload',
          dedupeKey: AGENT_WORKLOAD_DEDUPE_KEY,
          openCount: openEntries.length,
          automationReadyCount,
          decisionCount,
          proofCount: input.proofGapCount,
          refreshCount: input.refreshRequiredCount,
          taskActionCount: taskActions.length,
        },
      },
    );
  }

  announceNextWork(input: AdminQualityAgentNextWorkAdviceInput): void {
    const signature = `${input.entryId}:${input.tone}:${input.score}:${input.nextMove}`;
    if (signature === this.nextWorkToastSignature) {
      return;
    }

    this.nextWorkToastSignature = signature;
    this.notifications.info(
      `Je peux preparer "${input.actionLabel}" pour ${input.domain}. ${input.nextMove}`,
      {
        title: 'Proposition agent',
        source: AGENT_SOURCE,
        actions: [
          buildAdminQualityAgentTaskAction({
            entryId: input.entryId,
            domain: input.domain,
            actionLabel: input.actionLabel,
          }),
        ],
        metadata: {
          kind: 'agent-next-work',
          dedupeKey: `${AGENT_NEXT_WORK_DEDUPE_PREFIX}:${input.entryId}`,
          entryId: input.entryId,
          tone: input.tone,
          score: input.score,
        },
      },
    );
  }

  private openAgentCockpitAction() {
    return {
      id: 'admin-quality-agent-toast-open-cockpit',
      label: 'Ouvrir cockpit',
      kind: 'route' as const,
      route: this.routeConfig.adminQuality,
    };
  }

  private snoozeAgentAction() {
    return {
      id: 'admin-quality-agent-toast-snooze',
      label: 'Plus tard',
      kind: 'snooze' as const,
      durationMs: AGENT_SNOOZE_MS,
    };
  }

  private isEntryFullyGreen(entry: AdminQualityMatrixEntry): boolean {
    return (
      entry.managementBucket === 'covered' &&
      entry.summaryStatus === 'oui' &&
      entry.businessStatus === 'oui' &&
      entry.implementationStatus === 'oui' &&
      entry.e2eStatus === 'oui'
    );
  }

  private isEntryBlockedForAgent(entry: AdminQualityMatrixEntry): boolean {
    return (
      entry.needsProductWorkFirst ||
      entry.managementBucket === 'product-gap' ||
      entry.managementBucket === 'scope-limit'
    );
  }
}
