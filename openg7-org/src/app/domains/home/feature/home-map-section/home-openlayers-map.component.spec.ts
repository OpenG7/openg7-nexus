import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { FiltersService } from '@app/core/filters.service';
import { AnalyticsService } from '@app/core/observability/analytics.service';
import { TranslateModule } from '@ngx-translate/core';

import { HomeOpenlayersMapComponent } from './home-openlayers-map.component';

describe('HomeOpenlayersMapComponent', () => {
  let analytics: jasmine.SpyObj<AnalyticsService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['emit']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [HomeOpenlayersMapComponent, TranslateModule.forRoot()],
      providers: [
        FiltersService,
        { provide: AnalyticsService, useValue: analytics },
        { provide: Router, useValue: router },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    }).compileComponents();
  });

  it('opens the export corridor feed without synthetic decision or destination parameters', () => {
    const fixture = TestBed.createComponent(HomeOpenlayersMapComponent);
    const component = fixture.componentInstance as unknown as {
      pinnedCorridorId: { set(value: string): void };
      openCurrentCorridorFeed(): void;
    };

    component.pinnedCorridorId.set('flow-qc-usne');
    component.openCurrentCorridorFeed();

    expect(router.navigate).toHaveBeenCalledOnceWith(['/feed'], {
      queryParams: {
        source: 'trade-map',
        corridorId: 'flow-qc-usne',
        sector: 'energy',
        type: 'REQUEST',
        fromProvince: 'QC',
        mode: 'EXPORT',
        priority: 'elevated',
      },
    });
    expect(analytics.emit).toHaveBeenCalledWith(
      'map_open_corridor_feed',
      jasmine.objectContaining({
        corridorId: 'flow-qc-usne',
        decisionItemId: null,
        toProvince: null,
        mode: 'EXPORT',
      }),
    );
  });
});
