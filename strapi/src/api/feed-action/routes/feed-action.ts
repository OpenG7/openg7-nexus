export default {
  routes: [
    {
      method: 'GET',
      path: '/users/me/feed-actions',
      handler: 'feed-action.me',
      config: {},
    },
    {
      method: 'POST',
      path: '/users/me/feed-actions',
      handler: 'feed-action.createMe',
      config: {},
    },
  ],
};
