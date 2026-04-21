import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import {
  AdminQualityMatrixEntry,
  AdminQualityMatrixPriority,
  AdminQualityMatrixStatus,
} from '../data-access/admin-quality-matrix.service';

type CoverageSignalTone = 'emerald' | 'lime' | 'amber' | 'orange' | 'rose' | 'slate';

interface CoverageSignal {
  readonly id: string;
  readonly label: string;
  readonly tone: CoverageSignalTone;
}

interface CoverageToneLegendItem {
  readonly tone: CoverageSignalTone;
  readonly label: string;
  readonly detail: string;
}

const COVERAGE_SIGNAL_LEGEND: readonly string[] = ['S', 'M', 'I', 'E', 'R', 'P'];
const COVERAGE_TONE_LEGEND: readonly CoverageToneLegendItem[] = [
  { tone: 'emerald', label: 'Vert', detail: 'preuve forte ou surface couverte' },
  { tone: 'lime', label: 'Lime', detail: 'priorite basse' },
  { tone: 'amber', label: 'Jaune', detail: 'couverture partielle ou preuve QA a pousser' },
  { tone: 'orange', label: 'Orange', detail: 'travail produit requis avant preuve' },
  { tone: 'rose', label: 'Rouge', detail: 'gap critique ou non prouve' },
  { tone: 'slate', label: 'Gris', detail: 'hors MVP ou hors scope courant' },
];

@Component({
  selector: 'og7-admin-quality-coverage-matrix',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="relative overflow-hidden rounded-[28px] border border-slate-800/90 bg-slate-950 p-5 text-white shadow-[0_30px_90px_-46px_rgba(15,23,42,0.94)]"
      data-og7="admin-quality-coverage-matrix"
    >
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.24),_transparent_38%),radial-gradient(circle_at_86%_12%,_rgba(14,165,233,0.18),_transparent_24%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))]"></div>
      <div class="pointer-events-none absolute inset-x-4 top-14 h-px bg-gradient-to-r from-transparent via-sky-300/25 to-transparent"></div>
      <div class="pointer-events-none absolute -right-12 top-10 h-32 w-32 rounded-full bg-sky-400/10 blur-3xl"></div>

      <div class="relative">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">Coverage Matrix</p>
            <p class="max-w-sm text-sm leading-relaxed text-slate-300">
              Lecture compacte des surfaces critiques. Chaque ligne pilote le focus detaille de la page.
            </p>
          </div>

          <div class="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            <span>{{ entries().length }} domaines</span>
            <div class="flex items-center gap-1.5" aria-hidden="true">
              <span class="h-2 w-2 rounded-full bg-slate-700"></span>
              <span class="h-2 w-2 rounded-full bg-slate-700"></span>
              <span class="h-2 w-2 rounded-full bg-slate-700"></span>
            </div>
          </div>
        </div>

        <div class="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            class="flex items-center justify-between gap-3 rounded-[14px] border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:bg-white/8"
            (click)="toggleLegend()"
            [attr.aria-expanded]="legendOpen()"
            aria-controls="admin-quality-coverage-matrix-legend-panel"
            data-og7-id="admin-quality-coverage-matrix-legend-toggle"
          >
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Legend</p>
              <p class="mt-1 text-xs leading-relaxed text-slate-400">
                S synthese, M metier, I implementation, E end-to-end, R readiness, P priorite.
              </p>
            </div>
            <span
              class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-slate-300 transition"
              [class.rotate-180]="legendOpen()"
              aria-hidden="true"
            >
              <span class="text-sm leading-none">⌄</span>
            </span>
          </button>

          @if (legendOpen()) {
            <div
              class="grid gap-2 sm:grid-cols-2"
              id="admin-quality-coverage-matrix-legend-panel"
              data-og7="admin-quality-coverage-matrix-legend"
            >
              @for (item of toneLegend; track item.tone) {
                <div
                  class="flex items-center gap-3 rounded-[14px] border border-white/10 bg-white/5 px-3 py-2"
                  data-og7="admin-quality-coverage-matrix-legend-item"
                  [attr.data-og7-id]="item.tone"
                >
                  <span
                    class="h-3 w-8 shrink-0 rounded-[4px] border border-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                    [ngClass]="signalClasses(item.tone)"
                    aria-hidden="true"
                  ></span>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">{{ item.label }}</p>
                    <p class="text-xs leading-relaxed text-slate-400">{{ item.detail }}</p>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <div class="mt-4 rounded-[24px] border border-white/10 bg-slate-950/70 p-3">
          <div class="mb-3 flex items-center justify-between gap-3 px-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
            <span>Surface</span>
            <div class="grid w-[9.5rem] grid-cols-6 gap-1.5 text-center">
              @for (item of legend; track item) {
                <span>{{ item }}</span>
              }
            </div>
          </div>

          @if (entries().length) {
            <div class="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
              @for (entry of entries(); track entry.id) {
                <button
                  type="button"
                  class="grid w-full grid-cols-[minmax(0,1fr)_9.5rem] items-center gap-3 rounded-[18px] border px-3 py-3 text-left transition"
                  [ngClass]="rowClasses(entry)"
                  (click)="entrySelected.emit(entry)"
                  [attr.aria-pressed]="isSelected(entry)"
                  [attr.data-og7-id]="entry.id"
                  [attr.data-og7-state]="entry.e2eStatus"
                  [attr.data-og7-selected]="isSelected(entry) ? 'true' : 'false'"
                  data-og7="admin-quality-coverage-matrix-row"
                >
                  <div class="flex min-w-0 items-center gap-3">
                    <span
                      class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                      [class]="statusBadgeClasses(entry.e2eStatus)"
                      aria-hidden="true"
                    >
                      <span class="h-2 w-2 rounded-full" [class]="statusDotClasses(entry.e2eStatus)"></span>
                    </span>

                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium" [ngClass]="isSelected(entry) ? 'text-white' : 'text-slate-100'">
                        {{ entry.domain }}
                      </p>
                      <p class="mt-1 truncate text-[11px] text-slate-500">{{ summaryLine(entry) }}</p>
                    </div>
                  </div>

                  <div class="grid grid-cols-6 gap-1.5" aria-hidden="true">
                    @for (signal of signalsFor(entry); track signal.id) {
                      <span
                        class="h-3 rounded-[4px] border border-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                        [attr.title]="signal.label"
                        [ngClass]="signalClasses(signal.tone)"
                      ></span>
                    }
                  </div>

                  <span class="sr-only">{{ ariaSummary(entry) }}</span>
                </button>
              }
            </div>
          } @else {
            <div class="rounded-[18px] border border-dashed border-white/10 bg-slate-900/60 px-4 py-8 text-sm text-slate-400">
              Aucun domaine ne reste visible avec les filtres actifs.
            </div>
          }
        </div>

        <div class="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4">
          @if (selectedEntry(); as entry) {
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-white/5 px-3 py-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300">Focus actif</p>
                <p class="mt-1 text-sm font-medium text-white">{{ entry.domain }}</p>
              </div>
              <p class="max-w-xs text-right text-xs leading-relaxed text-slate-300">
                {{ entry.nextMove }}
              </p>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class AdminQualityCoverageMatrixComponent {
  readonly entries = input<readonly AdminQualityMatrixEntry[]>([]);
  readonly selectedEntryId = input<string | null>(null);

  readonly entrySelected = output<AdminQualityMatrixEntry>();
  readonly legendOpen = signal(false);
  readonly legend = COVERAGE_SIGNAL_LEGEND;
  readonly toneLegend = COVERAGE_TONE_LEGEND;

  toggleLegend(): void {
    this.legendOpen.update((open) => !open);
  }

  isSelected(entry: AdminQualityMatrixEntry): boolean {
    return this.selectedEntryId() === entry.id;
  }

  rowClasses(entry: AdminQualityMatrixEntry): string {
    return this.isSelected(entry)
      ? 'border-sky-300/70 bg-slate-900 shadow-lg shadow-sky-950/40'
      : 'border-white/10 bg-slate-950/70 hover:border-sky-400/20 hover:bg-slate-900/80';
  }

  selectedEntry(): AdminQualityMatrixEntry | null {
    const selectedId = this.selectedEntryId();
    return this.entries().find((entry) => entry.id === selectedId) ?? this.entries()[0] ?? null;
  }

  signalsFor(entry: AdminQualityMatrixEntry): readonly CoverageSignal[] {
    return [
      { id: 'summary', label: 'Synthese', tone: this.statusTone(entry.summaryStatus) },
      { id: 'business', label: 'Metier', tone: this.statusTone(entry.businessStatus) },
      { id: 'implementation', label: 'Implementation', tone: this.statusTone(entry.implementationStatus) },
      { id: 'e2e', label: 'End-to-end', tone: this.statusTone(entry.e2eStatus) },
      { id: 'readiness', label: 'Readiness', tone: this.readinessTone(entry) },
      { id: 'priority', label: 'Priorite', tone: this.priorityTone(entry.priority) },
    ];
  }

  summaryLine(entry: AdminQualityMatrixEntry): string {
    return `${this.statusLabel(entry.e2eStatus)} | ${this.bucketLabel(entry)}`;
  }

  ariaSummary(entry: AdminQualityMatrixEntry): string {
    return `${entry.domain}. E2E ${this.statusLabel(entry.e2eStatus)}. ${this.bucketLabel(entry)}. Priorite ${this.priorityLabel(entry.priority)}.`;
  }

  signalClasses(tone: CoverageSignalTone): string {
    switch (tone) {
      case 'emerald':
        return 'bg-gradient-to-b from-emerald-300 to-emerald-500';
      case 'lime':
        return 'bg-gradient-to-b from-lime-300 to-lime-500';
      case 'amber':
        return 'bg-gradient-to-b from-yellow-300 to-amber-500';
      case 'orange':
        return 'bg-gradient-to-b from-orange-300 to-orange-500';
      case 'rose':
        return 'bg-gradient-to-b from-rose-400 to-red-600';
      default:
        return 'bg-gradient-to-b from-slate-500 to-slate-700';
    }
  }

  statusBadgeClasses(status: AdminQualityMatrixStatus): string {
    switch (status) {
      case 'oui':
        return 'border-emerald-400/40 bg-emerald-400/10';
      case 'partiel':
        return 'border-amber-400/40 bg-amber-400/10';
      case 'hors MVP':
        return 'border-slate-500/40 bg-slate-500/10';
      default:
        return 'border-rose-400/40 bg-rose-400/10';
    }
  }

  statusDotClasses(status: AdminQualityMatrixStatus): string {
    switch (status) {
      case 'oui':
        return 'bg-emerald-400';
      case 'partiel':
        return 'bg-amber-400';
      case 'hors MVP':
        return 'bg-slate-400';
      default:
        return 'bg-rose-400';
    }
  }

  private statusTone(status: AdminQualityMatrixStatus): CoverageSignalTone {
    switch (status) {
      case 'oui':
        return 'emerald';
      case 'partiel':
        return 'amber';
      case 'hors MVP':
        return 'slate';
      default:
        return 'rose';
    }
  }

  private readinessTone(entry: AdminQualityMatrixEntry): CoverageSignalTone {
    if (entry.e2eStatus === 'oui') {
      return 'emerald';
    }
    if (entry.managementBucket === 'scope-limit') {
      return 'slate';
    }
    if (entry.needsProductWorkFirst) {
      return 'orange';
    }
    return 'amber';
  }

  private priorityTone(priority: AdminQualityMatrixPriority): CoverageSignalTone {
    switch (priority) {
      case 'haute':
        return 'rose';
      case 'basse':
        return 'lime';
      default:
        return 'amber';
    }
  }

  private bucketLabel(entry: AdminQualityMatrixEntry): string {
    if (entry.e2eStatus === 'oui') {
      return 'Prouve';
    }
    if (entry.managementBucket === 'scope-limit') {
      return 'Hors scope courant';
    }
    if (entry.needsProductWorkFirst) {
      return 'Produit d abord';
    }
    return 'Pret pour preuve QA';
  }

  private priorityLabel(priority: AdminQualityMatrixPriority): string {
    switch (priority) {
      case 'haute':
        return 'haute';
      case 'basse':
        return 'basse';
      default:
        return 'moyenne';
    }
  }

  private statusLabel(status: AdminQualityMatrixStatus): string {
    switch (status) {
      case 'oui':
        return 'prouve';
      case 'partiel':
        return 'partiel';
      case 'hors MVP':
        return 'hors MVP';
      default:
        return 'non prouve';
    }
  }
}
