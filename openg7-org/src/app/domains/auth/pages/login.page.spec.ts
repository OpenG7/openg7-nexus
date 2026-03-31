import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthRedirectService } from '@app/core/auth/auth-redirect.service';
import { AuthService } from '@app/core/auth/auth.service';
import { LoginResponse } from '@app/core/auth/auth.types';
import { AUTH_MODE } from '@app/core/config/environment.tokens';
import { NotificationStore } from '@app/core/observability/notification.store';
import { TranslateService } from '@ngx-translate/core';
import { of, Subject, throwError } from 'rxjs';

import { LoginPage } from './login.page';

class MockNotificationStore {
  success = jasmine.createSpy('success');
  info = jasmine.createSpy('info');
  error = jasmine.createSpy('error');
}

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let component: LoginPage;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;
  let navigateByUrlSpy: jasmine.Spy;
  let notifications: MockNotificationStore;
  let authRedirect: jasmine.SpyObj<AuthRedirectService>;
  let activatedRouteMock: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };
  const translateStub = {
    instant: (key: string) => key,
    get: (key: string) => of(key),
    stream: (key: string) => of(key),
    getCurrentLang: () => 'en',
    getFallbackLang: () => 'en',
    onLangChange: new Subject<unknown>(),
    onTranslationChange: new Subject<unknown>(),
    onFallbackLangChange: new Subject<unknown>(),
    onDefaultLangChange: new Subject<unknown>(),
  };

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'sendEmailConfirmation']);
    authRedirect = jasmine.createSpyObj<AuthRedirectService>('AuthRedirectService', [
      'captureRedirectParam',
      'peekRedirectUrl',
      'consumeRedirectUrl',
    ]);
    authRedirect.peekRedirectUrl.and.returnValue('/profile');
    authRedirect.consumeRedirectUrl.and.returnValue('/profile');
    activatedRouteMock = {
      snapshot: {
        queryParamMap: convertToParamMap({}),
      },
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: AuthRedirectService, useValue: authRedirect },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: AUTH_MODE, useValue: 'hybrid' },
        { provide: NotificationStore, useClass: MockNotificationStore },
        { provide: TranslateService, useValue: translateStub },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    notifications = TestBed.inject(NotificationStore) as unknown as MockNotificationStore;
    navigateByUrlSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows an inline message when redirected after session expiration', () => {
    activatedRouteMock.snapshot.queryParamMap = convertToParamMap({ reason: 'session-expired' });

    const sessionExpiredFixture = TestBed.createComponent(LoginPage);
    sessionExpiredFixture.detectChanges();
    const sessionExpiredComponent = sessionExpiredFixture.componentInstance as any;

    expect(sessionExpiredComponent.loginNotice()).toBe('auth.sessionExpired');
    const notice = sessionExpiredFixture.nativeElement.querySelector(
      '[data-og7="auth-login-notice"]'
    ) as HTMLElement | null;
    expect(notice?.textContent ?? '').toContain('auth.sessionExpired');
  });

  it('captures the redirect query parameter and navigates back to it after login', () => {
    const redirectTarget = '/feed/opportunities/request-001';
    activatedRouteMock.snapshot.queryParamMap = convertToParamMap({ redirect: redirectTarget });
    authRedirect.peekRedirectUrl.and.returnValue(redirectTarget);
    authRedirect.consumeRedirectUrl.and.returnValue(redirectTarget);
    auth.login.and.returnValue(
      of({ jwt: 'token', user: { id: '1', email: 'user@example.com', roles: [] } })
    );

    const redirectFixture = TestBed.createComponent(LoginPage);
    redirectFixture.detectChanges();
    const redirectComponent = redirectFixture.componentInstance as any;
    const form = redirectComponent.form;
    form.setValue({ email: 'user@example.com', password: 'secret' });

    redirectComponent.onSubmit();

    expect(authRedirect.captureRedirectParam).toHaveBeenCalledWith(redirectTarget);
    expect(authRedirect.consumeRedirectUrl).toHaveBeenCalledWith('/profile');
    expect(navigateByUrlSpy).toHaveBeenCalledWith(redirectTarget);
  });

  it('submits valid credentials via AuthService then navigates to profile', () => {
    const credentials = { email: 'user@example.com', password: 'secret' };
    auth.login.and.returnValue(
      of({ jwt: 'token', user: { id: '1', email: credentials.email, roles: [] } })
    );

    const form = (component as any).form;
    form.setValue(credentials);

    (component as any).onSubmit();

    expect(auth.login).toHaveBeenCalledWith(credentials);
    expect(authRedirect.consumeRedirectUrl).toHaveBeenCalledWith('/profile');
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/profile');
  });

  it('disables the form while submission is in progress', () => {
    const credentials = { email: 'locked@example.com', password: 'secret' };
    const response$ = new Subject<LoginResponse>();
    auth.login.and.returnValue(response$.asObservable());

    const form = (component as any).form;
    form.setValue(credentials);

    (component as any).onSubmit();
    fixture.detectChanges();

    expect(form.disabled).withContext('form should be disabled during submission').toBeTrue();
    expect((component as any).loading()).toBeTrue();

    response$.next({
      jwt: 'token',
      user: { id: '1', email: credentials.email, roles: [] },
    });
    response$.complete();
    fixture.detectChanges();

    expect(form.disabled).withContext('form should be re-enabled after completion').toBeFalse();
    expect((component as any).loading()).toBeFalse();
  });

  it('sends activation email when account is disabled', () => {
    const email = 'inactive@example.com';
    auth.sendEmailConfirmation.and.returnValue(of({ email, sent: true }));

    const form = (component as any).form;
    form.setValue({ email, password: 'secret' });
    (component as any).apiError.set('auth.errors.accountDisabled');

    (component as any).onSendActivationEmail();

    expect(auth.sendEmailConfirmation).toHaveBeenCalledWith({ email });
    expect(notifications.success).toHaveBeenCalledWith(
      'auth.login.activationEmailSent',
      jasmine.objectContaining({ source: 'auth' })
    );
  });

  it('rejects activation email when email field is invalid', () => {
    const form = (component as any).form;
    form.setValue({ email: 'invalid-email', password: 'secret' });
    (component as any).apiError.set('auth.errors.accountDisabled');

    (component as any).onSendActivationEmail();

    expect(auth.sendEmailConfirmation).not.toHaveBeenCalled();
    expect(notifications.error).toHaveBeenCalledWith(
      'auth.errors.emailInvalid',
      jasmine.objectContaining({ source: 'auth' })
    );
  });

  it('maps generic 403 payload with invalid credential message to invalidCredentials', () => {
    const credentials = { email: 'user@example.com', password: 'wrong-password' };
    auth.login.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden',
            error: {
              error: {
                name: 'ForbiddenError',
                message: 'Invalid identifier or password',
              },
            },
          })
      )
    );

    const form = (component as any).form;
    form.setValue(credentials);

    (component as any).onSubmit();

    expect((component as any).apiError()).toBe('auth.errors.invalidCredentials');
    expect(notifications.error).toHaveBeenCalledWith(
      'auth.errors.invalidCredentials',
      jasmine.objectContaining({ source: 'auth' })
    );
  });

  it('maps generic forbidden errors to api fallback instead of accountDisabled', () => {
    const credentials = { email: 'user@example.com', password: 'wrong-password' };
    auth.login.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden',
            error: {
              error: {
                name: 'ForbiddenError',
              },
            },
          })
      )
    );

    const form = (component as any).form;
    form.setValue(credentials);

    (component as any).onSubmit();

    expect((component as any).apiError()).toBe('auth.errors.api');
    expect(notifications.error).toHaveBeenCalledWith(
      'auth.errors.api',
      jasmine.objectContaining({ source: 'auth' })
    );
  });

  it('maps email-not-confirmed errors and enables the activation email CTA', () => {
    auth.login.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden',
            error: {
              error: {
                message: 'Email is not confirmed',
              },
            },
          })
      )
    );

    const form = (component as any).form;
    form.setValue({ email: 'pending@example.com', password: 'secret' });

    (component as any).onSubmit();
    fixture.detectChanges();

    expect((component as any).apiError()).toBe('auth.errors.emailNotConfirmed');
    expect((component as any).canSendActivationEmail()).toBeTrue();
    expect(
      fixture.nativeElement.querySelector('[data-og7="auth-login-send-activation"]')
    ).not.toBeNull();
  });

  it('maps disabled-account errors without enabling the activation email CTA', () => {
    auth.login.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden',
            error: {
              error: {
                message: 'This account is disabled',
              },
            },
          })
      )
    );

    const form = (component as any).form;
    form.setValue({ email: 'disabled@example.com', password: 'secret' });

    (component as any).onSubmit();
    fixture.detectChanges();

    expect((component as any).apiError()).toBe('auth.errors.accountDisabled');
    expect((component as any).canSendActivationEmail()).toBeFalse();
    expect(
      fixture.nativeElement.querySelector('[data-og7="auth-login-send-activation"]')
    ).toBeNull();
  });

  it('maps activation email errors to a dedicated already-confirmed message', () => {
    const email = 'confirmed@example.com';
    auth.sendEmailConfirmation.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'already confirmed' } }))
    );

    const form = (component as any).form;
    form.setValue({ email, password: 'secret' });
    (component as any).apiError.set('auth.errors.emailNotConfirmed');

    (component as any).onSendActivationEmail();

    expect(notifications.error).toHaveBeenCalledWith(
      'auth.login.activationAlreadyConfirmed',
      jasmine.objectContaining({ source: 'auth' })
    );
  });
});
