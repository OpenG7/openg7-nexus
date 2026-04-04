import './setup';
import { expect, test } from '@playwright/test';

import { seedAuthenticatedSession } from './helpers/auth-session';

interface AlertRecord {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
  sourceType: string | null;
  sourceId: string | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
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

async function mockNotificationApis(page: Parameters<typeof test>[0]['page'], seed: readonly AlertRecord[]): Promise<void> {
  const alerts = seed.map((entry) => ({ ...entry }));

  const json = (body: unknown, status = 200) => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

  await page.route('**/api/sectors**', async (route) => {
    await route.fulfill(json({ data: [] }));
  });

  await page.route('**/api/provinces**', async (route) => {
    await route.fulfill(json({ data: [] }));
  });

  await page.route('**/api/companies**', async (route) => {
    await route.fulfill(json({ data: [] }));
  });

  await page.route('**/api/auth/local**', async (route) => {
    await route.fulfill(
      json({
        jwt: 'header.eyJleHAiOjQxMDI0NDQ4MDB9.signature',
        user: PROFILE,
      })
    );
  });

  await page.route('**/api/users/me**', async (route) => {
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

    if (method === 'GET' && path.endsWith('/saved-searches')) {
      await route.fulfill(json([]));
      return;
    }

    if (method === 'GET' && path.endsWith('/alerts')) {
      await route.fulfill(json(alerts));
      return;
    }

    if (method === 'PATCH' && /\/api\/users\/me\/alerts\/read-all\/?$/i.test(path)) {
      const now = '2026-04-01T12:00:00.000Z';
      for (let index = 0; index < alerts.length; index += 1) {
        if (alerts[index].isRead) {
          continue;
        }
        alerts[index] = {
          ...alerts[index],
          isRead: true,
          readAt: alerts[index].readAt ?? now,
          updatedAt: now,
        };
      }

      await route.fulfill(json({ updated: alerts.length, readAt: now }));
      return;
    }

    if (method === 'DELETE' && /\/api\/users\/me\/alerts\/read\/?$/i.test(path)) {
      for (let index = alerts.length - 1; index >= 0; index -= 1) {
        if (alerts[index].isRead) {
          alerts.splice(index, 1);
        }
      }

      await route.fulfill(json({ deleted: true }));
      return;
    }

    const readMatch = path.match(/\/api\/users\/me\/alerts\/([^/]+)\/read\/?$/i);
    if (method === 'PATCH' && readMatch) {
      const alertId = decodeURIComponent(readMatch[1]);
      const payload = (request.postDataJSON?.() ?? {}) as { isRead?: boolean };
      const index = alerts.findIndex((entry) => entry.id === alertId);

      if (index < 0) {
        await route.fulfill(json({ message: 'Alert not found' }, 404));
        return;
      }

      const now = '2026-04-01T11:30:00.000Z';
      const isRead = payload.isRead !== false;
      alerts[index] = {
        ...alerts[index],
        isRead,
        readAt: isRead ? (alerts[index].readAt ?? now) : null,
        updatedAt: now,
      };

      await route.fulfill(json(alerts[index]));
      return;
    }

    if (method === 'GET' && path.endsWith('/profile/sessions')) {
      await route.fulfill(
        json({
          version: 1,
          sessions: [],
        })
      );
      return;
    }

    if (method === 'POST' && path.endsWith('/profile/sessions/logout-others')) {
      await route.fulfill(
        json({
          jwt: 'header.eyJleHAiOjQxMDI0NDQ4MDB9.signature',
          user: PROFILE,
          sessionsRevoked: 0,
          sessionVersion: 1,
          sessions: [],
        })
      );
      return;
    }

    if (method === 'GET' && (path === '/api/users/me' || path.endsWith('/profile'))) {
      await route.fulfill(json(PROFILE));
      return;
    }

    await route.fulfill(json({ message: 'Unhandled users/me route' }, 404));
  });
}

test.describe('Notification panel', () => {
  test('marks a header notification as read, then navigates to alerts inbox and clears processed items', async ({
    page,
  }) => {
    await mockNotificationApis(page, [
      {
        id: 'alert-rail',
        title: 'Rail capacity risk',
        message: 'Ontario rail congestion is affecting battery deliveries.',
        severity: 'warning',
        sourceType: 'system',
        sourceId: 'rail-1',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: '2026-04-01T10:30:00.000Z',
        updatedAt: '2026-04-01T10:30:00.000Z',
      },
      {
        id: 'alert-port',
        title: 'Port disruption',
        message: 'Montreal port dwell time increased by 14%.',
        severity: 'critical',
        sourceType: 'system',
        sourceId: 'port-1',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: '2026-04-01T09:15:00.000Z',
        updatedAt: '2026-04-01T09:15:00.000Z',
      },
      {
        id: 'alert-digest',
        title: 'Morning digest',
        message: 'Your daily watchlist digest is ready.',
        severity: 'info',
        sourceType: 'saved-search',
        sourceId: 'watch-1',
        metadata: null,
        isRead: true,
        readAt: '2026-04-01T08:05:00.000Z',
        createdAt: '2026-04-01T08:00:00.000Z',
        updatedAt: '2026-04-01T08:05:00.000Z',
      },
    ]);

    await seedAuthenticatedSession(page, PROFILE);

    await page.goto('/profile');
    await expect(page.locator('[data-og7="site-header"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="notification-unread-count"]')).toHaveText('2');

    await page.locator('[data-og7-id="notification-trigger"]').click();

    const headerPanel = page.locator('[data-og7-id="header-alerts-panel"]');
    await expect(headerPanel).toBeVisible();
    await expect(headerPanel.locator('[data-og7-id="header-alert-item"]')).toHaveCount(3);
    await expect(headerPanel).toContainText('Rail capacity risk');
    await expect(headerPanel).toContainText('Port disruption');

    const markRailRead = page.waitForResponse((response) =>
      response.request().method().toUpperCase() === 'PATCH' &&
      response.url().includes('/api/users/me/alerts/alert-rail/read')
    );

    await headerPanel.locator('[data-og7-id="header-alert-item"]').filter({ hasText: 'Rail capacity risk' }).click();
    await markRailRead;

    await expect(page.locator('[data-og7-id="notification-unread-count"]')).toHaveText('1');

    await headerPanel.locator('[data-og7-id="header-alerts-inbox-link"]').click();

    await expect(page).toHaveURL(/\/alerts$/);
    await expect(page.locator('[data-og7="user-alerts"]')).toBeVisible();
    await expect(page.locator('[data-og7="user-alert-item"]')).toHaveCount(3);
    await expect(
      page.locator('[data-og7="user-alert-item"]').filter({ hasText: 'Rail capacity risk' })
    ).toHaveAttribute('data-og7-state', 'read');
    await expect(
      page.locator('[data-og7="user-alert-item"]').filter({ hasText: 'Port disruption' })
    ).toHaveAttribute('data-og7-state', 'unread');

    const markAllRead = page.waitForResponse((response) =>
      response.request().method().toUpperCase() === 'PATCH' &&
      response.url().includes('/api/users/me/alerts/read-all')
    );
    await page.locator('[data-og7-id="alerts-mark-all-read"]').click();
    await markAllRead;

    await expect(page.locator('[data-og7="user-alert-item"][data-og7-state="unread"]')).toHaveCount(0);
    await expect(page.locator('[data-og7-id="notification-unread-count"]')).toHaveCount(0);

    const clearRead = page.waitForResponse((response) =>
      response.request().method().toUpperCase() === 'DELETE' &&
      /\/api\/users\/me\/alerts\/read\/?$/i.test(new URL(response.url()).pathname)
    );
    await page.locator('[data-og7-id="alerts-clear-read"]').click();
    await clearRead;

    await expect(page.locator('[data-og7-id="alerts-empty"]')).toBeVisible();
  });
});
