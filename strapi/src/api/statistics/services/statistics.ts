import { factories } from '@strapi/strapi';

interface InsightEntity {
  id: number;
  attributes?: Record<string, unknown> | null;
}

interface StatisticFilters {
  scope?: string;
  intrant?: string;
  period?: string;
  province?: string;
  country?: string;
}

interface StatisticsPayload {
  data: {
    summaries: Array<Record<string, unknown>>;
    insights: Array<Record<string, unknown>>;
    snapshot: Record<string, unknown> | null;
    availablePeriods: string[];
    availableProvinces: string[];
    availableCountries: string[];
  };
  meta: {
    filters: {
      scope: string | null;
      intrant: string | null;
      period: string | null;
      province: string | null;
      country: string | null;
    };
  };
}

const parseDecimal = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
};

const parseEnum = (value: unknown, allowed: readonly string[], fallback: string | null = null) => {
  if (typeof value === 'string' && allowed.includes(value)) {
    return value;
  }
  return fallback;
};

const uniq = (values: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      seen.add(value.trim());
    }
  }
  return Array.from(seen).sort();
};

const summaryKinds = ['summary'] as const;
const insightKinds = ['insight'] as const;
const scopeValues = ['interprovincial', 'international', 'all'] as const;
const intrantValues = ['energy', 'agri-food', 'manufacturing', 'digital-services', 'all'] as const;
const countryValues = ['CA', 'DE', 'FR', 'IT', 'JP', 'UK', 'US'] as const;

const mapInsight = (entity: InsightEntity) => {
  if (!entity?.id) {
    return null;
  }
  const attrs = (entity.attributes ?? {}) as Record<string, unknown>;
  const scope = parseEnum(attrs.scope, scopeValues, 'all');
  const intrant = parseEnum(attrs.intrant, intrantValues, 'all');
  const kind = parseEnum(attrs.kind, [...summaryKinds, ...insightKinds], 'insight');
  const value = parseDecimal(attrs.value);
  const change = parseDecimal(attrs.change);
  const unitKey = typeof attrs.unitKey === 'string' ? attrs.unitKey : null;
  const titleKey = typeof attrs.titleKey === 'string' ? attrs.titleKey : null;
  const descriptionKey = typeof attrs.descriptionKey === 'string' ? attrs.descriptionKey : null;
  const period = typeof attrs.period === 'string' ? attrs.period : null;
  const province = typeof attrs.province === 'string' ? attrs.province : null;
  const country = parseEnum(attrs.country, countryValues);
  const slug = typeof attrs.slug === 'string' ? attrs.slug : null;
  const ordinal = typeof attrs.ordinal === 'number' ? attrs.ordinal : 0;
  const updatedAt = typeof attrs.updatedAt === 'string' ? attrs.updatedAt : null;

  if (!titleKey || !descriptionKey) {
    return null;
  }

  return {
    id: entity.id,
    slug,
    scope,
    intrant,
    kind,
    value,
    change,
    unitKey,
    titleKey,
    descriptionKey,
    period,
    province,
    country,
    ordinal,
    updatedAt,
  } as const;
};

const filterBy = (
  entries: ReturnType<typeof mapInsight>[],
  filters: StatisticFilters
) => {
  return entries.filter((entry) => {
    if (!entry) {
      return false;
    }
    if (filters.scope && filters.scope !== 'all' && entry.scope !== filters.scope && entry.scope !== 'all') {
      return false;
    }
    if (filters.intrant && filters.intrant !== 'all' && entry.intrant !== filters.intrant && entry.intrant !== 'all') {
      return false;
    }
    if (filters.period && entry.period !== filters.period) {
      return false;
    }
    if (filters.province && entry.province !== filters.province) {
      return false;
    }
    if (filters.country && entry.country !== filters.country) {
      return false;
    }
    return true;
  });
};

export default factories.createCoreService('api::statistic-insight.statistic-insight', ({ strapi }) => ({
  async fetch(filters: StatisticFilters): Promise<StatisticsPayload> {
    const scope = parseEnum(filters.scope, scopeValues, null);
    const intrant = parseEnum(filters.intrant, intrantValues, null);
    const period = typeof filters.period === 'string' ? filters.period : null;
    const province = typeof filters.province === 'string' ? filters.province : null;
    const country = parseEnum(filters.country, countryValues, null);

    const baseFilters: Record<string, unknown> = {};
    if (scope && scope !== 'all') {
      baseFilters.scope = scope;
    }
    if (intrant && intrant !== 'all') {
      baseFilters.intrant = intrant;
    }
    if (country) {
      baseFilters.country = country;
    }

    const entities = await strapi.entityService.findMany('api::statistic-insight.statistic-insight', {
      filters: baseFilters,
      sort: [{ ordinal: 'asc' }, { updatedAt: 'desc' }],
    });

    const mapped = Array.isArray(entities)
      ? entities
          .map((entity) => mapInsight(entity as InsightEntity))
          .filter((entry): entry is NonNullable<ReturnType<typeof mapInsight>> => Boolean(entry))
      : [];

    const availablePeriods = uniq(mapped.map((entry) => entry.period));
    const availableProvinces = uniq(mapped.map((entry) => entry.province));
    const availableCountries = countryValues.filter((code) =>
      mapped.some((entry) => entry.country === code)
    );

    const narrowed = filterBy(mapped, {
      scope: scope ?? undefined,
      intrant: intrant ?? undefined,
      period,
      province,
      country: country ?? undefined,
    });

    const summaries = narrowed
      .filter((entry) => summaryKinds.includes(entry.kind as (typeof summaryKinds)[number]))
      .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0) || (a.id ?? 0) - (b.id ?? 0))
      .map((entry) => ({
        id: entry.id,
        slug: entry.slug,
        scope: entry.scope === 'all' ? scope ?? 'all' : entry.scope,
        intrant: entry.intrant === 'all' ? intrant ?? 'all' : entry.intrant,
        value: entry.value,
        change: entry.change,
        unitKey: entry.unitKey,
        titleKey: entry.titleKey,
        descriptionKey: entry.descriptionKey,
        period: entry.period,
        province: entry.province,
        country: entry.country,
      }));

    const insights = narrowed
      .filter((entry) => insightKinds.includes(entry.kind as (typeof insightKinds)[number]))
      .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0) || (a.id ?? 0) - (b.id ?? 0))
      .map((entry) => ({
        id: entry.id,
        slug: entry.slug,
        scope: entry.scope,
        intrant: entry.intrant,
        titleKey: entry.titleKey,
        descriptionKey: entry.descriptionKey,
        period: entry.period,
        province: entry.province,
        country: entry.country,
      }));

    const totalFlows = summaries.reduce((total, entry) => total + (entry.value ?? 0), 0);
    const activeCorridors = new Set(
      summaries
        .map((entry) => entry.province)
        .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
    ).size;

    const latestUpdatedAt = mapped
      .map((entry) => entry.updatedAt)
      .filter((value): value is string => typeof value === 'string')
      .sort()
      .pop();

    const snapshot = summaries.length
      ? {
          totalFlows,
          totalFlowsUnitKey: summaries[0]?.unitKey ?? null,
          activeCorridors,
          updatedAt: latestUpdatedAt ?? new Date().toISOString(),
        }
      : null;

    return {
      data: {
        summaries,
        insights,
        snapshot,
        availablePeriods,
        availableProvinces,
        availableCountries,
      },
      meta: {
        filters: {
          scope: scope,
          intrant: intrant,
          period,
          province,
          country,
        },
      },
    };
  },
}));
