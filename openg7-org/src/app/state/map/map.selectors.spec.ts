import { MapActions } from './map.actions';
import { mapReducer, initialMapState } from './map.reducer';
import {
  selectMapState,
  selectMapReady,
  selectFilteredFlows,
  selectActiveSector,
  selectMapKpis,
  MapState,
  Flow,
  MapKpis,
  computeMapKpiSnapshot,
  MapKpiSnapshot,
} from './map.selectors';

describe('Map Selectors', () => {
  const flows: Flow[] = [
    {
      id: 'f1',
      value: 150,
      currency: 'CAD',
      quantity: 5,
      quantityUnit: 'transactions',
      sectorId: 's1',
    },
  ];
  const kpis: MapKpis = {
    canada: {
      tradeValue: 500,
      tradeValueCurrency: 'CAD',
      tradeVolume: 25,
      tradeVolumeUnit: 'transactions',
      sectorCount: 4,
    },
  };
  const state: { map: MapState } = {
    map: {
      ready: true,
      filteredFlows: flows,
      activeSector: 's1',
      kpis,
    },
  };

  it('should select map state', () => {
    expect(selectMapState(state)).toEqual(state.map);
  });

  it('should select map ready', () => {
    expect(selectMapReady(state)).toBeTrue();
  });

  it('should select filtered flows', () => {
    expect(selectFilteredFlows(state)).toEqual(flows);
  });

  it('should select active sector', () => {
    expect(selectActiveSector(state)).toBe('s1');
  });

  it('should select map kpis', () => {
    expect(selectMapKpis(state)).toEqual(kpis);
  });
});

describe('mapReducer', () => {
  it('should toggle ready flag on mapLoaded', () => {
    const state = mapReducer(initialMapState, MapActions.mapLoaded());
    expect(state.ready).toBeTrue();
  });

  it('should update flows, sector and kpis', () => {
    const flows: Flow[] = [{ id: 'f1' }];
    const kpis: MapKpis = { default: { tradeValue: 10, tradeValueCurrency: 'CAD' } };

    const withFlows = mapReducer(initialMapState, MapActions.flowsFiltered({ flows }));
    expect(withFlows.filteredFlows).toEqual(flows);

    const withSector = mapReducer(withFlows, MapActions.activeSectorSelected({ sectorId: 's1' }));
    expect(withSector.activeSector).toBe('s1');

    const withKpis = mapReducer(withSector, MapActions.kpisUpdated({ kpis }));
    expect(withKpis.kpis).toEqual(kpis);
  });

  it('should reset the slice', () => {
    const mutated = mapReducer(
      initialMapState,
      MapActions.flowsFiltered({ flows: [{ id: 'f1' }] }),
    );

    const reset = mapReducer(mutated, MapActions.mapReset());

    expect(reset).toEqual(initialMapState);
  });
});

describe('computeMapKpiSnapshot', () => {
  it('should aggregate metrics from flows', () => {
    const flows: Flow[] = [
      {
        id: 'f1',
        value: 100,
        currency: 'CAD',
        quantity: 2,
        quantityUnit: 'transactions',
        sectorId: 's1',
      },
      {
        id: 'f2',
        value: 50,
        currency: 'CAD',
        quantity: 1,
        quantityUnit: 'transactions',
        sectorId: 's2',
      },
    ];

    expect(computeMapKpiSnapshot(flows)).toEqual({
      tradeValue: 150,
      tradeValueCurrency: 'CAD',
      tradeVolume: 3,
      tradeVolumeUnit: 'transactions',
      sectorCount: 2,
    });
  });

  it('should fallback to provided snapshot when flows are missing', () => {
    const fallback: MapKpiSnapshot = {
      tradeValue: 1_000,
      tradeValueCurrency: 'USD',
      tradeVolume: 25,
      tradeVolumeUnit: 'shipments',
      sectorCount: 5,
    };

    expect(computeMapKpiSnapshot([], fallback)).toEqual({
      tradeValue: 1_000,
      tradeValueCurrency: 'USD',
      tradeVolume: 25,
      tradeVolumeUnit: 'shipments',
      sectorCount: 5,
    });
  });

  it('should use fallback metrics when flows lack specific data', () => {
    const flows: Flow[] = [{ id: 'f1' }];
    const fallback: MapKpiSnapshot = {
      tradeValue: 200,
      tradeValueCurrency: 'CAD',
      tradeVolume: 10,
      tradeVolumeUnit: 'transactions',
      sectorCount: 3,
    };

    expect(computeMapKpiSnapshot(flows, fallback)).toEqual({
      tradeValue: 200,
      tradeValueCurrency: 'CAD',
      tradeVolume: 10,
      tradeVolumeUnit: 'transactions',
      sectorCount: 3,
    });
  });
});
