import type { Struct } from '@strapi/strapi';

const schema = {
  kind: 'collectionType',
  collectionName: 'hydrocarbon_signals',
  modelType: 'contentType',
  uid: 'api::hydrocarbon-signal.hydrocarbon-signal',
  modelName: 'hydrocarbon-signal',
  globalId: 'HydrocarbonSignal',
  info: {
    singularName: 'hydrocarbon-signal',
    pluralName: 'hydrocarbon-signals',
    displayName: 'Hydrocarbon Signal',
  },
  options: {
    draftAndPublish: false,
  },
  attributes: {
    feedItemId: {
      type: 'string',
      required: true,
      unique: true,
    },
    sourceIdempotencyKey: {
      type: 'string',
    },
    feedItem: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::feed.feed',
    },
    owner: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'plugin::users-permissions.user',
    },
    title: {
      type: 'string',
      required: true,
    },
    summary: {
      type: 'text',
      required: true,
    },
    companyName: {
      type: 'string',
      required: true,
    },
    publicationType: {
      type: 'enumeration',
      enum: ['surplus', 'slowdown'],
      required: true,
      default: 'surplus',
    },
    productType: {
      type: 'enumeration',
      enum: ['crudeOil', 'bitumen', 'syntheticCrude', 'diesel', 'other'],
      required: true,
      default: 'other',
    },
    businessReason: {
      type: 'enumeration',
      enum: ['surplusStock', 'demandSlowdown', 'transportDisruption', 'buyerOutage', 'priceWindow'],
      required: true,
      default: 'surplusStock',
    },
    volumeBarrels: {
      type: 'decimal',
      required: true,
      min: 0,
    },
    quantityUnit: {
      type: 'enumeration',
      enum: ['bbl', 'bbl_d'],
      default: 'bbl',
      required: true,
    },
    minimumLotBarrels: {
      type: 'decimal',
      min: 0,
    },
    availableFrom: {
      type: 'date',
    },
    availableUntil: {
      type: 'date',
    },
    estimatedDelayDays: {
      type: 'integer',
      min: 0,
    },
    originProvinceId: {
      type: 'string',
    },
    targetProvinceId: {
      type: 'string',
    },
    originSite: {
      type: 'string',
      required: true,
    },
    qualityGrade: {
      type: 'enumeration',
      enum: ['wcs', 'wtiLinked', 'syntheticBlend', 'other'],
      required: true,
      default: 'other',
    },
    logisticsMode: {
      type: 'json',
    },
    targetScope: {
      type: 'json',
    },
    storagePressureLevel: {
      type: 'enumeration',
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      default: 'medium',
    },
    priceReference: {
      type: 'string',
    },
    responseDeadline: {
      type: 'date',
    },
    contactChannel: {
      type: 'string',
      required: true,
    },
    notes: {
      type: 'text',
    },
    tags: {
      type: 'json',
    },
    sourceKind: {
      type: 'enumeration',
      enum: ['GOV', 'COMPANY', 'PARTNER', 'USER'],
      default: 'USER',
      required: true,
    },
    sourceLabel: {
      type: 'string',
      required: true,
    },
    status: {
      type: 'enumeration',
      enum: ['active', 'expired', 'closed'],
      default: 'active',
      required: true,
    },
  },
} as unknown as Struct.CollectionTypeSchema;

export default schema;