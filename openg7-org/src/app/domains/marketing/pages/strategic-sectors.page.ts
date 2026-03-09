import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, ParamMap, Params, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { StrategicSectorCardComponent } from '../components/strategic-sectors/strategic-sector-card.component';
import { StrategicSectorsFilterRailComponent } from '../components/strategic-sectors/strategic-sectors-filter-rail.component';
import { StrategicSectorsMapPanelComponent } from '../components/strategic-sectors/strategic-sectors-map-panel.component';
import {
  CORRIDOR_ITEMS,
  DEFAULT_FILTER_VALUES,
  FILTER_KEYS,
  FILTER_OPTIONS_BY_KEY,
  SECTOR_CARDS,
  SECTOR_TABS,
  StrategicFilterKey,
  StrategicFilterValueMap,
  StrategicSectorTabId,
} from './strategic-sectors.models';

interface StrategicActiveFilterChip {
  readonly key: StrategicFilterKey;
  readonly labelKey: string;
  readonly value: string;
}

interface StrategicCoverageKpi {
  readonly provinces: number;
  readonly sectors: number;
  readonly corridors: number;
}

interface StrategicWorkspaceKpi {
  readonly labelKey: string;
  readonly value: string;
}

@Component({
  standalone: true,
  selector: 'og7-strategic-sectors-page',
  imports: [
    CommonModule,
    TranslateModule,
    StrategicSectorsFilterRailComponent,
    StrategicSectorCardComponent,
    StrategicSectorsMapPanelComponent,
  ],
  templateUrl: './strategic-sectors.page.html',
  styleUrl: './strategic-sectors.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrategicSectorsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private syncingFromRoute = false;
  protected readonly tabs = SECTOR_TABS;
  protected readonly filterKeys = FILTER_KEYS;
  protected readonly filterOptions = FILTER_OPTIONS_BY_KEY;
  protected readonly corridors = CORRIDOR_ITEMS;
  private readonly tabIds = new Set<StrategicSectorTabId>(this.tabs.map((tab) => tab.id));
  @ViewChild('sectorsSearchInput') private searchInput?: ElementRef<HTMLInputElement>;

  protected readonly activeTab = signal<StrategicSectorTabId>('all');
  protected readonly searchQuery = signal('');
  protected readonly filterValues = signal<StrategicFilterValueMap>({ ...DEFAULT_FILTER_VALUES });
  protected readonly mobileFiltersOpen = signal(false);

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.applyRouteParams(params));
  }

  protected readonly visibleCards = computed(() => {
    const current = this.activeTab();
    const query = this.searchQuery().trim().toLowerCase();
    const filters = this.filterValues();

    return SECTOR_CARDS.filter((card) => {
      if (current !== 'all' && card.sectorId !== current) {
        return false;
      }

      if (query.length > 0) {
        const matchesSearch =
          card.id.toLowerCase().includes(query) || card.sectorId.toLowerCase().includes(query);
        if (!matchesSearch) {
          return false;
        }
      }

      if (filters.source !== 'all' && !card.sourceProvinces.includes(filters.source)) {
        return false;
      }
      if (filters.target !== 'all' && !card.targetProvinces.includes(filters.target)) {
        return false;
      }
      if (filters.input !== 'all' && !card.inputs.includes(filters.input)) {
        return false;
      }
      if (filters.availability !== 'all' && card.availability !== filters.availability) {
        return false;
      }
      if (filters.criticality !== 'all' && card.criticality !== filters.criticality) {
        return false;
      }
      if (filters.horizon !== 'all' && card.horizon !== filters.horizon) {
        return false;
      }

      return true;
    });
  });

  protected readonly activeFiltersCount = computed(() => {
    const filters = this.filterValues();
    let count = 0;
    for (const key of FILTER_KEYS) {
      if (filters[key] !== DEFAULT_FILTER_VALUES[key]) {
        count += 1;
      }
    }
    return count;
  });

  protected readonly featuredCards = computed(() => this.visibleCards().slice(0, 5));

  protected readonly coverageKpi = computed<StrategicCoverageKpi>(() => {
    const cards = this.visibleCards();
    const provinces = new Set<string>();
    const sectors = new Set<StrategicSectorTabId>();
    let corridors = 0;

    for (const card of cards) {
      for (const code of card.sourceProvinces) {
        provinces.add(code);
      }
      for (const code of card.targetProvinces) {
        provinces.add(code);
      }

      sectors.add(card.sectorId);

      const corridorMetric = card.metrics.find(
        (metric) => metric.labelKey === 'pages.strategicSectors.cards.metrics.corridors',
      );
      const parsed = Number.parseInt(corridorMetric?.value ?? '0', 10);
      if (Number.isFinite(parsed)) {
        corridors += parsed;
      }
    }

    return {
      provinces: provinces.size,
      sectors: sectors.size,
      corridors,
    };
  });

  protected readonly workspaceKpis = computed<readonly StrategicWorkspaceKpi[]>(() => {
    const cards = this.visibleCards();
    const coveredProvinces = new Set<string>();
    let corridorCount = 0;
    let constrainedCount = 0;

    for (const card of cards) {
      for (const source of card.sourceProvinces) {
        coveredProvinces.add(source);
      }
      for (const target of card.targetProvinces) {
        coveredProvinces.add(target);
      }

      const corridorMetric = card.metrics.find(
        (metric) => metric.labelKey === 'pages.strategicSectors.cards.metrics.corridors',
      );
      const parsedCorridors = Number.parseInt(corridorMetric?.value ?? '0', 10);
      if (Number.isFinite(parsedCorridors)) {
        corridorCount += parsedCorridors;
      }

      if (card.availability === 'constrained' || card.criticality === 'high') {
        constrainedCount += 1;
      }
    }

    return [
      {
        labelKey: 'pages.strategicSectors.workspace.kpi.corridors',
        value: corridorCount.toString(),
      },
      {
        labelKey: 'pages.strategicSectors.workspace.kpi.provinces',
        value: coveredProvinces.size.toString(),
      },
      {
        labelKey: 'pages.strategicSectors.workspace.kpi.critical',
        value: constrainedCount.toString(),
      },
    ];
  });

  protected readonly activeFilterChips = computed<readonly StrategicActiveFilterChip[]>(() => {
    const filters = this.filterValues();

    return FILTER_KEYS
      .filter((key) => filters[key] !== DEFAULT_FILTER_VALUES[key])
      .map((key) => {
        const value = filters[key];
        const option = this.filterOptions[key].find((candidate) => candidate.value === value);
        return {
          key,
          value,
          labelKey: option?.labelKey ?? 'pages.strategicSectors.filters.any',
        };
      });
  });

  protected setActiveTab(tabId: StrategicSectorTabId): void {
    this.activeTab.set(tabId);
    this.syncQueryParams();
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set((value ?? '').trimStart());
    this.syncQueryParams();
  }

  protected onClearSearch(): void {
    this.searchQuery.set('');
    this.syncQueryParams();
    this.focusSearchInput();
  }

  protected onFilterChange(event: { key: StrategicFilterKey; value: string }): void {
    this.filterValues.update((current) => ({
      ...current,
      [event.key]: event.value,
    }));
    this.syncQueryParams();
  }

  protected onResetFilters(): void {
    this.filterValues.set({ ...DEFAULT_FILTER_VALUES });
    this.syncQueryParams();
  }

  protected clearFilter(key: StrategicFilterKey): void {
    this.filterValues.update((current) => ({
      ...current,
      [key]: DEFAULT_FILTER_VALUES[key],
    }));
    this.syncQueryParams();
  }

  protected openMobileFilters(): void {
    this.mobileFiltersOpen.set(true);
  }

  protected closeMobileFilters(): void {
    this.mobileFiltersOpen.set(false);
  }

  protected onApplyFilters(): void {
    this.mobileFiltersOpen.set(false);
    this.syncQueryParams();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.mobileFiltersOpen()) {
      this.mobileFiltersOpen.set(false);
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected onGlobalKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 'k') {
      event.preventDefault();
      this.focusSearchInput();
    }
  }

  private applyRouteParams(params: ParamMap): void {
    this.syncingFromRoute = true;

    this.activeTab.set(this.parseSectorParam(params.get('sector')));
    this.searchQuery.set((params.get('q') ?? '').trim());
    this.filterValues.set(this.parseFilterParams(params));

    this.syncingFromRoute = false;
  }

  private parseSectorParam(value: string | null): StrategicSectorTabId {
    if (!value) {
      return 'all';
    }
    if (this.tabIds.has(value as StrategicSectorTabId)) {
      return value as StrategicSectorTabId;
    }
    return 'all';
  }

  private parseFilterParams(params: ParamMap): StrategicFilterValueMap {
    const values: StrategicFilterValueMap = { ...DEFAULT_FILTER_VALUES };
    for (const key of FILTER_KEYS) {
      const value = params.get(key);
      if (!value) {
        continue;
      }
      const allowed = this.filterOptions[key].some((option) => option.value === value);
      if (allowed) {
        values[key] = value;
      }
    }
    return values;
  }

  private syncQueryParams(): void {
    if (this.syncingFromRoute) {
      return;
    }

    const activeTab = this.activeTab();
    const query = this.searchQuery().trim();
    const filters = this.filterValues();

    const queryParams: Params = {
      sector: activeTab === 'all' ? null : activeTab,
      q: query.length ? query : null,
      source: filters.source === DEFAULT_FILTER_VALUES.source ? null : filters.source,
      target: filters.target === DEFAULT_FILTER_VALUES.target ? null : filters.target,
      input: filters.input === DEFAULT_FILTER_VALUES.input ? null : filters.input,
      availability:
        filters.availability === DEFAULT_FILTER_VALUES.availability ? null : filters.availability,
      criticality:
        filters.criticality === DEFAULT_FILTER_VALUES.criticality ? null : filters.criticality,
      horizon: filters.horizon === DEFAULT_FILTER_VALUES.horizon ? null : filters.horizon,
    };

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private focusSearchInput(): void {
    const input = this.searchInput?.nativeElement;
    if (!input) {
      return;
    }
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  }
}
