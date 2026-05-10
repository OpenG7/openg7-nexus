import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL, API_WITH_CREDENTIALS } from '../config/environment.tokens';

import { OpportunityOffersApiService } from './opportunity-offers-api.service';

describe('OpportunityOffersApiService', () => {
  let service: OpportunityOffersApiService;
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

    service = TestBed.inject(OpportunityOffersApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('posts opportunity offers with an idempotency key', () => {
    const payload = {
      opportunityId: 'request-001',
      opportunityTitle: 'Short-term import of 300 MW',
      opportunityRoute: '/feed/opportunities/request-001',
      feedItemId: 'feed-offer-1',
      recipientKind: 'PARTNER' as const,
      recipientLabel: 'Hydro Desk',
      capacityMw: 320,
      startDate: '2026-01-15',
      endDate: '2026-02-15',
      pricingModel: 'spot',
      comment: 'Firm import block for winter peak support.',
      attachmentName: 'term-sheet.pdf',
      correlationId: 'operation-1',
    };

    service.createMine(payload, { idempotencyKey: 'operation-1:record' }).subscribe((record) => {
      expect(record.reference).toBe('OG7-OFR-20260115-AB12');
    });

    const request = http.expectOne('https://api.openg7.test/api/users/me/opportunity-offers');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe('operation-1:record');
    expect(request.request.body).toEqual(payload);

    request.flush({
      data: {
        id: 'offer-record-1',
        reference: 'OG7-OFR-20260115-AB12',
        ...payload,
        attachmentId: null,
        senderUserId: 'user-1',
        senderLabel: 'Open G7',
        senderEmail: 'user-1@openg7.test',
        status: 'submitted',
        allocatedCapacityMw: null,
        remainingOpportunityCapacityMw: null,
        createdAt: '2026-01-15T10:00:00.000Z',
        updatedAt: '2026-01-15T10:00:00.000Z',
        submittedAt: '2026-01-15T10:00:00.000Z',
        withdrawnAt: null,
        activities: [],
      },
    });
  });

  it('uploads opportunity offer attachments as multipart form data', () => {
    const file = new File(['%PDF-1.4'], 'term-sheet.pdf', { type: 'application/pdf' });

    service
      .uploadAttachment(file, { idempotencyKey: 'operation-1:attachment' })
      .subscribe((attachment) => {
        expect(attachment.id).toBe('upload-1');
        expect(attachment.scanStatus).toBe('passed');
      });

    const request = http.expectOne(
      'https://api.openg7.test/api/users/me/opportunity-offer-attachments',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe('operation-1:attachment');
    expect(request.request.body instanceof FormData).toBeTrue();
    const uploadedFile = (request.request.body as FormData).get('files') as File;
    expect(uploadedFile.name).toBe(file.name);
    expect(uploadedFile.type).toBe(file.type);

    request.flush({
      data: {
        id: 'upload-1',
        name: 'term-sheet.pdf',
        mime: 'application/pdf',
        size: 42,
        url: '/uploads/term-sheet.pdf',
        scanStatus: 'passed',
      },
    });
  });
});
