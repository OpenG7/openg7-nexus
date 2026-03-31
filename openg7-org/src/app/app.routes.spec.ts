import { routes } from './app.routes';
import { authGuard } from './core/auth/auth.guard';
import { permissionsGuard } from './core/auth/permissions.guard';
import { roleGuard } from './core/auth/role.guard';

describe('app routes', () => {
  it('registers /sectors route with lazy loadComponent', () => {
    const route = routes.find((entry) => entry.path === 'sectors');

    expect(route).toBeDefined();
    expect(typeof route?.loadComponent).toBe('function');
  });

  it('loads the strategic sectors page component for /sectors', async () => {
    const route = routes.find((entry) => entry.path === 'sectors');
    expect(route?.loadComponent).toBeDefined();

    const component = await route!.loadComponent!();
    expect((component as { name?: string })?.name).toBe('StrategicSectorsPage');
  });

  it('exposes /feed without auth guard so browsing stays public', () => {
    const route = routes.find((entry) => entry.path === 'feed');

    expect(route).toBeDefined();
    expect(route?.canMatch ?? []).not.toContain(authGuard);
  });

  it('protects /pro with auth, role and permission guards', () => {
    const route = routes.find((entry) => entry.path === 'pro');

    expect(route).toBeDefined();
    expect(route?.canMatch ?? []).toContain(authGuard);
    expect(route?.canMatch ?? []).toContain(roleGuard);
    expect(route?.canMatch ?? []).toContain(permissionsGuard);
    expect(route?.data?.['roles']).toEqual(['editor', 'admin']);
    expect(route?.data?.['permissions']).toEqual(['write']);
  });

  it('protects admin routes with auth and admin role guards', () => {
    const adminRoutes = ['admin', 'admin/trust', 'admin/ops'];

    for (const path of adminRoutes) {
      const route = routes.find((entry) => entry.path === path);

      expect(route).withContext(`route ${path} should exist`).toBeDefined();
      expect(route?.canMatch ?? []).withContext(`route ${path} should require auth`).toContain(authGuard);
      expect(route?.canMatch ?? []).withContext(`route ${path} should require role guard`).toContain(roleGuard);
      expect(route?.data?.['roles']).withContext(`route ${path} should require admin role`).toEqual(['admin']);
    }
  });
});
