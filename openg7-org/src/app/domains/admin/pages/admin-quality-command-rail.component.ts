import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface AdminQualityCommandMetric {
  readonly id: string;
  readonly label: string;
  readonly value: string | number;
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
      class="rounded-lg border border-slate-300 bg-slate-100/80 p-2 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.22)]"
      data-og7="admin-quality-command-rail"
    >
      <div class="grid gap-2 md:grid-cols-3 xl:grid-cols-[minmax(15rem,1.35fr)_repeat(5,minmax(0,1fr))]">
        <article
          class="flex min-h-17 items-center rounded-sm border border-slate-400 bg-white px-5 py-3"
          data-og7="admin-quality-summary"
          data-og7-id="rail-heading"
        >
          <p class="text-xl font-semibold tracking-tight text-slate-700">Rail de statistiques</p>
        </article>

        @for (metric of metrics(); track metric.id) {
          <article
            class="flex min-h-17 items-center rounded-sm border px-4 py-3"
            [class]="cardClasses(metric.accent)"
            data-og7="admin-quality-summary"
            [attr.data-og7-id]="metric.id"
            [attr.aria-label]="metric.value + ' ' + metric.label + '. ' + metric.detail"
            [attr.title]="metric.detail"
          >
            <div class="flex items-center gap-3">
              <p class="text-[2rem] font-extrabold leading-none" [class]="valueClasses(metric.accent)">{{ metric.value }}</p>
              <div class="min-w-0">
                <p class="text-base font-semibold leading-tight" [class]="labelClasses(metric.accent)">{{ metric.label }}</p>
                <span class="sr-only">{{ metric.detail }}</span>
              </div>
            </div>
          </article>
        }
      </div>
    </section>
  `,
})
export class AdminQualityCommandRailComponent {
  readonly metrics = input.required<readonly AdminQualityCommandMetric[]>();

  cardClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'border-slate-300 bg-white';
      case 'sky':
        return 'border-slate-300 bg-white';
      case 'indigo':
        return 'border-slate-300 bg-white';
      case 'rose':
        return 'border-rose-400 bg-rose-500';
      default:
        return 'border-slate-300 bg-white';
    }
  }

  valueClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'text-slate-800';
      case 'sky':
        return 'text-slate-800';
      case 'indigo':
        return 'text-slate-800';
      case 'rose':
        return 'text-white';
      default:
        return 'text-slate-800';
    }
  }

  labelClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'text-slate-700';
      case 'sky':
        return 'text-slate-700';
      case 'indigo':
        return 'text-slate-700';
      case 'rose':
        return 'text-white';
      default:
        return 'text-slate-700';
    }
  }
}
