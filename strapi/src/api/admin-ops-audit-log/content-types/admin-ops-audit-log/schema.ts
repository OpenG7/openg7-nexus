import type { Struct } from '@strapi/strapi';

const auditCategories = [
  'import',
  'security',
  'ai',
  'backup',
  'admin-quality',
  'governance',
] as const;
const auditEyebrows = [
  'Import',
  'Security',
  'AI',
  'Backup',
  'Admin quality',
  'Governance',
] as const;
const auditSeverities = ['ready', 'warning', 'offline'] as const;

const schema = {
  kind: 'collectionType',
  collectionName: 'admin_ops_audit_logs',
  modelType: 'contentType',
  uid: 'api::admin-ops-audit-log.admin-ops-audit-log',
  modelName: 'admin-ops-audit-log',
  globalId: 'AdminOpsAuditLog',
  info: {
    singularName: 'admin-ops-audit-log',
    pluralName: 'admin-ops-audit-logs',
    displayName: 'Admin Ops Audit Log',
  },
  options: {
    draftAndPublish: false,
  },
  attributes: {
    eventId: {
      type: 'string',
      required: true,
      unique: true,
    },
    category: {
      type: 'enumeration',
      enum: auditCategories,
      required: true,
    },
    action: {
      type: 'string',
      required: true,
    },
    eyebrow: {
      type: 'enumeration',
      enum: auditEyebrows,
      required: true,
    },
    title: {
      type: 'string',
      required: true,
    },
    summary: {
      type: 'text',
      required: true,
    },
    occurredAt: {
      type: 'datetime',
      required: true,
    },
    sourceRoute: {
      type: 'string',
      required: true,
    },
    severity: {
      type: 'enumeration',
      enum: auditSeverities,
      required: true,
      default: 'ready',
    },
    actor: {
      type: 'string',
    },
    actorId: {
      type: 'string',
    },
    target: {
      type: 'string',
    },
    targetId: {
      type: 'string',
    },
    correlationId: {
      type: 'string',
    },
    idempotencyKey: {
      type: 'string',
    },
    ipHash: {
      type: 'string',
      private: true,
    },
    userAgentHash: {
      type: 'string',
      private: true,
    },
    metadata: {
      type: 'json',
    },
    schemaVersion: {
      type: 'integer',
      required: true,
      default: 1,
    },
    policyVersion: {
      type: 'string',
    },
    locale: {
      type: 'string',
    },
    timezone: {
      type: 'string',
    },
    retentionUntil: {
      type: 'datetime',
    },
  },
} as unknown as Struct.CollectionTypeSchema;

export default schema;
