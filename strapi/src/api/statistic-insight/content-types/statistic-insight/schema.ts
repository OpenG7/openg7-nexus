import type { Struct } from '@strapi/strapi';

const schema = {
  kind: 'collectionType',
  collectionName: 'statistic_insights',
  modelType: 'contentType',
  uid: 'api::statistic-insight.statistic-insight',
  modelName: 'statistic-insight',
  globalId: 'StatisticInsight',
  info: {
    singularName: 'statistic-insight',
    pluralName: 'statistic-insights',
    displayName: 'Statistic Insight',
  },
  options: {
    draftAndPublish: false,
  },
  attributes: {
    slug: {
      type: 'uid',
      targetField: 'titleKey',
    },
    titleKey: {
      type: 'string',
      required: true,
    },
    descriptionKey: {
      type: 'string',
    },
    scope: {
      type: 'enumeration',
      enum: ['interprovincial', 'international', 'all'],
      default: 'all',
    },
    intrant: {
      type: 'enumeration',
      enum: ['energy', 'agri-food', 'manufacturing', 'digital-services', 'all'],
      default: 'all',
    },
    kind: {
      type: 'enumeration',
      enum: ['summary', 'insight'],
      required: true,
    },
    value: {
      type: 'decimal',
    },
    change: {
      type: 'decimal',
    },
    unitKey: {
      type: 'string',
    },
    period: {
      type: 'string',
    },
    province: {
      type: 'string',
    },
    country: {
      type: 'enumeration',
      enum: ['CA', 'DE', 'FR', 'IT', 'JP', 'UK', 'US'],
    },
    ordinal: {
      type: 'integer',
      default: 0,
    },
  },
} satisfies Struct.CollectionTypeSchema;

export default schema;
