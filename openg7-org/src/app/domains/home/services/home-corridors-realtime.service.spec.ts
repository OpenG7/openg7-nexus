import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_URL, FEATURE_FLAGS } from '@app/core/config/environment.tokens';
import { RuntimeConfigService } from '@app/core/config/runtime-config.service';
import { SUPPRESS_ERROR_TOAST } from '@app/core/http/error.interceptor.tokens';
import { HttpClientService } from '@app/core/http/http-client.service';

import { HomeCorridorsRealtimeService } from './home-corridors-realtime.service';

describe('HomeCorridorsRealtimeService', () => {
  let service: HomeCorridorsRealtimeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        HomeCorridorsRealtimeService,
        HttpClientService,
        { provide: API_URL, useValue: 'https://cms.local' },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: FEATURE_FLAGS, useValue: { homeCorridorsRealtimeMocks: false } },
        {
          provide: RuntimeConfigService,
          useValue: {
            apiUrl: () => 'https://cms.local',
            apiWithCredentials: () => false,
          },
        },
      ],
    });

    service = TestBed.inject(HomeCorridorsRealtimeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('suppresses the global error toast when realtime corridor data falls back to an empty snapshot', () => {
    service.loadSnapshot().subscribe();

    const request = httpMock.expectOne('https://cms.local/api/corridors/realtime');
    expect(request.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();
    request.flush({ items: [], status: { level: 'info' } });
  });
});