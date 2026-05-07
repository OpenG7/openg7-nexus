import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL, API_WITH_CREDENTIALS } from '@app/core/config/environment.tokens';
import { RuntimeConfigService } from '@app/core/config/runtime-config.service';

import { AdminQualityMatrixService } from './admin-quality-matrix.service';

describe('AdminQualityMatrixService', () => {
  let service: AdminQualityMatrixService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AdminQualityMatrixService,
        { provide: API_URL, useValue: '/api' },
        { provide: API_WITH_CREDENTIALS, useValue: true },
        {
          provide: RuntimeConfigService,
          useValue: {
            apiUrl: () => '/api',
            apiWithCredentials: () => true,
          },
        },
      ],
    });

    service = TestBed.inject(AdminQualityMatrixService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads the matrix snapshot with the shared credential defaults', () => {
    service.loadMatrix().subscribe();

    const req = http.expectOne('/api/api/admin/quality/matrix');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ data: { generatedAt: '2026-04-11T00:00:00.000Z', entries: [] } });
  });

  it('recalculates the matrix without sending cookie credentials', () => {
    service.recalculateMatrix('refresh-required', null).subscribe();

    const req = http.expectOne('/api/api/admin/quality/matrix/recalculate');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeFalse();
    expect(req.request.body).toEqual({ scope: 'refresh-required', entryId: null });
    req.flush({
      data: {
        generatedAt: '2026-04-11T00:00:00.000Z',
        scope: 'refresh-required',
        summary: {
          analyzedCount: 0,
          proposalCount: 0,
          unchangedCount: 0,
          blockedCount: 0,
        },
        entries: [],
      },
    });
  });

  it('applies a matrix proposal without sending cookie credentials', () => {
    service.applyMatrixProposal('advanced-discovery').subscribe();

    const req = http.expectOne('/api/api/admin/quality/matrix/apply-proposal');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeFalse();
    expect(req.request.body).toEqual({ entryId: 'advanced-discovery' });
    req.flush({
      data: {
        appliedAt: '2026-04-11T00:00:00.000Z',
        entry: {
          id: 'advanced-discovery',
          domain: 'Recherche et decouverte profonde',
          need: 'Need',
          summaryStatus: 'oui',
          businessStatus: 'oui',
          implementationStatus: 'oui',
          e2eStatus: 'oui',
          priority: 'moyenne',
          managementBucket: 'covered',
          needsProductWorkFirst: false,
          observedGap: 'Gap',
          nextMove: 'Move',
          evidence: [],
          reviewedAt: '2026-04-11',
          signalDispatch: {},
        },
        proposal: {
          entryId: 'advanced-discovery',
          domain: 'Recherche et decouverte profonde',
          result: 'proposal-review-required',
          confidence: 'high',
          current: {
            summaryStatus: 'partiel',
            businessStatus: 'partiel',
            implementationStatus: 'partiel',
            e2eStatus: 'partiel',
            managementBucket: 'proof-gap',
            needsProductWorkFirst: false,
          },
          proposed: {
            summaryStatus: 'oui',
            businessStatus: 'oui',
            implementationStatus: 'oui',
            e2eStatus: 'oui',
            managementBucket: 'covered',
            needsProductWorkFirst: false,
          },
          reasons: [],
          evidence: [],
          factualSignals: {
            reviewedAt: '2026-04-11',
            repoSignalAt: null,
            repoSignalCommit: null,
            repoSignalSource: null,
            latestDecisionAt: null,
          },
        },
      },
    });
  });
});