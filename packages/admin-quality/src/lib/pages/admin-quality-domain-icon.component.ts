import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface AdminQualityDomainVisual {
  readonly label: string;
  readonly accent: 'sky' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate';
  readonly paths: readonly string[];
}

const DEFAULT_DOMAIN_VISUAL: AdminQualityDomainVisual = {
  label: 'Domaine QA',
  accent: 'slate',
  paths: ['M12 4 19 8v8l-7 4-7-4V8l7-4z', 'M9 12h6', 'M12 9v6'],
};

const DOMAIN_VISUALS: Record<string, AdminQualityDomainVisual> = {
  'public-discovery': {
    label: 'Decouverte publique',
    accent: 'sky',
    paths: ['M12 3 6 9l6 12 6-12-6-6z', 'M12 3v18'],
  },
  'advanced-discovery': {
    label: 'Recherche avancee',
    accent: 'sky',
    paths: ['M11 6a5 5 0 1 0 0 10a5 5 0 0 0 0-10z', 'M15 15l4 4'],
  },
  geospatial: {
    label: 'Geospatial',
    accent: 'indigo',
    paths: [
      'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z',
      'M3 12h18',
      'M12 3a14 14 0 0 1 0 18',
      'M12 3a14 14 0 0 0 0 18',
    ],
  },
  'onboarding-imports': {
    label: 'Onboarding et imports',
    accent: 'emerald',
    paths: ['M12 4v11', 'M8 11l4 4 4-4', 'M5 18h14'],
  },
  'importation-analytics': {
    label: 'Importation analytique',
    accent: 'amber',
    paths: ['M5 19V9', 'M10 19V5', 'M15 19v-7', 'M20 19v-11', 'M3 19h18'],
  },
  'feed-signals': {
    label: 'Feed et signaux',
    accent: 'sky',
    paths: ['M5 17a7 7 0 0 1 14 0', 'M8 14a4 4 0 0 1 8 0', 'M12 10h.01', 'M12 18h.01'],
  },
  'business-lifecycle': {
    label: 'Cycle de vie metier',
    accent: 'amber',
    paths: ['M7 7h7l-2.5-2.5', 'M17 17H10l2.5 2.5', 'M17 7a5 5 0 0 1 0 10', 'M7 17a5 5 0 0 1 0-10'],
  },
  'linkup-workflow': {
    label: 'Mise en relation',
    accent: 'indigo',
    paths: ['M10 8H8a3 3 0 0 0 0 6h2', 'M14 16h2a3 3 0 0 0 0-6h-2', 'M9 12h6'],
  },
  'alerts-notifications': {
    label: 'Alertes et notifications',
    accent: 'rose',
    paths: ['M12 4a4 4 0 0 0-4 4v2.5L6 14v1h12v-1l-2-3.5V8a4 4 0 0 0-4-4z', 'M10 18a2 2 0 0 0 4 0'],
  },
  'account-data': {
    label: 'Compte et donnees',
    accent: 'emerald',
    paths: ['M12 12a3 3 0 1 0 0-6a3 3 0 0 0 0 6z', 'M6 19a6 6 0 0 1 12 0', 'M4 4h16v16H4z'],
  },
  rbac: {
    label: 'Roles et permissions',
    accent: 'indigo',
    paths: ['M12 3 6 6v5c0 4.2 2.5 8 6 9 3.5-1 6-4.8 6-9V6l-6-3z', 'M10.5 11.5 12 13l3-3'],
  },
  'trust-validation': {
    label: 'Trust et validation',
    accent: 'emerald',
    paths: ['M12 3 6 6v5c0 4.2 2.5 8 6 9 3.5-1 6-4.8 6-9V6l-6-3z', 'M9 12.5 11 14.5 15 10.5'],
  },
  'quality-breadth': {
    label: 'Robustesse et qualite',
    accent: 'rose',
    paths: ['M8 7h11', 'M8 12h11', 'M8 17h11', 'M5 7h.01', 'M5 12h.01', 'M5 17h.01'],
  },
  observability: {
    label: 'Observabilite',
    accent: 'amber',
    paths: ['M4 13h3l2-4 3 8 3-6h5'],
  },
  'openg7-depth': {
    label: 'Valeur OpenG7',
    accent: 'sky',
    paths: ['M4 17 9 7l4 4 7-7', 'M4 7h5v5', 'M13 14h7v7'],
  },
};

function resolveDomainVisual(entryId: string | null): AdminQualityDomainVisual {
  if (!entryId) {
    return DEFAULT_DOMAIN_VISUAL;
  }

  return DOMAIN_VISUALS[entryId] ?? DEFAULT_DOMAIN_VISUAL;
}

@Component({
  selector: 'og7-admin-quality-domain-icon',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex shrink-0 items-center justify-center rounded-2xl border"
      data-og7="admin-quality-domain-icon"
      [attr.data-og7-id]="entryId() ?? 'unknown'"
      [class]="containerClasses()"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        [attr.stroke-width]="strokeWidth()"
        [class]="svgClasses()"
        aria-hidden="true"
      >
        @for (path of visual().paths; track path) {
          <path [attr.d]="path"></path>
        }
      </svg>
    </span>
  `,
})
export class AdminQualityDomainIconComponent {
  readonly entryId = input<string | null>(null);
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  readonly visual = computed(() => resolveDomainVisual(this.entryId()));

  containerClasses(): string {
    const size = this.size();
    const tone = this.visual().accent;
    const sizeClasses =
      size === 'sm'
        ? 'h-10 w-10 rounded-xl'
        : size === 'lg'
          ? 'h-14 w-14 rounded-[1.15rem]'
          : 'h-12 w-12 rounded-2xl';

    return `${sizeClasses} ${this.toneClasses(tone)}`;
  }

  svgClasses(): string {
    switch (this.size()) {
      case 'sm':
        return 'h-4 w-4';
      case 'lg':
        return 'h-7 w-7';
      default:
        return 'h-6 w-6';
    }
  }

  strokeWidth(): number {
    return this.size() === 'sm' ? 1.8 : 1.9;
  }

  private toneClasses(accent: AdminQualityDomainVisual['accent']): string {
    switch (accent) {
      case 'sky':
        return 'border-sky-200 bg-sky-50 text-sky-700';
      case 'emerald':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'indigo':
        return 'border-indigo-200 bg-indigo-50 text-indigo-700';
      case 'amber':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'rose':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      default:
        return 'border-slate-200 bg-slate-50 text-slate-700';
    }
  }
}
