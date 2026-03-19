import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FiltersService } from '@app/core/filters.service';
import { DEMO_OPPORTUNITY_MATCHES, findDemoFinancingBanner } from '@app/core/fixtures/opportunity-demo';
import { OpportunityMatch } from '@app/core/models/opportunity';
import { FinancingBanner } from '@app/core/models/partner-profile';
import { AnalyticsService } from '@app/core/observability/analytics.service';
import { MapStatsService } from '@app/core/services/map-stats.service';
import { OpportunityAiPrefillService } from '@app/core/services/opportunity-ai-prefill.service';
import { OpportunityService } from '@app/core/services/opportunity.service';
import { FeedItem, FeedItemType } from '@app/domains/feed/feature/models/feed.models';
import { OpportunityEngagementService } from '@app/domains/feed/feature/services/opportunity-engagement.service';
import { HomeHeroSectionComponent } from '@app/domains/home/feature/home-hero-section/home-hero-section.component';
import { HomeFeedFilter, HomeFeedScope, HomeFeedService } from '@app/domains/home/services/home-feed.service';
import { IntroductionRequestContext } from '@app/domains/matchmaking/sections/og7-intro-billboard.section';
import { StatMetric } from '@app/shared/components/hero/hero-stats/hero-stats.component';
import { selectFilteredFlows, selectMapKpis } from '@app/state';
import { AppState } from '@app/state/app.state';
import { selectProvinces, selectSectors } from '@app/state/catalog/catalog.selectors';
import { computeMapKpiSnapshot } from '@app/state/map/map.selectors';
import { selectFeedConnectionState } from '@app/store/feed/feed.selectors';
import { Store } from '@ngrx/store';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'og7-home-page',
  imports: [
    HomeHeroSectionComponent,
  ],
  templateUrl: './og7-home-page.component.html',
  styleUrls: ['./og7-home-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « domains/home/pages/home » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Og7 Home Page ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns Og7HomePageComponent gérée par le framework.
 */
export class Og7HomePageComponent {
  private readonly opportunities = inject(OpportunityService);
  private readonly aiPrefill = inject(OpportunityAiPrefillService);
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);
  private readonly store = inject(Store<AppState>);
  private readonly filters = inject(FiltersService);
  private readonly mapStats = inject(MapStatsService);
  private readonly homeFeed = inject(HomeFeedService);
  private readonly opportunityEngagement = inject(OpportunityEngagementService);

  private readonly selectedMatchId = signal<number | null>(null);
  private readonly financingBanner = signal<FinancingBanner | null>(null);

  private readonly flows = this.store.selectSignal(selectFilteredFlows);
  private readonly kpis = this.store.selectSignal(selectMapKpis);
  private readonly catalogProvinces = this.store.selectSignal(selectProvinces);
  private readonly catalogSectors = this.store.selectSignal(selectSectors);
  private readonly feedConnection = this.store.selectSignal(selectFeedConnectionState);

  protected readonly feedScopes: ReadonlyArray<{ id: HomeFeedScope; label: string }> = [
    { id: 'canada', label: 'home.feed.tabs.canada' },
    { id: 'g7', label: 'home.feed.tabs.g7' },
    { id: 'world', label: 'home.feed.tabs.world' },
  ];

  protected readonly feedFilters: ReadonlyArray<{ id: HomeFeedFilter; label: string }> = [
    { id: 'all', label: 'home.feed.filters.all' },
    { id: 'offer', label: 'home.feed.filters.offer' },
    { id: 'request', label: 'home.feed.filters.request' },
    { id: 'labor', label: 'home.feed.filters.labor' },
    { id: 'transport', label: 'home.feed.filters.transport' },
  ];

  protected readonly activeFeedScope = signal<HomeFeedScope>('canada');
  protected readonly activeFeedFilter = signal<HomeFeedFilter>('all');
  protected readonly searchDraft = signal('');
  private readonly searchQuery = toSignal(
    toObservable(this.searchDraft).pipe(
      map((value) => value.trim()),
      debounceTime(250),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  private readonly homeFeedItems = signal<FeedItem[]>([]);
  protected readonly homeFeedLoading = signal(false);
  protected readonly homeFeedError = signal<string | null>(null);
  private readonly homeFeedRequest = computed(() => ({
    scope: this.activeFeedScope(),
    filter: this.activeFeedFilter(),
    search: this.searchQuery(),
    limit: 60,
  }));

  private readonly numberFormatter = new Intl.NumberFormat(undefined);
  private readonly currencyFormatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  });

  protected readonly matches = this.opportunities.items();
  protected readonly loading = this.opportunities.loading();
  protected readonly error = this.opportunities.error();

  protected readonly keyMetrics = computed<StatMetric[]>(() =>
    this.mapStats.buildMetrics(this.flows(), this.kpis(), this.filters.tradePartner())
  );

  protected readonly activeMatch = computed(() => this.resolveMatch(this.selectedMatchId()));
  protected readonly activeFinancingBanner = computed(() => this.financingBanner());

  protected readonly intrantsValue = computed(() => {
    const snapshot = computeMapKpiSnapshot(this.flows(), this.kpis().default);
    return snapshot.tradeValue ?? 0;
  });

  protected readonly offersCount = computed(() => this.countFeedType(this.homeFeedItems(), 'OFFER'));
  protected readonly requestsCount = computed(() => this.countFeedType(this.homeFeedItems(), 'REQUEST'));
  protected readonly activeCount = computed(
    () => this.homeFeedItems().filter((item) => item.status !== 'failed').length
  );
  protected readonly corridorsCount = computed(() => this.flows().length);

  protected readonly lastFeedUpdate = computed(() => {
    const items = this.homeFeedItems();
    if (!items.length) {
      return null;
    }
    return items
      .map((item) => item.createdAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .slice(-1)[0];
  });

  protected readonly systemStatusKey = computed(() => {
    const state = this.feedConnection();
    if (!state.connected) {
      return 'metrics.status.offline';
    }
    if (state.error) {
      return 'metrics.status.degraded';
    }
    return 'metrics.status.stable';
  });

  protected readonly systemStatusDotClass = computed(() => {
    const state = this.feedConnection();
    if (!state.connected) {
      return 'bg-rose-400';
    }
    if (state.error) {
      return 'bg-amber-400';
    }
    return 'bg-emerald-400';
  });

  protected readonly provinceLabelMap = computed(() => {
    const map = new Map<string, string>();
    for (const province of this.catalogProvinces()) {
      map.set(province.id, province.name);
    }
    return map;
  });

  protected readonly sectorLabelMap = computed(() => {
    const map = new Map<string, string>();
    for (const sector of this.catalogSectors()) {
      map.set(sector.id, sector.name);
    }
    return map;
  });

  protected readonly alertItems = computed(() =>
    this.buildPanelItems(this.homeFeedItems(), ['ALERT'], 2)
  );

  protected readonly opportunityItems = computed(() =>
    this.buildPanelItems(this.homeFeedItems(), ['OFFER', 'REQUEST', 'CAPACITY', 'TENDER'], 2)
  );

  protected readonly indicatorItems = computed(() =>
    this.buildPanelItems(this.homeFeedItems(), ['INDICATOR'], 2)
  );

  protected readonly feedSubtitleForItem = (item: FeedItem): string => {
    return this.formatFeedRoute(item) || this.resolveSectorLabel(item.sectorId) || '';
  };

  constructor() {
    this.aiPrefill.prefillFromPreferences();

    if (!this.matches().length) {
      this.opportunities.hydrateWithDemo(DEMO_OPPORTUNITY_MATCHES);
    }

    effect(() => {
      const list = this.matches();
      if (!this.selectedMatchId() && list.length) {
        this.applySelection(list[0].id);
      }
    });

    this.setupHomeFeed();
  }

  protected onConnectRequested(matchId: number): void {
    this.logOpportunityConnect(matchId);
    void this.router.navigate(['/linkup', matchId]);
  }

  protected onFeedPanelItemOpened(item: FeedItem): void {
    const itemId = item.id?.trim();
    if (!itemId) {
      return;
    }
    this.analytics.emit(
      'home_feed_panel_item_opened',
      { itemId, itemType: item.type },
      { priority: true }
    );
    void this.router.navigate(['/feed', itemId]);
  }

  protected onFeedPanelConnectRequested(item: FeedItem): void {
    const itemId = item.id?.trim();
    if (!itemId) {
      return;
    }
    const decision = this.opportunityEngagement.plan({
      item,
      source: 'home-feed-panels',
      fallback: 'detail',
    });
    if (decision.kind !== 'open-linkup' && decision.kind !== 'open-detail') {
      return;
    }

    this.analytics.emit(
      'home_feed_panel_connect_requested',
      { itemId, itemType: item.type, route: decision.navigation.route },
      { priority: true }
    );
    void this.router.navigate(decision.navigation.commands, decision.navigation.extras);
  }

  protected onRetryRequested(): void {
    this.opportunities.reload();
  }

  protected onIntroductionRequested(context: IntroductionRequestContext): void {
    const match = context.match ?? this.activeMatch();
    if (!match) {
      return;
    }
    void this.router.navigate(['/linkup', match.id]);
  }

  protected onMatchSelected(matchId: number | null): void {
    if (matchId == null) {
      this.selectedMatchId.set(null);
      this.financingBanner.set(null);
      return;
    }

    this.applySelection(matchId);
  }

  private logOpportunityConnect(matchId: number): void {
    this.analytics.emit(
      'opportunity_connect_clicked',
      { matchId, source: 'home_page' },
      { priority: true }
    );
  }

  private applySelection(matchId: number): void {
    this.selectedMatchId.set(matchId);
    const match = this.resolveMatch(matchId);
    if (!match) {
      this.financingBanner.set(null);
      return;
    }
    this.financingBanner.set(this.resolveFinancing(match));
  }

  private resolveMatch(matchId: number | null): OpportunityMatch | null {
    if (matchId == null) {
      return null;
    }
    return this.matches().find((item) => item.id === matchId) ?? null;
  }

  private resolveFinancing(match: OpportunityMatch): FinancingBanner | null {
    return findDemoFinancingBanner(match);
  }

  protected resolveProvinceLabel(id?: string | null): string | null {
    if (!id) {
      return null;
    }
    return this.provinceLabelMap().get(id) ?? id;
  }

  protected resolveSectorLabel(id?: string | null): string | null {
    if (!id) {
      return null;
    }
    return this.sectorLabelMap().get(id) ?? id;
  }

  protected formatFeedRoute(item: FeedItem): string | null {
    const from = this.resolveProvinceLabel(item.fromProvinceId ?? null);
    const to = this.resolveProvinceLabel(item.toProvinceId ?? null);
    if (from && to) {
      return `${from} → ${to}`;
    }
    return from ?? to ?? this.resolveSectorLabel(item.sectorId ?? null);
  }

  protected formatCount(value: number): string {
    return this.numberFormatter.format(value);
  }

  protected formatCurrency(value: number): string {
    return this.currencyFormatter.format(value);
  }

  protected setFeedScope(scope: HomeFeedScope): void {
    if (this.activeFeedScope() === scope) {
      return;
    }
    this.activeFeedScope.set(scope);
  }

  protected setFeedFilter(filter: HomeFeedFilter): void {
    if (this.activeFeedFilter() === filter) {
      return;
    }
    this.activeFeedFilter.set(filter);
  }

  protected onSearchInput(value: string): void {
    this.searchDraft.set(value);
  }

  private buildPanelItems(items: FeedItem[], types: FeedItemType[], limit: number): FeedItem[] {
    const filtered = items.filter((item) => types.includes(item.type));
    return filtered
      .slice()
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, limit);
  }

  private countFeedType(items: FeedItem[], type: FeedItemType): number {
    return items.filter((item) => item.type === type).length;
  }

  private setupHomeFeed(): void {
    effect((onCleanup) => {
      const request = this.homeFeedRequest();
      this.homeFeedLoading.set(true);
      this.homeFeedError.set(null);

      const sub = this.homeFeed.loadHighlights(request).subscribe({
        next: (items) => {
          this.homeFeedItems.set(items);
          this.homeFeedLoading.set(false);
        },
        error: (error) => {
          const message = error instanceof Error ? error.message : 'home.feed.error';
          this.homeFeedItems.set([]);
          this.homeFeedError.set(message);
          this.homeFeedLoading.set(false);
        },
      });

      onCleanup(() => sub.unsubscribe());
    });
  }
}

