import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface AdminNavigationPillItem {
  readonly id: string;
  readonly label: string;
  readonly href?: string;
  readonly routerLink?: string;
  readonly active?: boolean;
}

@Component({
  standalone: true,
  selector: 'og7-admin-navigation-pills',
  imports: [CommonModule, RouterLink],
  template: `
    <nav
      class="flex flex-wrap gap-2"
      [attr.data-og7]="dataOg7() || null"
      [attr.aria-label]="ariaLabel()"
    >
      @for (item of items(); track item.id) {
        @if (item.routerLink) {
          <a
            [routerLink]="item.routerLink"
            class="inline-flex items-center rounded-full border px-4 py-2 text-sm transition"
            [class.border-white/16]="variant() === 'dark' && item.active"
            [class.bg-white/10]="variant() === 'dark' && item.active"
            [class.text-white]="variant() === 'dark' && item.active"
            [class.border-white/10]="variant() === 'dark' && !item.active"
            [class.bg-slate-950/36]="variant() === 'dark' && !item.active"
            [class.text-slate-100]="variant() === 'dark' && !item.active"
            [class.hover:bg-slate-950/52]="variant() === 'dark' && !item.active"
            [class.border-slate-900]="variant() === 'light' && item.active"
            [class.bg-slate-900]="variant() === 'light' && item.active"
            [class.text-white]="variant() === 'light' && item.active"
            [class.font-semibold]="item.active"
            [class.border-slate-200]="variant() === 'light' && !item.active"
            [class.bg-white]="variant() === 'light' && !item.active"
            [class.text-slate-600]="variant() === 'light' && !item.active"
            [class.hover:bg-slate-100]="variant() === 'light' && !item.active"
            [class.hover:text-slate-900]="variant() === 'light' && !item.active"
          >
            {{ item.label }}
          </a>
        } @else if (item.href) {
          <a
            [href]="item.href"
            class="inline-flex items-center rounded-full border px-4 py-2 text-sm transition"
            [class.border-white/16]="variant() === 'dark' && item.active"
            [class.bg-white/10]="variant() === 'dark' && item.active"
            [class.text-white]="variant() === 'dark' && item.active"
            [class.border-white/10]="variant() === 'dark' && !item.active"
            [class.bg-slate-950/36]="variant() === 'dark' && !item.active"
            [class.text-slate-100]="variant() === 'dark' && !item.active"
            [class.hover:bg-slate-950/52]="variant() === 'dark' && !item.active"
            [class.border-slate-900]="variant() === 'light' && item.active"
            [class.bg-slate-900]="variant() === 'light' && item.active"
            [class.text-white]="variant() === 'light' && item.active"
            [class.font-semibold]="item.active"
            [class.border-slate-200]="variant() === 'light' && !item.active"
            [class.bg-white]="variant() === 'light' && !item.active"
            [class.text-slate-600]="variant() === 'light' && !item.active"
            [class.hover:bg-slate-100]="variant() === 'light' && !item.active"
            [class.hover:text-slate-900]="variant() === 'light' && !item.active"
          >
            {{ item.label }}
          </a>
        }
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminNavigationPillsComponent {
  readonly items = input.required<readonly AdminNavigationPillItem[]>();
  readonly variant = input<'dark' | 'light'>('light');
  readonly ariaLabel = input('Admin navigation');
  readonly dataOg7 = input<string | null>(null);
}
