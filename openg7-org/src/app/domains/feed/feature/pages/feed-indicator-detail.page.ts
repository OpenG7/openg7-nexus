import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import {
  CreateIndicatorAlertRulePayload,
  IndicatorAlertRuleRecord,
  IndicatorAlertRulesService,
} from '@app/core/indicator-alert-rules.service';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import { TranslateModule } from '@ngx-translate/core';

import { IndicatorAlertDrawerComponent } from '../components/indicator-alert-drawer.component';
import { IndicatorChartComponent } from '../components/indicator-chart.component';
import {
  IndicatorAlertDraft,
  IndicatorAlertDrawerMode,
  IndicatorAlertSubmitState,
  IndicatorConnectionState,
  IndicatorDetailVm,
  IndicatorGranularity,
  IndicatorPoint,
  IndicatorRelatedEntry,
  IndicatorStatusLevel,
  IndicatorTimeframe,
} from '../components/indicator-detail.models';
import { IndicatorHeroComponent } from '../components/indicator-hero.component';
import { IndicatorKeyDataComponent } from '../components/indicator-key-data.component';
import { Og7PublicationMetadataCardComponent } from '../components/publication-metadata-card.component';
import { IndicatorRelatedListComponent } from '../components/indicator-related-list.component';
import { IndicatorStatsAsideComponent } from '../components/indicator-stats-aside.component';
import { FeedItem } from '../models/feed.models';
import { IndicatorAlertDraftsService } from '../services/indicator-alert-drafts.service';

import { FeedDetailPageBase } from './feed-detail-page.base';

@Component({
  selector: 'og7-feed-indicator-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    IndicatorHeroComponent,
    IndicatorChartComponent,
    IndicatorStatsAsideComponent,
    IndicatorKeyDataComponent,
    Og7PublicationMetadataCardComponent,
    IndicatorRelatedListComponent,
    IndicatorAlertDrawerComponent,
  ],
  templateUrl: './feed-indicator-detail.page.html',
  styleUrl: './feed-indicator-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedIndicatorDetailPage extends FeedDetailPageBase {
  private readonly auth = inject(AuthService);
  private readonly notifications = injectNotificationStore();
  private readonly indicatorAlertRules = inject(IndicatorAlertRulesService);
  private readonly indicatorAlertDrafts = inject(IndicatorAlertDraftsService);
  protected readonly pendingAlertDraft = signal<IndicatorAlertDraft | null>(null);
  private alertStatusTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly loading = computed(() => this.detailLoading() || this.feed.loading());
  protected readonly error = computed(() => this.detailError() ?? this.feed.error());

  protected readonly timeframe = signal<IndicatorTimeframe>('72h');
  protected readonly granularity = signal<IndicatorGranularity>('hour');
  protected readonly drawerOpen = signal(false);
  protected readonly alertDrawerMode = signal<IndicatorAlertDrawerMode>('compose');
  protected readonly alertSubmitState = signal<IndicatorAlertSubmitState>('idle');
  protected readonly alertSubmitError = signal<string | null>(null);

  protected readonly detailVm = computed(() => {
    const item = this.selectedItem();
    if (!item || item.type !== 'INDICATOR') {
      return null;
    }
    return this.buildDetailVm(item);
  });
  protected readonly activeAlertRule = computed<IndicatorAlertRuleRecord | null>(() => {
    const detail = this.detailVm();
    if (!detail || !this.auth.isAuthenticated()) {
      return null;
    }
    return this.indicatorAlertRules.findActiveRuleForIndicator(detail.item.id);
  });
  protected readonly subscribed = computed(() => this.activeAlertRule() !== null);
  protected readonly subscribePending = computed(() => this.alertSubmitState() === 'submitting');
  protected readonly subscribeDisabled = computed(() => this.subscribePending());

  protected readonly connectionState = computed<IndicatorConnectionState>(() => {
    if (!this.feed.connectionState.connected()) {
      return 'offline';
    }
    if (this.feed.connectionState.reconnecting() || this.feed.connectionState.error()) {
      return 'degraded';
    }
    return 'online';
  });
  protected readonly alertRetryEnabled = computed(() => {
    if (!this.pendingAlertDraft()) {
      return false;
    }
    const state = this.alertSubmitState();
    if (state === 'error') {
      return true;
    }
    return state === 'offline' && this.feed.connectionState.connected();
  });

  protected readonly series = computed(() => {
    const detail = this.detailVm();
    if (!detail) {
      return [] as readonly IndicatorPoint[];
    }
    return this.resampleSeries(detail.points, this.timeframe(), this.granularity());
  });

  protected readonly deltaPctLabel = computed(() => {
    const points = this.series();
    if (points.length < 2) {
      return '+0%';
    }
    const first = points[0]?.value ?? 0;
    const last = points[points.length - 1]?.value ?? 0;
    const pct = first ? ((last - first) / first) * 100 : 0;
    const rounded = Math.round(pct);
    return `${rounded >= 0 ? '+' : ''}${rounded}%`;
  });

  protected readonly deltaAbsLabel = computed(() => {
    const points = this.series();
    if (points.length < 2) {
      return `+0 ${this.unitLabel()}`;
    }
    const first = points[0]?.value ?? 0;
    const last = points[points.length - 1]?.value ?? 0;
    const delta = last - first;
    return `${delta >= 0 ? '+' : ''}${Math.abs(delta).toFixed(2)} ${this.unitLabel()}`;
  });

  protected readonly firstValueLabel = computed(() => {
    const points = this.series();
    const first = points[0]?.value;
    if (first === undefined) {
      return '--';
    }
    return this.formatNumber(first);
  });

  protected readonly lastValueLabel = computed(() => {
    const points = this.series();
    const last = points[points.length - 1]?.value;
    if (last === undefined) {
      return '--';
    }
    return this.formatNumber(last);
  });

  protected readonly windowHours = computed(() => this.resolveWindowHours(this.timeframe()));

  protected readonly granularityLabel = computed(() =>
    this.translate.instant(`feed.indicator.detail.granularity.${this.granularity()}`)
  );

  protected readonly lastUpdatedLabel = computed(() => {
    const detail = this.detailVm();
    if (!detail) {
      return this.translate.instant('feed.indicator.detail.justNow');
    }
    return this.relativeTime(detail.lastUpdatedIso);
  });

  protected readonly levelLabel = computed(() => {
    const detail = this.detailVm();
    if (!detail) {
      return this.translate.instant('feed.indicator.detail.chart.level.normal');
    }
    return this.translate.instant(`feed.indicator.detail.chart.level.${detail.statusLevel}`);
  });

  protected readonly chartTitle = computed(() => {
    return this.translate.instant('feed.indicator.detail.chart.title', {
      deltaPct: this.deltaPctLabel(),
      deltaAbs: this.deltaAbsLabel(),
      from: this.firstValueLabel(),
      to: this.lastValueLabel(),
    });
  });

  protected readonly keyCurrentValueLabel = computed(() => `${this.lastValueLabel()} ${this.unitLabel()}`);

  protected readonly keyVariationLabel = computed(() => this.deltaPctLabel());

  protected readonly miniStatSeries = computed(() => {
    const detail = this.detailVm();
    return detail?.stats[0]?.series ?? [];
  });

  protected readonly miniStatLabel = computed(() =>
    this.translate.instant('feed.indicator.detail.keyData.secondaryStat')
  );

  protected readonly miniStatDelta = computed(() => {
    const detail = this.detailVm();
    return detail?.stats[0]?.delta ?? '+0%';
  });

  constructor() {
    super();

    effect(() => {
      this.itemId();
      this.timeframe.set('72h');
      this.granularity.set('hour');
      this.drawerOpen.set(false);
      this.resetAlertSubmitState();
    });

    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.indicatorAlertRules.refresh();
      }
    });

    this.destroyRef.onDestroy(() => this.clearAlertStatusTimer());
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    this.updateHeaderCompactFromScroll();
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeyboardShortcut(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === 'escape' && this.drawerOpen()) {
      event.preventDefault();
      this.closeAlertDrawer();
      return;
    }

    if (this.isEditingTarget(event.target)) {
      return;
    }

    if (key === 's') {
      event.preventDefault();
      this.subscribe();
    }
  }

  protected setTimeframe(value: IndicatorTimeframe): void {
    this.timeframe.set(value);
    if (value === '7d' && this.granularity() === '15m') {
      this.granularity.set('hour');
    }
  }

  protected setGranularity(value: IndicatorGranularity): void {
    if (this.timeframe() === '7d' && value === '15m') {
      this.granularity.set('hour');
      return;
    }
    this.granularity.set(value);
  }

  protected subscribe(): void {
    const detail = this.detailVm();
    if (!detail || this.subscribePending()) {
      return;
    }
    if (this.activeAlertRule()) {
      this.openAlertDrawerInViewMode();
      return;
    }
    this.openAlertDrawer();
  }

  protected openAlertDrawer(): void {
    this.openAlertDrawerInComposeMode();
  }

  protected closeAlertDrawer(): void {
    this.drawerOpen.set(false);
    this.resetAlertSubmitState();
  }

  protected onAlertDraftSubmitted(draft: IndicatorAlertDraft): void {
    this.pendingAlertDraft.set(draft);
    void this.submitAlertDraft(draft);
  }

  protected onAlertDraftRetryRequested(): void {
    const draft = this.pendingAlertDraft();
    if (!draft) {
      return;
    }
    void this.submitAlertDraft(draft);
  }

  private openAlertDrawerInViewMode(): void {
    const detail = this.detailVm();
    if (!detail) {
      return;
    }

    if (!this.auth.isAuthenticated()) {
      this.redirectToLogin();
      return;
    }

    this.resetAlertSubmitState();
    this.alertDrawerMode.set('view');
    this.drawerOpen.set(true);
  }

  private openAlertDrawerInComposeMode(): void {
    const detail = this.detailVm();
    if (!detail) {
      return;
    }

    if (!this.auth.isAuthenticated()) {
      this.redirectToLogin();
      return;
    }

    this.resetAlertSubmitState();
    this.alertDrawerMode.set('compose');
    const restoredDraft = this.indicatorAlertDrafts.draftForIndicator(detail.item.id);
    if (restoredDraft) {
      this.pendingAlertDraft.set(restoredDraft);
      this.alertSubmitState.set('offline');
      this.alertSubmitError.set(this.translate.instant('feed.error.offline'));
    }
    this.drawerOpen.set(true);
  }

  private async submitAlertDraft(draft: IndicatorAlertDraft): Promise<void> {
    const detail = this.detailVm();
    if (!detail || this.alertSubmitState() === 'submitting') {
      return;
    }

    if (!this.auth.isAuthenticated()) {
      this.redirectToLogin();
      return;
    }

    this.alertSubmitError.set(null);

    if (!this.feed.connectionState.connected()) {
      this.pendingAlertDraft.set(draft);
      this.indicatorAlertDrafts.save(detail.item.id, draft);
      this.alertSubmitState.set('offline');
      this.alertSubmitError.set(this.translate.instant('feed.error.offline'));
      return;
    }

    this.alertSubmitState.set('submitting');
    const rulePayload = this.buildIndicatorAlertRulePayload(detail, draft);

    try {
      const record = this.indicatorAlertRules.create(rulePayload);
      this.notifications.success(this.translate.instant('feed.indicator.detail.drawer.status.success'), {
        source: 'feed',
        metadata: {
          action: 'create-indicator-alert',
          itemId: detail.item.id,
          indicatorAlertRuleId: record.id,
        },
      });
    } catch (error) {
      const message = this.resolveLoadError(error);
      this.alertSubmitState.set('error');
      this.alertSubmitError.set(message);
      this.notifications.error(message, {
        source: 'feed',
        context: error,
        metadata: {
          action: 'create-indicator-alert',
          itemId: detail.item.id,
        },
      });
      return;
    }

    this.indicatorAlertDrafts.clear(detail.item.id);
    this.alertSubmitState.set('success');
    this.alertSubmitError.set(null);
    this.pendingAlertDraft.set(null);
    this.closeAlertDrawerAfterSuccess();
  }

  private buildIndicatorAlertRulePayload(
    detail: IndicatorDetailVm,
    draft: IndicatorAlertDraft
  ): CreateIndicatorAlertRulePayload {
    return {
      indicatorId: detail.item.id,
      indicatorTitle: detail.title,
      thresholdDirection: draft.thresholdDirection,
      thresholdValue: draft.thresholdValue,
      window: draft.window,
      frequency: draft.frequency,
      notifyDelta: draft.notifyDelta,
      note: draft.note,
      route: this.currentInternalUrl(),
    };
  }

  private closeAlertDrawerAfterSuccess(): void {
    this.clearAlertStatusTimer();
    this.alertStatusTimer = setTimeout(() => {
      this.drawerOpen.set(false);
      this.alertSubmitState.set('idle');
    }, 750);
  }

  private resetAlertSubmitState(): void {
    this.clearAlertStatusTimer();
    this.alertDrawerMode.set('compose');
    this.pendingAlertDraft.set(null);
    this.alertSubmitState.set('idle');
    this.alertSubmitError.set(null);
  }

  private clearAlertStatusTimer(): void {
    if (!this.alertStatusTimer) {
      return;
    }
    clearTimeout(this.alertStatusTimer);
    this.alertStatusTimer = null;
  }

  protected openStatsDetails(): void {
    void this.router.navigate(['/feed'], {
      queryParams: { type: 'INDICATOR' },
      queryParamsHandling: 'merge',
    });
  }

  protected openRelatedEntry(entry: IndicatorRelatedEntry): void {
    if (!entry.id) {
      void this.router.navigate(['/feed'], {
        queryParams: { type: entry.route === 'alert' ? 'ALERT' : 'REQUEST' },
        queryParamsHandling: 'merge',
      });
      return;
    }
    const segment = entry.route === 'alert' ? 'alerts' : 'opportunities';
    void this.router.navigate(['/feed', segment, entry.id]);
  }

  protected openRelatedCollection(type: 'alert' | 'opportunity'): void {
    void this.router.navigate(['/feed'], {
      queryParams: { type: type === 'alert' ? 'ALERT' : 'REQUEST' },
      queryParamsHandling: 'merge',
    });
  }

  protected async share(): Promise<void> {
    const detail = this.detailVm();
    if (!detail) {
      return;
    }
    const url = this.currentUrl();

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: detail.title,
          text: detail.subtitle,
          url,
        });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // Best effort share.
    }
  }

  protected retry(): void {
    this.feed.reload();
    this.triggerDetailReload();
  }

  protected unitLabel(): string {
    const detail = this.detailVm();
    return detail?.unitLabel ?? this.translate.instant('feed.indicator.detail.unit');
  }

  private buildDetailVm(item: FeedItem): IndicatorDetailVm {
    const provinceLabel =
      this.resolveProvinceLabel(item.toProvinceId) ??
      this.resolveProvinceLabel(item.fromProvinceId) ??
      this.translate.instant('feed.indicator.detail.demo.province');
    const sectorLabel =
      this.resolveSectorLabel(item.sectorId) ??
      this.translate.instant('feed.indicator.detail.demo.sector');

    const statusLevel = this.resolveStatusLevel(item.urgency ?? null);
    const baseSeries = this.buildBaseSeries(item.updatedAt ?? item.createdAt);

    return {
      item,
      title: item.title,
      subtitle: `${provinceLabel} · ${sectorLabel} · ${this.translate.instant('feed.indicator.detail.demo.kind')}`,
      provinceLabel,
      sectorLabel,
      kindLabel: this.translate.instant('feed.indicator.detail.demo.kind'),
      statusLevel,
      statusLabel: this.translate.instant(`feed.indicator.detail.chart.level.${statusLevel}`),
      deltaPctLabel: '+12%',
      deltaAbsLabel: '+1.13 c/kWh',
      windowHours: 72,
      granularityLabel: this.translate.instant('feed.indicator.detail.granularity.hour'),
      unitLabel: this.translate.instant('feed.indicator.detail.unit'),
      currentValueLabel: `36 ${this.translate.instant('feed.indicator.detail.unit')}`,
      variationLabel: '+20%',
      keyFactors: [
        this.translate.instant('feed.indicator.detail.demo.factorDemand'),
        this.translate.instant('feed.indicator.detail.demo.factorWeather'),
        this.translate.instant('feed.indicator.detail.demo.factorGeneration'),
      ],
      completedLabel: this.translate.instant('feed.indicator.detail.demo.completedAt'),
      lastUpdatedIso: item.updatedAt ?? item.createdAt,
      points: baseSeries,
      stats: [
        {
          id: 'reserve-margin',
          label: this.translate.instant('feed.indicator.detail.demo.statReserveMargin'),
          value: '3%',
          delta: '-2%',
          trend: 'down',
          series: [4.1, 3.9, 3.8, 3.4, 3.1, 2.9, 2.7, 2.8, 3],
        },
        {
          id: 'congestion-outaouais',
          label: this.translate.instant('feed.indicator.detail.demo.statCongestion'),
          value: '75%',
          delta: '+5%',
          trend: 'up',
          series: [62, 64, 65, 66, 68, 71, 72, 74, 75],
        },
        {
          id: 'afternoon-forecast',
          label: this.translate.instant('feed.indicator.detail.demo.statForecast'),
          value: this.translate.instant('feed.indicator.detail.demo.forecastHigh'),
          delta: '+9%',
          trend: 'up',
          series: [28, 28.5, 29, 29.4, 30.1, 31.4, 32.4, 33.8, 35],
        },
      ],
      relatedAlerts: this.buildRelatedAlerts(item, provinceLabel),
      relatedOpportunities: this.buildRelatedOpportunities(item),
    };
  }

  private buildRelatedAlerts(item: FeedItem, provinceLabel: string): readonly IndicatorRelatedEntry[] {
    const related = this.feed
      .items()
      .filter(entry => entry.type === 'ALERT' && entry.id !== item.id)
      .slice(0, 2)
      .map(entry => ({
        id: entry.id,
        title: entry.title,
        context:
          this.resolveProvinceLabel(entry.toProvinceId) ??
          this.resolveProvinceLabel(entry.fromProvinceId) ??
          provinceLabel,
        sparkline: [35, 36, 35.8, 36.1, 37.2, 37.5, 38.1, 38.6],
        route: 'alert' as const,
      }));

    if (related.length) {
      return related;
    }

    return [
      {
        id: null,
        title: this.translate.instant('feed.indicator.detail.demo.relatedAlert1'),
        context: provinceLabel,
        sparkline: [32, 32.4, 33, 33.2, 34, 34.4, 34.8, 35.1],
        route: 'alert',
      },
      {
        id: null,
        title: this.translate.instant('feed.indicator.detail.demo.relatedAlert2'),
        context: this.translate.instant('feed.indicator.detail.demo.relatedAlertRegion2'),
        sparkline: [28, 28.2, 28.6, 29.1, 29.3, 29.8, 30.4, 31],
        route: 'alert',
      },
    ];
  }

  private buildRelatedOpportunities(item: FeedItem): readonly IndicatorRelatedEntry[] {
    const related = this.feed
      .items()
      .filter(entry => entry.type !== 'ALERT' && entry.type !== 'INDICATOR' && entry.id !== item.id)
      .slice(0, 2)
      .map(entry => ({
        id: entry.id,
        title: entry.title,
        context: this.composeRouteLabel(entry),
        sparkline: [22, 22.4, 22.8, 23.1, 24, 24.8, 25.1, 26],
        route: 'opportunity' as const,
      }));

    if (related.length) {
      return related;
    }

    return [
      {
        id: null,
        title: this.translate.instant('feed.indicator.detail.demo.relatedOpportunity1'),
        context: this.translate.instant('feed.indicator.detail.demo.relatedOpportunityRoute1'),
        sparkline: [20, 21, 21.2, 21.8, 22.3, 22.9, 23.6, 24.2],
        route: 'opportunity',
      },
      {
        id: null,
        title: this.translate.instant('feed.indicator.detail.demo.relatedOpportunity2'),
        context: this.translate.instant('feed.indicator.detail.demo.relatedOpportunityRoute2'),
        sparkline: [18.4, 18.8, 19.1, 19.3, 19.7, 20.2, 20.8, 21.4],
        route: 'opportunity',
      },
    ];
  }

  private buildBaseSeries(referenceIso: string): readonly IndicatorPoint[] {
    const end = new Date(referenceIso).getTime();
    const endSafe = Number.isFinite(end) ? end : Date.now();
    const length = 168;
    const rawValues = Array.from({ length }, (_, index) => {
      const progress = index / (length - 1);
      const baseline = 28.4 + progress * 8.4;
      const wave = Math.sin(index * 0.21) * 0.45 + Math.cos(index * 0.09) * 0.3;
      const surge = progress > 0.66 ? Math.pow(progress - 0.66, 2) * 8 : 0;
      return baseline + wave + surge;
    });

    const first = rawValues[0] ?? 0;
    const last = rawValues[rawValues.length - 1] ?? 1;
    const scale = (36 - 30) / Math.max(last - first, 0.001);

    return rawValues.map((value, index) => ({
      ts: new Date(endSafe - (length - 1 - index) * 3600_000).toISOString(),
      value: Number((30 + (value - first) * scale).toFixed(2)),
    }));
  }

  private resampleSeries(
    points: readonly IndicatorPoint[],
    timeframe: IndicatorTimeframe,
    granularity: IndicatorGranularity
  ): readonly IndicatorPoint[] {
    if (!points.length) {
      return [];
    }
    const hours = this.resolveWindowHours(timeframe);
    const hourly = points.slice(-hours);
    if (granularity === 'hour') {
      return hourly;
    }
    if (granularity === '15m') {
      if (timeframe === '7d') {
        return hourly;
      }
      return this.interpolateQuarterHour(hourly);
    }
    return this.aggregateDaily(hourly, timeframe);
  }

  private interpolateQuarterHour(points: readonly IndicatorPoint[]): readonly IndicatorPoint[] {
    if (points.length < 2) {
      return points;
    }
    const result: IndicatorPoint[] = [];
    for (let index = 0; index < points.length - 1; index++) {
      const current = points[index];
      const next = points[index + 1];
      if (!current || !next) {
        continue;
      }
      const currentTs = new Date(current.ts).getTime();
      const nextTs = new Date(next.ts).getTime();
      for (let step = 0; step < 4; step++) {
        const ratio = step / 4;
        const value = current.value + (next.value - current.value) * ratio;
        const ts = currentTs + (nextTs - currentTs) * ratio;
        result.push({
          ts: new Date(ts).toISOString(),
          value: Number(value.toFixed(2)),
        });
      }
    }
    const last = points[points.length - 1];
    if (last) {
      result.push(last);
    }
    return result;
  }

  private aggregateDaily(points: readonly IndicatorPoint[], timeframe: IndicatorTimeframe): readonly IndicatorPoint[] {
    if (!points.length) {
      return [];
    }
    if (timeframe === '24h') {
      const first = points[0];
      const last = points[points.length - 1];
      if (!first || !last) {
        return points;
      }
      return [first, last];
    }

    const result: IndicatorPoint[] = [];
    for (let index = 0; index < points.length; index += 24) {
      const chunk = points.slice(index, index + 24);
      if (!chunk.length) {
        continue;
      }
      const average = chunk.reduce((sum, point) => sum + point.value, 0) / chunk.length;
      const latest = chunk[chunk.length - 1];
      if (!latest) {
        continue;
      }
      result.push({
        ts: latest.ts,
        value: Number(average.toFixed(2)),
      });
    }

    if (result.length >= 2) {
      return result;
    }

    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) {
      return points;
    }
    return [first, last];
  }

  private resolveStatusLevel(level: 1 | 2 | 3 | null): IndicatorStatusLevel {
    if (level === 3) {
      return 'critical';
    }
    if (level === 2) {
      return 'high';
    }
    return 'normal';
  }

  private resolveWindowHours(timeframe: IndicatorTimeframe): number {
    if (timeframe === '24h') {
      return 24;
    }
    if (timeframe === '7d') {
      return 168;
    }
    return 72;
  }

  private resolveProvinceLabel(id: string | null | undefined): string | null {
    if (!id) {
      return null;
    }
    return this.provinceNameMap().get(id) ?? id;
  }

  private resolveSectorLabel(id: string | null | undefined): string | null {
    if (!id) {
      return null;
    }
    return this.sectorNameMap().get(id) ?? id;
  }

  private composeRouteLabel(item: FeedItem): string {
    const from = this.resolveProvinceLabel(item.fromProvinceId);
    const to = this.resolveProvinceLabel(item.toProvinceId);
    if (from && to) {
      return `${from} -> ${to}`;
    }
    if (to) {
      return to;
    }
    if (from) {
      return from;
    }
    return this.translate.instant('feed.indicator.detail.demo.province');
  }

  private relativeTime(value: string): string {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) {
      return this.translate.instant('feed.indicator.detail.justNow');
    }
    const diffMs = Date.now() - timestamp;
    if (diffMs <= 30_000) {
      return this.translate.instant('feed.indicator.detail.justNow');
    }
    const minutes = Math.round(diffMs / 60_000);
    if (minutes < 60) {
      return this.translate.instant('feed.indicator.detail.minutesAgo', { count: minutes });
    }
    const hours = Math.round(minutes / 60);
    return this.translate.instant('feed.indicator.detail.hoursAgo', { count: hours });
  }

  private formatNumber(value: number): string {
    return value.toFixed(1).replace(/\.0$/, '');
  }

  private isEditingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
  }

  private currentUrl(): string {
    if (typeof window !== 'undefined' && window.location?.href) {
      return window.location.href;
    }
    const id = this.itemId() ?? 'unknown';
    return `/feed/indicators/${id}`;
  }

  private redirectToLogin(): void {
    void this.router.navigate(['/login'], {
      queryParams: { redirect: this.currentInternalUrl() },
    });
  }

  private currentInternalUrl(): string {
    const navigation = this.router.getCurrentNavigation();
    const url = navigation?.finalUrl?.toString() ?? navigation?.extractedUrl?.toString() ?? this.router.url;
    if (typeof url === 'string' && url.trim().length > 0) {
      return url.startsWith('/') ? url : `/${url.replace(/^\/+/, '')}`;
    }
    const id = this.itemId() ?? 'unknown';
    return `/feed/indicators/${id}`;
  }

  protected override isExpectedItem(item: FeedItem | null): item is FeedItem {
    return item?.type === 'INDICATOR';
  }
}
