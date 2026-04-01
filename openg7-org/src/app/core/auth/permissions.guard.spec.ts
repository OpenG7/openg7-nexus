import { TestBed } from '@angular/core/testing';
import { Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { RbacFacadeService } from '../security/rbac.facade';

import { isAllowedSig, permissionsGuard, reasonSig } from './permissions.guard';

interface RbacFacadeStub {
  hasPermission: jasmine.Spy<(permission: string) => boolean>;
}

describe('permissionsGuard', () => {
  let rbac: RbacFacadeStub;
  const segments = [new UrlSegment('pro', {})];

  beforeEach(() => {
    rbac = {
      hasPermission: jasmine.createSpy('hasPermission').and.returnValue(false),
    };

    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([{ path: 'access-denied', children: [] }])],
      providers: [{ provide: RbacFacadeService, useValue: rbac as unknown as RbacFacadeService }],
    });

    isAllowedSig.set(false);
    reasonSig.set(null);
  });

  it('allows navigation when no permissions are configured', () => {
    const allowed = TestBed.runInInjectionContext(() =>
      permissionsGuard({} as Route, segments)
    );

    expect(allowed).toBeTrue();
    expect(rbac.hasPermission).not.toHaveBeenCalled();
    expect(isAllowedSig()).toBeTrue();
    expect(reasonSig()).toBeNull();
  });

  it('allows navigation when every required permission is granted', () => {
    rbac.hasPermission.and.returnValue(true);
    const route = { data: { permissions: ['write', 'premium:analytics'] } } as Route;

    const allowed = TestBed.runInInjectionContext(() => permissionsGuard(route, segments));

    expect(allowed).toBeTrue();
    expect(rbac.hasPermission).toHaveBeenCalledWith('write');
    expect(rbac.hasPermission).toHaveBeenCalledWith('premium:analytics');
    expect(isAllowedSig()).toBeTrue();
    expect(reasonSig()).toBeNull();
  });

  it('redirects to /access-denied when at least one permission is missing', () => {
    const router = TestBed.inject(Router);
    rbac.hasPermission.and.callFake((permission: string) => permission !== 'write');
    const route = { data: { permissions: ['read', 'write'] } } as Route;

    const allowed = TestBed.runInInjectionContext(() => permissionsGuard(route, segments));

    expect(allowed instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(allowed as UrlTree)).toBe('/access-denied');
    expect(rbac.hasPermission).toHaveBeenCalledWith('read');
    expect(rbac.hasPermission).toHaveBeenCalledWith('write');
    expect(isAllowedSig()).toBeFalse();
    expect(reasonSig()).toBe('permission.forbidden');
  });
});
