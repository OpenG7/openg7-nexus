import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { FavoritesService } from '@app/core/favorites.service';
import { NotificationStore } from '@app/core/observability/notification.store';
import { OpportunityOffersService } from '@app/core/opportunity-offers.service';
import { selectProvinces, selectSectors } from '@app/state/catalog/catalog.selectors';
import {
  feedCategorySig,
  feedFormKeySig,
  feedModeSig,
  feedSearchSig,
  feedSortSig,
  feedTypeSig,
  fromProvinceIdSig,
  sectorIdSig,
  toProvinceIdSig,
} from '@app/state/shared-feed-signals';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { OpportunityOfferPayload, OpportunityOfferSubmitState } from './components/opportunity-detail.models';
import { parseFeedFilters } from './feed-route-filters';
import { FeedPage } from './feed.page';
import { FeedComposerDraft, FeedItem } from './models/feed.models';
import { Og7FeedStreamComponent } from './og7-feed-stream/og7-feed-stream.component';
import { FeedRealtimeService } from './services/feed-realtime.service';

@Component({
  selector: 'og7-feed-publish-section',
  standalone: true,
  template: '',
})
class FeedPublishSectionStubComponent {
  readonly focusPrimaryAction = jasmine.createSpy('focusPrimaryAction');
}

@Component({
  selector: 'og7-feed-stream',
  standalone: true,
  template: '',
})
class FeedStreamStubComponent {
  readonly items = input<readonly FeedItem[]>([]);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly unreadCount = input(0);
  readonly highlightedItemId = input<string | null>(null);
  readonly savedKeys = input<ReadonlySet<string>>(new Set<string>());
  readonly connectionState = input.required<{
    connected: () => boolean;
    reconnecting: () => boolean;
    error: () => string | null;
  }>();

  readonly loadMore = output<void>();
  readonly refresh = output<void>();
  readonly openItem = output<string>();
  readonly closeItem = output<void>();
  readonly saveItem = output<FeedItem>();
  readonly contactItem = output<FeedItem>();
  readonly composeRequested = output<void>();
}

@Component({
  selector: 'og7-opportunity-offer-drawer',
  standalone: true,
  template: '',
})
class OpportunityOfferDrawerStubComponent {
  readonly open = input(false);
  readonly initialCapacityMw = input(300);
  readonly initialStartDate = input<string | null>('');
  readonly initialEndDate = input<string | null>('');
  readonly submitState = input<OpportunityOfferSubmitState>('idle');
  readonly submitError = input<string | null>(null);
  readonly retryEnabled = input(false);

  readonly closed = output<void>();
  readonly submitted = output<OpportunityOfferPayload>();
  readonly retryRequested = output<void>();
}

@Component({
  selector: 'og7-hydrocarbon-signals-panel',
  standalone: true,
  template: '',
})
class HydrocarbonSignalsPanelStubComponent {
  readonly limit = input(3);
  readonly originProvinceId = input<string | null>(null);
  readonly targetProvinceId = input<string | null>(null);
}

class FeedRealtimeServiceMock {
  readonly items = signal<readonly FeedItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly onboardingSeen = signal(true).asReadonly();
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
  readonly markOnboardingSeen = jasmine.createSpy('markOnboardingSeen');
  readonly publishDraft = jasmine.createSpy('publishDraft').and.resolveTo({
    status: 'success',
    validation: { valid: true, errors: [], warnings: [] },
  });
}

class StoreMock {
  private readonly provincesSig = signal<{ id: string; name: string }[]>([]);
  private readonly sectorsSig = signal<{ id: string; name: string }[]>([]);

  readonly selectSignal = jasmine.createSpy('selectSignal').and.callFake((selector: unknown) => {
    if (selector === selectProvinces) {
      return this.provincesSig.asReadonly();
    }
    if (selector === selectSectors) {
      return this.sectorsSig.asReadonly();
    }
    throw new Error(`Unexpected selector in StoreMock: ${String(selector)}`);
  });

  setProvinces(provinces: { id: string; name: string }[]): void {
    this.provincesSig.set(provinces);
  }

  setSectors(sectors: { id: string; name: string }[]): void {
    this.sectorsSig.set(sectors);
  }
}

class FavoritesServiceMock {
  private readonly itemsSig = signal<string[]>([]);

  readonly list = this.itemsSig.asReadonly();
  readonly refresh = jasmine.createSpy('refresh');
  readonly add = jasmine.createSpy('add').and.callFake((item: string) => {
    this.itemsSig.update(current => (current.includes(item) ? current : [...current, item]));
  });
  readonly remove = jasmine.createSpy('remove').and.callFake((item: string) => {
    this.itemsSig.update(current => current.filter(entry => entry !== item));
  });

  setItems(items: string[]): void {
    this.itemsSig.set(items);
  }
}

class OpportunityOffersServiceMock {
  readonly refresh = jasmine.createSpy('refresh');
  readonly create = jasmine.createSpy('create').and.callFake((payload) => ({
    id: 'offer-record-1',
    reference: 'OG7-OFR-20260120-AB12',
    status: 'submitted',
    ...payload,
  }));
  readonly withdraw = jasmine.createSpy('withdraw');
}

function createFeedItem(type: FeedItem['type'], id: string, overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:02:00.000Z',
    type,
    sectorId: 'energy',
    title: `Item ${id}`,
    summary: `Summary ${id}`,
    fromProvinceId: 'qc',
    toProvinceId: 'on',
    mode: 'IMPORT',
    quantity: {
      value: 320,
      unit: 'MW',
    },
    tags: ['winter', 'peak'],
    source: {
      kind: 'PARTNER',
      label: 'Grid Ops',
    },
    ...overrides,
  };
}

function createOfferPayload(): OpportunityOfferPayload {
  return {
    capacityMw: 340,
    startDate: '2026-01-20',
    endDate: '2026-02-18',
    pricingModel: 'spot',
    comment: 'Firm import block for winter peak support.',
    attachmentName: 'term-sheet.pdf',
  };
}

function resetSharedFeedFilters(): void {
  fromProvinceIdSig.set(null);
  toProvinceIdSig.set(null);
  sectorIdSig.set(null);
  feedFormKeySig.set(null);
  feedCategorySig.set(null);
  feedTypeSig.set(null);
  feedModeSig.set('BOTH');
  feedSortSig.set('NEWEST');
  feedSearchSig.set('');
}

function applySharedFeedFiltersFromQuery(query: ReturnType<typeof convertToParamMap>): void {
  const filters = parseFeedFilters(query);
  fromProvinceIdSig.set(filters.fromProvinceId);
  toProvinceIdSig.set(filters.toProvinceId);
  sectorIdSig.set(filters.sectorId);
  feedFormKeySig.set(filters.formKey);
  feedCategorySig.set(filters.category);
  feedTypeSig.set(filters.type);
  feedModeSig.set(filters.mode);
  feedSortSig.set(filters.sort);
  feedSearchSig.set(filters.search);
}

describe('FeedPage', () => {
  let feed: FeedRealtimeServiceMock;
  let favorites: FavoritesServiceMock;
  let opportunityOffers: OpportunityOffersServiceMock;
  let notifications: { success: jasmine.Spy; info: jasmine.Spy; error: jasmine.Spy };
  let router: jasmine.SpyObj<Router>;
  let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let routeData$: BehaviorSubject<Record<string, unknown>>;
  let authState: ReturnType<typeof signal<boolean>>;
  let currentUrl: string;

  beforeEach(async () => {
    resetSharedFeedFilters();
    feed = new FeedRealtimeServiceMock();
    favorites = new FavoritesServiceMock();
    opportunityOffers = new OpportunityOffersServiceMock();
    notifications = {
      success: jasmine.createSpy('success'),
      info: jasmine.createSpy('info'),
      error: jasmine.createSpy('error'),
    };
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'getCurrentNavigation']);
    router.navigate.and.resolveTo(true);
    router.getCurrentNavigation.and.returnValue(null);
    currentUrl = '/feed';
    Object.defineProperty(router, 'url', {
      configurable: true,
      get: () => currentUrl,
    });

    queryParamMap$ = new BehaviorSubject(convertToParamMap({}));
    routeData$ = new BehaviorSubject<Record<string, unknown>>({});
    authState = signal(true);

    const routeStub: Pick<ActivatedRoute, 'queryParamMap' | 'data' | 'snapshot'> = {
      queryParamMap: queryParamMap$.asObservable(),
      data: routeData$.asObservable(),
      get snapshot() {
        return { queryParamMap: queryParamMap$.value, data: routeData$.value } as ActivatedRoute['snapshot'];
      },
    };

    await TestBed.configureTestingModule({
      imports: [FeedPage, TranslateModule.forRoot()],
      providers: [
        { provide: FeedRealtimeService, useValue: feed },
        { provide: FavoritesService, useValue: favorites },
        { provide: OpportunityOffersService, useValue: opportunityOffers },
        { provide: NotificationStore, useValue: notifications },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: routeStub },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: authState.asReadonly(),
          } as Pick<AuthService, 'isAuthenticated'>,
        },
      ],
    })
      .overrideComponent(FeedPage, {
        set: {
          imports: [
            CommonModule,
            TranslateModule,
            FeedPublishSectionStubComponent,
            FeedStreamStubComponent,
            OpportunityOfferDrawerStubComponent,
            HydrocarbonSignalsPanelStubComponent,
          ],
        },
      })
      .compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      'en',
      {
        feed: {
          context: {
            homeFeedPanels: 'Context preserved from the home feed panels.',
            corridorFocus: 'Focused corridor:',
          },
        },
        home: {
          corridorsRealtime: {
            items: {
              essentialServices: 'Essential services',
              qcOn: 'QC -> ON',
            },
          },
        },
      },
      true
    );
    translate.use('en');
  });

  afterEach(() => {
    resetSharedFeedFilters();
  });

  it('loads initial feed stream when page opens and state is not hydrated', () => {
    feed.hasHydrated.and.returnValue(false);

    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();

    expect(feed.loadInitial).toHaveBeenCalledTimes(1);
  });

  it('does not trigger a second initial load while a previous one is already in flight', () => {
    feed.hasHydrated.and.returnValue(false);
    feed.loading.set(true);

    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();

    expect(feed.loadInitial).not.toHaveBeenCalled();
  });

  it('exposes feed items stream for tile rendering', () => {
    const fixture = TestBed.createComponent(FeedPage);
    const component = fixture.componentInstance;
    feed.items.set([createFeedItem('REQUEST', 'request-001')]);

    expect(component.items().length).toBe(1);
    expect(component.items()[0]?.id).toBe('request-001');
  });

  it('highlights a home feed panel item when source context is present', () => {
    queryParamMap$.next(convertToParamMap({ source: 'home-feed-panels', feedItemId: 'request-001' }));

    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();

    const stream = fixture.debugElement.query(By.directive(FeedStreamStubComponent)).componentInstance as FeedStreamStubComponent;
    expect(stream.highlightedItemId()).toBe('request-001');
    expect(fixture.nativeElement.querySelector('[data-og7="feed-source-context"]')).toBeTruthy();
  });

  it('does not highlight an item for unknown source contexts', () => {
    queryParamMap$.next(convertToParamMap({ source: 'admin', feedItemId: 'request-001' }));

    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();

    const stream = fixture.debugElement.query(By.directive(FeedStreamStubComponent)).componentInstance as FeedStreamStubComponent;
    expect(stream.highlightedItemId()).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-og7="feed-source-context"]')).toBeNull();
  });

  it('shows corridor context when the feed is opened from realtime corridors', () => {
    queryParamMap$.next(convertToParamMap({ source: 'corridors-realtime', corridorId: 'essential-services' }));

    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();

    const stream = fixture.debugElement.query(By.directive(FeedStreamStubComponent)).componentInstance as FeedStreamStubComponent;
    const context = fixture.nativeElement.querySelector('[data-og7="feed-source-context"]') as HTMLElement;

    expect(stream.highlightedItemId()).toBeNull();
    expect(context).toBeTruthy();
    expect(context.textContent).toContain('Focused corridor:');
    expect(context.textContent).toContain('Essential services');
    expect(context.textContent).toContain('QC -> ON');
  });

  it('mirrors active feed filters into URL query params', () => {
    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();
    router.navigate.calls.reset();

    fromProvinceIdSig.set('qc');
    toProvinceIdSig.set('on');
    sectorIdSig.set('energy');
    feedFormKeySig.set('energy-surplus-offer');
    feedTypeSig.set('OFFER');
    feedModeSig.set('IMPORT');
    feedSortSig.set('URGENCY');
    feedSearchSig.set('winter peak');
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: {
        fromProvince: 'qc',
        toProvince: 'on',
        sector: 'energy',
        sectorId: null,
        formKey: 'energy-surplus-offer',
        category: null,
        type: 'OFFER',
        mode: 'IMPORT',
        sort: 'URGENCY',
        q: 'winter peak',
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('clears URL filter params when shared feed filters return to defaults', () => {
    queryParamMap$.next(
      convertToParamMap({
        source: 'home-feed-panels',
        feedItemId: 'opportunity-300mw',
        fromProvince: 'qc',
        toProvince: 'on',
        sector: 'energy',
        formKey: 'energy-surplus-offer',
        type: 'OFFER',
        mode: 'IMPORT',
        sort: 'URGENCY',
        q: 'winter peak',
      })
    );

    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: {
        fromProvince: null,
        toProvince: null,
        sector: null,
        sectorId: null,
        formKey: null,
        category: null,
        type: null,
        mode: null,
        sort: null,
        q: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('renders dedicated hydrocarbon feed copy when route data provides a specialized view', () => {
    routeData$.next({
      feedView: {
        titleKey: 'feed.views.hydrocarbons.title',
        subtitleKey: 'feed.views.hydrocarbons.subtitle',
        contextKey: 'feed.views.hydrocarbons.context',
      },
    });

    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('feed.views.hydrocarbons.title');
    expect(content).toContain('feed.views.hydrocarbons.subtitle');
    expect(content).toContain('feed.views.hydrocarbons.context');
    expect(fixture.nativeElement.querySelector('[data-og7="feed-view-context"]')).toBeTruthy();
  });

  it('renders the reusable hydrocarbon signals panel when route data enables it', async () => {
    routeData$.next({
      hydrocarbonSignalsPanel: { limit: 3 },
      feedView: {
        titleKey: 'feed.views.hydrocarbons.title',
        subtitleKey: 'feed.views.hydrocarbons.subtitle',
        contextKey: 'feed.views.hydrocarbons.context',
      },
    });
    fromProvinceIdSig.set('ab');

    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const panel = fixture.debugElement.query(By.directive(HydrocarbonSignalsPanelStubComponent));
    expect(panel).toBeTruthy();
    expect((panel.componentInstance as HydrocarbonSignalsPanelStubComponent).limit()).toBe(3);
    expect((panel.componentInstance as HydrocarbonSignalsPanelStubComponent).originProvinceId()).toBe('ab');
    expect((panel.componentInstance as HydrocarbonSignalsPanelStubComponent).targetProvinceId()).toBeNull();
  });

  it('routes indicator items to /feed/indicators/:id', () => {
    const fixture = TestBed.createComponent(FeedPage);
    const component = fixture.componentInstance;
    feed.items.set([createFeedItem('INDICATOR', 'indicator-spot-ontario')]);

    component.openItem('indicator-spot-ontario');

    expect(router.navigate).toHaveBeenCalledWith(['/feed', 'indicators', 'indicator-spot-ontario'], {
      queryParamsHandling: 'preserve',
    });
  });

  it('routes alert items to /feed/alerts/:id', () => {
    const fixture = TestBed.createComponent(FeedPage);
    const component = fixture.componentInstance;
    feed.items.set([createFeedItem('ALERT', 'alert-ice-storm')]);

    component.openItem('alert-ice-storm');

    expect(router.navigate).toHaveBeenCalledWith(['/feed', 'alerts', 'alert-ice-storm'], {
      queryParamsHandling: 'preserve',
    });
  });

  it('routes non-alert and non-indicator items to /feed/opportunities/:id', () => {
    const fixture = TestBed.createComponent(FeedPage);
    const component = fixture.componentInstance;
    feed.items.set([createFeedItem('REQUEST', 'opportunity-300mw')]);

    component.openItem('opportunity-300mw');

    expect(router.navigate).toHaveBeenCalledWith(['/feed', 'opportunities', 'opportunity-300mw'], {
      queryParamsHandling: 'preserve',
    });
  });

  it('toggles favorites when save is requested from the stream', () => {
    const item = createFeedItem('REQUEST', 'opportunity-300mw');
    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();

    const stream = fixture.debugElement.query(By.directive(FeedStreamStubComponent)).componentInstance as FeedStreamStubComponent;
    stream.saveItem.emit(item);
    expect(favorites.add).toHaveBeenCalledWith('opportunity:opportunity-300mw');

    stream.saveItem.emit(item);
    expect(favorites.remove).toHaveBeenCalledWith('opportunity:opportunity-300mw');
  });

  it('opens the in-place contact drawer for opportunity items', () => {
    const item = createFeedItem('REQUEST', 'opportunity-300mw');
    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();

    const stream = fixture.debugElement.query(By.directive(FeedStreamStubComponent)).componentInstance as FeedStreamStubComponent;
    stream.contactItem.emit(item);
    fixture.detectChanges();

    const drawer = fixture.debugElement.query(By.directive(OpportunityOfferDrawerStubComponent))
      .componentInstance as OpportunityOfferDrawerStubComponent;
    expect(drawer.open()).toBeTrue();
    expect(drawer.initialCapacityMw()).toBe(320);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects anonymous users to login when contact is requested', () => {
    authState.set(false);
    currentUrl = '/feed?source=home-feed-panels&feedItemId=opportunity-300mw';

    const item = createFeedItem('REQUEST', 'opportunity-300mw');
    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();

    const stream = fixture.debugElement.query(By.directive(FeedStreamStubComponent)).componentInstance as FeedStreamStubComponent;
    stream.contactItem.emit(item);

    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirect: '/feed?source=home-feed-panels&feedItemId=opportunity-300mw' },
    });
  });

  it('routes contact requests to linkup when the item carries a connection match id', () => {
    const item = createFeedItem('REQUEST', 'opportunity-300mw', { connectionMatchId: 73 });
    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();

    const stream = fixture.debugElement.query(By.directive(FeedStreamStubComponent)).componentInstance as FeedStreamStubComponent;
    stream.contactItem.emit(item);

    expect(router.navigate).toHaveBeenCalledWith(['/linkup', 73], {
      queryParams: {
        source: 'feed',
        feedItemId: 'opportunity-300mw',
      },
    });
  });

  it('maps contact drawer submissions to an offer draft', async () => {
    const item = createFeedItem('REQUEST', 'opportunity-300mw');
    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();

    const stream = fixture.debugElement.query(By.directive(FeedStreamStubComponent)).componentInstance as FeedStreamStubComponent;
    stream.contactItem.emit(item);
    fixture.detectChanges();

    const drawer = fixture.debugElement.query(By.directive(OpportunityOfferDrawerStubComponent))
      .componentInstance as OpportunityOfferDrawerStubComponent;
    drawer.submitted.emit(createOfferPayload());
    await fixture.whenStable();

    expect(feed.publishDraft).toHaveBeenCalledTimes(1);
    const publishedDraft = feed.publishDraft.calls.mostRecent().args[0] as FeedComposerDraft;
    expect(publishedDraft.type).toBe('OFFER');
    expect(publishedDraft.title).toContain('Item opportunity-300mw');
    expect(publishedDraft.summary).toContain('340 MW');
    expect(publishedDraft.summary).toContain('term-sheet.pdf');
    expect(publishedDraft.mode).toBe('IMPORT');
    expect(publishedDraft.fromProvinceId).toBe('qc');
    expect(publishedDraft.toProvinceId).toBe('on');
    expect(publishedDraft.quantity).toEqual({ value: 340, unit: 'MW' });
    expect(opportunityOffers.create).toHaveBeenCalledWith({
      opportunityId: 'opportunity-300mw',
      opportunityTitle: 'Item opportunity-300mw',
      opportunityRoute: '/feed',
      recipientKind: 'PARTNER',
      recipientLabel: 'Grid Ops',
      capacityMw: 340,
      startDate: '2026-01-20',
      endDate: '2026-02-18',
      pricingModel: 'spot',
      comment: 'Firm import block for winter peak support.',
      attachmentName: 'term-sheet.pdf',
    });
    expect(notifications.success).toHaveBeenCalledWith('feed.opportunity.detail.offer.status.successReference', {
      source: 'feed',
      metadata: {
        action: 'create-opportunity-offer',
        itemId: 'opportunity-300mw',
        offerId: 'offer-record-1',
        offerReference: 'OG7-OFR-20260120-AB12',
      },
    });
  });

  it('surfaces an error toast when contact submission fails', async () => {
    feed.publishDraft.and.resolveTo({
      status: 'request-error',
      validation: {
        valid: true,
        errors: [],
        warnings: [],
      },
      error: 'feed.error.generic',
    });

    const item = createFeedItem('REQUEST', 'opportunity-300mw');
    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();

    const stream = fixture.debugElement.query(By.directive(FeedStreamStubComponent)).componentInstance as FeedStreamStubComponent;
    stream.contactItem.emit(item);
    fixture.detectChanges();

    const drawer = fixture.debugElement.query(By.directive(OpportunityOfferDrawerStubComponent))
      .componentInstance as OpportunityOfferDrawerStubComponent;
    const component = fixture.componentInstance as unknown as {
      contactSubmitState: () => 'idle' | 'submitting' | 'success' | 'error' | 'offline';
      contactSubmitError: () => string | null;
    };

    drawer.submitted.emit(createOfferPayload());
    await fixture.whenStable();

    expect(component.contactSubmitState()).toBe('error');
    expect(component.contactSubmitError()).toBe('feed.error.generic');
    expect(opportunityOffers.create).not.toHaveBeenCalled();
    expect(notifications.error).toHaveBeenCalledWith('feed.error.generic', {
      source: 'feed',
      metadata: {
        action: 'create-opportunity-offer',
        itemId: 'opportunity-300mw',
      },
    });
  });

  it('marks onboarding seen and focuses the publish section when compose is requested', () => {
    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();

    const stream = fixture.debugElement.query(By.directive(FeedStreamStubComponent)).componentInstance as FeedStreamStubComponent;
    const publishSection = fixture.debugElement.query(By.directive(FeedPublishSectionStubComponent))
      .componentInstance as FeedPublishSectionStubComponent;

    stream.composeRequested.emit();

    expect(feed.markOnboardingSeen).toHaveBeenCalledTimes(1);
    expect(publishSection.focusPrimaryAction).toHaveBeenCalledTimes(1);
  });

  it('opens the publish drawer from the keyboard shortcut P', () => {
    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const publishSection = fixture.debugElement.query(By.directive(FeedPublishSectionStubComponent))
      .componentInstance as FeedPublishSectionStubComponent;

    component.handleShortcuts(new KeyboardEvent('keydown', { key: 'p' }));

    expect(feed.markOnboardingSeen).toHaveBeenCalledTimes(1);
    expect(publishSection.focusPrimaryAction).toHaveBeenCalledTimes(1);
  });
});

describe('FeedPage shared-link hydration', () => {
  let feed: FeedRealtimeServiceMock;
  let router: jasmine.SpyObj<Router>;
  let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let routeData$: BehaviorSubject<Record<string, unknown>>;

  beforeEach(async () => {
    resetSharedFeedFilters();
    feed = new FeedRealtimeServiceMock();
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'getCurrentNavigation']);
    router.navigate.and.resolveTo(true);
    router.getCurrentNavigation.and.returnValue(null);
    Object.defineProperty(router, 'url', {
      configurable: true,
      get: () => '/feed?formKey=energy-surplus-offer&fromProvince=qc',
    });

    queryParamMap$ = new BehaviorSubject(
      convertToParamMap({
        formKey: 'energy-surplus-offer',
        fromProvince: 'qc',
      })
    );
    routeData$ = new BehaviorSubject<Record<string, unknown>>({});
    applySharedFeedFiltersFromQuery(queryParamMap$.value);

    const routeStub: Pick<ActivatedRoute, 'queryParamMap' | 'data' | 'snapshot'> = {
      queryParamMap: queryParamMap$.asObservable(),
      data: routeData$.asObservable(),
      get snapshot() {
        return { queryParamMap: queryParamMap$.value, data: routeData$.value } as ActivatedRoute['snapshot'];
      },
    };

    await TestBed.configureTestingModule({
      imports: [FeedPage, TranslateModule.forRoot()],
      providers: [
        { provide: FeedRealtimeService, useValue: feed },
        { provide: FavoritesService, useValue: new FavoritesServiceMock() },
        { provide: OpportunityOffersService, useValue: new OpportunityOffersServiceMock() },
        { provide: NotificationStore, useValue: { success: jasmine.createSpy(), info: jasmine.createSpy(), error: jasmine.createSpy() } },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: Store, useClass: StoreMock },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: signal(true).asReadonly(),
          } as Pick<AuthService, 'isAuthenticated'>,
        },
      ],
    })
      .overrideComponent(Og7FeedStreamComponent, {
        set: {
          imports: [CommonModule, FormsModule, TranslateModule],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .overrideComponent(FeedPage, {
        set: {
          imports: [
            CommonModule,
            TranslateModule,
            FeedPublishSectionStubComponent,
            Og7FeedStreamComponent,
            OpportunityOfferDrawerStubComponent,
            HydrocarbonSignalsPanelStubComponent,
          ],
        },
      })
      .compileComponents();

    const store = TestBed.inject(Store) as unknown as StoreMock;
    store.setProvinces([{ id: 'qc', name: 'Quebec' }]);
    store.setSectors([{ id: 'energy', name: 'Energy' }]);

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      'fr',
      {
        feed: {
          title: 'Flux',
          subtitle: 'Sous-titre',
          shortcuts: {
            title: 'Raccourcis',
            description: 'Description',
            publish: 'Publier',
            refresh: 'Actualiser',
            loadMore: 'Charger plus',
            closeDrawer: 'Fermer',
          },
          filters: {
            search: 'Recherche',
            searchPlaceholder: 'Chercher',
            type: 'Type',
            allTypes: 'Tous les types',
            sector: 'Secteur',
            allSectors: 'Tous les secteurs',
            template: 'Gabarit',
            allTemplates: 'Tous les gabarits',
            fromProvince: 'Origine',
            toProvince: 'Destination',
            allProvinces: 'Toutes les provinces',
            mode: 'Mode',
            clear: 'Effacer',
            unknownTemplate: 'Gabarit personnalise',
            sort: {
              label: 'Tri',
              newest: 'Plus recent',
              urgency: 'Urgence',
              volume: 'Volume',
              credibility: 'Credibilite',
            },
          },
          stream: {
            refresh: 'Reessayer',
            filters: 'Filtres actifs',
            loading: 'Chargement',
          },
          status: {
            online: 'En ligne',
            degraded: 'Degrade',
            offline: 'Hors ligne',
            reconnecting: 'Reconnexion',
          },
          mode: {
            both: 'Import et export',
            export: 'Export',
            import: 'Import',
          },
          publishBar: {
            templates: {
              energySurplusOffer: {},
              industrialLoadFlexRequest: {},
              coldChainCapacityOffer: {},
            },
          },
        },
        forms: {
          energySurplus: {
            title: 'Surplus d energie',
          },
          industrialLoadFlex: {
            title: 'Flexibilite industrielle',
          },
          coldChainCapacity: {
            title: 'Capacite chaine du froid',
          },
        },
      },
      true
    );
    translate.use('fr');
  });

  afterEach(() => {
    resetSharedFeedFilters();
  });

  it('rehydrates the template filter selection from a shared link without rewriting the URL', async () => {
    const fixture = TestBed.createComponent(FeedPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const templateSelect = host.querySelector('#feed-form-key') as HTMLSelectElement;
    const fromSelect = host.querySelector('#feed-from') as HTMLSelectElement;

    expect(templateSelect.selectedOptions[0]?.textContent?.trim()).toBe('Surplus d energie');
    expect(fromSelect.selectedOptions[0]?.textContent?.trim()).toBe('Quebec');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
