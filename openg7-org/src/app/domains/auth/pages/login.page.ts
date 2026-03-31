import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthConfigService } from '@app/core/auth/auth-config.service';
import { AuthRedirectService } from '@app/core/auth/auth-redirect.service';
import { AuthService } from '@app/core/auth/auth.service';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import { SocialAuthButtonsComponent } from '@app/shared/components/auth/social-auth-buttons.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';

@Component({
  standalone: true,
  selector: 'og7-login-page',
  imports: [ReactiveFormsModule, TranslateModule, SocialAuthButtonsComponent, RouterLink],
  templateUrl: './login.page.html',
})
/**
 * Contexte : Chargée par le routeur Angular pour afficher la page « Login » du dossier « domains/auth/pages ».
 * Raison d’être : Lie le template standalone et les dépendances de cette page pour la rendre navigable.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns LoginPage gérée par le framework.
 */
export class LoginPage implements AfterViewInit, OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = injectNotificationStore();
  private readonly translate = inject(TranslateService);
  private readonly authConfig = inject(AuthConfigService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);
  private readonly authRedirect = inject(AuthRedirectService);

  @ViewChild('emailInput')
  private readonly emailInput?: ElementRef<HTMLInputElement>;

  protected readonly emailErrorId = 'auth-login-email-error';
  protected readonly passwordErrorId = 'auth-login-password-error';

  protected readonly loading = signal(false);
  protected readonly apiError = signal<string | null>(null);
  protected readonly loginNotice = signal<string | null>(null);
  protected readonly authMode = this.authConfig.authMode;
  protected readonly passwordVisible = signal(false);
  protected readonly sendingActivationEmail = signal(false);
  protected readonly redirectTarget = signal('/profile');
  protected readonly canSendActivationEmail = computed(() => {
    const error = this.apiError();
    return error === 'auth.errors.emailNotConfirmed';
  });

  protected readonly loginSubtitleKey = computed(() => {
    const mode = this.authMode();
    switch (mode) {
      case 'sso-only':
        return 'auth.login.subtitleSsoOnly';
      case 'hybrid':
        return 'auth.login.subtitleHybrid';
      default:
        return 'auth.login.subtitleLocal';
    }
  });

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    const redirectParam = this.route.snapshot.queryParamMap.get('redirect');
    const reasonParam = this.route.snapshot.queryParamMap.get('reason');
    if (redirectParam) {
      this.authRedirect.captureRedirectParam(redirectParam);
    }
    if (reasonParam === 'session-expired') {
      this.loginNotice.set('auth.sessionExpired');
    }

    this.redirectTarget.set(this.authRedirect.peekRedirectUrl('/profile'));
    void this.redirectAuthenticatedUserAfterRestore();
  }

  ngAfterViewInit(): void {
    if (this.authMode() === 'sso-only' || !isPlatformBrowser(this.platformId)) {
      return;
    }

    queueMicrotask(() => {
      this.emailInput?.nativeElement.focus({ preventScroll: true });
    });
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((value) => !value);
  }

  protected onSubmit(): void {
    if (this.loading()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.apiError.set(null);
    this.loading.set(true);
    this.form.disable({ emitEvent: false });

    const credentials = this.form.getRawValue();

    this.auth
      .login(credentials)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.form.enable({ emitEvent: false });
        })
      )
      .subscribe({
        next: () => {
          void this.completeSuccessfulLogin();
        },
        error: (error) => {
          const { message, code, status } = this.resolveErrorMessage(error);
          this.apiError.set(message);
          this.notifications.error(message, {
            source: 'auth',
            context: error,
            metadata: { action: 'login', status: status ?? null, code },
          });
        },
      });
  }

  private async completeSuccessfulLogin(): Promise<void> {
    await this.auth.ensureSessionPersisted();
    this.notifications.success(this.translate.instant('auth.login.success'), {
      source: 'auth',
      metadata: { action: 'login' },
    });
    const destination = this.authRedirect.consumeRedirectUrl('/profile');
    await this.router.navigateByUrl(destination);
  }

  private async redirectAuthenticatedUserAfterRestore(): Promise<void> {
    await this.auth.ensureSessionRestored();
    if (!this.auth.isAuthenticated()) {
      return;
    }

    const destination = this.authRedirect.consumeRedirectUrl(this.redirectTarget());
    await this.router.navigateByUrl(destination, { replaceUrl: true });
  }

  protected onSendActivationEmail(): void {
    if (this.loading() || this.sendingActivationEmail()) {
      return;
    }

    const email = this.form.controls.email.value.trim();
    if (!email) {
      this.form.controls.email.markAsTouched();
      this.notifications.error(this.translate.instant('auth.errors.emailRequired'), {
        source: 'auth',
        metadata: { action: 'send-email-confirmation' },
      });
      return;
    }

    if (this.form.controls.email.invalid) {
      this.form.controls.email.markAsTouched();
      this.notifications.error(this.translate.instant('auth.errors.emailInvalid'), {
        source: 'auth',
        metadata: { action: 'send-email-confirmation' },
      });
      return;
    }

    this.sendingActivationEmail.set(true);
    this.auth
      .sendEmailConfirmation({ email })
      .pipe(finalize(() => this.sendingActivationEmail.set(false)))
      .subscribe({
        next: () => {
          this.notifications.success(this.translate.instant('auth.login.activationEmailSent'), {
            source: 'auth',
            metadata: { action: 'send-email-confirmation' },
          });
        },
        error: (error) => {
          this.notifications.error(this.resolveActivationEmailError(error), {
            source: 'auth',
            context: error,
            metadata: { action: 'send-email-confirmation' },
          });
        },
      });
  }

  private resolveErrorMessage(error: unknown): { message: string; code: string | null; status: number | null } {
    const fallback = 'auth.errors.api';
    if (error instanceof HttpErrorResponse) {
      const payload = error.error;
      const normalized = this.normalizeApiError(payload);
      const explicitCode = this.resolveErrorCode(error.status, normalized?.code ?? null, {
        useStatusFallback: false,
      });
      const payloadMessage = this.extractErrorMessage(payload);

      if (explicitCode) {
        return { message: explicitCode, code: explicitCode, status: error.status ?? null };
      }

      if (payloadMessage) {
        const mappedCode = this.resolveErrorCode(error.status, payloadMessage, {
          useStatusFallback: false,
        });
        if (mappedCode) {
          return { message: mappedCode, code: mappedCode, status: error.status ?? null };
        }
        return { message: payloadMessage, code: null, status: error.status ?? null };
      }

      const fallbackCode = this.resolveErrorCode(error.status, null, { useStatusFallback: true });
      if (fallbackCode) {
        return { message: fallbackCode, code: fallbackCode, status: error.status ?? null };
      }

      if (typeof error.message === 'string' && error.message.trim()) {
        return { message: error.message, code: null, status: error.status ?? null };
      }
      if (typeof error.statusText === 'string' && error.statusText.trim()) {
        return { message: error.statusText, code: null, status: error.status ?? null };
      }
    }

    if (typeof error === 'string' && error.trim()) {
      return { message: error, code: null, status: null };
    }

    return { message: fallback, code: fallback, status: error instanceof HttpErrorResponse ? error.status ?? null : null };
  }

  private normalizeApiError(payload: unknown): { code?: string | null } | null {
    if (!payload) {
      return null;
    }
    if (typeof payload === 'object') {
      const candidate = payload as { code?: unknown; error?: unknown };
      if (candidate.code && typeof candidate.code === 'string') {
        return { code: candidate.code };
      }
      if (candidate.error && typeof candidate.error === 'object') {
        const nested = candidate.error as {
          code?: unknown;
          name?: unknown;
          message?: unknown;
          status?: unknown;
          details?: unknown;
        };
        if (nested.code && typeof nested.code === 'string') {
          return { code: nested.code };
        }
        if (nested.name && typeof nested.name === 'string') {
          return { code: nested.name };
        }
        if (nested.details && typeof nested.details === 'object') {
          const details = nested.details as { errors?: unknown };
          if (Array.isArray(details.errors)) {
            const first = details.errors.find((item) => typeof item === 'object' && item && 'code' in item);
            const detailCode =
              first && typeof (first as { code?: unknown }).code === 'string'
                ? ((first as { code?: string | undefined }).code ?? null)
                : null;
            if (detailCode) {
              return { code: detailCode };
            }
          }
        }
      }
    }
    return null;
  }

  private resolveErrorCode(
    status: number | null | undefined,
    candidate: string | null | undefined,
    options?: { useStatusFallback?: boolean }
  ): string | null {
    const useStatusFallback = options?.useStatusFallback ?? true;
    const normalized = candidate?.toLowerCase();
    if (normalized) {
      if (normalized.includes('not confirmed') || normalized.includes('email is not confirmed')) {
        return 'auth.errors.emailNotConfirmed';
      }
      if (normalized.includes('blocked') || normalized.includes('inactive') || normalized.includes('disabled')) {
        return 'auth.errors.accountDisabled';
      }
      if (normalized.includes('locked') || normalized.includes('suspended')) {
        return 'auth.errors.accountLocked';
      }
      if (normalized.includes('expired')) {
        return 'auth.errors.passwordExpired';
      }
      if (normalized.includes('attempt') || normalized.includes('rate')) {
        return 'auth.errors.tooManyAttempts';
      }
      if (
        normalized.includes('credential') ||
        normalized.includes('invalid_login') ||
        normalized.includes('invalid identifier') ||
        normalized.includes('identifier or password')
      ) {
        return 'auth.errors.invalidCredentials';
      }

      if (!useStatusFallback) {
        return null;
      }
    }

    if (!useStatusFallback) {
      return null;
    }

    switch (status) {
      case 401:
        return 'auth.errors.invalidCredentials';
      case 403:
        return 'auth.errors.api';
      case 423:
        return 'auth.errors.accountLocked';
      case 429:
        return 'auth.errors.tooManyAttempts';
      case 503:
        return 'auth.errors.serviceUnavailable';
      default:
        return null;
    }
  }

  private resolveActivationEmailError(error: unknown): string {
    const fallback = this.translate.instant('auth.login.activationEmailError');

    if (error instanceof HttpErrorResponse) {
      const payloadMessage =
        this.extractErrorMessage(error.error) ??
        this.extractErrorMessage(error.message) ??
        this.extractErrorMessage(error.statusText);

      if (payloadMessage) {
        return this.mapActivationEmailError(payloadMessage) ?? payloadMessage;
      }
    }

    if (typeof error === 'string') {
      const trimmed = error.trim();
      if (trimmed) {
        return this.mapActivationEmailError(trimmed) ?? trimmed;
      }
    }

    return fallback;
  }

  private mapActivationEmailError(message: string): string | null {
    const normalized = message.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    if (normalized.includes('already confirmed')) {
      return this.translate.instant('auth.login.activationAlreadyConfirmed');
    }

    if (normalized.includes('blocked')) {
      return this.translate.instant('auth.errors.accountDisabled');
    }

    if (normalized.includes('email confirmation') && normalized.includes('disabled')) {
      return this.translate.instant('auth.login.activationUnavailable');
    }

    if (normalized.includes('too many') || normalized.includes('rate')) {
      return this.translate.instant('auth.errors.tooManyAttempts');
    }

    return null;
  }

  private extractErrorMessage(payload: unknown): string | null {
    if (!payload) {
      return null;
    }

    if (typeof payload === 'string') {
      const trimmed = payload.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    if (Array.isArray(payload)) {
      for (const entry of payload) {
        const nested = this.extractErrorMessage(entry);
        if (nested) {
          return nested;
        }
      }
      return null;
    }

    if (typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      const candidateKeys = ['message', 'error', 'errors', 'detail', 'details', 'data'];
      for (const key of candidateKeys) {
        if (record[key] === undefined) {
          continue;
        }
        const nested = this.extractErrorMessage(record[key]);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  }
}

