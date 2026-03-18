import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import {
  IndicatorConnectionState,
  IndicatorGranularity,
  IndicatorTimeframe,
} from './indicator-detail.models';

@Component({
  selector: 'og7-indicator-hero',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './indicator-hero.component.html',
  styleUrl: './indicator-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndicatorHeroComponent {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly deltaPctLabel = input.required<string>();
  readonly deltaAbsLabel = input.required<string>();
  readonly windowHours = input.required<number>();
  readonly granularityLabel = input.required<string>();
  readonly timeframe = input<IndicatorTimeframe>('72h');
  readonly granularity = input<IndicatorGranularity>('hour');
  readonly compact = input(false);
  readonly subscribed = input(false);
  readonly subscribePending = input(false);
  readonly subscribeDisabled = input(false);
  readonly connectionState = input<IndicatorConnectionState>('online');
  readonly lastUpdatedLabel = input.required<string>();

  readonly subscribe = output<void>();
  readonly share = output<void>();
  readonly createAlert = output<void>();
  readonly timeframeChange = output<IndicatorTimeframe>();
  readonly granularityChange = output<IndicatorGranularity>();

  protected readonly timeframeOptions: readonly IndicatorTimeframe[] = ['24h', '72h', '7d'];
  protected readonly granularityOptions: readonly IndicatorGranularity[] = ['hour', '15m', 'day'];
}
