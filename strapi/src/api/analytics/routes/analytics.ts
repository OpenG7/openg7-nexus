export default {
  routes: [
    {
      method: 'POST',
      path: '/analytics/events',
      handler: 'analytics.events',
      config: {
        auth: false,
      },
    },
  ],
};
