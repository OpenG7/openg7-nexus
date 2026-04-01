import './setup';
import { expect, test } from '@playwright/test';

import { seedAuthenticatedSession } from './helpers/auth-session';

interface MockSessionOptions {
  profileUnauthorized?: boolean;
  sessionsUnauthorized?: boolean;
  savedSearchesNetworkFailure?: boolean;
  savedSearches?: Array<Record<string, unknown>>;
  alerts?: Array<Record<string, unknown>>;
}

const PROFILE = {
  id: 'e2e-user-1',
  email: 'e2e.user@openg7.test',
  roles: ['editor'],
  firstName: 'E2E',
  lastName: 'User',
  accountStatus: 'active',
  premiumActive: true,
  premiumPlan: 'analyst',
  notificationPreferences: {
    emailOptIn: false,
    webhookUrl: null,
  },
} as const;

async function mockSessionApis(page: Parameters<typeof test>[0]['page'], options: MockSessionOptions = {}): Promise<void> {
  const sessions = [
    {
      id: 'session-current',
      version: 1,
      createdAt: '2026-03-14T08:00:00.000Z',
      lastSeenAt: '2026-03-14T10:00:00.000Z',
      status: 'active',
      current: true,
      revokedAt: null,
      userAgent: 'Playwright Chromium',
      ipAddress: '127.0.0.1',
    },
  ];

  const json = (body: unknown, status = 200) => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

  await page.route('**/api/sectors**', async route => {
    await route.fulfill(json({ data: [] }));
  });

  await page.route('**/api/provinces**', async route => {
    await route.fulfill(json({ data: [] }));
  });

  await page.route('**/api/companies**', async route => {
    await route.fulfill(json({ data: [] }));
  });

  await page.route('**/api/auth/local**', async route => {
    await route.fulfill(
      json({
        jwt: 'header.eyJleHAiOjQxMDI0NDQ4MDB9.signature',
        user: PROFILE,
      })
    );
  });

  await page.route('**/api/users/me**', async route => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const path = new URL(request.url()).pathname.toLowerCase();

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }

    if (method === 'GET' && path.endsWith('/favorites')) {
      await route.fulfill(json([]));
      return;
    }

    if (method === 'GET' && path.endsWith('/alerts')) {
      await route.fulfill(json(options.alerts ?? []));
      return;
    }

    if (method === 'GET' && path.endsWith('/saved-searches')) {
      if (options.savedSearchesNetworkFailure) {
        await route.abort('failed');
        return;
      }

      await route.fulfill(json(options.savedSearches ?? []));
      return;
    }

    if (method === 'GET' && path.endsWith('/profile/sessions')) {
      if (options.sessionsUnauthorized) {
        await route.fulfill(json({ message: 'session expired' }, 401));
        return;
      }

      await route.fulfill(
        json({
          version: 1,
          sessions,
        })
      );
      return;
    }

    if (method === 'GET' && path.endsWith('/profile')) {
      if (options.profileUnauthorized) {
        await route.fulfill(json({ message: 'session expired' }, 401));
        return;
      }

      await route.fulfill(json(PROFILE));
      return;
    }

    if (method === 'GET' && path === '/api/users/me') {
      await route.fulfill(json(PROFILE));
      return;
    }

    if (method === 'POST' && path.endsWith('/profile/sessions/logout-others')) {
      await route.fulfill(
        json({
          jwt: 'header.eyJleHAiOjQxMDI0NDQ4MDB9.signature',
          user: PROFILE,
          sessionsRevoked: 0,
          sessionVersion: 1,
          sessions,
        })
      );
      return;
    }

    await route.fulfill(json({ message: 'Unhandled users/me route' }, 404));
  });
}

test.describe('Resilience', () => {
  test('redirects to login with a session-expired notice when a protected refresh returns 401', async ({ page }) => {
    let sessionsUnauthorized = false;

    await mockSessionApis(page, {
      get sessionsUnauthorized() {
        return sessionsUnauthorized;
      },
    });
    await seedAuthenticatedSession(page, PROFILE);

    await page.goto('/profile');
    await expect(page.locator('[data-og7="user-profile"]')).toBeVisible();

    sessionsUnauthorized = true;
    await page.locator('[data-og7-id="refresh-sessions"]').click();

    await expect(page).toHaveURL(/\/login/);
    await expect.poll(() => new URL(page.url()).searchParams.get('reason')).toBe('session-expired');
    await expect.poll(() => new URL(page.url()).searchParams.get('redirect')).toBe('/profile');
    await expect(page.locator('[data-og7="auth-login-notice"]')).toContainText(
      /Your session has expired|Votre session a expire/i
    );
    await expect(page.locator('[data-og7="notification-toast"][data-og7-id="info"]')).toContainText(
      /Your session has expired|Votre session a expire/i
    );
  });

  test('shows an error state when a protected saved-searches request fails at the network layer', async ({ page }) => {
    await mockSessionApis(page, { savedSearchesNetworkFailure: true });
    await seedAuthenticatedSession(page, PROFILE);

    await page.goto('/saved-searches');

    await expect(page).toHaveURL(/\/saved-searches$/);
    await expect(page.locator('[data-og7="saved-searches"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="saved-search-error"]')).toBeVisible();
    await expect(page.locator('[data-og7="notification-toast"][data-og7-id="error"]')).toHaveCount(1);
  });
});

test.describe('Resilience mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('keeps the mobile account navigation usable and exposes the alerts empty state', async ({ page }) => {
    await mockSessionApis(page, { alerts: [] });
    await seedAuthenticatedSession(page, PROFILE);

    await page.goto('/');
    await expect(page.locator('[data-og7="site-header"]')).toBeVisible();

    await page.locator('[data-og7-id="mobile-menu-toggle"]').click();
    await expect(page.locator('[data-og7="mobile-menu"]')).toBeVisible();

    await page.locator('[data-og7="mobile-menu"] [data-og7-id="alerts"]').click();

    await expect(page).toHaveURL(/\/alerts$/);
    await expect(page.locator('[data-og7="user-alerts"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="alerts-empty"]')).toBeVisible();
  });
});
