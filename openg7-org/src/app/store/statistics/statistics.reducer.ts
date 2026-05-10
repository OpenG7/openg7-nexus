import type { CountryCode } from '@app/core/models/country';
import {
  StatisticsFilters,
  StatisticsInsight,
  StatisticsSnapshot,
  StatisticsSummary,
} from '@app/core/models/statistics';
import { createReducer, on } from '@ngrx/store';

import { StatisticsActions } from './statistics.actions';

export interface StatisticsState {
  readonly filters: StatisticsFilters;
  readonly summaries: readonly StatisticsSummary[];
  readonly insights: readonly StatisticsInsight[];
  readonly snapshot: StatisticsSnapshot | null;
  readonly availablePeriods: readonly string[];
  readonly availableProvinces: readonly string[];
  readonly availableCountries: readonly CountryCode[];
  readonly isFallback: boolean;
  readonly loading: boolean;
  readonly error: string | null;
}

const defaultFilters: StatisticsFilters = {
  scope: 'interprovincial',
  intrant: 'all',
  period: null,
  province: null,
  country: null,
};

const initialState: StatisticsState = {
  filters: defaultFilters,
  summaries: [],
  insights: [],
  snapshot: null,
  availablePeriods: [],
  availableProvinces: [],
  availableCountries: [] as CountryCode[],
  isFallback: false,
  loading: false,
  error: null,
};

export const statisticsReducer = createReducer(
  initialState,
  on(StatisticsActions.initialize, (state) => ({
    ...state,
    isFallback: false,
    loading: true,
    error: null,
  })),
  on(StatisticsActions.resetFilters, (state) => ({
    ...state,
    filters: defaultFilters,
    isFallback: false,
    loading: true,
    error: null,
  })),
  on(StatisticsActions.changeScope, (state, { scope }) => ({
    ...state,
    filters: {
      ...state.filters,
      scope,
      period: null,
      province: null,
      country: null,
    },
    isFallback: false,
    loading: true,
    error: null,
  })),
  on(StatisticsActions.changeIntrant, (state, { intrant }) => ({
    ...state,
    filters: {
      ...state.filters,
      intrant,
      period: null,
      province: null,
      country: null,
    },
    isFallback: false,
    loading: true,
    error: null,
  })),
  on(StatisticsActions.changePeriod, (state, { period }) => ({
    ...state,
    filters: {
      ...state.filters,
      period,
    },
    isFallback: false,
    loading: true,
    error: null,
  })),
  on(StatisticsActions.changeProvince, (state, { province }) => ({
    ...state,
    filters: {
      ...state.filters,
      province,
    },
    isFallback: false,
    loading: true,
    error: null,
  })),
  on(StatisticsActions.changeCountry, (state, { country }) => ({
    ...state,
    filters: {
      ...state.filters,
      country,
    },
    isFallback: false,
    loading: true,
    error: null,
  })),
  on(StatisticsActions.loadStatistics, (state, { filters }) => ({
    ...state,
    filters,
    isFallback: false,
    loading: true,
    error: null,
  })),
  on(StatisticsActions.loadStatisticsSuccess, (state, { payload }) => ({
    ...state,
    summaries: payload.summaries,
    insights: payload.insights,
    snapshot: payload.snapshot,
    availablePeriods: payload.availablePeriods,
    availableProvinces: payload.availableProvinces,
    availableCountries: payload.availableCountries,
    filters: payload.filters,
    isFallback: payload.isFallback,
    loading: false,
    error: null,
  })),
  on(StatisticsActions.loadStatisticsFailure, (state, { error }) => ({
    ...state,
    isFallback: false,
    loading: false,
    error,
  })),
);
