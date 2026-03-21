import type { Core } from '@strapi/strapi';

const IMPORT_WATCHLIST_UID = 'api::import-watchlist.import-watchlist' as any;
const IMPORT_ANNOTATION_UID = 'api::import-annotation.import-annotation' as any;
const IMPORT_REPORT_SCHEDULE_UID = 'api::import-report-schedule.import-report-schedule' as any;

type ImportationGranularity = 'month' | 'quarter' | 'year';
type ImportationOriginScope = 'global' | 'g7' | 'usmca' | 'european_union' | 'indo_pacific' | 'custom';

interface ImportationQuery {
  readonly period?: unknown;
  readonly periodValue?: unknown;
  readonly originScope?: unknown;
  readonly originCodes?: unknown;
  readonly hsSections?: unknown;
  readonly lang?: unknown;
  readonly compareMode?: unknown;
  readonly compareWith?: unknown;
}

interface ImportationFilters {
  readonly periodGranularity: ImportationGranularity;
  readonly periodValue: string | null;
  readonly originScope: ImportationOriginScope;
  readonly originCodes: readonly string[];
  readonly hsSections: readonly string[];
  readonly compareMode: boolean;
  readonly compareWith: string | null;
}

interface ImportationAnnotationRecord {
  readonly id: string;
  readonly author: string;
  readonly authorAvatarUrl?: string;
  readonly excerpt: string;
  readonly createdAt: string;
  readonly relatedCommodityId?: string;
  readonly relatedOriginCode?: string;
}

interface ImportationWatchlistRecord {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly updatedAt: string;
  readonly filters: ImportationFilters;
}

interface ImportWatchlistEntity {
  readonly id: number | string;
  readonly name?: unknown;
  readonly owner?: unknown;
  readonly filters?: unknown;
  readonly updatedAt?: unknown;
}

interface ImportAnnotationEntity {
  readonly id: number | string;
  readonly author?: unknown;
  readonly authorAvatarUrl?: unknown;
  readonly excerpt?: unknown;
  readonly relatedCommodityId?: unknown;
  readonly relatedOriginCode?: unknown;
  readonly createdAt?: unknown;
}

interface ImportReportScheduleEntity {
  readonly id: number | string;
  readonly createdAt?: unknown;
}

interface ImportationWatchlistPayload {
  readonly name?: unknown;
  readonly filters?: unknown;
}

interface ImportationWatchlistUpdatePayload {
  readonly name?: unknown;
  readonly filters?: unknown;
}

interface ImportationReportSchedulePayload {
  readonly period?: unknown;
  readonly recipients?: unknown;
  readonly format?: unknown;
  readonly frequency?: unknown;
  readonly notes?: unknown;
}

interface ImportationFlowPoint {
  readonly period: string;
  readonly label: string;
  readonly totalValue: number;
  readonly yoyDelta: number | null;
  readonly isProjected?: boolean;
}

interface ImportationFlowCorridor {
  readonly target: string;
  readonly value: number;
  readonly delta: number | null;
}

interface ImportationFlowRecord {
  readonly originCode: string;
  readonly originName: string;
  readonly scopeTags: readonly Exclude<ImportationOriginScope, 'custom' | 'global'>[];
  readonly value: number;
  readonly yoyDelta: number | null;
  readonly coordinate?: readonly [number, number];
  readonly corridors: readonly ImportationFlowCorridor[];
}

interface ImportationCommodityRecord {
  readonly id: string;
  readonly hsCode: string;
  readonly hsSection: string;
  readonly label: string;
  readonly originCode: string;
  readonly value: number;
  readonly yoyDelta: number | null;
  readonly riskScore: number | null;
  readonly sparkline: readonly number[];
  readonly flags: readonly string[];
}

interface ImportationRiskFlagRecord {
  readonly id: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly title: string;
  readonly description: string;
  readonly recommendedAction?: string;
  readonly relatedCommodityId?: string;
}

interface ImportationSupplierRecord {
  readonly id: string;
  readonly name: string;
  readonly dependencyScore: number | null;
  readonly diversificationScore: number | null;
  readonly reliability: number | null;
  readonly country: string;
  readonly originCode: string;
  readonly lastReviewed: string | null;
  readonly recommendation: string | null;
}

interface ImportationKnowledgeResponse {
  readonly articles: readonly {
    id: string;
    title: string;
    summary: string;
    publishedAt: string;
    link: string;
    tag: string;
    thumbnailUrl?: string;
  }[];
  readonly cta: {
    id: string;
    title: string;
    subtitle: string;
    actionLabel: string;
    actionLink: string;
  } | null;
}

interface ImportationScheduleResponse {
  readonly scheduled: true;
  readonly reportId: string;
  readonly scheduledAt: string;
}

const SCOPE_MEMBERS: Record<Exclude<ImportationOriginScope, 'custom'>, readonly string[]> = {
  global: ['US', 'DE', 'JP', 'KR', 'MX'],
  g7: ['US', 'DE', 'JP'],
  usmca: ['US', 'MX'],
  european_union: ['DE'],
  indo_pacific: ['JP', 'KR'],
};

const GRANULARITY_FACTORS: Record<ImportationGranularity, number> = {
  month: 1,
  quarter: 3.15,
  year: 12.6,
};

const FLOW_TIMELINES: Record<ImportationGranularity, readonly ImportationFlowPoint[]> = {
  month: [
    { period: '2026-03', label: 'Mar 2026', totalValue: 2480000000, yoyDelta: 4.1 },
    { period: '2026-02', label: 'Feb 2026', totalValue: 2415000000, yoyDelta: 3.2 },
    { period: '2026-01', label: 'Jan 2026', totalValue: 2380000000, yoyDelta: 2.4 },
    { period: '2025-12', label: 'Dec 2025', totalValue: 2290000000, yoyDelta: -0.8, isProjected: true },
  ],
  quarter: [
    { period: '2026-Q1', label: 'Q1 2026', totalValue: 7440000000, yoyDelta: 4.8 },
    { period: '2025-Q4', label: 'Q4 2025', totalValue: 7025000000, yoyDelta: 2.6 },
    { period: '2025-Q3', label: 'Q3 2025', totalValue: 6890000000, yoyDelta: 1.7 },
    { period: '2025-Q2', label: 'Q2 2025', totalValue: 6710000000, yoyDelta: -0.4 },
  ],
  year: [
    { period: '2026', label: '2026', totalValue: 29760000000, yoyDelta: 5.2 },
    { period: '2025', label: '2025', totalValue: 28100000000, yoyDelta: 3.1 },
    { period: '2024', label: '2024', totalValue: 26900000000, yoyDelta: 1.4 },
    { period: '2023', label: '2023', totalValue: 25500000000, yoyDelta: -0.9 },
  ],
};

const FLOWS: readonly ImportationFlowRecord[] = [
  {
    originCode: 'US',
    originName: 'United States',
    scopeTags: ['g7', 'usmca'],
    value: 1180000000,
    yoyDelta: 2.8,
    coordinate: [38.9, -77.0],
    corridors: [
      { target: 'ON', value: 420000000, delta: 1.7 },
      { target: 'QC', value: 285000000, delta: 2.1 },
      { target: 'BC', value: 130000000, delta: -0.6 },
    ],
  },
  {
    originCode: 'DE',
    originName: 'Germany',
    scopeTags: ['g7', 'european_union'],
    value: 346000000,
    yoyDelta: 5.6,
    coordinate: [52.5, 13.4],
    corridors: [
      { target: 'ON', value: 102000000, delta: 3.4 },
      { target: 'QC', value: 91000000, delta: 2.8 },
    ],
  },
  {
    originCode: 'JP',
    originName: 'Japan',
    scopeTags: ['g7', 'indo_pacific'],
    value: 292000000,
    yoyDelta: -1.9,
    coordinate: [35.7, 139.7],
    corridors: [
      { target: 'BC', value: 164000000, delta: -2.5 },
      { target: 'AB', value: 47000000, delta: 0.9 },
    ],
  },
  {
    originCode: 'KR',
    originName: 'South Korea',
    scopeTags: ['indo_pacific'],
    value: 219000000,
    yoyDelta: 7.4,
    coordinate: [37.5, 126.9],
    corridors: [{ target: 'BC', value: 120000000, delta: 5.2 }],
  },
  {
    originCode: 'MX',
    originName: 'Mexico',
    scopeTags: ['usmca'],
    value: 188000000,
    yoyDelta: 4.9,
    coordinate: [19.4, -99.1],
    corridors: [
      { target: 'ON', value: 74000000, delta: 3.1 },
      { target: 'QC', value: 36000000, delta: 2.2 },
    ],
  },
];

const COMMODITIES: readonly ImportationCommodityRecord[] = [
  {
    id: 'pharma-active-ingredients',
    hsCode: '2933',
    hsSection: '29',
    label: 'Active pharmaceutical ingredients',
    originCode: 'US',
    value: 486000000,
    yoyDelta: 6.4,
    riskScore: 3.2,
    sparkline: [402, 418, 426, 441, 455, 486],
    flags: ['api-concentration'],
  },
  {
    id: 'battery-cells',
    hsCode: '8507',
    hsSection: '85',
    label: 'Lithium-ion battery cells',
    originCode: 'JP',
    value: 438000000,
    yoyDelta: 9.1,
    riskScore: 3.8,
    sparkline: [328, 336, 352, 374, 401, 438],
    flags: ['shipping-volatility', 'battery-demand-spike'],
  },
  {
    id: 'machine-tools',
    hsCode: '8459',
    hsSection: '84',
    label: 'Precision machine tools',
    originCode: 'DE',
    value: 251000000,
    yoyDelta: 1.8,
    riskScore: 2.1,
    sparkline: [238, 241, 244, 247, 249, 251],
    flags: [],
  },
  {
    id: 'grid-sensors',
    hsCode: '9030',
    hsSection: '90',
    label: 'Grid monitoring sensors',
    originCode: 'KR',
    value: 116000000,
    yoyDelta: 18.4,
    riskScore: 2.9,
    sparkline: [68, 72, 79, 88, 101, 116],
    flags: ['semiconductor-lead-time'],
  },
  {
    id: 'green-hydrogen-valves',
    hsCode: '8481',
    hsSection: '84',
    label: 'Hydrogen-ready industrial valves',
    originCode: 'DE',
    value: 92000000,
    yoyDelta: 21.7,
    riskScore: 3.4,
    sparkline: [45, 54, 60, 73, 81, 92],
    flags: ['certification-bottleneck'],
  },
  {
    id: 'rare-earth-magnets',
    hsCode: '8505',
    hsSection: '85',
    label: 'Rare-earth permanent magnets',
    originCode: 'JP',
    value: 174000000,
    yoyDelta: 12.6,
    riskScore: 4.7,
    sparkline: [132, 139, 145, 151, 162, 174],
    flags: ['rare-earth-exposure', 'customs-screening'],
  },
  {
    id: 'fertilizer-additives',
    hsCode: '3105',
    hsSection: '31',
    label: 'Specialty fertilizer additives',
    originCode: 'US',
    value: 98000000,
    yoyDelta: -3.1,
    riskScore: 4.1,
    sparkline: [126, 121, 118, 109, 103, 98],
    flags: ['weather-disruption'],
  },
];

const RISK_FLAGS: readonly ImportationRiskFlagRecord[] = [
  {
    id: 'api-concentration',
    severity: 'medium',
    title: 'Concentration fournisseur API',
    description: 'Deux fournisseurs couvrent plus de 60 pour cent des volumes suivis.',
    recommendedAction: 'Qualifier au moins un fournisseur alternatif dans l USMCA.',
    relatedCommodityId: 'pharma-active-ingredients',
  },
  {
    id: 'battery-demand-spike',
    severity: 'high',
    title: 'Tension sur la demande batteries',
    description: 'Les commandes EV et stockage réseau prolongent les délais contractuels.',
    recommendedAction: 'Sécuriser des fenêtres de livraison trimestrielles et des stocks tampons.',
    relatedCommodityId: 'battery-cells',
  },
  {
    id: 'shipping-volatility',
    severity: 'medium',
    title: 'Volatilité fret Asie Pacifique',
    description: 'Les surcharges maritimes restent instables sur la côte Ouest.',
    relatedCommodityId: 'battery-cells',
  },
  {
    id: 'rare-earth-exposure',
    severity: 'high',
    title: 'Exposition terres rares',
    description: 'Le corridor fournisseur reste dépendant de capacités de raffinage concentrées.',
    recommendedAction: 'Prioriser les contrats avec clauses de substitution matière.',
    relatedCommodityId: 'rare-earth-magnets',
  },
  {
    id: 'customs-screening',
    severity: 'medium',
    title: 'Contrôles douaniers renforcés',
    description: 'Les composants magnétiques à double usage subissent des examens documentaires plus longs.',
    relatedCommodityId: 'rare-earth-magnets',
  },
  {
    id: 'weather-disruption',
    severity: 'low',
    title: 'Risque climatique saisonnier',
    description: 'Le trafic portuaire est sensible aux épisodes de gel tardif.',
    relatedCommodityId: 'fertilizer-additives',
  },
  {
    id: 'semiconductor-lead-time',
    severity: 'medium',
    title: 'Lead time semi-conducteurs',
    description: 'Les capteurs critiques dépassent encore 16 semaines sur certaines références.',
    relatedCommodityId: 'grid-sensors',
  },
  {
    id: 'certification-bottleneck',
    severity: 'medium',
    title: 'Bouchon certification hydrogène',
    description: 'Les séries conformes ISO requièrent des contrôles de conformité supplémentaires.',
    relatedCommodityId: 'green-hydrogen-valves',
  },
];

const SUPPLIERS: readonly ImportationSupplierRecord[] = [
  {
    id: 'helix-pharma-us',
    name: 'Helix Pharma Inputs',
    dependencyScore: 72,
    diversificationScore: 41,
    reliability: 88,
    country: 'United States',
    originCode: 'US',
    lastReviewed: '2026-03-11',
    recommendation: 'Renouveler le contrat avec clause volume flexible.',
  },
  {
    id: 'kansai-energy-components',
    name: 'Kansai Energy Components',
    dependencyScore: 58,
    diversificationScore: 62,
    reliability: 84,
    country: 'Japan',
    originCode: 'JP',
    lastReviewed: '2026-03-07',
    recommendation: 'Maintenir un sourcing secondaire sur BC pour le dernier mile.',
  },
  {
    id: 'rheinwerk-industrial',
    name: 'Rheinwerk Industrial Systems',
    dependencyScore: 49,
    diversificationScore: 67,
    reliability: 91,
    country: 'Germany',
    originCode: 'DE',
    lastReviewed: '2026-02-24',
    recommendation: 'Etendre la couverture pour les pièces de rechange critiques.',
  },
  {
    id: 'norte-logistica-mx',
    name: 'Norte Logistica Industrial',
    dependencyScore: 54,
    diversificationScore: 58,
    reliability: 79,
    country: 'Mexico',
    originCode: 'MX',
    lastReviewed: '2026-03-02',
    recommendation: 'Sécuriser davantage de capacité routière transfrontalière.',
  },
];

const KNOWLEDGE_BY_LANG: Record<string, ImportationKnowledgeResponse> = {
  fr: {
    articles: [
      {
        id: 'knowledge-fr-1',
        title: 'Comment prioriser les intrants critiques en mode importation',
        summary: 'Cadre court pour hiérarchiser valeur, dépendance fournisseur et exposition corridor.',
        publishedAt: '2026-03-14',
        link: '/docs/importation-page',
        tag: 'Guide',
      },
      {
        id: 'knowledge-fr-2',
        title: 'Checklist de requalification fournisseur pour achats exposés',
        summary: 'Séquence recommandée pour passer d un fournisseur unique à une base dual-source.',
        publishedAt: '2026-03-10',
        link: '/docs/import-companies',
        tag: 'Playbook',
      },
    ],
    cta: {
      id: 'cta-fr',
      title: 'Préparer un plan de sécurisation import',
      subtitle: 'Exporter les filtres actifs et partager la lecture avec les équipes achats.',
      actionLabel: 'Ouvrir le guide',
      actionLink: '/docs/importation-page',
    },
  },
  en: {
    articles: [
      {
        id: 'knowledge-en-1',
        title: 'How to prioritize critical imports under supply pressure',
        summary: 'A short framework balancing value, supplier dependency and corridor exposure.',
        publishedAt: '2026-03-14',
        link: '/docs/importation-page',
        tag: 'Guide',
      },
      {
        id: 'knowledge-en-2',
        title: 'Supplier requalification checklist for exposed procurement lines',
        summary: 'A practical sequence to move from single-source dependency to dual-source coverage.',
        publishedAt: '2026-03-10',
        link: '/docs/import-companies',
        tag: 'Playbook',
      },
    ],
    cta: {
      id: 'cta-en',
      title: 'Prepare an import resilience plan',
      subtitle: 'Export the active filters and share the reading with procurement teams.',
      actionLabel: 'Open guide',
      actionLink: '/docs/importation-page',
    },
  },
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeGranularity(value: unknown): ImportationGranularity {
  const normalized = normalizeString(value);
  if (normalized === 'quarter' || normalized === 'year') {
    return normalized;
  }
  return 'month';
}

function normalizeOriginScope(value: unknown): ImportationOriginScope {
  const normalized = normalizeString(value);
  if (
    normalized === 'g7' ||
    normalized === 'usmca' ||
    normalized === 'european_union' ||
    normalized === 'indo_pacific' ||
    normalized === 'custom'
  ) {
    return normalized;
  }
  return 'global';
}

function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeString(entry)).filter((entry): entry is string => Boolean(entry));
  }
  const normalized = normalizeString(value);
  return normalized ? [normalized] : [];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeFindManyResult<T>(value: T | readonly T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? [...value] : [value];
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
}

function normalizeFilters(value: unknown): ImportationFilters {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    periodGranularity: normalizeGranularity(source.periodGranularity),
    periodValue: normalizeString(source.periodValue),
    originScope: normalizeOriginScope(source.originScope),
    originCodes: normalizeArray(source.originCodes),
    hsSections: normalizeArray(source.hsSections),
    compareMode: normalizeBoolean(source.compareMode),
    compareWith: normalizeString(source.compareWith),
  };
}

function toWatchlistResponse(entity: ImportWatchlistEntity): ImportationWatchlistRecord {
  return {
    id: String(entity.id),
    name: normalizeString(entity.name) ?? 'Untitled watchlist',
    owner: normalizeString(entity.owner) ?? 'Local workspace',
    updatedAt: normalizeString(entity.updatedAt) ?? new Date().toISOString(),
    filters: normalizeFilters(entity.filters),
  };
}

function toAnnotationResponse(entity: ImportAnnotationEntity): ImportationAnnotationRecord {
  return {
    id: String(entity.id),
    author: normalizeString(entity.author) ?? 'OpenG7',
    authorAvatarUrl: normalizeString(entity.authorAvatarUrl) ?? undefined,
    excerpt: normalizeString(entity.excerpt) ?? '',
    createdAt: normalizeString(entity.createdAt) ?? new Date().toISOString(),
    relatedCommodityId: normalizeString(entity.relatedCommodityId) ?? undefined,
    relatedOriginCode: normalizeString(entity.relatedOriginCode) ?? undefined,
  };
}

function computeFilteredCommodities(query: ImportationQuery) {
  const granularity = normalizeGranularity(query.period);
  const originScope = normalizeOriginScope(query.originScope);
  const originCodes = normalizeArray(query.originCodes);
  const hsSections = new Set(normalizeArray(query.hsSections));
  const allowedOrigins = selectOriginCodes(originScope, originCodes);
  const factor = GRANULARITY_FACTORS[granularity];

  return COMMODITIES.filter((commodity) => {
    if (!allowedOrigins.has(commodity.originCode)) {
      return false;
    }
    if (hsSections.size > 0 && !hsSections.has(commodity.hsSection)) {
      return false;
    }
    return true;
  }).map((commodity) => ({
    ...commodity,
    value: scaleNumber(commodity.value, factor),
    sparkline: scaleSparkline(commodity.sparkline, factor),
  }));
}

function selectOriginCodes(scope: ImportationOriginScope, explicitCodes: readonly string[]): Set<string> {
  if (scope === 'custom') {
    return new Set(explicitCodes.map((code) => code.toUpperCase()));
  }
  return new Set(SCOPE_MEMBERS[scope]);
}

function scaleNumber(value: number, factor: number): number {
  return Math.round(value * factor);
}

function scaleSparkline(values: readonly number[], factor: number): number[] {
  return values.map((value) => scaleNumber(value, factor));
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getFlows(query: ImportationQuery) {
    const granularity = normalizeGranularity(query.period);
    const originScope = normalizeOriginScope(query.originScope);
    const originCodes = normalizeArray(query.originCodes);
    const allowedOrigins = selectOriginCodes(originScope, originCodes);
    const factor = GRANULARITY_FACTORS[granularity];
    const filteredFlows = FLOWS.filter((flow) => allowedOrigins.has(flow.originCode));
    const total = filteredFlows.reduce((sum, flow) => sum + flow.value, 0);

    strapi.log.debug(`importation.getFlows scope=${originScope} period=${granularity} periodValue=${String(query.periodValue ?? '')}`);

    return {
      timeline: FLOW_TIMELINES[granularity].map((point) => ({
        ...point,
        totalValue: scaleNumber(point.totalValue, factor),
      })),
      flows: filteredFlows.map((flow) => ({
        originCode: flow.originCode,
        originName: flow.originName,
        value: scaleNumber(flow.value, factor),
        yoyDelta: flow.yoyDelta,
        share: total > 0 ? Number((flow.value / total).toFixed(4)) : null,
        coordinate: flow.coordinate,
        corridors: flow.corridors.map((corridor) => ({
          target: corridor.target,
          value: scaleNumber(corridor.value, factor),
          delta: corridor.delta,
        })),
      })),
      coverage: filteredFlows.length ? 0.91 : 0,
      lastUpdated: '2026-03-20T12:00:00.000Z',
      dataProvider: 'OpenG7 Importation API',
    };
  },

  getCommodities(query: ImportationQuery) {
    const originScope = normalizeOriginScope(query.originScope);
    const filtered = computeFilteredCommodities(query);
    const hsSections = new Set(normalizeArray(query.hsSections));

    const top = [...filtered]
      .sort((left, right) => right.value - left.value)
      .slice(0, 3);
    const emerging = [...filtered]
      .sort((left, right) => (right.yoyDelta ?? -Infinity) - (left.yoyDelta ?? -Infinity))
      .slice(0, 3);
    const risk = [...filtered]
      .sort((left, right) => (right.riskScore ?? -Infinity) - (left.riskScore ?? -Infinity))
      .slice(0, 3);

    strapi.log.debug(`importation.getCommodities scope=${originScope} hsSections=${Array.from(hsSections).join(',')}`);

    return { top, emerging, risk };
  },

  getRiskFlags(query: ImportationQuery) {
    const commodityCollections = this.getCommodities(query);
    const commodityIds = new Set(
      commodityCollections.top.concat(commodityCollections.emerging, commodityCollections.risk).map((commodity) => commodity.id)
    );
    return RISK_FLAGS.filter((flag) => !flag.relatedCommodityId || commodityIds.has(flag.relatedCommodityId));
  },

  getSuppliers(query: ImportationQuery) {
    const originScope = normalizeOriginScope(query.originScope);
    const originCodes = normalizeArray(query.originCodes);
    const allowedOrigins = selectOriginCodes(originScope, originCodes);
    return {
      suppliers: SUPPLIERS.filter((supplier) => allowedOrigins.has(supplier.originCode)),
    };
  },

  getKnowledge(query: ImportationQuery) {
    const lang = normalizeString(query.lang) === 'en' ? 'en' : 'fr';
    return clone(KNOWLEDGE_BY_LANG[lang]);
  },

  async getAnnotations() {
    const entries = await strapi.entityService.findMany(IMPORT_ANNOTATION_UID, {
      sort: ['createdAt:desc'],
    });

    return {
      annotations: normalizeFindManyResult(entries).map((entry) => toAnnotationResponse(entry as ImportAnnotationEntity)),
    };
  },

  async getWatchlists() {
    const entries = await strapi.entityService.findMany(IMPORT_WATCHLIST_UID, {
      sort: ['updatedAt:desc'],
    });

    return {
      watchlists: normalizeFindManyResult(entries).map((entry) => toWatchlistResponse(entry as ImportWatchlistEntity)),
    };
  },

  async createWatchlist(payload: ImportationWatchlistPayload) {
    const name = normalizeString(payload.name);
    if (!name) {
      throw new Error('Watchlist name is required.');
    }

    const created = await strapi.entityService.create(IMPORT_WATCHLIST_UID, {
      data: {
        name,
        owner: 'Local workspace',
        filters: normalizeFilters(payload.filters),
        source: 'user',
      } as any,
    });

    return toWatchlistResponse(created as ImportWatchlistEntity);
  },

  async updateWatchlist(id: string, payload: ImportationWatchlistUpdatePayload) {
    const watchlistId = normalizeString(id);
    if (!watchlistId) {
      throw new Error('Watchlist id is required.');
    }

    const entries = await strapi.entityService.findMany(IMPORT_WATCHLIST_UID, {
      filters: { id: watchlistId } as any,
      limit: 1,
    });
    const current = normalizeFindManyResult(entries)[0] as ImportWatchlistEntity | undefined;

    if (!current) {
      throw new Error('Watchlist not found.');
    }

    const data: Record<string, unknown> = {};

    if (payload.name !== undefined) {
      const name = normalizeString(payload.name);
      if (!name) {
        throw new Error('Watchlist name is required.');
      }
      data.name = name;
    }

    if (payload.filters !== undefined) {
      data.filters = normalizeFilters(payload.filters);
    }

    if (Object.keys(data).length === 0) {
      throw new Error('Nothing to update.');
    }

    const updated = await strapi.entityService.update(IMPORT_WATCHLIST_UID, current.id, {
      data: data as any,
    });

    return toWatchlistResponse(updated as ImportWatchlistEntity);
  },

  async scheduleReport(payload: ImportationReportSchedulePayload): Promise<ImportationScheduleResponse> {
    const recipients = normalizeArray(payload.recipients).map((entry) => entry.toLowerCase());
    if (!recipients.length) {
      throw new Error('At least one recipient is required.');
    }

    const period = normalizeGranularity(payload.period);
    const format = normalizeString(payload.format);
    const frequency = normalizeString(payload.frequency);
    const notes = normalizeString(payload.notes);

    if (format !== 'csv' && format !== 'json' && format !== 'look') {
      throw new Error('format must be one of: csv, json, look.');
    }

    if (frequency !== 'weekly' && frequency !== 'monthly' && frequency !== 'quarterly') {
      throw new Error('frequency must be one of: weekly, monthly, quarterly.');
    }

    const created = await strapi.entityService.create(IMPORT_REPORT_SCHEDULE_UID, {
      data: {
        period,
        recipients,
        format,
        frequency,
        notes,
        status: 'scheduled',
      } as any,
    });

    return {
      scheduled: true,
      reportId: String((created as ImportReportScheduleEntity).id),
      scheduledAt: normalizeString((created as ImportReportScheduleEntity).createdAt) ?? new Date().toISOString(),
    };
  },
});