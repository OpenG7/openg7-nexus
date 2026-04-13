import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { resolveCorridorContext } from '@app/core/config/corridor-context';
import { FavoritesService } from '@app/core/favorites.service';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import { OpportunityOffersService } from '@app/core/opportunity-offers.service';
import {
  feedCategorySig,
  feedFormKeySig,
  feedModeSig,
  feedSearchSig,
  feedSortSig,
  feedTypeSig,
  fromProvinceIdSig,
  sectorIdSig,
  toProvinceIdSig,
} from '@app/state/shared-feed-signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { HydrocarbonSignalsPanelComponent } from './components/hydrocarbon-signals-panel.component';
import { OpportunityOfferPayload, OpportunityOfferSubmitState } from './components/opportunity-detail.models';
import { OpportunityOfferDrawerComponent } from './components/opportunity-offer-drawer.component';
import { buildFeedFavoriteKey, isFeedOpportunityType } from './feed-item.helpers';
import {
  buildOpportunityOfferDraft,
  buildOpportunityOfferRecordPayload,
  resolveOpportunityOfferSubmitErrorMessage,
} from './feed-offer-submission.helpers';
import { FeedPublishSectionComponent } from './feed-publish-section/feed-publish-section.component';
import { parseFeedFilters } from './feed-route-filters';
import { FeedFilterState, FeedItem } from './models/feed.models';
import { Og7FeedStreamComponent } from './og7-feed-stream/og7-feed-stream.component';
import { FeedRealtimeService } from './services/feed-realtime.service';
import { OpportunityEngagementService } from './services/opportunity-engagement.service';

@Component({
  selector: 'og7-feed-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FeedPublishSectionComponent,
    Og7FeedStreamComponent,
    OpportunityOfferDrawerComponent,
    HydrocarbonSignalsPanelComponent,
  ],
  templateUrl: './feed.page.html',
  styleUrls: ['./feed.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedPage {
  private readonly feed = inject(FeedRealtimeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly favorites = inject(FavoritesService);
  private readonly notifications = injectNotificationStore();
  private readonly opportunityOffers = inject(OpportunityOffersService);
  private readonly opportunityEngagement = inject(OpportunityEngagementService);
  private readonly translate = inject(TranslateService);
  private readonly publishSectionRef = viewChild<{ focusPrimaryAction?: () => void }>('publishSection');
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });
  private pendingContactPayload: OpportunityOfferPayload | null = null;
  private contactStatusTimer: ReturnType<typeof setTimeout> | null = null;

  readonly items = this.feed.items;
  readonly loading = this.feed.loading;
  readonly error = this.feed.error;
  readonly unreadCount = computed(() => this.feed.unreadCount());
  readonly connectionState = this.feed.connectionState;
  readonly savedKeys = computed(() => new Set(this.favorites.list()));
  private readonly sourceContext = computed(() => {
    return this.normalizeQueryParam(this.queryParamMap().get('source'));
  });
  readonly sourceContextKey = computed(() => {
    return this.sourceContext() === 'home-feed-panels' ? 'feed.context.homeFeedPanels' : null;
  });
  readonly corridorContext = computed(() => {
    if (this.sourceContext() !== 'corridors-realtime') {
      return null;
    }
    return resolveCorridorContext(this.normalizeQueryParam(this.queryParamMap().get('corridorId')));
  });
  readonly highlightedItemId = computed(() =>
    this.sourceContext() === 'home-feed-panels' ? this.normalizeQueryParam(this.queryParamMap().get('feedItemId')) : null
  );
  readonly pageView = computed(() => {
    const view = this.routeData()?.['feedView'];
    return view && typeof view === 'object'
      ? (view as { titleKey?: string; subtitleKey?: string; contextKey?: string })
      : null;
  });
  readonly pageTitleKey = computed(() => this.pageView()?.titleKey ?? 'feed.title');
  readonly pageSubtitleKey = computed(() => this.pageView()?.subtitleKey ?? 'feed.subtitle');
  readonly pageContextKey = computed(() => this.pageView()?.contextKey ?? null);
  readonly hydrocarbonSignalsPanel = computed(() => {
    const panel = this.routeData()?.['hydrocarbonSignalsPanel'];
    return panel && typeof panel === 'object' ? (panel as { limit?: number }) : null;
  });
  readonly hydrocarbonSignalsPanelLimit = computed(() => this.hydrocarbonSignalsPanel()?.limit ?? 3);
  readonly selectedFromProvinceId = computed(() => this.liveFilters().fromProvinceId);
  readonly selectedToProvinceId = computed(() => this.liveFilters().toProvinceId);
  private readonly liveFilters = computed<FeedFilterState>(() => ({
    fromProvinceId: fromProvinceIdSig(),
    toProvinceId: toProvinceIdSig(),
    sectorId: sectorIdSig(),
    formKey: feedFormKeySig(),
    category: feedCategorySig(),
    type: feedTypeSig(),
    mode: feedModeSig(),
    sort: feedSortSig(),
    search: feedSearchSig(),
  }));
  protected readonly shortcutsHeadingId = 'feed-shortcuts-heading';
  protected readonly contactItem = signal<FeedItem | null>(null);
  protected readonly contactDrawerOpen = signal(false);
  protected readonly contactSubmitState = signal<OpportunityOfferSubmitState>('idle');
  protected readonly contactSubmitError = signal<string | null>(null);
  protected readonly contactDrawerInitialCapacityMw = computed(() => {
    const quantity = this.contactItem()?.quantity;
    if (quantity?.unit === 'MW' && Number.isFinite(quantity.value) && quantity.value > 0) {
      return quantity.value;
    }
    return 300;
  });

  constructor() {
    effect(() => {
      if (!this.feed.hasHydrated() && !this.loading() && !this.error()) {
        this.feed.loadInitial();
      }
    });

    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.favorites.refresh();
      }
    });

    effect(() => {
      const liveFilters = normalizeFeedFilters(this.liveFilters());
      const routeFilters = normalizeFeedFilters(parseFeedFilters(this.queryParamMap()));

      if (feedFiltersEqual(liveFilters, routeFilters)) {
        return;
      }

      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: buildFeedPageQueryParams(this.queryParamMap(), liveFilters),
        replaceUrl: true,
      });
    });

  }

  @HostListener('window:focus')
  refreshOnFocus(): void {
    this.feed.refreshConnection();
  }

  @HostListener('document:keydown', ['$event'])
  handleShortcuts(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    const target = event.target;
    if (target instanceof HTMLElement) {
      const tagName = target.tagName;
      if (
        target.isContentEditable ||
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT'
      ) {
        return;
      }
    }
    const key = event.key.toLowerCase();
    if (key === 'p') {
      event.preventDefault();
      this.handleComposeRequested();
    }
    if (key === 'r') {
      event.preventDefault();
      this.handleRefresh();
    }
    if (key === 'l') {
      event.preventDefault();
      this.handleLoadMore();
    }
  }

  handleLoadMore(): void {
    this.feed.loadMore();
  }

  handleRefresh(): void {
    this.feed.reload();
  }

  handleComposeRequested(): void {
    this.feed.markOnboardingSeen();
    this.publishSectionRef()?.focusPrimaryAction?.();
  }

  handleSaveItem(item: FeedItem): void {
    const favoriteKey = buildFeedFavoriteKey(item);
    if (!favoriteKey) {
      return;
    }

    if (this.savedKeys().has(favoriteKey)) {
      this.favorites.remove(favoriteKey);
      return;
    }

    this.favorites.add(favoriteKey);
  }

  handleContactItem(item: FeedItem): void {
    if (!isFeedOpportunityType(item.type)) {
      this.openItem(item.id);
      return;
    }

    const decision = this.opportunityEngagement.plan({
      item,
      source: 'feed',
      fallback: 'drawer',
      currentUrl: this.currentInternalUrl('/feed'),
      requiresAuthentication: true,
      isAuthenticated: this.auth.isAuthenticated(),
    });

    if (decision.kind === 'redirect-login' || decision.kind === 'open-linkup') {
      void this.router.navigate(decision.navigation.commands, decision.navigation.extras);
      return;
    }

    this.resetContactSubmitState();
    this.contactItem.set(item);
    this.contactDrawerOpen.set(true);
  }

  closeContactDrawer(): void {
    this.contactDrawerOpen.set(false);
    this.contactItem.set(null);
    this.resetContactSubmitState();
  }

  handleContactSubmitted(payload: OpportunityOfferPayload): void {
    this.pendingContactPayload = payload;
    void this.submitContactPayload(payload);
  }

  handleContactRetryRequested(): void {
    if (!this.pendingContactPayload) {
      return;
    }
    void this.submitContactPayload(this.pendingContactPayload);
  }

  openItem(itemId: string): void {
    const item = this.items().find(entry => entry.id === itemId);
    const routeSegment =
      item?.type === 'ALERT'
        ? 'alerts'
        : item?.type === 'INDICATOR'
          ? 'indicators'
          : 'opportunities';
    void this.router.navigate(['/feed', routeSegment, itemId], {
      queryParamsHandling: 'preserve',
    });
  }

  closeItem(): void {
    this.feed.openDrawer(null);
    void this.router.navigate(['./'], {
      relativeTo: this.route,
      queryParamsHandling: 'preserve',
    });
  }

  private async submitContactPayload(payload: OpportunityOfferPayload): Promise<void> {
    const item = this.contactItem();
    if (!item || this.contactSubmitState() === 'submitting') {
      return;
    }

    if (!this.auth.isAuthenticated()) {
      this.redirectToLogin();
      return;
    }

    this.contactSubmitError.set(null);
    if (!this.connectionState.connected()) {
      this.contactSubmitState.set('offline');
      this.contactSubmitError.set(this.translate.instant('feed.error.offline'));
      return;
    }

    this.contactSubmitState.set('submitting');
    const outcome = await this.feed.publishDraft(
      buildOpportunityOfferDraft(item, payload, this.items().find(entry => entry.sectorId)?.sectorId ?? null, this.translate)
    );
    const errorMessage = resolveOpportunityOfferSubmitErrorMessage(outcome, this.translate);

    if (errorMessage) {
      this.contactSubmitState.set('error');
      this.contactSubmitError.set(errorMessage);
      this.notifications.error(errorMessage, {
        source: 'feed',
        metadata: {
          action: 'create-opportunity-offer',
          itemId: item.id,
        },
      });
      return;
    }

    const record = this.opportunityOffers.create(
      buildOpportunityOfferRecordPayload(item, this.currentInternalUrl(), payload)
    );
    this.contactSubmitState.set('success');
    this.contactSubmitError.set(null);
    this.pendingContactPayload = null;
    this.notifications.success(
      this.translate.instant('feed.opportunity.detail.offer.status.successReference', {
        reference: record.reference,
      }),
      {
        source: 'feed',
        metadata: {
          action: 'create-opportunity-offer',
          itemId: item.id,
          offerId: record.id,
          offerReference: record.reference,
        },
      }
    );
    this.closeContactDrawerAfterSuccess();
  }

  private closeContactDrawerAfterSuccess(): void {
    this.clearContactStatusTimer();
    this.contactStatusTimer = setTimeout(() => {
      this.contactDrawerOpen.set(false);
      this.contactItem.set(null);
      this.contactSubmitState.set('idle');
    }, 750);
  }


  private resetContactSubmitState(): void {
    this.clearContactStatusTimer();
    this.pendingContactPayload = null;
    this.contactSubmitState.set('idle');
    this.contactSubmitError.set(null);
  }

  private clearContactStatusTimer(): void {
    if (!this.contactStatusTimer) {
      return;
    }
    clearTimeout(this.contactStatusTimer);
    this.contactStatusTimer = null;
  }

  private redirectToLogin(): void {
    const navigation = this.opportunityEngagement.buildLoginNavigation(
      this.currentInternalUrl('/feed'),
      '/feed'
    );
    void this.router.navigate(navigation.commands, navigation.extras);
  }

  private currentInternalUrl(fallback = '/feed'): string {
    const navigation = this.router.getCurrentNavigation();
    const url = navigation?.finalUrl?.toString() ?? navigation?.extractedUrl?.toString() ?? this.router.url;
    return this.opportunityEngagement.normalizeInternalUrl(url, fallback);
  }

  private normalizeQueryParam(value: string | null): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();
    return normalized.length ? normalized : null;
  }
}

function normalizeFeedFilters(filters: FeedFilterState): FeedFilterState {
  const search = filters.search.trim();

  return {
    fromProvinceId: normalizeFilterValue(filters.fromProvinceId),
    toProvinceId: normalizeFilterValue(filters.toProvinceId),
    sectorId: normalizeFilterValue(filters.sectorId),
    formKey: normalizeFilterValue(filters.formKey),
    category: filters.category,
    type: filters.type,
    mode: filters.mode,
    sort: filters.sort,
    search,
  };
}

function buildFeedFilterQueryParams(filters: FeedFilterState): Record<string, string | null> {
  return {
    fromProvince: filters.fromProvinceId,
    toProvince: filters.toProvinceId,
    sector: filters.sectorId,
    sectorId: null,
    formKey: filters.formKey,
    category: filters.category,
    type: filters.type,
    mode: filters.mode === 'BOTH' ? null : filters.mode,
    sort: filters.sort === 'NEWEST' ? null : filters.sort,
    q: filters.search.length ? filters.search : null,
  };
}

function buildFeedPageQueryParams(
  queryParamMap: ParamMap,
  filters: FeedFilterState
): Record<string, string | string[] | null> {
  const preservedParams: Record<string, string | string[]> = {};

  for (const key of queryParamMap.keys) {
    if (FEED_FILTER_QUERY_PARAM_KEYS.has(key)) {
      continue;
    }

    const values = queryParamMap.getAll(key);
    if (!values.length) {
      continue;
    }

    preservedParams[key] = values.length === 1 ? values[0] : values;
  }

  return {
    ...preservedParams,
    ...buildFeedFilterQueryParams(filters),
  };
}

const FEED_FILTER_QUERY_PARAM_KEYS = new Set([
  'fromProvince',
  'toProvince',
  'sector',
  'sectorId',
  'formKey',
  'category',
  'type',
  'mode',
  'sort',
  'q',
]);

function feedFiltersEqual(left: FeedFilterState, right: FeedFilterState): boolean {
  return (
    left.fromProvinceId === right.fromProvinceId &&
    left.toProvinceId === right.toProvinceId &&
    left.sectorId === right.sectorId &&
    left.formKey === right.formKey &&
    left.category === right.category &&
    left.type === right.type &&
    left.mode === right.mode &&
    left.sort === right.sort &&
    left.search === right.search
  );
}

function normalizeFilterValue(value: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length ? normalized : null;
}
