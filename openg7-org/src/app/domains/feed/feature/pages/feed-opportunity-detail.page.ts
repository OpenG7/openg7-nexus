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
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { FavoritesService } from '@app/core/favorites.service';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import {
  OpportunityOfferRecord,
  OpportunityOffersService,
} from '@app/core/opportunity-offers.service';
import { selectProvinces, selectSectors } from '@app/state/catalog/catalog.selectors';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';

import { OpportunityContextAsideComponent } from '../components/opportunity-context-aside.component';
import { OpportunityDetailBodyComponent } from '../components/opportunity-detail-body.component';
import { OpportunityDetailHeaderComponent } from '../components/opportunity-detail-header.component';
import {
  OpportunityAlertItem,
  OpportunityDetailVm,
  OpportunityOfferPayload,
  OpportunityOfferSubmitState,
  OpportunityQnaMessage,
  OpportunityQnaTab,
  OpportunityReportDrawerMode,
  OpportunityReportPayload,
  OpportunityReportSubmitState,
  OpportunitySyncState,
} from '../components/opportunity-detail.models';
import { OpportunityOfferDrawerComponent } from '../components/opportunity-offer-drawer.component';
import { OpportunityReportDrawerComponent } from '../components/opportunity-report-drawer.component';
import {
  buildOpportunityOfferDraft,
  buildOpportunityOfferRecordPayload,
  resolveOpportunityOfferSubmitErrorMessage,
} from '../feed-offer-submission.helpers';
import { resolveFeedConnectionMatchId } from '../feed-item.helpers';
import { FeedItem } from '../models/feed.models';
import { FeedRealtimeService } from '../services/feed-realtime.service';
import { OpportunityConversationDraftsService } from '../services/opportunity-conversation-drafts.service';
import { OpportunityReportQueueService } from '../services/opportunity-report-queue.service';

@Component({
  selector: 'og7-feed-opportunity-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    OpportunityDetailHeaderComponent,
    OpportunityDetailBodyComponent,
    OpportunityContextAsideComponent,
    OpportunityOfferDrawerComponent,
    OpportunityReportDrawerComponent,
  ],
  templateUrl: './feed-opportunity-detail.page.html',
  styleUrl: './feed-opportunity-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedOpportunityDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly favorites = inject(FavoritesService);
  private readonly notifications = injectNotificationStore();
  private readonly opportunityOffers = inject(OpportunityOffersService);
  private readonly feed = inject(FeedRealtimeService);
  private readonly conversationDrafts = inject(OpportunityConversationDraftsService);
  private readonly reportQueue = inject(OpportunityReportQueueService);
  private readonly store = inject(Store);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly itemId = toSignal(this.route.paramMap.pipe(map(params => params.get('itemId'))), {
    initialValue: this.route.snapshot.paramMap.get('itemId'),
  });

  private readonly syncTimers: ReturnType<typeof setTimeout>[] = [];
  private readonly detailItem = signal<FeedItem | null>(null);
  private readonly detailLoading = signal(false);
  private readonly detailError = signal<string | null>(null);
  private pendingOfferPayload: OpportunityOfferPayload | null = null;
  private offerStatusTimer: ReturnType<typeof setTimeout> | null = null;
  private reportStatusTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly loading = computed(() => this.detailLoading() || this.feed.loading());
  protected readonly error = computed(() => this.detailError() ?? this.feed.error());

  protected readonly headerCompact = signal(false);
  protected readonly offerDrawerOpen = signal(false);
  protected readonly reportDrawerOpen = signal(false);
  protected readonly reportDrawerMode = signal<OpportunityReportDrawerMode>('compose');
  protected readonly offerSubmitState = signal<OpportunityOfferSubmitState>('idle');
  protected readonly offerSubmitError = signal<string | null>(null);
  protected readonly reportSubmitState = signal<OpportunityReportSubmitState>('idle');
  protected readonly reportSubmitError = signal<string | null>(null);
  protected readonly qnaTab = signal<OpportunityQnaTab>('questions');
  protected readonly syncState = signal<OpportunitySyncState>('synced');

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

  protected readonly favoriteKey = computed(() => {
    const item = this.selectedItem();
    if (!item?.id) {
      return null;
    }
    return `opportunity:${item.id}`;
  });

  protected readonly saved = computed(() => {
    const key = this.favoriteKey();
    return key ? this.favorites.list().includes(key) : false;
  });

  protected readonly detailVm = computed(() => {
    const item = this.selectedItem();
    if (!item) {
      return null;
    }
    return this.buildDetailVm(item);
  });

  protected readonly qnaMessages = computed(() => {
    const detail = this.detailVm();
    const itemId = detail?.item.id ?? this.itemId();
    const localMessages = this.conversationDrafts.messagesFor(itemId);
    const offerMessages = this.opportunityOffers
      .entriesForOpportunity(itemId)
      .map((entry) => this.toOfferMessage(entry));
    if (!detail) {
      return [...offerMessages, ...localMessages];
    }
    return [...offerMessages, ...detail.qnaMessages, ...localMessages];
  });
  protected readonly existingSubmittedOffer = computed(() => {
    const detail = this.detailVm();
    const itemId = detail?.item.id ?? this.itemId();
    return this.opportunityOffers
      .entriesForOpportunity(itemId)
      .find((entry) => entry.status === 'submitted') ?? null;
  });
  protected readonly hasExistingSubmittedOffer = computed(() => this.existingSubmittedOffer() !== null);
  protected readonly pendingReport = computed(() => {
    const detail = this.detailVm();
    if (!detail) {
      return null;
    }
    return this.reportQueue.latestPendingForOpportunity(detail.item.id);
  });
  protected readonly hasPendingReport = computed(() => Boolean(this.pendingReport()));

  protected readonly isConnected = computed(() => this.feed.connectionState.connected());
  protected readonly offerRetryEnabled = computed(() => {
    if (!this.pendingOfferPayload) {
      return false;
    }
    const state = this.offerSubmitState();
    if (state === 'error') {
      return true;
    }
    return state === 'offline' && this.isConnected();
  });

  protected readonly lastUpdatedLabel = computed(() => {
    const detail = this.detailVm();
    if (!detail) {
      return this.translate.instant('feed.opportunity.detail.justNow');
    }
    return this.relativeTime(detail.updatedAtIso);
  });

  protected readonly ownerMode = computed(() => this.detailVm()?.item.source.kind === 'USER');

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
      if (this.auth.isAuthenticated()) {
        this.favorites.refresh();
      }
    });

    effect(() => {
      this.itemId();
      this.qnaTab.set('questions');
      this.offerDrawerOpen.set(false);
      this.reportDrawerOpen.set(false);
      this.reportDrawerMode.set('compose');
      this.resetOfferSubmitState();
      this.resetReportSubmitState();
    });

    effect(() => {
      if (!this.isConnected()) {
        this.syncState.set('offline');
        return;
      }
      if (this.syncState() === 'offline') {
        this.syncState.set('synced');
      }
    });

    this.destroyRef.onDestroy(() => {
      this.clearSyncTimers();
      this.clearOfferStatusTimer();
      this.clearReportStatusTimer();
    });
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.headerCompact.set(window.scrollY > 56);
  }

  @HostListener('document:keydown', ['$event'])
  protected onShortcuts(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const key = event.key.toLowerCase();
    const target = event.target;
    const editing =
      target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

    if (key === 'escape' && this.offerDrawerOpen()) {
      event.preventDefault();
      this.closeOfferDrawer();
      return;
    }

    if (editing) {
      return;
    }

    if (key === 's') {
      event.preventDefault();
      this.handleSaveToggle();
    }
  }

  protected openOfferDrawer(): void {
    if (!this.auth.isAuthenticated()) {
      this.redirectToLogin();
      return;
    }

    const existingOffer = this.existingSubmittedOffer();
    if (existingOffer) {
      this.openExistingOffer(existingOffer);
      return;
    }

    const connectionMatchId = resolveFeedConnectionMatchId(this.detailVm()?.item);
    if (connectionMatchId) {
      void this.openLinkup(connectionMatchId);
      return;
    }

    this.resetOfferSubmitState();
    this.offerDrawerOpen.set(true);
  }

  protected closeOfferDrawer(): void {
    this.offerDrawerOpen.set(false);
    this.resetOfferSubmitState();
  }

  protected closeReportDrawer(): void {
    this.reportDrawerOpen.set(false);
    this.reportDrawerMode.set('compose');
    this.resetReportSubmitState();
  }

  protected handleSaveToggle(): void {
    const key = this.favoriteKey();
    if (!key) {
      return;
    }
    if (this.saved()) {
      this.favorites.remove(key);
    } else {
      this.favorites.add(key);
    }
    this.simulateSync();
  }

  protected async handleShare(): Promise<void> {
    const detail = this.detailVm();
    const url = this.getShareUrl();
    if (!detail) {
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: detail.title, text: detail.summaryHeadline, url });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // Intentionally ignored: user cancellation is not an error state.
    }
  }

  protected handleTagFilter(tag: string): void {
    const normalized = tag.trim().toLowerCase();
    const detail = this.detailVm();
    const queryParams: Params = {};

    if (normalized.includes('import')) {
      queryParams['mode'] = 'IMPORT';
    }

    if (normalized.includes('export')) {
      queryParams['mode'] = 'EXPORT';
    }

    const sectorLabel = detail?.item.sectorId
      ? this.resolveSectorLabel(detail.item.sectorId)?.trim().toLowerCase() ?? null
      : null;
    if (detail?.item.sectorId && sectorLabel && normalized === sectorLabel) {
      queryParams['sector'] = detail.item.sectorId;
    }

    if (normalized.includes('winter') || normalized.includes('hiver')) {
      queryParams['q'] = 'winter';
    }

    if (!queryParams['q'] && !queryParams['sector'] && !queryParams['mode']) {
      queryParams['q'] = normalized;
    }

    void this.router.navigate(['/feed'], {
      queryParams,
    });
  }

  protected handleReport(): void {
    this.resetReportSubmitState();
    this.reportDrawerMode.set(this.pendingReport() ? 'view' : 'compose');
    this.reportDrawerOpen.set(true);
  }

  protected handleReportAnother(): void {
    this.resetReportSubmitState();
    this.reportDrawerMode.set('compose');
    this.reportDrawerOpen.set(true);
  }

  protected handleDuplicate(): void {
    this.simulateSync();
  }

  protected handleArchive(): void {
    this.syncState.set('saved-local');
  }

  protected openAlerts(): void {
    const queryParams: Params = {
      ...this.route.snapshot.queryParams,
      type: 'ALERT',
    };

    void this.router.navigate(['/feed'], {
      queryParams,
    });
  }

  protected openRelatedAlert(alertId: string): void {
    void this.router.navigate(['/feed', 'alerts', alertId]);
  }

  protected handleOfferSubmitted(payload: OpportunityOfferPayload): void {
    this.pendingOfferPayload = payload;
    void this.submitOfferPayload(payload);
  }

  protected handleReportSubmitted(payload: OpportunityReportPayload): void {
    const detail = this.detailVm();
    if (!detail) {
      return;
    }

    try {
      const record = this.reportQueue.queueReport({
        itemId: detail.item.id,
        itemTitle: detail.title,
        route: this.currentInternalUrl(),
        payload,
      });

      this.reportSubmitState.set('success');
      this.reportSubmitError.set(null);
      this.syncState.set('saved-local');
      this.notifications.success(this.translate.instant('feed.opportunity.detail.report.status.success'), {
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

  protected handleOfferRetryRequested(): void {
    if (!this.pendingOfferPayload) {
      return;
    }
    void this.submitOfferPayload(this.pendingOfferPayload);
  }

  protected handleQnaSubmit(content: string): void {
    const itemId = this.itemId();
    if (!itemId) {
      return;
    }
    const tab = this.qnaTab();
    this.conversationDrafts.append(itemId, {
      id: `qna-${Date.now()}`,
      tab,
      author: this.translate.instant('feed.sourceYou'),
      content,
      createdAt: this.translate.instant('feed.opportunity.detail.justNow'),
    });
    this.simulateSync();
  }

  protected setQnaTab(tab: OpportunityQnaTab): void {
    this.qnaTab.set(tab);
  }

  private openExistingOffer(offer: OpportunityOfferRecord): void {
    this.notifications.info(
      this.translate.instant('feed.opportunity.detail.offer.status.existingOfferRedirect', {
        reference: offer.reference,
      }),
      {
        source: 'feed',
        metadata: {
          itemId: offer.opportunityId,
          offerId: offer.id,
          offerReference: offer.reference,
          route: 'alerts',
        },
      }
    );
    void this.router.navigate(['/alerts'], {
      queryParams: {
        section: 'offers',
        offerId: offer.id,
      },
    });
  }

  private openLinkup(matchId: number): Promise<boolean> {
    const itemId = this.detailVm()?.item.id ?? this.itemId();
    return this.router.navigate(['/linkup', matchId], {
      queryParams: {
        source: 'feed',
        ...(itemId ? { feedItemId: itemId } : {}),
      },
    });
  }

  private async submitOfferPayload(payload: OpportunityOfferPayload): Promise<void> {
    const detail = this.detailVm();
    if (!detail || this.offerSubmitState() === 'submitting') {
      return;
    }

    if (!this.auth.isAuthenticated()) {
      this.redirectToLogin();
      return;
    }

    this.offerSubmitError.set(null);

    if (!this.isConnected()) {
      this.offerSubmitState.set('offline');
      this.offerSubmitError.set(this.translate.instant('feed.error.offline'));
      this.syncState.set('offline');
      return;
    }

    this.offerSubmitState.set('submitting');
    const outcome = await this.feed.publishDraft(
      buildOpportunityOfferDraft(
        {
          title: detail.title,
          sectorId: detail.item.sectorId,
          fromProvinceId: detail.item.fromProvinceId,
          toProvinceId: detail.item.toProvinceId,
          mode: detail.item.mode,
          tags: detail.item.tags,
        },
        payload,
        this.sectors()[0]?.id ?? null,
        this.translate
      )
    );
    const errorMessage = resolveOpportunityOfferSubmitErrorMessage(outcome, this.translate);

    if (errorMessage) {
      this.offerSubmitState.set('error');
      this.offerSubmitError.set(errorMessage);
      this.notifications.error(errorMessage, {
        source: 'feed',
        metadata: {
          action: 'create-opportunity-offer',
          itemId: detail.item.id,
        },
      });
      return;
    }

    const record = this.opportunityOffers.create(
      buildOpportunityOfferRecordPayload(
        {
          id: detail.item.id,
          title: detail.title,
          sectorId: detail.item.sectorId,
          fromProvinceId: detail.item.fromProvinceId,
          toProvinceId: detail.item.toProvinceId,
          mode: detail.item.mode,
          tags: detail.item.tags,
          source: detail.item.source,
        },
        this.currentInternalUrl(),
        payload
      )
    );
    this.qnaTab.set('offers');
    this.offerSubmitState.set('success');
    this.offerSubmitError.set(null);
    this.pendingOfferPayload = null;
    this.simulateSync();
    this.notifications.success(
      this.translate.instant('feed.opportunity.detail.offer.status.successReference', {
        reference: record.reference,
      }),
      {
        source: 'feed',
        metadata: {
          action: 'create-opportunity-offer',
          itemId: detail.item.id,
          offerId: record.id,
          offerReference: record.reference,
        },
      }
    );
    this.closeOfferDrawerAfterSuccess();
  }

  private buildOfferMessage(offer: OpportunityOfferRecord): string {
    const segments = [
      offer.reference,
      `${offer.capacityMw} MW`,
      offer.pricingModel,
      `${offer.startDate} -> ${offer.endDate}`,
    ];
    if (offer.attachmentName) {
      segments.push(offer.attachmentName);
    }
    return segments.join(' | ');
  }

  private toOfferMessage(offer: OpportunityOfferRecord): OpportunityQnaMessage {
    return {
      id: `offer-record-${offer.id}`,
      tab: 'offers',
      author: offer.senderLabel,
      content: this.buildOfferMessage(offer),
      createdAt: this.relativeTime(offer.createdAt),
    };
  }

  private closeOfferDrawerAfterSuccess(): void {
    this.clearOfferStatusTimer();
    this.offerStatusTimer = setTimeout(() => {
      this.offerDrawerOpen.set(false);
      this.offerSubmitState.set('idle');
    }, 750);
  }

  private closeReportDrawerAfterSuccess(): void {
    this.clearReportStatusTimer();
    this.reportStatusTimer = setTimeout(() => {
      this.reportDrawerOpen.set(false);
      this.reportDrawerMode.set('compose');
      this.reportSubmitState.set('idle');
    }, 750);
  }

  private resetOfferSubmitState(): void {
    this.clearOfferStatusTimer();
    this.pendingOfferPayload = null;
    this.offerSubmitState.set('idle');
    this.offerSubmitError.set(null);
  }

  private resetReportSubmitState(): void {
    this.clearReportStatusTimer();
    this.reportSubmitState.set('idle');
    this.reportSubmitError.set(null);
  }

  private clearOfferStatusTimer(): void {
    if (!this.offerStatusTimer) {
      return;
    }
    clearTimeout(this.offerStatusTimer);
    this.offerStatusTimer = null;
  }

  private clearReportStatusTimer(): void {
    if (!this.reportStatusTimer) {
      return;
    }
    clearTimeout(this.reportStatusTimer);
    this.reportStatusTimer = null;
  }

  private buildDetailVm(item: FeedItem): OpportunityDetailVm {
    const fromLabel = this.resolveProvinceLabel(item.fromProvinceId) ?? 'Quebec';
    const toLabel = this.resolveProvinceLabel(item.toProvinceId) ?? 'Ontario';
    const sectorLabel = this.resolveSectorLabel(item.sectorId) ?? this.translate.instant('feed.opportunity.detail.energy');
    const routeLabel = `${fromLabel} -> ${toLabel}`;
    const capacityMw =
      item.quantity && item.quantity.unit === 'MW' && Number.isFinite(item.quantity.value)
        ? Math.round(item.quantity.value)
        : 300;

    const visibilityLabel = item.source.kind === 'PARTNER'
      ? this.translate.instant('feed.opportunity.detail.visibilityNetwork')
      : this.translate.instant('feed.opportunity.detail.visibilityPublic');

    const urgencyLabel =
      (item.urgency ?? 0) >= 3
        ? this.translate.instant('feed.opportunity.detail.urgencyWinterPeak')
        : null;

    const tags = this.buildTags(item, sectorLabel);

    const docs = [
      {
        id: 'doc-term-sheet',
        label: this.translate.instant('feed.opportunity.detail.doc.termSheet'),
        href: 'https://www.ieso.ca',
        kind: 'pdf' as const,
      },
      {
        id: 'doc-operator-link',
        label: this.translate.instant('feed.opportunity.detail.doc.operator'),
        href: 'https://www.hydroquebec.com',
        kind: 'link' as const,
      },
      {
        id: 'doc-connection',
        label: this.translate.instant('feed.opportunity.detail.doc.connectionDiagram'),
        href: 'https://www.hydroone.com',
        kind: 'pdf' as const,
      },
    ];

    const messages: OpportunityQnaMessage[] = [
      {
        id: `${item.id}-q1`,
        tab: 'questions',
        author: 'Grid Ops',
        content: this.translate.instant('feed.opportunity.detail.demo.question1'),
        createdAt: '2m',
      },
      {
        id: `${item.id}-q2`,
        tab: 'offers',
        author: 'NorthWind Energy',
        content: this.translate.instant('feed.opportunity.detail.demo.offer1'),
        createdAt: '5m',
      },
      {
        id: `${item.id}-q3`,
        tab: 'history',
        author: 'OpenG7 Bot',
        content: this.translate.instant('feed.opportunity.detail.demo.history1'),
        createdAt: '10m',
      },
    ];

    const alerts: OpportunityAlertItem[] = [
      {
        id: 'alert-001',
        title: this.translate.instant('feed.opportunity.detail.demo.alertIceStormTitle'),
        detail: this.translate.instant('feed.opportunity.detail.demo.alertIceStormDetail'),
        severity: 'warning',
      },
      {
        id: 'alert-002',
        title: this.translate.instant('feed.opportunity.detail.demo.alertSmokeTitle'),
        detail: this.translate.instant('feed.opportunity.detail.demo.alertSmokeDetail'),
        severity: 'info',
      },
    ];

    return {
      item,
      title: item.title,
      routeLabel,
      subtitle: `${sectorLabel} | ${this.translate.instant('feed.mode.import')} | ${this.translate.instant('feed.opportunity.detail.shortWindow')}`,
      statusLabel: this.translate.instant('feed.opportunity.detail.statusOpen'),
      urgencyLabel,
      visibilityLabel,
      tags,
      summaryHeadline: item.summary,
      periodLabel: this.translate.instant('feed.opportunity.detail.demo.period'),
      deliveryPoint: this.translate.instant('feed.opportunity.detail.demo.deliveryPoint'),
      pricingType: this.translate.instant('feed.opportunity.detail.demo.pricingType'),
      specs: [
        {
          labelKey: 'feed.opportunity.detail.spec.capacity',
          value: `${capacityMw} MW`,
        },
        {
          labelKey: 'feed.opportunity.detail.spec.duration',
          value: this.translate.instant('feed.opportunity.detail.demo.duration'),
        },
        {
          labelKey: 'feed.opportunity.detail.spec.ramp',
          value: this.translate.instant('feed.opportunity.detail.demo.ramp'),
        },
        {
          labelKey: 'feed.opportunity.detail.spec.reliability',
          value: this.translate.instant('feed.opportunity.detail.demo.reliability'),
        },
        {
          labelKey: 'feed.opportunity.detail.spec.energy',
          value: this.translate.instant('feed.opportunity.detail.demo.energyMix'),
        },
        {
          labelKey: 'feed.opportunity.detail.spec.constraints',
          value: this.translate.instant('feed.opportunity.detail.demo.constraints'),
        },
      ],
      terms: [
        {
          labelKey: 'feed.opportunity.detail.term.contract',
          value: this.translate.instant('feed.opportunity.detail.demo.contract'),
        },
        {
          labelKey: 'feed.opportunity.detail.term.currency',
          value: 'CAD',
        },
        {
          labelKey: 'feed.opportunity.detail.term.conditions',
          value: this.translate.instant('feed.opportunity.detail.demo.conditions'),
        },
      ],
      documents: docs,
      qnaMessages: messages,
      capacityMw,
      updatedAtIso: item.updatedAt ?? item.createdAt,
      fromLabel,
      toLabel,
      indicators: [
        {
          id: `${item.id}-i1`,
          label: this.translate.instant('feed.opportunity.detail.demo.indicatorSpotPrice'),
          context: 'Ontario',
          delta: '+12%',
          trend: 'up',
        },
        {
          id: `${item.id}-i2`,
          label: this.translate.instant('feed.opportunity.detail.demo.indicatorReserveMargin'),
          context: 'ON reserve',
          delta: '6%',
          trend: 'steady',
        },
        {
          id: `${item.id}-i3`,
          label: this.translate.instant('feed.opportunity.detail.demo.indicatorCongestion'),
          context: 'Outaouais',
          delta: '~70%',
          trend: 'down',
        },
      ],
      alerts,
    };
  }

  private buildTags(item: FeedItem, sectorLabel: string): readonly string[] {
    const tags = new Set<string>();
    tags.add(sectorLabel);
    tags.add(item.mode === 'EXPORT' ? 'Export' : 'Import');
    tags.add('Winter');
    for (const tag of item.tags ?? []) {
      if (tag && tag.trim().length) {
        tags.add(this.toTitleCase(tag.trim()));
      }
    }
    return Array.from(tags).slice(0, 5);
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

  private relativeTime(value: string): string {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) {
      return this.translate.instant('feed.opportunity.detail.justNow');
    }

    const diffMs = Date.now() - timestamp;
    if (diffMs <= 30 * 1000) {
      return this.translate.instant('feed.opportunity.detail.justNow');
    }

    const minutes = Math.round(diffMs / 60000);
    if (minutes < 60) {
      return this.translate.instant('feed.opportunity.detail.minutesAgo', { count: minutes });
    }

    const hours = Math.round(minutes / 60);
    return this.translate.instant('feed.opportunity.detail.hoursAgo', { count: hours });
  }

  private toTitleCase(value: string): string {
    return value
      .split(/\s+/)
      .map(part => part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private simulateSync(): void {
    this.clearSyncTimers();

    if (!this.isConnected()) {
      this.syncState.set('offline');
      return;
    }

    this.syncState.set('saved-local');
    this.syncTimers.push(
      setTimeout(() => this.syncState.set('syncing'), 260),
      setTimeout(() => this.syncState.set('synced'), 950)
    );
  }

  private clearSyncTimers(): void {
    while (this.syncTimers.length) {
      const timer = this.syncTimers.pop();
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  private getShareUrl(): string {
    if (typeof window !== 'undefined' && window.location?.href) {
      return window.location.href;
    }
    const id = this.itemId() ?? 'unknown';
    return `/feed/opportunities/${id}`;
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
    return `/feed/opportunities/${id}`;
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
