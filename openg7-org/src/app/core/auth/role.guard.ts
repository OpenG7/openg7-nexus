import { inject, signal } from '@angular/core';
import { CanMatchFn, Route, Router, UrlSegment } from '@angular/router';

import { RbacFacadeService } from '../security/rbac.facade';

/**
 * Contexte : Observed by components wanting to reflect the guard outcome.
 * Raison d’être : Stores the latest evaluation result of the role guard.
 * @returns Signal value indicating whether navigation was allowed.
 */
export const isAllowedSig = signal(false);

/**
 * Contexte : Used by UI hints to explain why access was denied.
 * Raison d’être : Holds the translation key corresponding to the guard rejection.
 * @returns Signal value containing the rejection reason or null.
 */
export const reasonSig = signal<string | null>(null);

/**
 * Contexte : Mounted on routes that must restrict access to a subset of roles (e.g. admin-only pages).
 * Raison d’être : Validates the visitor’s role through the RBAC facade before allowing navigation.
 * @param route Route definition invoking the guard.
 * @param segments Attempted URL segments (unused but part of signature).
 * @returns True when the role is authorised, otherwise a UrlTree to the access denied page.
 */
export const roleGuard: CanMatchFn = (
  route: Route,
  _segments: UrlSegment[]
) => {
  const expected = (route.data?.['roles'] as string[]) || [];
  if (!expected.length) {
    isAllowedSig.set(true);
    reasonSig.set(null);
    return true;
  }
  const policy = inject(RbacFacadeService);
  const allowed = expected.includes(policy.currentRole());
  isAllowedSig.set(allowed);
  reasonSig.set(allowed ? null : 'role.forbidden');
  if (allowed) {
    return true;
  }
  return inject(Router).createUrlTree(['/access-denied']);
};
