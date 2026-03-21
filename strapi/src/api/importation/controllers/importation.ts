import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';

interface ImportationQuery {
  readonly period?: unknown;
  readonly periodValue?: unknown;
  readonly originScope?: unknown;
  readonly originCodes?: unknown;
  readonly hsSections?: unknown;
  readonly lang?: unknown;
  readonly compareMode?: unknown;
  readonly compareWith?: unknown;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async flows(ctx: Context) {
    const payload = await strapi.service('api::importation.importation').getFlows((ctx.query ?? {}) as ImportationQuery);
    ctx.set('cache-control', 'public, max-age=120');
    ctx.body = payload;
  },

  async commodities(ctx: Context) {
    const payload = await strapi.service('api::importation.importation').getCommodities((ctx.query ?? {}) as ImportationQuery);
    ctx.set('cache-control', 'public, max-age=300');
    ctx.body = payload;
  },

  async riskFlags(ctx: Context) {
    const payload = await strapi.service('api::importation.importation').getRiskFlags((ctx.query ?? {}) as ImportationQuery);
    ctx.set('cache-control', 'public, max-age=300');
    ctx.body = payload;
  },

  async suppliers(ctx: Context) {
    const payload = await strapi.service('api::importation.importation').getSuppliers((ctx.query ?? {}) as ImportationQuery);
    ctx.set('cache-control', 'public, max-age=300');
    ctx.body = payload;
  },

  async knowledge(ctx: Context) {
    const payload = await strapi.service('api::importation.importation').getKnowledge((ctx.query ?? {}) as ImportationQuery);
    ctx.set('cache-control', 'public, max-age=900');
    ctx.body = payload;
  },

  async annotations(ctx: Context) {
    const payload = await strapi.service('api::importation.importation').getAnnotations();
    ctx.set('cache-control', 'public, max-age=120');
    ctx.body = payload;
  },

  async watchlists(ctx: Context) {
    const payload = await strapi.service('api::importation.importation').getWatchlists();
    ctx.set('cache-control', 'no-store');
    ctx.body = payload;
  },

  async createWatchlist(ctx: Context) {
    try {
      const payload = await strapi.service('api::importation.importation').createWatchlist((ctx.request.body ?? {}) as { name?: unknown; filters?: unknown });
      ctx.status = 201;
      ctx.body = payload;
    } catch (error) {
      ctx.badRequest(error instanceof Error ? error.message : 'Unable to create watchlist.');
    }
  },

  async updateWatchlist(ctx: Context) {
    try {
      const payload = await strapi
        .service('api::importation.importation')
        .updateWatchlist(String(ctx.params.id ?? ''), (ctx.request.body ?? {}) as { name?: unknown; filters?: unknown });
      ctx.status = 200;
      ctx.body = payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update watchlist.';
      if (message === 'Watchlist not found.') {
        ctx.notFound(message);
        return;
      }
      ctx.badRequest(message);
    }
  },

  async scheduleReport(ctx: Context) {
    try {
      const payload = await strapi.service('api::importation.importation').scheduleReport((ctx.request.body ?? {}) as ImportationQuery);
      ctx.status = 202;
      ctx.body = payload;
    } catch (error) {
      ctx.badRequest(error instanceof Error ? error.message : 'Unable to schedule report.');
    }
  },
});