import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { AdminQualityMatrixEntry } from '../data-access/admin-quality-matrix.service';

import {
  AdminQualityMissionControlState,
  AdminQualityMissionPhase,
  AdminQualityMissionRecommendation,
  AdminQualityMissionStatus,
  AdminQualityMissionTimelineStatus,
} from './admin-quality-mission-control';
import { AdminQualityDelegationPlan } from './admin-quality-delegation';
import {
  AdminQualityMissionActionDescriptor,
  AdminQualityMissionActionTone,
  AdminQualityMissionControlAction,
  AdminQualityMissionControlActionEvent,
  missionActionDescriptors,
} from './admin-quality-mission-actions';

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

@Component({
  selector: 'og7-admin-quality-mission-control',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-quality-mission-control.component.html',
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
  readonly speaking = input(false);

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
      detail: this.selectedMission() ? this.missionStatusLabel(this.selectedMission()!.status) : 'Attente',
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
    }))
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

  isMissionSelected(recommendation: AdminQualityMissionRecommendation): boolean {
    return this.selectedMission()?.id === recommendation.id;
  }

  recommendationKindLabel(recommendation: AdminQualityMissionRecommendation): string {
    switch (recommendation.kind) {
      case 'core':
        return 'Mission coeur';
      case 'safety-net':
        return 'Safety net';
      default:
        return 'Gouvernance';
    }
  }

  missionPhaseClasses(phase: AdminQualityMissionPhase): string {
    switch (phase) {
      case 'ready':
        return 'border-indigo-200 bg-indigo-50 text-indigo-700';
      case 'execution':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'proof-review':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'completed':
        return 'border-slate-200 bg-slate-100 text-slate-700';
      case 'blocked':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      default:
        return 'border-sky-200 bg-sky-50 text-sky-700';
    }
  }

  missionTimelineClasses(status: AdminQualityMissionTimelineStatus): string {
    switch (status) {
      case 'done':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'current':
        return 'border-slate-900 bg-slate-900 text-white';
      default:
        return 'border-slate-200 bg-white text-slate-500';
    }
  }

  missionTimelineCardClasses(status: AdminQualityMissionTimelineStatus): string {
    switch (status) {
      case 'done':
        return 'border-emerald-300/25 bg-emerald-400/10 text-white';
      case 'current':
        return 'border-sky-300/35 bg-white/10 text-white shadow-[0_18px_34px_-22px_rgba(56,189,248,0.55)]';
      default:
        return 'border-white/10 bg-slate-950/35 text-slate-300';
    }
  }

  missionTimelineMarkerClasses(status: AdminQualityMissionTimelineStatus): string {
    switch (status) {
      case 'done':
        return 'border-emerald-300 bg-emerald-400 text-slate-950';
      case 'current':
        return 'border-sky-200 bg-sky-400/20 text-sky-100 shadow-[0_0_0_6px_rgba(56,189,248,0.12)]';
      default:
        return 'border-white/15 bg-slate-950/85 text-slate-400';
    }
  }

  missionTimelineConnectorClasses(status: AdminQualityMissionTimelineStatus): string {
    switch (status) {
      case 'done':
        return 'bg-linear-to-r from-emerald-300 via-sky-300 to-sky-200';
      case 'current':
        return 'bg-linear-to-r from-sky-300/80 to-white/10';
      default:
        return 'bg-white/10';
    }
  }

  missionTimelineVerticalConnectorClasses(status: AdminQualityMissionTimelineStatus): string {
    switch (status) {
      case 'done':
        return 'bg-linear-to-b from-emerald-300 via-sky-300 to-sky-200';
      case 'current':
        return 'bg-linear-to-b from-sky-300/80 to-white/10';
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

  missionTimelineMarkerLabel(status: AdminQualityMissionTimelineStatus, index: number): string {
    return status === 'done' ? '✓' : `${index + 1}`;
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
        return 'border-indigo-200 bg-indigo-50 text-indigo-700';
      case 'in-progress':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'proof-returned':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'done':
      case 'deferred':
        return 'border-slate-200 bg-slate-100 text-slate-700';
      case 'rejected':
      case 'blocked':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      default:
        return 'border-sky-200 bg-sky-50 text-sky-700';
    }
  }

  confidenceClasses(value: 'High' | 'Medium'): string {
    return value === 'High'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-amber-200 bg-amber-50 text-amber-700';
  }

  impactClasses(value: 'High' | 'Medium' | 'Low'): string {
    switch (value) {
      case 'High':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      case 'Low':
        return 'border-slate-200 bg-slate-100 text-slate-700';
      default:
        return 'border-amber-200 bg-amber-50 text-amber-700';
    }
  }

  workflowCardClasses(active: boolean): string {
    return active
      ? 'border-slate-900 bg-white text-slate-900 shadow-md'
      : 'border-slate-200 bg-slate-50/90 text-slate-700';
  }

  workflowBadgeClasses(accent: AdminQualityMissionWorkflowStep['accent'], active: boolean): string {
    if (!active) {
      return 'border-slate-200 text-slate-500';
    }

    switch (accent) {
      case 'sky':
        return 'border-sky-200 text-sky-700';
      case 'rose':
        return 'border-rose-200 text-rose-700';
      case 'emerald':
        return 'border-emerald-200 text-emerald-700';
      case 'amber':
        return 'border-amber-200 text-amber-700';
      default:
        return 'border-indigo-200 text-indigo-700';
    }
  }

  heroActions(recommendation: AdminQualityMissionRecommendation): readonly AdminQualityMissionActionDescriptor[] {
    return missionActionDescriptors(recommendation.status);
  }

  cardActions(recommendation: AdminQualityMissionRecommendation): readonly AdminQualityMissionActionDescriptor[] {
    return missionActionDescriptors(recommendation.status);
  }

  actionClasses(tone: AdminQualityMissionActionTone, surface: 'hero' | 'card'): string {
    if (surface === 'hero') {
      switch (tone) {
        case 'primary':
          return 'rounded-lg border border-orange-400/60 bg-orange-500/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400';
        case 'secondary':
          return 'rounded-lg border border-sky-300/50 bg-sky-500/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400';
        case 'danger':
          return 'rounded-lg border border-rose-300/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25';
        case 'success':
          return 'rounded-lg border border-emerald-300/40 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30';
        default:
          return 'rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10';
      }
    }

    switch (tone) {
      case 'primary':
        return 'rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700';
      case 'secondary':
        return 'rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100';
      case 'danger':
        return 'rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100';
      case 'success':
        return 'rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100';
      default:
        return 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100';
    }
  }

  emitMissionAction(action: AdminQualityMissionControlAction, recommendation: AdminQualityMissionRecommendation): void {
    this.missionAction.emit({ action, recommendation });
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
        return 'AI draft';
      case 'approval':
        return 'Go humain';
      case 'execution':
        return label.includes('bloquee') ? 'Blocage agent' : 'Agent actif';
      case 'review':
        return 'QA review';
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
        return label.includes('bloquee') ? 'Lever le blocage avant reprise.' : 'Suivre issue, artefacts et hypotheses.';
      case 'review':
        return 'Relire tests, preuves et ecarts restants.';
      default:
        return 'Decider si la matrice peut etre mise a jour.';
    }
  }
}
