export default {
  routes: [
    {
      method: 'GET',
      path: '/admin/quality/matrix',
      handler: 'admin-quality-matrix.snapshot',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
    {
      method: 'POST',
      path: '/admin/quality/matrix/recalculate',
      handler: 'admin-quality-matrix.recalculate',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
    {
      method: 'POST',
      path: '/admin/quality/matrix/apply-proposal',
      handler: 'admin-quality-matrix.applyProposal',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
    {
      method: 'POST',
      path: '/admin/quality/matrix/ingest',
      handler: 'admin-quality-matrix.ingest',
      config: {
        auth: false,
      },
    },
  ],
};
