import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { FiltersService } from '@app/core/filters.service';
import {
  MapFlowFeatureCollection,
  MapGeojsonService,
  MapHubFeatureCollection,
  MapProvinceFeatureCollection,
} from '@app/core/services/map-geojson.service';
import { TariffQueryService } from '@app/core/services/tariff-query.service';
import { MapActions, selectFilteredFlows, selectMapKpis, selectMapReady } from '@app/state';
import { selectUserProfile } from '@app/state/user/user.selectors';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { TradeMapComponent } from './trade-map.component';

class MapGeojsonServiceStub {
  provinceCollection = signal<MapProvinceFeatureCollection>({
    type: 'FeatureCollection',
    features: [],
  });

  flowCollection = signal<MapFlowFeatureCollection>({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'flow-energy',
        geometry: {
          type: 'LineString',
          coordinates: [
            [-123.12, 49.28],
            [-79.38, 43.65],
          ],
        },
        properties: {
          id: 'flow-energy',
          layer: 'flow',
          sectorId: 'energy',
          tradeMode: 'export',
          value: 1_520_000_000,
        },
      },
      {
        type: 'Feature',
        id: 'flow-agri',
        geometry: {
          type: 'LineString',
          coordinates: [
            [-97.14, 49.89],
            [-73.56, 45.5],
          ],
        },
        properties: {
          id: 'flow-agri',
          layer: 'flow',
          sectorId: 'agri-food',
          tradeMode: 'import',
          value: 2_300_000_000,
        },
      },
    ],
  });

  hubCollection = signal<MapHubFeatureCollection>({
    type: 'FeatureCollection',
    features: [],
  });
}

class TariffQueryServiceStub {
  readonly filteredTariffs = computed(() => []);
}

describe('TradeMapComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TradeMapComponent, TranslateModule.forRoot(), RouterTestingModule],
      providers: [
        FiltersService,
        { provide: MapGeojsonService, useClass: MapGeojsonServiceStub },
        { provide: TariffQueryService, useClass: TariffQueryServiceStub },
        provideMockStore({
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
                  tradeMode: 'export',
                },
                {
                  id: 'flow-agri',
                  sectorId: 'agri-food',
                  value: 2_300_000_000,
                  currency: 'CAD',
                  tradeMode: 'import',
                },
              ],
            },
            { selector: selectUserProfile, value: null },
            {
              selector: selectMapKpis,
              value: {
                default: {
                  tradeValue: 0,
                  tradeValueCurrency: 'CAD',
                  tradeVolume: 0,
                  tradeVolumeUnit: null,
                  sectorCount: 0,
                },
              },
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
            decision: {
              selected: 'Selected sector',
              mappedValue: 'Mapped value',
            },
          },
        },
        map: {
          filters: {
            tradeMode: {
              label: 'Trade mode',
              export: 'Export',
              import: 'Import',
            },
          },
        },
      },
      true,
    );
    translate.use('en');
  });

  it('reveals in-map context on hover and selects a sector on click', () => {
    const fixture = TestBed.createComponent(TradeMapComponent);
    const component = fixture.componentInstance as any;
    const filters = TestBed.inject(FiltersService);
    const store = TestBed.inject(MockStore);

    fixture.detectChanges();

    component.handleFlowMouseMove({
      features: [{ properties: { id: 'flow-energy' } }],
    });
    fixture.detectChanges();

    expect(component.activeFlowContext()).toEqual(
      jasmine.objectContaining({
        id: 'flow-energy',
        sectorLabel: 'Energy',
        tradeMode: 'export',
      }),
    );
    expect(fixture.nativeElement.querySelector('[data-og7="map-flow-context"]')).toBeTruthy();

    const dispatchSpy = spyOn(store, 'dispatch').and.callThrough();
    component.handleFlowClick({
      features: [{ properties: { id: 'flow-energy', sectorId: 'energy', tradeMode: 'export' } }],
    });

    expect(filters.activeSector()).toBe('energy');
    expect(dispatchSpy).toHaveBeenCalledWith(MapActions.activeSectorSelected({ sectorId: 'energy' }));
    expect(component.activeFlowContext()).toEqual(
      jasmine.objectContaining({
        id: 'flow-energy',
        pinned: true,
        sectorId: 'energy',
      }),
    );
  });

  it('opens the feed from a pinned corridor and clears the pin on second click', async () => {
    const fixture = TestBed.createComponent(TradeMapComponent);
    const component = fixture.componentInstance as any;
    const filters = TestBed.inject(FiltersService);
    const store = TestBed.inject(MockStore);
    const router = TestBed.inject(Router);

    fixture.detectChanges();

    const dispatchSpy = spyOn(store, 'dispatch').and.callThrough();
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    const flowEvent = {
      features: [{ properties: { id: 'flow-energy', sectorId: 'energy', tradeMode: 'export' } }],
    };

    component.handleFlowClick(flowEvent);
    fixture.detectChanges();

    component.openPinnedFlowContext();

    expect(navigateSpy).toHaveBeenCalledWith(['/feed'], {
      queryParams: {
        source: 'trade-map',
        sector: 'energy',
        corridorId: 'flow-energy',
        partner: null,
      },
    });

    component.handleFlowClick(flowEvent);
    fixture.detectChanges();

    expect(filters.activeSector()).toBeNull();
    expect(component.hasPinnedFlow()).toBeFalse();
    expect(dispatchSpy).toHaveBeenCalledWith(MapActions.activeSectorSelected({ sectorId: null }));
  });

  it('reframes highlighted flows and returns to the default camera when the sector is cleared', () => {
    const fixture = TestBed.createComponent(TradeMapComponent);
    const component = fixture.componentInstance as any;
    const filters = TestBed.inject(FiltersService);
    const mapApi = {
      fitBounds: jasmine.createSpy('fitBounds'),
      easeTo: jasmine.createSpy('easeTo'),
    };

    fixture.detectChanges();
    component.onMapLoad(mapApi);

    filters.activeSector.set('energy' as any);
    fixture.detectChanges();

    expect(mapApi.fitBounds).toHaveBeenCalledWith(
      [[-123.12, 43.65], [-79.38, 49.28]],
      jasmine.objectContaining({ padding: 80, duration: 800, maxZoom: 4.4 }),
    );

    filters.activeSector.set(null);
    fixture.detectChanges();

    expect(mapApi.easeTo).toHaveBeenCalledWith(
      jasmine.objectContaining({
        center: [-98.5795, 57.6443],
        zoom: 2.35,
        duration: 600,
      }),
    );
  });
});