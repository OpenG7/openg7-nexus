import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { FeedComposerDraft, FeedItem } from '../models/feed.models';
import { FeedRealtimeService } from '../services/feed-realtime.service';

import { FeedIndicatorDetailPage } from './feed-indicator-detail.page';

class FeedRealtimeServiceMock {
  readonly items = signal<readonly FeedItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private readonly connectedSig = signal(true);
  private readonly reconnectingSig = signal(false);
  private readonly connectionErrorSig = signal<string | null>(null);
  readonly connectionState = {
    connected: this.connectedSig.asReadonly(),
    reconnecting: this.reconnectingSig.asReadonly(),
    error: this.connectionErrorSig.asReadonly(),
  };

  readonly findItemById = jasmine.createSpy('findItemById');
  readonly publishDraft = jasmine.createSpy('publishDraft').and.resolveTo({
    status: 'success',
    validation: { valid: true, errors: [], warnings: [] },
  });
  readonly reload = jasmine.createSpy('reload');

  setConnected(value: boolean): void {
    this.connectedSig.set(value);
  }
}

class StoreMock {
  private readonly provincesSig = signal([
    { id: 'on', name: 'Ontario' },
    { id: 'qc', name: 'Quebec' },
  ]);
  private readonly sectorsSig = signal([
    { id: 'energy', name: 'Energy' },
  ]);
  private selectCallCount = 0;

  readonly selectSignal = jasmine.createSpy('selectSignal').and.callFake(() => {
    this.selectCallCount += 1;
    if (this.selectCallCount === 1) {
      return this.provincesSig.asReadonly();
    }
    return this.sectorsSig.asReadonly();
  });
}

function createIndicatorItem(id: string): FeedItem {
  return {
    id,
    createdAt: '2026-01-21T09:00:00.000Z',
    updatedAt: '2026-01-21T09:03:00.000Z',
    type: 'INDICATOR',
    sectorId: 'energy',
    title: 'Spot electricity price up 12 percent',
    summary: 'Ontario spot electricity prices rose in the last 72 hours.',
    fromProvinceId: null,
    toProvinceId: 'on',
    mode: 'BOTH',
    urgency: 2,
    credibility: 2,
    tags: ['price', 'spot', 'ontario'],
    source: {
      kind: 'GOV',
      label: 'IESO',
    },
  };
}

describe('FeedIndicatorDetailPage', () => {
  let feed: FeedRealtimeServiceMock;
  let store: StoreMock;
  let router: jasmine.SpyObj<Router>;
  let routeParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    feed = new FeedRealtimeServiceMock();
    store = new StoreMock();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    routeParamMap$ = new BehaviorSubject(convertToParamMap({ itemId: 'indicator-spot-ontario' }));
    const routeStub: Pick<ActivatedRoute, 'paramMap' | 'snapshot'> = {
      paramMap: routeParamMap$.asObservable(),
      snapshot: { paramMap: convertToParamMap({ itemId: 'indicator-spot-ontario' }) } as ActivatedRoute['snapshot'],
    };

    const indicator = createIndicatorItem('indicator-spot-ontario');
    feed.findItemById.and.resolveTo(indicator);
    feed.items.set([indicator]);

    await TestBed.configureTestingModule({
      imports: [FeedIndicatorDetailPage, TranslateModule.forRoot()],
      providers: [
        { provide: FeedRealtimeService, useValue: feed },
        { provide: Store, useValue: store },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: routeStub },
      ],
    })
      .overrideComponent(FeedIndicatorDetailPage, {
        set: {
          imports: [],
          template: '',
        },
      })
      .compileComponents();
  });

  it('updates chart window and series when timeframe changes between 24h, 72h, and 7d', async () => {
    const fixture = TestBed.createComponent(FeedIndicatorDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      timeframe: () => '24h' | '72h' | '7d';
      windowHours: () => number;
      series: () => readonly { ts: string; value: number }[];
      setTimeframe: (value: '24h' | '72h' | '7d') => void;
    };

    expect(component.timeframe()).toBe('72h');
    const series72h = component.series();
    expect(component.windowHours()).toBe(72);
    expect(series72h.length).toBe(72);

    component.setTimeframe('24h');
    fixture.detectChanges();
    const series24h = component.series();
    expect(component.windowHours()).toBe(24);
    expect(series24h.length).toBe(24);

    component.setTimeframe('7d');
    fixture.detectChanges();
    const series7d = component.series();
    expect(component.windowHours()).toBe(168);
    expect(series7d.length).toBe(168);
  });

  it('resamples chart series when granularity changes between hour, 15m, and day', async () => {
    const fixture = TestBed.createComponent(FeedIndicatorDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      granularity: () => 'hour' | '15m' | 'day';
      series: () => readonly { ts: string; value: number }[];
      setGranularity: (value: 'hour' | '15m' | 'day') => void;
    };

    expect(component.granularity()).toBe('hour');
    expect(component.series().length).toBe(72);

    component.setGranularity('15m');
    fixture.detectChanges();
    expect(component.granularity()).toBe('15m');
    expect(component.series().length).toBe(285);

    component.setGranularity('day');
    fixture.detectChanges();
    expect(component.granularity()).toBe('day');
    expect(component.series().length).toBe(3);
  });

  it('forces hourly granularity when timeframe is set to 7d', async () => {
    const fixture = TestBed.createComponent(FeedIndicatorDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      granularity: () => 'hour' | '15m' | 'day';
      setGranularity: (value: 'hour' | '15m' | 'day') => void;
      setTimeframe: (value: '24h' | '72h' | '7d') => void;
    };

    component.setGranularity('15m');
    fixture.detectChanges();
    expect(component.granularity()).toBe('15m');

    component.setTimeframe('7d');
    fixture.detectChanges();
    expect(component.granularity()).toBe('hour');
  });

  it('toggles subscribed state when subscribe action is triggered', async () => {
    const fixture = TestBed.createComponent(FeedIndicatorDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      subscribed: () => boolean;
      toggleSubscribe: () => void;
    };

    expect(component.subscribed()).toBeFalse();

    component.toggleSubscribe();
    fixture.detectChanges();
    expect(component.subscribed()).toBeTrue();

    component.toggleSubscribe();
    fixture.detectChanges();
    expect(component.subscribed()).toBeFalse();
  });

  it('opens indicator alert drawer when create alert action is triggered', async () => {
    const fixture = TestBed.createComponent(FeedIndicatorDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      drawerOpen: () => boolean;
      openAlertDrawer: () => void;
    };

    expect(component.drawerOpen()).toBeFalse();
    component.openAlertDrawer();
    fixture.detectChanges();
    expect(component.drawerOpen()).toBeTrue();
  });

  it('publishes mapped alert draft and updates subscribed state on successful submit', async () => {
    const fixture = TestBed.createComponent(FeedIndicatorDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      openAlertDrawer: () => void;
      onAlertDraftSubmitted: (draft: ReturnType<typeof createAlertDraft>) => void;
      alertSubmitState: () => 'idle' | 'submitting' | 'success' | 'error' | 'offline';
      subscribed: () => boolean;
    };

    component.openAlertDrawer();
    component.onAlertDraftSubmitted(createAlertDraft());
    await fixture.whenStable();

    expect(feed.publishDraft).toHaveBeenCalledTimes(1);
    const publishedDraft = feed.publishDraft.calls.mostRecent().args[0] as FeedComposerDraft;
    expect(publishedDraft.type).toBe('ALERT');
    expect(publishedDraft.title).toContain('Spot electricity price up 12 percent');
    expect(publishedDraft.summary).toContain('25%');
    expect(publishedDraft.summary).toContain('Watch evening peak');
    expect(publishedDraft.sectorId).toBe('energy');
    expect(publishedDraft.fromProvinceId).toBeNull();
    expect(publishedDraft.toProvinceId).toBe('on');
    expect(publishedDraft.mode).toBe('BOTH');
    expect(publishedDraft.tags).toEqual(['indicator-alert', '24h', 'hourly']);
    expect(component.alertSubmitState()).toBe('success');
    expect(component.subscribed()).toBeTrue();
  });

  it('stores draft in offline mode and allows retry after reconnection', async () => {
    const fixture = TestBed.createComponent(FeedIndicatorDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      openAlertDrawer: () => void;
      onAlertDraftSubmitted: (draft: ReturnType<typeof createAlertDraft>) => void;
      onAlertDraftRetryRequested: () => void;
      alertSubmitState: () => 'idle' | 'submitting' | 'success' | 'error' | 'offline';
      alertRetryEnabled: () => boolean;
    };

    feed.setConnected(false);
    component.openAlertDrawer();
    component.onAlertDraftSubmitted(createAlertDraft());
    await fixture.whenStable();

    expect(feed.publishDraft).not.toHaveBeenCalled();
    expect(component.alertSubmitState()).toBe('offline');
    expect(component.alertRetryEnabled()).toBeFalse();

    feed.setConnected(true);
    fixture.detectChanges();
    expect(component.alertRetryEnabled()).toBeTrue();

    component.onAlertDraftRetryRequested();
    await fixture.whenStable();
    expect(feed.publishDraft).toHaveBeenCalledTimes(1);
    expect(component.alertSubmitState()).toBe('success');
  });

  it('navigates to alert detail when opening a related alert entry', async () => {
    const fixture = TestBed.createComponent(FeedIndicatorDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    router.navigate.calls.reset();

    const component = fixture.componentInstance as unknown as {
      openRelatedEntry: (entry: {
        id: string | null;
        title: string;
        context: string;
        sparkline: readonly number[];
        route: 'alert' | 'opportunity';
      }) => void;
    };

    component.openRelatedEntry({
      id: 'alert-001',
      title: 'Ice storm risk on Ontario transmission lines',
      context: 'Ontario',
      sparkline: [22, 25, 24, 28],
      route: 'alert',
    });

    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/feed', 'alerts', 'alert-001']);
  });

  it('navigates to opportunity detail when opening a related opportunity entry', async () => {
    const fixture = TestBed.createComponent(FeedIndicatorDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    router.navigate.calls.reset();

    const component = fixture.componentInstance as unknown as {
      openRelatedEntry: (entry: {
        id: string | null;
        title: string;
        context: string;
        sparkline: readonly number[];
        route: 'alert' | 'opportunity';
      }) => void;
    };

    component.openRelatedEntry({
      id: 'opportunity-001',
      title: 'Short-term import of 300 MW',
      context: 'Quebec -> Ontario',
      sparkline: [18, 20, 23, 24],
      route: 'opportunity',
    });

    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/feed', 'opportunities', 'opportunity-001']);
  });

  it('loads indicator detail by id via service fallback when feed collection is unavailable', async () => {
    const indicator = createIndicatorItem('indicator-fallback');
    feed.items.set([]);
    feed.findItemById.and.resolveTo(indicator);
    routeParamMap$.next(convertToParamMap({ itemId: 'indicator-fallback' }));

    const fixture = TestBed.createComponent(FeedIndicatorDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      detailVm: () => { item: FeedItem } | null;
    };

    expect(feed.findItemById).toHaveBeenCalledWith('indicator-fallback');
    expect(component.detailVm()?.item.id).toBe('indicator-fallback');
  });
});

function createAlertDraft() {
  return {
    thresholdDirection: 'gt' as const,
    thresholdValue: 25,
    window: '24h' as const,
    frequency: 'hourly' as const,
    notifyDelta: true,
    note: 'Watch evening peak',
  };
}
