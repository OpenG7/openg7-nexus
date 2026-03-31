import { TestBed } from '@angular/core/testing';
import { Route, Router, UrlSegment, UrlTree } from '@angular/router';

import { AuthRedirectService } from './auth-redirect.service';
import { authGuard, isAllowedSig, reasonSig } from './auth.guard';
import { AuthService } from './auth.service';

interface AuthServiceStub {
  ensureSessionRestored: jasmine.Spy<() => Promise<void>>;
  isAuthenticated: jasmine.Spy<() => boolean>;
}

describe('authGuard', () => {
  let router: jasmine.SpyObj<Router>;
  let redirect: jasmine.SpyObj<AuthRedirectService>;
  let auth: AuthServiceStub;
  const segments = [new UrlSegment('profile', {})];

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree', 'getCurrentNavigation']);
    redirect = jasmine.createSpyObj<AuthRedirectService>('AuthRedirectService', ['setRedirectUrl']);
    auth = {
      ensureSessionRestored: jasmine.createSpy('ensureSessionRestored').and.resolveTo(),
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthRedirectService, useValue: redirect },
        { provide: AuthService, useValue: auth as unknown as AuthService },
      ],
    });

    isAllowedSig.set(false);
    reasonSig.set(null);
  });

  it('waits for session restoration before authorizing navigation', async () => {
    let restored = false;
    auth.ensureSessionRestored.and.callFake(async () => {
      restored = true;
    });
    auth.isAuthenticated.and.callFake(() => restored);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as Route, segments)
    );

    expect(auth.ensureSessionRestored).toHaveBeenCalled();
    expect(result).toBeTrue();
    expect(isAllowedSig()).toBeTrue();
    expect(reasonSig()).toBeNull();
    expect(redirect.setRedirectUrl).not.toHaveBeenCalled();
  });

  it('redirects anonymous users to login with redirect query parameter', async () => {
    const tree = {} as UrlTree;
    router.getCurrentNavigation.and.returnValue({
      finalUrl: { toString: () => '/profile' } as any,
    } as any);
    router.createUrlTree.and.returnValue(tree);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as Route, segments)
    );

    expect(auth.ensureSessionRestored).toHaveBeenCalled();
    expect(redirect.setRedirectUrl).toHaveBeenCalledWith('/profile');
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirect: '/profile' },
    });
    expect(result).toBe(tree);
    expect(isAllowedSig()).toBeFalse();
    expect(reasonSig()).toBe('auth.required');
  });

  it('falls back to extractedUrl when finalUrl is not available', async () => {
    const tree = {} as UrlTree;
    router.getCurrentNavigation.and.returnValue({
      extractedUrl: { toString: () => '/feed/opportunities/request-001' } as any,
    } as any);
    router.createUrlTree.and.returnValue(tree);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as Route, segments)
    );

    expect(redirect.setRedirectUrl).toHaveBeenCalledWith('/feed/opportunities/request-001');
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirect: '/feed/opportunities/request-001' },
    });
    expect(result).toBe(tree);
  });

  it('uses the attempted segments when the router navigation has no URL metadata', async () => {
    const tree = {} as UrlTree;
    router.getCurrentNavigation.and.returnValue(null);
    router.createUrlTree.and.returnValue(tree);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as Route, [new UrlSegment('admin', {}), new UrlSegment('ops', {})])
    );

    expect(redirect.setRedirectUrl).toHaveBeenCalledWith('/admin/ops');
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirect: '/admin/ops' },
    });
    expect(result).toBe(tree);
  });
});
