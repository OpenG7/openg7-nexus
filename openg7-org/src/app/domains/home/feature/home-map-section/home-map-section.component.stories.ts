import { signal } from '@angular/core';
import { FiltersService } from '@app/core/filters.service';
import { provideStorybookEnTranslations } from '@app/core/i18n/storybook-translate.providers';
import { MapGeojsonService, MapFlowFeatureCollection, MapHubFeatureCollection, MapProvinceFeatureCollection } from '@app/core/services/map-geojson.service';
import { selectFilteredFlows, selectMapKpis, selectMapReady } from '@app/state';
import { provideMockStore } from '@ngrx/store/testing';
import { TranslateModule } from '@ngx-translate/core';
import { moduleMetadata } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';

import { HomeMapSectionComponent } from './home-map-section.component';

class StoryMapGeojsonService {
  provinceCollection = signal<MapProvinceFeatureCollection>({ type: 'FeatureCollection', features: [] });
  flowCollection = signal<MapFlowFeatureCollection>({ type: 'FeatureCollection', features: [] });
  hubCollection = signal<MapHubFeatureCollection>({ type: 'FeatureCollection', features: [] });
}

const meta: Meta<HomeMapSectionComponent> = {
  title: 'Features/Home/MapSection',
  component: HomeMapSectionComponent,
  decorators: [
    moduleMetadata({
      imports: [TranslateModule.forRoot()],
      providers: [
        FiltersService,
        ...provideStorybookEnTranslations(),
        { provide: MapGeojsonService, useClass: StoryMapGeojsonService },
        provideMockStore({
          selectors: [
            { selector: selectMapReady, value: true },
            { selector: selectFilteredFlows, value: [] },
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
