import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  Signal,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { RbacFacadeService } from '@app/core/security/rbac.facade';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ImportationApiClient, toGranularity, toOriginScope } from '../data-access/importation-api.client';
import {
  ImportationAnnotationDto,
  ImportationCommodityCollectionsDto,
  ImportationFlowsResponseDto,
  ImportationKnowledgeResponseDto,
  ImportationRiskFlagDto,
  ImportationSupplierDto,
  ImportationWatchlistDto,
} from '../data-access/importation-api.client';
import { ImportationViewModelMapper } from '../data-access/importation.viewmodel.mapper';
import {
  ImportationCollaborationViewModel,
  ImportationCommoditySectionViewModel,
  ImportationCommodityTab,
  ImportationFilters,
  ImportationFlowMapViewModel,
  ImportationKnowledgeSectionViewModel,
  ImportationOverviewViewModel,
  ImportationSupplierSectionViewModel,
} from '../models/importation.models';

import { ImportationAnalyticsService } from './importation-analytics.service';
import { ImportationPermissionsService } from './importation-permissions.service';


type ImportationSectionError = string | null;

interface ImportationState {
  readonly filters: ImportationFilters;
  readonly timelinePoint: string | null;
  readonly playing: boolean;
  readonly flows: ImportationFlowsResponseDto | null;
  readonly flowsLoading: boolean;
  readonly flowsError: ImportationSectionError;
  readonly commodities: ImportationCommodityCollectionsDto | null;
  readonly commoditiesLoading: boolean;
  readonly commoditiesError: ImportationSectionError;
  readonly riskFlags: readonly ImportationRiskFlagDto[];
  readonly suppliers: readonly ImportationSupplierDto[] | null;
  readonly suppliersLoading: boolean;
  readonly suppliersError: ImportationSectionError;
  readonly watchlists: readonly ImportationWatchlistDto[] | null;
  readonly annotations: readonly ImportationAnnotationDto[] | null;
  readonly collaborationLoading: boolean;
  readonly collaborationError: ImportationSectionError;
  readonly knowledge: ImportationKnowledgeResponseDto | null;
  readonly knowledgeLoading: boolean;
  readonly knowledgeError: ImportationSectionError;
  readonly activeTab: ImportationCommodityTab;
  readonly selectedCommodityId: string | null;
}

const STORAGE_KEY = 'og7.importation.filters';

const DEFAULT_FILTERS: ImportationFilters = {
  periodGranularity: 'month',
  periodValue: null,
  originScope: 'global',
  originCodes: [],
  hsSections: [],
  compareMode: false,
  compareWith: null,
};

@Injectable()
/**
 * Contexte : Conserve l’état des filtres, données et interactions pour le module Importation.
 * Raison d’être : Expose des ViewModels dérivés prêts à être consommés par les composants de page.
 * @returns ImportationFiltersStore géré par le framework.
 */
export class ImportationFiltersStore {
  private readonly api = inject(ImportationApiClient);
  private readonly mapper = inject(ImportationViewModelMapper);
  private readonly permissions = inject(ImportationPermissionsService);
  private readonly analytics = inject(ImportationAnalyticsService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly rbac = inject(RbacFacadeService);

  private route: ActivatedRoute | null = null;
  private router: Router | null = null;
  private initialized = false;
  private lastSerializedFilters: string | null = null;

  private readonly stateSig = signal<ImportationState>({
    filters: DEFAULT_FILTERS,
    timelinePoint: null,
    playing: false,
    flows: null,
    flowsLoading: false,
    flowsError: null,
    commodities: null,
    commoditiesLoading: false,
    commoditiesError: null,
    riskFlags: [],
    suppliers: null,
    suppliersLoading: false,
    suppliersError: null,
    watchlists: null,
    annotations: null,
    collaborationLoading: false,
    collaborationError: null,
    knowledge: null,
    knowledgeLoading: false,
    knowledgeError: null,
    activeTab: 'top',
    selectedCommodityId: null,
  });

  readonly overviewVm: Signal<ImportationOverviewViewModel> = computed(() => {
    this.rbac.role();
    return this.mapper.mapOverview(
      this.stateSig().filters,
      this.stateSig().flows,
      this.stateSig().timelinePoint,
      this.stateSig().riskFlags,
      this.permissions.canExportData()
    );
  });

  readonly flowMapVm: Signal<ImportationFlowMapViewModel> = computed(() =>
    this.mapper.mapFlowMap(
      this.stateSig().filters,
      this.stateSig().flows,
      this.stateSig().timelinePoint,
      this.stateSig().playing,
      this.stateSig().flowsLoading,
      this.stateSig().flowsError
    )
  );

  readonly commodityVm: Signal<ImportationCommoditySectionViewModel> = computed(() =>
    this.mapper.mapCommoditySection(
      this.stateSig().filters,
      this.stateSig().commodities,
      this.stateSig().riskFlags,
      this.stateSig().activeTab,
      this.stateSig().selectedCommodityId,
      this.stateSig().commoditiesLoading,
      this.permissions.canExportData(),
      this.stateSig().commoditiesError
    )
  );

  readonly supplierVm: Signal<ImportationSupplierSectionViewModel> = computed(() =>
    this.mapper.mapSuppliers(
      this.stateSig().suppliers,
      this.stateSig().suppliersLoading,
      this.stateSig().suppliersError
    )
  );

  readonly collaborationVm: Signal<ImportationCollaborationViewModel> = computed(() =>
    this.mapper.mapCollaboration(
      this.stateSig().watchlists,
      this.stateSig().annotations,
      {
        canManageWatchlists: this.permissions.canManageWatchlists(),
        canScheduleReports: this.permissions.canScheduleReports(),
        canViewCollaboration: this.permissions.canViewCollaboration(),
      },
      this.stateSig().collaborationLoading,
      this.stateSig().collaborationError
    )
  );

  readonly knowledgeVm: Signal<ImportationKnowledgeSectionViewModel> = computed(() =>
    this.mapper.mapKnowledge(
      this.stateSig().knowledge,
      this.stateSig().knowledgeLoading,
      this.stateSig().knowledgeError
    )
  );

  constructor() {
    effect(
      () => {
        if (!this.initialized) {
          return;
        }
        const filters = this.stateSig().filters;
        const serialized = JSON.stringify(filters);
        if (this.lastSerializedFilters === serialized) {
          return;
        }
        this.lastSerializedFilters = serialized;
        this.persistFilters(filters);
        this.analytics.trackFilterChange(filters);
        this.syncQueryParams(filters);
        this.fetchFlows(filters);
        this.fetchCommodities(filters);
        this.fetchSuppliers(filters);
        this.fetchCollaboration(filters);
        this.fetchKnowledge();
      }
    );
  }

  initialize(route: ActivatedRoute, router: Router): void {
    if (this.initialized) {
      return;
    }
    this.route = route;
    this.router = router;

    const restoredFilters = this.restoreFilters(route.snapshot.queryParamMap);
    this.initialized = true;
    this.stateSig.update((state) => ({
      ...state,
      filters: restoredFilters,
    }));
    this.analytics.trackPageViewed(restoredFilters);
  }

  setPeriodGranularity(granularity: ImportationFilters['periodGranularity']): void {
    const filters = this.stateSig().filters;
    if (filters.periodGranularity === granularity) {
      return;
    }
    this.stateSig.update((state) => ({
      ...state,
      filters: { ...state.filters, periodGranularity: granularity },
    }));
  }

  setPeriodValue(value: string | null): void {
    const trimmed = value?.trim() || null;
    if (this.stateSig().filters.periodValue === trimmed) {
      return;
    }
    this.stateSig.update((state) => ({
      ...state,
      filters: { ...state.filters, periodValue: trimmed },
      timelinePoint: trimmed,
    }));
  }

  setOriginScope(scope: ImportationFilters['originScope']): void {
    const filters = this.stateSig().filters;
    if (filters.originScope === scope) {
      return;
    }
    this.stateSig.update((state) => ({
      ...state,
      filters: {
        ...state.filters,
        originScope: scope,
        originCodes: scope === 'custom' ? state.filters.originCodes : [],
      },
    }));
  }

  setOriginCodes(codes: readonly string[]): void {
    const normalized = codes.map((code) => code.trim()).filter(Boolean);
    const same = normalized.length === this.stateSig().filters.originCodes.length &&
      normalized.every((code, index) => code === this.stateSig().filters.originCodes[index]);
    if (same) {
      return;
    }
    this.stateSig.update((state) => ({
      ...state,
      filters: { ...state.filters, originScope: 'custom', originCodes: normalized },
    }));
  }

  toggleHsSection(section: string): void {
    this.stateSig.update((state) => {
      const has = state.filters.hsSections.includes(section);
      const hsSections = has
        ? state.filters.hsSections.filter((item) => item !== section)
        : [...state.filters.hsSections, section];
      return {
        ...state,
        filters: { ...state.filters, hsSections },
      };
    });
  }

  toggleCompareMode(): void {
    this.stateSig.update((state) => ({
      ...state,
      filters: {
        ...state.filters,
        compareMode: !state.filters.compareMode,
        compareWith: !state.filters.compareMode ? state.filters.compareWith : null,
      },
    }));
  }

  setCompareWith(period: string | null): void {
    this.stateSig.update((state) => ({
      ...state,
      filters: { ...state.filters, compareWith: period?.trim() || null, compareMode: Boolean(period?.trim()) },
    }));
  }

  selectTimeline(point: string): void {
    this.stateSig.update((state) => ({
      ...state,
      timelinePoint: point,
      filters: { ...state.filters, periodValue: point },
    }));
  }

  toggleTimelinePlayback(): void {
    const playing = !this.stateSig().playing;
    this.stateSig.update((state) => ({
      ...state,
      playing,
    }));
    this.analytics.trackTimelinePlayback(playing, this.stateSig().filters);
  }

  drilldownOrigin(originCode: string): void {
    this.stateSig.update((state) => ({
      ...state,
      filters: {
        ...state.filters,
        originScope: 'custom',
        originCodes: [originCode],
      },
    }));
    this.analytics.trackMapDrilldown(originCode, this.stateSig().filters);
  }

  setActiveTab(tab: ImportationCommodityTab): void {
    if (this.stateSig().activeTab === tab) {
      return;
    }
    this.stateSig.update((state) => ({
      ...state,
      activeTab: tab,
      selectedCommodityId: null,
    }));
  }

  selectCommodity(id: string | null): void {
    this.stateSig.update((state) => ({
      ...state,
      selectedCommodityId: id,
    }));
  }

  createWatchlist(name: string): void {
    if (!this.permissions.canManageWatchlists()) {
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    this.stateSig.update((state) => ({ ...state, collaborationLoading: true }));
    this.api
      .createWatchlist({ name: trimmed, filters: this.stateSig().filters })
      .pipe(takeUntilDestroyed(this.destroyRef), catchError((error) => {
        this.stateSig.update((state) => ({
          ...state,
          collaborationLoading: false,
          collaborationError: (error?.message as string) ?? 'unknown',
        }));
        return of(null);
      }))
      .subscribe((watchlist) => {
        if (!watchlist) {
          return;
        }
        this.analytics.trackWatchlistCreated(trimmed, this.stateSig().filters);
        this.stateSig.update((state) => ({
          ...state,
          collaborationLoading: false,
          watchlists: [...(state.watchlists ?? []), watchlist],
        }));
      });
  }

  scheduleReport(payload: { recipients: readonly string[]; format: 'csv' | 'json' | 'look'; frequency: 'weekly' | 'monthly' | 'quarterly'; notes?: string }): void {
    if (!this.permissions.canScheduleReports()) {
      return;
    }
    this.api
      .scheduleReport({
        period: this.stateSig().filters.periodGranularity,
        recipients: payload.recipients,
        format: payload.format,
        frequency: payload.frequency,
        notes: payload.notes,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.analytics.trackExportRequested(payload.format, this.stateSig().filters);
      });
  }

  requestExport(type: 'csv' | 'json' | 'look'): void {
    if (!this.permissions.canExportData()) {
      return;
    }
    this.analytics.trackExportRequested(type, this.stateSig().filters);
  }

  private restoreFilters(params: ParamMap): ImportationFilters {
    const stored = this.restoreFromStorage();
    const base: ImportationFilters = {
      ...DEFAULT_FILTERS,
      ...stored,
    };
    const originScope = toOriginScope(params.get('originScope'));
    const hsSectionsParam = params.getAll('hsSection');
    const originCodesParam = params.getAll('originCode');
    const compareMode = params.get('compareMode');
    const compareWith = params.get('compareWith');

    return {
      ...base,
      periodGranularity: toGranularity(params.get('period')),
      periodValue: params.get('periodValue') ?? base.periodValue,
      originScope,
      originCodes: originScope === 'custom' && originCodesParam.length ? originCodesParam : base.originCodes,
      hsSections: hsSectionsParam.length ? hsSectionsParam : base.hsSections,
      compareMode: compareMode === 'true' || (compareWith?.trim().length ?? 0) > 0,
      compareWith: compareWith?.trim() || base.compareWith,
    };
  }

  private persistFilters(filters: ImportationFilters): void {
    if (!this.browser) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // ignore storage errors
    }
  }

  private restoreFromStorage(): Partial<ImportationFilters> {
    if (!this.browser) {
      return {};
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw) as Partial<ImportationFilters>;
      return parsed ?? {};
    } catch {
      return {};
    }
  }

  private syncQueryParams(filters: ImportationFilters): void {
    if (!this.router || !this.route) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        period: filters.periodGranularity,
        periodValue: filters.periodValue ?? undefined,
        originScope: filters.originScope,
        originCode: filters.originScope === 'custom' && filters.originCodes.length ? filters.originCodes : undefined,
        hsSection: filters.hsSections.length ? filters.hsSections : undefined,
        compareMode: filters.compareMode ? 'true' : undefined,
        compareWith: filters.compareWith ?? undefined,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private fetchFlows(filters: ImportationFilters): void {
    this.stateSig.update((state) => ({ ...state, flowsLoading: true, flowsError: null }));
    this.api
      .getFlows(filters)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          this.stateSig.update((state) => ({
            ...state,
            flowsLoading: false,
            flowsError: (error?.message as string) ?? 'unknown',
            flows: null,
          }));
          return of(null);
        })
      )
      .subscribe((flows) => {
        if (!flows) {
          return;
        }
        this.stateSig.update((state) => ({
          ...state,
          flows,
          flowsLoading: false,
          flowsError: null,
          timelinePoint: state.timelinePoint ?? flows.timeline[0]?.period ?? null,
        }));
      });
  }

  private fetchCommodities(filters: ImportationFilters): void {
    this.stateSig.update((state) => ({
      ...state,
      commoditiesLoading: true,
      commoditiesError: null,
      riskFlags: [],
    }));
    this.api
      .getCommodities(filters)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          this.stateSig.update((state) => ({
            ...state,
            commoditiesLoading: false,
            commoditiesError: (error?.message as string) ?? 'unknown',
            commodities: null,
          }));
          return of(null);
        })
      )
      .subscribe((collections) => {
        if (!collections) {
          return;
        }
        this.stateSig.update((state) => ({
          ...state,
          commodities: collections,
          commoditiesLoading: false,
          commoditiesError: null,
        }));
      });

    this.api
      .getRiskFlags(filters)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.stateSig.update((state) => ({
            ...state,
            riskFlags: [],
          }));
          return of([] as ImportationRiskFlagDto[]);
        })
      )
      .subscribe((flags) => {
        this.stateSig.update((state) => ({
          ...state,
          riskFlags: flags ?? [],
        }));
      });
  }

  private fetchSuppliers(filters: ImportationFilters): void {
    this.stateSig.update((state) => ({ ...state, suppliersLoading: true, suppliersError: null }));
    this.api
      .getSuppliers(filters)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          if (this.isMissingOptionalResource(error)) {
            return this.optionalResourceFallback({ suppliers: [] } satisfies { suppliers: readonly ImportationSupplierDto[] });
          }
          this.stateSig.update((state) => ({
            ...state,
            suppliersLoading: false,
            suppliersError: this.getErrorMessage(error),
            suppliers: null,
          }));
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.stateSig.update((state) => ({
          ...state,
          suppliers: response.suppliers,
          suppliersLoading: false,
          suppliersError: null,
        }));
      });
  }

  private fetchCollaboration(_filters: ImportationFilters): void {
    if (!this.permissions.canViewCollaboration()) {
      this.stateSig.update((state) => ({
        ...state,
        watchlists: [],
        annotations: [],
        collaborationLoading: false,
        collaborationError: null,
      }));
      return;
    }
    this.stateSig.update((state) => ({ ...state, collaborationLoading: true, collaborationError: null }));
    this.api
      .getAnnotations()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          if (this.isMissingOptionalResource(error)) {
            return this.optionalResourceFallback({ annotations: [] } satisfies { annotations: readonly ImportationAnnotationDto[] });
          }
          this.stateSig.update((state) => ({
            ...state,
            collaborationError: this.getErrorMessage(error),
          }));
          return of(null);
        })
      )
      .subscribe((annotations) => {
        this.stateSig.update((state) => ({
          ...state,
          annotations: annotations?.annotations ?? [],
        }));
      });

    if (this.permissions.canManageWatchlists()) {
      this.api
        .getWatchlists()
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          catchError((error) => {
            if (this.isMissingOptionalResource(error)) {
              return this.optionalResourceFallback({ watchlists: [] } satisfies { watchlists: readonly ImportationWatchlistDto[] });
            }
            this.stateSig.update((state) => ({
              ...state,
              collaborationLoading: false,
              collaborationError: this.getErrorMessage(error),
            }));
            return of(null);
          })
        )
        .subscribe((watchlists) => {
          this.stateSig.update((state) => ({
            ...state,
            watchlists: watchlists?.watchlists ?? [],
            collaborationLoading: false,
            collaborationError: null,
          }));
        });
    } else {
      this.stateSig.update((state) => ({
        ...state,
        watchlists: [],
        collaborationLoading: false,
        collaborationError: null,
      }));
    }
  }

  private fetchKnowledge(): void {
    const lang = this.translate.currentLang || this.translate.defaultLang || 'fr';
    this.stateSig.update((state) => ({ ...state, knowledgeLoading: true, knowledgeError: null }));
    this.api
      .getKnowledgeBase(lang)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          if (this.isMissingOptionalResource(error)) {
            return this.optionalResourceFallback({ articles: [], cta: null } satisfies ImportationKnowledgeResponseDto);
          }
          this.stateSig.update((state) => ({
            ...state,
            knowledgeLoading: false,
            knowledgeError: this.getErrorMessage(error),
            knowledge: null,
          }));
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.stateSig.update((state) => ({
          ...state,
          knowledge: response,
          knowledgeLoading: false,
          knowledgeError: null,
        }));
      });
  }

  private isMissingOptionalResource(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 404;
  }

  private optionalResourceFallback<T>(fallback: T): Observable<T> {
    return of(fallback);
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown';
  }
}
