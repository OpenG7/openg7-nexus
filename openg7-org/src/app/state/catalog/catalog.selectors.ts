import { FeedItem, FeedItemType } from '@app/domains/feed/feature/models/feed.models';
import { createFeatureSelector, createSelector } from '@ngrx/store';

export type CatalogSource = 'real' | 'mock';

export interface CatalogSources {
  sectors: CatalogSource;
  provinces: CatalogSource;
  companies: CatalogSource;
  feedItems: CatalogSource;
}

export interface Sector {
  id: string;
  name: string;
}

export interface Province {
  id: string;
  name: string;
}

export interface Company {
  id: string;
  name: string;
}

export interface CatalogState {
  sectors: Sector[];
  provinces: Province[];
  companies: Company[];
  feedItems: FeedItem[];
  sources: CatalogSources;
}

export const selectCatalogState = createFeatureSelector<CatalogState>('catalog');

export const selectSectors = createSelector(selectCatalogState, (state) => state.sectors);

export const selectProvinces = createSelector(selectCatalogState, (state) => state.provinces);

export const selectCompanies = createSelector(selectCatalogState, (state) => state.companies);

export const selectCatalogFeedItems = createSelector(
  selectCatalogState,
  (state) => state.feedItems,
);

export const selectCatalogSources = createSelector(selectCatalogState, (state) => state.sources);

export const selectCatalogFeedSource = createSelector(
  selectCatalogSources,
  (sources) => sources.feedItems,
);

export const selectCatalogFeedItemsByType = (type: FeedItemType) =>
  createSelector(selectCatalogFeedItems, (items) => items.filter((item) => item.type === type));

export const selectCompanyById = (id: string) =>
  createSelector(selectCompanies, (companies) => companies.find((c) => c.id === id) ?? null);
