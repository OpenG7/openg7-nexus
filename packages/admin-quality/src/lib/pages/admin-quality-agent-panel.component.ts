import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { AdminQualityMatrixEntry } from '../data-access/admin-quality-matrix.service';

type AdminQualityAgentState = 'ready' | 'blocked' | 'green';
type AdminQualityAgentStageState = 'success' | 'running' | 'queued' | 'blocked';

interface AdminQualityAgentStage {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly state: AdminQualityAgentStageState;
  readonly metric: string;
}

@Component({
  selector: 'og7-admin-quality-agent-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-quality-agent-panel.component.html',
  styles: [
    `
      :host {
        display: block;
      }

      .og7-agent-orbit {
        animation: og7-agent-orbit 8s linear infinite;
      }

      .og7-agent-pulse {
        animation: og7-agent-pulse 1.8s ease-in-out infinite;
      }

      .og7-agent-flow {
        animation: og7-agent-flow 2.4s ease-in-out infinite;
      }

      @keyframes og7-agent-orbit {
        from {
          transform: rotate(0deg);
        }

        to {
          transform: rotate(360deg);
        }
      }

      @keyframes og7-agent-pulse {
        0%,
        100% {
          opacity: 0.58;
          transform: scale(0.94);
        }

        50% {
          opacity: 1;
          transform: scale(1.04);
        }
      }

      @keyframes og7-agent-flow {
        0%,
        100% {
          transform: translateX(-12%);
          opacity: 0.45;
        }

        50% {
          transform: translateX(12%);
          opacity: 0.9;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .og7-agent-orbit,
        .og7-agent-pulse,
        .og7-agent-flow {
          animation: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminQualityAgentPanelComponent {
  readonly entries = input.required<readonly AdminQualityMatrixEntry[]>();
  readonly selectedEntry = input<AdminQualityMatrixEntry | null>(null);
  readonly proofGapCount = input(0);
  readonly productWorkCount = input(0);
  readonly refreshRequiredCount = input(0);
  readonly actionCount = input(0);

  readonly copiedCommand = signal<string | null>(null);

  readonly openEntries = computed(() =>
    this.entries().filter((entry) => !this.isGreenEntry(entry)),
  );
  readonly blockedEntries = computed(() =>
    this.openEntries().filter((entry) => this.isBlockedForAutomation(entry)),
  );
  readonly autoActionableEntries = computed(() =>
    this.openEntries().filter((entry) => !this.isBlockedForAutomation(entry)),
  );
  readonly agentState = computed<AdminQualityAgentState>(() => {
    if (!this.openEntries().length) {
      return 'green';
    }
    return this.blockedEntries().length ? 'blocked' : 'ready';
  });
  readonly agentStateLabel = computed(() => {
    switch (this.agentState()) {
      case 'green':
        return 'Tous les voyants sont verts';
      case 'blocked':
        return 'Arbitrage humain requis';
      default:
        return 'Boucle prete a lancer';
    }
  });
  readonly previewCommand = computed(() => 'yarn admin:quality:agent');
  readonly applyCommand = computed(() => 'yarn admin:quality:agent:apply');
  readonly selectedEntryCommand = computed(() => {
    const entry = this.selectedEntry();
    return entry ? `yarn admin:quality:agent -- --entry-id ${entry.id}` : null;
  });
  readonly agentProgressPercent = computed(() => {
    const total = this.entries().length;
    if (!total) {
      return 0;
    }
    const green = this.entries().filter((entry) => this.isGreenEntry(entry)).length;
    return Math.round((green / total) * 100);
  });
  readonly stages = computed<readonly AdminQualityAgentStage[]>(() => [
    {
      id: 'impact',
      label: 'Impact',
      detail: 'Lecture des fichiers modifies et des entrees matrice.',
      state: 'success',
      metric: `${this.entries().length} domaines`,
    },
    {
      id: 'plan',
      label: 'Plan',
      detail: 'Selection des actions allowlistees et des preuves attendues.',
      state: this.autoActionableEntries().length ? 'running' : 'success',
      metric: `${this.autoActionableEntries().length} actionnable(s)`,
    },
    {
      id: 'execute',
      label: 'Execution',
      detail: 'Commandes deterministes executees uniquement en mode apply.',
      state: this.autoActionableEntries().length ? 'queued' : 'success',
      metric: `${this.actionCount()} hooks`,
    },
    {
      id: 'proof',
      label: 'Preuve',
      detail: 'Rapport agent et matrix-proof-manifest prets a publier.',
      state: this.refreshRequiredCount() ? 'queued' : 'success',
      metric: `${this.refreshRequiredCount()} signal(aux)`,
    },
    {
      id: 'human',
      label: 'Decision',
      detail: 'Les gaps produit restent visibles au lieu de forcer un faux vert.',
      state: this.blockedEntries().length ? 'blocked' : 'success',
      metric: `${this.blockedEntries().length} blocage(s)`,
    },
  ]);

  copyCommand(command: string): void {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      this.copiedCommand.set('unavailable');
      return;
    }

    navigator.clipboard
      .writeText(command)
      .then(() => {
        this.copiedCommand.set(command);
        setTimeout(() => this.copiedCommand.set(null), 2400);
      })
      .catch(() => this.copiedCommand.set('unavailable'));
  }

  stageClasses(state: AdminQualityAgentStageState): string {
    switch (state) {
      case 'success':
        return 'border-emerald-300/28 bg-emerald-400/10 text-emerald-50';
      case 'running':
        return 'border-cyan-300/30 bg-cyan-400/12 text-cyan-50';
      case 'blocked':
        return 'border-amber-300/34 bg-amber-400/12 text-amber-50';
      default:
        return 'border-white/12 bg-white/5 text-slate-200';
    }
  }

  agentStateClasses(state: AdminQualityAgentState): string {
    switch (state) {
      case 'green':
        return 'border-emerald-300/30 bg-emerald-400/12 text-emerald-50';
      case 'blocked':
        return 'border-amber-300/34 bg-amber-400/12 text-amber-50';
      default:
        return 'border-cyan-300/30 bg-cyan-400/12 text-cyan-50';
    }
  }

  private isGreenEntry(entry: AdminQualityMatrixEntry): boolean {
    return (
      entry.managementBucket === 'covered' &&
      entry.summaryStatus === 'oui' &&
      entry.businessStatus === 'oui' &&
      entry.implementationStatus === 'oui' &&
      entry.e2eStatus === 'oui'
    );
  }

  private isBlockedForAutomation(entry: AdminQualityMatrixEntry): boolean {
    return entry.needsProductWorkFirst || entry.managementBucket === 'scope-limit';
  }
}
