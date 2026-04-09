import type { Mode, ProvinceCode, SectorType } from './opportunity-taxonomies';

export type {
  LegacySectorAlias,
  Mode,
  ProvinceCode,
  SectorType,
  TaxonomyOption,
} from './opportunity-taxonomies';
export {
  MODE_OPTIONS,
  PROVINCE_OPTIONS,
  SECTOR_OPTIONS,
  isProvinceCode,
  isSectorType,
  normalizeSectorType,
} from './opportunity-taxonomies';

export interface CompanySummary {
  readonly id: number;
  readonly name: string;
  readonly province: ProvinceCode;
  readonly sector: SectorType;
  readonly capability: Mode;
}

export interface OpportunityMatch {
  readonly id: number;
  readonly commodity: string;
  readonly mode: Mode;
  readonly buyer: CompanySummary;
  readonly seller: CompanySummary;
  readonly confidence: number;
  readonly distanceKm?: number | null;
  readonly co2Estimate?: number | null;
}

export interface OpportunityMatchQuery {
  readonly q?: string;
  readonly province?: ProvinceCode;
  readonly sector?: SectorType;
  readonly mode?: Exclude<Mode, 'all'>;
  readonly page?: number;
  readonly pageSize?: number;
}

/**
 * Normalises a raw confidence value in the range [0, 1] into a percentage.
 * Any non-finite value (undefined, null, NaN, +/-Infinity) gracefully falls
 * back to `0` to avoid surfacing invalid scores in the UI.
 */
export function normalizeConfidencePercent(confidence?: number | null): number {
  if (!Number.isFinite(confidence ?? NaN)) {
    return 0;
  }
  const bounded = Math.min(Math.max(confidence as number, 0), 1);
  return Math.round(bounded * 100);
}

