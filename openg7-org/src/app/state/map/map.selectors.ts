import { createFeatureSelector, createSelector } from '@ngrx/store';

export interface Flow {
  id: string;
  partner?: string;
  tradeMode?: 'import' | 'export';
  value?: number;
  currency?: string;
  quantity?: number;
  quantityUnit?: string;
  sectorId?: string;
  sectorIds?: string[];
}

export interface MapKpiSnapshot {
  tradeValue?: number | null;
  tradeValueCurrency?: string;
  tradeVolume?: number | null;
  tradeVolumeUnit?: string | null;
  sectorCount?: number | null;
}

export interface MapKpiComputed {
  tradeValue: number | null;
  tradeValueCurrency: string;
  tradeVolume: number | null;
  tradeVolumeUnit: string | null;
  sectorCount: number | null;
}

export interface MapKpis {
  default?: MapKpiSnapshot;
  [key: string]: MapKpiSnapshot | undefined;
}

export interface MapState {
  ready: boolean;
  filteredFlows: Flow[];
  activeSector: string | null;
  kpis: MapKpis;
}

export const DEFAULT_MAP_KPI_SNAPSHOT: MapKpiComputed = {
  tradeValue: null,
  tradeValueCurrency: 'CAD',
  tradeVolume: null,
  tradeVolumeUnit: null,
  sectorCount: null,
};

export function computeMapKpiSnapshot(flows: Flow[], fallback?: MapKpiSnapshot): MapKpiComputed {
  const base: MapKpiComputed = {
    tradeValue: fallback?.tradeValue ?? DEFAULT_MAP_KPI_SNAPSHOT.tradeValue,
    tradeValueCurrency: fallback?.tradeValueCurrency ?? DEFAULT_MAP_KPI_SNAPSHOT.tradeValueCurrency,
    tradeVolume: fallback?.tradeVolume ?? DEFAULT_MAP_KPI_SNAPSHOT.tradeVolume,
    tradeVolumeUnit: fallback?.tradeVolumeUnit ?? DEFAULT_MAP_KPI_SNAPSHOT.tradeVolumeUnit,
    sectorCount: fallback?.sectorCount ?? DEFAULT_MAP_KPI_SNAPSHOT.sectorCount,
  };

  if (!flows.length) {
    return base;
  }

  const valueFlows = flows.filter((flow) => typeof flow.value === 'number');
  const hasValueMetrics = valueFlows.length > 0;
  const tradeValue = hasValueMetrics
    ? valueFlows.reduce((total, flow) => total + (flow.value ?? 0), 0)
    : base.tradeValue;
  const tradeValueCurrency =
    valueFlows.find((flow) => flow.currency)?.currency ?? base.tradeValueCurrency;

  const volumeFlows = flows.filter((flow) => typeof flow.quantity === 'number');
  const hasVolumeMetrics = volumeFlows.length > 0;
  const tradeVolume = hasVolumeMetrics
    ? volumeFlows.reduce((total, flow) => total + (flow.quantity ?? 0), 0)
    : base.tradeVolume;
  const tradeVolumeUnit =
    volumeFlows.find((flow) => flow.quantityUnit)?.quantityUnit ?? base.tradeVolumeUnit;

  const sectorIds = new Set<string>();
  for (const flow of flows) {
    if (typeof flow.sectorId === 'string' && flow.sectorId.trim().length > 0) {
      sectorIds.add(flow.sectorId);
    }
    if (Array.isArray(flow.sectorIds)) {
      for (const id of flow.sectorIds) {
        if (typeof id === 'string' && id.trim().length > 0) {
          sectorIds.add(id);
        }
      }
    }
  }
  const hasSectorMetrics = sectorIds.size > 0;
  const sectorCount = hasSectorMetrics ? sectorIds.size : base.sectorCount;

  return {
    tradeValue,
    tradeValueCurrency,
    tradeVolume,
    tradeVolumeUnit,
    sectorCount,
  };
}

export const selectMapState = createFeatureSelector<MapState>('map');

export const selectMapReady = createSelector(selectMapState, (state: MapState) => state.ready);

export const selectFilteredFlows = createSelector(
  selectMapState,
  (state: MapState) => state.filteredFlows,
);

export const selectActiveSector = createSelector(
  selectMapState,
  (state: MapState) => state.activeSector,
);

export const selectMapKpis = createSelector(selectMapState, (state: MapState) => state.kpis);
