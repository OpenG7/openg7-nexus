import type { Struct } from '@strapi/strapi';

const schema = {
  kind: 'collectionType',
  collectionName: 'companies',
  modelType: 'contentType',
  uid: 'api::company.company',
  modelName: 'company',
  globalId: 'Company',
  info: {
    singularName: 'company',
    pluralName: 'companies',
    displayName: 'Company',
  },
  options: {
    draftAndPublish: true,
  },
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    businessId: {
      type: 'string',
      unique: true,
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
    name: {
      type: 'string',
    },
    slug: {
      type: 'uid',
      targetField: 'name',
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
    description: {
      type: 'text',
    },
    website: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
    country: {
      type: 'enumeration',
      enum: ['CA', 'DE', 'FR', 'IT', 'JP', 'UK', 'US'],
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
    sector: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::sector.sector',
    },
    province: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::province.province',
    },
    status: {
      type: 'enumeration',
      enum: ['pending', 'approved', 'suspended'],
      default: 'pending',
      required: true,
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
    capacities: {
      type: 'json',
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
    verificationStatus: {
      type: 'enumeration',
      enum: ['unverified', 'pending', 'verified', 'correctionRequested', 'rejected', 'suspended'],
      default: 'unverified',
      required: true,
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
    verificationSources: {
      type: 'component',
      repeatable: true,
      component: 'company.verification-source',
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
    trustHistory: {
      type: 'component',
      repeatable: true,
      component: 'company.trust-record',
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
    trustScore: {
      type: 'decimal',
      default: 0,
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
    logoUrl: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
    secondaryLogoUrl: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
    importMetadata: {
      type: 'json',
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
  },
} satisfies Struct.CollectionTypeSchema;

export default schema;
