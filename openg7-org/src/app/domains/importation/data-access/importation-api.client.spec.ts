import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL, FEATURE_FLAGS } from '@app/core/config/environment.tokens';
import { SUPPRESS_ERROR_TOAST } from '@app/core/http/error.interceptor.tokens';

import { ImportationApiClient } from './importation-api.client';

describe('ImportationApiClient HTTP mode', () => {
  let service: ImportationApiClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ImportationApiClient,
        { provide: API_URL, useValue: 'https://cms.local' },
        { provide: FEATURE_FLAGS, useValue: {} },
      ],
    });

    service = TestBed.inject(ImportationApiClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('suppresses the global error toast for optional importation endpoints', () => {
    service.getSuppliers({
      periodGranularity: 'month',
      periodValue: null,
      originScope: 'global',
      originCodes: [],
      hsSections: [],
      compareMode: false,
      compareWith: null,
    }).subscribe();
    service.getRiskFlags({
      periodGranularity: 'month',
      periodValue: null,
      originScope: 'global',
      originCodes: [],
      hsSections: [],
      compareMode: false,
      compareWith: null,
    }).subscribe();
    service.getAnnotations().subscribe();
    service.getWatchlists().subscribe();
    service.getKnowledgeBase('fr').subscribe();

    const suppliersRequest = httpMock.expectOne((request) => request.url === 'https://cms.local/api/import-suppliers');
    expect(suppliersRequest.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();
    suppliersRequest.flush({ suppliers: [] });

    const riskFlagsRequest = httpMock.expectOne((request) => request.url === 'https://cms.local/api/import-risk-flags');
    expect(riskFlagsRequest.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();
    riskFlagsRequest.flush([]);

    const annotationsRequest = httpMock.expectOne((request) => request.url === 'https://cms.local/api/import-annotations');
    expect(annotationsRequest.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();
    annotationsRequest.flush({ annotations: [] });

    const watchlistsRequest = httpMock.expectOne((request) => request.url === 'https://cms.local/api/import-watchlists');
    expect(watchlistsRequest.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();
    watchlistsRequest.flush({ watchlists: [] });

    const knowledgeRequest = httpMock.expectOne((request) => request.url === 'https://cms.local/api/import-knowledge');
    expect(knowledgeRequest.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();
    knowledgeRequest.flush({ articles: [], cta: null });
  });
});

describe('ImportationApiClient mock mode', () => {
  let service: ImportationApiClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ImportationApiClient,
        { provide: API_URL, useValue: 'https://cms.local' },
        { provide: FEATURE_FLAGS, useValue: { importationMocks: true } },
      ],
    });

    service = TestBed.inject(ImportationApiClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('serves importation data from local mocks without issuing HTTP requests', () => {
    let flowsValue: unknown;
    let commoditiesValue: unknown;
    let knowledgeValue: unknown;

    service.getFlows({
      periodGranularity: 'month',
      periodValue: null,
      originScope: 'global',
      originCodes: [],
      hsSections: [],
      compareMode: false,
      compareWith: null,
    }).subscribe((value) => {
      flowsValue = value;
    });

    service.getCommodities({
      periodGranularity: 'month',
      periodValue: null,
      originScope: 'global',
      originCodes: [],
      hsSections: [],
      compareMode: false,
      compareWith: null,
    }).subscribe((value) => {
      commoditiesValue = value;
    });

    service.getKnowledgeBase('fr').subscribe((value) => {
      knowledgeValue = value;
    });

    httpMock.expectNone('https://cms.local/api/import-flows');
    httpMock.expectNone('https://cms.local/api/import-commodities');
    httpMock.expectNone('https://cms.local/api/import-knowledge');
    httpMock.expectNone('https://cms.local/api/import-annotations');
    httpMock.expectNone('https://cms.local/api/import-watchlists');

    expect(flowsValue).toEqual(
      jasmine.objectContaining({
        coverage: 0.91,
        dataProvider: 'OpenG7 importation mock set',
      })
    );
    expect(commoditiesValue).toEqual(
      jasmine.objectContaining({
        top: jasmine.any(Array),
        emerging: jasmine.any(Array),
        risk: jasmine.any(Array),
      })
    );
    expect(knowledgeValue).toEqual(
      jasmine.objectContaining({
        articles: jasmine.any(Array),
        cta: jasmine.objectContaining({ id: 'cta-fr' }),
      })
    );
  });

  it('updates watchlists from local mocks without issuing HTTP requests', () => {
    let watchlistValue: unknown;

    service.updateWatchlist('watch-pharma-g7', {
      name: 'Intrants pharma G7 plus',
    }).subscribe((value) => {
      watchlistValue = value;
    });

    httpMock.expectNone('https://cms.local/api/import-watchlists/watch-pharma-g7');

    expect(watchlistValue).toEqual(
      jasmine.objectContaining({
        id: 'watch-pharma-g7',
        name: 'Intrants pharma G7 plus',
      })
    );
  });
});