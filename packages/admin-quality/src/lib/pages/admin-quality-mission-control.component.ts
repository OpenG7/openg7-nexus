import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import {
  AdminQualityMissionControlState,
  AdminQualityMissionPhase,
  AdminQualityMissionRecommendation,
} from './admin-quality-mission-control';
import {
  AdminQualityMissionQuotaSummary,
  AdminQualityMissionTask,
  AdminQualityMissionTaskKind,
} from './admin-quality-mission-task-planner';

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

interface AdminQualityMissionTaskKindSummary {
  readonly kind: AdminQualityMissionTaskKind;
  readonly count: number;
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminQualityMissionControlComponent {
  readonly missionControl = input.required<AdminQualityMissionControlState>();
  readonly selectedMission = input<AdminQualityMissionRecommendation | null>(null);
  readonly selectedMissionTasks = input<readonly AdminQualityMissionTask[]>([]);
  readonly selectedMissionQuotaSummary = input<AdminQualityMissionQuotaSummary | null>(null);
  readonly selectedAiProviderLabel = input('Codex');
  readonly aiDispatchWorkflow = input('workflow non detecte');
  readonly providerComparison = input<readonly AdminQualityMissionProviderComparisonEntry[]>([]);

  readonly activeProviderOpsSummary = computed<AdminQualityMissionProviderComparisonEntry | null>(
    () => this.providerComparison().find((entry) => entry.selected) ?? this.providerComparison()[0] ?? null,
  );
  readonly armedProviderCount = computed(
    () => this.providerComparison().filter((entry) => entry.opsState === 'armed').length,
  );
  readonly selectedMissionBlockingTaskCount = computed(
    () => this.selectedMissionTasks().filter((task) => task.blocking).length,
  );
  readonly selectedMissionTaskKindSummaries = computed<readonly AdminQualityMissionTaskKindSummary[]>(
    () =>
      (['alignment', 'implementation', 'validation', 'proof'] as const)
        .map((kind) => ({
          kind,
          count: this.selectedMissionTasks().filter((task) => task.kind === kind).length,
        }))
        .filter((summary) => summary.count > 0),
  );

  missionPhaseClasses(phase: AdminQualityMissionPhase): string {
    switch (phase) {
      case 'ready':
        return 'border-sky-400/25 bg-sky-400/10 text-sky-100';
      case 'execution':
        return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
      case 'proof-review':
        return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
      case 'completed':
        return 'border-white/12 bg-white/5 text-slate-100';
      case 'blocked':
        return 'border-rose-400/25 bg-rose-400/10 text-rose-100';
      default:
        return 'border-violet-400/25 bg-violet-400/10 text-violet-100';
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

}
