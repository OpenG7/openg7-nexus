import { ImportationFilters } from '../models/importation.models';

import {
  ImportationCommodityCollectionsDto,
  ImportationFlowsResponseDto,
  ImportationRiskFlagDto,
} from './importation-api.client';
import { ImportationViewModelMapper } from './importation.viewmodel.mapper';

describe('ImportationViewModelMapper', () => {
  let mapper: ImportationViewModelMapper;

  const filters: ImportationFilters = {
    periodGranularity: 'month',
    periodValue: null,
    originScope: 'global',
    originCodes: [],
    hsSections: [],
    compareMode: false,
    compareWith: null,
  };

  beforeEach(() => {
    mapper = new ImportationViewModelMapper();
  });

  it('maps flow map view-model including loading state and legend bounds', () => {
    const response: ImportationFlowsResponseDto = {
      timeline: [
        { period: '2024-01', label: 'Jan 2024', totalValue: 1000, yoyDelta: 2.5 },
        { period: '2023-12', label: 'Dec 2023', totalValue: 800, yoyDelta: -1.5 },
      ],
      flows: [
        {
          originCode: 'US',
          originName: 'United States',
          value: 600,
          yoyDelta: 3.4,
          share: 0.6,
          corridors: [
            { target: 'ON', value: 300, delta: 1.2 },
            { target: 'QC', value: 200, delta: -0.5 },
          ],
        },
        {
          originCode: 'JP',
          originName: 'Japan',
          value: 400,
          yoyDelta: -1.1,
          share: 0.4,
          corridors: [],
        },
      ],
      coverage: 0.82,
      lastUpdated: '2024-01-10',
      dataProvider: 'StatCan',
    };

    const vm = mapper.mapFlowMap(filters, response, null, true, true, null);

    expect(vm.loading).toBeTrue();
    expect(vm.timeline.length).toBe(2);
    expect(vm.legendMin).toBe(400);
    expect(vm.legendMax).toBe(600);
    expect(vm.flows[0]).toEqual(
      jasmine.objectContaining({
        originCode: 'US',
        corridors: jasmine.arrayContaining([
          jasmine.objectContaining({ target: 'ON', value: 300 }),
        ]),
      }),
    );
  });

  it('maps commodity section with selected commodity flags', () => {
    const collections: ImportationCommodityCollectionsDto = {
      top: [
        {
          id: 'steel',
          hsCode: '7208',
          label: 'Flat-rolled steel',
          value: 1250000,
          yoyDelta: 4.2,
          riskScore: 3.8,
          sparkline: [1, 2, 3],
          flags: ['shortage'],
        },
      ],
      emerging: [],
      risk: [],
    };
    const riskFlags: readonly ImportationRiskFlagDto[] = [
      { id: 'shortage', severity: 'high', title: 'Shortage risk', description: 'Global shortage' },
    ];

    const vm = mapper.mapCommoditySection(
      filters,
      collections,
      riskFlags,
      'top',
      'steel',
      false,
      true,
      null,
    );

    expect(vm.loading).toBeFalse();
    expect(vm.rows.length).toBe(1);
    expect(vm.selectedCommodityFlags[0]?.id).toBe('shortage');
    expect(vm.canExport).toBeTrue();
  });
});
