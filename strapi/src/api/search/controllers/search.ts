import type { Context } from 'koa';

import { performSearch } from '../../../services/search.service';

type QueryType = 'companies' | 'exchanges' | 'all';

interface SearchQuery {
  q?: string;
  query?: string;
  locale?: string;
  limit?: string | number;
  type?: string;
}

const parseLimit = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
};

const parseType = (value: unknown): QueryType => {
  if (typeof value !== 'string') {
    return 'all';
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'companies' || normalized === 'exchanges') {
    return normalized;
  }
  return 'all';
};

const controller = () => ({
  async index(ctx: Context) {
    const query = (ctx.request.query ?? {}) as SearchQuery;
    const rawQuery =
      typeof query.q === 'string' ? query.q : typeof query.query === 'string' ? query.query : '';
    const locale = typeof query.locale === 'string' ? query.locale : null;
    const limit = parseLimit(query.limit);
    const type = parseType(query.type);

    const result = await performSearch(rawQuery, { limit, locale, type });

    ctx.body = result;
    ctx.set('Cache-Control', 'no-store');
  },
});

export default controller;
