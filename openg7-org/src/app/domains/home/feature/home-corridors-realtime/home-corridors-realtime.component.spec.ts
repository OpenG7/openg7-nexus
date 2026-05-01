import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import {
  CorridorsRealtimeSnapshot,
  HomeCorridorsRealtimeService,
} from '@app/domains/home/services/home-corridors-realtime.service';

import { HomeCorridorsRealtimeComponent } from './home-corridors-realtime.component';

const SNAPSHOT: CorridorsRealtimeSnapshot = {
  titleKey: 'home.corridorsRealtime.title',
  items: [
    {
      id: 'essential-services',
      labelKey: 'home.corridorsRealtime.items.essentialServices',
      routeKey: 'home.corridorsRealtime.items.qcOn',
    },
  ],
  status: {
    level: 'warning',
    labelKey: 'home.corridorsRealtime.status.capacityReached',
  },
  cta: {
    labelKey: 'home.corridorsRealtime.cta.viewMap',
  },
};

class HomeCorridorsRealtimeServiceMock {
  readonly loadSnapshot = jasmine.createSpy('loadSnapshot').and.returnValue(of(SNAPSHOT));
}

describe('HomeCorridorsRealtimeComponent', () => {
  let service: HomeCorridorsRealtimeServiceMock;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    service = new HomeCorridorsRealtimeServiceMock();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [HomeCorridorsRealtimeComponent, TranslateModule.forRoot()],
      providers: [
        { provide: HomeCorridorsRealtimeService, useValue: service },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
  });

  it('renders the explicit priority path for the essential-services corridor', async () => {
    const fixture = TestBed.createComponent(HomeCorridorsRealtimeComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const priorityPath = fixture.nativeElement.querySelector(
      '[data-og7="corridor-priority-path"][data-og7-corridor-id="essential-services"]'
    );

    expect(priorityPath).toBeTruthy();
    expect(priorityPath.querySelector('[data-og7-id="priority-services"]')).toBeTruthy();
    expect(priorityPath.querySelector('[data-og7-id="priority-sector"]')).toBeTruthy();
    expect(priorityPath.querySelector('[data-og7-id="priority-dependencies"]')).toBeTruthy();
    expect(priorityPath.querySelector('[data-og7-id="priority-capacity"]')).toBeTruthy();
  });

  it('navigates to the priority indicator detail path from the dedicated CTA', async () => {
    const fixture = TestBed.createComponent(HomeCorridorsRealtimeComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const action = fixture.nativeElement.querySelector('[data-og7-id="open-priority-path"]') as HTMLButtonElement;
    action.click();

    expect(router.navigate).toHaveBeenCalledWith(['/feed', 'indicators', 'indicator-001'], {
      queryParams: {
        source: 'corridors-realtime',
        corridorId: 'essential-services',
      },
    });
  });
});
