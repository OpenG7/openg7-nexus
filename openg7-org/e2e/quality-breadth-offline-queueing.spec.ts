import './setup';
import { expect, Page, Route, test } from '@playwright/test';

import {
  loginAsAuthenticatedE2eUser,
  mockAuthenticatedSessionApis,
  seedAuthenticatedSession,
} from './helpers/auth-session';
import { mockProfileAndFavoritesApis } from './helpers/domain-mocks';

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

function createDeferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

test.describe('Quality breadth offline queueing', () => {
  test('keeps profile edits local during an offline save and commits them only after a successful retry', async ({
    page,
  }) => {
    const firstAttemptReady = createDeferred();
    let profileUpdateAttempts = 0;

    await mockProfileAndFavoritesApis(page);
    await page.route('**/api/users/me/profile', async (route) => {
      const request = route.request();
      if (request.method().toUpperCase() !== 'PUT') {
        await route.fallback();
        return;
      }

      profileUpdateAttempts += 1;
      if (profileUpdateAttempts === 1) {
        await firstAttemptReady.promise;
        await route.abort('internetdisconnected');
        return;
      }

      await route.fallback();
    });

    await loginAsAuthenticatedE2eUser(page, '/profile');

    const profileForm = page.locator('[data-og7="user-profile-form"]');
    const saveButton = profileForm.locator('button[type="submit"]');
    const jobTitleInput = page.locator('#profile-job-title');
    const phoneInput = page.locator('#profile-phone');

    await jobTitleInput.fill('Queued offline trade lead');
    await phoneInput.fill('+1 438 555 0188');

    await saveButton.click();

    await expect(saveButton).toBeDisabled();
    await expect.poll(() => profileUpdateAttempts).toBe(1);
    await expect(page.locator('[data-og7="notification-toast"][data-og7-id="success"]')).toHaveCount(0);

    firstAttemptReady.resolve();

    await expect(
      page.locator('[data-og7="notification-toast"][data-og7-id="error"]').last()
    ).toBeVisible();
    await expect(page.locator('[data-og7="user-profile-unsaved-changes"]')).toBeVisible();
    await expect(jobTitleInput).toHaveValue('Queued offline trade lead');
    await expect(phoneInput).toHaveValue('+1 438 555 0188');
    await expect(saveButton).toBeEnabled();
    await expect(page.locator('[data-og7="notification-toast"][data-og7-id="success"]')).toHaveCount(0);

    await saveButton.click();

    await expect(
      page.locator('[data-og7="notification-toast"][data-og7-id="success"]').last()
    ).toBeVisible();
    await expect(page.locator('[data-og7="user-profile-unsaved-changes"]')).toHaveCount(0);
    await expect.poll(() => profileUpdateAttempts).toBe(2);

    await page.reload();
    await expect(jobTitleInput).toHaveValue('Queued offline trade lead');
    await expect(phoneInput).toHaveValue('+1 438 555 0188');
  });

  test('keeps a saved-search draft visible through an offline create failure and persists exactly one entry after retry', async ({
    page,
  }) => {
    const firstCreateReady = createDeferred();
    let createAttempts = 0;
    const savedSearches: SavedSearchRecord[] = [];

    await mockProfileAndFavoritesApis(page);
    await page.route('**/api/users/me/saved-searches**', async (route) => {
      const request = route.request();
      const method = request.method().toUpperCase();
      const url = new URL(request.url());
      const path = url.pathname;

      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204 });
        return;
      }

      if (method === 'GET' && path.endsWith('/saved-searches')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(savedSearches),
        });
        return;
      }

      if (method === 'POST' && path.endsWith('/saved-searches')) {
        createAttempts += 1;
        if (createAttempts === 1) {
          await firstCreateReady.promise;
          await route.abort('internetdisconnected');
          return;
        }

        const payload = (request.postDataJSON?.() ?? {}) as Partial<SavedSearchRecord>;
        const created: SavedSearchRecord = {
          id: `saved-${savedSearches.length + 1}`,
          name: typeof payload.name === 'string' ? payload.name : 'Saved search',
          scope: payload.scope === 'feed' ? 'feed' : 'all',
          filters:
            payload.filters && typeof payload.filters === 'object' && !Array.isArray(payload.filters)
              ? payload.filters
              : {},
          notifyEnabled: Boolean(payload.notifyEnabled),
          frequency: payload.frequency === 'weekly' ? 'weekly' : payload.frequency === 'realtime' ? 'realtime' : 'daily',
          lastRunAt: null,
          createdAt: '2026-04-07T10:00:00.000Z',
          updatedAt: '2026-04-07T10:00:00.000Z',
        };
        savedSearches.unshift(created);

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(created),
        });
        return;
      }

      await route.fallback();
    });

    await loginAsAuthenticatedE2eUser(page, '/saved-searches');

    const nameInput = page.locator('[data-og7-id="saved-search-name"]');
    const queryInput = page.locator('[data-og7-id="saved-search-query"]');
    const scopeSelect = page.locator('[data-og7-id="saved-search-scope"]');
    const notifyToggle = page.locator('[data-og7-id="saved-search-notify"]');
    const createButton = page.locator('[data-og7-id="saved-search-create"]');

    await nameInput.fill('Queued critical imports');
    await queryInput.fill('critical minerals import');
    await scopeSelect.selectOption('feed');
    await notifyToggle.check();

    await createButton.click();

    await expect(createButton).toBeDisabled();
    await expect.poll(() => createAttempts).toBe(1);
    await expect(page.locator('[data-og7="saved-search-item"]')).toHaveCount(0);

    firstCreateReady.resolve();

    await expect(page.locator('[data-og7-id="saved-search-error"]')).toBeVisible();
    await expect(nameInput).toHaveValue('Queued critical imports');
    await expect(queryInput).toHaveValue('critical minerals import');
    await expect(scopeSelect).toHaveValue('feed');
    await expect(notifyToggle).toBeChecked();
    await expect(createButton).toBeEnabled();
    await expect(page.locator('[data-og7="saved-search-item"]')).toHaveCount(0);

    await createButton.click();

    await expect(page.locator('[data-og7-id="saved-search-error"]')).toHaveCount(0);
    await expect(page.locator('[data-og7="saved-search-item"]')).toHaveCount(1);
    await expect.poll(() => createAttempts).toBe(2);

    const firstItem = page.locator('[data-og7="saved-search-item"]').first();
    await expect(firstItem).toContainText('Queued critical imports');
    await expect(firstItem).toContainText('critical minerals import');

    await page.reload();
    await expect(page.locator('[data-og7="saved-search-item"]')).toHaveCount(1);
    await expect(page.locator('[data-og7="saved-search-item"]').first()).toContainText(
      'Queued critical imports'
    );
  });

  test('restores an offline indicator alert draft after reload and retries it successfully once reconnected', async ({
    page,
  }) => {
    await mockAuthenticatedSessionApis(page);
    await seedAuthenticatedSession(page);

    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.setItem(
        'og7.indicator-alert-drafts.v1.e2e-user-1',
        JSON.stringify({
          'indicator-001': {
            thresholdDirection: 'gt',
            thresholdValue: 19,
            window: '24h',
            frequency: 'hourly',
            notifyDelta: true,
            note: 'Retry this alert only after the live feed reconnects.',
          },
        })
      );
    });

    await page.goto('/feed/indicators/indicator-001');

    await expect(page.locator('[data-og7="indicator-detail-page"]')).toBeVisible();

    const subscribeButton = page.locator('[data-og7-id="indicator-subscribe"]');
    await expect(subscribeButton).toHaveText(/S'abonner|Subscribe/i);
    await subscribeButton.click();

    const drawer = page.locator('[data-og7="indicator-alert-drawer"]');
    const thresholdInput = drawer.locator('[data-og7-id="threshold-value"]');
    const noteInput = drawer.locator('[data-og7-id="note"]');

    await expect(drawer).toBeVisible();
    await expect(drawer.locator('[data-og7="indicator-alert-status"][data-og7-id="offline"]')).toBeVisible();
    await expect(drawer.locator('[data-og7-id="indicator-alert-retry"]')).toBeVisible();
    await expect(thresholdInput).toHaveValue('19');
    await expect(noteInput).toHaveValue('Retry this alert only after the live feed reconnects.');
    await expect(subscribeButton).toHaveText(/S'abonner|Subscribe/i);

    await page.reload();
    await expect(page.locator('[data-og7-id="indicator-subscribe"]')).toHaveText(/S'abonner|Subscribe/i);

    await page.locator('[data-og7-id="indicator-subscribe"]').click();
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('[data-og7="indicator-alert-status"][data-og7-id="offline"]')).toBeVisible();
    await expect(thresholdInput).toHaveValue('19');
    await expect(noteInput).toHaveValue('Retry this alert only after the live feed reconnects.');
    await expect(drawer.locator('[data-og7="indicator-alert-view"]')).toHaveCount(0);
    await expect(drawer.locator('[data-og7-id="indicator-alert-retry"]')).toBeVisible();
    await drawer.locator('[data-og7-id="indicator-alert-retry"]').click();

    await expect(drawer).toBeHidden();
    await expect(page.locator('[data-og7-id="indicator-subscribe"]')).toHaveText(/Voir mon alerte|View my alert/i);

    await page.reload();
    await expect(page.locator('[data-og7-id="indicator-subscribe"]')).toHaveText(/Voir mon alerte|View my alert/i);
    await page.locator('[data-og7-id="indicator-subscribe"]').click();
    await expect(page.locator('[data-og7="indicator-alert-view"]')).toBeVisible();
  });
});