import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { AuthRedirectService } from '@app/core/auth/auth-redirect.service';
import { AuthService } from '@app/core/auth/auth.service';
import { OidcProvider } from '@app/core/auth/oidc.service';
import { AnalyticsService } from '@app/core/observability/analytics.service';
import {
  NotificationStore,
  NotificationStoreApi,
} from '@app/core/observability/notification.store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'og7-social-auth-buttons',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './social-auth-buttons.component.html',
  host: {
    'data-og7': 'auth-social-providers',
    class: 'flex flex-col gap-2',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/auth » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Social Auth Buttons ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns SocialAuthButtonsComponent gérée par le framework.
 */
export class SocialAuthButtonsComponent {
  private readonly auth = inject(AuthService);
  private readonly notifications = inject<NotificationStoreApi>(NotificationStore);
  private readonly analytics = inject(AnalyticsService);
  private readonly translate = inject(TranslateService);
  private readonly authRedirect = inject(AuthRedirectService);
  private readonly progressSig = signal<OidcProvider | null>(null);
  readonly disabled = input(false);
  readonly redirectUrl = input('/profile');
  protected readonly inProgress = this.progressSig.asReadonly();

  protected startSignIn(provider: OidcProvider): void {
    if (this.disabled() || this.inProgress()) {
      return;
    }

    this.progressSig.set(provider);

    const label = this.translate.instant(`auth.sso.${provider}`);

    this.notifications.info(this.translate.instant('auth.sso.progress', { provider: label }), {
      source: 'auth',
      metadata: { action: 'sso-start', provider },
    });

    this.analytics.emit('auth_sso_attempt', {
      provider,
      source: 'social-buttons',
    });

    const requestedRedirect = this.authRedirect.consumeRedirectUrl(this.redirectUrl());

    void this.auth.loginWithOidc(provider, { redirectUrl: requestedRedirect }).catch((error) => {
      this.progressSig.set(null);

      // Restore the redirect hint if the OIDC flow fails before navigation occurs.
      this.authRedirect.setRedirectUrl(requestedRedirect);

      const message =
        this.translate.instant('auth.errors.ssoStart') || this.translate.instant('auth.errors.api');

      this.notifications.error(message, {
        source: 'auth',
        context: error,
        metadata: { action: 'sso-error', provider },
        deliver: { email: true },
      });

      this.analytics.emit('auth_sso_failed', {
        provider,
        source: 'social-buttons',
        message: error instanceof Error ? error.message : String(error ?? ''),
      });
    });
  }
}
