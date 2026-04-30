import type { Struct } from '@strapi/strapi';

const schema = {
  kind: 'collectionType',
  collectionName: 'admin_quality_mission_decisions',
  modelType: 'contentType',
  uid: 'api::admin-quality-mission-decision.admin-quality-mission-decision',
  modelName: 'admin-quality-mission-decision',
  globalId: 'AdminQualityMissionDecision',
  info: {
    singularName: 'admin-quality-mission-decision',
    pluralName: 'admin-quality-mission-decisions',
    displayName: 'Admin Quality Mission Decision',
  },
  options: {
    draftAndPublish: false,
  },
  attributes: {
    recommendationId: {
      type: 'string',
      required: true,
      unique: true,
    },
    entryId: {
      type: 'string',
      required: true,
    },
    kind: {
      type: 'enumeration',
      enum: ['core', 'safety-net', 'governance'],
      required: true,
    },
    status: {
      type: 'enumeration',
      enum: [
        'proposed',
        'approved',
        'in-progress',
        'proof-returned',
        'done',
        'deferred',
        'rejected',
        'blocked',
      ],
      default: 'proposed',
      required: true,
    },
    title: {
      type: 'string',
    },
    message: {
      type: 'text',
    },
    operatorPrompt: {
      type: 'text',
    },
    metadata: {
      type: 'json',
    },
    decidedByUserId: {
      type: 'string',
    },
  },
} as unknown as Struct.CollectionTypeSchema;

export default schema;
