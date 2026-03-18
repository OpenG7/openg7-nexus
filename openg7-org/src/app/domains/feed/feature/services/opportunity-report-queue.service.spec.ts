import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { OpportunityReportQueueService } from './opportunity-report-queue.service';

const STORAGE_KEY = 'og7.opportunity-report-queue';

describe('OpportunityReportQueueService', () => {
  let service: OpportunityReportQueueService;

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);

    TestBed.configureTestingModule({
      providers: [
        OpportunityReportQueueService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(OpportunityReportQueueService);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('queues reports and exposes the latest pending report for an opportunity', () => {
    const first = service.queueReport({
      itemId: 'offer-001',
      itemTitle: 'Firm export block',
      route: '/feed/opportunities/offer-001',
      payload: {
        reason: 'incorrect',
        comment: 'Capacity does not match the attached source.',
      },
    });

    const second = service.queueReport({
      itemId: 'offer-001',
      itemTitle: 'Firm export block',
      route: '/feed/opportunities/offer-001',
      payload: {
        reason: 'duplicate',
        comment: 'This offer duplicates another active listing.',
      },
    });

    expect(service.latestPendingForOpportunity('offer-001')?.id).toBe(second.id);
    expect(first.id).not.toBe(second.id);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Array<{ id: string }>;
    expect(stored.map(entry => entry.id)).toEqual([second.id, first.id]);
  });
});
