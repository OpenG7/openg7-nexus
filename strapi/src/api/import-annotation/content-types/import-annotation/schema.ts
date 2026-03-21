import type { Struct } from '@strapi/strapi';

const schema = {
  kind: 'collectionType',
  collectionName: 'import_annotations',
  modelType: 'contentType',
  uid: 'api::import-annotation.import-annotation',
  modelName: 'import-annotation',
  globalId: 'ImportAnnotation',
  info: {
    singularName: 'import-annotation',
    pluralName: 'import-annotations',
    displayName: 'Import Annotation',
  },
  options: {
    draftAndPublish: false,
  },
  attributes: {
    author: {
      type: 'string',
      required: true,
    },
    authorAvatarUrl: {
      type: 'string',
    },
    excerpt: {
      type: 'text',
      required: true,
    },
    relatedCommodityId: {
      type: 'string',
    },
    relatedOriginCode: {
      type: 'string',
    },
    source: {
      type: 'enumeration',
      enum: ['seed', 'user'],
      default: 'seed',
      required: true,
    },
  },
} as unknown as Struct.CollectionTypeSchema;

export default schema;