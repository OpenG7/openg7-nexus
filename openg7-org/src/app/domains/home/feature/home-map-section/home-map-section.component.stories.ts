import { signal } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { FiltersService } from '@app/core/filters.service';
import { provideStorybookEnTranslations } from '@app/core/i18n/storybook-translate.providers';
import {
  MapGeojsonService,
  MapFlowFeatureCollection,
  MapHubFeatureCollection,
  MapProvinceFeatureCollection,
} from '@app/core/services/map-geojson.service';
import { selectFilteredFlows, selectMapKpis, selectMapReady } from '@app/state';
import { selectSectors } from '@app/state/catalog/catalog.selectors';
import { provideMockStore } from '@ngrx/store/testing';
import { TranslateModule } from '@ngx-translate/core';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';

import { HomeMapSectionComponent } from './home-map-section.component';

class StoryMapGeojsonService {
  provinceCollection = signal<MapProvinceFeatureCollection>({
    type: 'FeatureCollection',
    features: [],
  });
  flowCollection = signal<MapFlowFeatureCollection>({ type: 'FeatureCollection', features: [] });
  hubCollection = signal<MapHubFeatureCollection>({ type: 'FeatureCollection', features: [] });
}

const meta: Meta<HomeMapSectionComponent> = {
  title: 'Features/Home/MapSection',
  component: HomeMapSectionComponent,
  decorators: [
    moduleMetadata({
      imports: [TranslateModule.forRoot(), RouterTestingModule],
      providers: [
        FiltersService,
        ...provideStorybookEnTranslations(),
        { provide: MapGeojsonService, useClass: StoryMapGeojsonService },
        provideMockStore({
          selectors: [
            { selector: selectMapReady, value: true },
            {
              selector: selectFilteredFlows,
              value: [
                { id: 'flow-agri', sectorId: 'agri-food', value: 2_300_000_000, currency: 'CAD' },
                { id: 'flow-energy', sectorId: 'energy', value: 1_520_000_000, currency: 'CAD' },
                {
                  id: 'flow-digital',
                  sectorId: 'digital-services',
                  value: 860_000_000,
                  currency: 'CAD',
                },
              ],
            },
            {
              selector: selectSectors,
              value: [
                { id: 'agri-food', name: 'Agri-food' },
                { id: 'energy', name: 'Energy' },
                { id: 'digital-services', name: 'Digital services' },
              ],
            },
            { selector: selectMapKpis, value: { default: {} } },
          ],
        }),
      ],
    }),
  ],
};

export default meta;

export const Default: StoryObj<HomeMapSectionComponent> = {
  render: () => ({ props: {} }),
};
