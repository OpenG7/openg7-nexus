import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { FEATURE_FLAGS } from '../config/environment.tokens';

import { featureFlagGuard } from './feature-flag.guard';

describe('featureFlagGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([{ path: 'access-denied', children: [] }])],
      providers: [{ provide: FEATURE_FLAGS, useValue: { componentLab: false } }],
    });
  });

  it('allows navigation when the feature flag is enabled', () => {
    TestBed.overrideProvider(FEATURE_FLAGS, { useValue: { componentLab: true } });

    const result = TestBed.runInInjectionContext(() =>
      featureFlagGuard('componentLab')({} as any, [] as any),
    );

    expect(result).toBeTrue();
  });

  it('redirects to /access-denied when the flag is disabled', () => {
    const router = TestBed.inject(Router);

    const result = TestBed.runInInjectionContext(() =>
      featureFlagGuard('componentLab')({} as any, [] as any),
    );

    expect(result instanceof UrlTree).toBeTrue();

    const expectedTree = router.createUrlTree(['/access-denied']);
    expect(result).toEqual(expectedTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/access-denied');
  });
});
