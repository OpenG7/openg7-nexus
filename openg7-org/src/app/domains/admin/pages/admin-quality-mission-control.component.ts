import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { AdminQualityMatrixEntry } from '../data-access/admin-quality-matrix.service';

import { AdminQualityDelegationPlan } from './admin-quality-delegation';
import {
  AdminQualityMissionActionDescriptor,
  AdminQualityMissionActionTone,
  AdminQualityMissionControlAction,
  AdminQualityMissionControlActionEvent,
  missionActionDescriptors,
} from './admin-quality-mission-actions';
import {
  AdminQualityMissionControlState,
  AdminQualityMissionPhase,
  AdminQualityMissionRecommendation,
  AdminQualityMissionStatus,
  AdminQualityMissionTimelineStatus,
} from './admin-quality-mission-control';
import {
  AdminQualityMissionQuotaSummary,
  AdminQualityMissionTask,
  AdminQualityMissionTaskKind,
} from './admin-quality-mission-task-planner';

type AdminQualityMissionTelemetryState = 'live' | 'degraded' | 'syncing' | 'offline';
type AdminQualityMissionProofState =
  | 'queued'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'unavailable';

export interface AdminQualityMissionProofDisplay {
  readonly state: AdminQualityMissionProofState;
  readonly label: string;
  readonly summary: string;
  readonly detail: string;
  readonly artifactCount: number;
  readonly artifactLabel: string;
  readonly runLabel: string;
  readonly runUrl: string | null;
  readonly pullRequestLabel: string;
  readonly pullRequestUrl: string | null;
}

export interface AdminQualityMissionProviderComparisonEntry {
  readonly provider: string;
  readonly label: string;
  readonly selected: boolean;
  readonly opsState: 'armed' | 'constrained' | 'unsupported';
  readonly opsLabel: string;
  readonly opsDetail: string;
  readonly workflow: string;
  readonly proofState: AdminQualityMissionProofState;
  readonly proofLabel: string;
  readonly proofDetail: string;
  readonly artifactCount: number;
  readonly pullRequestLabel: string;
}

interface AdminQualityMissionWorkflowStep {
  readonly id: string;
  readonly label: string;
  readonly headline: string;
  readonly detail: string;
  readonly accent: 'sky' | 'rose' | 'emerald' | 'amber' | 'indigo';
  readonly active: boolean;
}

interface AdminQualityMissionTimelineStepView {
  readonly id: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly supportLabel: string;
  readonly helper: string;
  readonly status: AdminQualityMissionTimelineStatus;
}

interface AdminQualityMissionExecutionLoopStep {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly support: string;
  readonly status: 'done' | 'current' | 'pending' | 'blocked';
}

interface AdminQualityMissionEnergyLaneSegment {
  readonly id: string;
  readonly fromLabel: string;
  readonly toLabel: string;
  readonly state: 'charged' | 'flowing' | 'standby' | 'fault';
  readonly delayMs: number;
}

@Component({
  selector: 'og7-admin-quality-mission-control',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './admin-quality-mission-control.component.html',
  styles: [
    `
      :host {
        width: 100%;
      }

      .og7-flight-bay {
        position: relative;
        overflow: hidden;
      }

      .og7-flight-bay::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          115deg,
          transparent 0%,
          rgba(125, 211, 252, 0.08) 46%,
          transparent 100%
        );
        opacity: 0;
        transform: translateX(-110%);
        animation: og7-flight-sheen 6.4s ease-in-out infinite;
        pointer-events: none;
      }

      .og7-flight-key {
        transform-origin: 48px 32px;
        animation: og7-flight-key 720ms cubic-bezier(0.2, 0.9, 0.2, 1) both;
      }

      .og7-flight-indicator--armed {
        animation: og7-flight-pulse 2.5s ease-in-out infinite;
      }

      .og7-flight-telemetry--live {
        animation: og7-flight-pulse 2.2s ease-in-out infinite;
      }

      .og7-flight-telemetry--degraded {
        animation: og7-flight-degraded 2.6s ease-in-out infinite;
      }

      .og7-flight-telemetry--syncing {
        animation: og7-flight-sync 1.2s linear infinite;
      }

      .og7-mission-energy-beam {
        position: absolute;
        inset: 0;
        border-radius: 9999px;
      }

      .og7-mission-energy-beam--flowing {
        background: linear-gradient(
          90deg,
          rgba(34, 211, 238, 0.06) 0%,
          rgba(56, 189, 248, 0.92) 42%,
          rgba(34, 211, 238, 0.06) 100%
        );
        background-size: 220% 100%;
        animation: og7-mission-energy-flow 2.4s linear infinite;
      }

      .og7-mission-energy-beam--charged {
        background: linear-gradient(
          90deg,
          rgba(16, 185, 129, 0.2) 0%,
          rgba(52, 211, 153, 0.8) 100%
        );
        animation: og7-mission-energy-hum 2.8s ease-in-out infinite;
      }

      .og7-mission-energy-beam--fault {
        background: linear-gradient(
          90deg,
          rgba(251, 113, 133, 0.18) 0%,
          rgba(244, 63, 94, 0.82) 100%
        );
        animation: og7-mission-energy-fault 1.5s ease-in-out infinite;
      }

      @keyframes og7-flight-sheen {
        0%,
        24% {
          opacity: 0;
          transform: translateX(-110%);
        }

        32% {
          opacity: 1;
        }

        46% {
          opacity: 0;
          transform: translateX(110%);
        }

        100% {
          opacity: 0;
          transform: translateX(110%);
        }
      }

      @keyframes og7-flight-key {
        0% {
          transform: translateY(-50%) rotate(10deg) scale(0.92);
        }

        55% {
          transform: translateY(-50%) rotate(-16deg) scale(1.02);
        }

        100% {
          transform: translateY(-50%) rotate(-12deg) scale(1);
        }
      }

      @keyframes og7-flight-pulse {
        0%,
        100% {
          transform: scale(1);
          box-shadow:
            0 0 0 rgba(56, 189, 248, 0.12),
            0 0 18px rgba(56, 189, 248, 0.36);
        }

        50% {
          transform: scale(1.08);
          box-shadow:
            0 0 0 8px rgba(56, 189, 248, 0.08),
            0 0 24px rgba(56, 189, 248, 0.52);
        }
      }

      @keyframes og7-flight-degraded {
        0%,
        100% {
          opacity: 0.72;
          transform: scale(0.96);
        }

        50% {
          opacity: 1;
          transform: scale(1.06);
        }
      }

      @keyframes og7-flight-sync {
        0% {
          transform: scale(0.9);
          opacity: 0.55;
        }

        50% {
          transform: scale(1.14);
          opacity: 1;
        }

        100% {
          transform: scale(0.9);
          opacity: 0.55;
        }
      }

      @keyframes og7-mission-energy-flow {
        0% {
          background-position: 200% 0;
          opacity: 0.4;
        }

        50% {
          opacity: 1;
        }

        100% {
          background-position: -40% 0;
          opacity: 0.45;
        }
      }

      @keyframes og7-mission-energy-hum {
        0%,
        100% {
          opacity: 0.65;
          filter: saturate(0.9);
        }

        50% {
          opacity: 1;
          filter: saturate(1.18);
        }
      }

      @keyframes og7-mission-energy-fault {
        0%,
        100% {
          opacity: 0.55;
        }

        45% {
          opacity: 1;
        }

        60% {
          opacity: 0.35;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminQualityMissionControlComponent {
  readonly missionControl = input.required<AdminQualityMissionControlState>();
  readonly snapshotLoaded = input(false);
  readonly totalDomains = input(0);
  readonly selectedDomain = input<string | null>(null);
  readonly selectedEntry = input<AdminQualityMatrixEntry | null>(null);
  readonly selectedDelegation = input<AdminQualityDelegationPlan | null>(null);
  readonly selectedMission = input<AdminQualityMissionRecommendation | null>(null);
  readonly selectedMissionTasks = input<readonly AdminQualityMissionTask[]>([]);
  readonly selectedMissionQuotaSummary = input<AdminQualityMissionQuotaSummary | null>(null);
  readonly canStartSelectedMission = input(false);
  readonly selectedAiProviderLabel = input('Codex');
  readonly selectedAiProviderCaption = input('');
  readonly aiDispatchReady = input(false);
  readonly aiDispatchStatusLabel = input('Ops indisponible');
  readonly aiDispatchStatusDetail = input('');
  readonly aiDispatchWorkflow = input('workflow non detecte');
  readonly aiTelemetryState = input<AdminQualityMissionTelemetryState>('offline');
  readonly aiTelemetryLabel = input('Console offline');
  readonly aiTelemetryDetail = input('Waiting for Ops telemetry feed.');
  readonly aiDispatching = input(false);
  readonly selectedAiProof = input<AdminQualityMissionProofDisplay | null>(null);
  readonly providerComparison = input<readonly AdminQualityMissionProviderComparisonEntry[]>([]);
  readonly speaking = input(false);

  readonly activeProviderOpsSummary = computed<AdminQualityMissionProviderComparisonEntry | null>(
    () => this.providerComparison().find((entry) => entry.selected) ?? this.providerComparison()[0] ?? null,
  );
  readonly armedProviderCount = computed(
    () => this.providerComparison().filter((entry) => entry.opsState === 'armed').length,
  );

  readonly missionSelected = output<AdminQualityMissionRecommendation>();
  readonly missionAction = output<AdminQualityMissionControlActionEvent>();
  readonly speakRequested = output<void>();
  readonly stopSpeakingRequested = output<void>();

  readonly workflowSteps = computed<readonly AdminQualityMissionWorkflowStep[]>(() => [
    {
      id: 'snapshot',
      label: 'Snapshot',
      headline: this.snapshotLoaded() ? 'Charge' : 'En attente',
      detail: `${this.totalDomains()} domaine(s)`,
      accent: 'sky',
      active: this.snapshotLoaded(),
    },
    {
      id: 'entry',
      label: 'Entree',
      headline: this.selectedEntry()?.domain ?? 'Aucune',
      detail: this.selectedEntry()?.reviewedAt ?? 'Selection requise',
      accent: 'rose',
      active: Boolean(this.selectedEntry()),
    },
    {
      id: 'delegation',
      label: 'Delegation',
      headline: this.selectedDelegation()?.actionLabel ?? 'Aucun plan',
      detail: this.selectedDelegation()?.track ?? 'Selection requise',
      accent: 'emerald',
      active: Boolean(this.selectedDelegation()),
    },
    {
      id: 'mission',
      label: 'Mission',
      headline: this.missionControl().phaseLabel,
      detail: this.missionControl().operatorCue,
      accent: 'amber',
      active: true,
    },
    {
      id: 'proof',
      label: 'Preuve',
      headline: this.selectedMission()?.title ?? 'Aucune',
      detail: this.selectedMission()
        ? this.missionStatusLabel(this.selectedMission()!.status)
        : 'Attente',
      accent: 'indigo',
      active: Boolean(this.selectedMission()),
    },
  ]);

  readonly missionTimelineSteps = computed<readonly AdminQualityMissionTimelineStepView[]>(() =>
    this.missionControl().timeline.map((step) => ({
      id: step.id,
      label: step.label,
      shortLabel: this.timelineShortLabel(step.id),
      supportLabel: this.timelineSupportLabel(step.id, step.label),
      helper: this.timelineHelper(step.id, step.label),
      status: step.status,
    })),
  );

  readonly missionTimelineProgress = computed(() => {
    const steps = this.missionTimelineSteps();
    const activeIndex = this.activeTimelineIndex(steps);
    const total = steps.length;

    return {
      activeIndex,
      currentStep: activeIndex + 1,
      total,
      percent: total > 1 ? (activeIndex / (total - 1)) * 100 : 100,
    };
  });

  readonly activeTimelineStep = computed<AdminQualityMissionTimelineStepView | null>(() => {
    const steps = this.missionTimelineSteps();
    const index = this.activeTimelineIndex(steps);
    return steps[index] ?? null;
  });
  readonly missionExecutionLoop = computed<readonly AdminQualityMissionExecutionLoopStep[]>(() => {
    const mission = this.selectedMission();
    const status = mission?.status ?? 'proposed';
    const dispatchReady = this.aiDispatchReady();
    const dispatching = this.aiDispatching();
    const workflow = this.aiDispatchWorkflow();
    const proof = this.selectedAiProof();

    const missionStepStatus: AdminQualityMissionExecutionLoopStep['status'] =
      status === 'blocked' || status === 'rejected'
        ? 'blocked'
        : status === 'proposed'
          ? 'current'
          : 'done';

    const dispatchStepStatus: AdminQualityMissionExecutionLoopStep['status'] = dispatching
      ? 'current'
      : ['in-progress', 'proof-returned', 'done'].includes(status)
        ? 'done'
        : dispatchReady
          ? 'pending'
          : 'blocked';

    const proofStepStatus: AdminQualityMissionExecutionLoopStep['status'] =
      status === 'done'
        ? 'done'
        : status === 'proof-returned'
          ? 'current'
          : status === 'blocked'
            ? 'blocked'
            : 'pending';

    const validationStepStatus: AdminQualityMissionExecutionLoopStep['status'] =
      status === 'done'
        ? 'done'
        : status === 'proof-returned'
          ? 'current'
          : status === 'rejected'
            ? 'blocked'
            : 'pending';

    return [
      {
        id: 'mission',
        label: 'Mission lock',
        detail:
          status === 'proposed'
            ? 'Awaiting operator approval.'
            : `Mission ${this.missionStatusLabel(status)}.`,
        support: mission?.title ?? 'No mission selected.',
        status: missionStepStatus,
      },
      {
        id: 'dispatch',
        label: 'Dispatch lane',
        detail: dispatching
          ? `Dispatch in progress through ${workflow}.`
          : dispatchStepStatus === 'done'
            ? `${workflow} has been queued for this mission.`
            : dispatchReady
              ? `Runway armed on ${workflow}.`
              : this.aiDispatchStatusLabel(),
        support: this.aiDispatchStatusDetail(),
        status: dispatchStepStatus,
      },
      {
        id: 'proof',
        label: 'Proof return',
        detail:
          status === 'proof-returned'
            ? 'Proof package is back for QA review.'
            : status === 'done'
              ? 'Proof accepted and archived.'
              : 'Waiting for evidence, tests and artefacts to return.',
        support: proof?.summary ?? 'Tests, screenshots, logs and PR evidence converge here.',
        status: proofStepStatus,
      },
      {
        id: 'validation',
        label: 'Final sign-off',
        detail:
          status === 'done'
            ? 'Final validation completed.'
            : status === 'proof-returned'
              ? 'Review proof and close the loop.'
              : 'Matrix update and closure remain pending.',
        support: 'Once validated, the mission can update coverage and leave the active queue.',
        status: validationStepStatus,
      },
    ];
  });
  readonly missionEnergyLaneSegments = computed<readonly AdminQualityMissionEnergyLaneSegment[]>(
    () => {
      const steps = this.missionExecutionLoop();
      const segments: AdminQualityMissionEnergyLaneSegment[] = [];

      for (let index = 0; index < steps.length - 1; index += 1) {
        const fromStep = steps[index];
        const toStep = steps[index + 1];
        if (!fromStep || !toStep) {
          continue;
        }

        segments.push({
          id: `${fromStep.id}-${toStep.id}`,
          fromLabel: fromStep.label,
          toLabel: toStep.label,
          state: this.resolveMissionEnergyLaneState(fromStep.status, toStep.status),
          delayMs: index * 180,
        });
      }

      return segments;
    },
  );

  readonly providerFlightDeckState = computed<'armed' | 'constrained'>(() => {
    return this.aiDispatchReady() ? 'armed' : 'constrained';
  });

  readonly providerFlightDeckLabel = computed(() => {
    return this.providerFlightDeckState() === 'armed' ? 'Ops armed' : 'Ops constrained';
  });

  readonly providerFlightDeckNote = computed(() => {
    const quota = this.selectedMissionQuotaSummary();
    const detail = this.aiDispatchStatusDetail();
    if (quota && this.aiDispatchReady()) {
      return `${this.selectedAiProviderLabel()} is cleared by Ops for this mission plan. ${detail}`;
    }

    return detail || `Verify live engine keys in Ops before dispatch.`;
  });

  readonly providerFlightDeckMetric = computed(() => {
    const quota = this.selectedMissionQuotaSummary();
    return quota?.requiredUnits ?? 0;
  });

  readonly providerFlightDeckMetricLabel = computed(() => {
    return 'Estimated units';
  });

  readonly providerFlightDeckMetricTone = computed<'ready' | 'warning'>(() => {
    return this.providerFlightDeckState() === 'armed' ? 'ready' : 'warning';
  });

  isMissionSelected(recommendation: AdminQualityMissionRecommendation): boolean {
    return this.selectedMission()?.id === recommendation.id;
  }

  recommendationKindLabel(recommendation: AdminQualityMissionRecommendation): string {
    switch (recommendation.kind) {
      case 'core':
        return 'Mission coeur';
      case 'safety-net':
        return 'Filet de securite';
      default:
        return 'Gouvernance';
    }
  }

  missionPhaseClasses(phase: AdminQualityMissionPhase): string {
    switch (phase) {
      case 'ready':
        return 'border-sky-400/25 bg-sky-400/10 text-sky-100';
      case 'execution':
        return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
      case 'proof-review':
        return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
      case 'completed':
        return 'border-white/12 bg-white/[0.05] text-slate-100';
      case 'blocked':
        return 'border-rose-400/25 bg-rose-400/10 text-rose-100';
      default:
        return 'border-violet-400/25 bg-violet-400/10 text-violet-100';
    }
  }

  providerFlightDeckStatusClasses(): string {
    return this.providerFlightDeckState() === 'armed'
      ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100'
      : 'border-amber-400/25 bg-amber-400/10 text-amber-100';
  }

  providerFlightDeckMetricClasses(): string {
    return this.providerFlightDeckMetricTone() === 'ready' ? 'text-cyan-100' : 'text-amber-100';
  }

  aiTelemetryClasses(): string {
    switch (this.aiTelemetryState()) {
      case 'live':
        return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
      case 'degraded':
        return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
      case 'syncing':
        return 'border-sky-400/25 bg-sky-400/10 text-sky-100';
      default:
        return 'border-white/12 bg-white/5 text-slate-200';
    }
  }

  missionLoopCardClasses(status: AdminQualityMissionExecutionLoopStep['status']): string {
    switch (status) {
      case 'done':
        return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-50';
      case 'current':
        return 'border-sky-400/30 bg-sky-400/12 text-white shadow-[0_24px_60px_-40px_rgba(56,189,248,0.55)]';
      case 'blocked':
        return 'border-rose-400/25 bg-rose-400/10 text-rose-50';
      default:
        return 'border-white/10 bg-white/4 text-slate-200';
    }
  }

  missionLoopBadgeClasses(status: AdminQualityMissionExecutionLoopStep['status']): string {
    switch (status) {
      case 'done':
        return 'border-emerald-300/35 bg-emerald-400/18 text-emerald-50';
      case 'current':
        return 'border-sky-300/45 bg-sky-400/20 text-sky-50';
      case 'blocked':
        return 'border-rose-300/35 bg-rose-400/18 text-rose-50';
      default:
        return 'border-white/10 bg-white/5 text-slate-300';
    }
  }

  missionLoopStatusLabel(status: AdminQualityMissionExecutionLoopStep['status']): string {
    switch (status) {
      case 'done':
        return 'Done';
      case 'current':
        return 'Current';
      case 'blocked':
        return 'Blocked';
      default:
        return 'Pending';
    }
  }

  missionEnergyLaneTrackClasses(state: AdminQualityMissionEnergyLaneSegment['state']): string {
    switch (state) {
      case 'charged':
        return 'border-emerald-300/18 bg-emerald-400/12';
      case 'flowing':
        return 'border-sky-300/20 bg-sky-400/12';
      case 'fault':
        return 'border-rose-300/18 bg-rose-400/12';
      default:
        return 'border-white/10 bg-white/5';
    }
  }

  missionEnergyLaneBeamClasses(state: AdminQualityMissionEnergyLaneSegment['state']): string {
    switch (state) {
      case 'charged':
        return 'og7-mission-energy-beam og7-mission-energy-beam--charged';
      case 'flowing':
        return 'og7-mission-energy-beam og7-mission-energy-beam--flowing';
      case 'fault':
        return 'og7-mission-energy-beam og7-mission-energy-beam--fault';
      default:
        return 'og7-mission-energy-beam opacity-0';
    }
  }

  missionEnergyLaneNodeClasses(status: AdminQualityMissionExecutionLoopStep['status']): string {
    switch (status) {
      case 'done':
        return 'border-emerald-300/35 bg-emerald-400/18 text-emerald-50 shadow-[0_0_18px_rgba(52,211,153,0.22)]';
      case 'current':
        return 'border-sky-300/45 bg-sky-400/20 text-sky-50 shadow-[0_0_24px_rgba(56,189,248,0.28)]';
      case 'blocked':
        return 'border-rose-300/35 bg-rose-400/18 text-rose-50 shadow-[0_0_18px_rgba(244,63,94,0.18)]';
      default:
        return 'border-white/10 bg-slate-900/85 text-slate-300';
    }
  }

  missionEnergyLaneStateLabel(state: AdminQualityMissionEnergyLaneSegment['state']): string {
    switch (state) {
      case 'charged':
        return 'charged';
      case 'flowing':
        return 'flowing';
      case 'fault':
        return 'fault';
      default:
        return 'standby';
    }
  }

  missionProofStateClasses(state: AdminQualityMissionProofState): string {
    switch (state) {
      case 'completed':
        return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
      case 'in-progress':
        return 'border-sky-400/25 bg-sky-400/10 text-sky-100';
      case 'queued':
        return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
      case 'failed':
        return 'border-rose-400/25 bg-rose-400/10 text-rose-100';
      default:
        return 'border-white/10 bg-white/5 text-slate-200';
    }
  }

  providerComparisonCardClasses(entry: AdminQualityMissionProviderComparisonEntry): string {
    if (entry.selected) {
      return 'border-cyan-300/35 bg-cyan-400/10 shadow-[0_24px_60px_-42px_rgba(34,211,238,0.35)]';
    }

    if (entry.opsState === 'armed') {
      return 'border-emerald-400/18 bg-emerald-400/8';
    }

    if (entry.opsState === 'unsupported') {
      return 'border-slate-400/18 bg-slate-900/70';
    }

    return 'border-amber-400/18 bg-amber-400/8';
  }

  providerComparisonOpsClasses(
    state: AdminQualityMissionProviderComparisonEntry['opsState'],
  ): string {
    return this.providerSocketOpsClasses(state);
  }

  providerSocketOpsClasses(
    state: AdminQualityMissionProviderComparisonEntry['opsState'],
  ): string {
    switch (state) {
      case 'armed':
        return 'border-emerald-300/35 bg-emerald-400/18 text-emerald-50';
      case 'unsupported':
        return 'border-slate-300/20 bg-slate-900/70 text-slate-100';
      default:
        return 'border-amber-300/35 bg-amber-400/18 text-amber-50';
    }
  }

  private resolveMissionEnergyLaneState(
    fromStatus: AdminQualityMissionExecutionLoopStep['status'],
    toStatus: AdminQualityMissionExecutionLoopStep['status'],
  ): AdminQualityMissionEnergyLaneSegment['state'] {
    if (fromStatus === 'blocked' || toStatus === 'blocked') {
      return 'fault';
    }

    if (fromStatus === 'current' || toStatus === 'current') {
      return 'flowing';
    }

    if (fromStatus === 'done' && toStatus === 'done') {
      return 'charged';
    }

    if (fromStatus === 'done' && toStatus === 'pending') {
      return 'flowing';
    }

    return 'standby';
  }

  missionCueLabel(): string {
    switch (this.missionControl().phase) {
      case 'ready':
        return 'Lancement cadre';
      case 'execution':
        return 'Forte attention';
      case 'proof-review':
        return 'Preuve a relire';
      case 'completed':
        return 'Boucle fermee';
      case 'blocked':
        return 'Blocage';
      default:
        return 'Decision requise';
    }
  }

  missionTimelineCardClasses(status: AdminQualityMissionTimelineStatus): string {
    switch (status) {
      case 'done':
        return 'border-emerald-400/20 bg-emerald-400/10 text-white';
      case 'current':
        return 'border-sky-400/30 bg-sky-400/12 text-white shadow-[0_22px_54px_-36px_rgba(56,189,248,0.75)]';
      default:
        return 'border-white/10 bg-slate-950/70 text-slate-300';
    }
  }

  missionTimelineMarkerClasses(status: AdminQualityMissionTimelineStatus): string {
    switch (status) {
      case 'done':
        return 'border-emerald-300/35 bg-emerald-400/20 text-emerald-50';
      case 'current':
        return 'border-sky-300/45 bg-sky-400/20 text-sky-50 shadow-[0_0_0_6px_rgba(56,189,248,0.14)]';
      default:
        return 'border-white/10 bg-slate-900 text-slate-400';
    }
  }

  missionTimelineConnectorClasses(status: AdminQualityMissionTimelineStatus): string {
    switch (status) {
      case 'done':
        return 'bg-linear-to-r from-emerald-300 via-sky-300 to-sky-300';
      case 'current':
        return 'bg-linear-to-r from-sky-300 to-white/10';
      default:
        return 'bg-white/10';
    }
  }

  missionTimelineVerticalConnectorClasses(status: AdminQualityMissionTimelineStatus): string {
    switch (status) {
      case 'done':
        return 'bg-linear-to-b from-emerald-300 via-sky-300 to-sky-300';
      case 'current':
        return 'bg-linear-to-b from-sky-300 to-white/10';
      default:
        return 'bg-white/10';
    }
  }

  missionTimelineStatusLabel(status: AdminQualityMissionTimelineStatus): string {
    switch (status) {
      case 'done':
        return 'terminee';
      case 'current':
        return 'active';
      default:
        return 'a venir';
    }
  }

  missionTimelineMarkerText(status: AdminQualityMissionTimelineStatus, index: number): string {
    return status === 'done' ? 'OK' : `${index + 1}`;
  }

  missionStatusLabel(status: AdminQualityMissionStatus): string {
    switch (status) {
      case 'approved':
        return 'Approuvee';
      case 'in-progress':
        return 'En cours';
      case 'proof-returned':
        return 'Preuve revenue';
      case 'done':
        return 'Cloturee';
      case 'deferred':
        return 'Differee';
      case 'rejected':
        return 'Rejetee';
      case 'blocked':
        return 'Bloquee';
      default:
        return 'Proposee';
    }
  }

  missionStatusClasses(status: AdminQualityMissionStatus): string {
    switch (status) {
      case 'approved':
        return 'border-sky-400/25 bg-sky-400/10 text-sky-100';
      case 'in-progress':
        return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
      case 'proof-returned':
        return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
      case 'done':
      case 'deferred':
        return 'border-white/12 bg-white/[0.05] text-slate-100';
      case 'rejected':
      case 'blocked':
        return 'border-rose-400/25 bg-rose-400/10 text-rose-100';
      default:
        return 'border-violet-400/25 bg-violet-400/10 text-violet-100';
    }
  }

  confidenceClasses(value: 'High' | 'Medium'): string {
    return value === 'High'
      ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
      : 'border-amber-400/25 bg-amber-400/10 text-amber-100';
  }

  impactClasses(value: 'High' | 'Medium' | 'Low'): string {
    switch (value) {
      case 'High':
        return 'border-rose-400/25 bg-rose-400/10 text-rose-100';
      case 'Low':
        return 'border-white/12 bg-white/[0.05] text-slate-100';
      default:
        return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
    }
  }

  workflowCardClasses(active: boolean): string {
    return active
      ? 'border-sky-400/25 bg-sky-400/10 text-white shadow-[0_24px_60px_-42px_rgba(56,189,248,0.76)]'
      : 'border-white/10 bg-white/[0.04] text-slate-300';
  }

  workflowBadgeClasses(accent: AdminQualityMissionWorkflowStep['accent'], active: boolean): string {
    if (!active) {
      return 'border-white/10 bg-white/[0.04] text-slate-400';
    }

    switch (accent) {
      case 'sky':
        return 'border-sky-300/40 bg-sky-400/16 text-sky-100';
      case 'rose':
        return 'border-rose-300/40 bg-rose-400/16 text-rose-100';
      case 'emerald':
        return 'border-emerald-300/40 bg-emerald-400/16 text-emerald-100';
      case 'amber':
        return 'border-amber-300/40 bg-amber-400/16 text-amber-100';
      default:
        return 'border-violet-300/40 bg-violet-400/16 text-violet-100';
    }
  }

  cardActions(
    recommendation: AdminQualityMissionRecommendation,
  ): readonly AdminQualityMissionActionDescriptor[] {
    return missionActionDescriptors(recommendation.status);
  }

  actionClasses(tone: AdminQualityMissionActionTone, surface: 'hero' | 'card'): string {
    if (surface === 'hero') {
      switch (tone) {
        case 'primary':
          return 'inline-flex min-h-11 items-center justify-center rounded-xl border border-sky-400/40 bg-linear-to-r from-sky-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-sky-400 hover:to-blue-400';
        case 'secondary':
          return 'inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/12 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/18';
        case 'danger':
          return 'inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-400/12 px-4 py-2.5 text-sm font-medium text-rose-100 transition hover:bg-rose-400/18';
        case 'success':
          return 'inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/12 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/18';
        default:
          return 'inline-flex min-h-11 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/[0.08]';
      }
    }

    switch (tone) {
      case 'primary':
        return 'rounded-xl border border-sky-400/35 bg-sky-400/12 px-3 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-400/18';
      case 'secondary':
        return 'rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-400/16';
      case 'danger':
        return 'rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-400/16';
      case 'success':
        return 'rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/16';
      default:
        return 'rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/[0.08]';
    }
  }

  confidencePercent(value: 'High' | 'Medium'): number {
    return value === 'High' ? 88 : 72;
  }

  confidenceRingBackground(value: 'High' | 'Medium'): string {
    const percent = this.confidencePercent(value);
    const degrees = `${Math.round(percent * 3.6)}deg`;
    const color = value === 'High' ? 'rgba(34,197,94,0.96)' : 'rgba(245,158,11,0.96)';
    return `conic-gradient(${color} 0deg ${degrees}, rgba(148,163,184,0.14) ${degrees} 360deg)`;
  }

  emitMissionAction(
    action: AdminQualityMissionControlAction,
    recommendation: AdminQualityMissionRecommendation,
  ): void {
    this.missionAction.emit({ action, recommendation });
  }

  isMissionActionDisabled(
    action: AdminQualityMissionControlAction,
    recommendation: AdminQualityMissionRecommendation,
  ): boolean {
    return this.isMissionActionBlocked(action, recommendation) && action !== 'auto-delegate';
  }

  quotaStatusClasses(sufficient: boolean): string {
    return sufficient
      ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
      : 'border-rose-400/25 bg-rose-400/10 text-rose-100';
  }

  taskKindClasses(kind: AdminQualityMissionTaskKind): string {
    switch (kind) {
      case 'alignment':
        return 'border-sky-400/25 bg-sky-400/10 text-sky-100';
      case 'implementation':
        return 'border-indigo-400/25 bg-indigo-400/10 text-indigo-100';
      case 'validation':
        return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
      default:
        return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
    }
  }

  taskKindKey(kind: AdminQualityMissionTaskKind): string {
    switch (kind) {
      case 'alignment':
        return 'admin.quality.codex.tasks.kinds.alignment';
      case 'implementation':
        return 'admin.quality.codex.tasks.kinds.implementation';
      case 'validation':
        return 'admin.quality.codex.tasks.kinds.validation';
      default:
        return 'admin.quality.codex.tasks.kinds.proof';
    }
  }

  isMissionActionBlocked(
    action: AdminQualityMissionControlAction,
    recommendation: AdminQualityMissionRecommendation,
  ): boolean {
    return (
      action === 'auto-delegate' &&
      this.isMissionSelected(recommendation) &&
      Boolean(this.selectedMissionQuotaSummary()) &&
      !this.canStartSelectedMission()
    );
  }

  private activeTimelineIndex(steps: readonly AdminQualityMissionTimelineStepView[]): number {
    const currentIndex = steps.findIndex((step) => step.status === 'current');
    if (currentIndex >= 0) {
      return currentIndex;
    }

    const doneIndex = [...steps].reverse().findIndex((step) => step.status === 'done');
    if (doneIndex >= 0) {
      return steps.length - 1 - doneIndex;
    }

    return 0;
  }

  private timelineShortLabel(id: string): string {
    switch (id) {
      case 'analysis':
        return 'Analyse';
      case 'approval':
        return 'Validation';
      case 'execution':
        return 'Execution';
      case 'review':
        return 'Preuve';
      default:
        return 'Cloture';
    }
  }

  private timelineSupportLabel(id: string, label: string): string {
    switch (id) {
      case 'analysis':
        return 'Analyse AI';
      case 'approval':
        return 'Validation humaine';
      case 'execution':
        return label.includes('bloquee') ? 'Blocage agent' : 'Mission active';
      case 'review':
        return 'Relecture QA';
      default:
        return 'Decision finale';
    }
  }

  private timelineHelper(id: string, label: string): string {
    switch (id) {
      case 'analysis':
        return 'Gap, mission et hypothese AI cadres.';
      case 'approval':
        return 'Arbitrage operateur avant depart.';
      case 'execution':
        return label.includes('bloquee')
          ? 'Lever le blocage avant reprise.'
          : 'Suivre issue, artefacts et hypotheses.';
      case 'review':
        return 'Relire tests, preuves et ecarts restants.';
      default:
        return 'Decider si la matrice peut etre mise a jour.';
    }
  }
}
