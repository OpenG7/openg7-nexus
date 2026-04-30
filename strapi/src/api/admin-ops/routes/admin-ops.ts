export default {
  routes: [
    {
      method: 'GET',
      path: '/admin/ops/health',
      handler: 'admin-ops.health',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
    {
      method: 'GET',
      path: '/admin/ops/backups',
      handler: 'admin-ops.backups',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
    {
      method: 'GET',
      path: '/admin/ops/imports',
      handler: 'admin-ops.imports',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
    {
      method: 'GET',
      path: '/admin/ops/security',
      handler: 'admin-ops.security',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
    {
      method: 'GET',
      path: '/admin/ops/ai/proofs',
      handler: 'admin-ops.proofs',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
    {
      method: 'POST',
      path: '/admin/ops/ai/dispatch',
      handler: 'admin-ops.dispatchCodexWorkflow',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
    {
      method: 'POST',
      path: '/admin/ops/codex/dispatch',
      handler: 'admin-ops.dispatchCodexWorkflow',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
  ],
};
