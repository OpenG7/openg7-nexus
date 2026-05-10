import {
  StatisticsFilters,
  StatisticsSnapshot,
  StatisticsSummary,
} from '@app/core/models/statistics';
import { createFeatureSelector, createSelector } from '@ngrx/store';

import { StatisticsState } from './statistics.reducer';

export const selectStatisticsState = createFeatureSelector<StatisticsState>('statistics');

export const selectStatisticsFilters = createSelector(
  selectStatisticsState,
  (state): StatisticsFilters => state.filters,
);

export const selectStatisticsSummaries = createSelector(
  selectStatisticsState,
  (state) => state.summaries,
);

export const selectStatisticsInsights = createSelector(
  selectStatisticsState,
  (state) => state.insights,
);

export const selectStatisticsSnapshot = createSelector(
  selectStatisticsState,
  (state) => state.snapshot,
);

export const selectStatisticsHeroSnapshot = createSelector(
  selectStatisticsSnapshot,
  selectStatisticsSummaries,
  (snapshot, summaries): StatisticsSnapshot | null => {
    if (snapshot) {
      return snapshot;
    }
    if (!summaries.length) {
      return null;
    }
    return computeSnapshot(summaries);
  },
);

export const selectStatisticsAvailablePeriods = createSelector(
  selectStatisticsState,
  (state) => state.availablePeriods,
);

export const selectStatisticsAvailableProvinces = createSelector(
  selectStatisticsState,
  (state) => state.availableProvinces,
);

export const selectStatisticsAvailableCountries = createSelector(
  selectStatisticsState,
  (state) => state.availableCountries,
);

export const selectStatisticsLoading = createSelector(
  selectStatisticsState,
  (state) => state.loading,
);

export const selectStatisticsIsFallback = createSelector(
  selectStatisticsState,
  (state) => state.isFallback,
);

export const selectStatisticsError = createSelector(selectStatisticsState, (state) => state.error);

export const selectStatisticsHasSummaries = createSelector(
  selectStatisticsSummaries,
  (summaries) => summaries.length > 0,
);

const computeSnapshot = (summaries: readonly StatisticsSummary[]): StatisticsSnapshot => {
  const totalFlows = summaries.reduce((total, summary) => total + (summary.value ?? 0), 0);
  const unitKey = summaries.find((summary) => summary.unitKey)?.unitKey ?? null;
  const activeCorridors = new Set(
    summaries
      .map((summary) => summary.province)
      .filter((value): value is string => typeof value === 'string' && value.trim() !== ''),
  ).size;

  return {
    totalFlows,
    totalFlowsUnitKey: unitKey,
    activeCorridors,
    updatedAt: new Date().toISOString(),
  };
};
