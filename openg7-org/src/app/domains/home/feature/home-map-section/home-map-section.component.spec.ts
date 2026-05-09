import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FiltersService } from '@app/core/filters.service';
import { MapGeojsonService, MapFlowFeatureCollection, MapHubFeatureCollection, MapProvinceFeatureCollection } from '@app/core/services/map-geojson.service';
import { selectFilteredFlows, selectMapKpis, selectMapReady } from '@app/state';
import { selectSectors } from '@app/state/catalog/catalog.selectors';
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
      imports: [HomeMapSectionComponent, TranslateModule.forRoot(), RouterTestingModule],
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
            {
              selector: selectFilteredFlows,
              value: [
                {
                  id: 'flow-energy',
                  sectorId: 'energy',
                  value: 1_520_000_000,
                  currency: 'CAD',
                },
                {
                  id: 'flow-agri',
                  sectorId: 'agri-food',
                  value: 2_300_000_000,
                  currency: 'CAD',
                },
              ],
            },
            { selector: selectUserProfile, value: null },
            {
              selector: selectSectors,
              value: [
                { id: 'energy', name: 'Energy' },
                { id: 'agri-food', name: 'Agri-food' },
              ],
            },
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
            decision: {
              kicker: 'Decision rail',
              title: 'Open the downstream request feed',
              description: 'Select a sector from the map to highlight it and pass the context into the feed.',
              prompt: 'Select a mapped sector to activate the downstream context.',
              empty: 'No map drilldowns available.',
              selected: 'Selected sector',
              mappedValue: 'Mapped value',
              mappedFlows: 'Mapped flows',
              openFeed: 'Open request feed',
            },
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
    expect(fixture.nativeElement.querySelector('og7-home-openlayers-map [data-og7="trade-map"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('og7-home-openlayers-map [data-og7="map-overlay"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('og7-home-openlayers-map [data-og7="map-sector-rail"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('og7-home-openlayers-map [data-og7="map-cinematic-status"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('og7-home-openlayers-map [data-og7="map-corridor-card"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('og7-home-openlayers-map [data-og7="map-corridor-beat"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('og7-home-openlayers-map [data-og7="map-corridor-downstream"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('og7-home-openlayers-map [data-og7="action"][data-og7-id="map-open-corridor-feed"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('og7-home-openlayers-map [data-og7="map-hub-prompt"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7="map-decision-panel"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7="map-drilldown"][data-og7-id="energy"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7="map-drilldown"][data-og7-id="agri-food"]')).toBeTruthy();
  });
});
