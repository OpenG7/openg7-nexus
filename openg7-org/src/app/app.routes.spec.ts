import { routes } from './app.routes';
import { authGuard } from './core/auth/auth.guard';

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
});
