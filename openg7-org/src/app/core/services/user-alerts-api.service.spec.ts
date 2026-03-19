import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../config/environment.tokens';
import { SUPPRESS_ERROR_TOAST } from '../http/error.interceptor.tokens';

import { UserAlertsApiService } from './user-alerts-api.service';

describe('UserAlertsApiService', () => {
  let service: UserAlertsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UserAlertsApiService,
        { provide: API_URL, useValue: 'https://cms.local' },
      ],
    });

    service = TestBed.inject(UserAlertsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('suppresses the global error toast when refreshing in-app alerts', () => {
    service.listMine().subscribe();

    const request = httpMock.expectOne('https://cms.local/api/users/me/alerts');
    expect(request.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();
  });
});
