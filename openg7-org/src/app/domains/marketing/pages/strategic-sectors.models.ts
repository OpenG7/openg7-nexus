import { PROVINCE_OPTIONS, ProvinceCode, SECTOR_OPTIONS, SectorType } from '@app/core/models/opportunity';

export type StrategicSectorTabId = 'all' | SectorType;
export type CorridorRisk = 'low' | 'medium' | 'high';
export type StrategicAvailability = 'stable' | 'tight' | 'constrained';
export type StrategicHorizon = '7d' | '30d' | '90d';

export interface StrategicSectorTab {
  readonly id: StrategicSectorTabId;
  readonly labelKey: string;
}

export interface StrategicMetric {
  readonly labelKey: string;
  readonly value: string;
}

export interface StrategicSectorCard {
  readonly id: string;
  readonly sectorId: SectorType;
  readonly labelKey: string;
  readonly summaryKey: string;
  readonly accentClass: string;
  readonly metrics: readonly StrategicMetric[];
  readonly sourceProvinces: readonly string[];
  readonly targetProvinces: readonly string[];
  readonly inputs: readonly string[];
  readonly availability: StrategicAvailability;
  readonly criticality: CorridorRisk;
  readonly horizon: StrategicHorizon;
}

export interface StrategicCorridorItem {
  readonly id: string;
  readonly routeKey: string;
  readonly capacity: string;
  readonly risk: CorridorRisk;
}

export const FILTER_KEYS = [
  'source',
  'target',
  'input',
  'availability',
  'criticality',
  'horizon',
] as const;

export type StrategicFilterKey = (typeof FILTER_KEYS)[number];
export type StrategicFilterValueMap = Record<StrategicFilterKey, string>;

export interface StrategicFilterOption {
  readonly value: string;
  readonly labelKey: string;
}

const PROVINCE_FILTER_OPTIONS: readonly StrategicFilterOption[] = PROVINCE_OPTIONS.map((province) => ({
  value: province.value,
  labelKey: province.labelKey,
}));

function provinceList(values: readonly ProvinceCode[]): readonly string[] {
  return values;
}

export const FILTER_OPTIONS_BY_KEY: Readonly<Record<StrategicFilterKey, readonly StrategicFilterOption[]>> = {
  source: [
    { value: 'all', labelKey: 'pages.strategicSectors.filters.any' },
    ...PROVINCE_FILTER_OPTIONS,
  ],
  target: [
    { value: 'all', labelKey: 'pages.strategicSectors.filters.any' },
    ...PROVINCE_FILTER_OPTIONS,
  ],
  input: [
    { value: 'all', labelKey: 'pages.strategicSectors.filters.any' },
    { value: 'electricity', labelKey: 'pages.strategicSectors.filters.options.electricity' },
    { value: 'gas', labelKey: 'pages.strategicSectors.filters.options.gas' },
    { value: 'aluminum', labelKey: 'pages.strategicSectors.filters.options.aluminum' },
    { value: 'grain', labelKey: 'pages.strategicSectors.filters.options.grain' },
    { value: 'logistics', labelKey: 'pages.strategicSectors.filters.options.logistics' },
    { value: 'steel', labelKey: 'pages.strategicSectors.filters.options.steel' },
  ],
  availability: [
    { value: 'all', labelKey: 'pages.strategicSectors.filters.any' },
    { value: 'stable', labelKey: 'pages.strategicSectors.filters.options.stable' },
    { value: 'tight', labelKey: 'pages.strategicSectors.filters.options.tight' },
    { value: 'constrained', labelKey: 'pages.strategicSectors.filters.options.constrained' },
  ],
  criticality: [
    { value: 'all', labelKey: 'pages.strategicSectors.filters.any' },
    { value: 'low', labelKey: 'pages.strategicSectors.corridors.risk.low' },
    { value: 'medium', labelKey: 'pages.strategicSectors.corridors.risk.medium' },
    { value: 'high', labelKey: 'pages.strategicSectors.corridors.risk.high' },
  ],
  horizon: [
    { value: 'all', labelKey: 'pages.strategicSectors.filters.any' },
    { value: '7d', labelKey: 'pages.strategicSectors.filters.options.h7d' },
    { value: '30d', labelKey: 'pages.strategicSectors.filters.options.h30d' },
    { value: '90d', labelKey: 'pages.strategicSectors.filters.options.h90d' },
  ],
};

export const DEFAULT_FILTER_VALUES: StrategicFilterValueMap = {
  source: FILTER_OPTIONS_BY_KEY.source[0]!.value,
  target: FILTER_OPTIONS_BY_KEY.target[0]!.value,
  input: FILTER_OPTIONS_BY_KEY.input[0]!.value,
  availability: FILTER_OPTIONS_BY_KEY.availability[0]!.value,
  criticality: FILTER_OPTIONS_BY_KEY.criticality[0]!.value,
  horizon: FILTER_OPTIONS_BY_KEY.horizon[0]!.value,
};

export const SECTOR_TABS: readonly StrategicSectorTab[] = [
  { id: 'all', labelKey: 'pages.strategicSectors.tabs.all' },
  ...SECTOR_OPTIONS.map((option) => ({
    id: option.value,
    labelKey: option.labelKey,
  })),
];

export const SECTOR_CARDS: readonly StrategicSectorCard[] = [
  {
    id: 'energy-electricity',
    sectorId: 'energy',
    labelKey: 'sectors.energy',
    summaryKey: 'pages.strategicSectors.cards.summary',
    accentClass: 'from-cyan-300/35 to-blue-500/10',
    metrics: [
      { labelKey: 'pages.strategicSectors.cards.metrics.corridors', value: '12' },
      { labelKey: 'pages.strategicSectors.cards.metrics.provinces', value: '6' },
      { labelKey: 'pages.strategicSectors.cards.metrics.alerts', value: '3' },
    ],
    sourceProvinces: provinceList(['QC', 'ON', 'BC']),
    targetProvinces: provinceList(['ON', 'AB', 'QC']),
    inputs: ['electricity', 'gas'],
    availability: 'tight',
    criticality: 'medium',
    horizon: '30d',
  },
  {
    id: 'manufacturing-steel',
    sectorId: 'manufacturing',
    labelKey: 'sectors.manufacturing',
    summaryKey: 'pages.strategicSectors.cards.summary',
    accentClass: 'from-sky-300/35 to-indigo-500/10',
    metrics: [
      { labelKey: 'pages.strategicSectors.cards.metrics.corridors', value: '9' },
      { labelKey: 'pages.strategicSectors.cards.metrics.provinces', value: '5' },
      { labelKey: 'pages.strategicSectors.cards.metrics.alerts', value: '2' },
    ],
    sourceProvinces: provinceList(['ON', 'QC', 'AB']),
    targetProvinces: provinceList(['BC', 'ON', 'QC']),
    inputs: ['steel', 'logistics'],
    availability: 'stable',
    criticality: 'low',
    horizon: '90d',
  },
  {
    id: 'mining-aluminum',
    sectorId: 'mining',
    labelKey: 'sectors.mining',
    summaryKey: 'pages.strategicSectors.cards.summary',
    accentClass: 'from-amber-200/35 to-orange-500/10',
    metrics: [
      { labelKey: 'pages.strategicSectors.cards.metrics.corridors', value: '7' },
      { labelKey: 'pages.strategicSectors.cards.metrics.provinces', value: '4' },
      { labelKey: 'pages.strategicSectors.cards.metrics.alerts', value: '4' },
    ],
    sourceProvinces: provinceList(['QC', 'BC']),
    targetProvinces: provinceList(['ON', 'AB']),
    inputs: ['aluminum'],
    availability: 'constrained',
    criticality: 'high',
    horizon: '7d',
  },
  {
    id: 'services-logistics',
    sectorId: 'services',
    labelKey: 'sectors.services',
    summaryKey: 'pages.strategicSectors.cards.summary',
    accentClass: 'from-cyan-200/35 to-teal-500/10',
    metrics: [
      { labelKey: 'pages.strategicSectors.cards.metrics.corridors', value: '15' },
      { labelKey: 'pages.strategicSectors.cards.metrics.provinces', value: '8' },
      { labelKey: 'pages.strategicSectors.cards.metrics.alerts', value: '1' },
    ],
    sourceProvinces: provinceList(['ON', 'BC', 'AB']),
    targetProvinces: provinceList(['QC', 'ON', 'BC']),
    inputs: ['logistics'],
    availability: 'stable',
    criticality: 'low',
    horizon: '90d',
  },
  {
    id: 'construction-supply',
    sectorId: 'construction',
    labelKey: 'sectors.construction',
    summaryKey: 'pages.strategicSectors.cards.summary',
    accentClass: 'from-slate-200/35 to-blue-600/10',
    metrics: [
      { labelKey: 'pages.strategicSectors.cards.metrics.corridors', value: '6' },
      { labelKey: 'pages.strategicSectors.cards.metrics.provinces', value: '4' },
      { labelKey: 'pages.strategicSectors.cards.metrics.alerts', value: '2' },
    ],
    sourceProvinces: provinceList(['AB', 'ON']),
    targetProvinces: provinceList(['QC', 'BC']),
    inputs: ['steel', 'logistics'],
    availability: 'tight',
    criticality: 'medium',
    horizon: '30d',
  },
  {
    id: 'agri-food',
    sectorId: 'agri',
    labelKey: 'sectors.agri',
    summaryKey: 'pages.strategicSectors.cards.summary',
    accentClass: 'from-emerald-200/35 to-cyan-500/10',
    metrics: [
      { labelKey: 'pages.strategicSectors.cards.metrics.corridors', value: '8' },
      { labelKey: 'pages.strategicSectors.cards.metrics.provinces', value: '5' },
      { labelKey: 'pages.strategicSectors.cards.metrics.alerts', value: '2' },
    ],
    sourceProvinces: provinceList(['MB', 'SK', 'AB']),
    targetProvinces: provinceList(['ON', 'QC']),
    inputs: ['grain', 'logistics'],
    availability: 'stable',
    criticality: 'medium',
    horizon: '30d',
  },
];

export const CORRIDOR_ITEMS: readonly StrategicCorridorItem[] = [
  {
    id: 'qc-on',
    routeKey: 'pages.strategicSectors.corridors.qcOn',
    capacity: '260 MW',
    risk: 'medium',
  },
  {
    id: 'mb-sk',
    routeKey: 'pages.strategicSectors.corridors.mbSk',
    capacity: '500 MW',
    risk: 'low',
  },
  {
    id: 'bc-ab',
    routeKey: 'pages.strategicSectors.corridors.bcAb',
    capacity: '150 MW',
    risk: 'high',
  },
];
