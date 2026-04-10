import type { CountryCode } from './country';
import type { SectorType } from './opportunity-taxonomies';

export type StatisticsScope = 'interprovincial' | 'international' | 'all';
export type StatisticsIntrant =
  | 'all'
  | Extract<SectorType, 'energy' | 'agri-food' | 'manufacturing' | 'digital-services'>;

export interface StatisticsFilters {
  readonly scope: StatisticsScope;
  readonly intrant: StatisticsIntrant;
  readonly period: string | null;
  readonly province: string | null;
  readonly country: CountryCode | null;
}

export interface StatisticsSummary {
  readonly id: number;
  readonly slug: string | null;
  readonly scope: StatisticsScope;
  readonly intrant: StatisticsIntrant;
  readonly value: number | null;
  readonly change: number | null;
  readonly unitKey: string | null;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly period: string | null;
  readonly province: string | null;
  readonly country: CountryCode | null;
}

export interface StatisticsInsight {
  readonly id: number;
  readonly slug: string | null;
  readonly scope: StatisticsScope;
  readonly intrant: StatisticsIntrant;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly period: string | null;
  readonly province: string | null;
  readonly country: CountryCode | null;
}

export interface StatisticsSnapshot {
  readonly totalFlows: number | null;
  readonly totalFlowsUnitKey: string | null;
  readonly activeCorridors: number;
  readonly updatedAt: string | null;
}

export interface StatisticsPayload {
  readonly summaries: readonly StatisticsSummary[];
  readonly insights: readonly StatisticsInsight[];
  readonly snapshot: StatisticsSnapshot | null;
  readonly availablePeriods: readonly string[];
  readonly availableProvinces: readonly string[];
  readonly availableCountries: readonly CountryCode[];
  readonly filters: StatisticsFilters;
  readonly isFallback: boolean;
}
