export default {
  routes: [
    {
      method: 'GET',
      path: '/import-flows',
      handler: 'importation.flows',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/import-commodities',
      handler: 'importation.commodities',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/import-risk-flags',
      handler: 'importation.riskFlags',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/import-suppliers',
      handler: 'importation.suppliers',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/import-knowledge',
      handler: 'importation.knowledge',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/import-annotations',
      handler: 'importation.annotations',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/import-watchlists',
      handler: 'importation.watchlists',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/import-watchlists',
      handler: 'importation.createWatchlist',
      config: {
        auth: false,
      },
    },
    {
      method: 'PUT',
      path: '/import-watchlists/:id',
      handler: 'importation.updateWatchlist',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/import-reports/schedule',
      handler: 'importation.scheduleReport',
      config: {
        auth: false,
      },
    },
  ],
};