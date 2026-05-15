import { Injectable, computed, signal } from '@angular/core';
import {
  GithubActionNotificationState,
  GithubActionNotificationStatus,
} from './github-action-notification-status';

export type CodexLiveTimelineStepState = 'pending' | 'active' | 'completed' | 'failed';

export interface CodexLiveTimelineStep {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly state: CodexLiveTimelineStepState;
  readonly startedAt: number | null;
  readonly completedAt: number | null;
}

export interface CodexLiveTimelineEvent {
  readonly id: string;
  readonly createdAt: number;
  readonly label: string;
  readonly state: CodexLiveTimelineStepState;
}

export interface CodexLiveTimelineRun {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly provider: string;
  readonly source: string | null;
  readonly workflow: string | null;
  readonly ref: string | null;
  readonly runNumber: number | null;
  readonly runUrl: string | null;
  readonly pullRequestNumber: number | null;
  readonly pullRequestUrl: string | null;
  readonly startedAt: number;
  readonly updatedAt: number;
  readonly terminalState: GithubActionNotificationState | null;
  readonly steps: readonly CodexLiveTimelineStep[];
  readonly events: readonly CodexLiveTimelineEvent[];
}

export interface StartCodexLiveTimelineInput {
  readonly provider: string;
  readonly task: string;
  readonly source?: string | null;
  readonly actionLabel?: string | null;
}

export interface CodexLiveTimelineDispatchInfo {
  readonly workflow: string;
  readonly ref: string;
}

export interface CodexLiveTimelinePullRequestInfo {
  readonly number: number | null;
  readonly url: string | null;
  readonly title?: string | null;
}

const SYNTHETIC_STEP_DELAYS_MS = [900, 2_100, 3_600];
const MAX_EVENTS = 18;

@Injectable({ providedIn: 'root' })
export class CodexLiveTimelineService {
  private readonly runSig = signal<CodexLiveTimelineRun | null>(null);
  private readonly openSig = signal(false);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  readonly run = this.runSig.asReadonly();
  readonly isOpen = this.openSig.asReadonly();
  readonly hasActiveRun = computed(() => Boolean(this.runSig()));

  start(input: StartCodexLiveTimelineInput): string {
    this.clearTimers();

    const now = Date.now();
    const id = `codex-live-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const provider = this.providerLabel(input.provider);
    const subtitle = input.actionLabel?.trim() || input.task.trim().slice(0, 110);
    const steps = this.defaultSteps().map((step, index) =>
      index === 0
        ? {
            ...step,
            state: 'active' as const,
            startedAt: now,
          }
        : step,
    );

    this.runSig.set({
      id,
      title: 'Deploiement du chantier',
      subtitle: subtitle || `${provider} prepare le workflow.`,
      provider,
      source: input.source ?? null,
      workflow: null,
      ref: null,
      runNumber: null,
      runUrl: null,
      pullRequestNumber: null,
      pullRequestUrl: null,
      startedAt: now,
      updatedAt: now,
      terminalState: null,
      steps,
      events: [
        {
          id: `${id}-event-start`,
          createdAt: now,
          label: 'Analyse du repo...',
          state: 'active',
        },
      ],
    });
    this.openSig.set(true);
    this.scheduleSyntheticProgress(id);

    return id;
  }

  show(): void {
    if (this.runSig()) {
      this.openSig.set(true);
    }
  }

  hide(): void {
    this.openSig.set(false);
  }

  clear(): void {
    this.clearTimers();
    this.runSig.set(null);
    this.openSig.set(false);
  }

  recordDispatchQueued(
    runId: string | null | undefined,
    dispatch: CodexLiveTimelineDispatchInfo,
  ): void {
    this.updateRun(runId, (run) => {
      const advanced = this.advanceToStep(run, 'tests');
      return {
        ...advanced,
        workflow: dispatch.workflow,
        ref: dispatch.ref,
        subtitle: `${run.provider} envoye vers ${dispatch.workflow} sur ${dispatch.ref}.`,
        events: this.appendEvent(
          advanced,
          `Dispatch GitHub Actions recu (${dispatch.workflow}).`,
          'completed',
        ),
      };
    });
  }

  recordDispatchError(runId: string | null | undefined, message: string): void {
    this.updateRun(runId, (run) => this.failRun(run, message));
  }

  recordGithubStatus(
    runId: string | null | undefined,
    status: GithubActionNotificationStatus,
  ): void {
    this.updateRun(runId, (run) => {
      const baseRun: CodexLiveTimelineRun = {
        ...run,
        workflow: status.workflow ?? run.workflow,
        runNumber: status.runNumber ?? run.runNumber,
        runUrl: status.runUrl ?? run.runUrl,
        terminalState: this.isTerminal(status.state) ? status.state : null,
      };

      if (status.state === 'failed') {
        return this.failRun(baseRun, status.detail || status.label);
      }

      if (status.state === 'completed') {
        return this.completeRun(baseRun, status.detail || status.label);
      }

      const targetStep = status.state === 'in-progress' ? 'ci' : 'changes';
      const advanced = this.advanceToStep(baseRun, targetStep);
      return {
        ...advanced,
        events: this.appendEvent(advanced, status.detail || status.label, 'active'),
      };
    });
  }

  recordPullRequest(
    runId: string | null | undefined,
    pullRequest: CodexLiveTimelinePullRequestInfo,
  ): void {
    if (!pullRequest.number && !pullRequest.url) {
      return;
    }

    this.updateRun(runId, (run) => {
      const label = pullRequest.number
        ? `Pull Request ouverte #${pullRequest.number}.`
        : 'Pull Request ouverte.';
      const completed = this.completeRun(run, label);
      return {
        ...completed,
        pullRequestNumber: pullRequest.number,
        pullRequestUrl: pullRequest.url,
        events: this.appendEvent(completed, label, 'completed'),
      };
    });
  }

  private scheduleSyntheticProgress(runId: string): void {
    const stepIds: ReadonlyArray<CodexLiveTimelineStep['id']> = ['files', 'tests', 'changes'];
    SYNTHETIC_STEP_DELAYS_MS.forEach((delay, index) => {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        this.updateRun(runId, (run) => this.advanceToStep(run, stepIds[index]));
      }, delay);
      this.timers.add(timer);
    });
  }

  private updateRun(
    runId: string | null | undefined,
    updater: (run: CodexLiveTimelineRun) => CodexLiveTimelineRun,
  ): void {
    const current = this.runSig();
    if (!current || current.id !== runId) {
      return;
    }

    this.runSig.set({
      ...updater(current),
      updatedAt: Date.now(),
    });
  }

  private advanceToStep(
    run: CodexLiveTimelineRun,
    targetStepId: CodexLiveTimelineStep['id'],
  ): CodexLiveTimelineRun {
    if (run.terminalState) {
      return run;
    }

    const targetIndex = run.steps.findIndex((step) => step.id === targetStepId);
    if (targetIndex < 0) {
      return run;
    }

    const now = Date.now();
    const steps = run.steps.map((step, index) => {
      if (step.state === 'failed') {
        return step;
      }

      if (index < targetIndex) {
        return {
          ...step,
          state: 'completed' as const,
          startedAt: step.startedAt ?? now,
          completedAt: step.completedAt ?? now,
        };
      }

      if (index === targetIndex) {
        if (step.state === 'completed') {
          return step;
        }
        return {
          ...step,
          state: 'active' as const,
          startedAt: step.startedAt ?? now,
        };
      }

      return step;
    });

    const activeStep = steps[targetIndex];
    const eventLabel =
      activeStep.state === 'active' ? `${activeStep.label}...` : `${activeStep.label}.`;

    return {
      ...run,
      steps,
      events: this.appendEvent(run, eventLabel, activeStep.state),
    };
  }

  private completeRun(run: CodexLiveTimelineRun, message: string): CodexLiveTimelineRun {
    this.clearTimers();
    const now = Date.now();
    const steps = run.steps.map((step) => ({
      ...step,
      state: 'completed' as const,
      startedAt: step.startedAt ?? now,
      completedAt: step.completedAt ?? now,
    }));

    return {
      ...run,
      terminalState: 'completed',
      steps,
      events: this.appendEvent(run, message, 'completed'),
    };
  }

  private failRun(run: CodexLiveTimelineRun, message: string): CodexLiveTimelineRun {
    this.clearTimers();
    const now = Date.now();
    let failedAssigned = false;
    const steps = run.steps.map((step) => {
      if (step.state === 'active' && !failedAssigned) {
        failedAssigned = true;
        return {
          ...step,
          state: 'failed' as const,
          completedAt: now,
        };
      }
      return step;
    });

    return {
      ...run,
      terminalState: 'failed',
      steps,
      events: this.appendEvent(run, message, 'failed'),
    };
  }

  private appendEvent(
    run: CodexLiveTimelineRun,
    label: string,
    state: CodexLiveTimelineStepState,
  ): readonly CodexLiveTimelineEvent[] {
    const trimmed = label.trim();
    if (!trimmed) {
      return run.events;
    }

    const last = run.events[run.events.length - 1];
    if (last?.label === trimmed && last.state === state) {
      return run.events;
    }

    return [
      ...run.events,
      {
        id: `${run.id}-event-${Date.now().toString(36)}-${run.events.length}`,
        createdAt: Date.now(),
        label: trimmed,
        state,
      },
    ].slice(-MAX_EVENTS);
  }

  private defaultSteps(): readonly CodexLiveTimelineStep[] {
    return [
      {
        id: 'repo',
        label: 'Analyse du repo',
        detail: 'Lecture du contexte et des contraintes.',
        state: 'pending',
        startedAt: null,
        completedAt: null,
      },
      {
        id: 'files',
        label: 'Identification des fichiers concernes',
        detail: 'Selection des surfaces a modifier.',
        state: 'pending',
        startedAt: null,
        completedAt: null,
      },
      {
        id: 'tests',
        label: 'Generation des tests',
        detail: 'Preparation des verifications utiles.',
        state: 'pending',
        startedAt: null,
        completedAt: null,
      },
      {
        id: 'changes',
        label: 'Application des changements',
        detail: 'Patch cible et controle de coherence.',
        state: 'pending',
        startedAt: null,
        completedAt: null,
      },
      {
        id: 'ci',
        label: 'Execution CI',
        detail: 'Suivi du workflow et des preuves.',
        state: 'pending',
        startedAt: null,
        completedAt: null,
      },
      {
        id: 'commit',
        label: 'Commit ou artefacts generes',
        detail: 'Sortie du workflow de contribution.',
        state: 'pending',
        startedAt: null,
        completedAt: null,
      },
      {
        id: 'pr',
        label: 'Pull Request / preuve publiee',
        detail: 'Lien final pret a inspecter.',
        state: 'pending',
        startedAt: null,
        completedAt: null,
      },
    ];
  }

  private providerLabel(provider: string): string {
    return provider === 'codex' ? 'Codex' : provider;
  }

  private isTerminal(state: GithubActionNotificationState): boolean {
    return state === 'completed' || state === 'failed';
  }

  private clearTimers(): void {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}
