import type { Core, Modules } from '@strapi/strapi';

const deepPopulate =
  'deep' as unknown as Modules.EntityService.Params.Populate.Any<'api::homepage.homepage'>;

interface PreviewQuery {
  secret?: string;
  locale?: string;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async preview(ctx) {
    const query = (ctx.request?.query ?? {}) as PreviewQuery;
    const secret = typeof query.secret === 'string' ? query.secret : undefined;

    if (!secret || secret !== process.env.PREVIEW_TOKEN) {
      return ctx.unauthorized();
    }

    const locale = typeof query.locale === 'string' ? query.locale : undefined;

    const homepage = await strapi.entityService.findMany('api::homepage.homepage', {
      publicationState: 'preview',
      populate: deepPopulate,
      ...(locale ? { locale } : {}),
    });

    ctx.body = { data: homepage ?? null };
  },
});
