import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { Og7DualQrPanelComponent } from '@app/shared/components/qr/og7-dual-qr-panel.component';
import { TranslateModule, TranslateService, TranslationObject } from '@ngx-translate/core';

type TranslationSlice = TranslationObject;

interface LoadedTranslations {
  readonly en: TranslationSlice;
  readonly fr: TranslationSlice;
}

// <nav #tablist class="og7-partner-panel__tabs" role="tablist" [attr.aria-labelledby]="headingId"
//     [style.--og7-tab-count]="tabMetrics().count" [style.--og7-active-tab-index]="tabMetrics().index"
//     (keydown)="handleTabKeydown($event)">
//     <button type="button" class="og7-partner-panel__tab" role="tab" [attr.id]="detailsTabId"
//       [attr.aria-controls]="detailsPanelId" [attr.aria-selected]="tabSelected('details')" (click)="switchTab('details')"
//       [attr.tabindex]="tabSelected('details') ? 0 : -1" [class.og7-partner-panel__tab--active]="tabSelected('details')">
//       {{ 'partner.panel.tabs.details' | translate }}
//     </button>
//     @if (hasCollaborationContent()) {
//     <button type="button" class="og7-partner-panel__tab" role="tab" [attr.id]="collaborationTabId"
//       [attr.aria-controls]="collaborationPanelId" [attr.aria-selected]="tabSelected('collaboration')"
//       (click)="switchTab('collaboration')" [attr.tabindex]="tabSelected('collaboration') ? 0 : -1"
//       [class.og7-partner-panel__tab--active]="tabSelected('collaboration')">
//       {{ 'partner.panel.tabs.collaboration' | translate }}
//     </button>
//     }
//     @if (hasQrLinks()) {
//     <button type="button" class="og7-partner-panel__tab" role="tab" [attr.id]="qrTabId" [attr.aria-controls]="qrPanelId"
//       [attr.aria-selected]="tabSelected('qr')" (click)="switchTab('qr')" [attr.tabindex]="tabSelected('qr') ? 0 : -1"
//       [class.og7-partner-panel__tab--active]="tabSelected('qr')">
//       {{ 'partner.panel.tabs.qr' | translate }}
//     </button>
//     }
//     <span class="og7-partner-panel__tab-indicator"></span>
//   </nav>

@Component({
  selector: 'og7-partner-quick-actions',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, Og7DualQrPanelComponent],
  templateUrl: './partner-quick-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « domains/partners/partners/ui » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Partner Quick Actions ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns PartnerQuickActionsComponent gérée par le framework.
 */
export class PartnerQuickActionsComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly partnerId = input.required<string>();
  readonly partnerName = input<string | null | undefined>(null);
  readonly baseUrl = input<string | null | undefined>(null);
  readonly matchId = input<number | string | null | undefined>(null);

  protected readonly copied = signal(false);
  private copyResetHandle: ReturnType<typeof setTimeout> | null = null;
  private translationsLoaded = false;

  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly sharePath = computed(() => {
    const id = this.partnerId();
    return `/partners/${id}/connect/intention?utm_source=og7&utm_medium=qr&utm_campaign=partner-profile`;
  });

  protected readonly shareUrl = computed(() => this.buildShareUrl());
  protected readonly connectLink = computed(() => {
    const matchId = this.matchId();
    if (matchId != null && matchId !== '') {
      return ['/linkup', matchId];
    }
    return null;
  });

  constructor() {
    this.ensureTranslations();

    this.destroyRef.onDestroy(() => {
      if (this.copyResetHandle) {
        clearTimeout(this.copyResetHandle);
      }
    });
  }

  protected async copyLink(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    const url = this.shareUrl();
    if (!url) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        this.legacyCopy(url);
      }
      this.startCopyFeedback();
    } catch {
      this.legacyCopy(url);
      this.startCopyFeedback();
    }
  }

  protected async downloadPng(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    const url = this.shareUrl();
    if (!url) {
      return;
    }

    let dataUrl: string;
    try {
      const mod = await import('qrcode');
      dataUrl = await mod.toDataURL(url, {
        errorCorrectionLevel: 'M',
        margin: 1,
        scale: 6,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    } catch (error) {
      console.error('Failed to generate partner quick actions QR for download', error);
      return;
    }

    const anchor = document.createElement('a');
    const id = this.partnerId();
    anchor.href = dataUrl;
    anchor.download = `og7-${id}-qr.png`;
    anchor.rel = 'noopener';
    anchor.click();
    anchor.remove();
  }

  private startCopyFeedback(): void {
    this.copied.set(true);
    if (this.copyResetHandle) {
      clearTimeout(this.copyResetHandle);
    }
    this.copyResetHandle = setTimeout(() => {
      this.copied.set(false);
      this.copyResetHandle = null;
    }, 1500);
  }

  private legacyCopy(value: string): void {
    if (!this.isBrowser) {
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch {
      // Silently ignore failures.
    }
    document.body.removeChild(textarea);
  }

  private buildShareUrl(): string | null {
    const path = this.sharePath();
    if (!path) {
      return null;
    }

    const providedBase = this.baseUrl();
    if (providedBase) {
      try {
        return new URL(path, providedBase).toString();
      } catch {
        // fall back to path below
      }
    }

    if (this.isBrowser && typeof window !== 'undefined' && window.location?.origin) {
      try {
        return new URL(path, window.location.origin).toString();
      } catch {
        return `${window.location.origin}${path}`;
      }
    }

    return path;
  }

  private ensureTranslations(): void {
    if (this.translationsLoaded) {
      return;
    }
    void this.loadTranslations().then((translations) => {
      if (!translations) {
        return;
      }
      this.translate.setTranslation('fr', translations.fr, true);
      this.translate.setTranslation('en', translations.en, true);
      this.translationsLoaded = true;
    });
  }

  private async loadTranslations(): Promise<LoadedTranslations | null> {
    try {
      const [frModule, enModule] = await Promise.all([
        import('./i18n/partner.quick-actions.fr.json'),
        import('./i18n/partner.quick-actions.en.json'),
      ]);
      const fr =
        (frModule as { default?: TranslationSlice }).default ?? (frModule as TranslationSlice);
      const en =
        (enModule as { default?: TranslationSlice }).default ?? (enModule as TranslationSlice);
      return { fr, en } satisfies LoadedTranslations;
    } catch (error) {
      console.error('Failed to load partner quick actions translations', error);
      return null;
    }
  }
}
