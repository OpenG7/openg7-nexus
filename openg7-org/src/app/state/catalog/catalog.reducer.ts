import { createReducer, on } from '@ngrx/store';

import { CatalogActions } from './catalog.actions';
import { CatalogSources, CatalogState } from './catalog.selectors';

export const initialCatalogState: CatalogState = {
  sectors: [],
  provinces: [],
  companies: [],
  feedItems: [],
  sources: {
    sectors: 'real',
    provinces: 'real',
    companies: 'real',
    feedItems: 'real',
  },
};

export const catalogReducer = createReducer(
  initialCatalogState,
  on(
    CatalogActions.catalogHydrated,
    (state, { sectors, provinces, companies, feedItems, source, sources }) => ({
      ...state,
      sectors,
      provinces,
      companies,
      feedItems: feedItems ?? state.feedItems,
      sources: resolveSources(state.sources, source, sources),
    }),
  ),
  on(CatalogActions.catalogMockLoaded, (state, { sectors, provinces, companies, feedItems }) => ({
    ...state,
    sectors,
    provinces,
    companies,
    feedItems,
    sources: {
      sectors: 'mock',
      provinces: 'mock',
      companies: 'mock',
      feedItems: 'mock',
    },
  })),
  on(CatalogActions.sectorsUpdated, (state, { sectors }) => ({
    ...state,
    sectors,
  })),
  on(CatalogActions.provincesUpdated, (state, { provinces }) => ({
    ...state,
    provinces,
  })),
  on(CatalogActions.companiesUpdated, (state, { companies }) => ({
    ...state,
    companies,
  })),
  on(CatalogActions.catalogCleared, () => ({ ...initialCatalogState })),
);

function resolveSources(
  current: CatalogSources,
  source?: CatalogSources[keyof CatalogSources],
  sources?: Partial<CatalogSources>,
): CatalogSources {
  if (source) {
    return {
      sectors: source,
      provinces: source,
      companies: source,
      feedItems: source,
    };
  }
  return {
    ...current,
    ...(sources ?? {}),
  };
}
