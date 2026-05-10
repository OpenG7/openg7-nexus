import type { Core } from '@strapi/strapi';

type SearchEngineDriver = 'meilisearch' | 'opensearch';

type PrimitiveId = string | number;

type ProvinceLike =
  | null
  | undefined
  | PrimitiveId
  | {
      id?: PrimitiveId;
      name?: string | null;
      slug?: string | null;
      code?: string | null;
    };

type SectorLike =
  | null
  | undefined
  | PrimitiveId
  | {
      id?: PrimitiveId;
      name?: string | null;
      slug?: string | null;
    };

interface CompanyEntity {
  id?: PrimitiveId;
  slug?: string | null;
  name?: string | null;
  description?: string | null;
  website?: string | null;
  country?: string | null;
  status?: string | null;
  verificationStatus?: string | null;
  trustScore?: number | string | null;
  capacities?: Record<string, unknown> | null;
  locale?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  sector?: SectorLike;
  province?: ProvinceLike;
}

interface ExchangeEntity {
  id?: PrimitiveId;
  unit?: string | null;
  value?: number | string | null;
  sourceProvince?: ProvinceLike;
  targetProvince?: ProvinceLike;
}

interface ProvinceSummary {
  id: PrimitiveId | null;
  name: string | null;
  slug: string | null;
  code: string | null;
}

interface SectorSummary {
  id: PrimitiveId | null;
  name: string | null;
  slug: string | null;
}

interface CompanyDocument {
  id: PrimitiveId;
  slug: string | null;
  name: string | null;
  description: string | null;
  website: string | null;
  country: string | null;
  status: string | null;
  verificationStatus: string | null;
  trustScore: number | null;
  capacities: Record<string, unknown> | null;
  locale: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  province: ProvinceSummary | null;
  sector: SectorSummary | null;
  searchText: string;
}

interface ExchangeDocument {
  id: PrimitiveId;
  unit: string | null;
  value: number | null;
  sourceProvince: ProvinceSummary | null;
  targetProvince: ProvinceSummary | null;
  searchText: string;
}

type HighlightMap = Record<string, string>;

interface SearchResponse<T> {
  hits: T[];
  took: number;
  total: number;
}

interface SearchResultPayload {
  query: string;
  took: number;
  total: number;
  companies: Array<CompanyDocument & { highlights?: HighlightMap }>;
  exchanges: Array<ExchangeDocument & { highlights?: HighlightMap }>;
  engine: {
    enabled: boolean;
    driver: SearchEngineDriver | null;
    indices: {
      companies: string;
      exchanges: string;
    };
  };
}

interface SearchOptions {
  limit?: number;
  locale?: string | null;
  type?: 'companies' | 'exchanges' | 'all';
}

interface RequestOptions<T> {
  body?: unknown;
  parseJson?: boolean;
  query?: Record<string, string | number | boolean | undefined>;
}

type MeiliSearchHit<T> = T & {
  _formatted?: Record<string, string> | null;
};

interface MeiliSearchResponse<T> {
  hits: Array<MeiliSearchHit<T>>;
  estimatedTotalHits?: number;
  processingTimeMs?: number;
}

interface OpenSearchHit<T> {
  _id: string;
  _source: T;
  highlight?: Record<string, string[]>;
}

interface OpenSearchResponse<T> {
  took?: number;
  hits?: {
    total?: { value?: number } | number;
    hits?: Array<OpenSearchHit<T>>;
  };
}

declare const strapi: Core.Strapi;

const toNumber = (value: unknown): number | null => {
  if (value == null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isPrimitiveId = (value: unknown): value is PrimitiveId =>
  typeof value === 'string' || typeof value === 'number';

const normalizeDriver = (value: unknown): SearchEngineDriver => {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return raw === 'opensearch' ? 'opensearch' : 'meilisearch';
};

const rawDriver = process.env.SEARCH_ENGINE_DRIVER;
const rawUrl = process.env.SEARCH_ENGINE_URL ?? process.env.SEARCH_ENGINE_HOST ?? '';
const rawApiKey = process.env.SEARCH_ENGINE_API_KEY ?? '';
const rawAuthHeader = process.env.SEARCH_ENGINE_AUTH_HEADER;
const rawAuthScheme = process.env.SEARCH_ENGINE_AUTH_SCHEME;
const rawCompaniesIndex = process.env.SEARCH_ENGINE_INDEX_COMPANIES;
const rawExchangesIndex = process.env.SEARCH_ENGINE_INDEX_EXCHANGES;

const driver = normalizeDriver(rawDriver);
const baseUrl = rawUrl.trim().replace(/\/$/, '');
const apiKey = rawApiKey.trim();
const defaultAuthHeader = driver === 'meilisearch' ? 'X-Meili-API-Key' : 'Authorization';
const defaultAuthScheme = driver === 'meilisearch' ? '' : 'Bearer';

const authHeader = (() => {
  if (rawAuthHeader == null) {
    return defaultAuthHeader;
  }
  const normalized = rawAuthHeader.trim();
  return normalized.length > 0 ? normalized : defaultAuthHeader;
})();

const authScheme = rawAuthScheme == null ? defaultAuthScheme : rawAuthScheme.trim();
const companiesIndex = (rawCompaniesIndex ?? 'companies').trim();
const exchangesIndex = (rawExchangesIndex ?? 'exchanges').trim();

const searchConfig = {
  enabled: baseUrl.length > 0,
  driver,
  baseUrl,
  apiKey: apiKey.length > 0 ? apiKey : null,
  authHeader: authHeader.length > 0 ? authHeader : defaultAuthHeader,
  authScheme: authScheme.length > 0 || defaultAuthScheme === '' ? authScheme : defaultAuthScheme,
  indices: {
    companies: companiesIndex.length > 0 ? companiesIndex : 'companies',
    exchanges: exchangesIndex.length > 0 ? exchangesIndex : 'exchanges',
  },
};

let warnedDisabled = false;

const logDebug = (message: string, meta?: Record<string, unknown>) => {
  if (typeof strapi?.log?.debug === 'function') {
    strapi.log.debug(message, meta);
    return;
  }
  // eslint-disable-next-line no-console
  console.debug(message, meta ?? {});
};

const logError = (message: string, meta?: Record<string, unknown>) => {
  if (typeof strapi?.log?.error === 'function') {
    strapi.log.error(message, meta);
    return;
  }

  console.error(message, meta ?? {});
};

const ensureEnabled = (): boolean => {
  if (searchConfig.enabled) {
    return true;
  }
  if (!warnedDisabled) {
    warnedDisabled = true;
    logDebug('Search engine integration disabled (missing SEARCH_ENGINE_URL).');
  }
  return false;
};

const buildUrl = (
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = searchConfig.baseUrl;
  if (!query) {
    return `${base}${normalizedPath}`;
  }
  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  if (!params) {
    return `${base}${normalizedPath}`;
  }
  return `${base}${normalizedPath}?${params}`;
};

async function sendRequest<T>(
  method: string,
  path: string,
  options: RequestOptions<T> = {},
): Promise<T | null> {
  if (!ensureEnabled()) {
    return null;
  }

  const url = buildUrl(path, options.query);
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.parseJson) {
    headers['Accept'] = 'application/json';
  }

  if (searchConfig.apiKey) {
    const scheme = searchConfig.authScheme;
    headers[searchConfig.authHeader] = scheme
      ? `${scheme} ${searchConfig.apiKey}`
      : searchConfig.apiKey;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text || 'Search request failed'}`);
    }

    if (!options.parseJson) {
      return null;
    }

    if (response.status === 204) {
      return null;
    }

    const data = (await response.json()) as T;
    return data;
  } catch (error) {
    logError('Search engine request failed', {
      method,
      path,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

const toProvinceSummary = (value: ProvinceLike): ProvinceSummary | null => {
  if (value == null) {
    return null;
  }
  if (isPrimitiveId(value)) {
    return { id: value, name: null, slug: null, code: null };
  }
  return {
    id: value.id ?? null,
    name: value.name ?? null,
    slug: value.slug ?? null,
    code: value.code ?? null,
  };
};

const toSectorSummary = (value: SectorLike): SectorSummary | null => {
  if (value == null) {
    return null;
  }
  if (isPrimitiveId(value)) {
    return { id: value, name: null, slug: null };
  }
  return {
    id: value.id ?? null,
    name: value.name ?? null,
    slug: value.slug ?? null,
  };
};

const buildSearchText = (parts: Array<string | null | undefined>): string => {
  return parts
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part.length > 0)
    .join(' ');
};

const toCompanyDocument = (entity: CompanyEntity | null): CompanyDocument | null => {
  if (!entity?.id) {
    return null;
  }

  const published = Object.prototype.hasOwnProperty.call(entity, 'publishedAt')
    ? entity.publishedAt != null
    : true;

  if (!published) {
    return null;
  }

  const province = toProvinceSummary(entity.province);
  const sector = toSectorSummary(entity.sector);
  const trustScore = toNumber(entity.trustScore);

  return {
    id: entity.id,
    slug: entity.slug ?? null,
    name: typeof entity.name === 'string' ? entity.name : (entity.slug ?? null),
    description: typeof entity.description === 'string' ? entity.description : null,
    website: typeof entity.website === 'string' ? entity.website : null,
    country: typeof entity.country === 'string' ? entity.country : null,
    status: typeof entity.status === 'string' ? entity.status : null,
    verificationStatus:
      typeof entity.verificationStatus === 'string' ? entity.verificationStatus : null,
    trustScore,
    capacities: entity.capacities ?? null,
    locale: typeof entity.locale === 'string' ? entity.locale : null,
    publishedAt: entity.publishedAt ?? null,
    updatedAt: entity.updatedAt ?? null,
    province,
    sector,
    searchText: buildSearchText([
      typeof entity.name === 'string' ? entity.name : null,
      typeof entity.description === 'string' ? entity.description : null,
      province?.name ?? null,
      province?.code ?? null,
      sector?.name ?? null,
    ]),
  };
};

const toExchangeDocument = (entity: ExchangeEntity | null): ExchangeDocument | null => {
  if (!entity?.id) {
    return null;
  }

  const sourceProvince = toProvinceSummary(entity.sourceProvince);
  const targetProvince = toProvinceSummary(entity.targetProvince);
  const value = toNumber(entity.value);

  return {
    id: entity.id,
    unit: typeof entity.unit === 'string' ? entity.unit : null,
    value,
    sourceProvince,
    targetProvince,
    searchText: buildSearchText([
      sourceProvince?.name ?? null,
      targetProvince?.name ?? null,
      sourceProvince?.code ?? null,
      targetProvince?.code ?? null,
      value != null ? String(value) : null,
      typeof entity.unit === 'string' ? entity.unit : null,
    ]),
  };
};

const ensureCompanyEntity = async (value: CompanyEntity | PrimitiveId | null | undefined) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'object' && value.province && typeof value.province === 'object') {
    return value;
  }
  const id = typeof value === 'number' || typeof value === 'string' ? value : value.id;
  if (!id) {
    return null;
  }
  const locale = typeof value === 'object' ? (value.locale ?? undefined) : undefined;
  try {
    const entity = (await strapi.entityService.findOne('api::company.company', id, {
      populate: {
        province: { fields: ['id', 'name', 'slug', 'code'] },
        sector: { fields: ['id', 'name', 'slug'] },
      },
      locale,
      publicationState: 'preview',
    })) as CompanyEntity | null;
    return entity;
  } catch (error) {
    logError('Failed to load company entity for search indexing', {
      id,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const ensureExchangeEntity = async (value: ExchangeEntity | PrimitiveId | null | undefined) => {
  if (!value) {
    return null;
  }
  if (
    typeof value === 'object' &&
    value.sourceProvince &&
    typeof value.sourceProvince === 'object' &&
    value.targetProvince &&
    typeof value.targetProvince === 'object'
  ) {
    return value;
  }
  const id = typeof value === 'number' || typeof value === 'string' ? value : value.id;
  if (!id) {
    return null;
  }
  try {
    const entity = (await strapi.entityService.findOne('api::exchange.exchange', id, {
      populate: {
        sourceProvince: { fields: ['id', 'name', 'slug', 'code'] },
        targetProvince: { fields: ['id', 'name', 'slug', 'code'] },
      },
    })) as ExchangeEntity | null;
    return entity;
  } catch (error) {
    logError('Failed to load exchange entity for search indexing', {
      id,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const indexDocument = async (indexName: string, document: CompanyDocument | ExchangeDocument) => {
  if (!ensureEnabled()) {
    return;
  }
  const payload = [{ ...document, id: String(document.id) }];

  if (searchConfig.driver === 'meilisearch') {
    await sendRequest('POST', `/indexes/${indexName}/documents`, {
      body: payload,
    });
    return;
  }

  await sendRequest('PUT', `/${indexName}/_doc/${encodeURIComponent(String(document.id))}`, {
    body: document,
  });
};

const deleteDocument = async (indexName: string, id: PrimitiveId) => {
  if (!ensureEnabled()) {
    return;
  }

  if (searchConfig.driver === 'meilisearch') {
    await sendRequest(
      'DELETE',
      `/indexes/${indexName}/documents/${encodeURIComponent(String(id))}`,
    );
    return;
  }

  await sendRequest('DELETE', `/${indexName}/_doc/${encodeURIComponent(String(id))}`);
};

const mapMeiliHighlights = (
  formatted: Record<string, string> | null | undefined,
): HighlightMap | undefined => {
  if (!formatted) {
    return undefined;
  }
  return Object.keys(formatted).reduce<HighlightMap>((acc, key) => {
    const value = formatted[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const mapOpenSearchHighlights = (
  highlight: Record<string, string[]> | undefined,
): HighlightMap | undefined => {
  if (!highlight) {
    return undefined;
  }
  return Object.keys(highlight).reduce<HighlightMap>((acc, key) => {
    const first = highlight[key]?.[0];
    if (typeof first === 'string' && first.trim().length > 0) {
      acc[key] = first;
    }
    return acc;
  }, {});
};

const searchCompaniesMeili = async (
  query: string,
  limit: number,
  locale: string | null,
): Promise<SearchResponse<CompanyDocument & { highlights?: HighlightMap }>> => {
  const filters = locale ? [`locale = "${locale}"`] : undefined;
  const response = await sendRequest<MeiliSearchResponse<CompanyDocument>>(
    'POST',
    `/indexes/${searchConfig.indices.companies}/search`,
    {
      body: {
        q: query,
        limit,
        filter: filters,
        attributesToHighlight: ['name', 'description'],
      },
      parseJson: true,
    },
  );

  if (!response) {
    return { hits: [], took: 0, total: 0 };
  }

  const hits = response.hits.map((hit) => ({
    ...hit,
    highlights: mapMeiliHighlights(hit._formatted),
  }));

  return {
    hits,
    took: response.processingTimeMs ?? 0,
    total: response.estimatedTotalHits ?? hits.length,
  };
};

const searchExchangesMeili = async (
  query: string,
  limit: number,
  locale: string | null,
): Promise<SearchResponse<ExchangeDocument & { highlights?: HighlightMap }>> => {
  const filters = locale ? [`locale = "${locale}"`] : undefined;
  const response = await sendRequest<MeiliSearchResponse<ExchangeDocument>>(
    'POST',
    `/indexes/${searchConfig.indices.exchanges}/search`,
    {
      body: {
        q: query,
        limit,
        filter: filters,
        attributesToHighlight: ['searchText'],
      },
      parseJson: true,
    },
  );

  if (!response) {
    return { hits: [], took: 0, total: 0 };
  }

  const hits = response.hits.map((hit) => ({
    ...hit,
    highlights: mapMeiliHighlights(hit._formatted),
  }));

  return {
    hits,
    took: response.processingTimeMs ?? 0,
    total: response.estimatedTotalHits ?? hits.length,
  };
};

const searchCompaniesOpenSearch = async (
  query: string,
  limit: number,
  locale: string | null,
): Promise<SearchResponse<CompanyDocument & { highlights?: HighlightMap }>> => {
  const must = query
    ? {
        multi_match: {
          query,
          fields: [
            'name^3',
            'description^2',
            'province.name',
            'province.code',
            'sector.name',
            'searchText',
          ],
          fuzziness: 'AUTO',
        },
      }
    : { match_all: {} };

  const filters = [] as any[];
  if (locale) {
    filters.push({ term: { locale } });
  }

  const body = {
    size: limit,
    query: {
      bool: {
        must,
        filter: filters,
      },
    },
    highlight: {
      fields: {
        name: {},
        description: {},
      },
    },
  };

  const response = await sendRequest<OpenSearchResponse<CompanyDocument>>(
    'POST',
    `/${searchConfig.indices.companies}/_search`,
    { body, parseJson: true },
  );

  if (!response?.hits?.hits) {
    return { hits: [], took: response?.took ?? 0, total: 0 };
  }

  const hits = response.hits.hits.map((hit) => ({
    ...hit._source,
    highlights: mapOpenSearchHighlights(hit.highlight),
  }));

  const totalRaw = response.hits.total;
  const total = typeof totalRaw === 'number' ? totalRaw : (totalRaw?.value ?? hits.length);

  return {
    hits,
    took: response.took ?? 0,
    total,
  };
};

const searchExchangesOpenSearch = async (
  query: string,
  limit: number,
  locale: string | null,
): Promise<SearchResponse<ExchangeDocument & { highlights?: HighlightMap }>> => {
  const must = query
    ? {
        multi_match: {
          query,
          fields: [
            'sourceProvince.name^2',
            'sourceProvince.code',
            'targetProvince.name^2',
            'targetProvince.code',
            'unit',
            'searchText',
          ],
          fuzziness: 'AUTO',
        },
      }
    : { match_all: {} };

  const filters = [] as any[];
  if (locale) {
    filters.push({ term: { locale } });
  }

  const body = {
    size: limit,
    query: {
      bool: {
        must,
        filter: filters,
      },
    },
    highlight: {
      fields: {
        searchText: {},
      },
    },
  };

  const response = await sendRequest<OpenSearchResponse<ExchangeDocument>>(
    'POST',
    `/${searchConfig.indices.exchanges}/_search`,
    { body, parseJson: true },
  );

  if (!response?.hits?.hits) {
    return { hits: [], took: response?.took ?? 0, total: 0 };
  }

  const hits = response.hits.hits.map((hit) => ({
    ...hit._source,
    highlights: mapOpenSearchHighlights(hit.highlight),
  }));

  const totalRaw = response.hits.total;
  const total = typeof totalRaw === 'number' ? totalRaw : (totalRaw?.value ?? hits.length);

  return {
    hits,
    took: response.took ?? 0,
    total,
  };
};

const searchCompanies = async (
  query: string,
  limit: number,
  locale: string | null,
): Promise<SearchResponse<CompanyDocument & { highlights?: HighlightMap }>> => {
  if (!ensureEnabled()) {
    return { hits: [], took: 0, total: 0 };
  }
  if (searchConfig.driver === 'meilisearch') {
    return searchCompaniesMeili(query, limit, locale);
  }
  return searchCompaniesOpenSearch(query, limit, locale);
};

const searchExchanges = async (
  query: string,
  limit: number,
  locale: string | null,
): Promise<SearchResponse<ExchangeDocument & { highlights?: HighlightMap }>> => {
  if (!ensureEnabled()) {
    return { hits: [], took: 0, total: 0 };
  }
  if (searchConfig.driver === 'meilisearch') {
    return searchExchangesMeili(query, limit, locale);
  }
  return searchExchangesOpenSearch(query, limit, locale);
};

export const syncCompanyToIndex = async (input: CompanyEntity | PrimitiveId | null | undefined) => {
  const entity = await ensureCompanyEntity(input);
  if (!entity?.id) {
    return;
  }

  const document = toCompanyDocument(entity);
  if (!document) {
    await deleteDocument(searchConfig.indices.companies, entity.id);
    return;
  }

  await indexDocument(searchConfig.indices.companies, document);
};

export const removeCompanyFromIndex = async (
  input: CompanyEntity | PrimitiveId | null | undefined,
) => {
  const id = typeof input === 'number' || typeof input === 'string' ? input : input?.id;
  if (!id) {
    return;
  }
  await deleteDocument(searchConfig.indices.companies, id);
};

export const syncExchangeToIndex = async (
  input: ExchangeEntity | PrimitiveId | null | undefined,
) => {
  const entity = await ensureExchangeEntity(input);
  if (!entity?.id) {
    return;
  }

  const document = toExchangeDocument(entity);
  if (!document) {
    await deleteDocument(searchConfig.indices.exchanges, entity.id);
    return;
  }

  await indexDocument(searchConfig.indices.exchanges, document);
};

export const removeExchangeFromIndex = async (
  input: ExchangeEntity | PrimitiveId | null | undefined,
) => {
  const id = typeof input === 'number' || typeof input === 'string' ? input : input?.id;
  if (!id) {
    return;
  }
  await deleteDocument(searchConfig.indices.exchanges, id);
};

const clampLimit = (value: number | undefined, fallback: number): number => {
  if (!value || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(value), 1), 50);
};

export const performSearch = async (
  query: string,
  options: SearchOptions = {},
): Promise<SearchResultPayload> => {
  const normalized = typeof query === 'string' ? query.trim() : '';
  const limit = clampLimit(options.limit, 5);
  const locale = options.locale ?? null;
  const type = options.type ?? 'all';

  if (!normalized || !ensureEnabled()) {
    return {
      query: normalized,
      took: 0,
      total: 0,
      companies: [],
      exchanges: [],
      engine: {
        enabled: searchConfig.enabled,
        driver: searchConfig.enabled ? searchConfig.driver : null,
        indices: searchConfig.indices,
      },
    };
  }

  const [companyResult, exchangeResult] = await Promise.all([
    type === 'exchanges'
      ? Promise.resolve({ hits: [], took: 0, total: 0 })
      : searchCompanies(normalized, limit, locale),
    type === 'companies'
      ? Promise.resolve({ hits: [], took: 0, total: 0 })
      : searchExchanges(normalized, limit, locale),
  ]);

  return {
    query: normalized,
    took: Math.max(companyResult.took, exchangeResult.took),
    total: companyResult.total + exchangeResult.total,
    companies: companyResult.hits,
    exchanges: exchangeResult.hits,
    engine: {
      enabled: searchConfig.enabled,
      driver: searchConfig.driver,
      indices: searchConfig.indices,
    },
  };
};

export const getSearchEngineInfo = () => ({
  enabled: searchConfig.enabled,
  driver: searchConfig.enabled ? searchConfig.driver : null,
  indices: searchConfig.indices,
});
