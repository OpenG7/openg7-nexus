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
import { AuthService } from '@app/core/auth/auth.service';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import {
  FEED_ALERT_SUBSCRIPTION_SOURCE_TYPE,
  UserAlertsService,
} from '@app/core/user-alerts.service';
import { selectProvinces, selectSectors } from '@app/state/catalog/catalog.selectors';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, startWith } from 'rxjs/operators';

import { AlertContextAsideComponent } from '../components/alert-context-aside.component';
import { AlertDetailBodyComponent } from '../components/alert-detail-body.component';
import { AlertDetailHeaderComponent } from '../components/alert-detail-header.component';
import {
  AlertDetailVm,
  AlertUpdateDrawerMode,
  AlertRelatedAlertEntry,
  AlertRelatedOpportunityEntry,
  AlertUpdatePayload,
  AlertUpdateSubmitState,
} from '../components/alert-detail.models';
import { AlertUpdateDrawerComponent } from '../components/alert-update-drawer.component';
import { buildFeedDraftPrefillQueryParams } from '../feed-draft-prefill.helpers';
import { FeedItem } from '../models/feed.models';
import { AlertUpdateQueueService } from '../services/alert-update-queue.service';
import { FeedConnectionMatchService } from '../services/feed-connection-match.service';
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
  private readonly auth = inject(AuthService);
  private readonly notifications = injectNotificationStore();
  private readonly feed = inject(FeedRealtimeService);
  private readonly connectionMatcher = inject(FeedConnectionMatchService);
  private readonly alertUpdateQueue = inject(AlertUpdateQueueService);
  private readonly userAlerts = inject(UserAlertsService);
  private readonly store = inject(Store);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeLanguage = toSignal(
    this.translate.onLangChange.pipe(
      map(event => event.lang),
      startWith(this.translate.currentLang || this.translate.getDefaultLang() || 'en')
    ),
    {
      initialValue: this.translate.currentLang || this.translate.getDefaultLang() || 'en',
    }
  );

  private readonly itemId = toSignal(this.route.paramMap.pipe(map(params => params.get('itemId'))), {
    initialValue: this.route.snapshot.paramMap.get('itemId'),
  });
  private readonly reloadVersion = signal(0);

  private readonly detailItem = signal<FeedItem | null>(null);
  private readonly detailLoading = signal(false);
  private readonly detailError = signal<string | null>(null);
  private readonly detailErrorKind = signal<'notFound' | 'unavailable' | null>(null);
  private reportStatusTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly loading = computed(() => this.detailLoading());
  protected readonly error = computed(() => this.detailError());
  protected readonly notFound = computed(() => this.detailErrorKind() === 'notFound');
  protected readonly retryAvailable = computed(() => this.detailErrorKind() === 'unavailable');

  protected readonly headerCompact = signal(false);
  protected readonly reportDrawerOpen = signal(false);
  protected readonly reportDrawerMode = signal<AlertUpdateDrawerMode>('compose');
  protected readonly reportSubmitState = signal<AlertUpdateSubmitState>('idle');
  protected readonly reportSubmitError = signal<string | null>(null);

  protected readonly provinces = this.store.selectSignal(selectProvinces);
  protected readonly sectors = this.store.selectSignal(selectSectors);

  protected readonly provinceNameMap = computed(() => {
    const map = new Map<string, string>();
    for (const province of this.provinces()) {
      map.set(province.id, province.name);
    }
    return map;
  });
  protected readonly sectorNameMap = computed(() => {
    const map = new Map<string, string>();
    for (const sector of this.sectors()) {
      map.set(sector.id, sector.name);
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
    this.activeLanguage();
    const item = this.selectedItem();
    if (!item || item.type !== 'ALERT') {
      return null;
    }
    return this.buildAlertDetailVm(item);
  });

  protected readonly lastUpdatedLabel = computed(() => {
    this.activeLanguage();
    const detail = this.detailVm();
    if (!detail) {
      return this.translate.instant('feed.alert.detail.justNow');
    }
    return this.relativeTime(detail.updatedAtIso);
  });
  protected readonly pendingReport = computed(() => {
    const detail = this.detailVm();
    if (!detail) {
      return null;
    }
    return this.alertUpdateQueue.latestPendingForAlert(detail.item.id);
  });
  protected readonly hasPendingReport = computed(() => Boolean(this.pendingReport()));
  protected readonly subscribed = computed(() => {
    const detail = this.detailVm();
    if (!detail || !this.auth.isAuthenticated()) {
      return false;
    }
    return this.userAlerts.hasSource(FEED_ALERT_SUBSCRIPTION_SOURCE_TYPE, detail.item.id);
  });
  protected readonly subscribePending = computed(() => {
    const detail = this.detailVm();
    if (!detail || !this.auth.isAuthenticated()) {
      return false;
    }
    return this.userAlerts.isSourcePending(FEED_ALERT_SUBSCRIPTION_SOURCE_TYPE, detail.item.id);
  });

  constructor() {
    effect(onCleanup => {
      const itemId = this.itemId();
      this.reloadVersion();
      this.detailItem.set(null);
      this.detailError.set(null);
      this.detailErrorKind.set(null);

      if (!itemId) {
        this.detailLoading.set(false);
        this.detailErrorKind.set('notFound');
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
          if (!item || item.type !== 'ALERT') {
            this.detailErrorKind.set('notFound');
            return;
          }
          this.detailItem.set(item);
        })
        .catch(error => {
          if (cancelled) {
            return;
          }
          this.detailErrorKind.set(this.resolveErrorKind(error));
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
      this.reportDrawerOpen.set(false);
      this.reportDrawerMode.set('compose');
      this.resetReportSubmitState();
    });

    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.userAlerts.refresh();
      }
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
    void this.subscribe();
  }

  protected async subscribe(): Promise<void> {
    const detail = this.detailVm();
    if (!detail || this.subscribePending() || this.subscribed()) {
      return;
    }

    if (!this.auth.isAuthenticated()) {
      this.redirectToLogin();
      return;
    }

    const result = await this.userAlerts.create(this.buildSubscriptionAlertPayload(detail));
    if (result.status === 'unauthenticated') {
      this.redirectToLogin();
      return;
    }

    const metadata = {
      action: 'subscribe-alert',
      itemId: detail.item.id,
      subscriptionAlertId: result.entry?.id ?? null,
      result: result.status,
    };

    if (result.status === 'created') {
      this.notifications.success(
        this.translate.instant('feed.alert.detail.subscription.status.success'),
        {
          source: 'feed',
          metadata,
        }
      );
      return;
    }

    if (result.status === 'duplicate') {
      this.notifications.info(
        this.translate.instant('feed.alert.detail.subscription.status.duplicate'),
        {
          source: 'feed',
          metadata,
        }
      );
      return;
    }

    if (result.status === 'pending') {
      this.notifications.info(
        this.translate.instant('feed.alert.detail.subscription.status.pending'),
        {
          source: 'feed',
          metadata,
        }
      );
      return;
    }

    const message =
      result.status === 'invalid'
        ? this.translate.instant('feed.alert.detail.subscription.status.invalid')
        : this.translate.instant('feed.alert.detail.subscription.status.errorGeneric');
    this.notifications.error(message, {
      source: 'feed',
      metadata,
    });
  }

  protected closeReportDrawer(): void {
    this.reportDrawerOpen.set(false);
    this.reportDrawerMode.set('compose');
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
        this.notifications.success(this.translate.instant('feed.alert.detail.shareCopied'), {
          source: 'feed',
          metadata: {
            action: 'share-alert',
            itemId: detail.item.id,
            method: 'clipboard',
          },
        });
        return;
      }

      this.notifications.error(this.translate.instant('feed.alert.detail.shareUnavailable'), {
        source: 'feed',
        metadata: {
          action: 'share-alert',
          itemId: detail.item.id,
          method: 'unsupported',
        },
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      this.notifications.error(this.translate.instant('feed.alert.detail.shareUnavailable'), {
        source: 'feed',
        context: error,
        metadata: {
          action: 'share-alert',
          itemId: detail.item.id,
          method: 'failed',
        },
      });
    }
  }

  protected retry(): void {
    if (!this.retryAvailable()) {
      return;
    }
    this.feed.reload();
    this.reloadVersion.update(version => version + 1);
  }

  protected reportUpdate(): void {
    this.resetReportSubmitState();
    this.reportDrawerMode.set(this.pendingReport() ? 'view' : 'compose');
    this.reportDrawerOpen.set(true);
  }

  protected reportAnotherUpdate(): void {
    this.resetReportSubmitState();
    this.reportDrawerMode.set('compose');
    this.reportDrawerOpen.set(true);
  }

  protected handleReportSubmitted(payload: AlertUpdatePayload): void {
    const detail = this.detailVm();
    if (
      !detail ||
      this.reportSubmitState() === 'submitting' ||
      this.reportSubmitState() === 'success'
    ) {
      return;
    }

    try {
      this.reportSubmitState.set('submitting');
      const record = this.alertUpdateQueue.queueUpdate({
        alertId: detail.item.id,
        alertTitle: detail.title,
        route: this.currentInternalUrl(),
        payload,
      });

      this.reportSubmitState.set('success');
      this.reportSubmitError.set(null);
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

  protected async createOpportunity(): Promise<void> {
    const detail = this.detailVm();
    if (!detail) {
      return;
    }
    try {
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
      const draftConnectionMatchId = await this.connectionMatcher.resolveDraftConnectionMatchId({
        type: 'REQUEST',
        title: draftTitle,
        summary: draftSummary,
        sectorId: detail.item.sectorId ?? null,
        fromProvinceId: detail.item.fromProvinceId ?? null,
        toProvinceId: fallbackToProvinceId,
        mode: inferredMode,
      });

      const navigated = await this.router.navigate(['/feed'], {
        queryParams: {
          type: 'REQUEST',
          mode: inferredMode,
          sector: detail.item.sectorId ?? null,
          fromProvince: detail.item.fromProvinceId ?? null,
          toProvince: fallbackToProvinceId,
          q: detail.title,
          ...buildFeedDraftPrefillQueryParams({
            draftSource: 'alert',
            draftAlertId: detail.item.id,
            draftOriginType: 'alert',
            draftOriginId: detail.item.id,
            draftType: 'REQUEST',
            draftMode: inferredMode,
            draftSectorId: detail.item.sectorId ?? null,
            draftFromProvinceId: detail.item.fromProvinceId ?? null,
            draftToProvinceId: fallbackToProvinceId,
            draftTitle,
            draftSummary,
            draftTags: draftTags || null,
            draftConnectionMatchId: draftConnectionMatchId ?? null,
          }),
        },
      });

      if (!navigated) {
        this.notifications.error(this.translate.instant('feed.alert.detail.opportunity.status.errorGeneric'), {
          source: 'feed',
          metadata: {
            action: 'create-linked-opportunity',
            itemId: detail.item.id,
          },
        });
        return;
      }

      this.notifications.success(this.translate.instant('feed.alert.detail.opportunity.status.success'), {
        source: 'feed',
        metadata: {
          action: 'create-linked-opportunity',
          itemId: detail.item.id,
          draftConnectionMatchId: draftConnectionMatchId ?? null,
        },
      });
    } catch (error) {
      this.notifications.error(this.translate.instant('feed.alert.detail.opportunity.status.errorGeneric'), {
        source: 'feed',
        context: error,
        metadata: {
          action: 'create-linked-opportunity',
          itemId: detail.item.id,
        },
      });
    }
  }

  protected openRelatedAlert(alertId: string | null): void {
    if (!alertId) {
      void this.router.navigate(['/feed'], {
        queryParams: { type: 'ALERT' },
        queryParamsHandling: 'merge',
      });
      return;
    }
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
    this.activeLanguage();
    const provinceLabel =
      this.resolveProvinceLabel(item.toProvinceId) ??
      this.resolveProvinceLabel(item.fromProvinceId) ??
      this.translate.instant('feed.alert.detail.ontario');
    const sectorLabel =
      this.resolveSectorLabel(item.sectorId) ??
      this.translate.instant('feed.alert.detail.unknownSector');
    const sourceLabel = item.source.label?.trim() || this.translate.instant('feed.sourceUnknown');
    const routeLabel = this.composeRouteLabel(item);
    const severityLabel = this.resolveSeverity(item.urgency ?? null);
    const confidenceLabel = this.resolveConfidence(item.credibility ?? null);
    const windowLabel = this.resolveWindow(item.urgency ?? null);

    return {
      item,
      title: item.title,
      subtitle: [provinceLabel, sectorLabel, sourceLabel].filter(Boolean).join(' | '),
      severityLabel,
      confidenceLabel,
      windowLabel,
      summaryHeadline: item.summary,
      summaryPoints: this.buildSummaryPoints(item, routeLabel, sourceLabel),
      impactPoints: this.buildImpactPoints(severityLabel, confidenceLabel, windowLabel),
      zones: this.buildZones(item, provinceLabel, routeLabel),
      infrastructures: this.buildInfrastructurePoints(sourceLabel, sectorLabel),
      timeline: this.buildTimeline(item, windowLabel),
      updates: this.buildUpdates(item, sourceLabel),
      recommendations: this.buildRecommendations(routeLabel, sourceLabel),
      sources: this.buildSources(item, sourceLabel, confidenceLabel),
      indicators: this.buildIndicators(item, provinceLabel, sectorLabel, sourceLabel),
      relatedAlerts: this.buildRelatedAlerts(item, provinceLabel),
      relatedOpportunities: this.buildRelatedOpportunities(item),
      updatedAtIso: item.updatedAt ?? item.createdAt,
    };
  }

  private buildSummaryPoints(
    item: FeedItem,
    routeLabel: string,
    sourceLabel: string
  ): readonly string[] {
    const points = this.toSentenceArray(item.accessibilitySummary).slice(0, 2);
    points.push(
      this.translate.instant('feed.alert.detail.summaryPointSource', {
        source: sourceLabel,
      })
    );

    if (item.fromProvinceId || item.toProvinceId) {
      points.push(
        this.translate.instant('feed.alert.detail.summaryPointRoute', {
          route: routeLabel,
        })
      );
    }

    const tagList = this.formatTagList(item.tags);
    if (tagList) {
      points.push(
        this.translate.instant('feed.alert.detail.summaryPointTags', {
          tags: tagList,
        })
      );
    }

    return this.uniqueStrings(points).slice(0, 3);
  }

  private buildImpactPoints(
    severityLabel: string,
    confidenceLabel: string,
    windowLabel: string
  ): readonly string[] {
    return [
      this.translate.instant('feed.alert.detail.impactSeverity', {
        severity: severityLabel,
      }),
      this.translate.instant('feed.alert.detail.impactConfidence', {
        confidence: confidenceLabel,
      }),
      this.translate.instant('feed.alert.detail.impactWindow', {
        window: windowLabel,
      }),
    ];
  }

  private buildZones(
    item: FeedItem,
    provinceLabel: string,
    routeLabel: string
  ): readonly string[] {
    const zones = new Set<string>();
    const from = this.resolveProvinceLabel(item.fromProvinceId);
    const to = this.resolveProvinceLabel(item.toProvinceId);

    if (from && to) {
      zones.add(routeLabel);
    }
    if (to) {
      zones.add(to);
    }
    if (from) {
      zones.add(from);
    }
    zones.add(provinceLabel);

    return Array.from(zones).slice(0, 3);
  }

  private buildInfrastructurePoints(sourceLabel: string, sectorLabel: string): readonly string[] {
    return [
      this.translate.instant('feed.alert.detail.infrastructureSector', {
        sector: sectorLabel,
      }),
      this.translate.instant('feed.alert.detail.infrastructureSource', {
        source: sourceLabel,
      }),
    ];
  }

  private buildTimeline(item: FeedItem, windowLabel: string): AlertDetailVm['timeline'] {
    return [
      {
        id: `${item.id}-timeline-reported`,
        label: this.translate.instant('feed.alert.detail.timeline.reported'),
        value: this.formatDateTime(item.createdAt),
      },
      {
        id: `${item.id}-timeline-confirmed`,
        label: this.translate.instant('feed.alert.detail.timeline.confirmed'),
        value: this.formatDateTime(item.updatedAt ?? item.createdAt),
      },
      {
        id: `${item.id}-timeline-monitoring`,
        label: this.translate.instant('feed.alert.detail.timeline.monitoring'),
        value: this.translate.instant('feed.alert.detail.timeline.monitoringValue', {
          window: windowLabel,
        }),
      },
    ];
  }

  private buildUpdates(item: FeedItem, sourceLabel: string): AlertDetailVm['updates'] {
    const updates = [
      {
        id: `${item.id}-update-latest`,
        title: item.summary,
        when: this.relativeTime(item.updatedAt ?? item.createdAt),
      },
    ];

    const accessibility = this.toSentenceArray(item.accessibilitySummary)[0];
    if (accessibility) {
      updates.push({
        id: `${item.id}-update-accessibility`,
        title: accessibility,
        when: this.relativeTime(item.createdAt),
      });
    } else {
      updates.push({
        id: `${item.id}-update-source`,
        title: this.translate.instant('feed.alert.detail.updateReportedBy', {
          source: sourceLabel,
        }),
        when: this.relativeTime(item.createdAt),
      });
    }

    return updates;
  }

  private buildRecommendations(routeLabel: string, sourceLabel: string): readonly string[] {
    return [
      this.translate.instant('feed.alert.detail.recoVerifySource', {
        source: sourceLabel,
      }),
      this.translate.instant('feed.alert.detail.recoTrackUpdates'),
      this.translate.instant('feed.alert.detail.recoAssessRoute', {
        route: routeLabel,
      }),
    ];
  }

  private buildSources(
    item: FeedItem,
    sourceLabel: string,
    confidenceLabel: string
  ): AlertDetailVm['sources'] {
    return [
      {
        id: `${item.id}-source-primary`,
        label: sourceLabel,
        href: item.source.url?.trim() || null,
        confidence: confidenceLabel,
      },
    ];
  }

  private buildIndicators(
    item: FeedItem,
    provinceLabel: string,
    sectorLabel: string,
    sourceLabel: string
  ): AlertDetailVm['indicators'] {
    return [
      {
        id: `${item.id}-indicator-severity`,
        label: this.translate.instant('feed.alert.detail.indicatorSeverity'),
        context: provinceLabel,
        value: this.resolveSeverity(item.urgency ?? null),
        trend: this.resolveTrend(item.urgency ?? null),
      },
      {
        id: `${item.id}-indicator-confidence`,
        label: this.translate.instant('feed.alert.detail.indicatorConfidence'),
        context: sectorLabel,
        value: this.resolveConfidence(item.credibility ?? null),
        trend: this.resolveTrend(item.credibility ?? null),
      },
      {
        id: `${item.id}-indicator-recency`,
        label: this.translate.instant('feed.alert.detail.indicatorRecency'),
        context: sourceLabel,
        value: this.relativeTime(item.updatedAt ?? item.createdAt),
        trend: 'steady',
      },
    ];
  }

  private buildRelatedAlerts(item: FeedItem, provinceLabel: string): readonly AlertRelatedAlertEntry[] {
    return this.rankRelatedEntries(
      item,
      this.feed.items().filter(entry => entry.type === 'ALERT' && entry.id !== item.id)
    )
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
  }

  private buildRelatedOpportunities(item: FeedItem): readonly AlertRelatedOpportunityEntry[] {
    return this.rankRelatedEntries(
      item,
      this.feed.items().filter(
        entry =>
          entry.id !== item.id &&
          (entry.type === 'REQUEST' ||
            entry.type === 'OFFER' ||
            entry.type === 'CAPACITY' ||
            entry.type === 'TENDER')
      )
    )
      .slice(0, 2)
      .map(entry => ({
        id: entry.id,
        title: entry.title,
        routeLabel: this.composeRouteLabel(entry),
      }));
  }

  private rankRelatedEntries(source: FeedItem, candidates: readonly FeedItem[]): readonly FeedItem[] {
    return candidates
      .map(candidate => ({
        candidate,
        score: this.computeRelatedScore(source, candidate),
      }))
      .filter(entry => entry.score >= 5)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        const rightTimestamp = this.getComparableTimestamp(right.candidate);
        const leftTimestamp = this.getComparableTimestamp(left.candidate);
        if (rightTimestamp !== leftTimestamp) {
          return rightTimestamp - leftTimestamp;
        }
        return left.candidate.title.localeCompare(right.candidate.title);
      })
      .map(entry => entry.candidate);
  }

  private computeRelatedScore(source: FeedItem, candidate: FeedItem): number {
    let score = 0;

    if (candidate.originType === 'alert' && candidate.originId === source.id) {
      score += 40;
    }

    if (source.sectorId && candidate.sectorId && source.sectorId === candidate.sectorId) {
      score += 10;
    }

    const sourceProvinceIds = this.collectComparableIds(source.fromProvinceId, source.toProvinceId);
    const candidateProvinceIds = this.collectComparableIds(
      candidate.fromProvinceId,
      candidate.toProvinceId
    );
    const sharedProvinceCount = Array.from(sourceProvinceIds).filter(provinceId =>
      candidateProvinceIds.has(provinceId)
    ).length;
    score += sharedProvinceCount * 5;

    if (
      source.fromProvinceId &&
      source.toProvinceId &&
      candidate.fromProvinceId === source.fromProvinceId &&
      candidate.toProvinceId === source.toProvinceId
    ) {
      score += 6;
    } else if (
      source.fromProvinceId &&
      source.toProvinceId &&
      candidate.fromProvinceId === source.toProvinceId &&
      candidate.toProvinceId === source.fromProvinceId
    ) {
      score += 5;
    }

    if (candidate.source.kind === source.source.kind) {
      score += 2;
    }

    const sourceLabel = this.normalizeComparableString(source.source.label);
    const candidateLabel = this.normalizeComparableString(candidate.source.label);
    if (sourceLabel && candidateLabel && sourceLabel === candidateLabel) {
      score += 5;
    }

    score += Math.min(this.countSharedTags(source.tags, candidate.tags), 3) * 2;

    return score;
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
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized.length ? normalized : null;
  }

  private collectComparableIds(...values: readonly (string | null | undefined)[]): Set<string> {
    const ids = new Set<string>();
    for (const value of values) {
      const normalized = this.normalizeComparableString(value);
      if (normalized) {
        ids.add(normalized);
      }
    }
    return ids;
  }

  private countSharedTags(
    left: readonly string[] | null | undefined,
    right: readonly string[] | null | undefined
  ): number {
    const leftTags = new Set((left ?? []).map(tag => this.toKebabTag(tag)).filter(Boolean));
    const rightTags = new Set((right ?? []).map(tag => this.toKebabTag(tag)).filter(Boolean));
    let shared = 0;
    for (const tag of leftTags) {
      if (rightTags.has(tag)) {
        shared += 1;
      }
    }
    return shared;
  }

  private normalizeComparableString(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return normalized.length ? normalized : null;
  }

  private getComparableTimestamp(item: FeedItem): number {
    const timestamp = Date.parse(item.updatedAt ?? item.createdAt);
    return Number.isFinite(timestamp) ? timestamp : 0;
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
    const mapped = this.sectorNameMap().get(id);
    if (mapped) {
      return mapped;
    }
    const translated = this.translate.instant(`sectors.${id}`);
    return translated !== `sectors.${id}` ? translated : id;
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

  private resolveTrend(level: 1 | 2 | 3 | null): 'up' | 'down' | 'steady' {
    if (level === 3) {
      return 'up';
    }
    if (level === 1) {
      return 'down';
    }
    return 'steady';
  }

  private relativeTime(value: string): string {
    this.activeLanguage();
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

  private formatDateTime(value: string): string {
    this.activeLanguage();
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) {
      return this.translate.instant('feed.alert.detail.justNow');
    }

    const locale = this.activeLanguage().toLowerCase().startsWith('fr') ? 'fr-CA' : 'en-CA';
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(timestamp);
  }

  private toSentenceArray(value: string | null | undefined): string[] {
    if (typeof value !== 'string') {
      return [];
    }

    return value
      .split(/[.!?]\s+/)
      .map(entry => entry.trim().replace(/[.!?]+$/g, ''))
      .filter(Boolean);
  }

  private formatTagList(tags: readonly string[] | null | undefined): string | null {
    const normalized = (tags ?? [])
      .map(tag => tag.trim().replace(/[-_]+/g, ' '))
      .filter(Boolean);

    if (!normalized.length) {
      return null;
    }

    return normalized.slice(0, 3).join(', ');
  }

  private uniqueStrings(values: readonly string[]): string[] {
    return Array.from(new Set(values.filter(value => value.trim().length > 0)));
  }

  private currentUrl(): string {
    if (typeof window !== 'undefined' && window.location?.href) {
      return window.location.href;
    }
    const id = this.itemId() ?? 'unknown';
    return `/feed/alerts/${id}`;
  }

  private buildSubscriptionAlertPayload(detail: AlertDetailVm) {
    const generatedTitlePrefix = this.translate.instant(
      'feed.alert.detail.subscription.generatedTitlePrefix'
    );

    return {
      title: `${generatedTitlePrefix}: ${detail.title}`.slice(0, 140),
      message: this.translate.instant('feed.alert.detail.subscription.generatedMessage', {
        title: detail.title,
      }),
      severity: 'info' as const,
      sourceType: FEED_ALERT_SUBSCRIPTION_SOURCE_TYPE,
      sourceId: detail.item.id,
      metadata: {
        kind: FEED_ALERT_SUBSCRIPTION_SOURCE_TYPE,
        route: this.currentInternalUrl(),
        alertId: detail.item.id,
        alertTitle: detail.title,
      },
    };
  }

  private redirectToLogin(): void {
    void this.router.navigate(['/login'], {
      queryParams: { redirect: this.currentInternalUrl() },
    });
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
      this.reportDrawerMode.set('compose');
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

  private resolveErrorKind(error: unknown): 'notFound' | 'unavailable' {
    if (error instanceof HttpErrorResponse && error.status === 404) {
      return 'notFound';
    }
    return 'unavailable';
  }
}
