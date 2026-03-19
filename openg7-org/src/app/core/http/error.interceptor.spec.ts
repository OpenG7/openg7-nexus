import { HttpContext, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { throwError } from 'rxjs';

import { AuthRedirectService } from '../auth/auth-redirect.service';
import { AuthService } from '../auth/auth.service';
import { NotificationStore, NotificationStoreApi } from '../observability/notification.store';

import { errorInterceptor } from './error.interceptor';
import { SUPPRESS_ERROR_TOAST } from './error.interceptor.tokens';

describe('errorInterceptor', () => {
  let notifications: NotificationStoreApi;
  let translate: TranslateService;
  let auth: { handleUnauthorizedSession: jasmine.Spy };
  let authRedirect: jasmine.SpyObj<AuthRedirectService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>(
      'Router',
      ['navigate', 'getCurrentNavigation'],
      { url: '/profile' }
    );
    router.navigate.and.resolveTo(true);
    router.getCurrentNavigation.and.returnValue(null);
    authRedirect = jasmine.createSpyObj<AuthRedirectService>('AuthRedirectService', ['setRedirectUrl']);
    auth = {
      handleUnauthorizedSession: jasmine.createSpy('handleUnauthorizedSession').and.returnValue(false),
    };
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        NotificationStore,
        { provide: Router, useValue: router },
        { provide: AuthRedirectService, useValue: authRedirect },
        { provide: AuthService, useValue: auth },
      ],
    });
    notifications = TestBed.inject(NotificationStore) as NotificationStoreApi;
    translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      errors: {
        generic: 'generic',
        404: 'not found',
        '404WithResource': 'not found for {{ resource }}',
        statusTitle: 'http error {{ status }}',
      },
      auth: { sessionExpired: 'session expired' },
    });
    translate.use('en');
  });

  it('uses i18n and toast service for http errors', () => {
    spyOn(notifications, 'error');
    const req = new HttpRequest('GET', '/test');
    const handler = () =>
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }));
    TestBed.runInInjectionContext(() =>
      errorInterceptor(req, handler).subscribe({ error: () => {} })
    );
    expect(notifications.error).toHaveBeenCalledWith(
      'not found for test',
      jasmine.objectContaining({
        title: 'http error 404',
        source: 'http',
        metadata: jasmine.objectContaining({ status: 404 }),
      })
    );
  });

  it('skips toast notification when the request opts out', () => {
    spyOn(notifications, 'error');
    const req = new HttpRequest('GET', '/test').clone({
      context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
    });
    const handler = () =>
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' }));
    TestBed.runInInjectionContext(() =>
      errorInterceptor(req, handler).subscribe({ error: () => {} })
    );
    expect(notifications.error).not.toHaveBeenCalled();
    expect(auth.handleUnauthorizedSession).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('clears session and emits a dedicated toast when authenticated requests return 401', () => {
    spyOn(notifications, 'error');
    spyOn(notifications, 'info');
    auth.handleUnauthorizedSession.and.returnValue(true);

    const req = new HttpRequest('GET', '/protected');
    const handler = () =>
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));

    TestBed.runInInjectionContext(() =>
      errorInterceptor(req, handler).subscribe({ error: () => {} })
    );

    expect(auth.handleUnauthorizedSession).toHaveBeenCalled();
    expect(authRedirect.setRedirectUrl).toHaveBeenCalledWith('/profile');
    expect(router.navigate).toHaveBeenCalledWith(
      ['/login'],
      jasmine.objectContaining({
        queryParams: jasmine.objectContaining({
          reason: 'session-expired',
          redirect: '/profile',
        }),
        replaceUrl: true,
      })
    );
    expect(notifications.info).toHaveBeenCalledWith(
      'session expired',
      jasmine.objectContaining({
        source: 'auth',
        metadata: jasmine.objectContaining({ status: 401, reason: 'session-expired' }),
      })
    );
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('does not force a redirect when already on the login route', () => {
    spyOn(notifications, 'info');
    auth.handleUnauthorizedSession.and.returnValue(true);
    Object.defineProperty(router, 'url', { value: '/login', configurable: true });

    const req = new HttpRequest('GET', '/protected');
    const handler = () =>
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));

    TestBed.runInInjectionContext(() =>
      errorInterceptor(req, handler).subscribe({ error: () => {} })
    );

    expect(authRedirect.setRedirectUrl).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(notifications.info).toHaveBeenCalled();
  });
});
