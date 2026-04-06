import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  PartnerProfile,
  PartnerTrustRecord,
  PartnerVerificationStatus,
  SocialLinkType,
} from '@app/core/models/partner-profile';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface IconDefinition {
  readonly viewBox: string;
  readonly path: string;
}

const SOCIAL_ICON_MAP: Record<SocialLinkType, IconDefinition> = {
  website: {
    viewBox: '0 0 24 24',
    path: 'M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm0 2a7.93 7.93 0 0 1 2.11.29A15.5 15.5 0 0 1 12 10H6.2A8 8 0 0 1 12 4Zm-7.8 8H10a13.61 13.61 0 0 0 2 6.74A8 8 0 0 1 4.2 12Zm7.8 8a7.93 7.93 0 0 1-2.11-.29A15.5 15.5 0 0 1 12 14h5.8A8 8 0 0 1 12 20Zm0-8c.52-.84 1.39-2.62 1.78-4h4a8.08 8.08 0 0 1-.9 4Z',
  },
  linkedin: {
    viewBox: '0 0 24 24',
    path: 'M4.98 3.5a2.5 2.5 0 1 1-.02 0ZM3 8.25h3.96V21H3ZM9.5 8.25H13v1.73h.05a3.83 3.83 0 0 1 3.44-1.89c3.68 0 4.36 2.42 4.36 5.57V21h-3.95v-5.54c0-1.32-.02-3.02-1.84-3.02-1.84 0-2.12 1.43-2.12 2.9V21H9.5Z',
  },
  youtube: {
    viewBox: '0 0 24 24',
    path: 'M22.55 6.28a2.78 2.78 0 0 0-1.95-2A48.24 48.24 0 0 0 12 4a48.24 48.24 0 0 0-8.6.29 2.78 2.78 0 0 0-1.95 2A29.94 29.94 0 0 0 1 12a29.94 29.94 0 0 0 .45 5.72 2.78 2.78 0 0 0 1.95 2A48.24 48.24 0 0 0 12 20a48.24 48.24 0 0 0 8.6-.29 2.78 2.78 0 0 0 1.95-2A29.94 29.94 0 0 0 23 12a29.94 29.94 0 0 0-.45-5.72ZM10 15.46V8.54L15.47 12Z',
  },
  twitter: {
    viewBox: '0 0 24 24',
    path: 'M20.46 6.03a7 7 0 0 1-2 .55 3.49 3.49 0 0 0 1.54-1.93 7.07 7.07 0 0 1-2.22.86 3.52 3.52 0 0 0-6 3.21 10 10 0 0 1-7.26-3.69 3.51 3.51 0 0 0 1.09 4.7 3.47 3.47 0 0 1-1.6-.45v.05a3.52 3.52 0 0 0 2.82 3.45 3.53 3.53 0 0 1-1.59.06 3.51 3.51 0 0 0 3.29 2.45 7.06 7.06 0 0 1-5.2 1.46A10 10 0 0 0 9 19.54 9.93 9.93 0 0 0 19 9.52c0-.15 0-.31 0-.46a7.15 7.15 0 0 0 1.78-1.83Z',
  },
  facebook: {
    viewBox: '0 0 24 24',
    path: 'M13.5 21v-7h2.4l.36-2.8h-2.76V9.35c0-.81.23-1.35 1.4-1.35h1.5V5.4a20.38 20.38 0 0 0-2.19-.11c-2.16 0-3.65 1.32-3.65 3.76v2.1H8.5V14h2.16v7Z',
  },
  instagram: {
    viewBox: '0 0 24 24',
    path: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm0 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm5 3.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5Zm0 2A1.5 1.5 0 1 0 13.5 12 1.5 1.5 0 0 0 12 10.5Zm4.75-4a1 1 0 1 1-1 1 1 1 0 0 1 1-1Z',
  },
  email: {
    viewBox: '0 0 24 24',
    path: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm8 7 8-5H4Z',
  },
  phone: {
    viewBox: '0 0 24 24',
    path: 'M9.78 3.27A2 2 0 0 1 11.4 2h1.2a2 2 0 0 1 2 2.2l-.26 2.65a2 2 0 0 1-1.33 1.69l-1.62.54a8.07 8.07 0 0 0 3.58 3.58l.54-1.62a2 2 0 0 1 1.69-1.33l2.65-.26a2 2 0 0 1 2.2 2v1.2a2 2 0 0 1-1.27 1.86 13.13 13.13 0 0 1-14.16-14.16Z',
  },
  custom: {
    viewBox: '0 0 24 24',
    path: 'M12 2 3 7v10l9 5 9-5V7ZM5 8.2l7-3.89 7 3.89V9l-7 3.89L5 9Zm0 3.46 7 3.88 7-3.88v6.08l-7 3.88-7-3.88Z',
  },
};

@Component({
  selector: 'og7-partner-details-card',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './og7-partner-details-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/partner » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Og7 Partner Details Card ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns Og7PartnerDetailsCardComponent gérée par le framework.
 */
export class Og7PartnerDetailsCardComponent {
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = input<PartnerProfile | null>(null);
  readonly confidencePercent = input(0);

  readonly download = output<PartnerProfile>();
  readonly share = output<PartnerProfile>();

  private readonly locale = signal<'fr' | 'en'>(this.resolveLocale(this.translate.currentLang));

  protected readonly mission = computed(() => {
    const entity = this.profile();
    if (!entity?.mission) {
      return '';
    }
    const lang = this.locale();
    return entity.mission[lang] ?? entity.mission.en ?? '';
  });

  protected readonly verificationStatus = computed<PartnerVerificationStatus>(() => {
    const status = this.profile()?.verificationStatus;
    return status === 'pending' ||
      status === 'verified' ||
      status === 'correctionRequested' ||
      status === 'rejected' ||
      status === 'suspended'
      ? status
      : 'unverified';
  });

  protected readonly verificationStatusKey = computed(
    () => `partner.panel.verification.status.${this.verificationStatus()}`
  );

  protected readonly trustScore = computed(() => {
    const value = this.profile()?.trustScore;
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return null;
    }
    return Math.max(0, Math.min(100, Math.round(value)));
  });

  protected readonly recentTrustHistory = computed<PartnerTrustRecord[]>(() => {
    const history = this.profile()?.trustHistory ?? [];
    return [...history]
      .sort((a, b) => Date.parse(b.occurredAt ?? '') - Date.parse(a.occurredAt ?? ''))
      .slice(0, 3);
  });
  protected readonly recentReviewEntry = computed(
    () => {
      const reviewTrail = [...(this.profile()?.trustHistory ?? [])].reverse();
      return (
        reviewTrail.find((record) => record.type === 'evaluation' && Boolean(record.notes?.trim())) ??
        reviewTrail.find((record) => record.type === 'evaluation') ??
        null
      );
    }
  );

  protected readonly socialLinks = computed(() => {
    const entity = this.profile();
    return entity?.socials?.length ? entity.socials : null;
  });

  constructor() {
    const sub = this.translate.onLangChange.subscribe((event) => {
      this.locale.set(this.resolveLocale(event.lang));
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  protected initials(name: string): string {
    if (!name) {
      return '';
    }
    const parts = name.split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  protected roleLabel(role: PartnerProfile['role']): string {
    return role === 'buyer' ? 'introBillboard.buyerLabel' : 'introBillboard.supplierLabel';
  }

  protected verificationStatusClass(status: PartnerVerificationStatus): string {
    switch (status) {
      case 'verified':
        return 'bg-emerald-500/15 text-emerald-700 border border-emerald-200';
      case 'pending':
        return 'bg-amber-500/15 text-amber-700 border border-amber-200';
      case 'correctionRequested':
        return 'bg-orange-500/15 text-orange-700 border border-orange-200';
      case 'rejected':
        return 'bg-rose-500/15 text-rose-700 border border-rose-200';
      case 'suspended':
        return 'bg-rose-500/15 text-rose-700 border border-rose-200';
      default:
        return 'bg-slate-200/60 text-slate-600 border border-slate-200';
    }
  }

  protected historyTypeKey(type: PartnerTrustRecord['type']): string {
    return `partner.panel.verification.history.types.${type}`;
  }

  protected historyDirectionKey(direction: PartnerTrustRecord['direction']): string {
    return `partner.panel.verification.history.direction.${direction ?? 'inbound'}`;
  }

  protected formatHistoryDate(value: string): string {
    const timestamp = Date.parse(value ?? '');
    if (Number.isNaN(timestamp)) {
      return value;
    }
    const formatter = new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium' });
    return formatter.format(timestamp);
  }

  protected formatHistoryScore(value: number | null | undefined): string | null {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return null;
    }
    return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
  }

  protected iconFor(type: SocialLinkType): IconDefinition {
    return SOCIAL_ICON_MAP[type] ?? SOCIAL_ICON_MAP.custom;
  }

  protected prettyType(type: SocialLinkType): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  protected countryLabel(country: string | null | undefined): string | null {
    if (!country) {
      return null;
    }
    const trimmed = country.trim();
    if (!trimmed) {
      return null;
    }
    if (/^[A-Za-z]{2}$/.test(trimmed)) {
      const code = trimmed.toUpperCase();
      const translated = this.translate.instant(`countries.${code}`);
      return translated !== `countries.${code}` ? translated : code;
    }
    return trimmed;
  }

  protected onDownload(entity: PartnerProfile): void {
    this.download.emit(entity);

    if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') {
      return;
    }

    try {
      const fileName = `${this.slugify(entity.legalName || entity.displayName || 'partner')}.json`;
      const blob = new Blob([JSON.stringify(entity, null, 2)], { type: 'application/json;charset=utf-8' });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName;
      anchor.rel = 'noopener';
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // ignore fallback download failures
    }
  }

  protected onShare(entity: PartnerProfile): void {
    this.share.emit(entity);

    if (typeof navigator === 'undefined') {
      return;
    }

    const payload = this.sharePayload(entity);
    if (typeof navigator.share === 'function') {
      void navigator.share(payload).catch(() => {
        this.copySharePayload(payload);
      });
      return;
    }

    this.copySharePayload(payload);
  }

  private resolveLocale(lang: string | null | undefined): 'fr' | 'en' {
    if (!lang) {
      return 'en';
    }
    const value = lang.toLowerCase();
    return value.startsWith('fr') ? 'fr' : 'en';
  }

  private sharePayload(entity: PartnerProfile): ShareData {
    const title = entity.displayName || entity.legalName;
    const parts = [title, entity.sector ? this.translate.instant(`sectors.${entity.sector}`) : null].filter(Boolean);
    const text = parts.join(' · ');
    return {
      title,
      text: text || title,
      url: entity.website || undefined,
    };
  }

  private copySharePayload(payload: ShareData): void {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }

    const content = [payload.title, payload.text, payload.url].filter(Boolean).join(' · ');
    if (!content) {
      return;
    }

    void navigator.clipboard.writeText(content).catch(() => {
      // ignore clipboard fallback errors
    });
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
  }
}
