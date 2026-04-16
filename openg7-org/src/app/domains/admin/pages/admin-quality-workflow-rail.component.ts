import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { AdminQualityMatrixEntry } from '../data-access/admin-quality-matrix.service';

import { AdminQualityDelegationPlan } from './admin-quality-delegation';
import {
  AdminQualityMissionControlState,
  AdminQualityMissionRecommendation,
  AdminQualityMissionStatus,
} from './admin-quality-mission-control';

interface AdminQualityWorkflowStep {
  readonly id: string;
  readonly index: number;
  readonly label: string;
  readonly headline: string;
  readonly detail: string;
  readonly accent: 'sky' | 'rose' | 'emerald' | 'amber' | 'indigo';
  readonly active: boolean;
}

@Component({
  selector: 'og7-admin-quality-workflow-rail',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="rounded-[30px] border border-sky-100/90 bg-white/92 p-6 shadow-[0_28px_80px_-40px_rgba(37,99,235,0.34)] backdrop-blur"
      data-og7="admin-quality-local-state"
    >
      <div class="flex flex-col gap-2 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">Proof rail</p>
          <h2 class="mt-2 text-2xl font-semibold text-slate-900">Workflow operateur</h2>
        </div>
        <p class="max-w-2xl text-sm leading-relaxed text-slate-600">
          Le rail montre l etat instantane du cockpit: source chargee, surface choisie, mission active et preuve
          attendue.
        </p>
      </div>

      <div class="mt-6 grid gap-4 xl:grid-cols-[repeat(5,minmax(0,1fr))]">
        @for (step of steps(); track step.id) {
          <article
            class="rounded-[24px] border p-4 shadow-sm transition"
            [class.border-slate-900]="step.active"
            [class.bg-white]="step.active"
            [class.shadow-md]="step.active"
            [class.border-slate-200]="!step.active"
            [class.bg-slate-50]="!step.active"
          >
            <div
              class="mx-auto flex h-12 w-12 items-center justify-center rounded-full border bg-white text-lg font-semibold"
              [class]="badgeClasses(step.accent, step.active)"
            >
              {{ step.index }}
            </div>
            <p class="mt-4 text-center text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{{ step.label }}</p>
            <p class="mt-2 text-center text-sm font-semibold text-slate-900">{{ step.headline }}</p>
            <p class="mt-1 text-center text-xs leading-relaxed text-slate-500">{{ step.detail }}</p>
          </article>
        }
      </div>

      <div class="mt-6 flex items-center gap-4">
        <div class="h-1 flex-1 rounded-full bg-gradient-to-r from-sky-300 via-indigo-400 to-sky-600"></div>
        <p class="text-sm font-semibold tracking-[0.24em] text-sky-800">Measure -> Decide -> Prove</p>
        <div class="h-1 flex-1 rounded-full bg-gradient-to-r from-sky-600 via-indigo-400 to-sky-300"></div>
      </div>
    </section>
  `,
})
export class AdminQualityWorkflowRailComponent {
  readonly snapshotLoaded = input(false);
  readonly totalDomains = input(0);
  readonly selectedEntry = input<AdminQualityMatrixEntry | null>(null);
  readonly selectedDelegation = input<AdminQualityDelegationPlan | null>(null);
  readonly missionControl = input<AdminQualityMissionControlState | null>(null);
  readonly selectedMission = input<AdminQualityMissionRecommendation | null>(null);

  readonly steps = computed<readonly AdminQualityWorkflowStep[]>(() => [
    {
      id: 'snapshot',
      index: 1,
      label: 'Snapshot',
      headline: this.snapshotLoaded() ? 'Charge' : 'En attente',
      detail: `${this.totalDomains()} domaine(s)`,
      accent: 'sky',
      active: this.snapshotLoaded(),
    },
    {
      id: 'entry',
      index: 2,
      label: 'Entree',
      headline: this.selectedEntry()?.domain ?? 'Aucune',
      detail: this.selectedEntry()?.reviewedAt ?? 'Selection requise',
      accent: 'rose',
      active: Boolean(this.selectedEntry()),
    },
    {
      id: 'delegation',
      index: 3,
      label: 'Delegation',
      headline: this.selectedDelegation()?.actionLabel ?? 'Aucun plan',
      detail: this.selectedDelegation()?.track ?? 'Selection requise',
      accent: 'emerald',
      active: Boolean(this.selectedDelegation()),
    },
    {
      id: 'mission',
      index: 4,
      label: 'Mission',
      headline: this.missionControl()?.phaseLabel ?? 'Aucune',
      detail: this.missionControl()?.operatorCue ?? 'Attente',
      accent: 'amber',
      active: Boolean(this.missionControl()),
    },
    {
      id: 'proof',
      index: 5,
      label: 'Preuve',
      headline: this.selectedMission()?.title ?? 'Aucune',
      detail: this.selectedMission() ? this.missionStatusLabel(this.selectedMission()!.status) : 'Attente',
      accent: 'indigo',
      active: Boolean(this.selectedMission()),
    },
  ]);

  badgeClasses(accent: AdminQualityWorkflowStep['accent'], active: boolean): string {
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

  private missionStatusLabel(status: AdminQualityMissionStatus): string {
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
}
