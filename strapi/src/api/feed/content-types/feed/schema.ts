import type { Struct } from '@strapi/strapi';

const schema = {
  kind: 'collectionType',
  collectionName: 'feed_items',
  modelType: 'contentType',
  uid: 'api::feed.feed',
  modelName: 'feed',
  globalId: 'Feed',
  info: {
    singularName: 'feed',
    pluralName: 'feeds',
    displayName: 'Feed',
  },
  options: {
    draftAndPublish: false,
  },
  attributes: {
    user: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'plugin::users-permissions.user',
      required: true,
    },
    type: {
      type: 'enumeration',
      enum: ['OFFER', 'REQUEST', 'ALERT', 'TENDER', 'CAPACITY', 'INDICATOR'],
      required: true,
    },
    sectorId: {
      type: 'string',
    },
    title: {
      type: 'string',
      required: true,
    },
    summary: {
      type: 'text',
      required: true,
    },
    fromProvinceId: {
      type: 'string',
    },
    toProvinceId: {
      type: 'string',
    },
    mode: {
      type: 'enumeration',
      enum: ['EXPORT', 'IMPORT', 'BOTH'],
      default: 'BOTH',
      required: true,
    },
    quantityValue: {
      type: 'decimal',
    },
    quantityUnit: {
      type: 'enumeration',
      enum: ['MW', 'MWh', 'bbl_d', 'ton', 'kg', 'hours', 'cad', 'usd'],
    },
    urgency: {
      type: 'integer',
      default: 1,
      min: 1,
      max: 3,
    },
    credibility: {
      type: 'integer',
      default: 1,
      min: 1,
      max: 3,
    },
    volumeScore: {
      type: 'decimal',
      default: 0,
    },
    tags: {
      type: 'json',
    },
    originType: {
      type: 'enumeration',
      enum: ['alert', 'opportunity', 'indicator'],
    },
    originId: {
      type: 'string',
    },
    connectionMatchId: {
      type: 'integer',
      min: 1,
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
    sourceUrl: {
      type: 'string',
    },
    status: {
      type: 'enumeration',
      enum: ['confirmed', 'pending', 'failed'],
      default: 'confirmed',
      required: true,
    },
    accessibilitySummary: {
      type: 'text',
    },
    geo: {
      type: 'json',
    },
    idempotencyKey: {
      type: 'string',
    },
  },
} as unknown as Struct.CollectionTypeSchema;

export default schema;

