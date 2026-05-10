import type { Struct } from '@strapi/strapi';

const schema = {
  kind: 'collectionType',
  collectionName: 'feed_actions',
  modelType: 'contentType',
  uid: 'api::feed-action.feed-action',
  modelName: 'feed-action',
  globalId: 'FeedAction',
  info: {
    singularName: 'feed-action',
    pluralName: 'feed-actions',
    displayName: 'Feed Action',
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
    targetType: {
      type: 'enumeration',
      enum: ['opportunity', 'alert', 'indicator', 'feed-item'],
      required: true,
    },
    targetId: {
      type: 'string',
      required: true,
    },
    action: {
      type: 'enumeration',
      enum: [
        'save',
        'unsave',
        'subscribe',
        'report-update',
        'report-opportunity',
        'archive',
        'duplicate',
        'share',
        'create-indicator-alert',
      ],
      required: true,
    },
    status: {
      type: 'enumeration',
      enum: ['completed', 'queued', 'failed'],
      default: 'completed',
      required: true,
    },
    sourceRoute: {
      type: 'string',
    },
    targetRoute: {
      type: 'string',
    },
    metadata: {
      type: 'json',
    },
    occurredAt: {
      type: 'datetime',
      required: true,
    },
    correlationId: {
      type: 'string',
    },
    idempotencyKey: {
      type: 'string',
    },
  },
} as unknown as Struct.CollectionTypeSchema;

export default schema;
