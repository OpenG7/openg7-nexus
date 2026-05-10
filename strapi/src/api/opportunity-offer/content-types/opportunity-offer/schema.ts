import type { Struct } from '@strapi/strapi';

const schema = {
  kind: 'collectionType',
  collectionName: 'opportunity_offers',
  modelType: 'contentType',
  uid: 'api::opportunity-offer.opportunity-offer',
  modelName: 'opportunity-offer',
  globalId: 'OpportunityOffer',
  info: {
    singularName: 'opportunity-offer',
    pluralName: 'opportunity-offers',
    displayName: 'Opportunity Offer',
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
    reference: {
      type: 'string',
      required: true,
      unique: true,
    },
    opportunityId: {
      type: 'string',
      required: true,
    },
    opportunityTitle: {
      type: 'string',
      required: true,
    },
    opportunityRoute: {
      type: 'string',
    },
    feedItemId: {
      type: 'string',
    },
    recipientKind: {
      type: 'enumeration',
      enum: ['GOV', 'COMPANY', 'PARTNER', 'USER'],
      default: 'PARTNER',
      required: true,
    },
    recipientLabel: {
      type: 'string',
      required: true,
    },
    senderUserId: {
      type: 'string',
      required: true,
    },
    senderLabel: {
      type: 'string',
      required: true,
    },
    senderEmail: {
      type: 'email',
      required: true,
    },
    capacityMw: {
      type: 'decimal',
      required: true,
      min: 0,
    },
    startDate: {
      type: 'date',
      required: true,
    },
    endDate: {
      type: 'date',
      required: true,
    },
    pricingModel: {
      type: 'string',
      required: true,
    },
    comment: {
      type: 'text',
      required: true,
    },
    attachmentId: {
      type: 'string',
    },
    attachmentName: {
      type: 'string',
    },
    status: {
      type: 'enumeration',
      enum: ['submitted', 'inDiscussion', 'partiallyServed', 'withdrawn'],
      default: 'submitted',
      required: true,
    },
    allocatedCapacityMw: {
      type: 'decimal',
    },
    remainingOpportunityCapacityMw: {
      type: 'decimal',
    },
    submittedAt: {
      type: 'datetime',
      required: true,
    },
    withdrawnAt: {
      type: 'datetime',
    },
    activities: {
      type: 'json',
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
