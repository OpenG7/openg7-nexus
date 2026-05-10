export default {
  routes: [
    {
      method: 'GET',
      path: '/users/me/opportunity-offers',
      handler: 'opportunity-offer.me',
      config: {},
    },
    {
      method: 'POST',
      path: '/users/me/opportunity-offers',
      handler: 'opportunity-offer.createMe',
      config: {},
    },
  ],
};
