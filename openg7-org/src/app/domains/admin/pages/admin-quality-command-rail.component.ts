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
      class="relative overflow-hidden rounded-[28px] border border-slate-800/80 bg-slate-950 px-4 py-4 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.9)]"
      data-og7="admin-quality-command-rail"
    >
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_44%),radial-gradient(circle_at_80%_20%,_rgba(129,140,248,0.14),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))]"></div>

      <div class="relative grid gap-px overflow-hidden rounded-[22px] bg-white/10 sm:grid-cols-2 xl:grid-cols-5">
        @for (metric of metrics(); track metric.id) {
          <article
            class="bg-slate-950/85 px-4 py-4 backdrop-blur"
            data-og7="admin-quality-summary"
            [attr.data-og7-id]="metric.id"
          >
            <p class="text-[11px] font-semibold uppercase tracking-[0.24em]" [class]="labelClasses(metric.accent)">
              {{ metric.label }}
            </p>
            <p class="mt-2 text-2xl font-semibold" [class]="valueClasses(metric.accent)">{{ metric.value }}</p>
            <p class="mt-1 text-xs leading-relaxed" [class]="detailClasses(metric.accent)">
              {{ metric.detail }}
            </p>
          </article>
        }
      </div>
    </section>
  `,
})
export class AdminQualityCommandRailComponent {
  readonly metrics = input.required<readonly AdminQualityCommandMetric[]>();

  labelClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'text-emerald-300';
      case 'sky':
        return 'text-sky-300';
      case 'indigo':
        return 'text-indigo-300';
      case 'rose':
        return 'text-rose-300';
      default:
        return 'text-slate-300';
    }
  }

  valueClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'text-emerald-100';
      case 'sky':
        return 'text-sky-100';
      case 'indigo':
        return 'text-indigo-100';
      case 'rose':
        return 'text-rose-100';
      default:
        return 'text-white';
    }
  }

  detailClasses(accent: AdminQualityCommandMetric['accent']): string {
    switch (accent) {
      case 'emerald':
        return 'text-emerald-200/80';
      case 'sky':
        return 'text-sky-200/80';
      case 'indigo':
        return 'text-indigo-200/80';
      case 'rose':
        return 'text-rose-200/80';
      default:
        return 'text-slate-300/80';
    }
  }
}
