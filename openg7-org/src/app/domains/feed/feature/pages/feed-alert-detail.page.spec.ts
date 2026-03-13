import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NotificationStore } from '@app/core/observability/notification.store';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { FeedItem } from '../models/feed.models';
import { AlertUpdateQueueService } from '../services/alert-update-queue.service';
import { FeedRealtimeService } from '../services/feed-realtime.service';

import { FeedAlertDetailPage } from './feed-alert-detail.page';

class FeedRealtimeServiceMock {
  readonly items = signal<readonly FeedItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly connectionState = {
    connected: signal(true).asReadonly(),
    reconnecting: signal(false).asReadonly(),
    error: signal<string | null>(null).asReadonly(),
  };

  readonly findItemById = jasmine.createSpy('findItemById');
}

class StoreMock {
  private readonly provincesSig = signal([
    { id: 'on', name: 'Ontario' },
    { id: 'qc', name: 'Quebec' },
  ]);

  readonly selectSignal = jasmine.createSpy('selectSignal').and.returnValue(this.provincesSig.asReadonly());
}

class AlertUpdateQueueServiceMock {
  readonly queueUpdate = jasmine.createSpy('queueUpdate').and.returnValue({
    id: 'alert-update-1',
    alertId: 'alert-001',
    alertTitle: 'Ice storm risk on Ontario transmission lines',
    route: '/feed/alerts/alert-001',
    reason: 'correction',
    summary: 'Environment Canada raised the icing threshold.',
    sourceUrl: 'https://weather.gc.ca',
    createdAt: '2026-03-10T20:00:00.000Z',
    status: 'pending',
  });
}

function createAlertItem(id: string): FeedItem {
  return {
    id,
    createdAt: '2026-01-20T10:00:00.000Z',
    updatedAt: '2026-01-20T10:05:00.000Z',
    type: 'ALERT',
    sectorId: 'energy',
    title: 'Ice storm risk on Ontario transmission lines',
    summary: 'Ice accretion above 15 mm is expected on key Ontario corridors.',
    fromProvinceId: 'qc',
    toProvinceId: 'on',
    mode: 'BOTH',
    urgency: 3,
    credibility: 2,
    tags: ['ice', 'grid', 'ontario'],
    source: {
      kind: 'GOV',
      label: 'Environment Canada',
    },
  };
}

describe('FeedAlertDetailPage', () => {
  let feed: FeedRealtimeServiceMock;
  let store: StoreMock;
  let alertUpdateQueue: AlertUpdateQueueServiceMock;
  let notifications: { success: jasmine.Spy; error: jasmine.Spy };
  let router: jasmine.SpyObj<Router>;
  let routeParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    feed = new FeedRealtimeServiceMock();
    store = new StoreMock();
    alertUpdateQueue = new AlertUpdateQueueServiceMock();
    notifications = {
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error'),
    };
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'getCurrentNavigation']);
    router.navigate.and.resolveTo(true);
    router.getCurrentNavigation.and.returnValue(null);
    Object.defineProperty(router, 'url', {
      configurable: true,
      get: () => '/feed/alerts/alert-001',
    });

    routeParamMap$ = new BehaviorSubject(convertToParamMap({ itemId: 'alert-001' }));
    const routeStub: Pick<ActivatedRoute, 'paramMap' | 'snapshot'> = {
      paramMap: routeParamMap$.asObservable(),
      snapshot: { paramMap: convertToParamMap({ itemId: 'alert-001' }) } as ActivatedRoute['snapshot'],
    };

    const item = createAlertItem('alert-001');
    feed.findItemById.and.resolveTo(item);
    feed.items.set([item]);

    await TestBed.configureTestingModule({
      imports: [FeedAlertDetailPage, TranslateModule.forRoot()],
      providers: [
        { provide: FeedRealtimeService, useValue: feed },
        { provide: Store, useValue: store },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: AlertUpdateQueueService, useValue: alertUpdateQueue },
        { provide: NotificationStore, useValue: notifications },
      ],
    })
      .overrideComponent(FeedAlertDetailPage, {
        set: {
          imports: [],
          template: '',
        },
      })
      .compileComponents();
  });

  it('toggles subscribed state when subscribe action is triggered', async () => {
    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      subscribed: () => boolean;
      toggleSubscribe: () => void;
    };

    expect(component.subscribed()).toBeFalse();
    component.toggleSubscribe();
    expect(component.subscribed()).toBeTrue();
    component.toggleSubscribe();
    expect(component.subscribed()).toBeFalse();
  });

  it('shares alert detail using clipboard fallback', async () => {
    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const clipboardSpy = jasmine.createSpy('writeText').and.resolveTo();
    const originalClipboard = (navigator as Navigator & { clipboard?: unknown }).clipboard;
    const originalShare = (navigator as Navigator & { share?: unknown }).share;

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardSpy },
      configurable: true,
    });
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    });

    const component = fixture.componentInstance as unknown as {
      share: () => Promise<void>;
    };

    try {
      await component.share();
      expect(clipboardSpy).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
      });
      Object.defineProperty(navigator, 'share', {
        value: originalShare,
        configurable: true,
      });
    }
  });

  it('opens the report drawer and queues a structured alert update on submit', async () => {
    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      reportDrawerOpen: () => boolean;
      subscribed: () => boolean;
      reportUpdate: () => void;
      handleReportSubmitted: (payload: { reason: 'correction'; summary: string; sourceUrl: string | null }) => void;
      reportSubmitState: () => 'idle' | 'success' | 'error';
    };

    expect(component.reportDrawerOpen()).toBeFalse();
    expect(component.subscribed()).toBeFalse();
    component.reportUpdate();
    expect(component.reportDrawerOpen()).toBeTrue();

    component.handleReportSubmitted({
      reason: 'correction',
      summary: 'Environment Canada upgraded the ice accumulation estimate to 20 mm.',
      sourceUrl: 'https://weather.gc.ca',
    });

    expect(alertUpdateQueue.queueUpdate).toHaveBeenCalledWith({
      alertId: 'alert-001',
      alertTitle: 'Ice storm risk on Ontario transmission lines',
      route: '/feed/alerts/alert-001',
      payload: {
        reason: 'correction',
        summary: 'Environment Canada upgraded the ice accumulation estimate to 20 mm.',
        sourceUrl: 'https://weather.gc.ca',
      },
    });
    expect(component.reportSubmitState()).toBe('success');
    expect(component.subscribed()).toBeTrue();
    expect(notifications.success).toHaveBeenCalled();
  });

  it('navigates to feed with linked opportunity draft query params', async () => {
    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      createOpportunity: () => void;
    };

    component.createOpportunity();

    expect(router.navigate).toHaveBeenCalledTimes(1);
    const callArgs = router.navigate.calls.mostRecent().args;
    expect(callArgs[0]).toEqual(['/feed']);
    expect(callArgs[1]?.queryParams).toEqual(
      jasmine.objectContaining({
        type: 'REQUEST',
        mode: 'IMPORT',
        draftSource: 'alert',
        draftAlertId: 'alert-001',
        draftType: 'REQUEST',
        draftMode: 'IMPORT',
        draftSectorId: 'energy',
        draftFromProvinceId: 'qc',
        draftToProvinceId: 'on',
      })
    );
  });

  it('navigates to associated opportunity detail', async () => {
    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      openRelatedOpportunity: (id: string) => void;
    };

    component.openRelatedOpportunity('opportunity-001');
    expect(router.navigate).toHaveBeenCalledWith(['/feed', 'opportunities', 'opportunity-001']);
  });

  it('falls back to the alerts collection when a related alert has no resolvable id', async () => {
    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      detailVm: () => { relatedAlerts: readonly { id: string | null }[] } | null;
      openRelatedAlert: (id: string | null) => void;
    };

    expect(component.detailVm()?.relatedAlerts.map(entry => entry.id)).toEqual([null, null]);

    component.openRelatedAlert(null);
    expect(router.navigate).toHaveBeenCalledWith(['/feed'], {
      queryParams: { type: 'ALERT' },
      queryParamsHandling: 'merge',
    });
  });

  it('loads alert detail by id via service fallback when feed collection is unavailable', async () => {
    const item = createAlertItem('alert-fallback');
    feed.items.set([]);
    feed.findItemById.and.resolveTo(item);
    routeParamMap$.next(convertToParamMap({ itemId: 'alert-fallback' }));

    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      detailVm: () => { item: FeedItem } | null;
    };

    expect(feed.findItemById).toHaveBeenCalledWith('alert-fallback');
    expect(component.detailVm()?.item.id).toBe('alert-fallback');
  });
});
