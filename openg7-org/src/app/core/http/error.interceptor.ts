import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { catchError, throwError } from 'rxjs';

import { AuthRedirectService } from '../auth/auth-redirect.service';
import { AuthService } from '../auth/auth.service';
import { injectNotificationStore } from '../observability/notification.store';

import { SUPPRESS_ERROR_TOAST } from './error.interceptor.tokens';

/**
 * Contexte : Registered globally to surface consistent toast notifications when HTTP requests fail.
 * Raison d’être : Centralises translation lookup and notification publishing so individual services stay lean.
 * @param req Original HTTP request emitted by Angular.
 * @param next Handler used to forward the request.
 * @returns Observable mirroring the original stream while side-effecting on errors.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const translate = inject(TranslateService);
  const notifications = injectNotificationStore();
  const router = inject(Router);
  const authRedirect = inject(AuthRedirectService);
  const platformId = inject(PLATFORM_ID);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (req.context.get(SUPPRESS_ERROR_TOAST)) {
        return throwError(() => err);
      }

      if (err.status === 401 && auth.handleUnauthorizedSession()) {
        const key = 'auth.sessionExpired';
        const sessionExpired =
          translate.instant(key) === key
            ? 'Your session has expired. Please sign in again.'
            : translate.instant(key);

        if (isPlatformBrowser(platformId)) {
          const currentUrl = resolveCurrentUrl(router);
          if (!isLoginUrl(currentUrl)) {
            if (currentUrl) {
              authRedirect.setRedirectUrl(currentUrl);
            }
            void router.navigate(['/login'], {
              queryParams: {
                reason: 'session-expired',
                ...(currentUrl ? { redirect: currentUrl } : {}),
              },
              replaceUrl: true,
            });
          }
        }

        notifications.info(sessionExpired, {
          source: 'auth',
          context: { status: err.status, url: err.url, reason: 'session-expired' },
          metadata: { status: err.status, reason: 'session-expired' },
        });
        return throwError(() => err);
      }

      const key = `errors.${err.status}`;
      let message = translate.instant(key);
      if (message === key) {
        const generic = translate.instant('errors.generic');
        message = generic === 'errors.generic' ? err.statusText || err.message : generic;
      }
      const requestTarget = resolveRequestTarget(err.url ?? req.url);
      const detailed404Key = 'errors.404WithResource';
      const statusTitleKey = 'errors.statusTitle';
      const titleCandidate =
        err.status != null ? translate.instant(statusTitleKey, { status: err.status }) : null;
      const title = titleCandidate && titleCandidate !== statusTitleKey ? titleCandidate : null;
      if (err.status === 404 && requestTarget) {
        const detailedMessage = translate.instant(detailed404Key, { resource: requestTarget });
        message =
          detailedMessage !== detailed404Key ? detailedMessage : `${message} (${requestTarget})`;
      }
      notifications.error(message, {
        title,
        source: 'http',
        context: { status: err.status, url: err.url },
        metadata: { status: err.status },
      });
      return throwError(() => err);
    })
  );
};

function resolveCurrentUrl(router: Router): string | null {
  const navigation = router.getCurrentNavigation();
  const url = navigation?.finalUrl?.toString() ?? navigation?.extractedUrl?.toString() ?? router.url;
  if (typeof url !== 'string') {
    return null;
  }
  const normalized = url.trim();
  return normalized.length > 0 ? normalized : null;
}

function isLoginUrl(url: string | null): boolean {
  return typeof url === 'string' && /^\/login(?:[/?#]|$)/.test(url);
}

function resolveRequestTarget(url: string | null | undefined): string | null {
  if (typeof url !== 'string') {
    return null;
  }

  try {
    const parsed = new URL(url, 'http://localhost');
    const segments = parsed.pathname
      .split('/')
      .map(segment => segment.trim())
      .filter(Boolean)
      .filter(segment => segment.toLowerCase() !== 'api')
      .map(segment => normalizeRequestSegment(segment));

    return segments.length > 0 ? segments.join('/') : null;
  } catch {
    return null;
  }
}

function normalizeRequestSegment(segment: string): string {
  if (/^\d+$/.test(segment)) {
    return ':id';
  }
  if (/^[a-f0-9-]{8,}$/i.test(segment)) {
    return ':id';
  }
  return segment;
}
