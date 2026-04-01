import { inject, signal } from '@angular/core';
import { CanMatchFn, Route, Router, UrlSegment } from '@angular/router';

import { RbacFacadeService } from '../security/rbac.facade';

/**
 * Contexte : Observed by guarded components to know whether the last permission check succeeded.
 * Raison d’être : Stores the boolean outcome of the permissions guard evaluation.
 * @returns Signal value reflecting the guard decision.
 */
export const isAllowedSig = signal(false);

/**
 * Contexte : Consumed by UI hints to display why access was denied.
 * Raison d’être : Carries the translation key describing the missing permission.
 * @returns Signal value containing the rejection reason or null.
 */
export const reasonSig = signal<string | null>(null);

/**
 * Contexte : Attached to routes requiring specific permissions beyond basic authentication.
 * Raison d’être : Validates requested permissions against the RBAC facade and blocks navigation otherwise.
 * @param route Route definition invoking the guard.
 * @param segments Attempted URL segments (unused but part of signature).
 * @returns True when navigation may continue, otherwise a UrlTree to the access denied page.
 */
export const permissionsGuard: CanMatchFn = (
  route: Route,
  _segments: UrlSegment[]
) => {
  const required = (route.data?.['permissions'] as string[]) || [];
  if (!required.length) {
    isAllowedSig.set(true);
    reasonSig.set(null);
    return true;
  }
  const policy = inject(RbacFacadeService);
  const allowed = required.every((p) => policy.hasPermission(p));
  isAllowedSig.set(allowed);
  reasonSig.set(allowed ? null : 'permission.forbidden');
  if (allowed) {
    return true;
  }
  return inject(Router).createUrlTree(['/access-denied']);
};
