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
      class="rounded-[24px] border border-slate-200/90 bg-white/94 p-3 shadow-[0_18px_46px_-34px_rgba(15,23,42,0.18)]"
      data-og7="admin-quality-command-rail"
    >
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1.2fr)_repeat(5,minmax(0,1fr))]">
        <article
          class="rounded-[20px] border border-slate-200 bg-slate-50/90 px-5 py-4"
          data-og7="admin-quality-summary"
          data-og7-id="rail-heading"
        >
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Rail de pilotage</p>
              <span
                class="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                [class]="scopeBadgeClasses(scope().filtered)"
              >
                {{ scope().filtered ? 'Scope actif' : 'Vue globale' }}
              </span>
            </div>

            <div class="flex items-end gap-3">
              <p class="text-3xl font-semibold tracking-tight text-slate-900">{{ scope().activeDomains }}</p>
              <p class="pb-1 text-sm text-slate-500">
                {{ scope().filtered ? 'domaines visibles sur ' + scope().totalDomains : 'domaines dans le portefeuille' }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2 text-[11px] font-medium text-slate-600">
              <span class="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1">
                {{ scope().filtered ? scope().activeFilterCount + ' filtre(s)' : 'Aucun filtre actif' }}
              </span>
              @if (scope().selectedDomain) {
                <span class="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1">
                  Domaine actif : {{ scope().selectedDomain }}
                </span>
              }
            </div>
          </div>
        </article>

        @for (metric of metrics(); track metric.id) {
          <article
            class="rounded-[20px] border px-4 py-4"
            [class]="cardClasses(metric.accent)"
            data-og7="admin-quality-summary"
            [attr.data-og7-id]="metric.id"
            [attr.aria-label]="metric.activeValue + ' actif pour ' + metric.label + '. Global ' + metric.totalValue + '. ' + metric.detail"
            [attr.title]="metric.detail"
          >
            <div class="flex h-full flex-col gap-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.22em]" [class]="eyebrowClasses(metric.accent)">
                    {{ metric.label }}
                  </p>
                  <p class="mt-2 text-sm leading-relaxed" [class]="detailClasses(metric.accent)">{{ metric.detail }}</p>
                </div>

                <span class="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold" [class]="badgeClasses(metric.accent)">
                  Global {{ metric.totalValue }}
                </span>
              </div>

              <div class="mt-auto flex items-end justify-between gap-3">
                <div>
                  <p class="text-[2rem] font-extrabold leading-none" [class]="valueClasses(metric.accent)">
                    {{ metric.activeValue }}
                  </p>
                  <p class="mt-2 text-xs font-medium" [class]="supportClasses(metric.accent)">
                    {{ scope().filtered ? 'dans le scope courant' : 'dans la vue globale' }}
                  </p>
                </div>
                @if (scope().filtered && metric.activeValue !== metric.totalValue) {
                  <p class="text-xs font-medium text-slate-500">
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
        return 'border-emerald-200 bg-emerald-50/80';
      case 'sky':
        return 'border-sky-200 bg-sky-50/80';
      case 'indigo':
        return 'border-indigo-200 bg-indigo-50/80';
      case 'rose':
        return 'border-rose-200 bg-rose-50/90';
      default:
        return 'border-slate-200 bg-slate-50/90';
    }
  }

  scopeBadgeClasses(filtered: boolean): string {
    return filtered
      ? 'border-sky-200 bg-sky-50 text-sky-700'
      : 'border-slate-200 bg-white text-slate-700';
  }

  badgeClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'border-emerald-200 bg-white text-emerald-700';
      case 'sky':
        return 'border-sky-200 bg-white text-sky-700';
      case 'indigo':
        return 'border-indigo-200 bg-white text-indigo-700';
      case 'rose':
        return 'border-rose-200 bg-white text-rose-700';
      default:
        return 'border-slate-200 bg-white text-slate-700';
    }
  }

  eyebrowClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'text-emerald-700';
      case 'sky':
        return 'text-sky-700';
      case 'indigo':
        return 'text-indigo-700';
      case 'rose':
        return 'text-rose-700';
      default:
        return 'text-slate-500';
    }
  }

  detailClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'text-emerald-900';
      case 'sky':
        return 'text-sky-900';
      case 'indigo':
        return 'text-indigo-900';
      case 'rose':
        return 'text-rose-900';
      default:
        return 'text-slate-700';
    }
  }

  valueClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'text-emerald-900';
      case 'sky':
        return 'text-sky-900';
      case 'indigo':
        return 'text-indigo-900';
      case 'rose':
        return 'text-rose-900';
      default:
        return 'text-slate-900';
    }
  }

  supportClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'text-emerald-700';
      case 'sky':
        return 'text-sky-700';
      case 'indigo':
        return 'text-indigo-700';
      case 'rose':
        return 'text-rose-700';
      default:
        return 'text-slate-600';
    }
  }
}
