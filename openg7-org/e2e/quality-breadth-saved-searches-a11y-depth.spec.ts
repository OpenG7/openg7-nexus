import './setup';
import { expect, type Locator, type Page, test } from '@playwright/test';

import { type E2eAuthProfile, seedAuthenticatedSession } from './helpers/auth-session';

interface SavedSearchRecord {
  id: string;
  name: string;
  scope: 'all' | 'companies' | 'partners' | 'feed' | 'map' | 'opportunities';
  filters: Record<string, unknown>;
  notifyEnabled: boolean;
  frequency: 'realtime' | 'daily' | 'weekly';
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SavedSearchApiOptions {
  seed: readonly SavedSearchRecord[];
  failUpdateAttempts?: number;
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

async function mockSavedSearchApis(page: Page, options: SavedSearchApiOptions): Promise<void> {
  const savedSearches = options.seed.map((entry) => ({ ...entry }));
  let remainingUpdateFailures = options.failUpdateAttempts ?? 0;

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
    const url = new URL(request.url());
    const path = url.pathname.toLowerCase();
    const savedSearchMatch = path.match(/\/api\/users\/me\/saved-searches\/([^/]+)\/?$/i);
    const savedSearchId = savedSearchMatch ? decodeURIComponent(savedSearchMatch[1]) : null;

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }

    if (method === 'GET' && path.endsWith('/favorites')) {
      await route.fulfill(json([]));
      return;
    }

    if (method === 'GET' && path.endsWith('/alerts')) {
      await route.fulfill(json([]));
      return;
    }

    if (method === 'GET' && path.endsWith('/saved-searches')) {
      await route.fulfill(json(savedSearches));
      return;
    }

    if (method === 'POST' && path.endsWith('/saved-searches')) {
      const payload = (request.postDataJSON?.() ?? {}) as Partial<SavedSearchRecord>;
      const created: SavedSearchRecord = {
        id: `saved-${savedSearches.length + 1}`,
        name: typeof payload.name === 'string' ? payload.name : 'Saved search',
        scope:
          payload.scope === 'companies' ||
          payload.scope === 'partners' ||
          payload.scope === 'feed' ||
          payload.scope === 'map' ||
          payload.scope === 'opportunities'
            ? payload.scope
            : 'all',
        filters:
          payload.filters && typeof payload.filters === 'object' && !Array.isArray(payload.filters)
            ? payload.filters
            : {},
        notifyEnabled: Boolean(payload.notifyEnabled),
        frequency:
          payload.frequency === 'realtime' || payload.frequency === 'weekly'
            ? payload.frequency
            : 'daily',
        lastRunAt: null,
        createdAt: '2026-04-07T10:00:00.000Z',
        updatedAt: '2026-04-07T10:00:00.000Z',
      };
      savedSearches.unshift(created);
      await route.fulfill(json(created, 201));
      return;
    }

    if (method === 'PATCH' && savedSearchId) {
      if (remainingUpdateFailures > 0) {
        remainingUpdateFailures -= 1;
        await route.fulfill(
          json(
            {
              error: {
                status: 500,
                name: 'ApplicationError',
                message: 'saved-searches.update.failed',
              },
            },
            500
          )
        );
        return;
      }

      const payload = (request.postDataJSON?.() ?? {}) as Partial<SavedSearchRecord>;
      const index = savedSearches.findIndex((entry) => entry.id === savedSearchId);
      if (index < 0) {
        await route.fulfill(json({ message: 'Saved search not found' }, 404));
        return;
      }

      const updated: SavedSearchRecord = {
        ...savedSearches[index],
        ...payload,
        updatedAt: '2026-04-07T11:00:00.000Z',
      };
      savedSearches[index] = updated;
      await route.fulfill(json(updated));
      return;
    }

    if (method === 'DELETE' && savedSearchId) {
      const index = savedSearches.findIndex((entry) => entry.id === savedSearchId);
      if (index >= 0) {
        savedSearches.splice(index, 1);
      }
      await route.fulfill(json({ id: savedSearchId, deleted: true }));
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

test.describe('Quality breadth saved searches accessibility depth', () => {
  test('keeps saved-search creation keyboard-usable through invalid-to-valid recovery', async ({ page }) => {
    await mockSavedSearchApis(page, { seed: [] });
    await seedAuthenticatedSession(page, PROFILE);

    await page.goto('/saved-searches');
    await expect(page.locator('[data-og7="saved-searches"]')).toBeVisible();

    const nameInput = page.locator('[data-og7-id="saved-search-name"]');
    const queryInput = page.locator('[data-og7-id="saved-search-query"]');
    const createButton = page.locator('[data-og7-id="saved-search-create"]');
    const fieldError = nameInput.locator('xpath=ancestor::div[1]/p').first();

    await activateWithKeyboard(page, createButton);

    await expect(fieldError).toBeVisible();
    await expect(fieldError).toHaveAttribute('role', 'alert');
    await expect(fieldError).toHaveAttribute('aria-live', 'assertive');
    await expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    await expect(nameInput).toHaveAttribute('aria-describedby', 'saved-search-name-error');

    const createRequest = page.waitForRequest(
      request =>
        request.method().toUpperCase() === 'POST' &&
        request.url().includes('/api/users/me/saved-searches')
    );

    await nameInput.fill('Critical minerals watch');
    await queryInput.fill('critical minerals import');
    await activateWithKeyboard(page, createButton);

    const payload = (await createRequest).postDataJSON() as {
      name?: string;
      filters?: { query?: string };
    };

    expect(payload.name).toBe('Critical minerals watch');
    expect(payload.filters?.query).toBe('critical minerals import');
    await expect(fieldError).toHaveCount(0);
    await expect(page.locator('[data-og7="saved-search-item"]')).toHaveCount(1);
    await expect(page.locator('[data-og7="saved-search-item"]').first()).toContainText(
      'Critical minerals watch'
    );
  });

  test('announces inline saved-search update failures and recovers on retry', async ({ page }) => {
    await mockSavedSearchApis(page, {
      seed: [
        {
          id: 'saved-1',
          name: 'Hydrogen corridors',
          scope: 'feed',
          filters: { query: 'hydrogen corridor' },
          notifyEnabled: false,
          frequency: 'daily',
          lastRunAt: null,
          createdAt: '2026-04-07T09:00:00.000Z',
          updatedAt: '2026-04-07T09:00:00.000Z',
        },
      ],
      failUpdateAttempts: 1,
    });
    await seedAuthenticatedSession(page, PROFILE);

    await page.goto('/saved-searches');
    await expect(page.locator('[data-og7="saved-searches"]')).toBeVisible();

    const firstItem = page.locator('[data-og7="saved-search-item"]').first();
    const notifyToggle = firstItem.locator('[data-og7-id="saved-search-item-notify"]');
    const frequencySelect = firstItem.locator('[data-og7-id="saved-search-item-frequency"]');
    const pageError = page.locator('[data-og7-id="saved-search-error"]');

    const failedUpdate = page.waitForResponse(
      response =>
        response.request().method().toUpperCase() === 'PATCH' &&
        response.url().includes('/api/users/me/saved-searches/saved-1') &&
        response.status() === 500
    );

    await activateWithKeyboard(page, notifyToggle, 'Space');
    await failedUpdate;

    await expect(pageError).toBeVisible();
    await expect(pageError).toHaveAttribute('role', 'alert');
    await expect(pageError).toHaveAttribute('aria-live', 'assertive');
    await expect(notifyToggle).not.toBeChecked();

    const successfulUpdate = page.waitForResponse(
      response =>
        response.request().method().toUpperCase() === 'PATCH' &&
        response.url().includes('/api/users/me/saved-searches/saved-1') &&
        response.status() === 200
    );

    await activateWithKeyboard(page, notifyToggle, 'Space');
    await successfulUpdate;

    await expect(pageError).toHaveCount(0);
    await expect(notifyToggle).toBeChecked();

    const frequencyUpdate = page.waitForResponse(
      response =>
        response.request().method().toUpperCase() === 'PATCH' &&
        response.url().includes('/api/users/me/saved-searches/saved-1') &&
        response.status() === 200
    );
    await frequencySelect.selectOption('weekly');
    await frequencyUpdate;

    await expect(pageError).toHaveCount(0);
    await expect(frequencySelect).toHaveValue('weekly');
  });
});
