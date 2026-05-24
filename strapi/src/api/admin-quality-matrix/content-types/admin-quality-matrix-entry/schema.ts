import type { Struct } from '@strapi/strapi';

const matrixStatus = ['oui', 'partiel', 'non', 'hors MVP'] as const;
const matrixPriority = ['basse', 'moyenne', 'haute'] as const;
const matrixBucket = ['covered', 'proof-gap', 'product-gap', 'scope-limit'] as const;
const matrixConfidence = ['low', 'medium', 'high'] as const;

const schema = {
  kind: 'collectionType',
  collectionName: 'admin_quality_matrix_entries',
  modelType: 'contentType',
  uid: 'api::admin-quality-matrix.admin-quality-matrix-entry',
  modelName: 'admin-quality-matrix-entry',
  globalId: 'AdminQualityMatrixEntry',
  info: {
    singularName: 'admin-quality-matrix-entry',
    pluralName: 'admin-quality-matrix-entries',
    displayName: 'Admin Quality Matrix Entry',
  },
  options: {
    draftAndPublish: false,
  },
  attributes: {
    entryId: {
      type: 'string',
      required: true,
      unique: true,
    },
    domain: {
      type: 'string',
      required: true,
    },
    need: {
      type: 'text',
      required: true,
    },
    acceptanceCriteria: {
      type: 'json',
    },
    sourceRefs: {
      type: 'json',
    },
    impactRules: {
      type: 'json',
    },
    confidence: {
      type: 'enumeration',
      enum: matrixConfidence,
      required: true,
      default: 'medium',
    },
    lastDiscoveredAt: {
      type: 'date',
    },
    summaryStatus: {
      type: 'enumeration',
      enum: matrixStatus,
      required: true,
      default: 'non',
    },
    businessStatus: {
      type: 'enumeration',
      enum: matrixStatus,
      required: true,
      default: 'non',
    },
    implementationStatus: {
      type: 'enumeration',
      enum: matrixStatus,
      required: true,
      default: 'non',
    },
    e2eStatus: {
      type: 'enumeration',
      enum: matrixStatus,
      required: true,
      default: 'non',
    },
    priority: {
      type: 'enumeration',
      enum: matrixPriority,
      required: true,
      default: 'moyenne',
    },
    managementBucket: {
      type: 'enumeration',
      enum: matrixBucket,
      required: true,
      default: 'proof-gap',
    },
    needsProductWorkFirst: {
      type: 'boolean',
      default: false,
      required: true,
    },
    observedGap: {
      type: 'text',
    },
    nextMove: {
      type: 'text',
    },
    evidence: {
      type: 'json',
    },
    reviewedAt: {
      type: 'date',
      required: true,
    },
    lastRepoSignalAt: {
      type: 'datetime',
    },
    lastRepoSignalCommit: {
      type: 'string',
    },
    lastRepoSignalSource: {
      type: 'string',
    },
    lastRepoSignalSummary: {
      type: 'text',
    },
    lastRecalculationAt: {
      type: 'datetime',
    },
    lastRecalculationScope: {
      type: 'string',
    },
    lastRecalculationAutomatic: {
      type: 'boolean',
      default: false,
    },
    lastRecalculationResult: {
      type: 'string',
    },
    lastRecalculationPlan: {
      type: 'json',
    },
    lastAppliedProposal: {
      type: 'json',
    },
    editHistory: {
      type: 'json',
    },
    agentObservedGap: {
      type: 'text',
    },
    agentNextMove: {
      type: 'text',
    },
    agentNarrativeGeneratedAt: {
      type: 'datetime',
    },
    agentNarrativeModel: {
      type: 'string',
    },
  },
} as unknown as Struct.CollectionTypeSchema;

export default schema;
