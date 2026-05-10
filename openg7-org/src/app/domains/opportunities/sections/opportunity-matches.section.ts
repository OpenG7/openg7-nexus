import { CommonModule, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FiltersService, TradeProvinceFilter } from '@app/core/filters.service';
import {
  MODE_OPTIONS,
  Mode,
  OpportunityMatch,
  PROVINCE_OPTIONS,
  ProvinceCode,
  SECTOR_OPTIONS,
  SectorType,
  normalizeConfidencePercent,
} from '@app/core/models/opportunity';
import {
  DEFAULT_OPPORTUNITY_MATCH_LAYOUT,
  OpportunityMatchLayout,
  isOpportunityMatchLayout,
} from '@app/core/models/opportunity-match-layout';
import { createPartnerSelection, parsePartnerSelection } from '@app/core/models/partner-selection';
import { OpportunityCompactKpiListComponent } from '@app/domains/opportunities/opportunities/ui/opportunity-compact-kpi-list/opportunity-compact-kpi-list.component';
import { OpportunityImpactBannerComponent } from '@app/domains/opportunities/opportunities/ui/opportunity-impact-banner/opportunity-impact-banner.component';
import {
  OPPORTUNITY_MATCH_LAYOUT_OPTIONS,
  createOpportunityCompactKpiListVm,
  createOpportunityImpactBannerVm,
  createOpportunityMiniMapVm,
  createOpportunityRadarVm,
  createOpportunitySubwayVm,
  createOpportunitySwipeStackVm,
  createOpportunityTileVm,
  createOpportunityTimelineVm,
  createOpportunityTwoWayComparatorVm,
} from '@app/domains/opportunities/opportunities/ui/opportunity-match-view-models';
import { OpportunityMiniMapComponent } from '@app/domains/opportunities/opportunities/ui/opportunity-mini-map/opportunity-mini-map.component';
import { OpportunityRadarComponent } from '@app/domains/opportunities/opportunities/ui/opportunity-radar/opportunity-radar.component';
import { OpportunitySubwayComponent } from '@app/domains/opportunities/opportunities/ui/opportunity-subway/opportunity-subway.component';
import { OpportunitySwipeStackComponent } from '@app/domains/opportunities/opportunities/ui/opportunity-swipe-stack/opportunity-swipe-stack.component';
import { OpportunityTileComponent } from '@app/domains/opportunities/opportunities/ui/opportunity-tile/opportunity-tile.component';
import { OpportunityTimelineComponent } from '@app/domains/opportunities/opportunities/ui/opportunity-timeline/opportunity-timeline.component';
import { OpportunityTwoWayComparatorComponent } from '@app/domains/opportunities/opportunities/ui/opportunity-two-way-comparator/opportunity-two-way-comparator.component';
import { OpportunityViewSheetPayload } from '@app/domains/opportunities/opportunities/ui/opportunity-view-sheet-payload';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'og7-opportunity-matches-section',
  standalone: true,
  imports: [
    CommonModule,
    NgClass,
    TranslateModule,
    OpportunityTileComponent,
    OpportunityMiniMapComponent,
    OpportunitySubwayComponent,
    OpportunityRadarComponent,
    OpportunityTwoWayComparatorComponent,
    OpportunityTimelineComponent,
    OpportunityCompactKpiListComponent,
    OpportunitySwipeStackComponent,
    OpportunityImpactBannerComponent,
  ],
  templateUrl: './opportunity-matches.section.html',
  styleUrls: ['./opportunity-matches.section.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « domains/opportunities/sections » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Opportunity Matches ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns OpportunityMatchesSection gérée par le framework.
 */
export class OpportunityMatchesSection {
  readonly matches = input<readonly OpportunityMatch[]>([]);
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  @Output() readonly connectRequested = new EventEmitter<number>();
  @Output() readonly retryRequested = new EventEmitter<void>();
  @Output() readonly matchSelected = new EventEmitter<number | null>();

  private readonly filters = inject(FiltersService);
  private readonly router = inject(Router);

  protected readonly query = computed(() => this.filters.matchQuery());
  protected readonly province = computed<TradeProvinceFilter>(() => this.filters.matchProvince());
  protected readonly selectedSector = computed<SectorType | 'all'>(
    () => this.filters.tradeFilters().sector ?? 'all',
  );
  protected readonly selectedMode = computed<Mode>(() => this.filters.tradeFilters().mode);
  readonly selectedPartnerId = signal<string | null>(null);
  protected readonly filtersOpen = signal(false);

  protected readonly provinceOptions = PROVINCE_OPTIONS;
  protected readonly sectorOptions = SECTOR_OPTIONS;
  protected readonly modeOptions = MODE_OPTIONS;
  protected readonly layoutOptions = OPPORTUNITY_MATCH_LAYOUT_OPTIONS;
  protected readonly skeletonItems = Array.from({ length: 6 });

  protected readonly filteredMatches = computed(() => {
    const list = this.matches() ?? [];
    if (!list.length) {
      return [] as readonly OpportunityMatch[];
    }

    const q = this.filters.matchQuery().trim().toLowerCase();
    const province = this.filters.matchProvince();
    const tradeFilters = this.filters.tradeFilters();
    const sector = tradeFilters.sector ?? 'all';
    const mode = tradeFilters.mode;

    return list.filter((match) => this.applyFilters(match, q, province, sector, mode));
  });

  protected readonly showEmptyState = computed(
    () => !this.loading() && !this.error() && this.filteredMatches().length === 0,
  );
  protected readonly hasActiveFilters = computed(() => {
    if (this.query().trim()) {
      return true;
    }
    if (this.province() !== 'all') {
      return true;
    }
    if (this.selectedSector() !== 'all') {
      return true;
    }
    return this.selectedMode() !== 'all';
  });

  protected readonly selectedLayout = computed<OpportunityMatchLayout>(() =>
    this.filters.matchCardLayout(),
  );
  private readonly suggestedLayout = computed<OpportunityMatchLayout>(() =>
    suggestLayoutForMatches(this.filteredMatches()),
  );
  protected readonly tileViewModels = computed(() =>
    this.filteredMatches().map((match) => createOpportunityTileVm(match)),
  );
  protected readonly miniMapViewModels = computed(() =>
    this.filteredMatches().map((match) => createOpportunityMiniMapVm(match)),
  );
  protected readonly subwayViewModels = computed(() =>
    this.filteredMatches().map((match) => createOpportunitySubwayVm(match)),
  );
  protected readonly radarViewModels = computed(() =>
    this.filteredMatches().map((match) => createOpportunityRadarVm(match)),
  );
  protected readonly twoWayViewModels = computed(() =>
    this.filteredMatches().map((match) => createOpportunityTwoWayComparatorVm(match)),
  );
  protected readonly timelineViewModels = computed(() =>
    this.filteredMatches().map((match) => createOpportunityTimelineVm(match)),
  );
  protected readonly impactBannerViewModels = computed(() =>
    this.filteredMatches().map((match) => createOpportunityImpactBannerVm(match)),
  );
  protected readonly compactKpiVm = computed(() =>
    createOpportunityCompactKpiListVm(this.filteredMatches()),
  );
  protected readonly swipeStackVm = computed(() =>
    createOpportunitySwipeStackVm(this.filteredMatches()),
  );

  protected readonly hasError = computed(() => {
    const message = this.error();
    return typeof message === 'string' && message.length > 0;
  });

  protected readonly errorMessage = computed(() => this.error());

  constructor() {
    effect(() => {
      const selection = this.selectedPartnerId();
      if (!selection) {
        return;
      }
      const parsed = parsePartnerSelection(selection);
      if (!parsed || !parsed.id) {
        this.clearSelectedPartner();
        return;
      }

      const matches = this.matches() ?? [];
      const exists = matches.some((match) => {
        if (parsed.role === 'buyer') {
          return String(match.buyer.id) === parsed.id;
        }
        return String(match.seller.id) === parsed.id;
      });

      if (!exists) {
        this.clearSelectedPartner();
      }
    });

    effect(() => {
      this.filters.suggestMatchCardLayout(this.suggestedLayout());
    });
  }

  onQueryChange(value: string): void {
    this.filters.matchQuery.set(value);
  }

  onProvinceChange(value: string): void {
    this.filters.matchProvince.set(value === 'all' ? 'all' : (value as ProvinceCode));
  }

  onSectorChange(value: string): void {
    if (value === 'all') {
      this.filters.activeSector.set(null);
      return;
    }
    this.filters.activeSector.set(value as SectorType);
  }

  onModeChange(mode: Mode): void {
    this.filters.tradeMode.set(mode);
  }

  protected toggleFilters(): void {
    this.filtersOpen.set(!this.filtersOpen());
  }

  clearFilters(): void {
    this.filters.matchQuery.set('');
    this.filters.matchProvince.set('all');
    this.filters.activeSector.set(null);
    this.filters.tradeMode.set('all');
    this.filters.resetMatchCardLayout();
  }

  onLayoutChange(value: string): void {
    if (isOpportunityMatchLayout(value)) {
      this.filters.overrideMatchCardLayout(value);
    }
  }

  clearSelectedPartner(): void {
    this.selectedPartnerId.set(null);
    this.matchSelected.emit(null);
  }

  protected handleConnectById(matchId: string): void {
    if (!matchId) {
      return;
    }

    const numericId = Number.parseInt(matchId, 10);
    if (Number.isFinite(numericId)) {
      this.connectRequested.emit(numericId);
      return;
    }

    const match = (this.matches() ?? []).find((item) => item.id.toString() === matchId);
    if (match) {
      this.connectRequested.emit(match.id);
    }
  }

  protected handleViewSheet(payload: OpportunityViewSheetPayload): void {
    if (!payload) {
      return;
    }

    this.selectedPartnerId.set(payload.selection);

    const numericId = Number.parseInt(payload.matchId, 10);
    if (Number.isFinite(numericId)) {
      this.matchSelected.emit(numericId);
    }

    const parsed = parsePartnerSelection(payload.selection);
    if (!parsed?.id) {
      return;
    }

    const commands: [string, string] = ['/partners', parsed.id];
    const queryParams = parsed.role === 'supplier' ? undefined : { role: parsed.role };
    void this.router.navigate(commands, { queryParams });
  }

  protected handleRetry(): void {
    this.retryRequested.emit();
  }

  protected trackByMatchId(index: number, match: OpportunityMatch): string {
    return `${match.id}`;
  }

  protected supplierSelected(match: OpportunityMatch): boolean {
    return this.selectedPartnerId() === createPartnerSelection('supplier', match.seller.id);
  }

  protected confidencePercent(match: OpportunityMatch): number {
    return normalizeConfidencePercent(match.confidence);
  }

  protected confidenceBadgeClass(percent: number): string {
    if (percent >= 80) {
      return 'bg-emerald-400/15 text-emerald-200 ring-1 ring-inset ring-emerald-400/25';
    }
    if (percent >= 50) {
      return 'bg-amber-400/15 text-amber-200 ring-1 ring-inset ring-amber-400/25';
    }
    return 'bg-rose-400/15 text-rose-200 ring-1 ring-inset ring-rose-400/20';
  }

  private applyFilters(
    match: OpportunityMatch,
    query: string,
    province: ProvinceCode | 'all',
    sector: SectorType | 'all',
    mode: Mode,
  ): boolean {
    if (province !== 'all' && !this.matchInProvince(match, province)) {
      return false;
    }
    if (sector !== 'all' && !this.matchInSector(match, sector)) {
      return false;
    }
    if (mode !== 'all' && !this.matchInMode(match, mode)) {
      return false;
    }
    if (query) {
      const haystack = `${match.commodity} ${match.buyer.name} ${match.seller.name}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  }

  private matchInProvince(match: OpportunityMatch, province: ProvinceCode): boolean {
    return match.buyer.province === province || match.seller.province === province;
  }

  private matchInSector(match: OpportunityMatch, sector: SectorType): boolean {
    return match.buyer.sector === sector || match.seller.sector === sector;
  }

  private matchInMode(match: OpportunityMatch, mode: Mode): boolean {
    if (match.mode === 'all') {
      return true;
    }
    return match.mode === mode;
  }
}

function suggestLayoutForMatches(matches: readonly OpportunityMatch[]): OpportunityMatchLayout {
  if (!matches.length) {
    return DEFAULT_OPPORTUNITY_MATCH_LAYOUT;
  }

  const hasDistanceData = matches.some(
    (match) => Number.isFinite(match.distanceKm ?? NaN) && (match.distanceKm ?? 0) > 0,
  );
  const hasCo2Data = matches.some(
    (match) => Number.isFinite(match.co2Estimate ?? NaN) && (match.co2Estimate ?? 0) > 0,
  );

  if (hasDistanceData && hasCo2Data) {
    return 'impact-banner';
  }

  if (hasDistanceData) {
    const longHaulShare =
      matches.filter((match) => (match.distanceKm ?? 0) >= 1500).length /
      Math.max(matches.length, 1);
    if (longHaulShare >= 0.5) {
      return 'mini-map';
    }
  }

  const lowConfidenceShare =
    matches.filter((match) => normalizeConfidencePercent(match.confidence) < 50).length /
    Math.max(matches.length, 1);
  if (lowConfidenceShare >= 0.5) {
    return 'radar';
  }

  const provinceCoverage = new Set<string>();
  matches.forEach((match) => {
    provinceCoverage.add(match.buyer.province);
    provinceCoverage.add(match.seller.province);
  });
  if (provinceCoverage.size >= 4) {
    return 'subway';
  }

  if (matches.length <= 3) {
    return 'tile';
  }

  if (matches.length >= 12) {
    return 'compact-kpi';
  }

  return DEFAULT_OPPORTUNITY_MATCH_LAYOUT;
}
