import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  Injectable,
  PLATFORM_ID,
  TransferState,
  inject,
  makeStateKey,
} from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';

import { API_URL } from '../config/environment.tokens';
import { createSilentHttpContext } from '../http/error.interceptor.tokens';
import { CountryCode, G7_COUNTRY_CODES, isCountryCode } from '../models/country';
import {
  StatisticsFilters,
  StatisticsInsight,
  StatisticsIntrant,
  StatisticsPayload,
  StatisticsScope,
  StatisticsSnapshot,
  StatisticsSummary,
} from '../models/statistics';

interface StatisticsApiResponse {
  data: {
    summaries: StatisticsSummary[];
    insights: StatisticsInsight[];
    snapshot: StatisticsSnapshot | null;
    availablePeriods: string[];
    availableProvinces: string[];
    availableCountries: string[];
  };
  meta?: {
    filters?: Partial<StatisticsFilters>;
  };
}

type FallbackInsight =
  | (StatisticsSummary & { kind: 'summary' })
  | (StatisticsInsight & {
      kind: 'insight';
      value?: number | null;
      change?: number | null;
      unitKey?: string | null;
    });

const DEFAULT_FILTERS: StatisticsFilters = {
  scope: 'interprovincial',
  intrant: 'all',
  period: null,
  province: null,
  country: null,
};

const FALLBACK_ENTRIES: FallbackInsight[] = [
  {
    id: 1,
    slug: 'energy-flow',
    scope: 'interprovincial',
    intrant: 'energy',
    value: 620,
    change: 8,
    unitKey: 'pages.statistics.units.petajoules',
    titleKey: 'pages.statistics.summaries.energyFlow.title',
    descriptionKey: 'pages.statistics.summaries.energyFlow.description',
    period: '2024-Q2',
    province: 'CA-AB',
    country: 'CA',
    kind: 'summary',
  },
  {
    id: 2,
    slug: 'clean-tech-demand',
    scope: 'interprovincial',
    intrant: 'manufacturing',
    value: 92,
    change: 5,
    unitKey: 'pages.statistics.units.projects',
    titleKey: 'pages.statistics.summaries.cleanTechDemand.title',
    descriptionKey: 'pages.statistics.summaries.cleanTechDemand.description',
    period: '2024-Q2',
    province: 'CA-QC',
    country: 'CA',
    kind: 'summary',
  },
  {
    id: 3,
    slug: 'agri-value',
    scope: 'interprovincial',
    intrant: 'agri-food',
    value: 41,
    change: 3,
    unitKey: 'pages.statistics.units.billionCAD',
    titleKey: 'pages.statistics.summaries.agriValue.title',
    descriptionKey: 'pages.statistics.summaries.agriValue.description',
    period: '2024-Q2',
    province: 'CA-SK',
    country: 'CA',
    kind: 'summary',
  },
  {
    id: 4,
    slug: 'energy-flow-global',
    scope: 'international',
    intrant: 'energy',
    value: 510,
    change: 6,
    unitKey: 'pages.statistics.units.petajoules',
    titleKey: 'pages.statistics.summaries.energyFlowGlobal.title',
    descriptionKey: 'pages.statistics.summaries.energyFlowGlobal.description',
    period: '2024-Q1',
    province: 'CA-NL',
    country: 'CA',
    kind: 'summary',
  },
  {
    id: 5,
    slug: 'services-exports',
    scope: 'international',
    intrant: 'digital-services',
    value: 128,
    change: 4,
    unitKey: 'pages.statistics.units.billionCAD',
    titleKey: 'pages.statistics.summaries.servicesExports.title',
    descriptionKey: 'pages.statistics.summaries.servicesExports.description',
    period: '2024-Q1',
    province: 'CA-ON',
    country: 'CA',
    kind: 'summary',
  },
  {
    id: 6,
    slug: 'agri-global-share',
    scope: 'international',
    intrant: 'agri-food',
    value: 27,
    change: -2,
    unitKey: 'pages.statistics.units.marketShare',
    titleKey: 'pages.statistics.summaries.agriGlobalShare.title',
    descriptionKey: 'pages.statistics.summaries.agriGlobalShare.description',
    period: '2024-Q1',
    province: 'CA-MB',
    country: 'CA',
    kind: 'summary',
  },
  {
    id: 7,
    slug: 'digital-services',
    scope: 'interprovincial',
    intrant: 'digital-services',
    value: 74,
    change: 11,
    unitKey: 'pages.statistics.units.billionCAD',
    titleKey: 'pages.statistics.summaries.digitalServices.title',
    descriptionKey: 'pages.statistics.summaries.digitalServices.description',
    period: '2024-Q3',
    province: 'CA-BC',
    country: 'CA',
    kind: 'summary',
  },
  {
    id: 8,
    slug: 'manufacturing-alliances',
    scope: 'international',
    intrant: 'manufacturing',
    value: 36,
    change: 9,
    unitKey: 'pages.statistics.units.alliances',
    titleKey: 'pages.statistics.summaries.manufacturingAlliances.title',
    descriptionKey: 'pages.statistics.summaries.manufacturingAlliances.description',
    period: '2024-Q3',
    province: 'CA-ON',
    country: 'CA',
    kind: 'summary',
  },
  {
    id: 9,
    slug: 'agri-resilience',
    scope: 'interprovincial',
    intrant: 'agri-food',
    value: 18,
    change: 7,
    unitKey: 'pages.statistics.units.cooperatives',
    titleKey: 'pages.statistics.summaries.agriResilience.title',
    descriptionKey: 'pages.statistics.summaries.agriResilience.description',
    period: '2024-Q3',
    province: 'CA-QC',
    country: 'CA',
    kind: 'summary',
  },
  {
    id: 10,
    slug: 'g7-us-investment',
    scope: 'international',
    intrant: 'all',
    value: 540,
    change: 6,
    unitKey: 'pages.statistics.units.billionCAD',
    titleKey: 'pages.statistics.countries.us.title',
    descriptionKey: 'pages.statistics.countries.us.description',
    period: '2024-Q2',
    province: null,
    country: 'US',
    kind: 'summary',
  },
  {
    id: 11,
    slug: 'g7-uk-clean-energy',
    scope: 'international',
    intrant: 'energy',
    value: 215,
    change: 4,
    unitKey: 'pages.statistics.units.billionCAD',
    titleKey: 'pages.statistics.countries.uk.title',
    descriptionKey: 'pages.statistics.countries.uk.description',
    period: '2024-Q2',
    province: null,
    country: 'UK',
    kind: 'summary',
  },
  {
    id: 12,
    slug: 'g7-fr-innovation',
    scope: 'international',
    intrant: 'manufacturing',
    value: 198,
    change: 5,
    unitKey: 'pages.statistics.units.billionCAD',
    titleKey: 'pages.statistics.countries.fr.title',
    descriptionKey: 'pages.statistics.countries.fr.description',
    period: '2024-Q1',
    province: null,
    country: 'FR',
    kind: 'summary',
  },
  {
    id: 13,
    slug: 'g7-de-hydrogen',
    scope: 'international',
    intrant: 'energy',
    value: 260,
    change: 7,
    unitKey: 'pages.statistics.units.billionCAD',
    titleKey: 'pages.statistics.countries.de.title',
    descriptionKey: 'pages.statistics.countries.de.description',
    period: '2024-Q1',
    province: null,
    country: 'DE',
    kind: 'summary',
  },
  {
    id: 14,
    slug: 'g7-it-circular',
    scope: 'international',
    intrant: 'digital-services',
    value: 142,
    change: 3,
    unitKey: 'pages.statistics.units.billionCAD',
    titleKey: 'pages.statistics.countries.it.title',
    descriptionKey: 'pages.statistics.countries.it.description',
    period: '2024-Q2',
    province: null,
    country: 'IT',
    kind: 'summary',
  },
  {
    id: 15,
    slug: 'g7-jp-advanced',
    scope: 'international',
    intrant: 'manufacturing',
    value: 310,
    change: 8,
    unitKey: 'pages.statistics.units.billionCAD',
    titleKey: 'pages.statistics.countries.jp.title',
    descriptionKey: 'pages.statistics.countries.jp.description',
    period: '2024-Q2',
    province: null,
    country: 'JP',
    kind: 'summary',
  },
  {
    id: 16,
    slug: 'partnership-low-carbon',
    scope: 'all',
    intrant: 'energy',
    titleKey: 'pages.statistics.sections.partnerships.cards.lowCarbon.title',
    descriptionKey: 'pages.statistics.sections.partnerships.cards.lowCarbon.body',
    period: null,
    province: null,
    country: 'CA',
    kind: 'insight',
  },
  {
    id: 17,
    slug: 'partnership-innovation',
    scope: 'all',
    intrant: 'manufacturing',
    titleKey: 'pages.statistics.sections.partnerships.cards.innovation.title',
    descriptionKey: 'pages.statistics.sections.partnerships.cards.innovation.body',
    period: null,
    province: null,
    country: 'CA',
    kind: 'insight',
  },
  {
    id: 18,
    slug: 'partnership-skills',
    scope: 'all',
    intrant: 'digital-services',
    titleKey: 'pages.statistics.sections.partnerships.cards.skills.title',
    descriptionKey: 'pages.statistics.sections.partnerships.cards.skills.body',
    period: null,
    province: null,
    country: 'CA',
    kind: 'insight',
  },
  {
    id: 19,
    slug: 'partnership-infrastructure',
    scope: 'all',
    intrant: 'manufacturing',
    titleKey: 'pages.statistics.sections.partnerships.cards.infrastructure.title',
    descriptionKey: 'pages.statistics.sections.partnerships.cards.infrastructure.body',
    period: null,
    province: null,
    country: 'CA',
    kind: 'insight',
  },
  {
    id: 20,
    slug: 'partnership-sme',
    scope: 'all',
    intrant: 'digital-services',
    titleKey: 'pages.statistics.sections.partnerships.cards.sme.title',
    descriptionKey: 'pages.statistics.sections.partnerships.cards.sme.body',
    period: null,
    province: null,
    country: 'CA',
    kind: 'insight',
  },
  {
    id: 21,
    slug: 'partnership-digital',
    scope: 'all',
    intrant: 'digital-services',
    titleKey: 'pages.statistics.sections.partnerships.cards.digital.title',
    descriptionKey: 'pages.statistics.sections.partnerships.cards.digital.body',
    period: null,
    province: null,
    country: 'CA',
    kind: 'insight',
  },
];

const AVAILABLE_SCOPE_VALUES: StatisticsScope[] = ['interprovincial', 'international', 'all'];
const AVAILABLE_INTRANTS: StatisticsIntrant[] = ['all', 'energy', 'agri-food', 'manufacturing', 'digital-services'];

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « core/services ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Statistics ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns StatisticsService gérée par le framework.
 */
export class StatisticsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL, { optional: true }) ?? '';
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly cache = new Map<string, Observable<StatisticsPayload>>();

  /**
   * Contexte : Used by the statistics dashboard to retrieve KPI snapshots based on the current filters.
   * Raison d’être : Applies caching, SSR transfer state and fallback data to deliver resilient statistics.
   * @param filters Optional subset of filters overriding defaults.
   * @returns Observable emitting the resolved statistics payload.
   */
  fetch(filters: Partial<StatisticsFilters> = {}): Observable<StatisticsPayload> {
    const resolvedFilters = this.normalizeFilters(filters);
    const cacheKey = this.composeStateKey(resolvedFilters);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const stateKey = makeStateKey<StatisticsPayload>(cacheKey);
    if (this.transferState.hasKey(stateKey)) {
      const payload = this.transferState.get(stateKey, this.emptyPayload(resolvedFilters));
      const hydratedPayload: StatisticsPayload = {
        ...payload,
        isFallback: payload.isFallback ?? false,
      };
      if (this.isBrowser) {
        this.transferState.remove(stateKey);
      }
      const stream$ = of(hydratedPayload);
      this.cache.set(cacheKey, stream$);
      return stream$;
    }

    const params = this.composeParams(resolvedFilters);
    const url = this.composeUrl('/api/statistics');

    const request$ = this.http
      .get<StatisticsApiResponse>(url, { params, context: createSilentHttpContext() })
      .pipe(
        map((response) => this.mapResponse(response, resolvedFilters)),
        catchError(() => of(this.fallbackPayload(resolvedFilters))),
        tap((payload) => {
          if (!this.isBrowser) {
            this.transferState.set(stateKey, payload);
          }
        }),
        shareReplay(1)
      );

    this.cache.set(cacheKey, request$);
    return request$;
  }

  private composeUrl(path: string): string {
    const base = this.apiUrl.replace(/\/$/, '');
    return `${base}${path}`;
  }
  private composeParams(filters: StatisticsFilters): HttpParams {
    let params = new HttpParams();
    if (filters.scope && filters.scope !== 'all') {
      params = params.set('scope', filters.scope);
    }
    if (filters.intrant && filters.intrant !== 'all') {
      params = params.set('intrant', filters.intrant);
    }
    if (filters.period) {
      params = params.set('period', filters.period);
    }
    if (filters.province) {
      params = params.set('province', filters.province);
    }
    if (filters.country) {
      params = params.set('country', filters.country);
    }
    return params;
  }

  private mapResponse(response: StatisticsApiResponse, filters: StatisticsFilters): StatisticsPayload {
    const data = response?.data;
    const summaries = Array.isArray(data?.summaries) ? data.summaries : [];
    const insights = Array.isArray(data?.insights) ? data.insights : [];
    const snapshot = data?.snapshot ?? null;
    const availablePeriods = Array.isArray(data?.availablePeriods) ? [...new Set(data.availablePeriods)] : [];
    const availableProvinces = Array.isArray(data?.availableProvinces) ? [...new Set(data.availableProvinces)] : [];
    const availableCountries = Array.isArray(data?.availableCountries)
      ? this.orderCountries(data.availableCountries)
      : [];

    const metaFilters = response?.meta?.filters ?? {};

    return {
      summaries,
      insights,
      snapshot,
      availablePeriods,
      availableProvinces,
      availableCountries,
      filters: {
        scope: this.ensureScope(metaFilters.scope ?? filters.scope),
        intrant: this.ensureIntrant(metaFilters.intrant ?? filters.intrant),
        period: metaFilters.period ?? filters.period ?? null,
        province: metaFilters.province ?? filters.province ?? null,
        country: this.ensureCountry(metaFilters.country ?? filters.country),
      },
      isFallback: false,
    };
  }

  private normalizeFilters(filters: Partial<StatisticsFilters>): StatisticsFilters {
    const scope = this.ensureScope(filters.scope ?? DEFAULT_FILTERS.scope);
    const intrant = this.ensureIntrant(filters.intrant ?? DEFAULT_FILTERS.intrant);
    const period = typeof filters.period === 'string' && filters.period.trim() ? filters.period : null;
    const province = typeof filters.province === 'string' && filters.province.trim() ? filters.province : null;
    const country = this.ensureCountry(filters.country ?? DEFAULT_FILTERS.country);
    return { scope, intrant, period, province, country };
  }

  private ensureScope(scope: unknown): StatisticsScope {
    return AVAILABLE_SCOPE_VALUES.includes(scope as StatisticsScope) ? (scope as StatisticsScope) : 'interprovincial';
  }

  private ensureIntrant(intrant: unknown): StatisticsIntrant {
    return AVAILABLE_INTRANTS.includes(intrant as StatisticsIntrant) ? (intrant as StatisticsIntrant) : 'all';
  }

  private ensureCountry(country: unknown): CountryCode | null {
    if (!isCountryCode(country)) {
      return null;
    }
    const normalized = (country as string).trim().toUpperCase();
    return normalized as CountryCode;
  }

  private orderCountries(values: readonly (string | null | undefined)[]): CountryCode[] {
    const seen = new Set<CountryCode>();
    for (const value of values) {
      const normalized = this.ensureCountry(value);
      if (normalized) {
        seen.add(normalized);
      }
    }
    return G7_COUNTRY_CODES.filter((code) => seen.has(code));
  }

  private composeStateKey(filters: StatisticsFilters): string {
    return `STATISTICS::${filters.scope}::${filters.intrant}::${filters.period ?? 'all'}::${filters.province ?? 'all'}::${
      filters.country ?? 'all'
    }`;
  }

  private emptyPayload(filters: StatisticsFilters): StatisticsPayload {
    return {
      summaries: [],
      insights: [],
      snapshot: null,
      availablePeriods: [],
      availableProvinces: [],
      availableCountries: [] as CountryCode[],
      filters,
      isFallback: false,
    };
  }

  private fallbackPayload(filters: StatisticsFilters): StatisticsPayload {
    const baseEntries = FALLBACK_ENTRIES.filter((entry) => this.matches(entry, filters.scope, filters.intrant));
    const availablePeriods = this.unique(baseEntries.map((entry) => entry.period));
    const availableProvinces = this.unique(baseEntries.map((entry) => entry.province));
    const availableCountries = this.orderCountries(baseEntries.map((entry) => entry.country ?? null));

    const narrowed = baseEntries.filter(
      (entry) =>
        this.matchesPeriod(entry, filters.period) &&
        this.matchesProvince(entry, filters.province) &&
        this.matchesCountry(entry, filters.country)
    );

    const summaries = narrowed
      .filter((entry): entry is StatisticsSummary & { kind: 'summary' } => entry.kind === 'summary')
      .map((entry) => ({
        id: entry.id,
        slug: entry.slug,
        scope: entry.scope,
        intrant: entry.intrant,
        value: entry.value ?? null,
        change: entry.change ?? null,
        unitKey: entry.unitKey ?? null,
        titleKey: entry.titleKey,
        descriptionKey: entry.descriptionKey,
        period: entry.period ?? null,
        province: entry.province ?? null,
        country: entry.country ?? null,
      }));

    const insights = narrowed
      .filter((entry): entry is StatisticsInsight & { kind: 'insight' } => entry.kind === 'insight')
      .map((entry) => ({
        id: entry.id,
        slug: entry.slug,
        scope: entry.scope,
        intrant: entry.intrant,
        titleKey: entry.titleKey,
        descriptionKey: entry.descriptionKey,
        period: entry.period ?? null,
        province: entry.province ?? null,
        country: entry.country ?? null,
      }));

    const snapshot = this.computeSnapshot(summaries);

    return {
      summaries,
      insights,
      snapshot,
      availablePeriods,
      availableProvinces,
      availableCountries,
      filters,
      isFallback: true,
    };
  }

  private matches(entry: FallbackInsight, scope: StatisticsScope, intrant: StatisticsIntrant): boolean {
    const scopeMatch = entry.scope === 'all' || scope === 'all' || entry.scope === scope;
    const intrantMatch = entry.intrant === 'all' || intrant === 'all' || entry.intrant === intrant;
    return scopeMatch && intrantMatch;
  }

  private matchesPeriod(entry: FallbackInsight, period: string | null): boolean {
    if (!period) {
      return true;
    }
    return entry.period === period;
  }

  private matchesProvince(entry: FallbackInsight, province: string | null): boolean {
    if (!province) {
      return true;
    }
    return entry.province === province;
  }

  private matchesCountry(entry: FallbackInsight, country: CountryCode | null): boolean {
    if (!country) {
      return true;
    }
    return entry.country === country;
  }

  private unique(values: Array<string | null | undefined>): string[] {
    const seen = new Set<string>();
    for (const value of values) {
      if (typeof value === 'string' && value.trim() !== '') {
        seen.add(value.trim());
      }
    }
    return Array.from(seen).sort();
  }

  private computeSnapshot(summaries: readonly StatisticsSummary[]): StatisticsSnapshot | null {
    if (!summaries.length) {
      return null;
    }
    const totalFlows = summaries.reduce((total, entry) => total + (entry.value ?? 0), 0);
    const unitKey = summaries.find((entry) => entry.unitKey)?.unitKey ?? null;
    const activeCorridors = new Set(
      summaries
        .map((entry) => entry.province)
        .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
    ).size;
    return {
      totalFlows,
      totalFlowsUnitKey: unitKey,
      activeCorridors,
      updatedAt: new Date().toISOString(),
    };
  }
}
