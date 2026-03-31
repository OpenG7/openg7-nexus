export default {
  routes: [
    {
      method: 'GET',
      path: '/hydrocarbon-signals',
      handler: 'hydrocarbon-signal.find',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/hydrocarbon-signals/:id',
      handler: 'hydrocarbon-signal.findOne',
      config: {
        auth: false,
      },
    },
  ],
};