import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../config/environment.tokens';
import { SUPPRESS_ERROR_TOAST } from '../http/error.interceptor.tokens';

import { StatisticsService } from './statistics.service';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        StatisticsService,
        TransferState,
        { provide: API_URL, useValue: 'https://cms.local' },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(StatisticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('suppresses the global error toast when loading statistics with fallback support', () => {
    service.fetch().subscribe();

    const request = httpMock.expectOne(
      (pending) => pending.url === 'https://cms.local/api/statistics' && pending.params.get('scope') === 'interprovincial'
    );
    expect(request.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();
    request.flush({ data: { summaries: [], insights: [], snapshot: null, availablePeriods: [], availableProvinces: [], availableCountries: [] } });
  });
});