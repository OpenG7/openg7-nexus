import { routes } from './app.routes';

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
});
