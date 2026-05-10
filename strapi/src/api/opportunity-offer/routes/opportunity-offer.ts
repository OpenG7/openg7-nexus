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
    {
      method: 'POST',
      path: '/users/me/opportunity-offer-attachments',
      handler: 'opportunity-offer.uploadAttachment',
      config: {},
    },
  ],
};
