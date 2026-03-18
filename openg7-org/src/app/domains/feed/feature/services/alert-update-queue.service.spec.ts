import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AlertUpdateQueueService } from './alert-update-queue.service';

const STORAGE_KEY = 'og7.alert-update-queue';

describe('AlertUpdateQueueService', () => {
  let service: AlertUpdateQueueService;

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);

    TestBed.configureTestingModule({
      providers: [
        AlertUpdateQueueService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(AlertUpdateQueueService);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('queues updates and returns the latest pending report for an alert', () => {
    const first = service.queueUpdate({
      alertId: 'alert-001',
      alertTitle: 'Ice storm risk',
      route: '/feed/alerts/alert-001',
      payload: {
        reason: 'correction',
        summary: 'The icing forecast has been increased.',
        sourceUrl: 'https://weather.gc.ca',
      },
    });

    const second = service.queueUpdate({
      alertId: 'alert-001',
      alertTitle: 'Ice storm risk',
      route: '/feed/alerts/alert-001',
      payload: {
        reason: 'newSource',
        summary: 'A new public source confirms the revised threshold.',
        sourceUrl: 'https://example.test/source',
      },
    });

    expect(service.latestPendingForAlert('alert-001')?.id).toBe(second.id);
    expect(first.id).not.toBe(second.id);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Array<{ id: string }>;
    expect(stored.map(entry => entry.id)).toEqual([second.id, first.id]);
  });
});
