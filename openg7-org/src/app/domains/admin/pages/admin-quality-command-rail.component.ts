import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface AdminQualityCommandScopeSummary {
  readonly activeDomains: number;
  readonly totalDomains: number;
  readonly filtered: boolean;
  readonly activeFilterCount: number;
  readonly selectedDomain: string | null;
}

export interface AdminQualityCommandMetric {
  readonly id: string;
  readonly label: string;
  readonly activeValue: number;
  readonly totalValue: number;
  readonly detail: string;
  readonly accent: 'slate' | 'emerald' | 'sky' | 'indigo' | 'rose';
}

@Component({
  selector: 'og7-admin-quality-command-rail',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="relative overflow-hidden rounded-[26px] border border-violet-500/30 bg-[#071120]/94 p-3 shadow-[0_30px_84px_-48px_rgba(14,165,233,0.62)]"
      data-og7="admin-quality-command-rail"
    >
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_30%),radial-gradient(circle_at_82%_18%,_rgba(168,85,247,0.16),_transparent_22%),linear-gradient(180deg,_rgba(3,7,18,0.34),_rgba(3,7,18,0.04))]"></div>
      <div class="pointer-events-none absolute inset-x-5 top-16 h-px bg-gradient-to-r from-transparent via-sky-300/20 to-transparent"></div>

      <div class="relative grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(17rem,1.08fr)_repeat(5,minmax(0,1fr))]">
        <article
          class="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          data-og7="admin-quality-summary"
          data-og7-id="rail-heading"
        >
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300">Rail de pilotage</p>
              <span
                class="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                [class]="scopeBadgeClasses(scope().filtered)"
              >
                {{ scope().filtered ? 'Scope actif' : 'Vue globale' }}
              </span>
            </div>

            <div class="flex items-end gap-3">
              <p class="text-4xl font-semibold tracking-tight text-white">{{ scope().activeDomains }}</p>
              <p class="pb-1 text-sm text-slate-400">
                {{ scope().filtered ? 'domaines visibles sur ' + scope().totalDomains : 'domaines dans le portefeuille' }}
              </p>
            </div>

            <p class="max-w-sm text-sm leading-relaxed text-slate-300">
              Lecture globale du scope courant, de la couverture prouvee et des domaines qui demandent encore une intervention QA ou produit.
            </p>

            <div class="flex flex-wrap gap-2 text-[11px] font-medium text-slate-300">
              <span class="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                {{ scope().filtered ? scope().activeFilterCount + ' filtre(s)' : 'Aucun filtre actif' }}
              </span>
              @if (scope().selectedDomain) {
                <span class="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  Domaine actif : {{ scope().selectedDomain }}
                </span>
              }
            </div>
          </div>
        </article>

        @for (metric of metrics(); track metric.id) {
          <article
            class="relative overflow-hidden rounded-[22px] border px-4 py-4"
            [class]="cardClasses(metric.accent)"
            data-og7="admin-quality-summary"
            [attr.data-og7-id]="metric.id"
            [attr.aria-label]="metric.activeValue + ' actif pour ' + metric.label + '. Global ' + metric.totalValue + '. ' + metric.detail"
            [attr.title]="metric.detail"
          >
            <div class="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"></div>
            <div class="flex h-full flex-col gap-3">
              <div class="flex items-start justify-between gap-3">
                <span
                  class="inline-flex h-12 w-12 items-center justify-center rounded-[16px] border text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  [class]="iconShellClasses(metric.accent)"
                  aria-hidden="true"
                >
                  {{ iconLabel(metric.id) }}
                </span>
                <span class="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]" [class]="badgeClasses(metric.accent)">
                  {{ coveragePercent(metric) }}%
                </span>
              </div>

              <div class="space-y-2">
                <p class="text-[11px] font-semibold uppercase tracking-[0.22em]" [class]="eyebrowClasses(metric.accent)">
                  {{ metric.label }}
                </p>
                <p class="text-[2.35rem] font-semibold leading-none tracking-tight" [class]="valueClasses(metric.accent)">
                  {{ metric.activeValue }}
                </p>
                <p class="text-xs leading-relaxed" [class]="detailClasses(metric.accent)">{{ metric.detail }}</p>
              </div>

              <div class="mt-auto flex items-end justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.18em]" [class]="supportClasses(metric.accent)">
                    Global {{ metric.totalValue }}
                  </p>
                  <p class="mt-2 text-xs text-slate-400">
                    {{ scope().filtered ? 'Dans le scope courant' : 'Lecture globale' }}
                  </p>
                </div>
                @if (scope().filtered && metric.activeValue !== metric.totalValue) {
                  <p class="text-xs font-medium text-slate-400">
                    {{ metric.totalValue - metric.activeValue }} hors scope
                  </p>
                }
              </div>
            </div>
          </article>
        }
      </div>
    </section>
  `,
})
export class AdminQualityCommandRailComponent {
  readonly scope = input.required<AdminQualityCommandScopeSummary>();
  readonly metrics = input.required<readonly AdminQualityCommandMetric[]>();

  cardClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'border-emerald-500/20 bg-[linear-gradient(180deg,rgba(6,36,27,0.96),rgba(4,20,17,0.98))] text-white';
      case 'sky':
        return 'border-sky-500/20 bg-[linear-gradient(180deg,rgba(5,29,55,0.96),rgba(4,16,34,0.98))] text-white';
      case 'indigo':
        return 'border-violet-500/20 bg-[linear-gradient(180deg,rgba(21,18,53,0.96),rgba(10,12,31,0.98))] text-white';
      case 'rose':
        return 'border-rose-500/20 bg-[linear-gradient(180deg,rgba(55,16,25,0.96),rgba(29,10,16,0.98))] text-white';
      default:
        return 'border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] text-white';
    }
  }

  scopeBadgeClasses(filtered: boolean): string {
    return filtered
      ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
      : 'border-white/10 bg-white/[0.05] text-slate-200';
  }

  badgeClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
      case 'sky':
        return 'border-sky-400/25 bg-sky-400/10 text-sky-100';
      case 'indigo':
        return 'border-violet-400/25 bg-violet-400/10 text-violet-100';
      case 'rose':
        return 'border-rose-400/25 bg-rose-400/10 text-rose-100';
      default:
        return 'border-white/10 bg-white/[0.05] text-slate-100';
    }
  }

  eyebrowClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'text-emerald-200';
      case 'sky':
        return 'text-sky-200';
      case 'indigo':
        return 'text-violet-200';
      case 'rose':
        return 'text-rose-200';
      default:
        return 'text-slate-300';
    }
  }

  detailClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'text-emerald-100/80';
      case 'sky':
        return 'text-sky-100/80';
      case 'indigo':
        return 'text-violet-100/80';
      case 'rose':
        return 'text-rose-100/80';
      default:
        return 'text-slate-300';
    }
  }

  valueClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'text-emerald-50';
      case 'sky':
        return 'text-sky-50';
      case 'indigo':
        return 'text-violet-50';
      case 'rose':
        return 'text-rose-50';
      default:
        return 'text-white';
    }
  }

  supportClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'text-emerald-200';
      case 'sky':
        return 'text-sky-200';
      case 'indigo':
        return 'text-violet-200';
      case 'rose':
        return 'text-rose-200';
      default:
        return 'text-slate-200';
    }
  }

  iconShellClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'border-emerald-400/25 bg-emerald-400/12 text-emerald-100';
      case 'sky':
        return 'border-sky-400/25 bg-sky-400/12 text-sky-100';
      case 'indigo':
        return 'border-violet-400/25 bg-violet-400/12 text-violet-100';
      case 'rose':
        return 'border-rose-400/25 bg-rose-400/12 text-rose-100';
      default:
        return 'border-white/10 bg-white/[0.05] text-slate-100';
    }
  }

  iconLabel(id: AdminQualityCommandMetric['id']): string {
    switch (id) {
      case 'proved-domains':
        return 'OK';
      case 'proof-gap-domains':
        return 'QA';
      case 'product-work-domains':
        return 'PX';
      case 'high-priority-gaps':
        return '!!';
      default:
        return 'DM';
    }
  }

  coveragePercent(metric: AdminQualityCommandMetric): number {
    if (metric.totalValue <= 0) {
      return 0;
    }

    return Math.round((metric.activeValue / metric.totalValue) * 100);
  }
}
