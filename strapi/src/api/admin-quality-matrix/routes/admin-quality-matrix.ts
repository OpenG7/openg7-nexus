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
  ],
};