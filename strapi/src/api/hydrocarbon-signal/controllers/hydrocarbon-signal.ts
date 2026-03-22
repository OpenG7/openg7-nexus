import { factories } from '@strapi/strapi';

const HYDROCARBON_SIGNAL_UID = 'api::hydrocarbon-signal.hydrocarbon-signal' as const;

interface HydrocarbonSignalQuery {
  readonly publicationType?: string;
  readonly storagePressureLevel?: string;
  readonly originProvinceId?: string;
  readonly targetProvinceId?: string;
  readonly limit?: string | number;
}

function normalizeString(value: unknown, maxLength = 120): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function normalizeLimit(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(Math.max(Math.trunc(value), 1), 100);
  }
  if (typeof value !== 'string') {
    return 20;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 20;
}

function mapHydrocarbonSignal(entity: Record<string, unknown>) {
  return {
    id: String(entity.id ?? ''),
    feedItemId: String(entity.feedItemId ?? ''),
    title: typeof entity.title === 'string' ? entity.title : '',
    summary: typeof entity.summary === 'string' ? entity.summary : '',
    companyName: typeof entity.companyName === 'string' ? entity.companyName : '',
    publicationType: typeof entity.publicationType === 'string' ? entity.publicationType : 'surplus',
    productType: typeof entity.productType === 'string' ? entity.productType : 'other',
    businessReason: typeof entity.businessReason === 'string' ? entity.businessReason : 'surplusStock',
    volumeBarrels:
      typeof entity.volumeBarrels === 'number'
        ? entity.volumeBarrels
        : Number.parseFloat(String(entity.volumeBarrels ?? 0)),
    quantityUnit: typeof entity.quantityUnit === 'string' ? entity.quantityUnit : 'bbl',
    minimumLotBarrels:
      entity.minimumLotBarrels == null
        ? null
        : typeof entity.minimumLotBarrels === 'number'
          ? entity.minimumLotBarrels
          : Number.parseFloat(String(entity.minimumLotBarrels)),
    availableFrom: typeof entity.availableFrom === 'string' ? entity.availableFrom : null,
    availableUntil: typeof entity.availableUntil === 'string' ? entity.availableUntil : null,
    estimatedDelayDays:
      entity.estimatedDelayDays == null
        ? null
        : typeof entity.estimatedDelayDays === 'number'
          ? entity.estimatedDelayDays
          : Number.parseInt(String(entity.estimatedDelayDays), 10),
    originProvinceId: typeof entity.originProvinceId === 'string' ? entity.originProvinceId : null,
    targetProvinceId: typeof entity.targetProvinceId === 'string' ? entity.targetProvinceId : null,
    originSite: typeof entity.originSite === 'string' ? entity.originSite : '',
    qualityGrade: typeof entity.qualityGrade === 'string' ? entity.qualityGrade : 'other',
    logisticsMode: Array.isArray(entity.logisticsMode) ? entity.logisticsMode : [],
    targetScope: Array.isArray(entity.targetScope) ? entity.targetScope : [],
    storagePressureLevel:
      typeof entity.storagePressureLevel === 'string' ? entity.storagePressureLevel : 'medium',
    priceReference: typeof entity.priceReference === 'string' ? entity.priceReference : null,
    responseDeadline: typeof entity.responseDeadline === 'string' ? entity.responseDeadline : null,
    contactChannel: typeof entity.contactChannel === 'string' ? entity.contactChannel : '',
    notes: typeof entity.notes === 'string' ? entity.notes : null,
    tags: Array.isArray(entity.tags) ? entity.tags : [],
    sourceKind: typeof entity.sourceKind === 'string' ? entity.sourceKind : 'USER',
    sourceLabel: typeof entity.sourceLabel === 'string' ? entity.sourceLabel : '',
    status: typeof entity.status === 'string' ? entity.status : 'active',
  };
}

export default factories.createCoreController(HYDROCARBON_SIGNAL_UID, ({ strapi }) => ({
  async find(ctx) {
    const query = (ctx.query ?? {}) as HydrocarbonSignalQuery;
    const publicationType = normalizeString(query.publicationType, 40);
    const storagePressureLevel = normalizeString(query.storagePressureLevel, 40);
    const originProvinceId = normalizeString(query.originProvinceId, 20);
    const targetProvinceId = normalizeString(query.targetProvinceId, 20);
    const limit = normalizeLimit(query.limit);

    const filters: Record<string, unknown> = {};
    if (publicationType) {
      filters.publicationType = publicationType;
    }
    if (storagePressureLevel) {
      filters.storagePressureLevel = storagePressureLevel;
    }
    if (originProvinceId) {
      filters.originProvinceId = originProvinceId;
    }
    if (targetProvinceId) {
      filters.targetProvinceId = targetProvinceId;
    }

    const items = (await strapi.entityService.findMany(HYDROCARBON_SIGNAL_UID as any, {
      filters,
      sort: ['createdAt:desc'],
      limit,
    })) as Record<string, unknown>[];

    ctx.body = {
      data: items.map(mapHydrocarbonSignal),
      meta: {
        count: items.length,
        limit,
      },
    };
  },

  async findOne(ctx) {
    const id = normalizeString((ctx.params as Record<string, unknown> | undefined)?.id, 80);
    if (!id) {
      return ctx.badRequest('Hydrocarbon signal id is required.');
    }

    const items = (await strapi.entityService.findMany(HYDROCARBON_SIGNAL_UID as any, {
      filters: {
        $or: [{ id }, { feedItemId: id }],
      },
      sort: ['createdAt:desc'],
      limit: 1,
    })) as Record<string, unknown>[];

    const entity = items[0];
    if (!entity) {
      return ctx.notFound('Hydrocarbon signal not found.');
    }

    ctx.body = {
      data: mapHydrocarbonSignal(entity),
    };
  },
}));