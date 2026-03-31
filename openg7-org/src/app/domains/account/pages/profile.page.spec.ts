import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '@app/core/auth/auth.service';
import { AuthUser } from '@app/core/auth/auth.types';
import { HttpClientService } from '@app/core/http/http-client.service';
import { NotificationStore, NotificationStoreApi } from '@app/core/observability/notification.store';
import { TranslateService } from '@ngx-translate/core';
import { Observable, Subject, of, throwError } from 'rxjs';

import { ProfilePage } from './profile.page';

class TranslateStub {
  readonly onTranslationChange = new Subject<void>();
  readonly onLangChange = new Subject<void>();
  readonly onFallbackLangChange = new Subject<void>();
  readonly onDefaultLangChange = new Subject<void>();
  readonly currentLang = 'en';
  readonly fallbackLang = 'en';

  getCurrentLang(): string {
    return this.currentLang;
  }

  getFallbackLang(): string {
    return this.fallbackLang;
  }

  instant(key: string): string {
    return key;
  }

  get(key: string): Observable<string> {
    return of(key);
  }

  getStreamOnTranslationChange(key: string): Observable<string> {
    return of(key);
  }

  stream(key: string): Observable<string> {
    return of(key);
  }
}

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  let component: ProfilePage;
  let auth: jasmine.SpyObj<AuthService>;
  let http: jasmine.SpyObj<HttpClientService>;
  let notifications: jasmine.SpyObj<NotificationStoreApi>;

  const profile: AuthUser = {
    id: 'user-1',
    email: 'user@example.com',
    roles: ['user'],
    firstName: 'Jane',
    lastName: 'Doe',
    jobTitle: 'Director',
    organization: 'OpenG7',
    phone: '+1 555-1000',
    avatarUrl: 'https://cdn.example.com/avatar.png',
    sectorPreferences: ['energy', 'agri'],
    provincePreferences: ['qc'],
    notificationPreferences: {
      emailOptIn: true,
      webhookUrl: 'https://hooks.example.com/og7',
      channels: {
        inApp: true,
        email: true,
        webhook: true,
      },
      filters: {
        severities: ['warning', 'critical'],
        sources: ['saved-search'],
      },
      frequency: 'daily-digest',
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '06:00',
        timezone: 'America/Toronto',
      },
    },
  };

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', [
      'getProfile',
      'getActiveSessions',
      'updateProfile',
      'changePassword',
      'requestEmailChange',
      'sendEmailConfirmation',
      'exportProfileData',
      'logoutOtherSessions',
    ]);
    http = jasmine.createSpyObj<HttpClientService>('HttpClientService', ['post']);
    notifications = jasmine.createSpyObj<NotificationStoreApi>('NotificationStore', [
      'success',
      'error',
      'updatePreferences',
    ]);

    auth.getProfile.and.returnValue(of(profile));
    auth.getActiveSessions.and.returnValue(
      of({
        version: 1,
        sessions: [
          {
            id: 'session-current',
            version: 1,
            createdAt: '2026-02-10T00:00:00.000Z',
            lastSeenAt: '2026-02-10T00:00:00.000Z',
            status: 'active',
            current: true,
            revokedAt: null,
            userAgent: 'Chrome',
            ipAddress: '203.0.113.2',
          },
        ],
      })
    );
    auth.updateProfile.and.returnValue(of(profile));
    auth.changePassword.and.returnValue(of({ jwt: 'next.jwt.token', user: profile }));
    auth.requestEmailChange.and.returnValue(
      of({ email: 'new@example.com', sent: true, accountStatus: 'emailNotConfirmed' })
    );
    auth.sendEmailConfirmation.and.returnValue(of({ email: profile.email, sent: true }));
    auth.exportProfileData.and.returnValue(
      of(new Blob([JSON.stringify({ id: profile.id })], { type: 'application/json' }))
    );
    auth.logoutOtherSessions.and.returnValue(
      of({
        jwt: 'rotated.jwt.token',
        user: profile,
        sessionsRevoked: 1,
        sessionVersion: 2,
        sessions: [
          {
            id: 'session-next',
            version: 2,
            createdAt: '2026-02-10T01:00:00.000Z',
            lastSeenAt: '2026-02-10T01:00:00.000Z',
            status: 'active',
            current: true,
            revokedAt: null,
            userAgent: 'Firefox',
            ipAddress: '198.51.100.9',
          },
        ],
      })
    );
    http.post.and.returnValue(of([{ url: '/uploads/avatar.png' }]));

    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: HttpClientService, useValue: http },
        { provide: NotificationStore, useValue: notifications },
        { provide: TranslateService, useClass: TranslateStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the profile on init and fills the form', () => {
    expect(auth.getProfile).toHaveBeenCalled();
    expect(auth.getActiveSessions).toHaveBeenCalled();
    const form = (component as any).form;

    expect(form.controls.firstName.value).toBe(profile.firstName);
    expect(form.controls.lastName.value).toBe(profile.lastName);
    expect(form.controls.jobTitle.value).toBe(profile.jobTitle);
    expect(form.controls.sectorPreferences.value).toBe('energy, agri');
    expect(form.controls.provincePreferences.value).toBe('qc');
    expect(form.controls.alertChannelInApp.value).toBeTrue();
    expect(form.controls.emailNotifications.value).toBeTrue();
    expect(form.controls.webhookNotifications.value).toBeTrue();
    expect(form.controls.notificationWebhook.value).toBe(
      'https://hooks.example.com/og7'
    );
    expect(form.controls.alertFrequency.value).toBe('daily-digest');
    expect(form.controls.alertSeverityWarning.value).toBeTrue();
    expect(form.controls.alertSeverityCritical.value).toBeTrue();
    expect(form.controls.alertSeverityInfo.value).toBeFalse();
    expect(form.controls.alertSourceSavedSearch.value).toBeTrue();
    expect(form.controls.alertSourceSystem.value).toBeFalse();
    expect(form.controls.quietHoursEnabled.value).toBeTrue();
    expect(form.controls.quietHoursStart.value).toBe('22:00');
    expect(form.controls.quietHoursEnd.value).toBe('06:00');
    expect(form.controls.quietHoursTimezone.value).toBe('America/Toronto');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-og7="user-profile-email"]')?.textContent).toContain(
      profile.email
    );
    expect(notifications.updatePreferences).toHaveBeenCalled();
  });

  it('submits the form and updates the profile', () => {
    const updated: AuthUser = {
      ...profile,
      firstName: 'Janet',
      avatarUrl: 'https://cdn.example.com/avatar-new.png',
      sectorPreferences: ['energy', 'mining'],
      provincePreferences: ['qc', 'on'],
    };

    auth.updateProfile.and.returnValue(of(updated));

    const form = (component as any).form;
    form.controls.firstName.setValue('Janet');
    form.controls.sectorPreferences.setValue('energy, mining');
    form.controls.provincePreferences.setValue('qc, on');
    form.controls.avatarUrl.setValue(updated.avatarUrl ?? '');
    form.controls.alertChannelInApp.setValue(true);
    form.controls.emailNotifications.setValue(false);
    form.controls.webhookNotifications.setValue(true);
    form.controls.notificationWebhook.setValue('https://hooks.example.com/new');
    form.controls.alertFrequency.setValue('instant');
    form.controls.alertSeverityInfo.setValue(true);
    form.controls.alertSeveritySuccess.setValue(false);
    form.controls.alertSeverityWarning.setValue(true);
    form.controls.alertSeverityCritical.setValue(false);
    form.controls.alertSourceSavedSearch.setValue(true);
    form.controls.alertSourceSystem.setValue(false);
    form.controls.quietHoursEnabled.setValue(true);
    form.controls.quietHoursStart.setValue('21:30');
    form.controls.quietHoursEnd.setValue('06:30');
    form.controls.quietHoursTimezone.setValue('America/Montreal');

    (component as any).onSubmit();

    expect(auth.updateProfile).toHaveBeenCalledWith({
      firstName: 'Janet',
      lastName: 'Doe',
      jobTitle: 'Director',
      organization: 'OpenG7',
      phone: '+1 555-1000',
      avatarUrl: updated.avatarUrl,
      sectorPreferences: ['energy', 'mining'],
      provincePreferences: ['qc', 'on'],
      notificationPreferences: {
        channels: {
          inApp: true,
          email: false,
          webhook: true,
        },
        filters: {
          severities: ['info', 'warning'],
          sources: ['saved-search'],
        },
        frequency: 'instant',
        quietHours: {
          enabled: true,
          start: '21:30',
          end: '06:30',
          timezone: 'America/Montreal',
        },
        emailOptIn: false,
        webhookUrl: 'https://hooks.example.com/new',
      },
    });

    expect(notifications.success).toHaveBeenCalledWith(
      'auth.profile.success',
      jasmine.objectContaining({ source: 'auth' })
    );
    expect(form.controls.firstName.value).toBe('Janet');
  });

  it('notifies the user when profile update fails', () => {
    auth.updateProfile.and.returnValue(throwError(() => new Error('fail')));

    const form = (component as any).form;
    form.controls.firstName.setValue('Error');

    (component as any).onSubmit();

    expect(notifications.error).toHaveBeenCalledWith(
      'auth.profile.error',
      jasmine.objectContaining({ source: 'auth' })
    );
  });

  it('clears and disables webhook when webhook notifications are turned off', () => {
    const form = (component as any).form;
    form.controls.notificationWebhook.setValue('https://hooks.example.com/new');

    form.controls.webhookNotifications.setValue(false);

    expect(form.controls.notificationWebhook.disabled).toBeTrue();
    expect(form.controls.notificationWebhook.value).toBe('');
  });

  it('does not submit when no severity is selected', () => {
    const form = (component as any).form;
    form.controls.alertSeverityInfo.setValue(false);
    form.controls.alertSeveritySuccess.setValue(false);
    form.controls.alertSeverityWarning.setValue(false);
    form.controls.alertSeverityCritical.setValue(false);

    (component as any).onSubmit();

    expect(auth.updateProfile).not.toHaveBeenCalled();
  });

  it('does not submit when form validation fails', () => {
    const form = (component as any).form;
    form.controls.phone.setValue('invalid phone');

    (component as any).onSubmit();

    expect(auth.updateProfile).not.toHaveBeenCalled();
    expect(form.controls.phone.invalid).toBeTrue();
  });

  it('changes password when the security form is valid', () => {
    const form = (component as any).passwordForm;
    form.controls.currentPassword.setValue('OldSecret123!');
    form.controls.password.setValue('NewSecret123!');
    form.controls.passwordConfirmation.setValue('NewSecret123!');

    (component as any).onChangePassword();

    expect(auth.changePassword).toHaveBeenCalledWith({
      currentPassword: 'OldSecret123!',
      password: 'NewSecret123!',
      passwordConfirmation: 'NewSecret123!',
    });
    expect(notifications.success).toHaveBeenCalledWith(
      'auth.profile.security.password.success',
      jasmine.objectContaining({ source: 'auth' })
    );
  });

  it('requests email change when the security form is valid', () => {
    const form = (component as any).emailChangeForm;
    form.controls.currentPassword.setValue('CurrentSecret123!');
    form.controls.email.setValue('new@example.com');

    (component as any).onRequestEmailChange();

    expect(auth.requestEmailChange).toHaveBeenCalledWith({
      currentPassword: 'CurrentSecret123!',
      email: 'new@example.com',
    });
    expect(notifications.success).toHaveBeenCalledWith(
      'auth.profile.security.emailChange.success',
      jasmine.objectContaining({ source: 'auth' })
    );
  });

  it('resends activation email when account is unconfirmed', () => {
    (component as any).profile.set({
      ...profile,
      confirmed: false,
      accountStatus: 'emailNotConfirmed',
    });

    (component as any).onSendActivationEmail();

    expect(auth.sendEmailConfirmation).toHaveBeenCalledWith({ email: profile.email });
    expect(notifications.success).toHaveBeenCalledWith(
      'auth.login.activationEmailSent',
      jasmine.objectContaining({ source: 'auth' })
    );
  });

  it('renders the pending activation state with a resend CTA', () => {
    (component as any).profile.set({
      ...profile,
      confirmed: false,
      accountStatus: 'emailNotConfirmed',
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('auth.profile.security.status.emailNotConfirmed');
    expect(compiled.querySelector('[data-og7="user-profile-resend-activation"]')).not.toBeNull();
  });

  it('renders the disabled state without a resend activation CTA', () => {
    (component as any).profile.set({
      ...profile,
      blocked: true,
      accountStatus: 'disabled',
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('auth.profile.security.status.disabled');
    expect(compiled.textContent).toContain('auth.errors.accountDisabled');
    expect(compiled.querySelector('[data-og7="user-profile-resend-activation"]')).toBeNull();
  });

  it('does not resend the activation email when the account is disabled', () => {
    (component as any).profile.set({
      ...profile,
      blocked: true,
      accountStatus: 'disabled',
    });

    (component as any).onSendActivationEmail();

    expect(auth.sendEmailConfirmation).not.toHaveBeenCalled();
  });

  it('uploads a profile picture file and updates avatarUrl', () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: dataTransfer.files });

    (component as any).onAvatarFileSelected({ target: input } as unknown as Event);

    expect(http.post).toHaveBeenCalledWith('/api/upload', jasmine.any(FormData));
    const form = (component as any).form;
    expect(form.controls.avatarUrl.value).toContain('/uploads/avatar.png');
    expect(notifications.success).toHaveBeenCalledWith(
      'auth.profile.avatar.uploadSuccess',
      jasmine.objectContaining({ source: 'auth' })
    );
  });

  it('exports account data and notifies success', () => {
    const downloadSpy = spyOn<any>(component, 'downloadProfileExport').and.stub();

    (component as any).onExportProfileData();

    expect(auth.exportProfileData).toHaveBeenCalled();
    expect(downloadSpy).toHaveBeenCalled();
    expect(notifications.success).toHaveBeenCalledWith(
      'auth.profile.security.exportData.success',
      jasmine.objectContaining({ source: 'auth' })
    );
  });

  it('logs out other sessions and updates the local session list', () => {
    (component as any).onLogoutOtherSessions();

    expect(auth.logoutOtherSessions).toHaveBeenCalled();
    expect(notifications.success).toHaveBeenCalledWith(
      'auth.profile.security.sessions.logoutOthersSuccess',
      jasmine.objectContaining({ source: 'auth' })
    );
    expect((component as any).sessions().length).toBe(1);
    expect((component as any).sessions()[0].current).toBeTrue();
  });

  it('rejects non-image avatar files before upload', () => {
    const file = new File(['not-image'], 'avatar.txt', { type: 'text/plain' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: dataTransfer.files });

    (component as any).onAvatarFileSelected({ target: input } as unknown as Event);

    expect(http.post).not.toHaveBeenCalled();
    expect(notifications.error).toHaveBeenCalledWith(
      'auth.profile.avatar.uploadInvalidType',
      jasmine.objectContaining({ source: 'auth' })
    );
  });
});
