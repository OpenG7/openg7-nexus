import './setup';
import { expect, test } from '@playwright/test';

import { mockAuthenticatedSessionApis, seedAuthenticatedSession } from './helpers/auth-session';

test.describe('Feed notifications', () => {
  test('does not spam generic not-found toasts when feed and background sync requests fail on load', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      class ConnectedEventSource {
        onopen: ((event: Event) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        onmessage: ((event: MessageEvent<string>) => void) | null = null;

        constructor(_url: string) {
          setTimeout(() => {
            this.onopen?.(new Event('open'));
          }, 0);
        }

        close(): void {
          // No-op in tests.
        }
      }

      (window as Window & { EventSource?: typeof EventSource }).EventSource =
        ConnectedEventSource as unknown as typeof EventSource;
    });

    await page.route('**/runtime-config.js', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `window.__OG7_CONFIG__ = {
          FEATURE_FLAGS: {
            feedMocks: false,
            homeFeedMocks: false
          }
        };`,
      });
    });

    await mockAuthenticatedSessionApis(page);
    await seedAuthenticatedSession(page);

    await page.route('**/api/users/me/favorites**', async route => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'favorites-not-found' }),
      });
    });

    await page.route('**/api/users/me/alerts**', async route => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'alerts-not-found' }),
      });
    });

    await page.route('**/api/feed**', async route => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method().toUpperCase() !== 'GET' || url.pathname !== '/api/feed') {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'feed-not-found' }),
      });
    });

    await page.goto('/feed');
    await expect(page).toHaveURL(/\/feed$/);

    const errorToasts = page.locator('[data-og7="notification-toast"][data-og7-id="error"]');
    await expect(errorToasts).toHaveCount(1);
    await expect(errorToasts.first()).toContainText(
      /Le fil n'a pas charge :|The feed did not load:/i
    );
  });
});
