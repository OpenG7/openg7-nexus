import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, Input, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'og7-chip',
  standalone: true,
  imports: [NgIf],
  template: `
    <span class="chip" [attr.aria-label]="label || null">
      <ng-content />
      <span *ngIf="label" class="chip-label">{{ label }}</span>
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }

      .chip {
        align-items: center;
        background: var(--og7-color-surface-muted);
        border: 1px solid var(--og7-color-border);
        border-radius: 9999px;
        color: var(--og7-color-body);
        display: inline-flex;
        gap: 0.5rem;
        line-height: 1.6;
        padding: 0.35rem 0.85rem;
        transition:
          background-color 150ms ease,
          border-color 150ms ease,
          transform 150ms ease;
      }

      .chip:hover,
      .chip:focus-visible {
        background: var(--og7-color-card-hover);
        border-color: var(--og7-color-border);
        transform: translateY(-1px);
      }

      .chip:focus-visible {
        outline: 2px solid var(--og7-ring-focus);
        outline-offset: 2px;
      }

      .chip-label {
        font-weight: 600;
        letter-spacing: 0.01em;
      }
    `,
  ],
})
export class ChipComponent {
  @Input() label = '';
}

@Component({
  selector: 'og7-credits-page',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, TranslateModule, ChipComponent],
  templateUrl: './credits.page.html',
  styles: [
    `
      :host {
        background: transparent;
        color: var(--og7-color-body);
        display: block;
      }

      .credits-shell {
        position: relative;
      }

      .credits-shell .og7-static-backdrop__aurora {
        background:
          radial-gradient(
            circle at 10% 4%,
            color-mix(in srgb, var(--og7-color-primary-soft) 46%, transparent) 0%,
            transparent 30%
          ),
          radial-gradient(circle at 84% 8%, rgba(148, 163, 184, 0.06) 0%, transparent 34%),
          radial-gradient(
            circle at 52% 100%,
            color-mix(in srgb, var(--og7-color-surface-muted) 26%, transparent) 0%,
            transparent 42%
          );
        opacity: 0.44;
      }

      .credits-shell .og7-static-backdrop__stars {
        mask-image: linear-gradient(180deg, #000 8%, transparent 84%);
        opacity: 0.03;
      }

      .credits-shell .og7-static-backdrop__veil {
        background: linear-gradient(
          180deg,
          rgba(5, 24, 64, 0.02) 0%,
          rgba(5, 24, 64, 0.09) 45%,
          rgba(5, 24, 64, 0.2) 100%
        );
      }

      .credits-shell .og7-static-hero {
        background:
          linear-gradient(
            145deg,
            color-mix(in srgb, var(--og7-color-surface) 78%, transparent) 0%,
            color-mix(in srgb, var(--og7-color-surface-muted) 72%, transparent) 100%
          );
        border-color: color-mix(in srgb, var(--og7-color-primary) 14%, var(--og7-color-border));
        box-shadow:
          0 30px 60px -42px rgba(15, 23, 42, 0.26),
          var(--og7-shadow-e1);
        backdrop-filter: blur(16px) saturate(118%);
      }

      .credits-hero {
        align-items: start;
        position: relative;
      }

      .credits-hero::after {
        background: linear-gradient(
          90deg,
          transparent,
          color-mix(in srgb, var(--og7-color-primary) 18%, var(--og7-color-border)),
          transparent
        );
        content: '';
        height: 1px;
        inset: auto 1.5rem 0;
        position: absolute;
      }

      .credits-shell .og7-static-kicker {
        color: color-mix(in srgb, var(--og7-color-primary) 76%, var(--og7-color-title));
      }

      .credits-shell .og7-static-intro {
        color: var(--og7-color-body);
        max-width: 60ch;
      }

      .credits-shell .og7-static-action-primary {
        background: linear-gradient(
          180deg,
          color-mix(in srgb, var(--og7-color-primary) 94%, white 6%),
          color-mix(in srgb, var(--og7-color-primary) 86%, black 14%)
        );
        border-color: color-mix(in srgb, var(--og7-color-primary) 45%, var(--og7-color-border));
        box-shadow: 0 18px 34px -26px color-mix(in srgb, var(--og7-color-primary) 52%, transparent);
      }

      .credits-shell .og7-static-action-primary:hover {
        box-shadow: 0 22px 40px -26px color-mix(in srgb, var(--og7-color-primary) 56%, transparent);
      }

      .credits-shell .og7-static-action-secondary {
        background: color-mix(in srgb, var(--og7-color-surface-muted) 76%, var(--og7-color-surface));
        border-color: color-mix(in srgb, var(--og7-color-primary) 12%, var(--og7-color-border));
        color: var(--og7-color-title);
      }

      .credits-shell .og7-static-card--muted {
        background:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--og7-color-surface-muted) 72%, transparent) 0%,
            color-mix(in srgb, var(--og7-color-surface) 76%, transparent) 100%
          );
      }

      .credits-shell .og7-static-input {
        background: color-mix(in srgb, var(--og7-color-surface) 74%, transparent);
      }

      .credits-shell .og7-static-chip {
        background: color-mix(in srgb, var(--og7-color-surface-muted) 70%, transparent);
        border-color: color-mix(in srgb, var(--og7-color-primary) 8%, var(--og7-color-border));
        color: var(--og7-color-body);
      }

      .credits-shell .og7-static-chip:hover {
        background: color-mix(in srgb, var(--og7-color-surface) 78%, transparent);
        border-color: color-mix(in srgb, var(--og7-color-primary) 22%, var(--og7-color-border));
      }

      .credits-shell .og7-static-chip.is-active {
        background: color-mix(in srgb, var(--og7-color-primary-soft) 56%, transparent);
        border-color: color-mix(in srgb, var(--og7-color-primary) 36%, var(--og7-color-border));
        color: var(--og7-color-title);
      }

      .credits-hero-summary {
        border-color: color-mix(in srgb, var(--og7-color-primary) 16%, var(--og7-color-border));
        box-shadow: none;
      }

      .credits-coverage__pill {
        align-items: center;
        background: color-mix(in srgb, var(--og7-color-surface) 72%, transparent);
        border: 1px solid color-mix(in srgb, var(--og7-color-primary) 12%, var(--og7-color-border));
        border-radius: 999px;
        color: var(--og7-color-title);
        display: inline-flex;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        padding: 0.38rem 0.72rem;
        text-transform: uppercase;
      }

      .credits-hero-rail {
        background:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--og7-color-surface) 76%, transparent) 0%,
            color-mix(in srgb, var(--og7-color-surface-muted) 68%, transparent) 100%
          );
        border-color: color-mix(in srgb, var(--og7-color-primary) 14%, var(--og7-color-border));
        box-shadow: none;
      }

      .credits-hero-rail__footer {
        background: color-mix(in srgb, var(--og7-color-primary-soft) 34%, transparent);
        border: 1px solid color-mix(in srgb, var(--og7-color-primary) 16%, var(--og7-color-border));
      }

      .credits-kpi-card {
        background: color-mix(in srgb, var(--og7-color-surface) 66%, transparent);
        border: 1px solid color-mix(in srgb, var(--og7-color-primary) 12%, var(--og7-color-border));
        border-radius: 1rem;
        display: grid;
        gap: 0.2rem;
        overflow: hidden;
        padding: 0.95rem;
        position: relative;
        text-align: left;
      }

      .credits-kpi-card::before {
        background: color-mix(in srgb, var(--og7-color-primary) 72%, white 28%);
        content: '';
        inset: 0 auto 0 0;
        position: absolute;
        width: 3px;
      }

      .credits-kpi-value {
        color: var(--og7-color-title);
        font-size: 1.6rem;
        font-weight: 700;
        line-height: 1.1;
      }

      .credits-kpi-label {
        color: var(--og7-color-subtle);
        font-size: 0.74rem;
        letter-spacing: 0.08em;
        line-height: 1.35;
        text-transform: uppercase;
      }

      .credits-directory {
        background:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--og7-color-surface) 74%, transparent) 0%,
            color-mix(in srgb, var(--og7-color-surface-muted) 62%, transparent) 100%
          );
        border-color: color-mix(in srgb, var(--og7-color-primary) 12%, var(--og7-color-border));
      }

      .credits-directory__header {
        border-bottom: 1px solid color-mix(in srgb, var(--og7-color-primary) 8%, var(--og7-color-border));
        padding-bottom: 1rem;
      }

      .credits-toolbar,
      .credits-pillar-section,
      .credits-community-panel,
      .credits-sidebar-section {
        border-color: color-mix(in srgb, var(--og7-color-primary) 12%, var(--og7-color-border));
        box-shadow: none;
      }

      .credits-toolbar {
        background:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--og7-color-surface-muted) 68%, transparent) 0%,
            color-mix(in srgb, var(--og7-color-surface) 74%, transparent) 100%
          );
      }

      .credits-filter-chips {
        scrollbar-width: thin;
      }

      .credits-filter-chips::-webkit-scrollbar {
        height: 6px;
      }

      .credits-filter-chips::-webkit-scrollbar-thumb {
        background: color-mix(in srgb, var(--og7-color-border) 76%, transparent);
        border-radius: 9999px;
      }

      .credits-contributor-card {
        background:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--og7-color-surface) 72%, transparent) 0%,
            color-mix(in srgb, var(--og7-color-surface-muted) 66%, transparent) 100%
          );
        border-color: color-mix(in srgb, var(--og7-color-primary) 12%, var(--og7-color-border));
        box-shadow: none;
        min-height: 15rem;
        transition:
          transform var(--og7-transition-base),
          box-shadow var(--og7-transition-base),
          border-color var(--og7-transition-base);
      }

      .credits-contributor-card::before {
        background: linear-gradient(
          90deg,
          color-mix(in srgb, var(--og7-color-primary) 76%, white 24%) 0%,
          transparent 72%
        );
        content: '';
        height: 4px;
        inset: 0 0 auto;
        position: absolute;
      }

      .credits-contributor-card:hover,
      .credits-contributor-card:focus-within {
        border-color: color-mix(in srgb, var(--og7-color-primary) 24%, var(--og7-color-border));
        box-shadow:
          0 20px 32px -28px color-mix(in srgb, var(--og7-color-primary) 42%, transparent),
          var(--og7-shadow-e1);
        transform: translateY(-3px);
      }

      .contributors-avatar {
        background:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--og7-color-surface-muted) 66%, transparent) 0%,
            color-mix(in srgb, var(--og7-color-surface) 72%, transparent) 100%
          );
        border: 1px solid color-mix(in srgb, var(--og7-color-primary) 10%, var(--og7-color-border));
        border-radius: 0.85rem;
        overflow: hidden;
      }

      .contributors-initials {
        color: var(--og7-color-title);
      }

      .contributors-badge {
        background: color-mix(in srgb, var(--og7-color-primary-soft) 54%, var(--og7-color-surface));
        border: 1px solid color-mix(in srgb, var(--og7-color-primary) 24%, var(--og7-color-border));
        border-radius: 9999px;
        color: var(--og7-color-title);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        padding: 0.22rem 0.58rem;
        text-transform: uppercase;
      }

      .credits-pillar-section {
        background:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--og7-color-surface) 72%, transparent) 0%,
            color-mix(in srgb, var(--og7-color-surface-muted) 62%, transparent) 100%
          );
      }

      .credits-community-panel {
        background:
          linear-gradient(
            135deg,
            color-mix(in srgb, var(--og7-color-primary-soft) 38%, transparent) 0%,
            color-mix(in srgb, var(--og7-color-surface) 72%, transparent) 72%
          );
        position: relative;
      }

      .credits-shell .og7-static-hero,
      .credits-directory,
      .credits-toolbar,
      .credits-pillar-section,
      .credits-community-panel,
      .credits-sidebar-section,
      .credits-hero-summary,
      .credits-hero-rail,
      .credits-kpi-card,
      .credits-contributor-card {
        backdrop-filter: blur(16px) saturate(118%);
      }

      .credits-community-panel::before {
        background: linear-gradient(
          90deg,
          color-mix(in srgb, var(--og7-color-primary) 72%, white 28%),
          transparent
        );
        content: '';
        height: 4px;
        inset: 0 0 auto;
        position: absolute;
      }

      .credits-sidebar {
        display: grid;
        gap: 1.5rem;
      }

      .stack-marker {
        align-items: center;
        background: color-mix(in srgb, var(--og7-color-surface-muted) 84%, var(--og7-color-surface));
        border: 1px solid color-mix(in srgb, var(--og7-color-primary) 18%, var(--og7-color-border));
        border-radius: 0.7rem;
        color: var(--og7-color-primary);
        display: inline-flex;
        font-size: 0.72rem;
        font-weight: 700;
        height: 1.6rem;
        justify-content: center;
        letter-spacing: 0.03em;
        min-width: 1.6rem;
        padding-inline: 0.45rem;
      }

      .method-step-index {
        color: color-mix(in srgb, var(--og7-color-primary) 82%, var(--og7-color-title));
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.2em;
        text-transform: uppercase;
      }

      .governance-list {
        color: var(--og7-color-body);
      }

      .governance-list li::marker {
        color: var(--og7-color-primary);
      }

      @media (max-width: 767px) {
        .credits-hero::after {
          inset-inline: 1rem;
        }

        .credits-contributor-card {
          min-height: auto;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .credits-contributor-card {
          transition: none;
        }
      }
    `,
  ],
})
export class CreditsPage {
  private readonly i18n = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly baseKey = 'pages.credits';

  readonly searchFieldId = 'credits-search';
  readonly currentYear = new Date().getFullYear();

  readonly contributors = signal<Contributor[]>([]);
  readonly pillars = signal<Pillar[]>([]);
  readonly methodologySteps = signal<MethodologyStep[]>([]);
  readonly governancePoints = signal<string[]>([]);

  readonly provinceFilter = signal<string | null>(null);
  readonly search = signal<string>('');

  readonly provincesUnique = computed(() =>
    Array.from(new Set(this.contributors().map((c) => c.province))),
  );

  readonly filteredContributors = computed(() => {
    const query = this.search().trim().toLowerCase();
    const province = this.provinceFilter();

    return this.contributors().filter((contributor) => {
      const matchesProvince = !province || contributor.province === province;
      const haystack = [contributor.name, contributor.role, contributor.impact, ...contributor.skills]
        .join(' ')
        .toLowerCase();
      const matchesText = !query || haystack.includes(query);
      return matchesProvince && matchesText;
    });
  });

  constructor() {
    combineLatest({
      contributors: this.i18n.stream(`${this.baseKey}.contributors.items`),
      pillars: this.i18n.stream(`${this.baseKey}.pillars.items`),
      governance: this.i18n.stream(`${this.baseKey}.governance.points`),
      methodology: this.i18n.stream(`${this.baseKey}.methodology.steps`),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ contributors, pillars, governance, methodology }) => {
        const contributorItems = this.coerceArray<Contributor>(contributors).map((item) => ({
          ...item,
          skills: item.skills ?? [],
        }));
        this.contributors.set(contributorItems);

        const pillarItems = this.coerceArray<Pillar>(pillars).map((item) => ({
          ...item,
          tags: item.tags ?? [],
        }));
        this.pillars.set(pillarItems);

        const governanceMap = this.coerceRecord<string>(governance);
        this.governancePoints.set(governanceMap ? Object.values(governanceMap) : []);

        this.methodologySteps.set(this.coerceArray<MethodologyStep>(methodology));
      });

    effect(() => {
      const province = this.provinceFilter();
      const query = this.search();
      if (province || query) {
        // store.dispatch(logFiltersChanged({ province, query }));
      }
    });
  }

  resetFilters(): void {
    this.provinceFilter.set(null);
    this.search.set('');
  }

  toggleProvinceFilter(province: string): void {
    this.provinceFilter.set(this.provinceFilter() === province ? null : province);
  }

  isProvinceActive(province: string): boolean {
    return this.provinceFilter() === province;
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  private coerceArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
  }

  private coerceRecord<T>(value: unknown): Record<string, T> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, T>)
      : null;
  }
}

export interface Contributor {
  id: string;
  name: string;
  role: string;
  province: string;
  impact: string;
  skills: string[];
  avatarUrl?: string;
}

export interface Pillar {
  title: string;
  summary: string;
  tags: string[];
}

export interface MethodologyStep {
  title: string;
  copy: string;
}
