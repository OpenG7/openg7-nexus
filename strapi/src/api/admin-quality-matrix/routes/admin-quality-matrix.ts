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
      method: 'GET',
      path: '/admin/quality/matrix/proposals',
      handler: 'admin-quality-matrix.listNeedProposals',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
    {
      method: 'PATCH',
      path: '/admin/quality/matrix/proposals/:proposalId',
      handler: 'admin-quality-matrix.patchNeedProposal',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
    {
      method: 'POST',
      path: '/admin/quality/matrix/proposals/ingest',
      handler: 'admin-quality-matrix.ingestNeedProposals',
      config: {
        auth: false,
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
    {
      method: 'GET',
      path: '/admin/quality/matrix/export',
      handler: 'admin-quality-matrix.exportMatrix',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
    {
      method: 'PATCH',
      path: '/admin/quality/matrix/entries/:entryId',
      handler: 'admin-quality-matrix.editMatrixEntry',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
    {
      method: 'POST',
      path: '/admin/quality/matrix/entries/:entryId/agent-suggest',
      handler: 'admin-quality-matrix.agentSuggestNarrative',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
    {
      method: 'POST',
      path: '/admin/quality/matrix/chat',
      handler: 'admin-quality-matrix.chatWithAgent',
      config: {
        policies: ['global::owner-admin-ops'],
      },
    },
  ],
};
