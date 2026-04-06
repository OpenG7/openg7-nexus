import { factories } from '@strapi/strapi';

interface RelationInput {
  data?: {
    id?: number;
    attributes?: {
      name?: unknown;
    };
  } | null;
}

interface CompanyEntity {
  id?: number;
  attributes?: Record<string, unknown> | null;
}

const baseControllerFactory = factories.createCoreController('api::company.company');
const noopNext = async () => undefined;

const ensurePopulate = (populate: unknown) =>
  populate ?? {
    sector: true,
    province: true,
    verificationSources: true,
    trustHistory: true,
  };

const mapRelation = (relation: RelationInput | null | undefined) => {
  const payload = relation?.data;
  if (!payload?.id) {
    return null;
  }
  const name = payload.attributes?.name;
  return {
    id: payload.id,
    name: typeof name === 'string' ? name : null,
  } as const;
};

const mapCapacities = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as const;
  }
  const list = [] as Array<{ label: string; value: number | null; unit: string | null }>;
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const labelRaw = (item as Record<string, unknown>).label;
    const label = typeof labelRaw === 'string' ? labelRaw.trim() : '';
    if (!label) {
      continue;
    }
    const valueRaw = (item as Record<string, unknown>).value;
    const unitRaw = (item as Record<string, unknown>).unit;
    const parsedValue =
      typeof valueRaw === 'number' && Number.isFinite(valueRaw)
        ? valueRaw
        : typeof valueRaw === 'string' && valueRaw.trim() !== '' && !Number.isNaN(Number(valueRaw))
          ? Number(valueRaw)
          : null;
    const unit = typeof unitRaw === 'string' ? unitRaw.trim() || null : null;
    list.push({ label, value: parsedValue, unit });
  }
  return list;
};

interface VerificationSourceInput {
  id?: number;
  name?: unknown;
  type?: unknown;
  status?: unknown;
  referenceId?: unknown;
  url?: unknown;
  issuedAt?: unknown;
  lastCheckedAt?: unknown;
  evidenceUrl?: unknown;
  notes?: unknown;
}

interface TrustRecordInput {
  id?: number;
  label?: unknown;
  type?: unknown;
  direction?: unknown;
  occurredAt?: unknown;
  amount?: unknown;
  score?: unknown;
  notes?: unknown;
}

const mapVerificationStatus = (value: unknown) => {
  if (
    value === 'verified' ||
    value === 'pending' ||
    value === 'correctionRequested' ||
    value === 'rejected' ||
    value === 'suspended'
  ) {
    return value;
  }
  return 'unverified' as const;
};

const mapVerificationSources = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as const;
  }
  const entries: Array<{
    id: number | null;
    name: string;
    type: 'registry' | 'chamber' | 'audit' | 'other';
    status: 'pending' | 'validated' | 'revoked';
    referenceId: string | null;
    url: string | null;
    issuedAt: string | null;
    lastCheckedAt: string | null;
    evidenceUrl: string | null;
    notes: string | null;
  }> = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const source = item as VerificationSourceInput;
    const nameRaw = source.name;
    if (typeof nameRaw !== 'string' || !nameRaw.trim()) {
      continue;
    }
    const typeRaw = source.type;
    const statusRaw = source.status;
    const entryType =
      typeRaw === 'chamber' || typeRaw === 'audit' || typeRaw === 'other'
        ? typeRaw
        : 'registry';
    const entryStatus =
      statusRaw === 'validated' || statusRaw === 'revoked' ? statusRaw : 'pending';
    const normalizeString = (input: unknown) =>
      typeof input === 'string' && input.trim() ? input.trim() : null;
    const normalizeDate = (input: unknown) =>
      typeof input === 'string' && input.trim() ? input.trim() : null;

    entries.push({
      id: typeof source.id === 'number' ? source.id : null,
      name: nameRaw.trim(),
      type: entryType,
      status: entryStatus,
      referenceId: normalizeString(source.referenceId),
      url: normalizeString(source.url),
      issuedAt: normalizeDate(source.issuedAt),
      lastCheckedAt: normalizeDate(source.lastCheckedAt),
      evidenceUrl: normalizeString(source.evidenceUrl),
      notes: normalizeString(source.notes),
    });
  }

  return entries;
};

const mapTrustHistory = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as const;
  }
  const entries: Array<{
    id: number | null;
    label: string;
    type: 'transaction' | 'evaluation';
    direction: 'inbound' | 'outbound';
    occurredAt: string;
    amount: number | null;
    score: number | null;
    notes: string | null;
  }> = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const record = item as TrustRecordInput;
    const labelRaw = record.label;
    const occurredAtRaw = record.occurredAt;
    if (typeof labelRaw !== 'string' || !labelRaw.trim()) {
      continue;
    }
    if (typeof occurredAtRaw !== 'string' || !occurredAtRaw.trim()) {
      continue;
    }
    const typeRaw = record.type;
    const directionRaw = record.direction;
    const amountRaw = record.amount;
    const scoreRaw = record.score;
    const normalizeString = (input: unknown) =>
      typeof input === 'string' && input.trim() ? input.trim() : null;
    const normalizeNumber = (input: unknown) => {
      if (typeof input === 'number' && Number.isFinite(input)) {
        return input;
      }
      if (typeof input === 'string' && input.trim() !== '' && !Number.isNaN(Number(input))) {
        return Number(input);
      }
      return null;
    };

    entries.push({
      id: typeof record.id === 'number' ? record.id : null,
      label: labelRaw.trim(),
      type: typeRaw === 'evaluation' ? 'evaluation' : 'transaction',
      direction: directionRaw === 'outbound' ? 'outbound' : 'inbound',
      occurredAt: occurredAtRaw.trim(),
      amount: normalizeNumber(amountRaw),
      score: normalizeNumber(scoreRaw),
      notes: normalizeString(record.notes),
    });
  }

  return entries;
};

const mapTrustScore = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 100) / 100;
  }
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Math.round(Number(value) * 100) / 100;
  }
  return 0;
};

const mapCompany = (entity: CompanyEntity | null | undefined) => {
  if (!entity?.id) {
    return null;
  }
  const attributes = entity.attributes ?? {};
  const statusRaw = (attributes as Record<string, unknown>).status;
  const status =
    statusRaw === 'approved' || statusRaw === 'suspended' || statusRaw === 'pending'
      ? statusRaw
      : 'pending';

  const descriptionRaw = (attributes as Record<string, unknown>).description;
  const websiteRaw = (attributes as Record<string, unknown>).website;
  const businessIdRaw = (attributes as Record<string, unknown>).businessId;
  const slugRaw = (attributes as Record<string, unknown>).slug;
  const logoRaw = (attributes as Record<string, unknown>).logoUrl;
  const secondaryLogoRaw = (attributes as Record<string, unknown>).secondaryLogoUrl;
  const countryRaw = (attributes as Record<string, unknown>).country;
  const country = typeof countryRaw === 'string' ? countryRaw : null;

  return {
    id: entity.id,
    businessId: typeof businessIdRaw === 'string' ? businessIdRaw : null,
    slug: typeof slugRaw === 'string' ? slugRaw : null,
    name: typeof (attributes as Record<string, unknown>).name === 'string'
      ? ((attributes as Record<string, unknown>).name as string)
      : '',
    description: typeof descriptionRaw === 'string' ? descriptionRaw : null,
    website: typeof websiteRaw === 'string' ? websiteRaw : null,
    status,
    logoUrl: typeof logoRaw === 'string' ? logoRaw : null,
    secondaryLogoUrl: typeof secondaryLogoRaw === 'string' ? secondaryLogoRaw : null,
    capacities: mapCapacities((attributes as Record<string, unknown>).capacities),
    sector: mapRelation((attributes as Record<string, unknown>).sector as RelationInput),
    province: mapRelation((attributes as Record<string, unknown>).province as RelationInput),
    country,
    verificationStatus: mapVerificationStatus(
      (attributes as Record<string, unknown>).verificationStatus
    ),
    verificationSources: mapVerificationSources(
      (attributes as Record<string, unknown>).verificationSources
    ),
    trustScore: mapTrustScore((attributes as Record<string, unknown>).trustScore),
    trustHistory: mapTrustHistory((attributes as Record<string, unknown>).trustHistory),
  } as const;
};

export default factories.createCoreController('api::company.company', ({ strapi }) => {
  const superController = baseControllerFactory({ strapi });

  const ensureObject = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  const normalizeResponse = (response: unknown): { data?: unknown; meta?: Record<string, unknown> } =>
    response && typeof response === 'object'
      ? (response as { data?: unknown; meta?: Record<string, unknown> })
      : { data: undefined, meta: undefined };

  return {
    async find(ctx) {
      ctx.query = ctx.query ?? {};
      ctx.query.populate = ensurePopulate(ctx.query.populate);
      if (!ctx.state.user) {
        const filters = ensureObject(ctx.query.filters);
        ctx.query.filters = {
          ...filters,
          status: 'approved',
        };
      }
      const response = normalizeResponse(await superController.find(ctx, noopNext));
      const data = Array.isArray(response.data) ? response.data : [];
      return {
        data: data
          .map((entity) => mapCompany(entity as CompanyEntity))
          .filter((company): company is NonNullable<ReturnType<typeof mapCompany>> => Boolean(company)),
        meta: response.meta ?? {},
      };
    },

    async findOne(ctx) {
      ctx.query = ctx.query ?? {};
      ctx.query.populate = ensurePopulate(ctx.query.populate);
      const response = normalizeResponse(await superController.findOne(ctx, noopNext));
      const company = mapCompany(response.data as CompanyEntity);
      if (!company) {
        return { data: null, meta: response.meta ?? {} };
      }
      if (!ctx.state.user && company.status !== 'approved') {
        return ctx.notFound();
      }
      return { data: company, meta: response.meta ?? {} };
    },

    async create(ctx) {
      const response = normalizeResponse(await superController.create(ctx, noopNext));
      return { data: mapCompany(response.data as CompanyEntity), meta: response.meta ?? {} };
    },

    async update(ctx) {
      const response = normalizeResponse(await superController.update(ctx, noopNext));
      return { data: mapCompany(response.data as CompanyEntity), meta: response.meta ?? {} };
    },
  };
});
