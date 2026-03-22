import { hasContentType, upsertByUID } from '../../../utils/seed-helpers';

const HYDROCARBON_SIGNAL_UID = 'api::hydrocarbon-signal.hydrocarbon-signal';
const HYDROCARBON_FORM_KEY = 'hydrocarbon-surplus-offer';

interface ProjectionInput {
  readonly feedItemId: number | string;
  readonly ownerId?: number | string | null;
  readonly sourceIdempotencyKey?: string | null;
  readonly title: string;
  readonly summary: string;
  readonly fromProvinceId?: string | null;
  readonly toProvinceId?: string | null;
  readonly quantity?: {
    readonly value: number | null;
    readonly unit: string | null;
  } | null;
  readonly tags?: readonly string[];
  readonly sourceKind?: 'GOV' | 'COMPANY' | 'PARTNER' | 'USER';
  readonly sourceLabel?: string | null;
  readonly metadata?: Record<string, unknown> | null;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback: string | null = null): string | null {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized || fallback;
}

function asNumber(value: unknown): number | null {
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

function asDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => asString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function isHydrocarbonProjectionCandidate(metadata: Record<string, unknown> | null): boolean {
  if (!metadata) {
    return false;
  }

  const publicationForm = asObject(metadata.publicationForm);
  return asString(publicationForm?.formKey) === HYDROCARBON_FORM_KEY;
}

export async function syncHydrocarbonSignalProjection(input: ProjectionInput): Promise<void> {
  if (!hasContentType(HYDROCARBON_SIGNAL_UID)) {
    return;
  }

  const metadata = input.metadata ?? null;
  if (!isHydrocarbonProjectionCandidate(metadata)) {
    return;
  }

  const extensions = asObject(metadata?.extensions) ?? {};
  const quantityValue = input.quantity?.value ?? asNumber(extensions.volumeBarrels) ?? 0;
  const quantityUnit = asString(input.quantity?.unit, 'bbl') ?? 'bbl';
  const companyName = asString(extensions.companyName, input.sourceLabel ?? 'Hydrocarbon publisher') ?? 'Hydrocarbon publisher';
  const publicationType = asString(extensions.publicationType, 'surplus') ?? 'surplus';
  const productType = asString(extensions.productType, 'other') ?? 'other';
  const businessReason = asString(extensions.businessReason, 'surplusStock') ?? 'surplusStock';
  const originSite = asString(extensions.originSite, input.fromProvinceId ?? 'Unknown origin') ?? 'Unknown origin';
  const qualityGrade = asString(extensions.qualityGrade, 'other') ?? 'other';
  const storagePressureLevel = asString(extensions.storagePressureLevel, 'medium') ?? 'medium';
  const contactChannel = asString(extensions.contactChannel, input.sourceLabel ?? 'OpenG7 feed') ?? 'OpenG7 feed';

  await upsertByUID(
    HYDROCARBON_SIGNAL_UID,
    {
      feedItemId: String(input.feedItemId),
      sourceIdempotencyKey: asString(input.sourceIdempotencyKey),
      feedItem: input.feedItemId,
      owner: input.ownerId ?? null,
      title: input.title,
      summary: input.summary,
      companyName,
      publicationType,
      productType,
      businessReason,
      volumeBarrels: quantityValue,
      quantityUnit,
      minimumLotBarrels: asNumber(extensions.minimumLotBarrels),
      availableFrom: asDate(extensions.availableFrom),
      availableUntil: asDate(extensions.availableUntil),
      estimatedDelayDays: asNumber(extensions.estimatedDelayDays),
      originProvinceId: input.fromProvinceId ?? null,
      targetProvinceId: input.toProvinceId ?? null,
      originSite,
      qualityGrade,
      logisticsMode: asStringArray(extensions.logisticsMode),
      targetScope: asStringArray(extensions.targetScope),
      storagePressureLevel,
      priceReference: asString(extensions.priceReference),
      responseDeadline: asDate(extensions.responseDeadline),
      contactChannel,
      notes: asString(extensions.notes),
      tags: input.tags ?? [],
      sourceKind: input.sourceKind ?? 'USER',
      sourceLabel: input.sourceLabel ?? companyName,
      status: 'active',
    },
    {
      unique: {
        feedItemId: String(input.feedItemId),
      },
    }
  );
}