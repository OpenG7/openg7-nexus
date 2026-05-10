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
      class="relative overflow-hidden rounded-3xl border border-violet-500/30 bg-[#071120]/94 p-2.5 shadow-[0_24px_70px_-48px_rgba(14,165,233,0.56)]"
      data-og7="admin-quality-command-rail"
      data-og7-density="compact"
    >
      <div
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.16),transparent_22%),linear-gradient(180deg,rgba(3,7,18,0.34),rgba(3,7,18,0.04))]"
      ></div>
      <div
        class="pointer-events-none absolute inset-x-5 top-10 h-px bg-linear-to-r from-transparent via-white/12 to-transparent"
      ></div>

      <div class="sr-only" data-og7-id="rail-heading">
        {{ scope().filtered ? 'Scope actif' : 'Vue globale' }}
      </div>

      <div
        class="relative grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        data-og7-layout="compact-six"
      >
        @for (metric of metrics(); track metric.id) {
          <article
            class="relative min-w-0 overflow-hidden rounded-2xl border px-3 py-2.5"
            [class]="cardClasses(metric.accent)"
            data-og7="admin-quality-summary"
            [attr.data-og7-id]="metric.id"
            data-og7-density="compact"
            [attr.aria-label]="
              metric.activeValue +
              ' actif pour ' +
              metric.label +
              '. Global ' +
              metric.totalValue +
              '. ' +
              metric.detail
            "
            [attr.title]="metric.detail"
          >
            <div
              class="pointer-events-none absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-white/18 to-transparent"
            ></div>
            <div class="flex h-full flex-col gap-2">
              <div class="flex min-w-0 items-center gap-2.5">
                <span
                  class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  [class]="iconShellClasses(metric.accent)"
                  aria-hidden="true"
                >
                  {{ iconLabel(metric.id) }}
                </span>
                <div class="min-w-0">
                  <p
                    class="truncate text-[1.85rem] font-semibold leading-none tracking-tight"
                    [class]="valueClasses(metric.accent)"
                  >
                    {{ metric.activeValue }}
                  </p>
                  <span class="sr-only">Global {{ metric.totalValue }}</span>
                </div>
              </div>

              <div class="min-w-0 space-y-0.5">
                <p class="truncate text-sm font-semibold text-white">{{ titleLabel(metric.id) }}</p>
                <p class="truncate text-xs" [class]="detailClasses(metric.accent)">
                  {{ subtitleLabel(metric.id) }}
                </p>
              </div>

              <div class="mt-auto flex items-end justify-between gap-2 pt-1">
                <div>
                  <p class="text-[11px] font-medium" [class]="supportClasses(metric.accent)">
                    {{ footerLabel(metric.id) }}
                  </p>
                  <p class="sr-only">Global {{ metric.totalValue }}</p>
                </div>
                <span
                  class="inline-flex shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                  [class]="badgeClasses(metric.accent)"
                >
                  {{ deltaLabel(metric) }}
                </span>
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
      : 'border-white/10 bg-white/5 text-slate-200';
  }

  badgeClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'border-emerald-400/20 bg-transparent text-emerald-300';
      case 'sky':
        return 'border-amber-400/20 bg-transparent text-amber-300';
      case 'indigo':
        return 'border-violet-400/20 bg-transparent text-violet-300';
      case 'rose':
        return 'border-rose-400/20 bg-transparent text-rose-300';
      default:
        return 'border-sky-400/20 bg-transparent text-sky-300';
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
        return 'text-slate-200';
      case 'sky':
        return 'text-slate-200';
      case 'indigo':
        return 'text-slate-200';
      case 'rose':
        return 'text-slate-200';
      default:
        return 'text-slate-200';
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
        return 'text-slate-300';
      case 'sky':
        return 'text-slate-300';
      case 'indigo':
        return 'text-slate-300';
      case 'rose':
        return 'text-slate-300';
      default:
        return 'text-slate-300';
    }
  }

  iconShellClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'border-emerald-400/18 bg-emerald-500/12 text-emerald-200';
      case 'sky':
        return 'border-sky-400/18 bg-sky-500/12 text-sky-200';
      case 'indigo':
        return 'border-violet-400/18 bg-violet-500/12 text-violet-200';
      case 'rose':
        return 'border-rose-400/18 bg-rose-500/12 text-rose-200';
      default:
        return 'border-sky-400/18 bg-sky-500/12 text-sky-200';
    }
  }

  iconLabel(id: AdminQualityCommandMetric['id']): string {
    switch (id) {
      case 'proved-domains':
        return 'SH';
      case 'proof-gap-domains':
        return 'HG';
      case 'product-work-domains':
        return 'RC';
      case 'high-priority-gaps':
        return 'AL';
      default:
        return 'GR';
    }
  }

  coveragePercent(metric: AdminQualityCommandMetric): number {
    if (metric.totalValue <= 0) {
      return 0;
    }

    return Math.round((metric.activeValue / metric.totalValue) * 100);
  }

  titleLabel(id: AdminQualityCommandMetric['id']): string {
    switch (id) {
      case 'total-domains':
        return 'Domaines suivis';
      case 'proved-domains':
        return 'Domaines prouves';
      case 'proof-gap-domains':
        return 'Preuve QA suivante';
      case 'product-work-domains':
        return "Produit d'abord";
      default:
        return 'Gaps critiques';
    }
  }

  subtitleLabel(id: AdminQualityCommandMetric['id']): string {
    switch (id) {
      case 'total-domains':
        return 'Lecture globale';
      case 'proved-domains':
        return 'Couverture forte';
      case 'proof-gap-domains':
        return 'Execution prioritaire';
      case 'product-work-domains':
        return 'Produit a cadrer';
      default:
        return 'A surveiller';
    }
  }

  footerLabel(id: AdminQualityCommandMetric['id']): string {
    return id === 'total-domains'
      ? 'Total'
      : `Global ${this.metrics().find((metric) => metric.id === id)?.totalValue ?? 0}`;
  }

  deltaLabel(metric: AdminQualityCommandMetric): string {
    if (metric.id === 'total-domains') {
      return `Global ${metric.totalValue}`;
    }

    return `↗ ${this.coveragePercent(metric)}%`;
  }
}
