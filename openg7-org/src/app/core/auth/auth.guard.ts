import { inject, signal } from '@angular/core';
import { CanMatchFn, Route, UrlSegment, Router } from '@angular/router';

import { AuthRedirectService } from './auth-redirect.service';
import { AuthService } from './auth.service';

/**
 * Contexte : Observed by route components displaying guard outcomes (e.g. login prompts).
 * Raison d'etre : Exposes a reactive signal mirroring the authentication guard decision.
 * @returns True when the current user session is authenticated.
 */
export const isAllowedSig = signal(false);

/**
 * Contexte : Consumed by UI elements to show the rejection reason when navigation is blocked.
 * Raison d'etre : Provides a translated reason key for the last guard evaluation.
 * @returns Translation key explaining why access was denied or null when allowed.
 */
export const reasonSig = signal<string | null>(null);

/**
 * Contexte : Attached to protected routes that require an authenticated session.
 * Raison d'etre : Redirects anonymous users to the login page while exposing reactive guard state.
 * @param route Route definition invoking the guard.
 * @param segments Attempted URL segments.
 * @returns True to continue navigation or a UrlTree redirecting to login.
 */
export const authGuard: CanMatchFn = (_route: Route, segments: UrlSegment[]) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const redirect = inject(AuthRedirectService);
  return evaluateAuthGuard(auth, router, redirect, segments);
};

async function evaluateAuthGuard(
  auth: AuthService,
  router: Router,
  redirect: AuthRedirectService,
  segments: UrlSegment[],
) {
  await auth.ensureSessionRestored();

  const allowed = auth.isAuthenticated();
  isAllowedSig.set(allowed);
  reasonSig.set(allowed ? null : 'auth.required');

  if (allowed) {
    return true;
  }

  const navigation = router.getCurrentNavigation();
  const target =
    navigation?.finalUrl?.toString() ??
    navigation?.extractedUrl?.toString() ??
    `/${segments.map((segment) => segment.path).join('/')}`;

  redirect.setRedirectUrl(target);

  const queryParams = target ? { redirect: target } : undefined;

  return router.createUrlTree(['/login'], { queryParams });
}
