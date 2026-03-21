import type { Struct } from '@strapi/strapi';

const schema = {
  kind: 'collectionType',
  collectionName: 'import_watchlists',
  modelType: 'contentType',
  uid: 'api::import-watchlist.import-watchlist',
  modelName: 'import-watchlist',
  globalId: 'ImportWatchlist',
  info: {
    singularName: 'import-watchlist',
    pluralName: 'import-watchlists',
    displayName: 'Import Watchlist',
  },
  options: {
    draftAndPublish: false,
  },
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
    owner: {
      type: 'string',
      required: true,
      default: 'Local workspace',
    },
    filters: {
      type: 'json',
      required: true,
    },
    source: {
      type: 'enumeration',
      enum: ['seed', 'user'],
      default: 'user',
      required: true,
    },
  },
} as unknown as Struct.CollectionTypeSchema;

export default schema;