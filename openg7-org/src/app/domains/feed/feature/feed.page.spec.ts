import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { FeedPage } from './feed.page';
import { FeedItem } from './models/feed.models';
import { FeedRealtimeService } from './services/feed-realtime.service';

class FeedRealtimeServiceMock {
  readonly items = signal<readonly FeedItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly connectionState = {
    connected: signal(true).asReadonly(),
    reconnecting: signal(false).asReadonly(),
    error: signal<string | null>(null).asReadonly(),
  };

  readonly hasHydrated = jasmine.createSpy('hasHydrated').and.returnValue(true);
  readonly loadInitial = jasmine.createSpy('loadInitial');
  readonly refreshConnection = jasmine.createSpy('refreshConnection');
  readonly loadMore = jasmine.createSpy('loadMore');
  readonly reload = jasmine.createSpy('reload');
  readonly openDrawer = jasmine.createSpy('openDrawer');
  readonly unreadCount = jasmine.createSpy('unreadCount').and.returnValue(0);
}

function createFeedItem(type: FeedItem['type'], id: string): FeedItem {
  return {
    id,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:02:00.000Z',
    type,
    sectorId: 'energy',
    title: `Item ${id}`,
    summary: `Summary ${id}`,
    fromProvinceId: null,
    toProvinceId: null,
    mode: 'BOTH',
    source: {
      kind: 'PARTNER',
      label: 'Grid Ops',
    },
  };
}

describe('FeedPage', () => {
  let feed: FeedRealtimeServiceMock;
  let router: jasmine.SpyObj<Router>;
  let route: ActivatedRoute;

  beforeEach(() => {
    feed = new FeedRealtimeServiceMock();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    route = {} as ActivatedRoute;

    TestBed.configureTestingModule({
      imports: [FeedPage],
      providers: [
        { provide: FeedRealtimeService, useValue: feed },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
      ],
    });
    TestBed.overrideComponent(FeedPage, {
      set: {
        imports: [],
        template: '',
      },
    });
  });

  it('loads initial feed stream when page opens and state is not hydrated', () => {
    feed.hasHydrated.and.returnValue(false);

    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();

    expect(feed.loadInitial).toHaveBeenCalledTimes(1);
  });

  it('exposes feed items stream for tile rendering', () => {
    const fixture = TestBed.createComponent(FeedPage);
    const component = fixture.componentInstance;
    feed.items.set([createFeedItem('REQUEST', 'request-001')]);

    expect(component.items().length).toBe(1);
    expect(component.items()[0]?.id).toBe('request-001');
  });

  it('routes indicator items to /feed/indicators/:id', () => {
    const fixture = TestBed.createComponent(FeedPage);
    const component = fixture.componentInstance;
    feed.items.set([createFeedItem('INDICATOR', 'indicator-spot-ontario')]);

    component.openItem('indicator-spot-ontario');

    expect(router.navigate).toHaveBeenCalledWith(['indicators', 'indicator-spot-ontario'], {
      relativeTo: route,
      queryParamsHandling: 'preserve',
    });
  });

  it('routes alert items to /feed/alerts/:id', () => {
    const fixture = TestBed.createComponent(FeedPage);
    const component = fixture.componentInstance;
    feed.items.set([createFeedItem('ALERT', 'alert-ice-storm')]);

    component.openItem('alert-ice-storm');

    expect(router.navigate).toHaveBeenCalledWith(['alerts', 'alert-ice-storm'], {
      relativeTo: route,
      queryParamsHandling: 'preserve',
    });
  });

  it('routes non-alert and non-indicator items to /feed/opportunities/:id', () => {
    const fixture = TestBed.createComponent(FeedPage);
    const component = fixture.componentInstance;
    feed.items.set([createFeedItem('REQUEST', 'opportunity-300mw')]);

    component.openItem('opportunity-300mw');

    expect(router.navigate).toHaveBeenCalledWith(['opportunities', 'opportunity-300mw'], {
      relativeTo: route,
      queryParamsHandling: 'preserve',
    });
  });
});
