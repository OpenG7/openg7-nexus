export default {
  routes: [
    {
      method: 'GET',
      path: '/projects',
      handler: 'national-project.find',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/projects/:id',
      handler: 'national-project.findOne',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/projects',
      handler: 'national-project.create',
      config: {},
    },
    {
      method: 'PUT',
      path: '/projects/:id',
      handler: 'national-project.update',
      config: {},
    },
    {
      method: 'DELETE',
      path: '/projects/:id',
      handler: 'national-project.delete',
      config: {},
    },
  ],
};
