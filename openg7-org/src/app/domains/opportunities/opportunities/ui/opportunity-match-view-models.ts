import {
  OpportunityMatch,
  PROVINCE_OPTIONS,
  SECTOR_OPTIONS,
  ProvinceCode,
  SectorType,
  normalizeConfidencePercent,
} from '@app/core/models/opportunity';
import {
  OpportunityMatchLayout,
  OPPORTUNITY_MATCH_LAYOUTS,
} from '@app/core/models/opportunity-match-layout';
import { createPartnerSelection } from '@app/core/models/partner-selection';

import {
  OpportunityCompactKpiItemVm,
  OpportunityCompactKpiListVm,
} from './opportunity-compact-kpi-list/opportunity-compact-kpi-list.component';
import {
  OpportunityImpactBannerVm,
  OpportunityImpactBannerKpi,
} from './opportunity-impact-banner/opportunity-impact-banner.component';
import {
  OpportunityMiniMapVm,
  OpportunityMiniMapSparklinePoint,
} from './opportunity-mini-map/opportunity-mini-map.component';
import { OpportunityRadarVm } from './opportunity-radar/opportunity-radar.component';
import {
  OpportunitySubwayVm,
  OpportunitySubwayLine,
  OpportunitySubwayStation,
  OpportunitySubwayStationBadge,
} from './opportunity-subway/opportunity-subway.component';
import { OpportunitySwipeStackVm } from './opportunity-swipe-stack/opportunity-swipe-stack.component';
import { OpportunityTileVm } from './opportunity-tile/opportunity-tile.component';
import { OpportunityTimelineVm } from './opportunity-timeline/opportunity-timeline.component';
import { OpportunityTwoWayComparatorVm } from './opportunity-two-way-comparator/opportunity-two-way-comparator.component';

export interface OpportunityMatchLayoutOption {
  readonly value: OpportunityMatchLayout;
  readonly labelKey: string;
}

export const OPPORTUNITY_MATCH_LAYOUT_OPTIONS: readonly OpportunityMatchLayoutOption[] = OPPORTUNITY_MATCH_LAYOUTS.map(
  (layout): OpportunityMatchLayoutOption => ({
    value: layout,
    labelKey: `opportunities.layouts.${layout}`,
  }),
);

const PROVINCE_LABEL_MAP = new Map(PROVINCE_OPTIONS.map((option) => [option.value, option.labelKey] as const));
const SECTOR_LABEL_MAP = new Map(SECTOR_OPTIONS.map((option) => [option.value, option.labelKey] as const));
const SECTOR_ICON_MAP = new Map<SectorType, string>([
  ['energy', '⚡'],
  ['manufacturing', '🛠️'],
  ['mining', '⛏️'],
  ['construction', '🏗️'],
  ['agri-food', '🌾'],
  ['digital-services', '🧠'],
  ['transport-logistics', '🚚'],
  ['life-sciences', '🧪'],
]);
const DEFAULT_SECTOR_ICON = '🧭';

const PROVINCE_COORDINATES: Record<ProvinceCode, readonly [number, number]> = {
  AB: [53.9333, -116.5765],
  BC: [53.7267, -127.6476],
  MB: [53.7609, -98.8139],
  NB: [46.5653, -66.4619],
  NL: [53.1355, -57.6604],
  NS: [45.026, -63.1713],
  NT: [64.8255, -124.8457],
  NU: [70.2998, -83.1076],
  ON: [51.2538, -85.3232],
  PE: [46.5107, -63.4168],
  QC: [52.9399, -73.5491],
  SK: [52.9399, -106.4509],
  YT: [64.2823, -135.0],
};

const MIN_LATITUDE = 41;
const MAX_LATITUDE = 71;
const MIN_LONGITUDE = -141;
const MAX_LONGITUDE = -52;

export function createOpportunityTileVm(match: OpportunityMatch): OpportunityTileVm {
  return {
    id: match.id.toString(),
    matchId: match.id.toString(),
    title: match.commodity,
    score: normalizeConfidencePercent(match.confidence),
    buyer: {
      name: match.buyer.name,
      provinceLabelKey: PROVINCE_LABEL_MAP.get(match.buyer.province) ?? match.buyer.province,
      sectorLabelKey: SECTOR_LABEL_MAP.get(match.buyer.sector) ?? match.buyer.sector,
    },
    supplier: {
      name: match.seller.name,
      provinceLabelKey: PROVINCE_LABEL_MAP.get(match.seller.province) ?? match.seller.province,
      sectorLabelKey: SECTOR_LABEL_MAP.get(match.seller.sector) ?? match.seller.sector,
    },
    distanceKm: match.distanceKm ?? null,
    profileSelection: createPartnerSelection('supplier', match.seller.id),
  } satisfies OpportunityTileVm;
}

export function createOpportunityMiniMapVm(match: OpportunityMatch): OpportunityMiniMapVm {
  const score = normalizeConfidencePercent(match.confidence);
  const distanceKm = match.distanceKm ?? null;
  const buyerProvinceLabelKey = PROVINCE_LABEL_MAP.get(match.buyer.province) ?? match.buyer.province;
  const buyerSectorLabelKey = SECTOR_LABEL_MAP.get(match.buyer.sector) ?? match.buyer.sector;
  const supplierProvinceLabelKey = PROVINCE_LABEL_MAP.get(match.seller.province) ?? match.seller.province;
  const supplierSectorLabelKey = SECTOR_LABEL_MAP.get(match.seller.sector) ?? match.seller.sector;
  const buyerCoordinates = resolveProvinceCoordinates(match.buyer.province);
  const supplierCoordinates = resolveProvinceCoordinates(match.seller.province);
  const sparkline = buildSparkline(buyerCoordinates, supplierCoordinates);

  return {
    id: `mini-map-${match.id}`,
    matchId: match.id.toString(),
    title: match.commodity,
    score,
    buyer: {
      name: match.buyer.name,
      provinceLabelKey: buyerProvinceLabelKey,
      sectorLabelKey: buyerSectorLabelKey,
      sectorIcon: SECTOR_ICON_MAP.get(match.buyer.sector) ?? DEFAULT_SECTOR_ICON,
      coordinates: buyerCoordinates,
      previewPosition: sparkline.start,
    },
    supplier: {
      name: match.seller.name,
      provinceLabelKey: supplierProvinceLabelKey,
      sectorLabelKey: supplierSectorLabelKey,
      sectorIcon: SECTOR_ICON_MAP.get(match.seller.sector) ?? DEFAULT_SECTOR_ICON,
      coordinates: supplierCoordinates,
      previewPosition: sparkline.end,
    },
    distanceKm,
    leadTime: estimateLeadTime(distanceKm),
    co2Saved: estimateCo2(match.co2Estimate ?? null),
    mapPreviewUrl: createPreviewImage(match.commodity),
    sparklinePoints: sparkline.points,
  } satisfies OpportunityMiniMapVm;
}

export function createOpportunityTwoWayComparatorVm(match: OpportunityMatch): OpportunityTwoWayComparatorVm {
  const score = normalizeConfidencePercent(match.confidence);
  const distanceKm = match.distanceKm ?? null;
  const distanceValue = distanceKm != null
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(distanceKm)
    : null;

  const leadTime = estimateLeadTime(distanceKm);
  const leadTimeValue = leadTime != null
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: leadTime.unit === 'weeks' ? 1 : 0 }).format(leadTime.value)
    : null;
  const leadTimeValueKey =
    leadTime != null
      ? leadTime.unit === 'weeks'
        ? 'opportunities.twoWay.metricValues.leadTimeWeeks'
        : 'opportunities.twoWay.metricValues.leadTimeDays'
      : 'opportunities.twoWay.metricValues.leadTimePending';

  const logisticsCost = distanceKm != null ? formatCostPerKg(distanceKm, score) : null;

  const buyerProvinceLabelKey = PROVINCE_LABEL_MAP.get(match.buyer.province) ?? match.buyer.province;
  const buyerSectorLabelKey = SECTOR_LABEL_MAP.get(match.buyer.sector) ?? match.buyer.sector;
  const supplierProvinceLabelKey = PROVINCE_LABEL_MAP.get(match.seller.province) ?? match.seller.province;
  const supplierSectorLabelKey = SECTOR_LABEL_MAP.get(match.seller.sector) ?? match.seller.sector;

  const metrics: OpportunityTwoWayComparatorVm['metrics'] = [
    {
      id: 'distance',
      labelKey: 'opportunities.timeline.distance',
      valueKey:
        distanceValue != null
          ? 'opportunities.twoWay.metricValues.distance'
          : 'opportunities.twoWay.metricValues.distancePending',
      valueParams: distanceValue != null ? { value: distanceValue } : undefined,
      hintKey:
        distanceValue != null
          ? 'opportunities.twoWay.metricHints.distance'
          : 'opportunities.twoWay.metricHints.distancePending',
      pending: distanceValue == null,
    },
    {
      id: 'lead-time',
      labelKey: 'opportunities.timeline.leadTime',
      valueKey: leadTimeValueKey,
      valueParams: leadTimeValue != null ? { value: leadTimeValue } : undefined,
      hintKey:
        leadTime != null
          ? 'opportunities.twoWay.metricHints.leadTime'
          : 'opportunities.twoWay.metricHints.leadTimePending',
      pending: leadTime == null,
    },
    {
      id: 'logistics',
      labelKey: 'opportunities.timeline.logisticsCost',
      valueKey:
        logisticsCost != null
          ? 'opportunities.twoWay.metricValues.logisticsCost'
          : 'opportunities.twoWay.metricValues.logisticsCostPending',
      valueParams: logisticsCost != null ? { value: logisticsCost } : undefined,
      hintKey:
        logisticsCost != null
          ? 'opportunities.twoWay.metricHints.logisticsCost'
          : 'opportunities.twoWay.metricHints.logisticsCostPending',
      pending: logisticsCost == null,
    },
  ];

  return {
    id: `two-way-${match.id}`,
    matchId: match.id.toString(),
    title: match.commodity,
    score,
    buyer: {
      name: match.buyer.name,
      provinceLabelKey: buyerProvinceLabelKey,
      sectorLabelKey: buyerSectorLabelKey,
    },
    supplier: {
      name: match.seller.name,
      provinceLabelKey: supplierProvinceLabelKey,
      sectorLabelKey: supplierSectorLabelKey,
    },
    metrics,
  } satisfies OpportunityTwoWayComparatorVm;
}

export function createOpportunityRadarVm(match: OpportunityMatch): OpportunityRadarVm {
  const score = normalizeConfidencePercent(match.confidence);
  const distanceKm = match.distanceKm ?? 0;
  const proximity = clampPercent(100 - (distanceKm / 2400) * 100);
  const delay = clampPercent(60 + proximity * 0.45);
  const capacity = clampPercent(55 + score * 0.45);
  const price = clampPercent(58 + score * 0.35 - (match.mode === 'import' ? 4 : 0));
  const footprint = clampPercent(100 - ((match.co2Estimate ?? 900) / 1500) * 100);

  const distanceLabel = distanceKm
    ? `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(distanceKm)} km`
    : 'Distance en cours de validation';

  const co2Detail = match.co2Estimate
    ? `Réduction ~${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(match.co2Estimate)} tCO₂/an`
    : 'Empreinte en modélisation';

  return {
    id: `radar-${match.id}`,
    matchId: match.id.toString(),
    title: match.commodity,
    score,
    buyer: {
      name: match.buyer.name,
      provinceLabelKey: PROVINCE_LABEL_MAP.get(match.buyer.province) ?? match.buyer.province,
      sectorLabelKey: SECTOR_LABEL_MAP.get(match.buyer.sector) ?? match.buyer.sector,
    },
    supplier: {
      name: match.seller.name,
      provinceLabelKey: PROVINCE_LABEL_MAP.get(match.seller.province) ?? match.seller.province,
      sectorLabelKey: SECTOR_LABEL_MAP.get(match.seller.sector) ?? match.seller.sector,
    },
    axes: [
      {
        id: 'price',
        labelKey: 'opportunities.radar.axes.price',
        value: price,
        detail: `Marge projetée ~${Math.max(8, Math.round(score / 6))}%`,
      },
      {
        id: 'delay',
        labelKey: 'opportunities.radar.axes.delay',
        value: delay,
        detail: `Fenêtre logistique estimée : ${Math.max(2, Math.round(3 + (100 - proximity) / 12))} semaines`,
      },
      {
        id: 'capacity',
        labelKey: 'opportunities.radar.axes.capacity',
        value: capacity,
        detail: `Flexibilité ±${Math.min(25, Math.max(8, Math.round((100 - score) / 2)))}%`,
      },
      {
        id: 'footprint',
        labelKey: 'opportunities.radar.axes.footprint',
        value: footprint,
        detail: co2Detail,
      },
      {
        id: 'proximity',
        labelKey: 'opportunities.radar.axes.proximity',
        value: proximity,
        detail: distanceLabel,
      },
    ],
    profileSelection: createPartnerSelection('supplier', match.seller.id),
  } satisfies OpportunityRadarVm;
}

export function createOpportunityCompactKpiListVm(
  matches: readonly OpportunityMatch[],
  options: { id?: string } = {},
): OpportunityCompactKpiListVm {
  return {
    id: options.id ?? 'compact-kpi',
    items: matches.map((match) => createOpportunityCompactKpiItemVm(match)),
  } satisfies OpportunityCompactKpiListVm;
}

export function createOpportunitySwipeStackVm(
  matches: readonly OpportunityMatch[],
  options: { id?: string; title?: string; subtitle?: string } = {},
): OpportunitySwipeStackVm {
  return {
    id: options.id ?? 'swipe-stack',
    title: options.title ?? 'Sélection express',
    subtitle:
      options.subtitle ??
      "Balayez les opportunités pour qualifier rapidement les matchs prioritaires et garder le fil de votre session mobile.",
    cards: matches.map((match) => createSwipeCardVm(match)),
  } satisfies OpportunitySwipeStackVm;
}

export function createOpportunityImpactBannerVm(match: OpportunityMatch): OpportunityImpactBannerVm {
  const score = normalizeConfidencePercent(match.confidence);
  const distanceKm = match.distanceKm ?? null;
  const co2Saved = estimateCo2(match.co2Estimate ?? null);
  const leadTime = estimateLeadTime(distanceKm);
  const jobsCreated = estimateJobsCreated(score, distanceKm);

  const distanceLabel = distanceKm != null
    ? `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(distanceKm)} km`
    : 'Distance à confirmer';

  const leadTimeLabel = formatLeadTimeSummary(leadTime);
  const logisticsCost = distanceKm != null ? formatCostPerKg(distanceKm, score) : null;

  const co2Headline = co2Saved != null
    ? `~${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(co2Saved.value)} tCO₂/an`
    : 'un impact climat mesurable';

  const jobsHeadline = jobsCreated != null
    ? `~${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(jobsCreated)} emplois`
    : 'des emplois qualifiés';

  const corridorLabel = `${match.buyer.province} ↔ ${match.seller.province}`;

  const supportingKpis: OpportunityImpactBannerKpi[] = [
    { id: 'corridor', label: 'Corridor', value: corridorLabel },
    { id: 'distance', label: 'Distance', value: distanceLabel },
    { id: 'lead-time', label: 'Délais estimés', value: leadTimeLabel },
    {
      id: 'logistics',
      label: 'Coût logistique',
      value: logisticsCost != null ? `~${logisticsCost} / kg` : 'À préciser',
    },
  ];

  if (co2Saved != null) {
    supportingKpis.push({
      id: 'co2',
      label: 'CO₂ évité',
      value: `≈ ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(co2Saved.value)} t/an`,
    });
  }

  if (jobsCreated != null) {
    supportingKpis.push({
      id: 'jobs',
      label: 'Emplois estimés',
      value: `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(jobsCreated)}`,
    });
  }

  return {
    id: `impact-${match.id}`,
    matchId: match.id.toString(),
    title: match.commodity,
    scorePercent: score,
    buyerName: match.buyer.name,
    supplierName: match.seller.name,
    impactHeadline: `Cette mise en relation économise ${co2Headline} et crée ${jobsHeadline}.`,
    impactFootnote: formatImpactFootnote(distanceKm, co2Saved?.approximate ?? false),
    supportingKpis,
    ctaLabel: 'opportunities.timeline.connect',
  } satisfies OpportunityImpactBannerVm;
}

export function createOpportunitySubwayVm(match: OpportunityMatch): OpportunitySubwayVm {
  const score = normalizeConfidencePercent(match.confidence);
  const distanceKm = match.distanceKm ?? null;
  const co2Estimate = match.co2Estimate ?? null;

  const distanceBadge: OpportunitySubwayStationBadge = distanceKm != null
    ? { id: 'distance', labelKey: 'opportunities.subway.station.distanceBadge', labelParams: { value: distanceKm } }
    : { id: 'distance', labelKey: 'opportunities.subway.station.distancePending' };

  const stations = buildSubwayStations(match, distanceBadge);

  const costLine: OpportunitySubwayLine = {
    id: 'cost',
    labelKey: 'opportunities.subway.constraints.cost',
    severity: resolveCostSeverity(distanceKm, match.mode, score),
    metricLabelKey: 'opportunities.subway.metrics.cost',
    metricValueKey: 'opportunities.subway.metrics.costValue',
    metricValueParams: { value: formatCostPerKg(distanceKm, score) },
    stations,
  };

  const delayLine: OpportunitySubwayLine = {
    id: 'delay',
    labelKey: 'opportunities.subway.constraints.delay',
    severity: resolveDelaySeverity(distanceKm ?? 0, score),
    metricLabelKey: 'opportunities.subway.metrics.delay',
    metricValueKey: 'opportunities.subway.metrics.delayValue',
    metricValueParams: { value: formatTransitDays(distanceKm) },
    stations,
  };

  const carbonLine: OpportunitySubwayLine = {
    id: 'carbon',
    labelKey: 'opportunities.subway.constraints.carbon',
    severity: resolveCarbonSeverity(distanceKm, co2Estimate),
    metricLabelKey: 'opportunities.subway.metrics.carbon',
    metricValueKey:
      co2Estimate != null
        ? 'opportunities.subway.metrics.carbonValue'
        : 'opportunities.subway.metrics.carbonPending',
    metricValueParams:
      co2Estimate != null
        ? { value: new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Math.max(1, co2Estimate * 0.45)) }
        : undefined,
    stations,
  };

  return {
    id: `subway-${match.id}`,
    matchId: match.id.toString(),
    title: match.commodity,
    score,
    buyer: {
      name: match.buyer.name,
      provinceLabelKey: PROVINCE_LABEL_MAP.get(match.buyer.province) ?? match.buyer.province,
      sectorLabelKey: SECTOR_LABEL_MAP.get(match.buyer.sector) ?? match.buyer.sector,
      logoUrl: undefined,
    },
    supplier: {
      name: match.seller.name,
      provinceLabelKey: PROVINCE_LABEL_MAP.get(match.seller.province) ?? match.seller.province,
      sectorLabelKey: SECTOR_LABEL_MAP.get(match.seller.sector) ?? match.seller.sector,
      logoUrl: undefined,
    },
    distanceKm,
    lines: [costLine, delayLine, carbonLine],
    profileSelection: createPartnerSelection('supplier', match.seller.id),
  } satisfies OpportunitySubwayVm;
}

export function createOpportunityTimelineVm(match: OpportunityMatch): OpportunityTimelineVm {
  const score = normalizeConfidencePercent(match.confidence);
  const distanceKm = match.distanceKm ?? 0;
  const leadTime = estimateLeadTime(distanceKm) ?? { value: 4, unit: 'days', approximate: true };
  const co2Saved = estimateCo2(match.co2Estimate ?? null);
  const logisticsCost = formatCostPerKg(distanceKm, score);

  const buyerProvinceLabel = PROVINCE_LABEL_MAP.get(match.buyer.province) ?? match.buyer.province;
  const supplierProvinceLabel = PROVINCE_LABEL_MAP.get(match.seller.province) ?? match.seller.province;
  const buyerSectorLabel = SECTOR_LABEL_MAP.get(match.buyer.sector) ?? match.buyer.sector;
  const supplierSectorLabel = SECTOR_LABEL_MAP.get(match.seller.sector) ?? match.seller.sector;

  const steps = buildTimelineSteps(match, leadTime, logisticsCost, co2Saved?.value ?? null);

  return {
    id: `timeline-${match.id}`,
    matchId: match.id.toString(),
    title: match.commodity,
    score,
    buyer: {
      name: match.buyer.name,
      province: buyerProvinceLabel,
      sector: buyerSectorLabel,
      logoUrl: undefined,
    },
    supplier: {
      name: match.seller.name,
      province: supplierProvinceLabel,
      sector: supplierSectorLabel,
      logoUrl: undefined,
    },
    context: {
      distanceKm,
      leadTime: formatLeadTimeSummary(leadTime),
      co2SavedTons: co2Saved?.value ?? undefined,
      logisticsCost: logisticsCost ? `${logisticsCost} / kg` : undefined,
    },
    steps,
    profileSelection: createPartnerSelection('supplier', match.seller.id),
  } satisfies OpportunityTimelineVm;
}

function createOpportunityCompactKpiItemVm(match: OpportunityMatch): OpportunityCompactKpiItemVm {
  const score = normalizeConfidencePercent(match.confidence);
  const distanceKm = match.distanceKm ?? null;
  const distanceLabel = distanceKm != null
    ? `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(distanceKm)} km`
    : '';

  return {
    id: `compact-${match.id}`,
    sectorIcon: SECTOR_ICON_MAP.get(match.buyer.sector) ?? DEFAULT_SECTOR_ICON,
    sectorLabelKey: SECTOR_LABEL_MAP.get(match.buyer.sector) ?? match.buyer.sector,
    buyerName: match.buyer.name,
    supplierName: match.seller.name,
    scorePercent: score,
    scoreTone: resolveScoreTone(score),
    distanceLabel,
    distancePending: distanceKm == null,
    matchId: match.id.toString(),
  } satisfies OpportunityCompactKpiItemVm;
}

function createSwipeCardVm(match: OpportunityMatch): OpportunitySwipeStackVm['cards'][number] {
  return {
    id: match.id.toString(),
    title: match.commodity,
    score: normalizeConfidencePercent(match.confidence),
    buyer: {
      name: match.buyer.name,
      provinceLabelKey: PROVINCE_LABEL_MAP.get(match.buyer.province) ?? match.buyer.province,
      sectorLabelKey: SECTOR_LABEL_MAP.get(match.buyer.sector) ?? match.buyer.sector,
    },
    supplier: {
      name: match.seller.name,
      provinceLabelKey: PROVINCE_LABEL_MAP.get(match.seller.province) ?? match.seller.province,
      sectorLabelKey: SECTOR_LABEL_MAP.get(match.seller.sector) ?? match.seller.sector,
    },
    distanceLabel: formatSwipeDistance(match.distanceKm ?? null),
  } as OpportunitySwipeStackVm['cards'][number];
}

function resolveProvinceCoordinates(province: ProvinceCode): readonly [number, number] {
  return PROVINCE_COORDINATES[province] ?? [56.1304, -106.3468];
}

function buildSparkline(
  buyerCoordinates: readonly [number, number],
  supplierCoordinates: readonly [number, number],
): { start: OpportunityMiniMapSparklinePoint; end: OpportunityMiniMapSparklinePoint; points: OpportunityMiniMapSparklinePoint[] } {
  const start = toPreviewPoint(buyerCoordinates);
  const end = toPreviewPoint(supplierCoordinates);
  const midpointA = normalizePreviewPoint({
    x: (start.x * 2 + end.x) / 3,
    y: (start.y * 2 + end.y) / 3 - 0.12,
  });
  const midpointB = normalizePreviewPoint({
    x: (start.x + end.x * 2) / 3,
    y: (start.y + end.y * 2) / 3 - 0.08,
  });
  return { start, end, points: [start, midpointA, midpointB, end] };
}

function toPreviewPoint([latitude, longitude]: readonly [number, number]): OpportunityMiniMapSparklinePoint {
  const x = (longitude - MIN_LONGITUDE) / (MAX_LONGITUDE - MIN_LONGITUDE);
  const y = 1 - (latitude - MIN_LATITUDE) / (MAX_LATITUDE - MIN_LATITUDE);
  return normalizePreviewPoint({ x, y });
}

function normalizePreviewPoint(point: { x: number; y: number }): OpportunityMiniMapSparklinePoint {
  return {
    x: clampValue(point.x, 0.05, 0.95),
    y: clampValue(point.y, 0.08, 0.92),
  };
}

function estimateLeadTime(distanceKm: number | null): OpportunityMiniMapVm['leadTime'] {
  if (distanceKm == null) {
    return null;
  }
  if (distanceKm < 520) {
    const days = Math.max(2, Math.round(distanceKm / 130));
    return { value: days, unit: 'days', approximate: true };
  }
  const weeks = Math.max(1, Math.round(distanceKm / 900));
  return { value: weeks, unit: 'weeks', approximate: true };
}

function estimateCo2(co2Estimate: number | null): OpportunityMiniMapVm['co2Saved'] {
  if (co2Estimate == null) {
    return null;
  }
  const value = Math.max(1, Math.round(co2Estimate * 0.6));
  return { value, approximate: true };
}

function formatSwipeDistance(distanceKm: number | null): string | null {
  if (distanceKm == null) {
    return null;
  }

  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(distanceKm)} km`;
}

function formatCostPerKg(distanceKm: number | null, score: number): string {
  const distance = Math.min(distanceKm ?? 0, 2400);
  const base = 0.32 + distance / 4800 + (score < 70 ? 0.05 : 0);
  const value = Math.max(0.26, base);
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTransitDays(distanceKm: number | null): string {
  const base = distanceKm != null ? 2.8 + distanceKm / 620 : 3.6;
  const value = Math.min(Math.max(base, 2.4), 12);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
}

function resolveCostSeverity(
  distanceKm: number | null,
  mode: OpportunityMatch['mode'],
  score: number,
): OpportunitySubwayLine['severity'] {
  const distance = distanceKm ?? 0;
  if (distance > 1800 || (mode === 'import' && distance > 1200)) {
    return 'critical';
  }
  if (distance > 900 || score < 60) {
    return 'caution';
  }
  return 'stable';
}

function resolveDelaySeverity(distanceKm: number, score: number): OpportunitySubwayLine['severity'] {
  if (distanceKm > 1600) {
    return 'critical';
  }
  if (distanceKm > 820 || score < 68) {
    return 'caution';
  }
  return 'stable';
}

function resolveCarbonSeverity(
  distanceKm: number | null,
  co2Estimate: number | null,
): OpportunitySubwayLine['severity'] {
  if (co2Estimate != null) {
    if (co2Estimate > 1200) {
      return 'critical';
    }
    if (co2Estimate > 700) {
      return 'caution';
    }
    return 'stable';
  }

  if ((distanceKm ?? 0) > 1400) {
    return 'caution';
  }

  return 'stable';
}

function buildSubwayStations(
  match: OpportunityMatch,
  distanceBadge: OpportunitySubwayStationBadge,
): readonly OpportunitySubwayStation[] {
  const buyerProvinceLabelKey = PROVINCE_LABEL_MAP.get(match.buyer.province) ?? match.buyer.province;
  const buyerSectorLabelKey = SECTOR_LABEL_MAP.get(match.buyer.sector) ?? match.buyer.sector;
  const supplierProvinceLabelKey = PROVINCE_LABEL_MAP.get(match.seller.province) ?? match.seller.province;
  const supplierSectorLabelKey = SECTOR_LABEL_MAP.get(match.seller.sector) ?? match.seller.sector;

  const modeKey =
    match.mode === 'import' || match.mode === 'export'
      ? `opportunities.subway.station.modes.${match.mode}`
      : 'opportunities.subway.station.modes.bilateral';

  const corridorLabel = `${match.buyer.province} ↔ ${match.seller.province}`;

  const stations: OpportunitySubwayStation[] = [
    {
      id: `buyer-${match.id}`,
      role: 'buyer',
      title: match.buyer.name,
      badges: [
        { id: 'buyer-province', labelKey: buyerProvinceLabelKey },
        { id: 'buyer-sector', labelKey: buyerSectorLabelKey },
      ],
    },
    {
      id: `corridor-${match.id}`,
      role: 'partner',
      title: corridorLabel,
      titleKey: 'opportunities.subway.station.corridor',
      badges: [
        { id: 'mode', labelKey: modeKey },
        { id: 'corridor', label: corridorLabel },
      ],
      distanceBadge,
      junction: true,
    },
    {
      id: `supplier-${match.id}`,
      role: 'supplier',
      title: match.seller.name,
      badges: [
        { id: 'supplier-province', labelKey: supplierProvinceLabelKey },
        { id: 'supplier-sector', labelKey: supplierSectorLabelKey },
      ],
    },
  ];

  return stations;
}

function formatLeadTimeSummary(leadTime: OpportunityMiniMapVm['leadTime']): string {
  if (!leadTime) {
    return 'En modélisation';
  }

  const value = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: leadTime.unit === 'weeks' ? 1 : 0,
  }).format(leadTime.value);

  const unitLabel = leadTime.unit === 'weeks' ? 'sem.' : 'jours';
  const prefix = leadTime.approximate ? '≈ ' : '';
  return `${prefix}${value} ${unitLabel}`;
}

function estimateJobsCreated(score: number, distanceKm: number | null): number | null {
  const base = 12 + Math.round(score / 8);

  if (distanceKm == null) {
    return base;
  }

  if (distanceKm > 1700) {
    return Math.max(10, base - 3);
  }

  if (distanceKm < 650) {
    return base + 4;
  }

  return base + 1;
}

function formatImpactFootnote(distanceKm: number | null, approximate: boolean): string {
  const distanceDetail = distanceKm != null
    ? `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(distanceKm)} km`
    : 'corridor à confirmer';

  const precision = approximate ? 'Modélisation interne ±12 %' : 'Estimations consolidées';
  return `${precision} — ${distanceDetail}.`;
}

function createPreviewImage(title: string): string {
  const safeTitle = escapeSvgText(title);
  const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
        <defs>
          <linearGradient id="mini-map-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#0b1120" />
          </linearGradient>
          <radialGradient id="mini-map-halo" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stop-color="rgba(56,189,248,0.45)" />
            <stop offset="100%" stop-color="rgba(15,118,110,0.05)" />
          </radialGradient>
        </defs>
        <rect width="640" height="400" fill="url(#mini-map-gradient)" />
        <circle cx="320" cy="200" r="220" fill="url(#mini-map-halo)" />
        <text x="50%" y="58%" text-anchor="middle" fill="#bae6fd" font-size="28" font-family="'Inter', 'Helvetica', sans-serif">
          ${safeTitle}
        </text>
        <text x="50%" y="72%" text-anchor="middle" fill="rgba(148,163,184,0.85)" font-size="18" font-family="'Inter', 'Helvetica', sans-serif">
          Mini-map statique (L7)
        </text>
      </svg>
    `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeSvgText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveScoreTone(score: number): OpportunityCompactKpiItemVm['scoreTone'] {
  if (score >= 85) {
    return 'high';
  }
  if (score >= 70) {
    return 'medium';
  }
  return 'low';
}

function buildTimelineSteps(
  match: OpportunityMatch,
  leadTime: NonNullable<OpportunityMiniMapVm['leadTime']>,
  logisticsCost: string,
  co2SavedTons: number | null,
): OpportunityTimelineVm['steps'] {
  const corridor = `${match.buyer.province} ↔ ${match.seller.province}`;
  const leadTimeLabel = formatLeadTimeSummary(leadTime);
  const distanceLabel = match.distanceKm != null
    ? `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(match.distanceKm)} km`
    : 'Distance à confirmer';

  return [
    {
      id: 'need',
      title: 'Besoin acheteur',
      summary: `${match.buyer.name} cherche à sécuriser ${match.commodity.toLowerCase()} dans le secteur ${match.buyer.sector}.`,
      kpis: [
        { label: 'Volume cible', value: `${12 + (match.confidence ?? 0) * 4} unités (projection)` },
        { label: 'Fenêtre souhaitée', value: leadTimeLabel },
      ],
    },
    {
      id: 'capacity',
      title: 'Capacité fournisseur',
      summary: `${match.seller.name} opère depuis ${match.seller.province} avec un positionnement ${match.seller.sector}.`,
      kpis: [
        { label: 'Capacité trimestrielle', value: `${Math.round(40 + (match.confidence ?? 0) * 30)} lots` },
        { label: 'Flexibilité', value: '±10 %', hint: 'Sur engagement 12 mois' },
      ],
    },
    {
      id: 'logistics',
      title: 'Logistique & corridor',
      summary: `Corridor ${corridor} avec un délai estimé à ${leadTimeLabel} et un coût moyen ${logisticsCost}/kg.`,
      kpis: [
        { label: 'Distance', value: distanceLabel },
        { label: 'Mode principal', value: match.mode === 'all' ? 'Bimodal' : match.mode === 'import' ? 'Import' : 'Export' },
      ],
    },
    {
      id: 'impact',
      title: 'Impact & retombées',
      summary: 'Retombées climat et emplois qualifiés consolidées dans le dossier opportunité.',
      kpis: [
        {
          label: 'CO₂ évité',
          value:
            co2SavedTons != null
              ? `≈ ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(co2SavedTons)} t/an`
              : 'À modéliser',
        },
        {
          label: 'Emplois estimés',
          value: `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
            estimateJobsCreated(normalizeConfidencePercent(match.confidence), match.distanceKm ?? null) ?? 16,
          )}`,
        },
      ],
    },
  ];
}
