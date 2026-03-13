import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { FavoritesService } from '@app/core/favorites.service';
import { NotificationStore } from '@app/core/observability/notification.store';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { FeedComposerDraft, FeedItem } from '../models/feed.models';
import { FeedRealtimeService } from '../services/feed-realtime.service';
import { OpportunityConversationDraftsService } from '../services/opportunity-conversation-drafts.service';
import { OpportunityReportQueueService } from '../services/opportunity-report-queue.service';

import { FeedOpportunityDetailPage } from './feed-opportunity-detail.page';

class FeedRealtimeServiceMock {
  readonly items = signal<readonly FeedItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private readonly connectedSig = signal(true);
  readonly connectionState = {
    connected: this.connectedSig.asReadonly(),
    reconnecting: signal(false).asReadonly(),
    error: signal<string | null>(null).asReadonly(),
  };

  readonly findItemById = jasmine.createSpy('findItemById');
  readonly publishDraft = jasmine.createSpy('publishDraft').and.resolveTo({
    status: 'success',
    validation: { valid: true, errors: [], warnings: [] },
  });

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

class FavoritesServiceMock {
  private readonly listSig = signal<string[]>([]);

  readonly list = this.listSig.asReadonly();
  readonly refresh = jasmine.createSpy('refresh');
  readonly add = jasmine.createSpy('add').and.callFake((item: string) => {
    this.listSig.update(current => (current.includes(item) ? current : [...current, item]));
  });
  readonly remove = jasmine.createSpy('remove').and.callFake((item: string) => {
    this.listSig.update(current => current.filter(entry => entry !== item));
  });

  setItems(items: string[]): void {
    this.listSig.set(items);
  }
}

class OpportunityReportQueueServiceMock {
  readonly queueReport = jasmine.createSpy('queueReport').and.returnValue({
    id: 'report-1',
    itemId: 'opportunity-300mw',
    itemTitle: 'Short-term import of 300 MW',
    route: '/feed/opportunities/opportunity-300mw',
    reason: 'incorrect',
    comment: 'Incorrect route data.',
    createdAt: '2026-03-10T20:00:00.000Z',
    status: 'pending',
  });
}

class OpportunityConversationDraftsServiceMock {
  private readonly entriesSig = signal<Record<string, readonly { id: string; tab: 'questions' | 'offers' | 'history'; author: string; content: string; createdAt: string }[]>>({});

  messagesFor(itemId: string | null | undefined) {
    if (!itemId) {
      return [];
    }
    return this.entriesSig()[itemId] ?? [];
  }

  append(itemId: string, message: { id: string; tab: 'questions' | 'offers' | 'history'; author: string; content: string; createdAt: string }) {
    this.entriesSig.update(current => ({
      ...current,
      [itemId]: [message, ...(current[itemId] ?? [])],
    }));
  }

  setMessages(itemId: string, messages: readonly { id: string; tab: 'questions' | 'offers' | 'history'; author: string; content: string; createdAt: string }[]) {
    this.entriesSig.update(current => ({
      ...current,
      [itemId]: messages,
    }));
  }
}

function createOpportunityItem(id: string): FeedItem {
  return {
    id,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:05:00.000Z',
    type: 'REQUEST',
    sectorId: 'energy',
    title: 'Short-term import of 300 MW',
    summary: 'Need short-term import of 300 MW to secure winter peak.',
    fromProvinceId: 'qc',
    toProvinceId: 'on',
    mode: 'IMPORT',
    quantity: {
      value: 300,
      unit: 'MW',
    },
    urgency: 3,
    credibility: 2,
    tags: ['import', 'winter'],
    source: {
      kind: 'PARTNER',
      label: 'Hydro Desk',
    },
  };
}

describe('FeedOpportunityDetailPage', () => {
  let feed: FeedRealtimeServiceMock;
  let store: StoreMock;
  let favorites: FavoritesServiceMock;
  let reportQueue: OpportunityReportQueueServiceMock;
  let conversationDrafts: OpportunityConversationDraftsServiceMock;
  let notifications: { success: jasmine.Spy; error: jasmine.Spy };
  let router: jasmine.SpyObj<Router>;
  let routeParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let authState: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    feed = new FeedRealtimeServiceMock();
    store = new StoreMock();
    favorites = new FavoritesServiceMock();
    reportQueue = new OpportunityReportQueueServiceMock();
    conversationDrafts = new OpportunityConversationDraftsServiceMock();
    notifications = {
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error'),
    };
    authState = signal(true);
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'getCurrentNavigation']);
    router.navigate.and.resolveTo(true);
    router.getCurrentNavigation.and.returnValue(null);
    Object.defineProperty(router, 'url', {
      configurable: true,
      get: () => '/feed/opportunities/opportunity-300mw',
    });

    routeParamMap$ = new BehaviorSubject(convertToParamMap({ itemId: 'opportunity-300mw' }));
    const routeStub: Pick<ActivatedRoute, 'paramMap' | 'snapshot'> = {
      paramMap: routeParamMap$.asObservable(),
      snapshot: { paramMap: convertToParamMap({ itemId: 'opportunity-300mw' }) } as ActivatedRoute['snapshot'],
    };

    const item = createOpportunityItem('opportunity-300mw');
    feed.findItemById.and.resolveTo(item);
    feed.items.set([item]);

    await TestBed.configureTestingModule({
      imports: [FeedOpportunityDetailPage, TranslateModule.forRoot()],
      providers: [
        { provide: FeedRealtimeService, useValue: feed },
        { provide: Store, useValue: store },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: FavoritesService, useValue: favorites },
        { provide: OpportunityReportQueueService, useValue: reportQueue },
        { provide: OpportunityConversationDraftsService, useValue: conversationDrafts },
        { provide: NotificationStore, useValue: notifications },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: authState.asReadonly(),
          } as Pick<AuthService, 'isAuthenticated'>,
        },
      ],
    })
      .overrideComponent(FeedOpportunityDetailPage, {
        set: {
          imports: [],
          template: '',
        },
      })
      .compileComponents();
  });

  it('opens offer drawer and publishes mapped offer draft on submission', async () => {
    const fixture = TestBed.createComponent(FeedOpportunityDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      offerDrawerOpen: () => boolean;
      openOfferDrawer: () => void;
      handleOfferSubmitted: (payload: ReturnType<typeof createOfferPayload>) => void;
      offerSubmitState: () => 'idle' | 'submitting' | 'success' | 'error' | 'offline';
    };

    expect(component.offerDrawerOpen()).toBeFalse();
    component.openOfferDrawer();
    fixture.detectChanges();
    expect(component.offerDrawerOpen()).toBeTrue();

    component.handleOfferSubmitted(createOfferPayload());
    await fixture.whenStable();

    expect(feed.publishDraft).toHaveBeenCalledTimes(1);
    const publishedDraft = feed.publishDraft.calls.mostRecent().args[0] as FeedComposerDraft;
    expect(publishedDraft.type).toBe('OFFER');
    expect(publishedDraft.title).toContain('Short-term import of 300 MW');
    expect(publishedDraft.summary).toContain('320 MW');
    expect(publishedDraft.summary).toContain('term-sheet.pdf');
    expect(publishedDraft.mode).toBe('IMPORT');
    expect(publishedDraft.fromProvinceId).toBe('qc');
    expect(publishedDraft.toProvinceId).toBe('on');
    expect(publishedDraft.quantity).toEqual({ value: 320, unit: 'MW' });
    expect(component.offerSubmitState()).toBe('success');
  });

  it('redirects anonymous users to login instead of opening the offer drawer', async () => {
    authState.set(false);

    const fixture = TestBed.createComponent(FeedOpportunityDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      offerDrawerOpen: () => boolean;
      openOfferDrawer: () => void;
    };

    component.openOfferDrawer();

    expect(component.offerDrawerOpen()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirect: '/feed/opportunities/opportunity-300mw' },
    });
    expect(feed.publishDraft).not.toHaveBeenCalled();
  });

  it('persists saved state through FavoritesService when save action is triggered', async () => {
    const fixture = TestBed.createComponent(FeedOpportunityDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      saved: () => boolean;
      handleSaveToggle: () => void;
    };

    expect(component.saved()).toBeFalse();
    component.handleSaveToggle();
    expect(favorites.add).toHaveBeenCalledWith('opportunity:opportunity-300mw');
    expect(component.saved()).toBeTrue();
    component.handleSaveToggle();
    expect(favorites.remove).toHaveBeenCalledWith('opportunity:opportunity-300mw');
    expect(component.saved()).toBeFalse();
  });

  it('reflects an already saved opportunity from FavoritesService', async () => {
    favorites.setItems(['opportunity:opportunity-300mw']);

    const fixture = TestBed.createComponent(FeedOpportunityDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      saved: () => boolean;
    };

    expect(component.saved()).toBeTrue();
    expect(favorites.refresh).toHaveBeenCalled();
  });

  it('shares opportunity detail using clipboard fallback', async () => {
    const fixture = TestBed.createComponent(FeedOpportunityDetailPage);
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
      handleShare: () => Promise<void>;
    };

    try {
      await component.handleShare();
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

  it('changes qna tab and appends new reply in current tab', async () => {
    const fixture = TestBed.createComponent(FeedOpportunityDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      qnaTab: () => 'questions' | 'offers' | 'history';
      qnaMessages: () => readonly { tab: 'questions' | 'offers' | 'history'; content: string }[];
      setQnaTab: (tab: 'questions' | 'offers' | 'history') => void;
      handleQnaSubmit: (content: string) => void;
    };

    component.setQnaTab('history');
    expect(component.qnaTab()).toBe('history');

    component.handleQnaSubmit('Need validation from grid operator');
    fixture.detectChanges();

    const newMessage = component.qnaMessages().find(message => message.content === 'Need validation from grid operator');
    expect(newMessage?.tab).toBe('history');
  });

  it('hydrates qna messages from locally persisted conversation drafts', async () => {
    conversationDrafts.setMessages('opportunity-300mw', [
      {
        id: 'draft-1',
        tab: 'questions',
        author: 'You',
        content: 'Persisted local follow-up',
        createdAt: 'now',
      },
    ]);

    const fixture = TestBed.createComponent(FeedOpportunityDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      qnaMessages: () => readonly { content: string }[];
    };

    expect(component.qnaMessages().some(message => message.content === 'Persisted local follow-up')).toBeTrue();
  });

  it('navigates to alert detail when opening a related alert from context aside', async () => {
    const fixture = TestBed.createComponent(FeedOpportunityDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      openRelatedAlert: (alertId: string) => void;
    };

    component.openRelatedAlert('alert-001');
    expect(router.navigate).toHaveBeenCalledWith(['/feed', 'alerts', 'alert-001']);
  });

  it('maps export tag clicks to a deterministic feed filter', async () => {
    const fixture = TestBed.createComponent(FeedOpportunityDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      handleTagFilter: (tag: string) => void;
    };

    component.handleTagFilter('Export');

    expect(router.navigate).toHaveBeenCalledWith(['/feed'], {
      queryParams: { mode: 'EXPORT' },
    });
  });

  it('opens the report drawer and queues a structured report on submit', async () => {
    const fixture = TestBed.createComponent(FeedOpportunityDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      reportDrawerOpen: () => boolean;
      handleReport: () => void;
      handleReportSubmitted: (payload: { reason: 'incorrect'; comment: string }) => void;
      reportSubmitState: () => 'idle' | 'success' | 'error';
    };

    expect(component.reportDrawerOpen()).toBeFalse();
    component.handleReport();
    expect(component.reportDrawerOpen()).toBeTrue();

    component.handleReportSubmitted({
      reason: 'incorrect',
      comment: 'Route and quantity mismatch with source document.',
    });

    expect(reportQueue.queueReport).toHaveBeenCalledWith({
      itemId: 'opportunity-300mw',
      itemTitle: 'Short-term import of 300 MW',
      route: '/feed/opportunities/opportunity-300mw',
      payload: {
        reason: 'incorrect',
        comment: 'Route and quantity mismatch with source document.',
      },
    });
    expect(component.reportSubmitState()).toBe('success');
    expect(notifications.success).toHaveBeenCalled();
  });

  it('falls back to search query for unsupported tag shortcuts', async () => {
    const fixture = TestBed.createComponent(FeedOpportunityDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      handleTagFilter: (tag: string) => void;
    };

    component.handleTagFilter('Peak');

    expect(router.navigate).toHaveBeenCalledWith(['/feed'], {
      queryParams: { q: 'peak' },
    });
  });

  it('loads detail by id via service fallback when feed collection is unavailable', async () => {
    const item = createOpportunityItem('opportunity-fallback');
    feed.items.set([]);
    feed.findItemById.and.resolveTo(item);
    routeParamMap$.next(convertToParamMap({ itemId: 'opportunity-fallback' }));

    const fixture = TestBed.createComponent(FeedOpportunityDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      detailVm: () => { item: FeedItem } | null;
    };

    expect(feed.findItemById).toHaveBeenCalledWith('opportunity-fallback');
    expect(component.detailVm()?.item.id).toBe('opportunity-fallback');
  });
});

function createOfferPayload() {
  return {
    capacityMw: 320,
    startDate: '2026-01-15',
    endDate: '2026-02-15',
    pricingModel: 'spot',
    comment: 'Firm import block for winter peak support.',
    attachmentName: 'term-sheet.pdf',
  };
}
