import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from '@app/core/auth/auth.service';
import { AUTH_MODE } from '@app/core/config/environment.tokens';
import { NotificationStore } from '@app/core/observability/notification.store';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { RegisterPage } from './register.page';

class MockNotificationStore {
  success = jasmine.createSpy('success');
  info = jasmine.createSpy('info');
  error = jasmine.createSpy('error');
}

describe('RegisterPage', () => {
  let fixture: ComponentFixture<RegisterPage>;
  let component: RegisterPage;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;
  let navigateSpy: jasmine.Spy;
  const translateStub = {
    instant: (key: string) => key,
    get: (key: string) => of(key),
    stream: (key: string) => of(key),
    getCurrentLang: () => 'en',
    getFallbackLang: () => 'en',
    onLangChange: of({}),
    onTranslationChange: of({}),
    onFallbackLangChange: of({}),
    onDefaultLangChange: of({}),
  };

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', [
      'register',
      'ensureSessionRestored',
      'isAuthenticated',
    ]);
    auth.ensureSessionRestored.and.resolveTo();
    auth.isAuthenticated.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [RegisterPage, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: AUTH_MODE, useValue: 'hybrid' },
        { provide: NotificationStore, useClass: MockNotificationStore },
        { provide: TranslateService, useValue: translateStub },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(RegisterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('submits valid registration, resets the form and navigates to profile', () => {
    const payload = { email: 'new@example.com', password: 'Secur3!Pass' };
    auth.register.and.returnValue(
      of({ jwt: 'token', user: { id: '2', email: payload.email, roles: [] } })
    );

    const form = (component as any).form;
    form.setValue({ ...payload, confirmPassword: payload.password });

    (component as any).onSubmit();

    expect(auth.register).toHaveBeenCalledWith(payload);
    expect(navigateSpy).toHaveBeenCalledWith('/profile');
    expect(form.getRawValue()).toEqual({ email: '', password: '', confirmPassword: '' });
  });

  it('redirects to login when registration succeeds without JWT (email confirmation flow)', () => {
    const payload = { email: 'pending@example.com', password: 'Secur3!Pass' };
    auth.register.and.returnValue(
      of({ user: { id: '2', email: payload.email, role: { type: 'authenticated' } } })
    );

    const form = (component as any).form;
    form.setValue({ ...payload, confirmPassword: payload.password });

    (component as any).onSubmit();

    expect(auth.register).toHaveBeenCalledWith(payload);
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });

  it('surfaces duplicate email errors returned by Strapi', () => {
    const payload = { email: 'existing@example.com', password: 'Secur3!Pass' };
    const strapiError = new HttpErrorResponse({
      status: 400,
      error: { error: { message: 'Email or Username are already taken' } },
    });
    auth.register.and.returnValue(throwError(() => strapiError));

    const form = (component as any).form;
    form.setValue({ ...payload, confirmPassword: payload.password });

    (component as any).onSubmit();

    expect((component as any).apiError()).toBe('auth.errors.emailAlreadyExists');
  });

  it('redirects authenticated users away from /register on init', async () => {
    auth.isAuthenticated.and.returnValue(true);
    navigateSpy.calls.reset();

    const authenticatedFixture = TestBed.createComponent(RegisterPage);
    authenticatedFixture.detectChanges();
    await authenticatedFixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith('/profile');
  });
});
