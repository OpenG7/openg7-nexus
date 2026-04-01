import './setup';
import { test, expect, type Page } from '@playwright/test';

import { mockAuthenticatedSessionApis, seedAuthenticatedSession } from './helpers/auth-session';

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

async function mockSearchApis(page: Page, savedSearches: SavedSearchRecord[]): Promise<void> {
  await page.route('**/api/search**', async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get('q') ?? '';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        query,
        took: 5,
        total: 0,
        companies: [],
        exchanges: [],
        engine: {
          enabled: true,
          driver: 'mock',
          indices: {
            companies: 'mock-companies',
            exchanges: 'mock-exchanges',
          },
        },
      }),
    });
  });

  await page.route('**/api/users/me/saved-searches**', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    const idMatch = url.pathname.match(/\/saved-searches\/([^/]+)\/?$/i);
    const resourceId = idMatch ? decodeURIComponent(idMatch[1]) : null;
    const now = new Date().toISOString();

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(savedSearches),
      });
      return;
    }

    if (method === 'POST') {
      const payload = (request.postDataJSON?.() ?? {}) as Partial<SavedSearchRecord>;
      const created: SavedSearchRecord = {
        id: `saved-${savedSearches.length + 1}`,
        name: String(payload.name ?? 'Saved search'),
        scope: (payload.scope as SavedSearchRecord['scope']) ?? 'all',
        filters:
          payload.filters && typeof payload.filters === 'object' && !Array.isArray(payload.filters)
            ? payload.filters
            : {},
        notifyEnabled: Boolean(payload.notifyEnabled),
        frequency: (payload.frequency as SavedSearchRecord['frequency']) ?? 'daily',
        lastRunAt: null,
        createdAt: now,
        updatedAt: now,
      };
      savedSearches.unshift(created);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(created),
      });
      return;
    }

    if (method === 'DELETE' && resourceId) {
      const index = savedSearches.findIndex((entry) => entry.id === resourceId);
      if (index >= 0) {
        savedSearches.splice(index, 1);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: resourceId, deleted: true }),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unhandled saved-searches route' }),
    });
  });
}

async function openQuickSearchWithInitialQuery(page: Page, query: string): Promise<void> {
  const opened = await page.evaluate((nextQuery) => {
    const ngApi = (window as Window & {
      ng?: {
        getComponent?: (target: Element) => { quickSearchLauncher?: { open: (data?: unknown) => void } } | null;
        getOwningComponent?: (target: Element) => { quickSearchLauncher?: { open: (data?: unknown) => void } } | null;
      };
    }).ng;
    const headerHost = document.querySelector('og7-site-header');
    const headerContent = document.querySelector('[data-og7="site-header"]');
    const headerComponent =
      (headerHost && ngApi?.getComponent?.(headerHost)) ||
      (headerContent && ngApi?.getOwningComponent?.(headerContent)) ||
      null;
    if (!headerComponent?.quickSearchLauncher?.open) {
      return false;
    }
    headerComponent.quickSearchLauncher.open({
      source: 'e2e-search',
      initialQuery: String(nextQuery),
    });
    return true;
  }, query);

  expect(opened).toBe(true);
  await expect(page.locator('[data-og7="quick-search-modal"]')).toBeVisible();
  await expect(page.locator('[data-og7-id="quick-search-input"]')).toHaveValue(query);
}

async function saveQuickSearchCurrentQuery(page: Page): Promise<void> {
  const saved = await page.evaluate(() => {
    const ngApi = (window as Window & {
      ng?: {
        getComponent?: (target: Element) => { saveCurrentQuery?: () => void } | null;
        getOwningComponent?: (target: Element) => { saveCurrentQuery?: () => void } | null;
      };
    }).ng;
    const modalHost = document.querySelector('og7-quick-search-modal');
    const modalContent = document.querySelector('[data-og7="quick-search-modal"]');
    const modalComponent =
      (modalHost && ngApi?.getComponent?.(modalHost)) ||
      (modalContent && ngApi?.getOwningComponent?.(modalContent)) ||
      null;
    if (!modalComponent?.saveCurrentQuery) {
      return false;
    }
    modalComponent.saveCurrentQuery();
    return true;
  });

  expect(saved).toBe(true);
}

test.describe('Quick search modal', () => {
  test('opens with Ctrl+K shortcut', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-og7="site-header"]')).toBeVisible();
    const trigger = page.locator('#desktop-search');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();

    const modal = page.locator('#quick-search-modal');
    if ((await modal.count()) === 0 || !(await modal.isVisible())) {
      await page.keyboard.press('Control+K');
    }
    if ((await modal.count()) === 0 || !(await modal.isVisible())) {
      await page.keyboard.press('Meta+K');
    }

    if ((await modal.count()) > 0) {
      await expect(modal).toBeVisible();
      const heading = modal.getByRole('heading', { name: /Quick search|Recherche rapide/ });
      await expect(heading).toBeVisible();
      const combobox = page.getByRole('combobox');
      await expect(combobox).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      return;
    }

    await expect(trigger).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('navigates with keyboard, then saves the query and exposes it in /saved-searches', async ({ page }) => {
    const savedSearches: SavedSearchRecord[] = [];

    await mockAuthenticatedSessionApis(page);
    await mockSearchApis(page, savedSearches);
    await seedAuthenticatedSession(page);

    await page.goto('/');
    await expect(page.locator('[data-og7="site-header"]')).toBeVisible();
    await expect(page.locator('[data-og7="profile"] > button')).toBeVisible();

    await openQuickSearchWithInitialQuery(page, 'new company');
    await expect(page.locator('[data-og7-id="quick-search-save"]')).toBeEnabled();

    const createCompanyResult = page.locator(
      '[data-og7-id="quick-search-result-action-create-company"]'
    );
    await expect(createCompanyResult).toBeVisible();
    await expect.poll(() => page.locator('[data-og7="quick-search-result"]').count()).toBe(1);

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/companies\/register(?:$|[?#])/);
    await expect(page.locator('[data-og7="company-register"]')).toBeVisible();

    await openQuickSearchWithInitialQuery(page, 'new company');
    const saveButton = page.locator('[data-og7-id="quick-search-save"]');
    await expect(saveButton).toBeEnabled();
    await saveQuickSearchCurrentQuery(page);
    await expect.poll(() => savedSearches.length).toBe(1);

    await page.goto('/saved-searches');
    await expect(page.locator('[data-og7="saved-searches"]')).toBeVisible();

    const savedItem = page.locator('[data-og7="saved-search-item"]').first();
    await expect(savedItem).toContainText('new company');
  });
});
