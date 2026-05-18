import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { AnalyticsService } from '@app/core/observability/analytics.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'og7-dual-qr-panel',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './og7-dual-qr-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/qr » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Og7 Dual Qr Panel ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns Og7DualQrPanelComponent gérée par le framework.
 */
export class Og7DualQrPanelComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly analytics = inject(AnalyticsService);

  private buyerGeneration = 0;
  private supplierGeneration = 0;

  readonly buyerLink = input<string | null>(null);
  readonly supplierLink = input<string | null>(null);
  readonly buyerLabel = input('introBillboard.scanBuyer');
  readonly supplierLabel = input('introBillboard.scanSupplier');
  readonly microCopy = input('introBillboard.scanMicroCopy');
  readonly showBuyerPanel = input(true);
  readonly showSupplierPanel = input(true);

  protected readonly buyerQr = signal<string | null>(null);
  protected readonly supplierQr = signal<string | null>(null);

  protected readonly hasBuyerLink = computed(
    () => this.showBuyerPanel() && Boolean(this.buyerLink()),
  );
  protected readonly hasSupplierLink = computed(
    () => this.showSupplierPanel() && Boolean(this.supplierLink()),
  );
  protected readonly showBothPanels = computed(
    () => this.showBuyerPanel() && this.showSupplierPanel(),
  );

  constructor() {
    effect(() => {
      const link = this.buyerLink();
      const show = this.showBuyerPanel();
      this.updateQr(show ? link : null, 'buyer');
    });

    effect(() => {
      const link = this.supplierLink();
      const show = this.showSupplierPanel();
      this.updateQr(show ? link : null, 'supplier');
    });
  }

  onBuyerOpen(): void {
    if (!this.hasBuyerLink()) {
      return;
    }
    this.analytics.emit('qr_scanned_buyer', { url: this.buyerLink() ?? '' });
  }

  onSupplierOpen(): void {
    if (!this.hasSupplierLink()) {
      return;
    }
    this.analytics.emit('qr_scanned_supplier', { url: this.supplierLink() ?? '' });
  }

  private updateQr(link: string | null, kind: 'buyer' | 'supplier'): void {
    if (!this.browser || !link) {
      this.assignQr(kind, null);
      return;
    }
    const generation = this.bumpGeneration(kind);
    this.generateQr(link)
      .then((dataUrl) => {
        if (generation === this.readGeneration(kind)) {
          this.assignQr(kind, dataUrl);
        }
      })
      .catch(() => this.assignQr(kind, null));
  }

  private assignQr(kind: 'buyer' | 'supplier', value: string | null): void {
    if (kind === 'buyer') {
      this.buyerQr.set(value);
    } else {
      this.supplierQr.set(value);
    }
  }

  private readGeneration(kind: 'buyer' | 'supplier'): number {
    return kind === 'buyer' ? this.buyerGeneration : this.supplierGeneration;
  }

  private bumpGeneration(kind: 'buyer' | 'supplier'): number {
    if (kind === 'buyer') {
      this.buyerGeneration += 1;
      return this.buyerGeneration;
    }
    this.supplierGeneration += 1;
    return this.supplierGeneration;
  }

  private async generateQr(link: string): Promise<string | null> {
    try {
      const mod = await import('qrcode');
      const dataUrl = await mod.toDataURL(link, {
        errorCorrectionLevel: 'M',
        margin: 1,
        scale: 6,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      return dataUrl;
    } catch (error) {
      console.error('[og7-dual-qr-panel] QR generation failed', error);
      return null;
    }
  }
}
