import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { SUPPRESS_ERROR_TOAST } from '../../http/error.interceptor.tokens';

import { HeaderService } from './header.service';

describe('HeaderService', () => {
  let service: HeaderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        HeaderService,
        TransferState,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(HeaderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('suppresses the global error toast when loading header config with a fallback payload', () => {
    service.getHeader('fr');

    const request = httpMock.expectOne('/api/header?populate=deep&locale=fr');
    expect(request.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();
    request.flush({
      announcement: { enabled: false },
      search: { placeholder: 'Recherche' },
      locales: ['fr', 'en'],
    });
  });
});