import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PLATFORM_ID, TransferState, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { Store } from '@ngrx/store';

import { API_URL, FEATURE_FLAGS } from '@app/core/config/environment.tokens';
import { SUPPRESS_ERROR_TOAST } from '@app/core/http/error.interceptor.tokens';
import { NotificationStore } from '@app/core/observability/notification.store';
import { selectCatalogFeedItems } from '@app/state/catalog/catalog.selectors';
import {
  selectFeedConnectionState,
  selectFeedCursor,
  selectFeedDrawerItemId,
  selectFeedError,
  selectFeedFilters,
  selectFeedHydrated,
  selectFeedItems,
  selectFeedLoading,
  selectFeedOnboardingSeen,
  selectFeedState,
  selectFeedUnreadCount,
} from '@app/store/feed/feed.selectors';

import { FeedFilterState } from '../models/feed.models';

import { FeedRealtimeService } from './feed-realtime.service';

class StoreMock {
  private readonly catalogFeedItemsSig = signal([]);
  private readonly filtersSig = signal<FeedFilterState>({
    fromProvinceId: null,
    toProvinceId: null,
    sectorId: null,
    type: null,
    mode: 'BOTH',
    sort: 'NEWEST',
    search: '',
  });
  private readonly cursorSig = signal<string | null>(null);
  private readonly hydratedSig = signal(false);
  private readonly unreadSig = signal(0);
  private readonly connectionSig = signal({
    connected: false,
    reconnecting: false,
    error: null as string | null,
  });
  private readonly itemsSig = signal([]);
  private readonly loadingSig = signal(false);
  private readonly errorSig = signal<string | null>(null);
  private readonly drawerSig = signal<string | null>(null);
  private readonly stateSig = signal({
    items: [],
    itemIndex: {},
    loading: false,
    error: null,
    cursor: null,
    filters: this.filtersSig(),
    connected: false,
    reconnecting: false,
    connectionError: null,
    optimisticMap: {},
    onboardingSeen: false,
    drawerItemId: null,
    hydrated: false,
    unseenIds: [],
    localPublishedIds: [],
  });
  private readonly onboardingSeenSig = signal(false);

  readonly dispatch = jasmine.createSpy('dispatch');

  readonly selectSignal = jasmine.createSpy('selectSignal').and.callFake((selector: unknown) => {
    if (selector === selectCatalogFeedItems) {
      return this.catalogFeedItemsSig.asReadonly();
    }
    if (selector === selectFeedFilters) {
      return this.filtersSig.asReadonly();
    }
    if (selector === selectFeedCursor) {
      return this.cursorSig.asReadonly();
    }
    if (selector === selectFeedHydrated) {
      return this.hydratedSig.asReadonly();
    }
    if (selector === selectFeedUnreadCount) {
      return this.unreadSig.asReadonly();
    }
    if (selector === selectFeedConnectionState) {
      return this.connectionSig.asReadonly();
    }
    if (selector === selectFeedItems) {
      return this.itemsSig.asReadonly();
    }
    if (selector === selectFeedLoading) {
      return this.loadingSig.asReadonly();
    }
    if (selector === selectFeedError) {
      return this.errorSig.asReadonly();
    }
    if (selector === selectFeedDrawerItemId) {
      return this.drawerSig.asReadonly();
    }
    if (selector === selectFeedState) {
      return this.stateSig.asReadonly();
    }
    if (selector === selectFeedOnboardingSeen) {
      return this.onboardingSeenSig.asReadonly();
    }
    throw new Error(`Unexpected selector in StoreMock: ${String(selector)}`);
  });
}

describe('FeedRealtimeService', () => {
  let service: FeedRealtimeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const translate = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translate.instant.and.callFake((key: string) => key);

    const notifications = jasmine.createSpyObj('NotificationStore', ['success', 'error', 'info']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FeedRealtimeService,
        TransferState,
        { provide: Store, useClass: StoreMock },
        { provide: API_URL, useValue: 'https://cms.local' },
        { provide: FEATURE_FLAGS, useValue: {} },
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: TranslateService, useValue: translate },
        { provide: NotificationStore, useValue: notifications },
      ],
    });

    service = TestBed.inject(FeedRealtimeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('suppresses the global error toast for the initial feed request', () => {
    service.loadInitial();

    const request = httpMock.expectOne(req =>
      req.url === 'https://cms.local/api/feed' && req.params.get('sort') === 'NEWEST'
    );
    expect(request.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();

    request.flush({ data: [], cursor: null });
  });
});
