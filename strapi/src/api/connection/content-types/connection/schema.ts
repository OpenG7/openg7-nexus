import type { Struct } from '@strapi/strapi';

const schema = {
  kind: 'collectionType',
  collectionName: 'connections',
  modelType: 'contentType',
  uid: 'api::connection.connection',
  modelName: 'connection',
  globalId: 'Connection',
  info: {
    singularName: 'connection',
    pluralName: 'connections',
    displayName: 'Connection',
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
    matchId: {
      type: 'integer',
      required: true,
    },
    buyerProfileId: {
      type: 'integer',
      required: true,
    },
    buyerOrganization: {
      type: 'string',
      required: true,
    },
    buyerOrganizationKey: {
      type: 'string',
      required: true,
    },
    supplierProfileId: {
      type: 'integer',
      required: true,
    },
    supplierOrganization: {
      type: 'string',
      required: true,
    },
    supplierOrganizationKey: {
      type: 'string',
      required: true,
    },
    introMessage: {
      type: 'text',
      required: true,
    },
    locale: {
      type: 'enumeration',
      enum: ['fr', 'en'],
      default: 'fr',
      required: true,
    },
    attachments: {
      type: 'json',
    },
    logisticsPlan: {
      type: 'json',
    },
    meetingProposal: {
      type: 'json',
    },
    stage: {
      type: 'enumeration',
      enum: ['intro', 'reply', 'meeting', 'review', 'deal'],
      default: 'reply',
      required: true,
    },
    stageHistory: {
      type: 'json',
    },
    status: {
      type: 'enumeration',
      enum: ['pending', 'inDiscussion', 'completed', 'closed'],
      default: 'pending',
      required: true,
    },
    statusHistory: {
      type: 'json',
    },
    lastStatusAt: {
      type: 'datetime',
    },
  },
} as unknown as Struct.CollectionTypeSchema;

export default schema;
