import { Flow, MapKpis } from '@app/state';

import { MapStatsService } from './map-stats.service';

describe('MapStatsService', () => {
  let service: MapStatsService;

  beforeEach(() => {
    service = new MapStatsService();
  });

  it('builds metrics from flows', () => {
    const flows: Flow[] = [
      {
        id: 'flow-1',
        partner: 'QC',
        value: 1200,
        currency: 'CAD',
        quantity: 8,
        quantityUnit: 'Shipments',
        sectorId: 'energy',
      },
      {
        id: 'flow-2',
        partner: 'ON',
        value: 600,
        currency: 'CAD',
        quantity: 2,
        quantityUnit: 'Shipments',
        sectorIds: ['agri-food', 'transport-logistics'],
      },
      {
        id: 'flow-3',
        partner: 'AB',
        sectorId: 'construction',
      },
    ];

    const kpis: MapKpis = { default: {} };

    const metrics = service.buildMetrics(flows, kpis);

    expect(metrics.length).toBe(3);

    const tradeValue = metrics.find((metric) => metric.id === 'tradeValue');
    expect(tradeValue?.value).toBe(1800);
    expect(tradeValue?.kind).toBe('money');

    const exchangeQty = metrics.find((metric) => metric.id === 'exchangeQty');
    expect(exchangeQty?.value).toBe(10);
    expect(exchangeQty?.suffixKey).toBe('map.badges.units.shipments');
    expect(exchangeQty?.series).toEqual([8, 2]);

    const sectors = metrics.find((metric) => metric.id === 'sectors');
    expect(sectors?.value).toBe(4);
    expect(sectors?.series).toEqual([1, 3, 4]);
  });

  it('filters flows by trade partner when provided', () => {
    const flows: Flow[] = [
      {
        id: 'flow-1',
        partner: 'QC',
        value: 100,
        currency: 'CAD',
        quantity: 4,
        quantityUnit: 'Transactions',
        sectorId: 'energy',
      },
      {
        id: 'flow-2',
        partner: 'ON',
        value: 200,
        currency: 'CAD',
        quantity: 3,
        quantityUnit: 'Transactions',
        sectorId: 'mining',
      },
      {
        id: 'flow-3',
        value: 50,
        currency: 'CAD',
        quantity: 1,
        quantityUnit: 'Transactions',
        sectorId: 'transport-logistics',
      },
    ];

    const kpis: MapKpis = { default: {} };

    const metrics = service.buildMetrics(flows, kpis, 'QC');

    const tradeValue = metrics.find((metric) => metric.id === 'tradeValue');
    expect(tradeValue?.value).toBe(150);

    const exchangeQty = metrics.find((metric) => metric.id === 'exchangeQty');
    expect(exchangeQty?.value).toBe(5);

    const sectors = metrics.find((metric) => metric.id === 'sectors');
    expect(sectors?.value).toBe(2);
  });

  it('falls back to snapshot metrics when no flows match', () => {
    const kpis: MapKpis = {
      default: {
        tradeValue: 500,
        tradeValueCurrency: 'CAD',
        tradeVolume: 12,
        tradeVolumeUnit: 'Transactions',
        sectorCount: 4,
      },
      QC: {
        tradeValue: 800,
        tradeValueCurrency: 'CAD',
        tradeVolume: 6,
        tradeVolumeUnit: 'Transactions',
        sectorCount: 3,
      },
    };

    const metrics = service.buildMetrics([], kpis, 'QC');

    const tradeValue = metrics.find((metric) => metric.id === 'tradeValue');
    expect(tradeValue?.value).toBe(800);

    const exchangeQty = metrics.find((metric) => metric.id === 'exchangeQty');
    expect(exchangeQty?.value).toBe(6);
    expect(exchangeQty?.suffixKey).toBe('metrics.transactions');

    const sectors = metrics.find((metric) => metric.id === 'sectors');
    expect(sectors?.value).toBe(3);
  });
});
