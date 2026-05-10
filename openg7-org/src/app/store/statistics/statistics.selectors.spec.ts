import type { CountryCode } from '@app/core/models/country';
import { StatisticsSnapshot } from '@app/core/models/statistics';

import { StatisticsState } from './statistics.reducer';
import {
  selectStatisticsAvailableCountries,
  selectStatisticsAvailablePeriods,
  selectStatisticsAvailableProvinces,
  selectStatisticsFilters,
  selectStatisticsIsFallback,
  selectStatisticsHasSummaries,
  selectStatisticsHeroSnapshot,
  selectStatisticsInsights,
  selectStatisticsSummaries,
} from './statistics.selectors';

describe('Statistics selectors', () => {
  const summaryA = {
    id: 1,
    slug: 'a',
    scope: 'interprovincial',
    intrant: 'energy',
    value: 120,
    change: 5,
    unitKey: 'pages.statistics.units.billionCAD',
    titleKey: 'summary.a.title',
    descriptionKey: 'summary.a.description',
    period: '2024-Q1',
    province: 'CA-ON',
    country: 'CA',
  } as const;
  const summaryB = {
    id: 2,
    slug: 'b',
    scope: 'interprovincial',
    intrant: 'energy',
    value: 80,
    change: -3,
    unitKey: 'pages.statistics.units.billionCAD',
    titleKey: 'summary.b.title',
    descriptionKey: 'summary.b.description',
    period: '2024-Q2',
    province: 'CA-QC',
    country: 'CA',
  } as const;

  const state: StatisticsState = {
    filters: {
      scope: 'interprovincial',
      intrant: 'energy',
      period: null,
      province: null,
      country: null,
    },
    summaries: [summaryA, summaryB],
    insights: [
      {
        id: 11,
        slug: 'insight',
        scope: 'all',
        intrant: 'all',
        titleKey: 'insight.title',
        descriptionKey: 'insight.description',
        period: null,
        province: null,
        country: null,
      },
    ],
    snapshot: null,
    availablePeriods: ['2024-Q1', '2024-Q2'],
    availableProvinces: ['CA-ON', 'CA-QC'],
    availableCountries: ['CA' as CountryCode],
    isFallback: false,
    loading: false,
    error: null,
  };

  it('selectStatisticsFilters returns current filters', () => {
    expect(selectStatisticsFilters.projector(state)).toEqual(state.filters);
  });

  it('selectStatisticsSummaries returns list of summaries', () => {
    expect(selectStatisticsSummaries.projector(state)).toEqual([summaryA, summaryB]);
  });

  it('selectStatisticsInsights returns list of insights', () => {
    expect(selectStatisticsInsights.projector(state)).toEqual(state.insights);
  });

  it('selectStatisticsAvailablePeriods returns periods', () => {
    expect(selectStatisticsAvailablePeriods.projector(state)).toEqual(['2024-Q1', '2024-Q2']);
  });

  it('selectStatisticsAvailableProvinces returns provinces', () => {
    expect(selectStatisticsAvailableProvinces.projector(state)).toEqual(['CA-ON', 'CA-QC']);
  });

  it('selectStatisticsAvailableCountries returns countries', () => {
    expect(selectStatisticsAvailableCountries.projector(state)).toEqual(['CA']);
  });

  it('selectStatisticsHasSummaries returns true when summaries exist', () => {
    expect(selectStatisticsHasSummaries.projector([summaryA, summaryB])).toBe(true);
    expect(selectStatisticsHasSummaries.projector([])).toBe(false);
  });

  it('selectStatisticsIsFallback returns fallback flag', () => {
    expect(selectStatisticsIsFallback.projector(state)).toBe(false);
  });

  it('selectStatisticsHeroSnapshot computes fallback when snapshot missing', () => {
    const snapshot = selectStatisticsHeroSnapshot.projector(null, [
      summaryA,
      summaryB,
    ]) as StatisticsSnapshot;
    expect(snapshot.totalFlows).toBe(200);
    expect(snapshot.activeCorridors).toBe(2);
    expect(snapshot.totalFlowsUnitKey).toBe('pages.statistics.units.billionCAD');
  });

  it('selectStatisticsHeroSnapshot returns provided snapshot when available', () => {
    const custom: StatisticsSnapshot = {
      totalFlows: 500,
      totalFlowsUnitKey: 'pages.statistics.units.petajoules',
      activeCorridors: 5,
      updatedAt: '2025-01-01T00:00:00.000Z',
    };
    expect(selectStatisticsHeroSnapshot.projector(custom, [summaryA])).toEqual(custom);
  });
});
