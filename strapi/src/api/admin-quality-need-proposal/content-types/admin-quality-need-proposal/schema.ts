import type { Struct } from '@strapi/strapi';

const proposalType = ['add-source-ref', 'create-entry', 'mark-stale'] as const;
const proposalStatus = ['proposed', 'accepted', 'rejected', 'superseded'] as const;
const proposalConfidence = ['low', 'medium', 'high'] as const;

const schema = {
  kind: 'collectionType',
  collectionName: 'admin_quality_need_proposals',
  modelType: 'contentType',
  uid: 'api::admin-quality-need-proposal.admin-quality-need-proposal',
  modelName: 'admin-quality-need-proposal',
  globalId: 'AdminQualityNeedProposal',
  info: {
    singularName: 'admin-quality-need-proposal',
    pluralName: 'admin-quality-need-proposals',
    displayName: 'Admin Quality Need Proposal',
  },
  options: {
    draftAndPublish: false,
  },
  attributes: {
    proposalId: {
      type: 'string',
      required: true,
      unique: true,
    },
    entryId: {
      type: 'string',
      required: true,
    },
    type: {
      type: 'enumeration',
      enum: proposalType,
      required: true,
    },
    status: {
      type: 'enumeration',
      enum: proposalStatus,
      default: 'proposed',
      required: true,
    },
    confidence: {
      type: 'enumeration',
      enum: proposalConfidence,
      required: true,
      default: 'medium',
    },
    title: {
      type: 'string',
    },
    summary: {
      type: 'text',
    },
    source: {
      type: 'json',
    },
    payload: {
      type: 'json',
    },
    history: {
      type: 'json',
    },
    correlationId: {
      type: 'string',
    },
    reportedAt: {
      type: 'datetime',
    },
  },
} as unknown as Struct.CollectionTypeSchema;

export default schema;
