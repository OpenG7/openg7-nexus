import { PLATFORM_ID, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from './auth/auth.service';
import {
  CreateOpportunityOfferPayload,
  OpportunityOffersService,
} from './opportunity-offers.service';
import { OpportunityOffersApiService } from './services/opportunity-offers-api.service';

describe('OpportunityOffersService', () => {
  let authState: ReturnType<typeof signal<boolean>>;
  let userState: ReturnType<
    typeof signal<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    } | null>
  >;
  let offersApi: jasmine.SpyObj<OpportunityOffersApiService>;

  const createService = () => TestBed.inject(OpportunityOffersService);

  beforeEach(() => {
    authState = signal(false);
    userState = signal<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    } | null>(null);

    clearOpportunityOfferStorage();
    offersApi = jasmine.createSpyObj<OpportunityOffersApiService>('OpportunityOffersApiService', [
      'createMine',
      'listMine',
    ]);

    TestBed.configureTestingModule({
      providers: [
        OpportunityOffersService,
        { provide: OpportunityOffersApiService, useValue: offersApi },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: computed(() => authState()),
            user: userState.asReadonly(),
          } as Pick<AuthService, 'isAuthenticated' | 'user'>,
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
  });

  afterEach(() => {
    clearOpportunityOfferStorage();
  });

  it('creates and restores offers for the authenticated user', () => {
    authState.set(true);
    userState.set({
      id: 'user-1',
      email: 'user-1@openg7.test',
      firstName: 'Open',
      lastName: 'G7',
    });

    const service = createService();
    const created = service.create(createPayload());

    expect(service.entries().length).toBe(1);
    expect(service.entries()[0]?.id).toBe(created.id);
    expect(service.entries()[0]?.senderUserId).toBe('user-1');
    expect(service.entriesForOpportunity('request-001').length).toBe(1);

    service.refresh();

    expect(service.entries().length).toBe(1);
    expect(service.entries()[0]?.opportunityTitle).toBe('Short-term import of 300 MW');
    expect(service.entries()[0]?.senderEmail).toBe('user-1@openg7.test');
  });

  it('persists submitted offers remotely and mirrors the server record locally', async () => {
    authState.set(true);
    userState.set({
      id: 'user-1',
      email: 'user-1@openg7.test',
      firstName: 'Open',
      lastName: 'G7',
    });
    offersApi.createMine.and.returnValue(
      of({
        ...createPayload(),
        id: 'remote-offer-1',
        reference: 'OG7-OFR-20260115-REMOTE',
        opportunityRoute: '/feed/opportunities/request-001',
        feedItemId: 'feed-offer-1',
        recipientKind: 'PARTNER',
        senderUserId: 'user-1',
        senderLabel: 'Open G7',
        senderEmail: 'user-1@openg7.test',
        attachmentId: null,
        attachmentName: 'term-sheet.pdf',
        status: 'submitted',
        allocatedCapacityMw: null,
        remainingOpportunityCapacityMw: null,
        createdAt: '2026-01-15T10:00:00.000Z',
        updatedAt: '2026-01-15T10:00:00.000Z',
        submittedAt: '2026-01-15T10:00:00.000Z',
        withdrawnAt: null,
        activities: [],
        correlationId: 'corr-1',
        idempotencyKey: 'idem-1',
      }),
    );

    const service = createService();
    const record = await service.submit(createPayload(), {
      feedItemId: 'feed-offer-1',
      idempotencyKey: 'idem-1',
      correlationId: 'corr-1',
    });

    expect(offersApi.createMine).toHaveBeenCalledWith(
      {
        ...createPayload(),
        feedItemId: 'feed-offer-1',
        attachmentId: null,
        correlationId: 'corr-1',
      },
      {
        idempotencyKey: 'idem-1',
        suppressErrorToast: true,
      },
    );
    expect(record.id).toBe('remote-offer-1');
    expect(service.entries()[0]?.id).toBe('remote-offer-1');
    expect(service.entries()[0]?.feedItemId).toBe('feed-offer-1');
  });

  it('keeps offers partitioned by user id', () => {
    authState.set(true);
    userState.set({
      id: 'user-1',
      email: 'user-1@openg7.test',
      firstName: 'Open',
      lastName: 'G7',
    });

    const service = createService();
    service.create(createPayload());

    userState.set({
      id: 'user-2',
      email: 'user-2@openg7.test',
      firstName: 'Second',
      lastName: 'User',
    });
    service.refresh();
    expect(service.entries()).toEqual([]);

    userState.set({
      id: 'user-1',
      email: 'user-1@openg7.test',
      firstName: 'Open',
      lastName: 'G7',
    });
    service.refresh();
    expect(service.entries().length).toBe(1);
    expect(service.entries()[0]?.senderUserId).toBe('user-1');
  });

  it('withdraws an offer and keeps the activity trail sorted', () => {
    authState.set(true);
    userState.set({
      id: 'user-1',
      email: 'user-1@openg7.test',
      firstName: 'Open',
      lastName: 'G7',
    });

    const service = createService();
    const created = service.create(createPayload());

    const withdrawn = service.withdraw(created.id);

    expect(withdrawn).not.toBeNull();
    expect(withdrawn?.status).toBe('withdrawn');
    expect(withdrawn?.activities[0]?.type).toBe('withdrawn');
    expect(service.entries()[0]?.status).toBe('withdrawn');
  });

  it('progresses an offer into discussion and partial fulfilment', () => {
    authState.set(true);
    userState.set({
      id: 'user-1',
      email: 'user-1@openg7.test',
      firstName: 'Open',
      lastName: 'G7',
    });

    const service = createService();
    const created = service.create(createPayload());

    const discussed = service.markInDiscussion(created.id);
    expect(discussed?.status).toBe('inDiscussion');
    expect(discussed?.activities.some((activity) => activity.type === 'qualified')).toBeTrue();
    expect(discussed?.activities.some((activity) => activity.type === 'inDiscussion')).toBeTrue();

    const partiallyServed = service.markPartiallyServed(created.id, {
      allocatedCapacityMw: 200,
      remainingOpportunityCapacityMw: 100,
    });
    expect(partiallyServed?.status).toBe('partiallyServed');
    expect(partiallyServed?.allocatedCapacityMw).toBe(200);
    expect(partiallyServed?.remainingOpportunityCapacityMw).toBe(100);
    expect(partiallyServed?.activities[0]?.type).toBe('partiallyServed');
  });
});

function createPayload(
  patch: Partial<CreateOpportunityOfferPayload> = {},
): CreateOpportunityOfferPayload {
  return {
    opportunityId: 'request-001',
    opportunityTitle: 'Short-term import of 300 MW',
    opportunityRoute: '/feed/opportunities/request-001',
    recipientKind: 'PARTNER',
    recipientLabel: 'Hydro Desk',
    capacityMw: 280,
    startDate: '2026-01-15',
    endDate: '2026-01-29',
    pricingModel: 'spot',
    comment: 'Firm balancing block for the peak period.',
    attachmentName: 'term-sheet.pdf',
    ...patch,
  };
}

function clearOpportunityOfferStorage(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith('og7.opportunity-offers.v1')) {
      localStorage.removeItem(key);
    }
  }
}
