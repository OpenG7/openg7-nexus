import { HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { TokenStorageService } from '../security/token-storage.service';

import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let tokenStorage: jasmine.SpyObj<TokenStorageService>;

  beforeEach(() => {
    tokenStorage = jasmine.createSpyObj<TokenStorageService>('TokenStorageService', ['getToken']);
    TestBed.configureTestingModule({
      providers: [{ provide: TokenStorageService, useValue: tokenStorage }],
    });
  });

  it('skips bearer injection for auth endpoints', (done) => {
    tokenStorage.getToken.and.resolveTo('jwt-token');
    const req = new HttpRequest('POST', '/api/auth/local', {});
    const next = jasmine.createSpy('next').and.returnValue(of(null));

    TestBed.runInInjectionContext(() =>
      authInterceptor(req, next).subscribe(() => {
        const forwarded = next.calls.mostRecent().args[0] as HttpRequest<unknown>;
        expect(forwarded.headers.has('Authorization')).toBeFalse();
        done();
      }),
    );
  });

  it('injects bearer token for non-auth endpoints', (done) => {
    tokenStorage.getToken.and.resolveTo('jwt-token');
    const req = new HttpRequest('GET', '/api/feed');
    const next = jasmine.createSpy('next').and.returnValue(of(null));

    TestBed.runInInjectionContext(() =>
      authInterceptor(req, next).subscribe(() => {
        const forwarded = next.calls.mostRecent().args[0] as HttpRequest<unknown>;
        expect(forwarded.headers.get('Authorization')).toBe('Bearer jwt-token');
        done();
      }),
    );
  });
});
