import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { AdminQualityMatrixEntry } from '../data-access/admin-quality-matrix.service';

import { AdminQualityCoverageMatrixComponent } from './admin-quality-coverage-matrix.component';
import { AdminQualityDelegationPlan } from './admin-quality-delegation';
import { AdminQualityDomainIconComponent } from './admin-quality-domain-icon.component';
import {
  AdminQualityMissionControlState,
  AdminQualityMissionPhase,
  AdminQualityMissionRecommendation,
  AdminQualityMissionStatus,
} from './admin-quality-mission-control';

@Component({
  selector: 'og7-admin-quality-command-overview',
  standalone: true,
  imports: [CommonModule, AdminQualityCoverageMatrixComponent, AdminQualityDomainIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="grid gap-6 xl:grid-cols-[0.92fr_1.12fr_0.96fr]" data-og7="admin-quality-command-overview">
      <og7-admin-quality-coverage-matrix
        [entries]="entries()"
        [selectedEntryId]="selectedEntryId()"
        (entrySelected)="entrySelected.emit($event)"
      />

      <article class="relative overflow-hidden rounded-[28px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_30px_90px_-46px_rgba(15,23,42,0.92)]">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_42%),radial-gradient(circle_at_80%_16%,_rgba(129,140,248,0.18),_transparent_28%),linear-gradient(165deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))]"></div>
        <div class="absolute -left-8 top-10 h-28 w-28 rounded-full bg-sky-400/15 blur-3xl"></div>
        <div class="absolute bottom-0 right-0 h-36 w-36 rounded-full bg-indigo-400/15 blur-3xl"></div>

        <div class="relative flex h-full flex-col gap-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">AI Mission Core</p>
              <h2 class="mt-2 text-2xl font-semibold text-white">{{ missionControl()?.phaseLabel ?? 'En attente' }}</h2>
            </div>

            <div class="relative mt-1 h-16 w-16 shrink-0">
              <div class="absolute inset-0 rounded-full bg-sky-400/20 blur-xl"></div>
              <div class="absolute inset-2 rounded-full border border-sky-300/40 bg-slate-950/80"></div>
              <div class="absolute inset-[1.15rem] rounded-full bg-gradient-to-br from-sky-300 via-indigo-300 to-emerald-300 animate-pulse"></div>
            </div>
          </div>

          <p class="text-sm leading-relaxed text-slate-300">
            {{ missionControl()?.phaseDetail ?? 'Le centre de mission prendra le relais des qu une entree active est choisie.' }}
          </p>

          <div class="flex flex-wrap gap-2">
            @if (missionControl(); as mission) {
              <span class="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold" [class]="missionPhaseClasses(mission.phase)">
                {{ mission.phaseLabel }}
              </span>
              <span class="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                {{ mission.operatorCue }}
              </span>
            }
          </div>

          <div class="mt-auto rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Mission actuelle</p>
            <p class="mt-3 text-lg font-semibold text-white">{{ selectedMission()?.title ?? selectedEntry()?.domain ?? 'Aucune mission' }}</p>
            <p class="mt-2 text-sm leading-relaxed text-slate-300">
              {{ selectedMission()?.summary ?? missionControl()?.overview ?? 'La mission AI explicitera ici le prochain geste operateur.' }}
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              @if (selectedMission(); as missionItem) {
                <span class="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold" [class]="missionStatusClasses(missionItem.status)">
                  {{ missionStatusLabel(missionItem.status) }}
                </span>
                <span class="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  Impact {{ missionItem.impact }}
                </span>
              }
            </div>
          </div>
        </div>
      </article>

      <article class="rounded-[28px] border border-sky-100/90 bg-white/92 p-5 shadow-[0_28px_80px_-40px_rgba(37,99,235,0.28)] backdrop-blur">
        <p class="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">Delegation Center</p>
        <div class="mt-3 flex items-start gap-4">
          <og7-admin-quality-domain-icon [entryId]="selectedEntry()?.id ?? null" size="md" />
          <div class="min-w-0">
            <h2 class="text-xl font-semibold text-slate-900">{{ selectedDelegation()?.actionLabel ?? 'Aucun plan actif' }}</h2>
            <p class="mt-2 text-sm leading-relaxed text-slate-600">
              {{ selectedEntry()?.nextMove ?? 'Selection requise avant de preparer une delegation.' }}
            </p>
          </div>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <div class="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
            <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Mode</p>
            <p class="mt-2 text-sm font-medium text-slate-800">{{ delegationModeLabel(selectedDelegation()) }}</p>
          </div>
          <div class="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
            <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Piste</p>
            <p class="mt-2 text-sm font-medium text-slate-800">{{ selectedDelegation()?.track ?? 'A definir' }}</p>
          </div>
          <div class="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
            <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Difficulte</p>
            <p class="mt-2 text-sm font-medium text-slate-800">{{ selectedDelegation()?.difficulty ?? 'A definir' }}</p>
          </div>
        </div>

        <div class="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Repo principal</p>
          <p class="mt-2 text-sm font-medium text-slate-900">{{ selectedDelegation()?.primaryRepoFullName ?? 'Non defini' }}</p>
        </div>
      </article>
    </section>
  `,
})
export class AdminQualityCommandOverviewComponent {
  readonly entries = input<readonly AdminQualityMatrixEntry[]>([]);
  readonly selectedEntry = input<AdminQualityMatrixEntry | null>(null);
  readonly selectedEntryId = input<string | null>(null);
  readonly selectedDelegation = input<AdminQualityDelegationPlan | null>(null);
  readonly missionControl = input<AdminQualityMissionControlState | null>(null);
  readonly selectedMission = input<AdminQualityMissionRecommendation | null>(null);
  readonly entrySelected = output<AdminQualityMatrixEntry>();

  delegationModeLabel(plan: AdminQualityDelegationPlan | null): string {
    switch (plan?.mode) {
      case 'hardening':
        return 'Hardening';
      case 'product-closure':
        return 'Product closure';
      case 'scope-cadrage':
        return 'Scope cadrage';
      case 'qa-proof':
        return 'QA proof';
      default:
        return 'Selection requise';
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
        return 'border-slate-200 bg-slate-100 text-slate-700';
      case 'deferred':
        return 'border-slate-200 bg-slate-100 text-slate-700';
      case 'rejected':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      case 'blocked':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      default:
        return 'border-sky-200 bg-sky-50 text-sky-700';
    }
  }
}
