import { CommonModule } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { FavoritesService } from '@app/core/favorites.service';
import { NotificationStore } from '@app/core/observability/notification.store';
import { OpportunityOffersService } from '@app/core/opportunity-offers.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { OpportunityOfferPayload, OpportunityOfferSubmitState } from './components/opportunity-detail.models';
import { FeedPage } from './feed.page';
import { FeedComposerDraft, FeedItem } from './models/feed.models';
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
  readonly markOnboardingSeen = jasmine.createSpy('markOnboardingSeen');
  readonly publishDraft = jasmine.createSpy('publishDraft').and.resolveTo({
    status: 'success',
    validation: { valid: true, errors: [], warnings: [] },
  });
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

describe('FeedPage', () => {
  let feed: FeedRealtimeServiceMock;
  let favorites: FavoritesServiceMock;
  let opportunityOffers: OpportunityOffersServiceMock;
  let notifications: { success: jasmine.Spy; info: jasmine.Spy; error: jasmine.Spy };
  let router: jasmine.SpyObj<Router>;
  let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let authState: ReturnType<typeof signal<boolean>>;
  let currentUrl: string;

  beforeEach(async () => {
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
    authState = signal(true);

    const routeStub: Pick<ActivatedRoute, 'queryParamMap' | 'snapshot'> = {
      queryParamMap: queryParamMap$.asObservable(),
      get snapshot() {
        return { queryParamMap: queryParamMap$.value } as ActivatedRoute['snapshot'];
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

  it('routes indicator items to /feed/indicators/:id', () => {
    const fixture = TestBed.createComponent(FeedPage);
    const component = fixture.componentInstance;
    feed.items.set([createFeedItem('INDICATOR', 'indicator-spot-ontario')]);

    component.openItem('indicator-spot-ontario');

    expect(router.navigate).toHaveBeenCalledWith(['indicators', 'indicator-spot-ontario'], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParamsHandling: 'preserve',
    });
  });

  it('routes alert items to /feed/alerts/:id', () => {
    const fixture = TestBed.createComponent(FeedPage);
    const component = fixture.componentInstance;
    feed.items.set([createFeedItem('ALERT', 'alert-ice-storm')]);

    component.openItem('alert-ice-storm');

    expect(router.navigate).toHaveBeenCalledWith(['alerts', 'alert-ice-storm'], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParamsHandling: 'preserve',
    });
  });

  it('routes non-alert and non-indicator items to /feed/opportunities/:id', () => {
    const fixture = TestBed.createComponent(FeedPage);
    const component = fixture.componentInstance;
    feed.items.set([createFeedItem('REQUEST', 'opportunity-300mw')]);

    component.openItem('opportunity-300mw');

    expect(router.navigate).toHaveBeenCalledWith(['opportunities', 'opportunity-300mw'], {
      relativeTo: TestBed.inject(ActivatedRoute),
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
