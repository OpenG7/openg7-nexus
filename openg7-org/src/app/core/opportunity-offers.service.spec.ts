import { PLATFORM_ID, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth/auth.service';
import {
  CreateOpportunityOfferPayload,
  OpportunityOffersService,
} from './opportunity-offers.service';

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

    TestBed.configureTestingModule({
      providers: [
        OpportunityOffersService,
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
  patch: Partial<CreateOpportunityOfferPayload> = {}
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
