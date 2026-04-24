import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

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
        return label.includes('bloquee') ? 'Lever le blocage avant reprise.' : 'Suivre issue, artefacts et hypotheses.';
      case 'review':
        return 'Relire tests, preuves et ecarts restants.';
      default:
        return 'Decider si la matrice peut etre mise a jour.';
    }
  }
}
