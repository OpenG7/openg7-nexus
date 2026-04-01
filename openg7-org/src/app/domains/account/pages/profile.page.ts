import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { STRAPI_ROUTES } from '@app/core/api/strapi.routes';
import { AuthService } from '@app/core/auth/auth.service';
import {
  ActiveSessionRecord,
  AccountStatus,
  AlertFrequencyPreference,
  AlertSeverityPreference,
  AlertSourcePreference,
  AuthUser,
  ChangePasswordPayload,
  EmailChangePayload,
  UpdateProfilePayload,
} from '@app/core/auth/auth.types';
import { API_URL } from '@app/core/config/environment.tokens';
import { HttpClientService } from '@app/core/http/http-client.service';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';

interface UploadedAssetResponse {
  url?: string | null;
}

const ALERT_SEVERITY_OPTIONS: readonly AlertSeverityPreference[] = [
  'info',
  'success',
  'warning',
  'critical',
];
const ALERT_SOURCE_OPTIONS: readonly AlertSourcePreference[] = ['saved-search', 'system'];
const ALERT_FREQUENCY_DEFAULT: AlertFrequencyPreference = 'instant';
const QUIET_HOURS_TIMEZONE_FALLBACK = 'UTC';
const QUIET_HOURS_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function optionalUrlValidator(options: { httpsOnly?: boolean } = {}): ValidatorFn {
  return (control: AbstractControl<string | null>): ValidationErrors | null => {
    const raw = control.value;
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      return null;
    }

    try {
      const parsed = new URL(raw.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { invalidUrl: true };
      }
      if (options.httpsOnly && parsed.protocol !== 'https:') {
        return { invalidHttpsUrl: true };
      }
      return null;
    } catch {
      return { invalidUrl: true };
    }
  };
}

function optionalPhoneValidator(): ValidatorFn {
  return (control: AbstractControl<string | null>): ValidationErrors | null => {
    const raw = control.value;
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      return null;
    }

    return /^[+()0-9.\-\s]{7,24}$/.test(raw.trim()) ? null : { invalidPhone: true };
  };
}

function optionalTimezoneValidator(): ValidatorFn {
  return (control: AbstractControl<string | null>): ValidationErrors | null => {
    const raw = control.value;
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      return null;
    }

    const normalized = raw.trim();
    if (normalized.length > 80) {
      return { invalidTimezone: true };
    }

    try {
      new Intl.DateTimeFormat('en-US', { timeZone: normalized }).format(new Date());
      return null;
    } catch {
      return { invalidTimezone: true };
    }
  };
}

function csvListValidator(maxItems: number, maxItemLength: number): ValidatorFn {
  return (control: AbstractControl<string | null>): ValidationErrors | null => {
    const raw = control.value;
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      return null;
    }

    const entries = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    if (entries.length > maxItems) {
      return { listTooLong: true };
    }

    if (entries.some((entry) => entry.length > maxItemLength)) {
      return { listItemTooLong: true };
    }

    return null;
  };
}

function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl<string | null>): ValidationErrors | null => {
    const raw = control.value;
    if (typeof raw !== 'string' || raw.length === 0) {
      return null;
    }

    const hasUppercase = /[A-Z]/.test(raw);
    const hasLowercase = /[a-z]/.test(raw);
    const hasDigit = /[0-9]/.test(raw);
    const hasSymbol = /[^A-Za-z0-9]/.test(raw);

    return hasUppercase && hasLowercase && hasDigit && hasSymbol ? null : { weakPassword: true };
  };
}

function matchingPasswordsValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const passwordConfirmation = group.get('passwordConfirmation')?.value;

  if (typeof password !== 'string' || typeof passwordConfirmation !== 'string') {
    return null;
  }

  return password === passwordConfirmation ? null : { passwordMismatch: true };
}

@Component({
  standalone: true,
  selector: 'og7-profile-page',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.page.html',
})
/**
 * Contexte : Chargee par le routeur Angular pour afficher la page "Profile" du dossier "domains/account/pages".
 * Raison d'etre : Lie le template standalone et les dependances de cette page pour la rendre navigable.
 * @param dependencies Dependances injectees automatiquement par Angular.
 * @returns ProfilePage geree par le framework.
 */
export class ProfilePage {
  private readonly maxAvatarFileSizeBytes = 5 * 1024 * 1024;
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClientService);
  private readonly apiUrl = inject(API_URL, { optional: true });
  private readonly notifications = injectNotificationStore();
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly changingPassword = signal(false);
  protected readonly requestingEmailChange = signal(false);
  protected readonly sendingActivationEmail = signal(false);
  protected readonly exportingData = signal(false);
  protected readonly loadingSessions = signal(false);
  protected readonly loggingOutOtherSessions = signal(false);
  protected readonly uploadingAvatar = signal(false);
  protected readonly avatarUploadError = signal<string | null>(null);
  protected readonly avatarPreview = signal<string | null>(null);
  protected readonly alertSeveritySelectionError = signal(false);
  protected readonly alertSourceSelectionError = signal(false);
  protected readonly quietHoursConfigurationError = signal(false);
  protected readonly formDirty = signal(false);
  protected readonly formValid = signal(true);
  protected readonly passwordFormDirty = signal(false);
  protected readonly passwordFormValid = signal(false);
  protected readonly emailChangeFormDirty = signal(false);
  protected readonly emailChangeFormValid = signal(false);
  protected readonly profile = signal<AuthUser | null>(null);
  protected readonly sessions = signal<ActiveSessionRecord[]>([]);
  protected readonly hasOtherActiveSessions = computed(() =>
    this.sessions().some((session) => !session.current && session.status === 'active')
  );
  protected readonly accountStatus = computed<AccountStatus>(() => {
    const status = this.profile()?.accountStatus;
    return status ?? 'active';
  });
  protected readonly accountStatusKey = computed(() => {
    switch (this.accountStatus()) {
      case 'disabled':
        return 'auth.profile.security.status.disabled';
      case 'emailNotConfirmed':
        return 'auth.profile.security.status.emailNotConfirmed';
      default:
        return 'auth.profile.security.status.active';
    }
  });
  protected readonly accountStatusSelector = computed(() => {
    switch (this.accountStatus()) {
      case 'disabled':
        return 'account-status-disabled';
      case 'emailNotConfirmed':
        return 'account-status-email-not-confirmed';
      default:
        return 'account-status-active';
    }
  });
  protected readonly canResendActivation = computed(() => {
    const current = this.profile();
    return (
      Boolean(current?.email) &&
      this.accountStatus() === 'emailNotConfirmed' &&
      !this.loading() &&
      !this.sendingActivationEmail()
    );
  });
  protected readonly canSave = computed(() => {
    return !this.loading() && !this.saving() && this.formDirty() && this.formValid();
  });
  protected readonly canChangePassword = computed(() => {
    return (
      !this.loading() &&
      !this.changingPassword() &&
      this.passwordFormDirty() &&
      this.passwordFormValid()
    );
  });
  protected readonly canRequestEmailChange = computed(() => {
    return (
      !this.loading() &&
      !this.requestingEmailChange() &&
      this.emailChangeFormDirty() &&
      this.emailChangeFormValid()
    );
  });
  protected readonly hasUnsavedChanges = computed(() => {
    const hasDirtyForm =
      this.formDirty() || this.passwordFormDirty() || this.emailChangeFormDirty();
    const isBusy =
      this.saving() || this.changingPassword() || this.requestingEmailChange() || this.loading();
    return hasDirtyForm && !isBusy;
  });

  protected readonly form = this.fb.group({
    firstName: this.fb.nonNullable.control('', [Validators.maxLength(80)]),
    lastName: this.fb.nonNullable.control('', [Validators.maxLength(80)]),
    jobTitle: this.fb.nonNullable.control('', [Validators.maxLength(120)]),
    organization: this.fb.nonNullable.control('', [Validators.maxLength(120)]),
    phone: this.fb.nonNullable.control('', [optionalPhoneValidator()]),
    email: this.fb.control(
      { value: '', disabled: true },
      { nonNullable: true, validators: [Validators.required, Validators.email] }
    ),
    avatarUrl: this.fb.nonNullable.control('', [optionalUrlValidator()]),
    sectorPreferences: this.fb.nonNullable.control('', [csvListValidator(20, 40)]),
    provincePreferences: this.fb.nonNullable.control('', [csvListValidator(20, 20)]),
    alertChannelInApp: this.fb.nonNullable.control(true),
    emailNotifications: this.fb.nonNullable.control(false),
    webhookNotifications: this.fb.nonNullable.control(false),
    notificationWebhook: this.fb.nonNullable.control('', [optionalUrlValidator({ httpsOnly: true })]),
    alertFrequency: this.fb.nonNullable.control<AlertFrequencyPreference>(ALERT_FREQUENCY_DEFAULT),
    alertSeverityInfo: this.fb.nonNullable.control(true),
    alertSeveritySuccess: this.fb.nonNullable.control(true),
    alertSeverityWarning: this.fb.nonNullable.control(true),
    alertSeverityCritical: this.fb.nonNullable.control(true),
    alertSourceSavedSearch: this.fb.nonNullable.control(true),
    alertSourceSystem: this.fb.nonNullable.control(true),
    quietHoursEnabled: this.fb.nonNullable.control(false),
    quietHoursStart: this.fb.nonNullable.control(''),
    quietHoursEnd: this.fb.nonNullable.control(''),
    quietHoursTimezone: this.fb.nonNullable.control('', [optionalTimezoneValidator()]),
  });

  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(10), strongPasswordValidator()]],
      passwordConfirmation: ['', [Validators.required]],
    },
    { validators: [matchingPasswordsValidator] }
  );

  protected readonly emailChangeForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    this.syncWebhookAvailability(this.form.controls.webhookNotifications.value, false);
    this.syncQuietHoursAvailability(this.form.controls.quietHoursEnabled.value, false);
    this.syncAllFormStateSignals();

    this.form.controls.avatarUrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.avatarPreview.set(this.normalizeString(value)));

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncPrimaryFormStateSignals());
    this.form.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncPrimaryFormStateSignals());

    this.passwordForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncPasswordFormStateSignals());
    this.passwordForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncPasswordFormStateSignals());

    this.emailChangeForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncEmailChangeFormStateSignals());
    this.emailChangeForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncEmailChangeFormStateSignals());

    this.form.controls.webhookNotifications.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((enabled) => this.syncWebhookAvailability(Boolean(enabled), true));

    this.form.controls.quietHoursEnabled.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((enabled) => this.syncQuietHoursAvailability(Boolean(enabled), true));

    this.form.controls.alertSeverityInfo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.alertSeveritySelectionError.set(false));
    this.form.controls.alertSeveritySuccess.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.alertSeveritySelectionError.set(false));
    this.form.controls.alertSeverityWarning.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.alertSeveritySelectionError.set(false));
    this.form.controls.alertSeverityCritical.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.alertSeveritySelectionError.set(false));

    this.form.controls.alertSourceSavedSearch.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.alertSourceSelectionError.set(false));
    this.form.controls.alertSourceSystem.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.alertSourceSelectionError.set(false));

    this.form.controls.quietHoursStart.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.quietHoursConfigurationError.set(false));
    this.form.controls.quietHoursEnd.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.quietHoursConfigurationError.set(false));
    this.form.controls.quietHoursTimezone.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.quietHoursConfigurationError.set(false));

    this.fetchProfile(() => this.loading.set(false));
    this.fetchSessions({ notifyOnError: false });
  }

  protected buildInitials(user: AuthUser): string {
    const first = user.firstName?.trim().charAt(0) ?? '';
    const last = user.lastName?.trim().charAt(0) ?? '';
    if (first || last) {
      return `${first}${last}`.toUpperCase();
    }
    return user.email.charAt(0).toUpperCase();
  }

  protected onSubmit(): void {
    if (this.saving()) {
      return;
    }

    const raw = this.form.getRawValue();
    const selectedSeverities = this.extractSelectedSeverities(raw);
    const selectedSources = this.extractSelectedSources(raw);
    const quietHoursEnabled = Boolean(raw.quietHoursEnabled);
    const quietHoursStart = this.normalizeQuietHour(raw.quietHoursStart);
    const quietHoursEnd = this.normalizeQuietHour(raw.quietHoursEnd);
    const quietHoursTimezone = this.normalizeString(raw.quietHoursTimezone);

    const hasSeveritySelection = selectedSeverities.length > 0;
    const hasSourceSelection = selectedSources.length > 0;
    const hasQuietHoursConfiguration =
      !quietHoursEnabled || (Boolean(quietHoursStart) && Boolean(quietHoursEnd) && Boolean(quietHoursTimezone));

    this.alertSeveritySelectionError.set(!hasSeveritySelection);
    this.alertSourceSelectionError.set(!hasSourceSelection);
    this.quietHoursConfigurationError.set(!hasQuietHoursConfiguration);

    if (this.form.invalid || !hasSeveritySelection || !hasSourceSelection || !hasQuietHoursConfiguration) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: UpdateProfilePayload = {
      firstName: this.normalizeString(raw.firstName),
      lastName: this.normalizeString(raw.lastName),
      jobTitle: this.normalizeString(raw.jobTitle),
      organization: this.normalizeString(raw.organization),
      phone: this.normalizeString(raw.phone),
      avatarUrl: this.normalizeString(raw.avatarUrl),
      sectorPreferences: this.parseList(raw.sectorPreferences),
      provincePreferences: this.parseList(raw.provincePreferences),
      notificationPreferences: {
        channels: {
          inApp: Boolean(raw.alertChannelInApp),
          email: Boolean(raw.emailNotifications),
          webhook: Boolean(raw.webhookNotifications),
        },
        filters: {
          severities: selectedSeverities,
          sources: selectedSources,
        },
        frequency: raw.alertFrequency,
        quietHours: {
          enabled: quietHoursEnabled,
          start: quietHoursEnabled ? quietHoursStart : null,
          end: quietHoursEnabled ? quietHoursEnd : null,
          timezone: quietHoursEnabled ? quietHoursTimezone : null,
        },
        emailOptIn: Boolean(raw.emailNotifications),
        webhookUrl: Boolean(raw.webhookNotifications)
          ? this.normalizeString(raw.notificationWebhook)
          : null,
      },
    };

    this.saving.set(true);
    this.auth
      .updateProfile(payload)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (profile) => {
          this.applyProfile(profile);
          this.notifications.success(this.translate.instant('auth.profile.success'), {
            source: 'auth',
            metadata: { action: 'profile-update' },
          });
        },
        error: (error) => {
          const message = this.translate.instant('auth.profile.error');
          this.notifications.error(message, {
            source: 'auth',
            context: error,
            metadata: { action: 'profile-update' },
            deliver: { email: true },
          });
        },
      });
  }

  protected onChangePassword(): void {
    if (this.changingPassword()) {
      return;
    }

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const raw = this.passwordForm.getRawValue();
    if (raw.currentPassword === raw.password) {
      this.passwordForm.controls.password.setErrors({ sameAsCurrent: true });
      this.passwordForm.controls.password.markAsTouched();
      return;
    }

    const payload: ChangePasswordPayload = {
      currentPassword: raw.currentPassword,
      password: raw.password,
      passwordConfirmation: raw.passwordConfirmation,
    };

    this.changingPassword.set(true);
    this.auth
      .changePassword(payload)
      .pipe(
        finalize(() => this.changingPassword.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.resetPasswordForm();
          this.notifications.success(this.translate.instant('auth.profile.security.password.success'), {
            source: 'auth',
            metadata: { action: 'change-password' },
          });
        },
        error: (error) => {
          this.notifications.error(
            this.resolveErrorMessage(error, 'auth.profile.security.password.error'),
            {
              source: 'auth',
              context: error,
              metadata: { action: 'change-password' },
              deliver: { email: true },
            }
          );
        },
      });
  }

  protected onRequestEmailChange(): void {
    if (this.requestingEmailChange()) {
      return;
    }

    if (this.emailChangeForm.invalid) {
      this.emailChangeForm.markAllAsTouched();
      return;
    }

    const currentEmail = this.profile()?.email?.toLowerCase() ?? null;
    const raw = this.emailChangeForm.getRawValue();
    const nextEmail = raw.email.trim().toLowerCase();

    if (currentEmail === nextEmail) {
      this.emailChangeForm.controls.email.setErrors({ sameAsCurrent: true });
      this.emailChangeForm.controls.email.markAsTouched();
      return;
    }

    const payload: EmailChangePayload = {
      currentPassword: raw.currentPassword,
      email: nextEmail,
    };

    this.requestingEmailChange.set(true);
    this.auth
      .requestEmailChange(payload)
      .pipe(
        finalize(() => this.requestingEmailChange.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.resetEmailChangeForm();
          this.notifications.success(this.translate.instant('auth.profile.security.emailChange.success'), {
            source: 'auth',
            metadata: { action: 'email-change-request' },
          });
          this.refreshProfile();
        },
        error: (error) => {
          this.notifications.error(
            this.resolveErrorMessage(error, 'auth.profile.security.emailChange.error'),
            {
              source: 'auth',
              context: error,
              metadata: { action: 'email-change-request' },
              deliver: { email: true },
            }
          );
        },
      });
  }

  protected onSendActivationEmail(): void {
    if (!this.canResendActivation()) {
      return;
    }

    const email = this.profile()?.email?.trim();
    if (!email) {
      return;
    }

    this.sendingActivationEmail.set(true);
    this.auth
      .sendEmailConfirmation({ email })
      .pipe(
        finalize(() => this.sendingActivationEmail.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.notifications.success(this.translate.instant('auth.login.activationEmailSent'), {
            source: 'auth',
            metadata: { action: 'profile-send-email-confirmation' },
          });
        },
        error: (error) => {
          this.notifications.error(this.resolveActivationEmailError(error), {
            source: 'auth',
            context: error,
            metadata: { action: 'profile-send-email-confirmation' },
          });
        },
      });
  }

  protected onExportProfileData(): void {
    if (this.loading() || this.exportingData()) {
      return;
    }

    this.exportingData.set(true);
    this.auth
      .exportProfileData()
      .pipe(
        finalize(() => this.exportingData.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (blob) => {
          if (!(blob instanceof Blob) || blob.size === 0) {
            this.notifications.error(
              this.translate.instant('auth.profile.security.exportData.error'),
              {
                source: 'auth',
                metadata: { action: 'profile-export-data' },
              }
            );
            return;
          }

          this.downloadProfileExport(blob);
          this.notifications.success(
            this.translate.instant('auth.profile.security.exportData.success'),
            {
              source: 'auth',
              metadata: { action: 'profile-export-data' },
            }
          );
        },
        error: (error) => {
          this.notifications.error(
            this.resolveErrorMessage(error, 'auth.profile.security.exportData.error'),
            {
              source: 'auth',
              context: error,
              metadata: { action: 'profile-export-data' },
              deliver: { email: true },
            }
          );
        },
      });
  }

  protected onRefreshSessions(): void {
    if (this.loadingSessions() || this.loggingOutOtherSessions()) {
      return;
    }

    this.fetchSessions({ notifyOnError: true });
  }

  protected onLogoutOtherSessions(): void {
    if (this.loading() || this.loggingOutOtherSessions()) {
      return;
    }

    this.loggingOutOtherSessions.set(true);
    this.auth
      .logoutOtherSessions()
      .pipe(
        finalize(() => this.loggingOutOtherSessions.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          const revokedCount =
            typeof response.sessionsRevoked === 'number' && Number.isFinite(response.sessionsRevoked)
              ? response.sessionsRevoked
              : 0;
          this.sessions.set(Array.isArray(response.sessions) ? response.sessions : []);
          this.notifications.success(
            this.translate.instant('auth.profile.security.sessions.logoutOthersSuccess', {
              count: revokedCount,
            }),
            {
              source: 'auth',
              metadata: { action: 'profile-logout-other-sessions', revokedCount },
            }
          );
          if (!Array.isArray(response.sessions)) {
            this.fetchSessions({ notifyOnError: false });
          }
        },
        error: (error) => {
          this.notifications.error(
            this.resolveErrorMessage(error, 'auth.profile.security.sessions.logoutOthersError'),
            {
              source: 'auth',
              context: error,
              metadata: { action: 'profile-logout-other-sessions' },
              deliver: { email: true },
            }
          );
        },
      });
  }

  protected resetPendingChanges(): void {
    const profile = this.profile();
    if (!profile || this.saving()) {
      return;
    }
    this.applyProfile(profile);
    this.resetPasswordForm();
    this.resetEmailChangeForm();
  }

  public hasPendingChanges(): boolean {
    return this.hasUnsavedChanges();
  }

  protected onAvatarPreviewError(): void {
    this.avatarPreview.set(null);
  }

  protected onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0);
    if (!file || this.uploadingAvatar()) {
      if (input) {
        input.value = '';
      }
      return;
    }

    this.avatarUploadError.set(null);
    const validationError = this.validateAvatarFile(file);
    if (validationError) {
      this.avatarUploadError.set(validationError);
      this.notifications.error(this.translate.instant(validationError), {
        source: 'auth',
        metadata: { action: 'profile-avatar-upload-validation' },
      });
      if (input) {
        input.value = '';
      }
      return;
    }

    const payload = new FormData();
    payload.append('files', file, file.name);

    this.uploadingAvatar.set(true);
    this.http
      .post<UploadedAssetResponse[]>(STRAPI_ROUTES.upload.files, payload)
      .pipe(
        finalize(() => {
          this.uploadingAvatar.set(false);
          if (input) {
            input.value = '';
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (files) => {
          const uploaded = Array.isArray(files) && files.length > 0 ? files[0] : null;
          const normalizedUrl = this.resolveUploadedAvatarUrl(uploaded?.url ?? null);
          if (!normalizedUrl) {
            this.avatarUploadError.set('auth.profile.avatar.uploadMalformed');
            this.notifications.error(this.translate.instant('auth.profile.avatar.uploadMalformed'), {
              source: 'auth',
              metadata: { action: 'profile-avatar-upload-response' },
            });
            return;
          }

          this.form.controls.avatarUrl.setValue(normalizedUrl);
          this.form.controls.avatarUrl.markAsDirty();
          this.form.controls.avatarUrl.markAsTouched();
          this.form.controls.avatarUrl.updateValueAndValidity();
          this.avatarPreview.set(normalizedUrl);
          this.avatarUploadError.set(null);

          this.notifications.success(this.translate.instant('auth.profile.avatar.uploadSuccess'), {
            source: 'auth',
            metadata: { action: 'profile-avatar-upload' },
          });
        },
        error: (error) => {
          const fallbackKey = 'auth.profile.avatar.uploadError';
          this.avatarUploadError.set(fallbackKey);
          this.notifications.error(this.resolveErrorMessage(error, fallbackKey), {
            source: 'auth',
            context: error,
            metadata: { action: 'profile-avatar-upload' },
            deliver: { email: true },
          });
        },
      });
  }

  private fetchSessions(options: { notifyOnError: boolean }): void {
    this.loadingSessions.set(true);
    this.auth
      .getActiveSessions()
      .pipe(
        finalize(() => this.loadingSessions.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (snapshot) => {
          this.sessions.set(Array.isArray(snapshot.sessions) ? snapshot.sessions : []);
        },
        error: (error) => {
          this.sessions.set([]);
          if (!options.notifyOnError) {
            return;
          }
          this.notifications.error(
            this.resolveErrorMessage(error, 'auth.profile.security.sessions.error'),
            {
              source: 'auth',
              context: error,
              metadata: { action: 'profile-session-refresh' },
            }
          );
        },
      });
  }

  private fetchProfile(onFinalize?: () => void): void {
    this.auth
      .getProfile()
      .pipe(
        finalize(() => onFinalize?.()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (profile) => this.applyProfile(profile),
        error: (error) => {
          const message = this.translate.instant('auth.profile.error');
          this.notifications.error(message, {
            source: 'auth',
            context: error,
            metadata: { action: 'profile-load' },
            deliver: { email: true },
          });
        },
      });
  }

  private refreshProfile(): void {
    this.fetchProfile();
  }

  private applyProfile(profile: AuthUser): void {
    this.profile.set(profile);
    const preferences = this.resolveNotificationPreferences(profile);

    this.form.patchValue(
      {
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        jobTitle: profile.jobTitle ?? '',
        organization: profile.organization ?? '',
        phone: profile.phone ?? '',
        email: profile.email ?? '',
        avatarUrl: profile.avatarUrl ?? '',
        sectorPreferences: this.joinList(profile.sectorPreferences),
        provincePreferences: this.joinList(profile.provincePreferences),
        alertChannelInApp: preferences.channels.inApp,
        emailNotifications: preferences.channels.email,
        webhookNotifications: preferences.channels.webhook,
        notificationWebhook: preferences.webhookUrl ?? '',
        alertFrequency: preferences.frequency,
        alertSeverityInfo: preferences.filters.severities.includes('info'),
        alertSeveritySuccess: preferences.filters.severities.includes('success'),
        alertSeverityWarning: preferences.filters.severities.includes('warning'),
        alertSeverityCritical: preferences.filters.severities.includes('critical'),
        alertSourceSavedSearch: preferences.filters.sources.includes('saved-search'),
        alertSourceSystem: preferences.filters.sources.includes('system'),
        quietHoursEnabled: preferences.quietHours.enabled,
        quietHoursStart: preferences.quietHours.start ?? '',
        quietHoursEnd: preferences.quietHours.end ?? '',
        quietHoursTimezone: preferences.quietHours.timezone ?? '',
      },
      { emitEvent: false }
    );

    this.avatarPreview.set(this.normalizeString(profile.avatarUrl));
    this.alertSeveritySelectionError.set(false);
    this.alertSourceSelectionError.set(false);
    this.quietHoursConfigurationError.set(false);
    this.syncWebhookAvailability(preferences.channels.webhook, true);
    this.syncQuietHoursAvailability(preferences.quietHours.enabled, true);
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.syncPrimaryFormStateSignals();
    this.notifications.updatePreferences(this.buildNotificationPreferences(profile));
  }

  private syncAllFormStateSignals(): void {
    this.syncPrimaryFormStateSignals();
    this.syncPasswordFormStateSignals();
    this.syncEmailChangeFormStateSignals();
  }

  private syncPrimaryFormStateSignals(): void {
    this.formDirty.set(this.form.dirty);
    this.formValid.set(this.form.valid);
  }

  private syncPasswordFormStateSignals(): void {
    this.passwordFormDirty.set(this.passwordForm.dirty);
    this.passwordFormValid.set(this.passwordForm.valid);
  }

  private syncEmailChangeFormStateSignals(): void {
    this.emailChangeFormDirty.set(this.emailChangeForm.dirty);
    this.emailChangeFormValid.set(this.emailChangeForm.valid);
  }

  private syncWebhookAvailability(enabled: boolean, clearWhenDisabled: boolean): void {
    const webhookControl = this.form.controls.notificationWebhook;

    if (!enabled) {
      if (clearWhenDisabled) {
        webhookControl.setValue('', { emitEvent: false });
      }
      webhookControl.disable({ emitEvent: false });
      webhookControl.updateValueAndValidity({ emitEvent: false });
      return;
    }

    webhookControl.enable({ emitEvent: false });
    webhookControl.updateValueAndValidity({ emitEvent: false });
  }

  private syncQuietHoursAvailability(enabled: boolean, clearWhenDisabled: boolean): void {
    const startControl = this.form.controls.quietHoursStart;
    const endControl = this.form.controls.quietHoursEnd;
    const timezoneControl = this.form.controls.quietHoursTimezone;

    if (!enabled) {
      if (clearWhenDisabled) {
        startControl.setValue('', { emitEvent: false });
        endControl.setValue('', { emitEvent: false });
        timezoneControl.setValue('', { emitEvent: false });
      }
      startControl.disable({ emitEvent: false });
      endControl.disable({ emitEvent: false });
      timezoneControl.disable({ emitEvent: false });
      startControl.updateValueAndValidity({ emitEvent: false });
      endControl.updateValueAndValidity({ emitEvent: false });
      timezoneControl.updateValueAndValidity({ emitEvent: false });
      return;
    }

    startControl.enable({ emitEvent: false });
    endControl.enable({ emitEvent: false });
    timezoneControl.enable({ emitEvent: false });

    if (!this.normalizeString(timezoneControl.value)) {
      timezoneControl.setValue(this.detectBrowserTimezone(), { emitEvent: false });
    }

    startControl.updateValueAndValidity({ emitEvent: false });
    endControl.updateValueAndValidity({ emitEvent: false });
    timezoneControl.updateValueAndValidity({ emitEvent: false });
  }

  private buildNotificationPreferences(profile: AuthUser) {
    const prefs = this.resolveNotificationPreferences(profile);
    return {
      emailAddress: profile.email,
      emailOptIn: prefs.channels.email,
      webhookUrl: prefs.channels.webhook ? prefs.webhookUrl : null,
    };
  }

  private extractSelectedSeverities(raw: {
    alertSeverityInfo: boolean;
    alertSeveritySuccess: boolean;
    alertSeverityWarning: boolean;
    alertSeverityCritical: boolean;
  }): AlertSeverityPreference[] {
    const selected: AlertSeverityPreference[] = [];
    if (raw.alertSeverityInfo) {
      selected.push('info');
    }
    if (raw.alertSeveritySuccess) {
      selected.push('success');
    }
    if (raw.alertSeverityWarning) {
      selected.push('warning');
    }
    if (raw.alertSeverityCritical) {
      selected.push('critical');
    }
    return selected;
  }

  private extractSelectedSources(raw: {
    alertSourceSavedSearch: boolean;
    alertSourceSystem: boolean;
  }): AlertSourcePreference[] {
    const selected: AlertSourcePreference[] = [];
    if (raw.alertSourceSavedSearch) {
      selected.push('saved-search');
    }
    if (raw.alertSourceSystem) {
      selected.push('system');
    }
    return selected;
  }

  private normalizeQuietHour(value: string): string | null {
    const normalized = this.normalizeString(value);
    if (!normalized) {
      return null;
    }
    return QUIET_HOURS_PATTERN.test(normalized) ? normalized : null;
  }

  private resolveNotificationPreferences(profile: AuthUser): {
    channels: { inApp: boolean; email: boolean; webhook: boolean };
    filters: { severities: AlertSeverityPreference[]; sources: AlertSourcePreference[] };
    frequency: AlertFrequencyPreference;
    quietHours: { enabled: boolean; start: string | null; end: string | null; timezone: string | null };
    webhookUrl: string | null;
  } {
    const prefs = profile.notificationPreferences ?? null;
    const channels = prefs?.channels ?? null;
    const email = typeof channels?.email === 'boolean' ? channels.email : Boolean(prefs?.emailOptIn);
    const webhookUrl = this.normalizeString(prefs?.webhookUrl);
    const webhook = typeof channels?.webhook === 'boolean' ? channels.webhook : Boolean(webhookUrl);
    const inApp = typeof channels?.inApp === 'boolean' ? channels.inApp : true;

    const severitiesRaw = Array.isArray(prefs?.filters?.severities)
      ? prefs?.filters?.severities
      : [];
    const severities = ALERT_SEVERITY_OPTIONS.filter((entry) =>
      severitiesRaw.includes(entry)
    );
    const normalizedSeverities =
      severities.length > 0 ? severities : [...ALERT_SEVERITY_OPTIONS];

    const sourcesRaw = Array.isArray(prefs?.filters?.sources) ? prefs?.filters?.sources : [];
    const sources = ALERT_SOURCE_OPTIONS.filter((entry) => sourcesRaw.includes(entry));
    const normalizedSources = sources.length > 0 ? sources : [...ALERT_SOURCE_OPTIONS];

    const frequency: AlertFrequencyPreference =
      prefs?.frequency === 'daily-digest' ? 'daily-digest' : ALERT_FREQUENCY_DEFAULT;

    const quietHoursEnabled = Boolean(prefs?.quietHours?.enabled);
    const quietHoursStart = this.normalizeQuietHour(prefs?.quietHours?.start ?? '');
    const quietHoursEnd = this.normalizeQuietHour(prefs?.quietHours?.end ?? '');
    const quietHoursTimezone = this.normalizeString(prefs?.quietHours?.timezone);

    return {
      channels: {
        inApp,
        email,
        webhook,
      },
      filters: {
        severities: normalizedSeverities,
        sources: normalizedSources,
      },
      frequency,
      quietHours: {
        enabled: quietHoursEnabled,
        start: quietHoursEnabled ? quietHoursStart : null,
        end: quietHoursEnabled ? quietHoursEnd : null,
        timezone: quietHoursEnabled ? quietHoursTimezone ?? this.detectBrowserTimezone() : null,
      },
      webhookUrl,
    };
  }

  private detectBrowserTimezone(): string {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return typeof timezone === 'string' && timezone.trim().length > 0
        ? timezone
        : QUIET_HOURS_TIMEZONE_FALLBACK;
    } catch {
      return QUIET_HOURS_TIMEZONE_FALLBACK;
    }
  }

  private joinList(values?: readonly string[] | null): string {
    if (!values?.length) {
      return '';
    }
    return values.join(', ');
  }

  private parseList(value: string): string[] {
    const unique = new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    );
    return Array.from(unique);
  }

  private normalizeString(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private resetPasswordForm(): void {
    this.passwordForm.reset({
      currentPassword: '',
      password: '',
      passwordConfirmation: '',
    });
    this.passwordForm.markAsPristine();
    this.passwordForm.markAsUntouched();
    this.syncPasswordFormStateSignals();
  }

  private resetEmailChangeForm(): void {
    this.emailChangeForm.reset({
      currentPassword: '',
      email: '',
    });
    this.emailChangeForm.markAsPristine();
    this.emailChangeForm.markAsUntouched();
    this.syncEmailChangeFormStateSignals();
  }

  private resolveActivationEmailError(error: unknown): string {
    const extracted = this.extractErrorMessage(error);
    if (!extracted) {
      return this.translate.instant('auth.login.activationEmailError');
    }

    const normalized = extracted.toLowerCase();
    if (normalized.includes('already confirmed')) {
      return this.translate.instant('auth.login.activationAlreadyConfirmed');
    }
    if (normalized.includes('blocked') || normalized.includes('inactive') || normalized.includes('disabled')) {
      return this.translate.instant('auth.errors.accountDisabled');
    }
    if (normalized.includes('too many') || normalized.includes('rate')) {
      return this.translate.instant('auth.errors.tooManyAttempts');
    }
    if (normalized.includes('email confirmation') && normalized.includes('disabled')) {
      return this.translate.instant('auth.login.activationUnavailable');
    }

    return extracted;
  }

  private resolveErrorMessage(error: unknown, fallbackKey: string): string {
    return this.extractErrorMessage(error) ?? this.translate.instant(fallbackKey);
  }

  private validateAvatarFile(file: File): string | null {
    if (!file.type.startsWith('image/')) {
      return 'auth.profile.avatar.uploadInvalidType';
    }

    if (file.size > this.maxAvatarFileSizeBytes) {
      return 'auth.profile.avatar.uploadTooLarge';
    }

    return null;
  }

  private downloadProfileExport(blob: Blob): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const objectUrl = window.URL.createObjectURL(blob);
    const filename = this.buildExportFilename();
    const anchor = document.createElement('a');

    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.URL.revokeObjectURL(objectUrl);
  }

  private buildExportFilename(date = new Date()): string {
    const safe = date.toISOString().replace(/[:.]/g, '-');
    return `openg7-account-export-${safe}.json`;
  }

  private resolveUploadedAvatarUrl(candidate: string | null | undefined): string | null {
    const normalized = this.normalizeString(candidate);
    if (!normalized) {
      return null;
    }

    if (/^https?:\/\//i.test(normalized)) {
      return normalized;
    }

    try {
      const base = this.resolveUploadBaseUrl();
      return new URL(normalized, base).toString();
    } catch {
      return null;
    }
  }

  private resolveUploadBaseUrl(): string {
    const fallbackOrigin =
      typeof window !== 'undefined' && typeof window.location?.origin === 'string'
        ? window.location.origin
        : 'http://localhost';
    const rawApiUrl = typeof this.apiUrl === 'string' ? this.apiUrl.trim() : '';
    if (!rawApiUrl) {
      return fallbackOrigin;
    }

    const apiUrl = new URL(rawApiUrl, fallbackOrigin);
    const cleanedPath = apiUrl.pathname.replace(/\/+$/, '');
    apiUrl.pathname = cleanedPath.endsWith('/api')
      ? cleanedPath.slice(0, -4) || '/'
      : cleanedPath || '/';
    apiUrl.search = '';
    apiUrl.hash = '';

    return apiUrl.toString();
  }

  private extractErrorMessage(error: unknown): string | null {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error;
      if (typeof payload === 'string' && payload.trim().length > 0) {
        return payload.trim();
      }
      if (payload && typeof payload === 'object') {
        const candidate = (payload as { message?: unknown }).message;
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
          return candidate.trim();
        }
      }
      if (typeof error.message === 'string' && error.message.trim().length > 0) {
        return error.message.trim();
      }
      if (typeof error.statusText === 'string' && error.statusText.trim().length > 0) {
        return error.statusText.trim();
      }
    }

    if (typeof error === 'string' && error.trim().length > 0) {
      return error.trim();
    }

    if (error && typeof error === 'object') {
      const candidate = (error as { message?: unknown }).message;
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }

    return null;
  }
}
