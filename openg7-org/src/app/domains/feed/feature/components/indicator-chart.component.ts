import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { IndicatorPoint } from './indicator-detail.models';

interface IndicatorChartPointVm {
  readonly x: number;
  readonly y: number;
  readonly ts: string;
  readonly value: number;
  readonly timeLabel: string;
}

interface IndicatorChartAxisTickVm {
  readonly x: number;
  readonly y: number;
  readonly label: string;
}

@Component({
  selector: 'og7-indicator-chart',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './indicator-chart.component.html',
  styleUrl: './indicator-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndicatorChartComponent {
  readonly points = input<readonly IndicatorPoint[]>([]);
  readonly chartTitle = input.required<string>();
  readonly completedAtLabel = input.required<string>();
  readonly levelLabel = input.required<string>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly unitLabel = input.required<string>();

  readonly retry = output<void>();

  protected readonly viewAsTable = signal(false);
  protected readonly hoveredIndex = signal<number | null>(null);

  private readonly width = 760;
  private readonly height = 250;
  private readonly paddingLeft = 48;
  private readonly paddingRight = 24;
  private readonly paddingTop = 18;
  private readonly paddingBottom = 34;

  private readonly minValue = computed(() => {
    const points = this.points();
    if (!points.length) {
      return 0;
    }
    return Math.min(...points.map((point) => point.value));
  });

  private readonly maxValue = computed(() => {
    const points = this.points();
    if (!points.length) {
      return 0;
    }
    return Math.max(...points.map((point) => point.value));
  });

  protected readonly pointsVm = computed<readonly IndicatorChartPointVm[]>(() => {
    const points = this.points();
    if (!points.length) {
      return [];
    }

    const min = this.minValue();
    const max = this.maxValue();
    const range = Math.max(max - min, 0.001);
    const usableWidth = this.width - this.paddingLeft - this.paddingRight;
    const usableHeight = this.height - this.paddingTop - this.paddingBottom;
    const denominator = Math.max(points.length - 1, 1);

    return points.map((point, index) => {
      const x = this.paddingLeft + (index / denominator) * usableWidth;
      const y = this.paddingTop + ((max - point.value) / range) * usableHeight;
      return {
        x,
        y,
        ts: point.ts,
        value: point.value,
        timeLabel: this.formatTimestamp(point.ts),
      };
    });
  });

  protected readonly hasEnoughPoints = computed(() => this.pointsVm().length >= 2);

  protected readonly polyline = computed(() =>
    this.pointsVm()
      .map((point) => `${point.x},${point.y}`)
      .join(' '),
  );

  protected readonly yTicks = computed<readonly IndicatorChartAxisTickVm[]>(() => {
    if (!this.hasEnoughPoints()) {
      return [];
    }
    const min = this.minValue();
    const max = this.maxValue();
    const range = Math.max(max - min, 0.001);
    const usableHeight = this.height - this.paddingTop - this.paddingBottom;
    const values = [max, min + range / 2, min];
    return values.map((value) => {
      const y = this.paddingTop + ((max - value) / range) * usableHeight;
      return {
        x: this.paddingLeft - 8,
        y,
        label: this.formatValue(value),
      };
    });
  });

  protected readonly xTicks = computed<readonly IndicatorChartAxisTickVm[]>(() => {
    const points = this.pointsVm();
    if (!points.length) {
      return [];
    }
    const indexes = this.pickTickIndexes(points.length, 5);
    return indexes.map((index) => ({
      x: points[index]?.x ?? this.paddingLeft,
      y: this.height - 10,
      label: points[index]?.timeLabel ?? '',
    }));
  });

  protected readonly hoveredPoint = computed(() => {
    const index = this.hoveredIndex();
    if (index === null) {
      return null;
    }
    return this.pointsVm()[index] ?? null;
  });

  protected readonly chartSummary = computed<{
    min: string;
    max: string;
    last: string;
    delta: string;
  } | null>(() => {
    if (!this.hasEnoughPoints()) {
      return null;
    }
    const points = this.points();
    const first = points[0]?.value ?? 0;
    const last = points[points.length - 1]?.value ?? 0;
    const min = this.minValue();
    const max = this.maxValue();
    return {
      min: this.formatValue(min),
      max: this.formatValue(max),
      last: this.formatValue(last),
      delta: this.formatSignedValue(last - first),
    };
  });

  protected readonly lastPointLabel = computed(() => {
    const points = this.pointsVm();
    const last = points[points.length - 1];
    if (!last) {
      return null;
    }
    return `${this.formatValue(last.value)} ${this.unitLabel()}`;
  });

  protected toggleTable(): void {
    this.viewAsTable.update((value) => !value);
  }

  protected selectPoint(index: number): void {
    this.hoveredIndex.set(index);
  }

  protected clearPoint(): void {
    this.hoveredIndex.set(null);
  }

  protected trackPoint(index: number): number {
    return index;
  }

  protected chartX(): number {
    return this.width;
  }

  protected chartY(): number {
    return this.height;
  }

  private formatTimestamp(ts: string): string {
    const date = new Date(ts);
    if (!Number.isFinite(date.getTime())) {
      return '--';
    }
    return date.toLocaleString(undefined, {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatValue(value: number): string {
    return value.toFixed(1).replace(/\.0$/, '');
  }

  private formatSignedValue(value: number): string {
    const normalized = this.formatValue(Math.abs(value));
    return `${value >= 0 ? '+' : '-'}${normalized}`;
  }

  private pickTickIndexes(length: number, maxTicks: number): number[] {
    if (length <= maxTicks) {
      return Array.from({ length }, (_, index) => index);
    }
    const step = (length - 1) / (maxTicks - 1);
    return Array.from({ length: maxTicks }, (_, index) => Math.round(index * step));
  }
}
