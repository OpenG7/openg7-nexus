import { createReducer, on } from '@ngrx/store';

import { MapActions } from './map.actions';
import { MapState } from './map.selectors';

export const initialMapState: MapState = {
  ready: false,
  filteredFlows: [
    {
      id: 'flow-canada-europe-agri',
      partner: 'canada-to-europe',
      tradeMode: 'export',
      value: 1_450_000_000,
      currency: 'CAD',
      quantity: 540,
      quantityUnit: 'transactions',
      sectorId: 'agri-food',
    },
    {
      id: 'flow-canada-europe-cleantech',
      partner: 'canada-to-europe',
      tradeMode: 'export',
      value: 975_000_000,
      currency: 'CAD',
      quantity: 420,
      quantityUnit: 'transactions',
      sectorId: 'energy',
    },
    {
      id: 'flow-canada-europe-digital',
      partner: 'canada-to-europe',
      tradeMode: 'export',
      value: 580_000_000,
      currency: 'CAD',
      quantity: 310,
      quantityUnit: 'transactions',
      sectorId: 'digital-services',
    },
    {
      id: 'flow-canada-domestic-agri',
      partner: 'canada',
      tradeMode: 'export',
      value: 2_300_000_000,
      currency: 'CAD',
      quantity: 780,
      quantityUnit: 'transactions',
      sectorId: 'agri-food',
    },
    {
      id: 'flow-canada-domestic-energy',
      partner: 'canada',
      tradeMode: 'export',
      value: 1_520_000_000,
      currency: 'CAD',
      quantity: 640,
      quantityUnit: 'transactions',
      sectorId: 'energy',
    },
    {
      id: 'flow-canada-domestic-digital',
      partner: 'canada',
      tradeMode: 'export',
      value: 860_000_000,
      currency: 'CAD',
      quantity: 520,
      quantityUnit: 'transactions',
      sectorId: 'digital-services',
    },
    {
      id: 'flow-canada-domestic-life-sciences',
      partner: 'canada',
      tradeMode: 'export',
      value: 430_000_000,
      currency: 'CAD',
      quantity: 350,
      quantityUnit: 'transactions',
      sectorId: 'life-sciences',
    },
  ],
  activeSector: null,
  kpis: {
    'canada-to-europe': {
      tradeValue: 3_005_000_000,
      tradeValueCurrency: 'CAD',
      tradeVolume: 1_270,
      tradeVolumeUnit: 'transactions',
      sectorCount: 3,
    },
    canada: {
      tradeValue: 5_110_000_000,
      tradeValueCurrency: 'CAD',
      tradeVolume: 2_290,
      tradeVolumeUnit: 'transactions',
      sectorCount: 4,
    },
    default: {
      tradeValue: 3_005_000_000,
      tradeValueCurrency: 'CAD',
      tradeVolume: 1_270,
      tradeVolumeUnit: 'transactions',
      sectorCount: 3,
    },
  },
};

export const mapReducer = createReducer(
  initialMapState,
  on(MapActions.mapLoaded, (state) => ({
    ...state,
    ready: true,
  })),
  on(MapActions.flowsFiltered, (state, { flows }) => ({
    ...state,
    filteredFlows: flows,
  })),
  on(MapActions.activeSectorSelected, (state, { sectorId }) => ({
    ...state,
    activeSector: sectorId,
  })),
  on(MapActions.kpisUpdated, (state, { kpis }) => ({
    ...state,
    kpis,
  })),
  on(MapActions.mapReset, () => ({ ...initialMapState }))
);
