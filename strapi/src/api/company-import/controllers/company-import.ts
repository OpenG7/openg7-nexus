import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';

const COMPANY_UID = 'api::company.company' as any;
const SECTOR_UID = 'api::sector.sector' as any;
const PROVINCE_UID = 'api::province.province' as any;

const MAX_COMPANIES_PER_IMPORT = 500;
const MAX_SECTORS_PER_COMPANY = 20;
const MAX_ERRORS = 100;

const G7_COUNTRY_CODES = new Set(['CA', 'DE', 'FR', 'IT', 'JP', 'UK', 'US']);
const COUNTRY_ALIASES: Record<string, string> = {
  canada: 'CA',
  ca: 'CA',
  germany: 'DE',
  de: 'DE',
  france: 'FR',
  fr: 'FR',
  italy: 'IT',
  it: 'IT',
  japan: 'JP',
  jp: 'JP',
  uk: 'UK',
  'united kingdom': 'UK',
  gb: 'UK',
  'great britain': 'UK',
  us: 'US',
  usa: 'US',
  'united states': 'US',
  'united states of america': 'US',
};

type ImportCompaniesStatus = 'approved' | 'suspended';

interface ImportedCompanyLocation {
  readonly lat: number;
  readonly lng: number;
  readonly province: string | null;
  readonly country: string | null;
}

interface ImportedCompanyContacts {
  readonly website: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly contactName: string | null;
}

interface ImportedCompanyInput {
  readonly businessId: string;
  readonly name: string;
  readonly sectors: readonly string[];
  readonly location: ImportedCompanyLocation;
  readonly contacts: ImportedCompanyContacts;
}

interface ImportErrorEntry {
  readonly index: number;
  readonly businessId: string | null;
  readonly reason: string;
}

interface ImportSummary {
  readonly received: number;
  readonly processed: number;
  readonly created: number;
  readonly updated: number;
  readonly skipped: number;
  readonly errors: readonly ImportErrorEntry[];
}

interface ExistingCompanyEntity {
  readonly id: number | string;
  readonly businessId?: unknown;
  readonly status?: unknown;
}

interface SectorEntity {
  readonly id: number | string;
  readonly name?: unknown;
  readonly slug?: unknown;
}

interface ProvinceEntity {
  readonly id: number | string;
  readonly name?: unknown;
  readonly code?: unknown;
  readonly slug?: unknown;
}

function normalizeFindManyResult<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}

function normalizeString(value: unknown, maxLength = 240): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, maxLength);
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toLookupToken(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function parseCountryCode(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  const mapped = COUNTRY_ALIASES[normalized];
  if (mapped && G7_COUNTRY_CODES.has(mapped)) {
    return mapped;
  }
  const upper = normalized.toUpperCase();
  if (G7_COUNTRY_CODES.has(upper)) {
    return upper;
  }
  return null;
}

function extractPayloadSource(input: unknown): Record<string, unknown> {
  const record = (
    input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  ) as Record<string, unknown>;
  if (record.data && typeof record.data === 'object' && !Array.isArray(record.data)) {
    return record.data as Record<string, unknown>;
  }
  return record;
}

function parseCompaniesList(input: unknown): unknown[] {
  const source = extractPayloadSource(input);
  const value = source.companies;
  if (!Array.isArray(value)) {
    throw new Error('companies must be provided as an array.');
  }
  if (!value.length) {
    throw new Error('companies must contain at least one item.');
  }
  if (value.length > MAX_COMPANIES_PER_IMPORT) {
    throw new Error(`companies exceeds maximum batch size (${MAX_COMPANIES_PER_IMPORT}).`);
  }
  return value;
}

function parseLocation(value: unknown): ImportedCompanyLocation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('location is required.');
  }
  const location = value as Record<string, unknown>;
  const lat = normalizeNumber(location.lat);
  const lng = normalizeNumber(location.lng);
  if (lat == null || lng == null) {
    throw new Error('location.lat and location.lng are required numbers.');
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error('location coordinates are out of range.');
  }
  return {
    lat,
    lng,
    province: normalizeString(location.province, 120),
    country: normalizeString(location.country, 120),
  };
}

function parseContacts(value: unknown): ImportedCompanyContacts {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      website: null,
      email: null,
      phone: null,
      contactName: null,
    };
  }
  const contacts = value as Record<string, unknown>;
  return {
    website: normalizeString(contacts.website, 320),
    email: normalizeString(contacts.email, 180),
    phone: normalizeString(contacts.phone, 80),
    contactName: normalizeString(contacts.contactName, 180),
  };
}

function parseSectors(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error('sectors must be an array of strings.');
  }
  if (!value.length) {
    throw new Error('sectors must contain at least one sector.');
  }
  const sectors: string[] = [];
  for (const entry of value) {
    const normalized = normalizeString(entry, 120);
    if (!normalized) {
      continue;
    }
    sectors.push(normalized);
    if (sectors.length >= MAX_SECTORS_PER_COMPANY) {
      break;
    }
  }
  if (!sectors.length) {
    throw new Error('sectors must contain at least one valid string.');
  }
  return sectors;
}

function parseCompany(input: unknown): ImportedCompanyInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('entry must be an object.');
  }
  const source = input as Record<string, unknown>;
  const rawBusinessId = normalizeString(source.businessId, 80);
  if (!rawBusinessId) {
    throw new Error('businessId is required.');
  }
  const businessId = rawBusinessId.toUpperCase();
  const name = normalizeString(source.name, 180);
  if (!name || name.length < 2) {
    throw new Error('name is required and must be at least 2 characters.');
  }

  return {
    businessId,
    name,
    sectors: parseSectors(source.sectors),
    location: parseLocation(source.location),
    contacts: parseContacts(source.contacts),
  };
}

function addError(
  errors: ImportErrorEntry[],
  index: number,
  businessId: string | null,
  reason: string,
): void {
  if (errors.length >= MAX_ERRORS) {
    return;
  }
  errors.push({ index, businessId, reason });
}

function normalizeCompanyStatus(value: unknown): ImportCompaniesStatus {
  if (value === 'suspended') {
    return 'suspended';
  }
  return 'approved';
}

function buildSectorLookup(entities: readonly SectorEntity[]): Map<string, number | string> {
  const lookup = new Map<string, number | string>();
  for (const entity of entities) {
    if (!entity?.id) {
      continue;
    }
    const slug = normalizeString(entity.slug, 120);
    const name = normalizeString(entity.name, 180);
    if (slug) {
      lookup.set(toLookupToken(slug), entity.id);
    }
    if (name) {
      lookup.set(toLookupToken(name), entity.id);
    }
  }
  return lookup;
}

function buildProvinceLookup(entities: readonly ProvinceEntity[]): Map<string, number | string> {
  const lookup = new Map<string, number | string>();
  for (const entity of entities) {
    if (!entity?.id) {
      continue;
    }
    const code = normalizeString(entity.code, 40);
    const slug = normalizeString(entity.slug, 120);
    const name = normalizeString(entity.name, 180);
    if (code) {
      lookup.set(toLookupToken(code), entity.id);
    }
    if (slug) {
      lookup.set(toLookupToken(slug), entity.id);
    }
    if (name) {
      lookup.set(toLookupToken(name), entity.id);
    }
  }
  return lookup;
}

function resolveSectorId(
  sectorLookup: ReadonlyMap<string, number | string>,
  sectors: readonly string[],
): number | string | null {
  for (const sector of sectors) {
    const token = toLookupToken(sector);
    const match = sectorLookup.get(token);
    if (match != null) {
      return match;
    }
  }
  return null;
}

function resolveProvinceId(
  provinceLookup: ReadonlyMap<string, number | string>,
  province: string | null,
): number | string | null {
  if (!province) {
    return null;
  }
  return provinceLookup.get(toLookupToken(province)) ?? null;
}

function buildImportMetadata(company: ImportedCompanyInput, importedAt: string) {
  return {
    source: 'province-upload',
    importedAt,
    businessId: company.businessId,
    sectors: company.sectors,
    location: company.location,
    contacts: company.contacts,
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async importCompanies(ctx: Context) {
    const currentUser = (ctx.state as Record<string, unknown> | undefined)?.user as
      | { id?: number | string }
      | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    let rawCompanies: unknown[];
    try {
      rawCompanies = parseCompaniesList(ctx.request.body);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid import payload.';
      return ctx.badRequest(message);
    }

    const parseErrors: ImportErrorEntry[] = [];
    const parsedCompanies: ImportedCompanyInput[] = [];
    const seenBusinessIds = new Set<string>();

    rawCompanies.forEach((entry, index) => {
      try {
        const parsed = parseCompany(entry);
        if (seenBusinessIds.has(parsed.businessId)) {
          addError(parseErrors, index + 1, parsed.businessId, 'Duplicate businessId in payload.');
          return;
        }
        seenBusinessIds.add(parsed.businessId);
        parsedCompanies.push(parsed);
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : 'Invalid company entry.';
        const businessId =
          entry && typeof entry === 'object' && !Array.isArray(entry)
            ? (normalizeString((entry as Record<string, unknown>).businessId, 80)?.toUpperCase() ??
              null)
            : null;
        addError(parseErrors, index + 1, businessId, reason);
      }
    });

    const nowIso = new Date().toISOString();
    const importedBusinessIds = parsedCompanies.map((company) => company.businessId);

    const [sectorEntities, provinceEntities, existingCompanies] = await Promise.all([
      strapi.entityService.findMany(SECTOR_UID, {
        fields: ['id', 'name', 'slug'],
        publicationState: 'preview',
        limit: 500,
      }) as Promise<SectorEntity[] | SectorEntity | null>,
      strapi.entityService.findMany(PROVINCE_UID, {
        fields: ['id', 'name', 'code', 'slug'],
        publicationState: 'preview',
        limit: 500,
      }) as Promise<ProvinceEntity[] | ProvinceEntity | null>,
      importedBusinessIds.length
        ? (strapi.entityService.findMany(COMPANY_UID, {
            fields: ['id', 'businessId', 'status'],
            publicationState: 'preview',
            filters: {
              businessId: {
                $in: importedBusinessIds,
              },
            },
            limit: importedBusinessIds.length + 5,
          }) as Promise<ExistingCompanyEntity[] | ExistingCompanyEntity | null>)
        : Promise.resolve([] as ExistingCompanyEntity[]),
    ]);

    const sectorLookup = buildSectorLookup(normalizeFindManyResult(sectorEntities));
    const provinceLookup = buildProvinceLookup(normalizeFindManyResult(provinceEntities));
    const existingByBusinessId = new Map<string, ExistingCompanyEntity>();
    for (const existing of normalizeFindManyResult(existingCompanies)) {
      const businessId = normalizeString(existing.businessId, 80)?.toUpperCase();
      if (!businessId) {
        continue;
      }
      existingByBusinessId.set(businessId, existing);
    }

    let created = 0;
    let updated = 0;
    let skipped = parseErrors.length;

    for (let index = 0; index < parsedCompanies.length; index += 1) {
      const company = parsedCompanies[index];
      const summaryIndex = index + 1;
      try {
        const sectorId = resolveSectorId(sectorLookup, company.sectors);
        const provinceId = resolveProvinceId(provinceLookup, company.location.province);
        const countryCode = parseCountryCode(company.location.country);
        const importMetadata = buildImportMetadata(company, nowIso);
        const existing = existingByBusinessId.get(company.businessId);

        if (existing?.id) {
          const nextStatus = normalizeCompanyStatus(existing.status);
          const data: Record<string, unknown> = {
            name: company.name,
            businessId: company.businessId,
            status: nextStatus,
            importMetadata,
            publishedAt: nowIso,
          };
          if (company.contacts.website) {
            data.website = company.contacts.website;
          }
          if (countryCode) {
            data.country = countryCode;
          }
          if (sectorId != null) {
            data.sector = sectorId;
          }
          if (provinceId != null) {
            data.province = provinceId;
          }

          await strapi.entityService.update(COMPANY_UID, existing.id, { data } as any);
          updated += 1;
          continue;
        }

        const createData: Record<string, unknown> = {
          name: company.name,
          businessId: company.businessId,
          status: 'approved',
          importMetadata,
          publishedAt: nowIso,
          website: company.contacts.website ?? null,
          country: countryCode,
        };
        if (sectorId != null) {
          createData.sector = sectorId;
        }
        if (provinceId != null) {
          createData.province = provinceId;
        }

        const createdEntity = (await strapi.entityService.create(COMPANY_UID, {
          data: createData,
        } as any)) as ExistingCompanyEntity | null;

        if (createdEntity?.id) {
          existingByBusinessId.set(company.businessId, {
            id: createdEntity.id,
            businessId: company.businessId,
            status: 'approved',
          });
        }

        created += 1;
      } catch (error: unknown) {
        skipped += 1;
        const reason = error instanceof Error ? error.message : 'Import failed for this company.';
        addError(parseErrors, summaryIndex, company.businessId, reason);
      }
    }

    const processed = created + updated;
    const summary: ImportSummary = {
      received: rawCompanies.length,
      processed,
      created,
      updated,
      skipped,
      errors: parseErrors,
    };

    if (!processed) {
      ctx.status = 400;
      ctx.body = { data: summary };
      return;
    }

    ctx.body = { data: summary };
  },
});
