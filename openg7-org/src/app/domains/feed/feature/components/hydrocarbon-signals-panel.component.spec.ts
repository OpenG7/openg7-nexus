import { TestBed } from '@angular/core/testing';
import { StrapiClient } from '@app/core/api/strapi-client';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { HydrocarbonSignalsPanelComponent } from './hydrocarbon-signals-panel.component';

class StrapiClientMock {
  readonly hydrocarbonSignals = jasmine.createSpy('hydrocarbonSignals').and.resolveTo({ data: [], meta: {} });
}

describe('HydrocarbonSignalsPanelComponent', () => {
  let strapiClient: StrapiClientMock;

  beforeEach(async () => {
    strapiClient = new StrapiClientMock();

    await TestBed.configureTestingModule({
      imports: [HydrocarbonSignalsPanelComponent, TranslateModule.forRoot()],
      providers: [{ provide: StrapiClient, useValue: strapiClient }],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      'en',
      {
        feed: {
          views: {
            hydrocarbons: {
              panel: {
                title: 'Structured signals',
                kicker: 'AB feed',
                description: 'Panel description',
                loading: 'Loading hydrocarbon signals...',
                empty: 'No structured hydrocarbon signals match the current filters.',
                error: 'Hydrocarbon signals are temporarily unavailable.',
                publicationType: {
                  surplus: 'Surplus',
                  slowdown: 'Slowdown',
                },
              },
            },
          },
        },
      },
      true
    );
    translate.use('en');
  });

  it('loads signals from the typed Strapi client and renders them', async () => {
    strapiClient.hydrocarbonSignals.and.resolveTo({
      data: [
        {
          id: 'signal-1',
          feedItemId: 'feed-1',
          title: '48,000 barrels available after Edmonton storage build-up',
          summary: 'Northern Prairie Energy can release a short surplus window.',
          companyName: 'Northern Prairie Energy',
          publicationType: 'surplus',
          productType: 'crudeOil',
          businessReason: 'surplusStock',
          volumeBarrels: 48000,
          quantityUnit: 'bbl',
          minimumLotBarrels: 12000,
          availableFrom: '2026-02-01',
          availableUntil: '2026-02-12',
          estimatedDelayDays: null,
          originProvinceId: 'ab',
          targetProvinceId: 'bc',
          originSite: 'Edmonton terminal cluster',
          qualityGrade: 'wcs',
          logisticsMode: ['rail'],
          targetScope: ['bc'],
          storagePressureLevel: 'high',
          priceReference: 'WCS less rail differential',
          responseDeadline: null,
          contactChannel: 'Crude desk',
          notes: null,
          tags: ['hydrocarbon'],
          sourceKind: 'COMPANY',
          sourceLabel: 'Northern Prairie Energy',
          status: 'active',
        },
      ],
      meta: {},
    });

    const fixture = TestBed.createComponent(HydrocarbonSignalsPanelComponent);
    fixture.componentRef.setInput('limit', 3);
    fixture.componentRef.setInput('originProvinceId', 'ab');
    fixture.componentRef.setInput('targetProvinceId', null);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(strapiClient.hydrocarbonSignals).toHaveBeenCalledWith({
      limit: 3,
      originProvinceId: 'ab',
      targetProvinceId: null,
    });
    expect(fixture.nativeElement.querySelector('[data-og7="hydrocarbon-signals-panel"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('48,000 barrels available after Edmonton storage build-up');
  });
});