export default {
  routes: [
    {
      method: 'GET',
      path: '/admin/quality/mission-decisions',
      handler: 'admin-quality-mission-decision.list',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
    {
      method: 'PUT',
      path: '/admin/quality/mission-decisions/:recommendationId',
      handler: 'admin-quality-mission-decision.upsert',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
    {
      method: 'DELETE',
      path: '/admin/quality/mission-decisions/:recommendationId',
      handler: 'admin-quality-mission-decision.delete',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
  ],
};
