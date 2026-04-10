export type Mode = 'import' | 'export' | 'all';

export type SectorType =
  | 'energy'
  | 'mining'
  | 'manufacturing'
  | 'construction'
  | 'agri-food'
  | 'digital-services'
  | 'transport-logistics'
  | 'life-sciences';

export type LegacySectorAlias =
  | 'agri'
  | 'agriculture'
  | 'technology'
  | 'tech'
  | 'clean-energy';

export type ProvinceCode =
  | 'AB'
  | 'BC'
  | 'MB'
  | 'NB'
  | 'NL'
  | 'NS'
  | 'NT'
  | 'NU'
  | 'ON'
  | 'PE'
  | 'QC'
  | 'SK'
  | 'YT';

export interface TaxonomyOption<TValue extends string> {
  readonly value: TValue;
  readonly labelKey: string;
}

export const MODE_OPTIONS: readonly TaxonomyOption<Mode>[] = [
  { value: 'all', labelKey: 'opportunities.filters.mode.all' },
  { value: 'import', labelKey: 'opportunities.filters.mode.import' },
  { value: 'export', labelKey: 'opportunities.filters.mode.export' },
];

export const PROVINCE_OPTIONS: readonly TaxonomyOption<ProvinceCode>[] = [
  { value: 'AB', labelKey: 'provinces.AB' },
  { value: 'BC', labelKey: 'provinces.BC' },
  { value: 'MB', labelKey: 'provinces.MB' },
  { value: 'NB', labelKey: 'provinces.NB' },
  { value: 'NL', labelKey: 'provinces.NL' },
  { value: 'NS', labelKey: 'provinces.NS' },
  { value: 'NT', labelKey: 'provinces.NT' },
  { value: 'NU', labelKey: 'provinces.NU' },
  { value: 'ON', labelKey: 'provinces.ON' },
  { value: 'PE', labelKey: 'provinces.PE' },
  { value: 'QC', labelKey: 'provinces.QC' },
  { value: 'SK', labelKey: 'provinces.SK' },
  { value: 'YT', labelKey: 'provinces.YT' },
];

export const SECTOR_OPTIONS: readonly TaxonomyOption<SectorType>[] = [
  { value: 'energy', labelKey: 'sectors.energy' },
  { value: 'mining', labelKey: 'sectors.mining' },
  { value: 'manufacturing', labelKey: 'sectors.manufacturing' },
  { value: 'construction', labelKey: 'sectors.construction' },
  { value: 'agri-food', labelKey: 'sectors.agri-food' },
  { value: 'digital-services', labelKey: 'sectors.digital-services' },
  { value: 'transport-logistics', labelKey: 'sectors.transport-logistics' },
  { value: 'life-sciences', labelKey: 'sectors.life-sciences' },
];

export const SECTOR_ALIAS_MAP: Readonly<Record<LegacySectorAlias, SectorType>> = {
  agri: 'agri-food',
  agriculture: 'agri-food',
  technology: 'digital-services',
  tech: 'digital-services',
  'clean-energy': 'energy',
};

const PROVINCE_CODE_SET: ReadonlySet<string> = new Set(
  PROVINCE_OPTIONS.map((option) => option.value),
);

const SECTOR_TYPE_SET: ReadonlySet<string> = new Set(
  SECTOR_OPTIONS.map((option) => option.value),
);

const LEGACY_SECTOR_ALIAS_SET: ReadonlySet<string> = new Set(
  Object.keys(SECTOR_ALIAS_MAP),
);

/**
 * Contexte : Invoked when parsing filters originating from query parameters or CMS payloads.
 * Raison d’être : Validates that a provided province code is part of the supported taxonomy before applying it.
 * @param value Candidate province code to validate.
 * @returns True when the code matches a known province entry.
 */
export function isProvinceCode(value: string): value is ProvinceCode {
  return PROVINCE_CODE_SET.has(value);
}

/**
 * Contexte : Used by forms and query parsers to guard sector filters from arbitrary values.
 * Raison d’être : Protects downstream matching logic by ensuring only defined sector identifiers are accepted.
 * @param value Candidate sector identifier.
 * @returns True when the identifier belongs to the supported sector taxonomy.
 */
export function isSectorType(value: string): value is SectorType {
  return SECTOR_TYPE_SET.has(value);
}

/**
 * Contexte : Used when legacy CMS payloads, imports, or query params still carry older sector slugs.
 * Raison d'etre : Resolves known aliases into the canonical sector taxonomy before the rest of the UI consumes them.
 * @param value Candidate sector identifier or legacy alias.
 * @returns Canonical sector slug when recognized, otherwise null.
 */
export function normalizeSectorType(value: string | null | undefined): SectorType | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (SECTOR_TYPE_SET.has(normalized)) {
    return normalized as SectorType;
  }

  if (LEGACY_SECTOR_ALIAS_SET.has(normalized)) {
    return SECTOR_ALIAS_MAP[normalized as LegacySectorAlias];
  }

  return null;
}
