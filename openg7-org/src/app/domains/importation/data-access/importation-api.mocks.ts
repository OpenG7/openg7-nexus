import { ImportationFilters } from '../models/importation.models';

const importationFlows = {
  timeline: [
    { period: '2026-03', label: 'Mar 2026', totalValue: 2480000000, yoyDelta: 4.1 },
    { period: '2026-02', label: 'Feb 2026', totalValue: 2415000000, yoyDelta: 3.2 },
    { period: '2026-01', label: 'Jan 2026', totalValue: 2380000000, yoyDelta: 2.4 },
    { period: '2025-12', label: 'Dec 2025', totalValue: 2290000000, yoyDelta: -0.8, isProjected: true },
  ],
  flows: [
    {
      originCode: 'US',
      originName: 'United States',
      value: 1180000000,
      yoyDelta: 2.8,
      share: 0.48,
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
      value: 346000000,
      yoyDelta: 5.6,
      share: 0.14,
      coordinate: [52.5, 13.4],
      corridors: [
        { target: 'ON', value: 102000000, delta: 3.4 },
        { target: 'QC', value: 91000000, delta: 2.8 },
      ],
    },
    {
      originCode: 'JP',
      originName: 'Japan',
      value: 292000000,
      yoyDelta: -1.9,
      share: 0.12,
      coordinate: [35.7, 139.7],
      corridors: [
        { target: 'BC', value: 164000000, delta: -2.5 },
        { target: 'AB', value: 47000000, delta: 0.9 },
      ],
    },
    {
      originCode: 'KR',
      originName: 'South Korea',
      value: 219000000,
      yoyDelta: 7.4,
      share: 0.09,
      coordinate: [37.5, 126.9],
      corridors: [{ target: 'BC', value: 120000000, delta: 5.2 }],
    },
  ],
  coverage: 0.91,
  lastUpdated: '2026-03-18T09:15:00Z',
  dataProvider: 'OpenG7 importation mock set',
} as const;

const importationCommodities = {
  top: [
    {
      id: 'pharma-active-ingredients',
      hsCode: '2933',
      label: 'Active pharmaceutical ingredients',
      value: 486000000,
      yoyDelta: 6.4,
      riskScore: 3.2,
      sparkline: [402, 418, 426, 441, 455, 486],
      flags: ['api-concentration'],
    },
    {
      id: 'battery-cells',
      hsCode: '8507',
      label: 'Lithium-ion battery cells',
      value: 438000000,
      yoyDelta: 9.1,
      riskScore: 3.8,
      sparkline: [328, 336, 352, 374, 401, 438],
      flags: ['shipping-volatility', 'battery-demand-spike'],
    },
    {
      id: 'machine-tools',
      hsCode: '8459',
      label: 'Precision machine tools',
      value: 251000000,
      yoyDelta: 1.8,
      riskScore: 2.1,
      sparkline: [238, 241, 244, 247, 249, 251],
      flags: [],
    },
  ],
  emerging: [
    {
      id: 'grid-sensors',
      hsCode: '9030',
      label: 'Grid monitoring sensors',
      value: 116000000,
      yoyDelta: 18.4,
      riskScore: 2.9,
      sparkline: [68, 72, 79, 88, 101, 116],
      flags: ['semiconductor-lead-time'],
    },
    {
      id: 'green-hydrogen-valves',
      hsCode: '8481',
      label: 'Hydrogen-ready industrial valves',
      value: 92000000,
      yoyDelta: 21.7,
      riskScore: 3.4,
      sparkline: [45, 54, 60, 73, 81, 92],
      flags: ['certification-bottleneck'],
    },
  ],
  risk: [
    {
      id: 'rare-earth-magnets',
      hsCode: '8505',
      label: 'Rare-earth permanent magnets',
      value: 174000000,
      yoyDelta: 12.6,
      riskScore: 4.7,
      sparkline: [132, 139, 145, 151, 162, 174],
      flags: ['rare-earth-exposure', 'customs-screening'],
    },
    {
      id: 'fertilizer-additives',
      hsCode: '3105',
      label: 'Specialty fertilizer additives',
      value: 98000000,
      yoyDelta: -3.1,
      riskScore: 4.1,
      sparkline: [126, 121, 118, 109, 103, 98],
      flags: ['weather-disruption'],
    },
  ],
} as const;

const importationRiskFlags = [
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
] as const;

const importationSuppliers = {
  suppliers: [
    {
      id: 'helix-pharma-us',
      name: 'Helix Pharma Inputs',
      dependencyScore: 72,
      diversificationScore: 41,
      reliability: 88,
      country: 'United States',
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
      lastReviewed: '2026-02-24',
      recommendation: 'Etendre la couverture pour les pièces de rechange critiques.',
    },
  ],
} as const;

const importationAnnotations = {
  annotations: [
    {
      id: 'annot-1',
      author: 'Equipe veille Ontario',
      excerpt: 'La demande batterie reste plus forte que prévu sur le corridor Detroit Windsor.',
      createdAt: '2026-03-18T10:20:00Z',
      relatedCommodityId: 'battery-cells',
      relatedOriginCode: 'US',
    },
    {
      id: 'annot-2',
      author: 'Pôle conformité import',
      excerpt: 'Les contrôles d origine préférentielle ont été renforcés pour plusieurs lots techniques.',
      createdAt: '2026-03-16T08:00:00Z',
      relatedCommodityId: 'rare-earth-magnets',
      relatedOriginCode: 'DE',
    },
  ],
} as const;

const importationWatchlists = {
  watchlists: [
    {
      id: 'watch-battery-usmca',
      name: 'Batteries USMCA',
      owner: 'Equipe appro Ontario',
      updatedAt: '2026-03-17T12:00:00Z',
      filters: {
        periodGranularity: 'month',
        periodValue: '2026-03',
        originScope: 'usmca',
        originCodes: [],
        hsSections: ['85'],
        compareMode: false,
        compareWith: null,
      },
    },
    {
      id: 'watch-pharma-g7',
      name: 'Intrants pharma G7',
      owner: 'Cellule resilience QC',
      updatedAt: '2026-03-15T09:30:00Z',
      filters: {
        periodGranularity: 'quarter',
        periodValue: '2026-Q1',
        originScope: 'g7',
        originCodes: [],
        hsSections: ['29'],
        compareMode: true,
        compareWith: '2025-Q1',
      },
    },
  ],
} as const;

const importationKnowledgeByLang = {
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
} as const;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function getMockImportationFlows() {
  return clone(importationFlows);
}

export function getMockImportationCommodityCollections() {
  return clone(importationCommodities);
}

export function getMockImportationRiskFlags() {
  return clone(importationRiskFlags);
}

export function getMockImportationSuppliers() {
  return clone(importationSuppliers);
}

export function getMockImportationAnnotations() {
  return clone(importationAnnotations);
}

export function getMockImportationWatchlists() {
  return clone(importationWatchlists);
}

export function getMockImportationKnowledge(lang: string) {
  const normalizedLang = lang === 'en' ? 'en' : 'fr';
  return clone(importationKnowledgeByLang[normalizedLang]);
}

export function createMockImportationWatchlist(payload: {
  readonly name: string;
  readonly filters: ImportationFilters;
}) {
  return {
    id: `watch-${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'local'}`,
    name: payload.name,
    owner: 'Local workspace',
    updatedAt: '2026-03-20T12:00:00Z',
    filters: clone(payload.filters),
  };
}

export function updateMockImportationWatchlist(
  id: string,
  payload: {
    readonly name?: string;
    readonly filters?: ImportationFilters;
  }
) {
  const existing = importationWatchlists.watchlists.find((watchlist) => watchlist.id === id);
  const fallback = existing ?? {
    id,
    name: 'Updated watchlist',
    owner: 'Local workspace',
    updatedAt: '2026-03-20T12:00:00Z',
    filters: {
      periodGranularity: 'month',
      periodValue: null,
      originScope: 'global',
      originCodes: [],
      hsSections: [],
      compareMode: false,
      compareWith: null,
    } satisfies ImportationFilters,
  };

  return {
    ...clone(fallback),
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.filters !== undefined ? { filters: clone(payload.filters) } : {}),
    updatedAt: '2026-03-21T00:00:00Z',
  };
}