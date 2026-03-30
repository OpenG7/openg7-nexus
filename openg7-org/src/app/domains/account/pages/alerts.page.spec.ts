import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import {
  IndicatorAlertRuleRecord,
  IndicatorAlertRulesService,
} from '@app/core/indicator-alert-rules.service';
import {
  OpportunityOfferRecord,
  OpportunityOffersService,
} from '@app/core/opportunity-offers.service';
import { UserAlertRecord } from '@app/core/services/user-alerts-api.service';
import { UserAlertsService } from '@app/core/user-alerts.service';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { AlertsPage } from './alerts.page';

class UserAlertsServiceMock {
  private readonly entriesSig = signal<UserAlertRecord[]>([]);
  readonly loading = signal(false).asReadonly();
  readonly generating = signal(false).asReadonly();
  readonly markAllReadPending = signal(false).asReadonly();
  readonly clearReadPending = signal(false).asReadonly();
  readonly error = signal<string | null>(null).asReadonly();
  readonly entries = this.entriesSig.asReadonly();
  readonly hasEntries = computed(() => this.entriesSig().length > 0);
  readonly unreadCount = computed(() => this.entriesSig().filter((entry) => !entry.isRead).length);
  readonly pendingById = signal<Record<string, boolean>>({}).asReadonly();

  readonly refresh = jasmine.createSpy('refresh');
  readonly generateFromSavedSearches = jasmine.createSpy('generateFromSavedSearches');
  readonly markAllRead = jasmine.createSpy('markAllRead');
  readonly clearRead = jasmine.createSpy('clearRead');
  readonly markRead = jasmine.createSpy('markRead');
  readonly remove = jasmine.createSpy('remove');

  setEntries(entries: UserAlertRecord[]): void {
    this.entriesSig.set(entries);
  }
}

class IndicatorAlertRulesServiceMock {
  private readonly entriesSig = signal<IndicatorAlertRuleRecord[]>([]);
  readonly entries = this.entriesSig.asReadonly();
  readonly hasEntries = computed(() => this.entriesSig().length > 0);

  readonly refresh = jasmine.createSpy('refresh');
  readonly create = jasmine.createSpy('create');
  readonly setActive = jasmine.createSpy('setActive');
  readonly remove = jasmine.createSpy('remove');

  setEntries(entries: IndicatorAlertRuleRecord[]): void {
    this.entriesSig.set(entries);
  }
}

class OpportunityOffersServiceMock {
  private readonly entriesSig = signal<OpportunityOfferRecord[]>([]);
  readonly entries = this.entriesSig.asReadonly();
  readonly hasEntries = computed(() => this.entriesSig().length > 0);

  readonly refresh = jasmine.createSpy('refresh');
  readonly create = jasmine.createSpy('create');
  readonly markInDiscussion = jasmine.createSpy('markInDiscussion');
  readonly markPartiallyServed = jasmine.createSpy('markPartiallyServed');
  readonly withdraw = jasmine.createSpy('withdraw');

  setEntries(entries: OpportunityOfferRecord[]): void {
    this.entriesSig.set(entries);
  }
}

describe('AlertsPage', () => {
  let alerts: UserAlertsServiceMock;
  let indicatorRules: IndicatorAlertRulesServiceMock;
  let opportunityOffers: OpportunityOffersServiceMock;
  let router: jasmine.SpyObj<Router>;
  let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    alerts = new UserAlertsServiceMock();
    indicatorRules = new IndicatorAlertRulesServiceMock();
    opportunityOffers = new OpportunityOffersServiceMock();
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl', 'navigate']);
    queryParamMap$ = new BehaviorSubject(convertToParamMap({}));

    alerts.setEntries([
      {
        id: 'user-alert-1',
        title: 'Ontario market alert',
        message: 'Spot electricity prices rose by 12%.',
        severity: 'warning',
        sourceType: 'saved-search',
        sourceId: 'saved-search-1',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: '2026-02-01T10:00:00.000Z',
        updatedAt: '2026-02-01T10:00:00.000Z',
      },
    ]);

    indicatorRules.setEntries([
      {
        id: 'indicator-rule-1',
        indicatorId: 'indicator-spot-ontario',
        indicatorTitle: 'Spot electricity price up 12 percent',
        thresholdDirection: 'gt',
        thresholdValue: 25,
        window: '24h',
        frequency: 'hourly',
        notifyDelta: true,
        note: 'Watch evening peak',
        route: '/feed/indicators/indicator-spot-ontario',
        active: true,
        createdAt: '2026-02-01T10:05:00.000Z',
        updatedAt: '2026-02-01T10:05:00.000Z',
      },
    ]);

    opportunityOffers.setEntries([
      {
        id: 'offer-record-1',
        reference: 'OG7-OFR-20260201-AB12',
        opportunityId: 'request-001',
        opportunityTitle: 'Short-term import of 300 MW',
        opportunityRoute: '/feed/opportunities/request-001',
        recipientKind: 'GOV',
        recipientLabel: 'IESO Ontario',
        senderUserId: 'user-1',
        senderLabel: 'Alice Martin',
        senderEmail: 'alice@example.com',
        capacityMw: 320,
        startDate: '2026-01-15',
        endDate: '2026-02-15',
        pricingModel: 'spot',
        comment: 'Firm import block for winter peak support.',
        attachmentName: 'term-sheet.pdf',
        status: 'submitted',
        allocatedCapacityMw: null,
        remainingOpportunityCapacityMw: null,
        createdAt: '2026-02-01T10:10:00.000Z',
        updatedAt: '2026-02-01T10:10:00.000Z',
        submittedAt: '2026-02-01T10:10:00.000Z',
        withdrawnAt: null,
        activities: [
          {
            id: 'offer-activity-track-1',
            type: 'tracked',
            actor: 'system',
            createdAt: '2026-02-01T10:10:00.000Z',
          },
          {
            id: 'offer-activity-submit-1',
            type: 'submitted',
            actor: 'sender',
            createdAt: '2026-02-01T10:10:00.000Z',
          },
        ],
      },
    ]);

    await TestBed.configureTestingModule({
      imports: [AlertsPage, TranslateModule.forRoot()],
      providers: [
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap$.asObservable(),
            get snapshot() {
              return {
                queryParamMap: queryParamMap$.value,
              };
            },
          } as Pick<ActivatedRoute, 'queryParamMap' | 'snapshot'>,
        },
        { provide: UserAlertsService, useValue: alerts },
        { provide: IndicatorAlertRulesService, useValue: indicatorRules },
        { provide: OpportunityOffersService, useValue: opportunityOffers },
      ],
    }).compileComponents();
  });

  it('renders the indicator alert rules section', () => {
    const fixture = TestBed.createComponent(AlertsPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const item = root.querySelector('[data-og7=\"indicator-alert-rule-item\"]');

    expect(item).not.toBeNull();
    expect(root.textContent).toContain('Spot electricity price up 12 percent');
  });

  it('renders the submitted opportunity offers section', () => {
    const fixture = TestBed.createComponent(AlertsPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const item = root.querySelector('[data-og7=\"opportunity-offer-item\"]');

    expect(item).not.toBeNull();
    expect(root.textContent).toContain('OG7-OFR-20260201-AB12');
    expect(root.textContent).toContain('Short-term import of 300 MW');
    expect(root.textContent).toContain('Firm import block for winter peak support.');
  });

  it('toggles the local outbox tracking thread for an offer', () => {
    const fixture = TestBed.createComponent(AlertsPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const toggle = root.querySelector('[data-og7-id="opportunity-offer-toggle-thread"]') as HTMLButtonElement;
    expect(root.querySelector('[data-og7="opportunity-offer-thread"]')).toBeNull();

    toggle.click();
    fixture.detectChanges();

    const thread = root.querySelector('[data-og7="opportunity-offer-thread"]');
    const activities = root.querySelectorAll('[data-og7="opportunity-offer-activity"]');

    expect(thread).not.toBeNull();
    expect(activities.length).toBe(2);
  });

  it('exposes workflow actions for progressing an offer in the business relationship', () => {
    const fixture = TestBed.createComponent(AlertsPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const discussionButton = root.querySelector(
      '[data-og7-id="opportunity-offer-progress-discussion"]'
    ) as HTMLButtonElement;

    expect(discussionButton).not.toBeNull();

    discussionButton.click();
    fixture.detectChanges();

    expect(opportunityOffers.markInDiscussion).toHaveBeenCalledWith('offer-record-1');
  });

  it('auto-expands and highlights an offer targeted from the opportunity detail page', () => {
    queryParamMap$.next(convertToParamMap({ section: 'offers', offerId: 'offer-record-1' }));

    const fixture = TestBed.createComponent(AlertsPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const offerItem = root.querySelector('[data-og7="opportunity-offer-item"]') as HTMLElement;
    const thread = root.querySelector('[data-og7="opportunity-offer-thread"]');

    expect(offerItem.getAttribute('data-og7-highlighted')).toBe('true');
    expect(thread).not.toBeNull();
  });
});
