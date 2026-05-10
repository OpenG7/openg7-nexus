import { factories } from '@strapi/strapi';

interface StatisticsQuery {
  scope?: string;
  intrant?: string;
  period?: string;
  province?: string;
}

export default factories.createCoreController(
  'api::statistic-insight.statistic-insight',
  ({ strapi }) => ({
    async find(ctx) {
      const { scope, intrant, period, province } = (ctx.query ?? {}) as StatisticsQuery;
      const payload = await strapi.service('api::statistics.statistics').fetch({
        scope,
        intrant,
        period,
        province,
      });
      ctx.body = payload;
    },
  }),
);
