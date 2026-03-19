import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../config/environment.tokens';
import { SUPPRESS_ERROR_TOAST } from '../http/error.interceptor.tokens';

import { UserFavoritesApiService } from './user-favorites-api.service';

describe('UserFavoritesApiService', () => {
  let service: UserFavoritesApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UserFavoritesApiService,
        { provide: API_URL, useValue: 'https://cms.local' },
      ],
    });

    service = TestBed.inject(UserFavoritesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('suppresses the global error toast when loading remote favourites', () => {
    service.listMine().subscribe();

    const request = httpMock.expectOne('https://cms.local/api/users/me/favorites');
    expect(request.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();
  });
});
