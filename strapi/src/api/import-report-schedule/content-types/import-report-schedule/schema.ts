import type { Struct } from '@strapi/strapi';

const schema = {
  kind: 'collectionType',
  collectionName: 'import_report_schedules',
  modelType: 'contentType',
  uid: 'api::import-report-schedule.import-report-schedule',
  modelName: 'import-report-schedule',
  globalId: 'ImportReportSchedule',
  info: {
    singularName: 'import-report-schedule',
    pluralName: 'import-report-schedules',
    displayName: 'Import Report Schedule',
  },
  options: {
    draftAndPublish: false,
  },
  attributes: {
    period: {
      type: 'enumeration',
      enum: ['month', 'quarter', 'year'],
      required: true,
      default: 'month',
    },
    recipients: {
      type: 'json',
      required: true,
    },
    format: {
      type: 'enumeration',
      enum: ['csv', 'json', 'look'],
      required: true,
      default: 'csv',
    },
    frequency: {
      type: 'enumeration',
      enum: ['weekly', 'monthly', 'quarterly'],
      required: true,
      default: 'monthly',
    },
    notes: {
      type: 'text',
    },
    status: {
      type: 'enumeration',
      enum: ['scheduled'],
      required: true,
      default: 'scheduled',
    },
  },
} as unknown as Struct.CollectionTypeSchema;

export default schema;