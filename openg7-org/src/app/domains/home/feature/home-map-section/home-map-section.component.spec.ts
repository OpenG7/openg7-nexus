import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FiltersService } from '@app/core/filters.service';
import { MapGeojsonService, MapFlowFeatureCollection, MapHubFeatureCollection, MapProvinceFeatureCollection } from '@app/core/services/map-geojson.service';
import { selectFilteredFlows, selectMapKpis, selectMapReady } from '@app/state';
import { selectUserProfile } from '@app/state/user/user.selectors';
import { provideMockStore } from '@ngrx/store/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { HomeMapSectionComponent } from './home-map-section.component';


class MapGeojsonServiceStub {
  provinceCollection = signal<MapProvinceFeatureCollection>({ type: 'FeatureCollection', features: [] });
  flowCollection = signal<MapFlowFeatureCollection>({ type: 'FeatureCollection', features: [] });
  hubCollection = signal<MapHubFeatureCollection>({ type: 'FeatureCollection', features: [] });
}

describe('HomeMapSectionComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomeMapSectionComponent, TranslateModule.forRoot()],
      providers: [
        FiltersService,
        { provide: MapGeojsonService, useClass: MapGeojsonServiceStub },
        provideMockStore({
          initialState: {
            user: {
              profile: null,
              permissions: [],
            },
          },
          selectors: [
            { selector: selectMapReady, value: true },
            { selector: selectFilteredFlows, value: [] },
            { selector: selectUserProfile, value: null },
            {
              selector: selectMapKpis,
              value: { default: { tradeValue: 0, tradeValueCurrency: 'CAD', tradeVolume: 0, tradeVolumeUnit: null, sectorCount: 0 } },
            },
          ],
        }),
      ],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      'en',
      {
        home: {
          map: {
            kicker: 'Trade map',
            title: 'Navigate',
            description: 'Explore exchanges',
          },
        },
        map: {
          badges: { units: { transactions: 'transactions' } },
        },
      },
      true,
    );
    translate.use('en');
  });

  it('renders map section with heading and trade map container', () => {
    const fixture = TestBed.createComponent(HomeMapSectionComponent);
    fixture.detectChanges();

    const section: HTMLElement | null = fixture.nativeElement.querySelector('[data-og7="home-map"]');
    expect(section).toBeTruthy();
    expect(section?.getAttribute('id')).toBe('map');
    const heading: HTMLElement | null = fixture.nativeElement.querySelector('#home-map-heading');
    expect(heading?.textContent).toContain('Navigate');
    expect(fixture.nativeElement.querySelector('og7-map-trade[data-og7="trade-map"]')).toBeTruthy();
  });
});
