import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import {
  AdminQualityMatrixEntry,
  AdminQualityMatrixPriority,
  AdminQualityMatrixStatus,
} from '../data-access/admin-quality-matrix.service';

type CoverageSignalTone = 'sky' | 'emerald' | 'lime' | 'amber' | 'orange' | 'rose' | 'violet' | 'slate';

export type AdminQualityCoverageSignalId =
  | 'summary'
  | 'business'
  | 'implementation'
  | 'e2e'
  | 'readiness'
  | 'priority';

interface CoverageSignal {
  readonly id: AdminQualityCoverageSignalId;
  readonly shortLabel: string;
  readonly label: string;
  readonly tone: CoverageSignalTone;
  readonly attention?: boolean;
}

export interface AdminQualityCoverageSignalSelection {
  readonly entry: AdminQualityMatrixEntry;
  readonly signalId: AdminQualityCoverageSignalId;
  readonly shortLabel: string;
  readonly label: string;
  readonly attention: boolean;
}

export interface AdminQualityCoverageSignalTrace {
  readonly signalId: AdminQualityCoverageSignalId;
  readonly shortLabel: string;
  readonly label: string;
  readonly provider: string;
  readonly requestedAt: string;
}

interface CoverageToneLegendItem {
  readonly tone: CoverageSignalTone;
  readonly label: string;
  readonly detail: string;
}

const COVERAGE_SIGNAL_LEGEND: readonly CoverageSignal[] = [
  { id: 'summary', shortLabel: 'S', label: 'Synthese', tone: 'sky' },
  { id: 'business', shortLabel: 'M', label: 'Metier', tone: 'emerald' },
  { id: 'implementation', shortLabel: 'I', label: 'Implementation', tone: 'violet' },
  { id: 'e2e', shortLabel: 'E', label: 'E2E', tone: 'amber' },
  { id: 'readiness', shortLabel: 'R', label: 'Revue', tone: 'rose' },
  { id: 'priority', shortLabel: 'P', label: 'Preuves', tone: 'lime' },
];

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
      class="relative overflow-hidden rounded-[28px] border border-sky-500/25 bg-[#040d1d]/96 p-3 text-white shadow-[0_36px_110px_-58px_rgba(14,165,233,0.72)] sm:p-4"
      data-og7="admin-quality-coverage-matrix"
    >
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),_transparent_34%),radial-gradient(circle_at_88%_12%,_rgba(14,165,233,0.16),_transparent_22%),linear-gradient(180deg,_rgba(2,6,23,0.28),_rgba(2,6,23,0.06))]"></div>
      <div class="pointer-events-none absolute inset-x-6 top-16 h-px bg-gradient-to-r from-transparent via-sky-300/20 to-transparent"></div>
      <div class="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-sky-400/10 blur-3xl"></div>

      <div class="relative space-y-3">
        <div class="flex flex-col gap-3 border-b border-white/10 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">Decision cockpit</p>
            <h2 class="mt-1 text-2xl font-semibold tracking-tight text-white">Coverage Matrix</h2>
          </div>

          <button
            type="button"
            class="inline-flex items-center gap-3 self-start rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/[0.08]"
            (click)="toggleLegend()"
            [attr.aria-expanded]="legendOpen()"
            aria-controls="admin-quality-coverage-matrix-legend-panel"
            data-og7-id="admin-quality-coverage-matrix-legend-toggle"
          >
            <span>Legende</span>
            <span class="text-xs text-slate-400 transition" [class.rotate-180]="legendOpen()" aria-hidden="true">v</span>
          </button>
        </div>

        <div class="flex flex-wrap gap-2" data-og7="admin-quality-coverage-matrix-signal-legend">
          @for (item of legend; track item.id) {
            <span
              class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#091627] px-3 py-1.5 text-[11px] font-medium text-slate-200"
              [attr.data-og7-id]="item.id"
            >
              <span
                class="inline-flex h-5 w-5 items-center justify-center rounded-full border"
                [ngClass]="signalIndicatorFrameClasses(item.tone)"
              >
                <span class="h-2 w-2 rounded-full" [ngClass]="signalIndicatorDotClasses(item.tone)"></span>
              </span>
              <span>{{ item.shortLabel }}</span>
              <span class="text-slate-400">{{ item.label }}</span>
            </span>
          }
        </div>

        @if (legendOpen()) {
          <div
            class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
            id="admin-quality-coverage-matrix-legend-panel"
            data-og7="admin-quality-coverage-matrix-legend"
          >
            @for (item of toneLegend; track item.tone) {
              <div
                class="flex items-center gap-3 rounded-[16px] border border-white/10 bg-white/[0.04] px-3 py-2.5"
                data-og7="admin-quality-coverage-matrix-legend-item"
                [attr.data-og7-id]="item.tone"
              >
                <span
                  class="h-3 w-8 shrink-0 rounded-full border border-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
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

        <div
          class="rounded-[22px] border border-white/10 bg-[#061221]/92 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          data-og7="admin-quality-coverage-data"
        >
          @if (entries().length) {
            <div class="grid gap-2">
              <div
                class="hidden grid-cols-[minmax(13rem,1fr)_minmax(12rem,0.72fr)_minmax(10rem,0.84fr)] items-center gap-3 px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 lg:grid"
                aria-hidden="true"
              >
                <span>Domaine</span>
                <span class="text-center">Signaux</span>
                <span>Resume</span>
              </div>

              <div class="grid gap-2">
                  @for (entry of entries(); track entry.id) {
                    <div
                      role="button"
                      tabindex="0"
                      class="grid w-full min-w-0 gap-2 rounded-2xl border border-white/10 px-3 py-2.5 text-left transition lg:grid-cols-[minmax(13rem,1fr)_minmax(12rem,0.72fr)_minmax(10rem,0.84fr)] lg:items-center"
                      [ngClass]="rowClasses(entry)"
                      (click)="handleRowClick(entry, $event)"
                      (keydown)="handleRowKeydown(entry, $event)"
                      [attr.aria-pressed]="isSelected(entry)"
                      [attr.data-og7-id]="entry.id"
                      [attr.data-og7-state]="entry.e2eStatus"
                      [attr.data-og7-selected]="isSelected(entry) ? 'true' : 'false'"
                      data-og7="admin-quality-coverage-matrix-row"
                    >
                      <div class="min-w-0">
                        <div class="flex items-center gap-3">
                          <span
                            class="coverage-signal flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] border"
                            [ngClass]="statusBadgeClasses(entry.e2eStatus)"
                            [class.coverage-signal--attention]="statusNeedsAttention(entry.e2eStatus)"
                            [style.--coverage-glow]="statusGlowColor(entry.e2eStatus)"
                            aria-hidden="true"
                          >
                            <span class="relative z-10 h-2.5 w-2.5 rounded-full" [ngClass]="statusDotClasses(entry.e2eStatus)"></span>
                          </span>

                          <div class="min-w-0">
                            <p class="truncate text-sm font-semibold" [ngClass]="isSelected(entry) ? 'text-white' : 'text-slate-100'">
                              {{ entry.domain }}
                            </p>
                            <p class="mt-1 truncate text-xs text-slate-400">{{ entry.need }}</p>
                          </div>
                        </div>
                      </div>

                      <div class="grid grid-cols-[repeat(6,minmax(1.75rem,1fr))] gap-1.5 lg:justify-items-center">
                        @for (signal of signalsFor(entry); track signal.id) {
                          <button
                            type="button"
                            class="coverage-signal flex h-7 w-full min-w-7 items-center justify-center rounded-full border lg:w-7"
                            [attr.title]="signal.label"
                            [attr.aria-label]="signalAriaLabel(entry, signal)"
                            [attr.aria-pressed]="isSignalSelected(entry, signal.id)"
                            [attr.data-og7-attention]="signal.attention ? 'true' : 'false'"
                            data-og7="admin-quality-coverage-signal"
                            [attr.data-og7-id]="signal.id"
                            [ngClass]="signalIndicatorFrameClasses(signal.tone)"
                            [class.ring-2]="isSignalSelected(entry, signal.id)"
                            [class.ring-cyan-300/65]="isSignalSelected(entry, signal.id)"
                            [class.coverage-signal--attention]="signal.attention"
                            [style.--coverage-glow]="signalGlowColor(signal.tone)"
                            (click)="handleSignalClick(entry, signal, $event)"
                            (keydown)="handleSignalClick(entry, signal, $event)"
                          >
                            <span class="relative z-10 h-2.5 w-2.5 rounded-full" [ngClass]="signalIndicatorDotClasses(signal.tone)"></span>
                          </button>
                        }
                      </div>

                      <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                          <span
                            class="inline-flex min-w-[4.5rem] items-center justify-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                            [ngClass]="statusChipClasses(entry.e2eStatus)"
                          >
                            {{ statusChipLabel(entry.e2eStatus) }}
                          </span>
                          <p class="min-w-0 flex-1 truncate text-sm text-slate-200">{{ resumeText(entry) }}</p>
                        </div>
                        @if (delegationTrace(entry); as trace) {
                          <p
                            class="mt-1 truncate text-xs text-cyan-200/80"
                            data-og7="admin-quality-coverage-delegation-trace"
                            [attr.data-og7-id]="entry.id"
                          >
                            Derniere delegation: {{ trace.shortLabel }} via {{ trace.provider }} le {{ formatTraceTimestamp(trace.requestedAt) }}
                          </p>
                        }
                      </div>

                      <span class="sr-only">{{ ariaSummary(entry) }}</span>
                    </div>
                  }
                </div>
            </div>
          } @else {
            <div class="rounded-[18px] border border-dashed border-white/10 bg-slate-900/60 px-4 py-8 text-sm text-slate-400">
              Aucun domaine ne reste visible avec les filtres actifs.
            </div>
          }
        </div>

        @if (selectedEntry(); as entry) {
          <div class="rounded-[18px] border border-white/10 bg-[#091627] px-4 py-3">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div class="flex flex-wrap items-center gap-2 text-sm">
                <span class="text-slate-300">Focus actif</span>
                <span class="inline-flex rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 font-medium text-sky-100">
                  {{ entry.domain }}
                </span>
                <span class="inline-flex rounded-full border px-3 py-1 font-medium" [ngClass]="priorityChipClasses(entry.priority)">
                  {{ priorityChipLabel(entry.priority) }}
                </span>
                <span
                  class="inline-flex rounded-full border px-3 py-1 font-medium"
                  [ngClass]="focusBucketClasses(entry.managementBucket)"
                >
                  {{ focusBucketLabel(entry) }}
                </span>
                @if (delegationTrace(entry); as trace) {
                  <span
                    class="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 font-medium text-cyan-100"
                    data-og7="admin-quality-coverage-focus-trace"
                    [attr.data-og7-id]="trace.signalId"
                  >
                    Derniere delegation: {{ trace.shortLabel }} via {{ trace.provider }}
                  </span>
                }
              </div>

              <p class="text-sm text-slate-300">{{ entry.nextMove }}</p>
            </div>
          </div>
        }
      </div>
    </section>
  `,
  styles: [
    `
      :host .coverage-signal {
        isolation: isolate;
        overflow: visible;
        position: relative;
      }

      :host .coverage-signal::before {
        background: radial-gradient(
          circle,
          var(--coverage-glow, rgba(148, 163, 184, 0.48)) 0%,
          color-mix(in srgb, var(--coverage-glow, rgba(148, 163, 184, 0.48)) 42%, transparent) 42%,
          transparent 72%
        );
        border-radius: inherit;
        content: '';
        inset: -0.45rem;
        opacity: 0;
        pointer-events: none;
        position: absolute;
        transform: scale(0.72);
        transition:
          opacity 180ms ease,
          transform 180ms ease;
        z-index: 0;
      }

      :host .coverage-signal--attention::before {
        animation: og7CoverageHalo 2.6s ease-out infinite;
        opacity: 0.48;
      }

      :host button:hover .coverage-signal::before,
      :host button:focus-visible .coverage-signal::before {
        animation: none;
        opacity: 0.42;
        transform: scale(1);
      }

      @keyframes og7CoverageHalo {
        0% {
          opacity: 0.5;
          transform: scale(0.68);
        }

        70% {
          opacity: 0;
          transform: scale(1.45);
        }

        100% {
          opacity: 0;
          transform: scale(1.45);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        :host .coverage-signal,
        :host .coverage-signal::before {
          transition: none;
        }

        :host .coverage-signal--attention::before {
          animation: none;
          opacity: 0.34;
          transform: scale(1);
        }
      }
    `,
  ],
})
export class AdminQualityCoverageMatrixComponent {
  readonly entries = input<readonly AdminQualityMatrixEntry[]>([]);
  readonly selectedEntryId = input<string | null>(null);
  readonly selectedSignalId = input<AdminQualityCoverageSignalId | null>(null);
  readonly refreshRequiredEntryIds = input<readonly string[]>([]);
  readonly delegationTraceByEntryId = input<Record<string, AdminQualityCoverageSignalTrace>>({});

  readonly entrySelected = output<AdminQualityMatrixEntry>();
  readonly signalSelected = output<AdminQualityCoverageSignalSelection>();
  readonly legendOpen = signal(false);
  readonly legend = COVERAGE_SIGNAL_LEGEND;
  readonly toneLegend = COVERAGE_TONE_LEGEND;

  toggleLegend(): void {
    this.legendOpen.update((open) => !open);
  }

  isSelected(entry: AdminQualityMatrixEntry): boolean {
    return this.selectedEntryId() === entry.id;
  }

  isSignalSelected(entry: AdminQualityMatrixEntry, signalId: AdminQualityCoverageSignalId): boolean {
    return this.isSelected(entry) && this.selectedSignalId() === signalId;
  }

  handleRowClick(entry: AdminQualityMatrixEntry, event: Event): void {
    const target = event.target;
    if (target instanceof HTMLElement) {
      const signalElement = target.closest('[data-og7="admin-quality-coverage-signal"]');
      const signalId = signalElement?.getAttribute('data-og7-id') as AdminQualityCoverageSignalId | null;
      if (signalId) {
        const signal = this.signalsFor(entry).find((candidate) => candidate.id === signalId);
        if (signal) {
          this.signalSelected.emit({
            entry,
            signalId,
            shortLabel: signal.shortLabel,
            label: signal.label,
            attention: Boolean(signal.attention),
          });
          return;
        }
      }
    }

    this.entrySelected.emit(entry);
  }

  handleRowKeydown(entry: AdminQualityMatrixEntry, event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.entrySelected.emit(entry);
  }

  handleSignalClick(entry: AdminQualityMatrixEntry, signal: CoverageSignal, event: Event): void {
    event.stopPropagation();
    if (event instanceof KeyboardEvent) {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      event.preventDefault();
    }

    this.signalSelected.emit({
      entry,
      signalId: signal.id,
      shortLabel: signal.shortLabel,
      label: signal.label,
      attention: Boolean(signal.attention),
    });
  }

  rowClasses(entry: AdminQualityMatrixEntry): string {
    return this.isSelected(entry)
      ? 'bg-sky-400/[0.08] shadow-[inset_4px_0_0_rgba(56,189,248,0.95)]'
      : 'bg-slate-950/28 hover:bg-white/[0.04]';
  }

  selectedEntry(): AdminQualityMatrixEntry | null {
    const selectedId = this.selectedEntryId();
    return this.entries().find((entry) => entry.id === selectedId) ?? this.entries()[0] ?? null;
  }

  refreshRequired(entry: AdminQualityMatrixEntry): boolean {
    return this.refreshRequiredEntryIds().includes(entry.id);
  }

  delegationTrace(entry: AdminQualityMatrixEntry): AdminQualityCoverageSignalTrace | null {
    return this.delegationTraceByEntryId()[entry.id] ?? null;
  }

  signalAriaLabel(entry: AdminQualityMatrixEntry, signal: CoverageSignal): string {
    return `${entry.domain}. ${signal.label}. ${signal.attention ? 'Attention requise.' : 'Etat nominal.'} Ouvrir le panneau lateral pour ce voyant.`;
  }

  formatTraceTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('fr-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  signalsFor(entry: AdminQualityMatrixEntry): readonly CoverageSignal[] {
    return [
      {
        id: 'summary',
        shortLabel: 'S',
        label: 'Synthese',
        tone: this.statusTone(entry.summaryStatus),
        attention: this.statusNeedsAttention(entry.summaryStatus),
      },
      {
        id: 'business',
        shortLabel: 'M',
        label: 'Metier',
        tone: this.statusTone(entry.businessStatus),
        attention: this.statusNeedsAttention(entry.businessStatus),
      },
      {
        id: 'implementation',
        shortLabel: 'I',
        label: 'Implementation',
        tone: this.statusTone(entry.implementationStatus),
        attention: this.statusNeedsAttention(entry.implementationStatus),
      },
      {
        id: 'e2e',
        shortLabel: 'E',
        label: 'End-to-end',
        tone: this.statusTone(entry.e2eStatus),
        attention: this.statusNeedsAttention(entry.e2eStatus),
      },
      {
        id: 'readiness',
        shortLabel: 'R',
        label: 'Readiness',
        tone: this.readinessTone(entry),
        attention: this.readinessNeedsAttention(entry),
      },
      {
        id: 'priority',
        shortLabel: 'P',
        label: 'Priorite',
        tone: this.priorityTone(entry.priority),
        attention: this.priorityNeedsAttention(entry),
      },
    ];
  }

  summaryLine(entry: AdminQualityMatrixEntry): string {
    if (this.refreshRequired(entry)) {
      return `Refresh matrice | ${this.bucketLabel(entry)}`;
    }
    return `${this.statusLabel(entry.e2eStatus)} | ${this.bucketLabel(entry)}`;
  }

  ariaSummary(entry: AdminQualityMatrixEntry): string {
    if (this.refreshRequired(entry)) {
      return `${entry.domain}. Refresh matrice requis. E2E ${this.statusLabel(entry.e2eStatus)}. ${this.bucketLabel(entry)}. Priorite ${this.priorityLabel(entry.priority)}.`; 
    }
    return `${entry.domain}. E2E ${this.statusLabel(entry.e2eStatus)}. ${this.bucketLabel(entry)}. Priorite ${this.priorityLabel(entry.priority)}.`;
  }

  signalClasses(tone: CoverageSignalTone): string {
    switch (tone) {
      case 'sky':
        return 'bg-gradient-to-b from-sky-300 to-sky-500';
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
      case 'violet':
        return 'bg-gradient-to-b from-violet-300 to-violet-500';
      default:
        return 'bg-gradient-to-b from-slate-500 to-slate-700';
    }
  }

  signalIndicatorFrameClasses(tone: CoverageSignalTone): string {
    switch (tone) {
      case 'sky':
        return 'border-sky-300/35 bg-sky-400/10';
      case 'emerald':
        return 'border-emerald-300/35 bg-emerald-400/10';
      case 'lime':
        return 'border-lime-300/35 bg-lime-400/10';
      case 'amber':
        return 'border-amber-300/35 bg-amber-400/10';
      case 'orange':
        return 'border-orange-300/35 bg-orange-400/10';
      case 'rose':
        return 'border-rose-300/35 bg-rose-400/10';
      case 'violet':
        return 'border-violet-300/35 bg-violet-400/10';
      default:
        return 'border-slate-500/35 bg-slate-800/80';
    }
  }

  signalIndicatorDotClasses(tone: CoverageSignalTone): string {
    switch (tone) {
      case 'sky':
        return 'bg-sky-300';
      case 'emerald':
        return 'bg-emerald-300';
      case 'lime':
        return 'bg-lime-300';
      case 'amber':
        return 'bg-amber-300';
      case 'orange':
        return 'bg-orange-300';
      case 'rose':
        return 'bg-rose-300';
      case 'violet':
        return 'bg-violet-300';
      default:
        return 'bg-slate-400';
    }
  }

  signalGlowColor(tone: CoverageSignalTone): string {
    switch (tone) {
      case 'sky':
        return 'rgba(125, 211, 252, 0.62)';
      case 'emerald':
        return 'rgba(110, 231, 183, 0.58)';
      case 'lime':
        return 'rgba(190, 242, 100, 0.58)';
      case 'amber':
        return 'rgba(252, 211, 77, 0.64)';
      case 'orange':
        return 'rgba(251, 146, 60, 0.66)';
      case 'rose':
        return 'rgba(251, 113, 133, 0.68)';
      case 'violet':
        return 'rgba(196, 181, 253, 0.58)';
      default:
        return 'rgba(148, 163, 184, 0.46)';
    }
  }

  statusGlowColor(status: AdminQualityMatrixStatus): string {
    return this.signalGlowColor(this.statusTone(status));
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

  statusChipClasses(status: AdminQualityMatrixStatus): string {
    switch (status) {
      case 'oui':
        return 'border-emerald-400/25 bg-emerald-400/12 text-emerald-100';
      case 'partiel':
        return 'border-amber-400/25 bg-amber-400/12 text-amber-100';
      case 'hors MVP':
        return 'border-white/12 bg-white/[0.05] text-slate-100';
      default:
        return 'border-rose-400/25 bg-rose-400/12 text-rose-100';
    }
  }

  statusChipLabel(status: AdminQualityMatrixStatus): string {
    switch (status) {
      case 'oui':
        return 'OK';
      case 'partiel':
        return 'WARN';
      case 'hors MVP':
        return 'MVP';
      default:
        return 'KO';
    }
  }

  statusNeedsAttention(status: AdminQualityMatrixStatus): boolean {
    return status === 'non' || status === 'partiel';
  }

  priorityChipClasses(priority: AdminQualityMatrixPriority): string {
    switch (priority) {
      case 'haute':
        return 'border-rose-400/25 bg-rose-400/10 text-rose-100';
      case 'basse':
        return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
      default:
        return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
    }
  }

  priorityChipLabel(priority: AdminQualityMatrixPriority): string {
    switch (priority) {
      case 'haute':
        return 'Priorite haute';
      case 'basse':
        return 'Priorite basse';
      default:
        return 'Priorite moyenne';
    }
  }

  focusBucketClasses(bucket: AdminQualityMatrixEntry['managementBucket']): string {
    switch (bucket) {
      case 'covered':
        return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
      case 'product-gap':
        return 'border-violet-400/25 bg-violet-400/10 text-violet-100';
      case 'scope-limit':
        return 'border-white/12 bg-white/[0.05] text-slate-100';
      default:
        return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
    }
  }

  focusBucketLabel(entry: AdminQualityMatrixEntry): string {
    if (entry.managementBucket === 'covered') {
      return 'Prouve';
    }
    if (entry.managementBucket === 'product-gap') {
      return 'Produit d abord';
    }
    if (entry.managementBucket === 'scope-limit') {
      return 'Hors scope courant';
    }
    return 'Preuve QA suivante';
  }

  resumeText(entry: AdminQualityMatrixEntry): string {
    if (entry.e2eStatus === 'oui') {
      return entry.need;
    }
    return entry.nextMove || entry.observedGap;
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
    if (this.refreshRequired(entry)) {
      return 'rose';
    }
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

  private readinessNeedsAttention(entry: AdminQualityMatrixEntry): boolean {
    if (this.refreshRequired(entry)) {
      return true;
    }
    return entry.e2eStatus !== 'oui' && entry.managementBucket !== 'scope-limit';
  }

  private priorityNeedsAttention(entry: AdminQualityMatrixEntry): boolean {
    return entry.priority === 'haute' && entry.e2eStatus !== 'oui';
  }

  private bucketLabel(entry: AdminQualityMatrixEntry): string {
    if (this.refreshRequired(entry)) {
      return 'Refresh matrice';
    }
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
