import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap } from '@angular/router';
import { FeedActions } from '@app/store/feed/feed.actions';
import { selectFeedError, selectFeedHydrated } from '@app/store/feed/feed.selectors';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable } from 'rxjs';

import { FeedRealtimeService } from './services/feed-realtime.service';
import { routes } from './feed.routes';

class StoreMock {
  readonly dispatch = jasmine.createSpy('dispatch');
  readonly hydrated$ = new BehaviorSubject(false);
  readonly error$ = new BehaviorSubject<string | null>(null);

  readonly select = jasmine.createSpy('select').and.callFake((selector: unknown): Observable<unknown> => {
    if (selector === selectFeedHydrated) {
      return this.hydrated$.asObservable();
    }
    if (selector === selectFeedError) {
      return this.error$.asObservable();
    }
    throw new Error(`Unexpected selector in StoreMock: ${String(selector)}`);
  });
}

class FeedRealtimeServiceMock {
  readonly hasHydrated = jasmine.createSpy('hasHydrated').and.returnValue(false);
  readonly loadInitial = jasmine.createSpy('loadInitial').and.callFake(() => undefined);
}

describe('feed.routes setup resolver', () => {
  let store: StoreMock;
  let feed: FeedRealtimeServiceMock;
  let setupResolver: (route: ActivatedRouteSnapshot) => Promise<boolean>;

  beforeEach(() => {
    store = new StoreMock();
    feed = new FeedRealtimeServiceMock();

    TestBed.configureTestingModule({
      providers: [
        { provide: Store, useValue: store },
        { provide: FeedRealtimeService, useValue: feed },
      ],
    });

    setupResolver = routes[0]?.children?.[0]?.resolve?.['setup'] as (route: ActivatedRouteSnapshot) => Promise<boolean>;
  });

  it('parses query params and dispatches feed filters before loading the initial page', async () => {
    store.hydrated$.next(true);
    feed.hasHydrated.and.returnValue(false);

    const route = {
      queryParamMap: convertToParamMap({
        fromProvince: 'qc',
        toProvince: 'on',
        sector: 'energy',
        formKey: 'energy-surplus-offer',
        type: 'OFFER',
        mode: 'IMPORT',
        sort: 'URGENCY',
        q: 'winter peak',
      }),
    } as ActivatedRouteSnapshot;

    const result = await TestBed.runInInjectionContext(() => setupResolver(route));

    expect(result).toBeTrue();
    expect(store.dispatch).toHaveBeenCalledWith(
      FeedActions.applyFilters({
        filters: {
          fromProvinceId: 'qc',
          toProvinceId: 'on',
          sectorId: 'energy',
          formKey: 'energy-surplus-offer',
          category: null,
          type: 'OFFER',
          mode: 'IMPORT',
          sort: 'URGENCY',
          search: 'winter peak',
        },
      })
    );
    expect(feed.loadInitial).toHaveBeenCalledTimes(1);
  });

  it('does not reload the initial page when the feed is already hydrated', async () => {
    store.hydrated$.next(true);
    feed.hasHydrated.and.returnValue(true);

    const route = {
      queryParamMap: convertToParamMap({ formKey: 'energy-surplus-offer' }),
    } as ActivatedRouteSnapshot;

    const result = await TestBed.runInInjectionContext(() => setupResolver(route));

    expect(result).toBeTrue();
    expect(store.dispatch).toHaveBeenCalledWith(
      FeedActions.applyFilters({
        filters: {
          fromProvinceId: null,
          toProvinceId: null,
          sectorId: null,
          formKey: 'energy-surplus-offer',
          category: null,
          type: null,
          mode: 'BOTH',
          sort: 'NEWEST',
          search: '',
        },
      })
    );
    expect(feed.loadInitial).not.toHaveBeenCalled();
  });
});