export default {
  routes: [
    {
      method: 'POST',
      path: '/import/companies',
      handler: 'company-import.importCompanies',
      config: {},
    },
    {
      method: 'POST',
      path: '/import/companies/bulk-import',
      handler: 'company-import-bulk.start',
      config: {},
    },
    {
      method: 'GET',
      path: '/import/companies/jobs/:jobId',
      handler: 'company-import-bulk.status',
      config: {},
    },
    {
      method: 'POST',
      path: '/import/companies/jobs/:jobId/cancel',
      handler: 'company-import-bulk.cancel',
      config: {},
    },
    {
      method: 'GET',
      path: '/import/companies/jobs/:jobId/report',
      handler: 'company-import-bulk.report',
      config: {},
    },
    {
      method: 'GET',
      path: '/import/companies/jobs/:jobId/errors',
      handler: 'company-import-bulk.errors',
      config: {},
    },
    {
      method: 'GET',
      path: '/import/companies/jobs/:jobId/events',
      handler: 'company-import-bulk.events',
      config: {},
    },
  ],
};
