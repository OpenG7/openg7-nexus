import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL, API_WITH_CREDENTIALS } from '../config/environment.tokens';

import { FeedActionsApiService } from './feed-actions-api.service';

describe('FeedActionsApiService', () => {
  let service: FeedActionsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'https://api.openg7.test' },
        { provide: API_WITH_CREDENTIALS, useValue: false },
      ],
    });

    service = TestBed.inject(FeedActionsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('posts feed actions with an idempotency key', () => {
    const payload = {
      targetType: 'opportunity' as const,
      targetId: 'opportunity-300mw',
      action: 'archive' as const,
      status: 'completed' as const,
      sourceRoute: '/feed/opportunities/opportunity-300mw',
      metadata: { reason: 'user-action' },
    };

    service.createMine(payload, { idempotencyKey: 'feed-action:archive:1' }).subscribe((record) => {
      expect(record.id).toBe('feed-action-1');
      expect(record.action).toBe('archive');
    });

    const request = http.expectOne('https://api.openg7.test/api/users/me/feed-actions');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe('feed-action:archive:1');
    expect(request.request.body).toEqual(payload);

    request.flush({
      data: {
        id: 'feed-action-1',
        ...payload,
        targetRoute: null,
        occurredAt: '2026-03-15T10:00:00.000Z',
        createdAt: '2026-03-15T10:00:00.000Z',
        updatedAt: '2026-03-15T10:00:00.000Z',
        correlationId: null,
        idempotencyKey: 'feed-action:archive:1',
      },
    });
  });

  it('lists current user feed actions with target filters', () => {
    service
      .listMine({ targetType: 'alert', targetId: 'alert-001', action: 'subscribe' })
      .subscribe((records) => {
        expect(records.length).toBe(1);
        expect(records[0]?.targetId).toBe('alert-001');
      });

    const request = http.expectOne(
      (req) => req.url === 'https://api.openg7.test/api/users/me/feed-actions',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('targetType')).toBe('alert');
    expect(request.request.params.get('targetId')).toBe('alert-001');
    expect(request.request.params.get('action')).toBe('subscribe');

    request.flush({
      data: [
        {
          id: 'feed-action-2',
          targetType: 'alert',
          targetId: 'alert-001',
          action: 'subscribe',
          status: 'completed',
          sourceRoute: '/feed/alerts/alert-001',
          targetRoute: null,
          metadata: null,
          occurredAt: '2026-03-15T10:00:00.000Z',
          createdAt: '2026-03-15T10:00:00.000Z',
          updatedAt: '2026-03-15T10:00:00.000Z',
          correlationId: null,
          idempotencyKey: null,
        },
      ],
    });
  });
});
