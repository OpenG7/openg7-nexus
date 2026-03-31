import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { StrapiClient } from '@app/core/api/strapi-client';
import { TranslateModule } from '@ngx-translate/core';
import type { HydrocarbonSignal } from '@openg7/contracts';

@Component({
  selector: 'og7-hydrocarbon-signals-panel',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './hydrocarbon-signals-panel.component.html',
  styleUrl: './hydrocarbon-signals-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HydrocarbonSignalsPanelComponent {
  private readonly strapiClient = inject(StrapiClient);
  private requestId = 0;

  readonly limit = input(3);
  readonly originProvinceId = input<string | null>(null);
  readonly targetProvinceId = input<string | null>(null);

  readonly signals = signal<readonly HydrocarbonSignal[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      void this.loadSignals({
        limit: this.limit(),
        originProvinceId: this.originProvinceId(),
        targetProvinceId: this.targetProvinceId(),
      });
    });
  }

  private async loadSignals(params: {
    limit: number;
    originProvinceId: string | null;
    targetProvinceId: string | null;
  }): Promise<void> {
    const requestId = ++this.requestId;
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await this.strapiClient.hydrocarbonSignals({
        limit: params.limit,
        originProvinceId: params.originProvinceId,
        targetProvinceId: params.targetProvinceId,
      });

      if (requestId !== this.requestId) {
        return;
      }

      this.signals.set(response.data);
    } catch {
      if (requestId !== this.requestId) {
        return;
      }

      this.signals.set([]);
      this.error.set('feed.views.hydrocarbons.panel.error');
    } finally {
      if (requestId === this.requestId) {
        this.loading.set(false);
      }
    }
  }
}