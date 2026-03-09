import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, promises as fs } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import type { Core } from '@strapi/strapi';

import { broadcastCompanyImportBulkEvent } from './company-import-bulk-events';

const COMPANY_UID = 'api::company.company' as any;
const SECTOR_UID = 'api::sector.sector' as any;
const PROVINCE_UID = 'api::province.province' as any;

const JOBS_TABLE = 'company_import_jobs';
const ERRORS_TABLE = 'company_import_job_errors';
const STORAGE_DIR = join(process.cwd(), 'data', 'import-jobs');
const CHUNK_SIZE = 500;
const MAX_JSON_ITEMS = 100_000;

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
  us: 'US',
  usa: 'US',
  'united states': 'US',
};

type BulkImportMode = 'validate-only' | 'upsert';
type BulkImportSourceType = 'json' | 'jsonl' | 'csv';
type BulkImportState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
type BulkImportPhase =
  | 'upload/store'
  | 'parse'
  | 'validate/normalize'
  | 'dedupe'
  | 'match'
  | 'upsert'
  | 'finalize';

interface UploadedFileInput {
  readonly filepath: string;
  readonly originalFilename: string;
  readonly mimetype?: string | null;
}

interface EnqueueBulkImportOptions {
  readonly userId: string;
  readonly mode: BulkImportMode;
  readonly dryRun: boolean;
  readonly idempotencyKey: string | null;
  readonly companies?: unknown[] | null;
  readonly uploadedFile?: UploadedFileInput | null;
}

interface EnqueueBulkImportResult {
  readonly jobId: string;
  readonly reused: boolean;
}

interface CompanyImportBulkJobRecord {
  readonly id: string;
  readonly userId: string;
  readonly mode: BulkImportMode;
  readonly dryRun: boolean;
  readonly sourceType: BulkImportSourceType;
  readonly sourcePath: string | null;
  readonly payloadJson: string | null;
  readonly payloadHash: string;
  readonly idempotencyKey: string | null;
  readonly state: BulkImportState;
  readonly phase: BulkImportPhase;
  readonly totalCount: number;
  readonly processedCount: number;
  readonly okCount: number;
  readonly failedCount: number;
  readonly warningsCount: number;
  readonly createdCount: number;
  readonly updatedCount: number;
  readonly skippedCount: number;
  readonly reportJson: string | null;
  readonly lastError: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly cancelRequestedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface ImportedCompanyInput {
  readonly businessId: string;
  readonly name: string;
  readonly sectors: readonly string[];
  readonly location: {
    readonly lat: number;
    readonly lng: number;
    readonly province: string | null;
    readonly country: string | null;
  };
  readonly contacts: {
    readonly website: string | null;
    readonly email: string | null;
    readonly phone: string | null;
    readonly contactName: string | null;
  };
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

class BulkImportCancelledError extends Error {
  constructor() {
    super('Bulk import cancelled.');
    this.name = 'BulkImportCancelledError';
  }
}

function resolveTerminalState(error: unknown): BulkImportState {
  if (error instanceof BulkImportCancelledError) {
    return 'cancelled';
  }
  return 'failed';
}

let workerTimer: NodeJS.Timeout | null = null;
let workerBusy = false;
let workerStrapi: Core.Strapi | null = null;
let ensureTablesPromise: Promise<void> | null = null;

function normalizeString(value: unknown, maxLength = 500): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, maxLength);
}

async function ensureTables(strapi: Core.Strapi): Promise<void> {
  if (!ensureTablesPromise) {
    ensureTablesPromise = (async () => {
      const knex = strapi.db.connection;
      const hasJobsTable = await knex.schema.hasTable(JOBS_TABLE);
      if (!hasJobsTable) {
        await knex.schema.createTable(JOBS_TABLE, (table: any) => {
          table.string('id', 64).primary();
          table.string('user_id', 64).notNullable();
          table.string('mode', 24).notNullable();
          table.boolean('dry_run').notNullable().defaultTo(false);
          table.string('source_type', 24).notNullable();
          table.text('source_path').nullable();
          table.text('payload_json').nullable();
          table.string('payload_hash', 128).notNullable();
          table.string('idempotency_key', 160).nullable();
          table.string('state', 24).notNullable().defaultTo('queued');
          table.string('phase', 48).notNullable().defaultTo('upload/store');
          table.integer('total_count').notNullable().defaultTo(0);
          table.integer('processed_count').notNullable().defaultTo(0);
          table.integer('ok_count').notNullable().defaultTo(0);
          table.integer('failed_count').notNullable().defaultTo(0);
          table.integer('warnings_count').notNullable().defaultTo(0);
          table.integer('created_count').notNullable().defaultTo(0);
          table.integer('updated_count').notNullable().defaultTo(0);
          table.integer('skipped_count').notNullable().defaultTo(0);
          table.text('report_json').nullable();
          table.text('last_error').nullable();
          table.datetime('started_at').nullable();
          table.datetime('completed_at').nullable();
          table.datetime('cancel_requested_at').nullable();
          table.datetime('created_at').notNullable();
          table.datetime('updated_at').notNullable();
          table.unique(['user_id', 'idempotency_key', 'payload_hash'], 'company_import_jobs_idempotency_unique');
        });
      }

      const hasErrorsTable = await knex.schema.hasTable(ERRORS_TABLE);
      if (!hasErrorsTable) {
        await knex.schema.createTable(ERRORS_TABLE, (table: any) => {
          table.increments('id').primary();
          table.string('job_id', 64).notNullable().references('id').inTable(JOBS_TABLE).onDelete('CASCADE');
          table.integer('row_number').notNullable();
          table.string('field', 96).nullable();
          table.string('code', 96).notNullable();
          table.text('message').notNullable();
          table.text('raw_sample').nullable();
          table.datetime('created_at').notNullable();
        });
      }
    })().catch((error) => {
      ensureTablesPromise = null;
      throw error;
    });
  }
  await ensureTablesPromise;
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

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = normalizeString(value, 16)?.toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  return fallback;
}

function normalizeMode(value: unknown): BulkImportMode {
  const normalized = normalizeString(value, 40)?.toLowerCase();
  if (normalized === 'validate-only' || normalized === 'validate_only') {
    return 'validate-only';
  }
  return 'upsert';
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

function parseSectors(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error('sectors must be an array.');
  }
  const sectors = value
    .map((entry) => normalizeString(entry, 120))
    .filter((entry): entry is string => Boolean(entry));
  if (!sectors.length) {
    throw new Error('sectors must contain at least one valid string.');
  }
  return sectors.slice(0, 20);
}

function parseCompany(value: unknown): ImportedCompanyInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('entry must be an object.');
  }
  const source = value as Record<string, unknown>;
  const businessId = normalizeString(source.businessId, 80)?.toUpperCase();
  if (!businessId) {
    throw new Error('businessId is required.');
  }
  const name = normalizeString(source.name, 180);
  if (!name || name.length < 2) {
    throw new Error('name is required and must have at least 2 characters.');
  }

  const locationValue =
    source.location && typeof source.location === 'object' && !Array.isArray(source.location)
      ? (source.location as Record<string, unknown>)
      : null;
  if (!locationValue) {
    throw new Error('location is required.');
  }
  const lat = normalizeNumber(locationValue.lat);
  const lng = normalizeNumber(locationValue.lng);
  if (lat == null || lng == null) {
    throw new Error('location.lat and location.lng are required numbers.');
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error('location coordinates are out of range.');
  }

  const contactsValue =
    source.contacts && typeof source.contacts === 'object' && !Array.isArray(source.contacts)
      ? (source.contacts as Record<string, unknown>)
      : {};

  return {
    businessId,
    name,
    sectors: parseSectors(source.sectors),
    location: {
      lat,
      lng,
      province: normalizeString(locationValue.province, 120),
      country: normalizeString(locationValue.country, 120),
    },
    contacts: {
      website: normalizeString(contactsValue.website, 320),
      email: normalizeString(contactsValue.email, 180),
      phone: normalizeString(contactsValue.phone, 80),
      contactName: normalizeString(contactsValue.contactName, 180),
    },
  };
}

function buildSectorLookup(entities: readonly SectorEntity[]): Map<string, number | string> {
  const lookup = new Map<string, number | string>();
  entities.forEach((entity) => {
    if (!entity?.id) {
      return;
    }
    const slug = normalizeString(entity.slug, 120);
    const name = normalizeString(entity.name, 180);
    if (slug) {
      lookup.set(toLookupToken(slug), entity.id);
    }
    if (name) {
      lookup.set(toLookupToken(name), entity.id);
    }
  });
  return lookup;
}

function buildProvinceLookup(entities: readonly ProvinceEntity[]): Map<string, number | string> {
  const lookup = new Map<string, number | string>();
  entities.forEach((entity) => {
    if (!entity?.id) {
      return;
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
  });
  return lookup;
}

function resolveSectorId(
  lookup: ReadonlyMap<string, number | string>,
  sectors: readonly string[]
): number | string | null {
  for (const sector of sectors) {
    const value = lookup.get(toLookupToken(sector));
    if (value != null) {
      return value;
    }
  }
  return null;
}

function resolveProvinceId(
  lookup: ReadonlyMap<string, number | string>,
  province: string | null
): number | string | null {
  if (!province) {
    return null;
  }
  return lookup.get(toLookupToken(province)) ?? null;
}

function hashPayload(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}

function detectSourceType(filename: string, mimetype?: string | null): BulkImportSourceType | null {
  const lowerName = filename.toLowerCase();
  if (lowerName.endsWith('.csv') || mimetype === 'text/csv') {
    return 'csv';
  }
  if (lowerName.endsWith('.jsonl') || lowerName.endsWith('.ndjson')) {
    return 'jsonl';
  }
  return null;
}

function normalizeJobRecord(row: Record<string, unknown>): CompanyImportBulkJobRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    mode: normalizeMode(row.mode),
    dryRun: Boolean(row.dry_run),
    sourceType: (normalizeString(row.source_type, 24) ?? 'json') as BulkImportSourceType,
    sourcePath: normalizeString(row.source_path, 2000),
    payloadJson: typeof row.payload_json === 'string' ? row.payload_json : null,
    payloadHash: String(row.payload_hash ?? ''),
    idempotencyKey: normalizeString(row.idempotency_key, 160),
    state: (normalizeString(row.state, 24) ?? 'queued') as BulkImportState,
    phase: (normalizeString(row.phase, 48) ?? 'upload/store') as BulkImportPhase,
    totalCount: Number(row.total_count ?? 0),
    processedCount: Number(row.processed_count ?? 0),
    okCount: Number(row.ok_count ?? 0),
    failedCount: Number(row.failed_count ?? 0),
    warningsCount: Number(row.warnings_count ?? 0),
    createdCount: Number(row.created_count ?? 0),
    updatedCount: Number(row.updated_count ?? 0),
    skippedCount: Number(row.skipped_count ?? 0),
    reportJson: typeof row.report_json === 'string' ? row.report_json : null,
    lastError: normalizeString(row.last_error, 4000),
    startedAt: normalizeString(row.started_at, 120),
    completedAt: normalizeString(row.completed_at, 120),
    cancelRequestedAt: normalizeString(row.cancel_requested_at, 120),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

async function fetchJobById(strapi: Core.Strapi, jobId: string): Promise<CompanyImportBulkJobRecord | null> {
  const row = await strapi.db.connection(JOBS_TABLE).where({ id: jobId }).first();
  return row ? normalizeJobRecord(row as Record<string, unknown>) : null;
}

async function fetchJobForUser(
  strapi: Core.Strapi,
  jobId: string,
  userId: string
): Promise<CompanyImportBulkJobRecord | null> {
  const row = await strapi.db.connection(JOBS_TABLE).where({ id: jobId, user_id: userId }).first();
  return row ? normalizeJobRecord(row as Record<string, unknown>) : null;
}

async function updateJob(strapi: Core.Strapi, jobId: string, patch: Record<string, unknown>): Promise<void> {
  await strapi.db
    .connection(JOBS_TABLE)
    .where({ id: jobId })
    .update({ ...patch, updated_at: new Date().toISOString() });
}

async function addRowError(
  strapi: Core.Strapi,
  input: { jobId: string; rowNumber: number; field?: string | null; code: string; message: string; raw: unknown }
): Promise<void> {
  const rawSample = (() => {
    try {
      return JSON.stringify(input.raw).slice(0, 1200);
    } catch {
      return null;
    }
  })();
  await strapi.db.connection(ERRORS_TABLE).insert({
    job_id: input.jobId,
    row_number: input.rowNumber,
    field: input.field ?? null,
    code: input.code,
    message: input.message.slice(0, 3000),
    raw_sample: rawSample,
    created_at: new Date().toISOString(),
  });
}

async function isCancelled(strapi: Core.Strapi, jobId: string): Promise<boolean> {
  const row = await strapi.db.connection(JOBS_TABLE).select('state', 'cancel_requested_at').where({ id: jobId }).first();
  if (!row) {
    return true;
  }
  return row.state === 'cancelled' || Boolean(row.cancel_requested_at);
}

async function assertNotCancelled(strapi: Core.Strapi, jobId: string): Promise<void> {
  if (await isCancelled(strapi, jobId)) {
    throw new BulkImportCancelledError();
  }
}

async function copyAndHashFile(sourcePath: string, targetPath: string): Promise<string> {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  const hasher = createHash('sha256');
  const hashingTransform = new Transform({
    transform(chunk, _enc, callback) {
      hasher.update(chunk);
      callback(null, chunk);
    },
  });
  await pipeline(createReadStream(sourcePath), hashingTransform, createWriteStream(targetPath));
  return hasher.digest('hex');
}

async function* iterateRows(job: CompanyImportBulkJobRecord): AsyncGenerator<{ rowNumber: number; value: unknown }> {
  if (job.sourceType === 'json') {
    const parsed = JSON.parse(job.payloadJson ?? '[]') as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('JSON payload must be an array.');
    }
    if (parsed.length > MAX_JSON_ITEMS) {
      throw new Error(`companies exceeds maximum batch size (${MAX_JSON_ITEMS}).`);
    }
    for (let index = 0; index < parsed.length; index += 1) {
      yield { rowNumber: index + 1, value: parsed[index] };
    }
    return;
  }

  if (!job.sourcePath) {
    throw new Error('Missing source file for file-based job.');
  }

  const rl = createInterface({ input: createReadStream(job.sourcePath, { encoding: 'utf8' }), crlfDelay: Infinity });
  let lineNo = 0;
  let headers: string[] | null = null;
  for await (const line of rl) {
    const raw = line.trim();
    if (!raw) {
      continue;
    }
    if (job.sourceType === 'jsonl') {
      lineNo += 1;
      try {
        yield { rowNumber: lineNo, value: JSON.parse(raw) };
      } catch {
        yield { rowNumber: lineNo, value: { __parseError: 'Invalid JSONL row.', __raw: raw } };
      }
      continue;
    }

    const values = raw.split(',').map((entry) => entry.trim().replace(/^"|"$/g, ''));
    if (!headers) {
      headers = values.map((header) => toLookupToken(header));
      continue;
    }

    lineNo += 1;
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    const sectorsRaw = normalizeString(row.sectors, 800) ?? '';
    const sectors = sectorsRaw
      .split(/[|;,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    yield {
      rowNumber: lineNo,
      value: {
        businessId: row.businessid ?? row.business_id,
        name: row.name,
        sectors,
        location: {
          lat: row.lat ?? row.latitude,
          lng: row.lng ?? row.longitude,
          province: row.province ?? null,
          country: row.country ?? null,
        },
        contacts: {
          website: row.website ?? null,
          email: row.email ?? null,
          phone: row.phone ?? null,
          contactName: row.contactname ?? row.contact_name ?? null,
        },
      },
    };
  }
}

async function processChunk(
  strapi: Core.Strapi,
  job: CompanyImportBulkJobRecord,
  chunk: Array<{ rowNumber: number; company: ImportedCompanyInput }>,
  sectorLookup: Map<string, number | string>,
  provinceLookup: Map<string, number | string>
): Promise<{ created: number; updated: number; skipped: number; ok: number; failed: number; warnings: number }> {
  if (!chunk.length) {
    return { created: 0, updated: 0, skipped: 0, ok: 0, failed: 0, warnings: 0 };
  }

  if (job.mode === 'validate-only' || job.dryRun) {
    let warnings = 0;
    chunk.forEach((entry) => {
      if (!resolveSectorId(sectorLookup, entry.company.sectors)) {
        warnings += 1;
      }
      if (!resolveProvinceId(provinceLookup, entry.company.location.province)) {
        warnings += 1;
      }
      if (!parseCountryCode(entry.company.location.country)) {
        warnings += 1;
      }
    });
    return { created: 0, updated: 0, skipped: 0, ok: chunk.length, failed: 0, warnings };
  }

  const businessIds = chunk.map((entry) => entry.company.businessId);
  const existingRows = (await strapi.entityService.findMany(COMPANY_UID, {
    fields: ['id', 'businessId', 'status'],
    publicationState: 'preview',
    filters: { businessId: { $in: businessIds } },
    limit: businessIds.length + 10,
  })) as ExistingCompanyEntity[] | ExistingCompanyEntity | null;
  const existingArray = Array.isArray(existingRows) ? existingRows : existingRows ? [existingRows] : [];
  const existingByBusinessId = new Map<string, ExistingCompanyEntity>();
  existingArray.forEach((entry) => {
    const businessId = normalizeString(entry.businessId, 80)?.toUpperCase();
    if (businessId) {
      existingByBusinessId.set(businessId, entry);
    }
  });

  const importedAt = new Date().toISOString();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let ok = 0;
  let failed = 0;
  let warnings = 0;

  for (const row of chunk) {
    await assertNotCancelled(strapi, job.id);
    const company = row.company;
    const sectorId = resolveSectorId(sectorLookup, company.sectors);
    const provinceId = resolveProvinceId(provinceLookup, company.location.province);
    const countryCode = parseCountryCode(company.location.country);
    if (!sectorId) warnings += 1;
    if (!provinceId) warnings += 1;
    if (!countryCode) warnings += 1;

    const existing = existingByBusinessId.get(company.businessId);
    const data: Record<string, unknown> = {
      name: company.name,
      businessId: company.businessId,
      importMetadata: {
        source: 'bulk-import',
        importedAt,
        businessId: company.businessId,
        sectors: company.sectors,
        location: company.location,
        contacts: company.contacts,
      },
      publishedAt: importedAt,
    };
    if (company.contacts.website) data.website = company.contacts.website;
    if (countryCode) data.country = countryCode;
    if (sectorId != null) data.sector = sectorId;
    if (provinceId != null) data.province = provinceId;

    try {
      if (existing?.id) {
        data.status = existing.status === 'suspended' ? 'suspended' : 'approved';
        await strapi.entityService.update(COMPANY_UID, existing.id, { data } as any);
        updated += 1;
        ok += 1;
      } else {
        data.status = 'approved';
        await strapi.entityService.create(COMPANY_UID, { data } as any);
        created += 1;
        ok += 1;
      }
    } catch (error: unknown) {
      failed += 1;
      skipped += 1;
      await addRowError(strapi, {
        jobId: job.id,
        rowNumber: row.rowNumber,
        code: 'UPSERT_FAILED',
        message: error instanceof Error ? error.message : 'Unable to upsert row.',
        raw: row.company,
      });
    }
  }

  return { created, updated, skipped, ok, failed, warnings };
}

async function processJob(strapi: Core.Strapi, job: CompanyImportBulkJobRecord): Promise<void> {
  const counters = {
    total: job.totalCount,
    processed: job.processedCount,
    ok: job.okCount,
    failed: job.failedCount,
    warnings: job.warningsCount,
    created: job.createdCount,
    updated: job.updatedCount,
    skipped: job.skippedCount,
  };

  try {
    await updateJob(strapi, job.id, { phase: 'parse' });
    await assertNotCancelled(strapi, job.id);
    await updateJob(strapi, job.id, { total_count: 0, phase: 'validate/normalize' });
    await updateJob(strapi, job.id, { phase: 'dedupe' });

    const sectorsRaw = (await strapi.entityService.findMany(SECTOR_UID, {
      fields: ['id', 'name', 'slug'],
      publicationState: 'preview',
      limit: 1000,
    })) as SectorEntity[] | SectorEntity | null;
    const provincesRaw = (await strapi.entityService.findMany(PROVINCE_UID, {
      fields: ['id', 'name', 'code', 'slug'],
      publicationState: 'preview',
      limit: 1000,
    })) as ProvinceEntity[] | ProvinceEntity | null;
    const sectors = Array.isArray(sectorsRaw) ? sectorsRaw : sectorsRaw ? [sectorsRaw] : [];
    const provinces = Array.isArray(provincesRaw) ? provincesRaw : provincesRaw ? [provincesRaw] : [];
    const sectorLookup = buildSectorLookup(sectors);
    const provinceLookup = buildProvinceLookup(provinces);

    await updateJob(strapi, job.id, { phase: 'match' });
    await updateJob(strapi, job.id, { phase: 'upsert' });

    const dedupe = new Set<string>();
    let chunk: Array<{ rowNumber: number; company: ImportedCompanyInput }> = [];
    const flush = async () => {
      if (!chunk.length) {
        return;
      }
      const result = await processChunk(strapi, job, chunk, sectorLookup, provinceLookup);
      counters.processed += chunk.length;
      counters.ok += result.ok;
      counters.failed += result.failed;
      counters.warnings += result.warnings;
      counters.created += result.created;
      counters.updated += result.updated;
      counters.skipped += result.skipped;
      await updateJob(strapi, job.id, {
        total_count: counters.total,
        processed_count: counters.processed,
        ok_count: counters.ok,
        failed_count: counters.failed,
        warnings_count: counters.warnings,
        created_count: counters.created,
        updated_count: counters.updated,
        skipped_count: counters.skipped,
      });
      broadcastCompanyImportBulkEvent({
        eventId: `bulk-import-progress-${job.id}-${Date.now()}`,
        type: 'bulk-import.progress',
        jobId: job.id,
        payload: {
          phase: 'upsert',
          progress: {
            total: counters.total,
            processed: counters.processed,
            ok: counters.ok,
            failed: counters.failed,
          },
          counters: {
            created: counters.created,
            updated: counters.updated,
            skipped: counters.skipped,
            warnings: counters.warnings,
          },
        },
      });
      chunk = [];
    };

    let rowFlushCursor = 0;
    for await (const row of iterateRows(job)) {
      await assertNotCancelled(strapi, job.id);
      counters.total += 1;
      const parseError =
        row.value && typeof row.value === 'object' && !Array.isArray(row.value)
          ? normalizeString((row.value as Record<string, unknown>).__parseError, 500)
          : null;
      if (parseError) {
        counters.processed += 1;
        counters.failed += 1;
        counters.skipped += 1;
        await addRowError(strapi, {
          jobId: job.id,
          rowNumber: row.rowNumber,
          code: 'PARSE_ERROR',
          message: parseError,
          raw: row.value,
        });
        rowFlushCursor += 1;
        if (rowFlushCursor >= 50) {
          rowFlushCursor = 0;
          await updateJob(strapi, job.id, {
            total_count: counters.total,
            processed_count: counters.processed,
            failed_count: counters.failed,
            skipped_count: counters.skipped,
          });
        }
        continue;
      }
      try {
        const parsed = parseCompany(row.value);
        if (dedupe.has(parsed.businessId)) {
          counters.processed += 1;
          counters.failed += 1;
          counters.skipped += 1;
          await addRowError(strapi, {
            jobId: job.id,
            rowNumber: row.rowNumber,
            field: 'businessId',
            code: 'DUPLICATE_IN_INPUT',
            message: 'Duplicate businessId in payload.',
            raw: row.value,
          });
          rowFlushCursor += 1;
          if (rowFlushCursor >= 50) {
            rowFlushCursor = 0;
            await updateJob(strapi, job.id, {
              total_count: counters.total,
              processed_count: counters.processed,
              failed_count: counters.failed,
              skipped_count: counters.skipped,
            });
          }
          continue;
        }
        dedupe.add(parsed.businessId);
        chunk.push({ rowNumber: row.rowNumber, company: parsed });
        if (chunk.length >= CHUNK_SIZE) {
          await flush();
        }
      } catch (error: unknown) {
        counters.processed += 1;
        counters.failed += 1;
        counters.skipped += 1;
        await addRowError(strapi, {
          jobId: job.id,
          rowNumber: row.rowNumber,
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Invalid row.',
          raw: row.value,
        });
        rowFlushCursor += 1;
        if (rowFlushCursor >= 50) {
          rowFlushCursor = 0;
          await updateJob(strapi, job.id, {
            total_count: counters.total,
            processed_count: counters.processed,
            failed_count: counters.failed,
            skipped_count: counters.skipped,
          });
        }
      }
    }

    await flush();
    await updateJob(strapi, job.id, {
      state: 'completed',
      phase: 'finalize',
      total_count: counters.total,
      processed_count: counters.processed,
      ok_count: counters.ok,
      failed_count: counters.failed,
      warnings_count: counters.warnings,
      created_count: counters.created,
      updated_count: counters.updated,
      skipped_count: counters.skipped,
      report_json: JSON.stringify({
        summary: {
          received: counters.total,
          processed: counters.processed,
          ok: counters.ok,
          failed: counters.failed,
          created: counters.created,
          updated: counters.updated,
          skipped: counters.skipped,
          warnings: counters.warnings,
          mode: job.mode,
          dryRun: job.dryRun,
        },
        completedAt: new Date().toISOString(),
      }),
      completed_at: new Date().toISOString(),
      last_error: null,
    });
    broadcastCompanyImportBulkEvent({
      eventId: `bulk-import-completed-${job.id}-${Date.now()}`,
      type: 'bulk-import.completed',
      jobId: job.id,
      payload: { state: 'completed' },
    });
  } catch (error: unknown) {
    const terminalState = resolveTerminalState(error);
    await updateJob(strapi, job.id, {
      state: terminalState,
      phase: 'finalize',
      completed_at: new Date().toISOString(),
      last_error: error instanceof Error ? error.message : 'Bulk import failed.',
    });
    broadcastCompanyImportBulkEvent({
      eventId: `bulk-import-end-${job.id}-${Date.now()}`,
      type: terminalState === 'cancelled' ? 'bulk-import.cancelled' : 'bulk-import.error',
      jobId: job.id,
      payload: { state: terminalState },
    });
  } finally {
    if (job.sourceType !== 'json' && job.sourcePath) {
      try {
        await fs.rm(job.sourcePath, { force: true });
      } catch {
        // Ignore cleanup issues.
      }
    }
  }
}

async function claimNextJob(strapi: Core.Strapi): Promise<CompanyImportBulkJobRecord | null> {
  await ensureTables(strapi);
  const candidate = await strapi.db
    .connection(JOBS_TABLE)
    .where({ state: 'queued' })
    .whereNull('cancel_requested_at')
    .orderBy('created_at', 'asc')
    .first();
  if (!candidate) {
    return null;
  }
  const now = new Date().toISOString();
  const claimed = await strapi.db
    .connection(JOBS_TABLE)
    .where({ id: candidate.id, state: 'queued' })
    .whereNull('cancel_requested_at')
    .update({ state: 'running', phase: 'parse', started_at: now, updated_at: now });
  if (!claimed) {
    return null;
  }
  return fetchJobById(strapi, String(candidate.id));
}

async function workerTick(): Promise<void> {
  if (!workerStrapi || workerBusy) {
    return;
  }
  workerBusy = true;
  try {
    while (workerStrapi) {
      const job = await claimNextJob(workerStrapi);
      if (!job) {
        break;
      }
      await processJob(workerStrapi, job);
    }
  } finally {
    workerBusy = false;
  }
}

export function ensureCompanyImportBulkWorkerRunning(strapi: Core.Strapi): void {
  workerStrapi = strapi;
  if (workerTimer) {
    return;
  }
  workerTimer = setInterval(() => {
    void workerTick();
  }, 1000);
  workerTimer.unref?.();
  void workerTick();
}

export function stopCompanyImportBulkWorker(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
  workerStrapi = null;
}

export function parseBulkImportHeadersAndOptions(input: {
  readonly body: unknown;
  readonly headers: Record<string, unknown>;
}): { mode: BulkImportMode; dryRun: boolean; idempotencyKey: string | null } {
  const bodyRecord =
    input.body && typeof input.body === 'object' && !Array.isArray(input.body)
      ? (input.body as Record<string, unknown>)
      : {};
  const source =
    bodyRecord.data && typeof bodyRecord.data === 'object' && !Array.isArray(bodyRecord.data)
      ? (bodyRecord.data as Record<string, unknown>)
      : bodyRecord;
  const mode = normalizeMode(source.mode ?? input.headers['mode'] ?? input.headers['x-import-mode']);
  const dryRun = normalizeBoolean(
    source.dryRun ?? source.dry_run ?? input.headers['dry-run'] ?? input.headers['x-dry-run'],
    false
  );
  return {
    mode,
    dryRun: mode === 'validate-only' ? true : dryRun,
    idempotencyKey: normalizeString(input.headers['idempotency-key'] ?? input.headers['Idempotency-Key'], 160),
  };
}

export function extractUploadedFile(input: unknown): UploadedFileInput | null {
  const queue: unknown[] = [input];
  while (queue.length) {
    const candidate = queue.shift();
    if (!candidate) {
      continue;
    }
    if (Array.isArray(candidate)) {
      queue.push(...candidate);
      continue;
    }
    if (typeof candidate !== 'object') {
      continue;
    }
    const record = candidate as Record<string, unknown>;
    const filepath = normalizeString(record.filepath ?? record.path, 2048);
    const originalFilename = normalizeString(record.originalFilename ?? record.name, 260);
    if (filepath && originalFilename) {
      return {
        filepath,
        originalFilename,
        mimetype: normalizeString(record.mimetype ?? record.type, 120),
      };
    }
    Object.values(record).forEach((value) => queue.push(value));
  }
  return null;
}

export function extractCompaniesArray(input: unknown): unknown[] | null {
  const bodyRecord =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const source =
    bodyRecord.data && typeof bodyRecord.data === 'object' && !Array.isArray(bodyRecord.data)
      ? (bodyRecord.data as Record<string, unknown>)
      : bodyRecord;
  const companies = source.companies;
  if (companies == null) {
    return null;
  }
  if (!Array.isArray(companies)) {
    throw new Error('companies must be an array.');
  }
  if (!companies.length) {
    throw new Error('companies must contain at least one item.');
  }
  if (companies.length > MAX_JSON_ITEMS) {
    throw new Error(`companies exceeds maximum batch size (${MAX_JSON_ITEMS}).`);
  }
  return companies;
}

export async function enqueueCompanyImportBulkJob(
  strapi: Core.Strapi,
  options: EnqueueBulkImportOptions
): Promise<EnqueueBulkImportResult> {
  await ensureTables(strapi);
  let sourceType: BulkImportSourceType;
  let sourcePath: string | null = null;
  let payloadJson: string | null = null;
  let payloadHash: string;

  if (options.uploadedFile) {
    const detected = detectSourceType(options.uploadedFile.originalFilename, options.uploadedFile.mimetype);
    if (!detected) {
      throw new Error('Only CSV and JSONL files are supported for multipart import.');
    }
    sourceType = detected;
    const fileExt = sourceType === 'csv' ? '.csv' : '.jsonl';
    sourcePath = join(STORAGE_DIR, `${randomUUID().replace(/-/g, '')}${fileExt}`);
    payloadHash = await copyAndHashFile(options.uploadedFile.filepath, sourcePath);
  } else if (options.companies) {
    sourceType = 'json';
    payloadJson = JSON.stringify(options.companies);
    payloadHash = hashPayload(payloadJson);
  } else {
    throw new Error('Either multipart file or companies array payload is required.');
  }

  if (options.idempotencyKey) {
    const existing = await strapi.db
      .connection(JOBS_TABLE)
      .where({
        user_id: options.userId,
        idempotency_key: options.idempotencyKey,
        payload_hash: payloadHash,
      })
      .first();
    if (existing) {
      if (sourcePath) {
        await fs.rm(sourcePath, { force: true }).catch(() => undefined);
      }
      return {
        jobId: String(existing.id),
        reused: true,
      };
    }
  }

  const jobId = randomUUID().replace(/-/g, '');
  const now = new Date().toISOString();
  await strapi.db.connection(JOBS_TABLE).insert({
    id: jobId,
    user_id: options.userId,
    mode: options.mode,
    dry_run: options.dryRun,
    source_type: sourceType,
    source_path: sourcePath,
    payload_json: payloadJson,
    payload_hash: payloadHash,
    idempotency_key: options.idempotencyKey,
    state: 'queued',
    phase: 'upload/store',
    total_count: 0,
    processed_count: 0,
    ok_count: 0,
    failed_count: 0,
    warnings_count: 0,
    created_count: 0,
    updated_count: 0,
    skipped_count: 0,
    report_json: null,
    last_error: null,
    started_at: null,
    completed_at: null,
    cancel_requested_at: null,
    created_at: now,
    updated_at: now,
  });
  ensureCompanyImportBulkWorkerRunning(strapi);
  return { jobId, reused: false };
}

function toStatus(job: CompanyImportBulkJobRecord) {
  return {
    jobId: job.id,
    state: job.state,
    phase: job.phase,
    mode: job.mode,
    dryRun: job.dryRun,
    progress: {
      total: job.totalCount,
      processed: job.processedCount,
      ok: job.okCount,
      failed: job.failedCount,
    },
    counters: {
      created: job.createdCount,
      updated: job.updatedCount,
      skipped: job.skippedCount,
      warnings: job.warningsCount,
    },
    timestamps: {
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      cancelRequestedAt: job.cancelRequestedAt,
    },
    lastError: job.lastError,
  };
}

export async function getCompanyImportBulkJobStatus(strapi: Core.Strapi, userId: string, jobId: string) {
  await ensureTables(strapi);
  const job = await fetchJobForUser(strapi, jobId, userId);
  if (!job) {
    return null;
  }
  ensureCompanyImportBulkWorkerRunning(strapi);
  return toStatus(job);
}

export async function cancelCompanyImportBulkJob(
  strapi: Core.Strapi,
  userId: string,
  jobId: string
): Promise<{ cancelled: boolean; state: BulkImportState | null }> {
  await ensureTables(strapi);
  const job = await fetchJobForUser(strapi, jobId, userId);
  if (!job) {
    return { cancelled: false, state: null };
  }
  const now = new Date().toISOString();
  if (job.state === 'queued') {
    await updateJob(strapi, jobId, {
      state: 'cancelled',
      phase: 'finalize',
      cancel_requested_at: now,
      completed_at: now,
      last_error: 'Cancelled before processing started.',
    });
    return { cancelled: true, state: 'cancelled' };
  }
  if (job.state === 'running') {
    await updateJob(strapi, jobId, { cancel_requested_at: now });
    return { cancelled: true, state: 'running' };
  }
  return { cancelled: false, state: job.state };
}

export async function getCompanyImportBulkReport(strapi: Core.Strapi, userId: string, jobId: string) {
  await ensureTables(strapi);
  const job = await fetchJobForUser(strapi, jobId, userId);
  if (!job) {
    return null;
  }
  let report: Record<string, unknown> | null = null;
  if (job.reportJson) {
    try {
      report = JSON.parse(job.reportJson) as Record<string, unknown>;
    } catch {
      report = null;
    }
  }
  return {
    jobId: job.id,
    state: job.state,
    phase: job.phase,
    report: report ?? {
      summary: {
        received: job.totalCount,
        processed: job.processedCount,
        ok: job.okCount,
        failed: job.failedCount,
        created: job.createdCount,
        updated: job.updatedCount,
        skipped: job.skippedCount,
        warnings: job.warningsCount,
      },
    },
    artifacts: {
      errorsJsonUrl: `/api/import/companies/jobs/${job.id}/errors?format=json`,
      errorsCsvUrl: `/api/import/companies/jobs/${job.id}/errors?format=csv`,
    },
  };
}

export async function getCompanyImportBulkErrors(
  strapi: Core.Strapi,
  userId: string,
  jobId: string,
  format: 'json' | 'csv',
  limit = 2000
): Promise<{ json?: Record<string, unknown>; csv?: string } | null> {
  await ensureTables(strapi);
  const job = await fetchJobForUser(strapi, jobId, userId);
  if (!job) {
    return null;
  }
  const boundedLimit = Math.max(1, Math.min(limit, 10_000));
  const rows = (await strapi.db
    .connection(ERRORS_TABLE)
    .where({ job_id: jobId })
    .orderBy('id', 'asc')
    .limit(boundedLimit)) as Array<Record<string, unknown>>;
  if (format === 'csv') {
    const header = 'rowNumber,field,code,message,rawSample';
    const body = rows
      .map((row) => [
        Number(row.row_number ?? 0),
        normalizeString(row.field, 96) ?? '',
        normalizeString(row.code, 96) ?? '',
        normalizeString(row.message, 3000) ?? '',
        normalizeString(row.raw_sample, 1200) ?? '',
      ])
      .map((columns) => columns.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    return {
      csv: `${header}\n${body}`,
    };
  }

  return {
    json: {
      jobId,
      count: rows.length,
      data: rows.map((row) => ({
        id: Number(row.id),
        rowNumber: Number(row.row_number ?? 0),
        field: normalizeString(row.field, 96),
        code: normalizeString(row.code, 96) ?? 'UNKNOWN',
        message: normalizeString(row.message, 3000) ?? 'Unknown error',
        rawSample: normalizeString(row.raw_sample, 1200),
        createdAt: String(row.created_at ?? ''),
      })),
    },
  };
}

export const __testing = {
  parseCompany,
  parseBulkImportHeadersAndOptions,
  extractCompaniesArray,
  resolveTerminalState,
};
