import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { AuthRedirectService } from '@app/core/auth/auth-redirect.service';
import { AuthService } from '@app/core/auth/auth.service';
import { AnalyticsService } from '@app/core/observability/analytics.service';
import { NotificationStore, NotificationStoreApi } from '@app/core/observability/notification.store';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { SocialAuthButtonsComponent } from './social-auth-buttons.component';

describe('SocialAuthButtonsComponent', () => {
  let fixture: ComponentFixture<SocialAuthButtonsComponent>;
  let component: SocialAuthButtonsComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let authRedirect: jasmine.SpyObj<AuthRedirectService>;
  let notifications: jasmine.SpyObj<NotificationStoreApi>;
  let analytics: jasmine.SpyObj<AnalyticsService>;

  const translateInstant = (key: string, params?: Record<string, unknown>): string => {
    switch (key) {
      case 'auth.sso.microsoft':
      case 'auth.continueWithMicrosoft':
        return 'Continue with Microsoft';
      case 'auth.sso.google':
      case 'auth.continueWithGoogle':
        return 'Continue with Google';
      case 'auth.sso.progress':
        return `Redirecting to ${params?.['provider'] ?? ''}...`;
      case 'auth.errors.ssoStart':
        return 'We could not start the single sign-on flow. Please try again or use your password instead.';
      case 'auth.errors.api':
        return 'Unable to complete the request right now.';
      default:
        return key;
    }
  };

  const translateGet = (
    key: string | string[],
    params?: Record<string, unknown>
  ): Observable<string | Record<string, string>> => {
    if (Array.isArray(key)) {
      return of(Object.fromEntries(key.map((entry) => [entry, translateInstant(entry, params)])));
    }
    return of(translateInstant(key, params));
  };

  const translateMock = {
    instant: translateInstant,
    get: translateGet,
    stream: translateGet,
    onLangChange: of(),
    onTranslationChange: of(),
    onDefaultLangChange: of(),
    onFallbackLangChange: of(),
  } satisfies Partial<TranslateService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['loginWithOidc']);
    authRedirect = jasmine.createSpyObj<AuthRedirectService>('AuthRedirectService', [
      'consumeRedirectUrl',
      'setRedirectUrl',
    ]);
    notifications = jasmine.createSpyObj<NotificationStoreApi>('NotificationStoreApi', ['info', 'error']);
    analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['emit']);

    auth.loginWithOidc.and.resolveTo();
    authRedirect.consumeRedirectUrl.and.returnValue('/requested-destination');

    await TestBed.configureTestingModule({
      imports: [SocialAuthButtonsComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: AuthRedirectService, useValue: authRedirect },
        { provide: NotificationStore, useValue: notifications },
        { provide: AnalyticsService, useValue: analytics },
        { provide: TranslateService, useValue: translateMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SocialAuthButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts the SSO flow with instrumentation', () => {
    component['startSignIn']('microsoft');

    expect(component['inProgress']()).toBe('microsoft');
    expect(authRedirect.consumeRedirectUrl).toHaveBeenCalledWith('/profile');
    expect(auth.loginWithOidc).toHaveBeenCalledWith('microsoft', { redirectUrl: '/requested-destination' });
    expect(notifications.info).toHaveBeenCalledWith(
      'Redirecting to Continue with Microsoft...',
      { source: 'auth', metadata: { action: 'sso-start', provider: 'microsoft' } }
    );
    expect(analytics.emit).toHaveBeenCalledWith('auth_sso_attempt', {
      provider: 'microsoft',
      source: 'social-buttons',
    });
  });

  it('handles SSO errors with recovery instrumentation', fakeAsync(() => {
    const error = new Error('network down');
    auth.loginWithOidc.and.returnValue(Promise.reject(error));

    component['startSignIn']('google');
    flushMicrotasks();

    expect(component['inProgress']()).toBeNull();
    expect(authRedirect.setRedirectUrl).toHaveBeenCalledWith('/requested-destination');
    expect(notifications.error).toHaveBeenCalledWith(
      'We could not start the single sign-on flow. Please try again or use your password instead.',
      {
        source: 'auth',
        context: error,
        metadata: { action: 'sso-error', provider: 'google' },
        deliver: { email: true },
      }
    );
    expect(analytics.emit).toHaveBeenCalledWith('auth_sso_failed', {
      provider: 'google',
      source: 'social-buttons',
      message: 'network down',
    });
  }));
});
