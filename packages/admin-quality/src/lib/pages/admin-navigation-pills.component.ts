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
            class="og7-admin-nav-pill inline-flex items-center rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            [class.og7-admin-nav-pill--dark-active]="variant() === 'dark' && item.active"
            [class.og7-admin-nav-pill--dark-idle]="variant() === 'dark' && !item.active"
            [class.og7-admin-nav-pill--light-active]="variant() === 'light' && item.active"
            [class.og7-admin-nav-pill--light-idle]="variant() === 'light' && !item.active"
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
            class="og7-admin-nav-pill inline-flex items-center rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            [class.og7-admin-nav-pill--dark-active]="variant() === 'dark' && item.active"
            [class.og7-admin-nav-pill--dark-idle]="variant() === 'dark' && !item.active"
            [class.og7-admin-nav-pill--light-active]="variant() === 'light' && item.active"
            [class.og7-admin-nav-pill--light-idle]="variant() === 'light' && !item.active"
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
  styles: [
    `
      .og7-admin-nav-pill {
        font-weight: 650;
      }

      .og7-admin-nav-pill:focus-visible {
        --tw-ring-color: rgba(165, 243, 252, 0.72);
        --tw-ring-offset-color: #020617;
      }

      .og7-admin-nav-pill--dark-active {
        border-color: rgba(207, 250, 254, 0.82);
        background: linear-gradient(180deg, rgba(224, 252, 255, 0.92), rgba(125, 211, 252, 0.74));
        color: #06111f;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.62),
          0 10px 28px rgba(8, 47, 73, 0.3);
      }

      .og7-admin-nav-pill--dark-idle {
        border-color: rgba(207, 250, 254, 0.32);
        background: rgba(2, 6, 23, 0.82);
        color: #ecfeff;
      }

      .og7-admin-nav-pill--dark-idle:hover {
        border-color: rgba(207, 250, 254, 0.58);
        background: rgba(15, 23, 42, 0.94);
        color: #ffffff;
      }

      .og7-admin-nav-pill--light-active {
        border-color: #0f172a;
        background: #0f172a;
        color: #ffffff;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.12),
          0 8px 20px rgba(15, 23, 42, 0.18);
      }

      .og7-admin-nav-pill--light-idle {
        border-color: #e2e8f0;
        background: #ffffff;
        color: #334155;
      }

      .og7-admin-nav-pill--light-idle:hover {
        border-color: #cbd5e1;
        background: #f8fafc;
        color: #0f172a;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminNavigationPillsComponent {
  readonly items = input.required<readonly AdminNavigationPillItem[]>();
  readonly variant = input<'dark' | 'light'>('light');
  readonly ariaLabel = input('Admin navigation');
  readonly dataOg7 = input<string | null>(null);
}
