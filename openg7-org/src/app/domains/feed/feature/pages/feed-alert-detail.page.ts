import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import { selectProvinces } from '@app/state/catalog/catalog.selectors';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';

import { AlertContextAsideComponent } from '../components/alert-context-aside.component';
import { AlertDetailBodyComponent } from '../components/alert-detail-body.component';
import { AlertDetailHeaderComponent } from '../components/alert-detail-header.component';
import {
  AlertDetailVm,
  AlertRelatedAlertEntry,
  AlertRelatedOpportunityEntry,
  AlertUpdatePayload,
  AlertUpdateSubmitState,
} from '../components/alert-detail.models';
import { AlertUpdateDrawerComponent } from '../components/alert-update-drawer.component';
import { FeedItem } from '../models/feed.models';
import { AlertUpdateQueueService } from '../services/alert-update-queue.service';
import { FeedRealtimeService } from '../services/feed-realtime.service';

@Component({
  selector: 'og7-feed-alert-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    AlertDetailHeaderComponent,
    AlertDetailBodyComponent,
    AlertContextAsideComponent,
    AlertUpdateDrawerComponent,
  ],
  templateUrl: './feed-alert-detail.page.html',
  styleUrl: './feed-alert-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedAlertDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = injectNotificationStore();
  private readonly feed = inject(FeedRealtimeService);
  private readonly alertUpdateQueue = inject(AlertUpdateQueueService);
  private readonly store = inject(Store);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly itemId = toSignal(this.route.paramMap.pipe(map(params => params.get('itemId'))), {
    initialValue: this.route.snapshot.paramMap.get('itemId'),
  });

  private readonly detailItem = signal<FeedItem | null>(null);
  private readonly detailLoading = signal(false);
  private readonly detailError = signal<string | null>(null);
  private reportStatusTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly loading = computed(() => this.detailLoading() || this.feed.loading());
  protected readonly error = computed(() => this.detailError() ?? this.feed.error());

  protected readonly headerCompact = signal(false);
  protected readonly subscribed = signal(false);
  protected readonly reportDrawerOpen = signal(false);
  protected readonly reportSubmitState = signal<AlertUpdateSubmitState>('idle');
  protected readonly reportSubmitError = signal<string | null>(null);

  protected readonly provinces = this.store.selectSignal(selectProvinces);

  protected readonly provinceNameMap = computed(() => {
    const map = new Map<string, string>();
    for (const province of this.provinces()) {
      map.set(province.id, province.name);
    }
    return map;
  });

  protected readonly selectedItem = computed(() => {
    const id = this.itemId();
    if (!id) {
      return null;
    }
    const resolved = this.detailItem();
    if (resolved?.id === id) {
      return resolved;
    }
    return this.feed.items().find(item => item.id === id) ?? null;
  });

  protected readonly detailVm = computed(() => {
    const item = this.selectedItem();
    if (!item || item.type !== 'ALERT') {
      return null;
    }
    return this.buildAlertDetailVm(item);
  });

  protected readonly lastUpdatedLabel = computed(() => {
    const detail = this.detailVm();
    if (!detail) {
      return this.translate.instant('feed.alert.detail.justNow');
    }
    return this.relativeTime(detail.updatedAtIso);
  });

  constructor() {
    effect(onCleanup => {
      const itemId = this.itemId();
      this.detailItem.set(null);
      this.detailError.set(null);

      if (!itemId) {
        this.detailLoading.set(false);
        return;
      }

      let cancelled = false;
      this.detailLoading.set(true);

      void this.feed
        .findItemById(itemId)
        .then(item => {
          if (cancelled) {
            return;
          }
          this.detailItem.set(item);
        })
        .catch(error => {
          if (cancelled) {
            return;
          }
          this.detailError.set(this.resolveLoadError(error));
        })
        .finally(() => {
          if (!cancelled) {
            this.detailLoading.set(false);
          }
        });

      onCleanup(() => {
        cancelled = true;
      });
    });

    effect(() => {
      this.itemId();
      this.subscribed.set(false);
      this.reportDrawerOpen.set(false);
      this.resetReportSubmitState();
    });

    this.destroyRef.onDestroy(() => this.clearReportStatusTimer());
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.headerCompact.set(window.scrollY > 56);
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeyboardShortcut(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === 'escape' && this.reportDrawerOpen()) {
      event.preventDefault();
      this.closeReportDrawer();
      return;
    }

    if (this.reportDrawerOpen()) {
      return;
    }

    if (key !== 's') {
      return;
    }
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    ) {
      return;
    }
    event.preventDefault();
    this.toggleSubscribe();
  }

  protected toggleSubscribe(): void {
    this.subscribed.update(value => !value);
  }

  protected closeReportDrawer(): void {
    this.reportDrawerOpen.set(false);
    this.resetReportSubmitState();
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
          text: detail.summaryHeadline,
          url,
        });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // Best effort only.
    }
  }

  protected reportUpdate(): void {
    this.resetReportSubmitState();
    this.reportDrawerOpen.set(true);
  }

  protected handleReportSubmitted(payload: AlertUpdatePayload): void {
    const detail = this.detailVm();
    if (!detail) {
      return;
    }

    try {
      const record = this.alertUpdateQueue.queueUpdate({
        alertId: detail.item.id,
        alertTitle: detail.title,
        route: this.currentInternalUrl(),
        payload,
      });

      this.reportSubmitState.set('success');
      this.reportSubmitError.set(null);
      this.subscribed.set(true);
      this.notifications.success(this.translate.instant('feed.alert.detail.report.status.success'), {
        source: 'feed',
        metadata: {
          itemId: detail.item.id,
          reportId: record.id,
          reason: payload.reason,
        },
      });
      this.closeReportDrawerAfterSuccess();
    } catch (error) {
      const message = this.resolveLoadError(error);
      this.reportSubmitState.set('error');
      this.reportSubmitError.set(message);
      this.notifications.error(message, {
        source: 'feed',
        context: error,
        metadata: {
          itemId: detail.item.id,
          reason: payload.reason,
        },
      });
    }
  }

  protected createOpportunity(): void {
    const detail = this.detailVm();
    if (!detail) {
      return;
    }
    const inferredMode =
      detail.item.fromProvinceId &&
      detail.item.toProvinceId &&
      detail.item.fromProvinceId !== detail.item.toProvinceId
        ? 'IMPORT'
        : 'BOTH';
    const fallbackToProvinceId = detail.item.toProvinceId ?? detail.item.fromProvinceId ?? null;
    const draftTitlePrefix = this.translate.instant('feed.alert.detail.cta.createOpportunityTitlePrefix');
    const draftTitle = `${draftTitlePrefix}: ${detail.title}`.slice(0, 160);
    const draftSummary = detail.summaryHeadline.slice(0, 5000);
    const draftTags = this.buildLinkedOpportunityTags(detail.item).join(',');

    void this.router.navigate(['/feed'], {
      queryParams: {
        type: 'REQUEST',
        mode: inferredMode,
        sector: detail.item.sectorId ?? null,
        fromProvince: detail.item.fromProvinceId ?? null,
        toProvince: fallbackToProvinceId,
        q: detail.title,
        draftSource: 'alert',
        draftAlertId: detail.item.id,
        draftType: 'REQUEST',
        draftMode: inferredMode,
        draftSectorId: detail.item.sectorId ?? null,
        draftFromProvinceId: detail.item.fromProvinceId ?? null,
        draftToProvinceId: fallbackToProvinceId,
        draftTitle,
        draftSummary,
        draftTags: draftTags || null,
      },
    });
  }

  protected openRelatedAlert(alertId: string): void {
    void this.router.navigate(['/feed', 'alerts', alertId]);
  }

  protected openRelatedOpportunity(opportunityId: string): void {
    void this.router.navigate(['/feed', 'opportunities', opportunityId]);
  }

  protected openAllAlerts(): void {
    void this.router.navigate(['/feed'], {
      queryParams: { type: 'ALERT' },
      queryParamsHandling: 'merge',
    });
  }

  private buildAlertDetailVm(item: FeedItem): AlertDetailVm {
    const provinceLabel =
      this.resolveProvinceLabel(item.toProvinceId) ??
      this.resolveProvinceLabel(item.fromProvinceId) ??
      this.translate.instant('feed.alert.detail.ontario');

    const severityLabel = this.resolveSeverity(item.urgency ?? null);
    const confidenceLabel = this.resolveConfidence(item.credibility ?? null);
    const windowLabel = this.resolveWindow(item.urgency ?? null);

    return {
      item,
      title: item.title,
      subtitle: `${provinceLabel} · ${this.translate.instant('feed.alert.detail.weather')} · ${this.translate.instant('feed.alert.detail.gridNetwork')}`,
      severityLabel,
      confidenceLabel,
      windowLabel,
      summaryHeadline: item.summary,
      summaryPoints: [
        this.translate.instant('feed.alert.detail.demo.summaryPoint1'),
        this.translate.instant('feed.alert.detail.demo.summaryPoint2'),
      ],
      impactPoints: [
        this.translate.instant('feed.alert.detail.demo.impactPoint1'),
        this.translate.instant('feed.alert.detail.demo.impactPoint2'),
        this.translate.instant('feed.alert.detail.demo.impactPoint3'),
      ],
      zones: [
        this.translate.instant('feed.alert.detail.demo.zone1'),
        this.translate.instant('feed.alert.detail.demo.zone2'),
        this.translate.instant('feed.alert.detail.demo.zone3'),
      ],
      infrastructures: [
        this.translate.instant('feed.alert.detail.demo.infrastructure1'),
        this.translate.instant('feed.alert.detail.demo.infrastructure2'),
        this.translate.instant('feed.alert.detail.demo.infrastructure3'),
      ],
      timeline: [
        {
          id: `${item.id}-timeline-start`,
          label: this.translate.instant('feed.alert.detail.timeline.start'),
          value: this.translate.instant('feed.alert.detail.demo.timelineStart'),
        },
        {
          id: `${item.id}-timeline-peak`,
          label: this.translate.instant('feed.alert.detail.timeline.peak'),
          value: this.translate.instant('feed.alert.detail.demo.timelinePeak'),
        },
        {
          id: `${item.id}-timeline-recovery`,
          label: this.translate.instant('feed.alert.detail.timeline.recovery'),
          value: this.translate.instant('feed.alert.detail.demo.timelineRecovery'),
        },
      ],
      updates: [
        {
          id: `${item.id}-update-1`,
          title: this.translate.instant('feed.alert.detail.demo.update1'),
          when: this.relativeTime(item.updatedAt ?? item.createdAt),
        },
        {
          id: `${item.id}-update-2`,
          title: this.translate.instant('feed.alert.detail.demo.update2'),
          when: this.translate.instant('feed.alert.detail.demo.update2When'),
        },
        {
          id: `${item.id}-update-3`,
          title: this.translate.instant('feed.alert.detail.demo.update3'),
          when: this.translate.instant('feed.alert.detail.demo.update3When'),
        },
      ],
      recommendations: [
        this.translate.instant('feed.alert.detail.demo.reco1'),
        this.translate.instant('feed.alert.detail.demo.reco2'),
        this.translate.instant('feed.alert.detail.demo.reco3'),
      ],
      sources: [
        {
          id: 'source-environment-canada',
          label: this.translate.instant('feed.alert.detail.demo.sourceEnvironmentCanada'),
          href: 'https://weather.gc.ca',
          confidence: this.translate.instant('feed.alert.detail.confidence.high'),
        },
        {
          id: 'source-hydro-one',
          label: this.translate.instant('feed.alert.detail.demo.sourceHydroOne'),
          href: 'https://www.hydroone.com',
          confidence: this.translate.instant('feed.alert.detail.confidence.probable'),
        },
        {
          id: 'source-ieso',
          label: this.translate.instant('feed.alert.detail.demo.sourceIeso'),
          href: 'https://www.ieso.ca',
          confidence: this.translate.instant('feed.alert.detail.confidence.probable'),
        },
      ],
      indicators: [
        {
          id: `${item.id}-indicator-1`,
          label: this.translate.instant('feed.alert.detail.demo.indicatorSpotPrice'),
          context: provinceLabel,
          value: '+12%',
          trend: 'up',
        },
        {
          id: `${item.id}-indicator-2`,
          label: this.translate.instant('feed.alert.detail.demo.indicatorReserveMargin'),
          context: provinceLabel,
          value: '6%',
          trend: 'steady',
        },
        {
          id: `${item.id}-indicator-3`,
          label: this.translate.instant('feed.alert.detail.demo.indicatorOutages'),
          context: provinceLabel,
          value: this.translate.instant('feed.alert.detail.demo.outageValue'),
          trend: 'down',
        },
      ],
      relatedAlerts: this.buildRelatedAlerts(item, provinceLabel),
      relatedOpportunities: this.buildRelatedOpportunities(item),
      updatedAtIso: item.updatedAt ?? item.createdAt,
    };
  }

  private buildRelatedAlerts(item: FeedItem, provinceLabel: string): readonly AlertRelatedAlertEntry[] {
    const related = this.feed
      .items()
      .filter(entry => entry.type === 'ALERT' && entry.id !== item.id)
      .slice(0, 2)
      .map(entry => ({
        id: entry.id,
        title: entry.title,
        region:
          this.resolveProvinceLabel(entry.toProvinceId) ??
          this.resolveProvinceLabel(entry.fromProvinceId) ??
          provinceLabel,
        severity: this.resolveSeverity(entry.urgency ?? null),
      }));

    if (related.length) {
      return related;
    }

    return [
      {
        id: 'demo-high-winds-warning',
        title: this.translate.instant('feed.alert.detail.demo.relatedAlert1'),
        region: provinceLabel,
        severity: this.translate.instant('feed.alert.detail.severity.medium'),
      },
      {
        id: 'demo-heavy-snowfall-alert',
        title: this.translate.instant('feed.alert.detail.demo.relatedAlert2'),
        region: this.translate.instant('feed.alert.detail.quebec'),
        severity: this.translate.instant('feed.alert.detail.severity.high'),
      },
    ];
  }

  private buildRelatedOpportunities(item: FeedItem): readonly AlertRelatedOpportunityEntry[] {
    const related = this.feed
      .items()
      .filter(
        entry =>
          entry.id !== item.id &&
          (entry.type === 'REQUEST' ||
            entry.type === 'OFFER' ||
            entry.type === 'CAPACITY' ||
            entry.type === 'TENDER')
      )
      .slice(0, 2)
      .map(entry => ({
        id: entry.id,
        title: entry.title,
        routeLabel: this.composeRouteLabel(entry),
      }));

    if (related.length) {
      return related;
    }

    return [
      {
        id: 'request-001',
        title: this.translate.instant('feed.alert.detail.demo.relatedOpportunity1'),
        routeLabel: this.translate.instant('feed.alert.detail.demo.relatedOpportunityRoute1'),
      },
      {
        id: 'offer-001',
        title: this.translate.instant('feed.alert.detail.demo.relatedOpportunity2'),
        routeLabel: this.translate.instant('feed.alert.detail.demo.relatedOpportunityRoute2'),
      },
    ];
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
    return this.translate.instant('feed.alert.detail.routeUnknown');
  }

  private buildLinkedOpportunityTags(item: FeedItem): readonly string[] {
    const tags = new Set<string>(['linked-alert', 'request']);
    for (const tag of item.tags ?? []) {
      const normalized = this.toKebabTag(tag);
      if (normalized) {
        tags.add(normalized);
      }
    }
    return Array.from(tags).slice(0, 8);
  }

  private toKebabTag(value: string): string | null {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized.length ? normalized : null;
  }

  private resolveProvinceLabel(id: string | null | undefined): string | null {
    if (!id) {
      return null;
    }
    return this.provinceNameMap().get(id) ?? id;
  }

  private resolveSeverity(level: 1 | 2 | 3 | null): string {
    if (level === 3) {
      return this.translate.instant('feed.alert.detail.severity.high');
    }
    if (level === 2) {
      return this.translate.instant('feed.alert.detail.severity.medium');
    }
    return this.translate.instant('feed.alert.detail.severity.low');
  }

  private resolveConfidence(level: 1 | 2 | 3 | null): string {
    if (level === 3) {
      return this.translate.instant('feed.alert.detail.confidence.high');
    }
    if (level === 2) {
      return this.translate.instant('feed.alert.detail.confidence.probable');
    }
    return this.translate.instant('feed.alert.detail.confidence.possible');
  }

  private resolveWindow(level: 1 | 2 | 3 | null): string {
    if (level === 3) {
      return this.translate.instant('feed.alert.detail.windows.short');
    }
    if (level === 2) {
      return this.translate.instant('feed.alert.detail.windows.medium');
    }
    return this.translate.instant('feed.alert.detail.windows.long');
  }

  private relativeTime(value: string): string {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) {
      return this.translate.instant('feed.alert.detail.justNow');
    }

    const diffMs = Date.now() - timestamp;
    if (diffMs <= 30 * 1000) {
      return this.translate.instant('feed.alert.detail.justNow');
    }

    const minutes = Math.round(diffMs / 60000);
    if (minutes < 60) {
      return this.translate.instant('feed.alert.detail.minutesAgo', { count: minutes });
    }

    const hours = Math.round(minutes / 60);
    return this.translate.instant('feed.alert.detail.hoursAgo', { count: hours });
  }

  private currentUrl(): string {
    if (typeof window !== 'undefined' && window.location?.href) {
      return window.location.href;
    }
    const id = this.itemId() ?? 'unknown';
    return `/feed/alerts/${id}`;
  }

  private currentInternalUrl(): string {
    const navigation = this.router.getCurrentNavigation?.();
    const url = navigation?.finalUrl?.toString() ?? navigation?.extractedUrl?.toString() ?? this.router.url;
    if (typeof url === 'string' && url.trim().length > 0) {
      return url.startsWith('/') ? url : `/${url.replace(/^\/+/, '')}`;
    }
    const id = this.itemId() ?? 'unknown';
    return `/feed/alerts/${id}`;
  }

  private closeReportDrawerAfterSuccess(): void {
    this.clearReportStatusTimer();
    this.reportStatusTimer = setTimeout(() => {
      this.reportDrawerOpen.set(false);
      this.reportSubmitState.set('idle');
    }, 750);
  }

  private resetReportSubmitState(): void {
    this.clearReportStatusTimer();
    this.reportSubmitState.set('idle');
    this.reportSubmitError.set(null);
  }

  private clearReportStatusTimer(): void {
    if (!this.reportStatusTimer) {
      return;
    }
    clearTimeout(this.reportStatusTimer);
    this.reportStatusTimer = null;
  }

  private resolveLoadError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim().length) {
        return error.error;
      }
      if (typeof error.error?.message === 'string' && error.error.message.length) {
        return error.error.message;
      }
      if (typeof error.message === 'string' && error.message.length) {
        return error.message;
      }
    }
    if (error instanceof Error && error.message.length) {
      return error.message;
    }
    return this.translate.instant('feed.error.generic');
  }
}
