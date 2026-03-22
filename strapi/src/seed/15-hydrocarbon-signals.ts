import { hasContentType, upsertByUID } from '../utils/seed-helpers';
import { syncHydrocarbonSignalProjection } from '../api/hydrocarbon-signal/services/hydrocarbon-signal-projection';

const FEED_UID = 'api::feed.feed';

const DEMO_SIGNALS = [
  {
    idempotencyKey: 'seed:hydrocarbon-surplus-offer:northern-prairie:surplus-window',
    type: 'OFFER',
    sectorId: 'energy',
    title: '48,000 barrels available after Edmonton storage build-up',
    summary:
      'Northern Prairie Energy can release a short surplus window from Alberta and is looking for buyers, storage operators, or rail-linked refiners.',
    fromProvinceId: 'ab',
    toProvinceId: 'bc',
    mode: 'EXPORT',
    quantityValue: 48000,
    quantityUnit: 'bbl',
    urgency: 2,
    credibility: 2,
    volumeScore: 82,
    tags: ['hydrocarbon', 'alberta', 'surplus-window', 'storage-pressure'],
    sourceKind: 'COMPANY',
    sourceLabel: 'Northern Prairie Energy',
    status: 'confirmed',
    accessibilitySummary:
      'Hydrocarbon surplus signal from Alberta with available barrels, target route, and storage pressure context.',
    publicationFormKey: 'hydrocarbon-surplus-offer',
    metadata: {
      publicationForm: {
        formKey: 'hydrocarbon-surplus-offer',
        schemaVersion: 1,
      },
      extensions: {
        companyName: 'Northern Prairie Energy',
        publicationType: 'surplus',
        productType: 'crudeOil',
        businessReason: 'surplusStock',
        volumeBarrels: 48000,
        minimumLotBarrels: 12000,
        availableFrom: '2026-02-01',
        availableUntil: '2026-02-12',
        storagePressureLevel: 'high',
        originSite: 'Edmonton terminal cluster',
        qualityGrade: 'wcs',
        logisticsMode: ['rail', 'storageTransfer'],
        targetScope: ['bc', 'refiningNetwork'],
        priceReference: 'WCS less rail differential',
        contactChannel: 'Crude desk - western dispatch',
      },
    },
  },
  {
    idempotencyKey: 'seed:hydrocarbon-surplus-offer:northern-prairie:slowdown-corridor',
    type: 'OFFER',
    sectorId: 'energy',
    title: 'Barrel slowdown on Alberta corridor with 6-day absorption need',
    summary:
      'A transport slowdown is compressing dispatch capacity. Northern Prairie Energy is looking for interim storage or rerouting capacity before the next shipping window.',
    fromProvinceId: 'ab',
    toProvinceId: 'sk',
    mode: 'EXPORT',
    quantityValue: 36500,
    quantityUnit: 'bbl',
    urgency: 3,
    credibility: 2,
    volumeScore: 76,
    tags: ['hydrocarbon', 'alberta', 'barrel-slowdown', 'rerouting'],
    sourceKind: 'COMPANY',
    sourceLabel: 'Northern Prairie Energy',
    status: 'confirmed',
    accessibilitySummary:
      'Hydrocarbon slowdown signal from Alberta with estimated delay, logistics mode, and routing targets.',
    publicationFormKey: 'hydrocarbon-surplus-offer',
    metadata: {
      publicationForm: {
        formKey: 'hydrocarbon-surplus-offer',
        schemaVersion: 1,
      },
      extensions: {
        companyName: 'Northern Prairie Energy',
        publicationType: 'slowdown',
        productType: 'crudeOil',
        businessReason: 'transportDisruption',
        volumeBarrels: 36500,
        minimumLotBarrels: 8000,
        availableFrom: '2026-02-03',
        availableUntil: '2026-02-09',
        estimatedDelayDays: 6,
        storagePressureLevel: 'critical',
        originSite: 'Hardisty routing hub',
        qualityGrade: 'wcs',
        logisticsMode: ['pipeline', 'storageTransfer'],
        targetScope: ['sk', 'storageNetwork'],
        priceReference: 'Temporary discount against WCS to accelerate offtake',
        contactChannel: 'Logistics coordination line',
      },
    },
  },
] as const;

export default async function seedHydrocarbonSignals() {
  if (!hasContentType(FEED_UID)) {
    return;
  }

  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: {
      blocked: false,
    },
    orderBy: { id: 'asc' },
  });

  if (!user?.id) {
    strapi.log?.warn?.('Skipping 15-hydrocarbon-signals: no users-permissions user available.');
    return;
  }

  for (const signal of DEMO_SIGNALS) {
    const entry = await upsertByUID(
      FEED_UID,
      {
        ...signal,
        user: user.id,
      },
      {
        unique: {
          idempotencyKey: signal.idempotencyKey,
        },
      }
    );

    await syncHydrocarbonSignalProjection({
      feedItemId: entry.id,
      ownerId: user.id,
      sourceIdempotencyKey: signal.idempotencyKey,
      title: signal.title,
      summary: signal.summary,
      fromProvinceId: signal.fromProvinceId,
      toProvinceId: signal.toProvinceId,
      quantity: {
        value: signal.quantityValue,
        unit: signal.quantityUnit,
      },
      tags: signal.tags,
      sourceKind: signal.sourceKind,
      sourceLabel: signal.sourceLabel,
      metadata: signal.metadata,
    });
  }
}