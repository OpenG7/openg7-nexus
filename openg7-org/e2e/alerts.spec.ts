import './setup';
import { expect, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser } from './helpers/auth-session';
import { mockProfileAndFavoritesApis } from './helpers/domain-mocks';

interface SavedSearchSeed {
  id: string;
  name: string;
  scope: 'all' | 'companies' | 'partners' | 'feed' | 'map' | 'opportunities';
  frequency: 'realtime' | 'daily' | 'weekly';
  query: string;
}

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

test.describe('Alerts page', () => {
  test('generates alerts, marks all as read, then clears read alerts', async ({ page }) => {
    const savedSearches: SavedSearchSeed[] = [
      {
        id: 'saved-1',
        name: 'Lithium watch',
        scope: 'map',
        frequency: 'daily',
        query: 'lithium import',
      },
    ];

    const alerts: AlertRecord[] = [];

    await mockProfileAndFavoritesApis(page);

    await page.route('**/api/users/me/alerts**', async (route) => {
      const request = route.request();
      const method = request.method().toUpperCase();
      const url = new URL(request.url());
      const path = url.pathname;

      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204 });
        return;
      }

      if (method === 'GET' && /\/api\/users\/me\/alerts\/?$/i.test(path)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(alerts),
        });
        return;
      }

      if (method === 'POST' && /\/api\/users\/me\/alerts\/generate\/?$/i.test(path)) {
        const now = new Date().toISOString();
        const generated: AlertRecord[] = [];

        for (const saved of savedSearches) {
          if (alerts.some((entry) => entry.sourceType === 'saved-search' && entry.sourceId === saved.id)) {
            continue;
          }

          const next: AlertRecord = {
            id: `alert-${alerts.length + 1}`,
            title: `Saved search update: ${saved.name}`,
            message: `New activity matches "${saved.query}" in ${saved.scope}.`,
            severity: saved.frequency === 'realtime' ? 'warning' : 'info',
            sourceType: 'saved-search',
            sourceId: saved.id,
            metadata: {
              savedSearchId: saved.id,
              query: saved.query,
              scope: saved.scope,
              frequency: saved.frequency,
            },
            isRead: false,
            readAt: null,
            createdAt: now,
            updatedAt: now,
          };

          alerts.unshift(next);
          generated.push(next);
        }

        await route.fulfill({
          status: generated.length ? 201 : 200,
          contentType: 'application/json',
          body: JSON.stringify({
            count: generated.length,
            skipped: savedSearches.length - generated.length,
            generated,
          }),
        });
        return;
      }

      const readMatch = path.match(/\/api\/users\/me\/alerts\/([^/]+)\/read\/?$/i);
      if (method === 'PATCH' && readMatch) {
        const alertId = decodeURIComponent(readMatch[1]);
        const payload = (request.postDataJSON?.() ?? {}) as { isRead?: boolean };
        const index = alerts.findIndex((entry) => entry.id === alertId);

        if (index < 0) {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Alert not found' }),
          });
          return;
        }

        const now = new Date().toISOString();
        const current = alerts[index];
        const isRead = payload.isRead !== false;

        const updated: AlertRecord = {
          ...current,
          isRead,
          readAt: isRead ? (current.readAt ?? now) : null,
          updatedAt: now,
        };

        alerts[index] = updated;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updated),
        });
        return;
      }

      if (method === 'PATCH' && /\/api\/users\/me\/alerts\/read-all\/?$/i.test(path)) {
        const now = new Date().toISOString();
        let updated = 0;
        for (let index = 0; index < alerts.length; index += 1) {
          const current = alerts[index];
          if (current.isRead) {
            continue;
          }
          alerts[index] = {
            ...current,
            isRead: true,
            readAt: current.readAt ?? now,
            updatedAt: now,
          };
          updated += 1;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            updated,
            readAt: updated > 0 ? now : null,
          }),
        });
        return;
      }

      if (method === 'DELETE' && /\/api\/users\/me\/alerts\/read\/?$/i.test(path)) {
        const before = alerts.length;
        for (let index = alerts.length - 1; index >= 0; index -= 1) {
          if (alerts[index].isRead) {
            alerts.splice(index, 1);
          }
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ deleted: before - alerts.length }),
        });
        return;
      }

      const deleteMatch = path.match(/\/api\/users\/me\/alerts\/([^/]+)\/?$/i);
      if (method === 'DELETE' && deleteMatch) {
        const alertId = decodeURIComponent(deleteMatch[1]);
        const index = alerts.findIndex((entry) => entry.id === alertId);
        if (index >= 0) {
          alerts.splice(index, 1);
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: alertId, deleted: true }),
        });
        return;
      }

      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unhandled alerts route' }),
      });
    });

    await loginAsAuthenticatedE2eUser(page, '/alerts');
    await expect(page).toHaveURL(/\/alerts$/);
    await expect(page.locator('[data-og7="user-alerts"]')).toBeVisible();

    await page.locator('[data-og7-id="alerts-generate"]').click();

    const firstAlert = page.locator('[data-og7="user-alert-item"]').first();
    await expect(firstAlert).toBeVisible();
    await expect(firstAlert).toHaveAttribute('data-og7-state', 'unread');

    await page.locator('[data-og7-id="alerts-mark-all-read"]').click();
    await expect(firstAlert).toHaveAttribute('data-og7-state', 'read');

    await page.locator('[data-og7-id="alerts-clear-read"]').click();
    await expect(page.locator('[data-og7-id="alerts-empty"]')).toBeVisible();
  });
});
