import './setup';
import { expect, type Locator, type Page, test } from '@playwright/test';

import { type E2eAuthProfile, seedAuthenticatedSession } from './helpers/auth-session';

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

interface NotificationApiOptions {
  alerts: readonly AlertRecord[];
  failMarkAllReadAttempts?: number;
}

const PROFILE: E2eAuthProfile = {
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
};

function json(body: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

async function activateWithKeyboard(page: Page, target: Locator, key: 'Enter' | 'Space' = 'Enter'): Promise<void> {
  await target.focus();
  await expect(target).toBeFocused();
  await page.keyboard.press(key);
}

async function mockNotificationInboxApis(page: Page, options: NotificationApiOptions): Promise<void> {
  const alerts = options.alerts.map((entry) => ({ ...entry }));
  let remainingMarkAllReadFailures = options.failMarkAllReadAttempts ?? 0;

  await page.route('**/api/sectors**', async route => {
    await route.fulfill(json({ data: [] }));
  });

  await page.route('**/api/provinces**', async route => {
    await route.fulfill(json({ data: [] }));
  });

  await page.route('**/api/companies**', async route => {
    await route.fulfill(json({ data: [] }));
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

    if (method === 'GET' && path.endsWith('/saved-searches')) {
      await route.fulfill(json([]));
      return;
    }

    if (method === 'GET' && path.endsWith('/alerts')) {
      await route.fulfill(json(alerts));
      return;
    }

    if (method === 'PATCH' && /\/api\/users\/me\/alerts\/read-all\/?$/i.test(path)) {
      if (remainingMarkAllReadFailures > 0) {
        remainingMarkAllReadFailures -= 1;
        await route.fulfill(
          json(
            {
              error: {
                status: 500,
                name: 'ApplicationError',
                message: 'alerts.markAll.failed',
              },
            },
            500
          )
        );
        return;
      }

      const now = '2026-04-07T15:00:00.000Z';
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

      const now = '2026-04-07T14:30:00.000Z';
      const nextRead = payload.isRead !== false;
      alerts[index] = {
        ...alerts[index],
        isRead: nextRead,
        readAt: nextRead ? (alerts[index].readAt ?? now) : null,
        updatedAt: now,
      };

      await route.fulfill(json(alerts[index]));
      return;
    }

    const deleteMatch = path.match(/\/api\/users\/me\/alerts\/([^/]+)\/?$/i);
    if (method === 'DELETE' && deleteMatch) {
      const alertId = decodeURIComponent(deleteMatch[1]);
      const index = alerts.findIndex((entry) => entry.id === alertId);

      if (index < 0) {
        await route.fulfill(json({ message: 'Alert not found' }, 404));
        return;
      }

      alerts.splice(index, 1);
      await route.fulfill(json({ id: alertId, deleted: true }));
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

test.describe('Quality breadth cross-surface accessibility depth', () => {
  test('keeps header notifications keyboard-usable and returns focus to the trigger on Escape', async ({
    page,
  }) => {
    await mockNotificationInboxApis(page, {
      alerts: [
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
          createdAt: '2026-04-07T12:00:00.000Z',
          updatedAt: '2026-04-07T12:00:00.000Z',
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
          createdAt: '2026-04-07T11:00:00.000Z',
          updatedAt: '2026-04-07T11:00:00.000Z',
        },
      ],
    });
    await seedAuthenticatedSession(page, PROFILE);

    await page.goto('/profile');
    await expect(page.locator('[data-og7="site-header"]')).toBeVisible();

    const trigger = page.locator('[data-og7-id="notification-trigger"]');
    const panel = page.locator('[data-og7-id="header-alerts-panel"]');
    const unreadCount = page.locator('[data-og7-id="notification-unread-count"]');

    await activateWithKeyboard(page, trigger);
    await expect(panel).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(unreadCount).toHaveText('2');

    const markRailRead = page.waitForResponse(
      response =>
        response.request().method().toUpperCase() === 'PATCH' &&
        response.url().includes('/api/users/me/alerts/alert-rail/read')
    );
    const firstItem = panel.locator('[data-og7-id="header-alert-item"]').first();
    await activateWithKeyboard(page, firstItem);
    await markRailRead;
    await expect(unreadCount).toHaveText('1');

    const inboxLink = panel.locator('[data-og7-id="header-alerts-inbox-link"]');
    await inboxLink.focus();
    await expect(inboxLink).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(panel).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });

  test('announces alerts inbox batch-action failures and recovers cleanly on retry', async ({ page }) => {
    await mockNotificationInboxApis(page, {
      alerts: [
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
          createdAt: '2026-04-07T12:00:00.000Z',
          updatedAt: '2026-04-07T12:00:00.000Z',
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
          createdAt: '2026-04-07T11:00:00.000Z',
          updatedAt: '2026-04-07T11:00:00.000Z',
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
          readAt: '2026-04-07T08:05:00.000Z',
          createdAt: '2026-04-07T08:00:00.000Z',
          updatedAt: '2026-04-07T08:05:00.000Z',
        },
      ],
      failMarkAllReadAttempts: 1,
    });
    await seedAuthenticatedSession(page, PROFILE);

    await page.goto('/alerts');
    await expect(page.locator('[data-og7="user-alerts"]')).toBeVisible();

    const markAllButton = page.locator('[data-og7-id="alerts-mark-all-read"]');
    const errorMessage = page.locator('[data-og7-id="alerts-error"]');

    const failedAttempt = page.waitForResponse(
      response =>
        response.request().method().toUpperCase() === 'PATCH' &&
        response.url().includes('/api/users/me/alerts/read-all') &&
        response.status() === 500
    );
    await activateWithKeyboard(page, markAllButton);
    await failedAttempt;

    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveAttribute('role', 'alert');
    await expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
    await expect(page.locator('[data-og7="user-alert-item"][data-og7-state="unread"]')).toHaveCount(2);
    await expect(markAllButton).toBeEnabled();

    const successfulAttempt = page.waitForResponse(
      response =>
        response.request().method().toUpperCase() === 'PATCH' &&
        response.url().includes('/api/users/me/alerts/read-all') &&
        response.status() === 200
    );
    await activateWithKeyboard(page, markAllButton);
    await successfulAttempt;

    await expect(errorMessage).toHaveCount(0);
    await expect(page.locator('[data-og7="user-alert-item"][data-og7-state="unread"]')).toHaveCount(0);
    await expect(page.locator('[data-og7-id="alerts-unread-count"]')).toContainText('0');
  });

  test('keeps alerts inbox item actions keyboard-usable while list state mutates', async ({ page }) => {
    await mockNotificationInboxApis(page, {
      alerts: [
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
          createdAt: '2026-04-07T12:00:00.000Z',
          updatedAt: '2026-04-07T12:00:00.000Z',
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
          readAt: '2026-04-07T08:05:00.000Z',
          createdAt: '2026-04-07T08:00:00.000Z',
          updatedAt: '2026-04-07T08:05:00.000Z',
        },
      ],
    });
    await seedAuthenticatedSession(page, PROFILE);

    await page.goto('/alerts');
    await expect(page.locator('[data-og7="user-alerts"]')).toBeVisible();

    const railItem = page.locator('[data-og7="user-alert-item"]').filter({ hasText: 'Rail capacity risk' });
    const digestItem = page.locator('[data-og7="user-alert-item"]').filter({ hasText: 'Morning digest' });

    const toggleRead = page.waitForResponse(
      response =>
        response.request().method().toUpperCase() === 'PATCH' &&
        response.url().includes('/api/users/me/alerts/alert-rail/read')
    );
    await activateWithKeyboard(page, railItem.locator('[data-og7-id="alert-toggle-read"]'));
    await toggleRead;
    await expect(railItem).toHaveAttribute('data-og7-state', 'read');

    const deleteDigest = page.waitForResponse(
      response =>
        response.request().method().toUpperCase() === 'DELETE' &&
        /\/api\/users\/me\/alerts\/alert-digest\/?$/i.test(new URL(response.url()).pathname)
    );
    await activateWithKeyboard(page, digestItem.locator('[data-og7-id="alert-delete"]'));
    await deleteDigest;

    await expect(page.locator('[data-og7="user-alert-item"]')).toHaveCount(1);
    await expect(page.locator('[data-og7="user-alert-item"]').first()).toContainText('Rail capacity risk');
  });
});
