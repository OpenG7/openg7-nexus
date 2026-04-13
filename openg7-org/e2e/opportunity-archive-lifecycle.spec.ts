import './setup';
import { expect, type Page, type Route, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser } from './helpers/auth-session';
import { mockProfileAndFavoritesApis } from './helpers/domain-mocks';

async function enableMockFeed(page: Page): Promise<void> {
  await page.route('**/runtime-config.js', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.__OG7_CONFIG__ = {
        FEATURE_FLAGS: {
          feedMocks: true,
          homeFeedMocks: true
        }
      };`,
    });
  });
}

async function expectVisibleItemIds(page: Page, expectedIds: string[]): Promise<void> {
  await expect
    .poll(async () =>
      page
        .locator('[data-feed-item-id]')
        .evaluateAll(elements => elements.map(element => element.getAttribute('data-feed-item-id') ?? ''))
    )
    .toEqual(expectedIds);
}

test.describe('Opportunity archive lifecycle', () => {
  test('persists archived state across feed list, reload, and reopened detail', async ({ page }) => {
    await enableMockFeed(page);
    await mockProfileAndFavoritesApis(page);

    await loginAsAuthenticatedE2eUser(page, '/feed?type=OFFER&q=reserve');

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(page.locator('#feed-type')).toHaveValue(/OFFER$/);
    await expect(page.locator('#feed-search')).toHaveValue('reserve');
    await expectVisibleItemIds(page, ['offer-user-001']);

    await page.locator('[data-feed-item-id="offer-user-001"] [data-og7-id="feed-open-item"]').click();

    await expect(page).toHaveURL(/\/feed\/opportunities\/offer-user-001\?type=OFFER&q=reserve$/);
    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="opportunity-archive"]')).toBeVisible();

    await page.locator('[data-og7-id="opportunity-archive"]').click();

    await expect(page.locator('[data-og7-id="opportunity-status-label"]')).toContainText(/Archiv/i);
    await expect(page.locator('.opportunity-header__sync[data-og7-state="saved-local"]')).toBeVisible();

    await page.goBack();

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(page).toHaveURL(/\/feed\?type=OFFER&q=reserve$/);
    await expectVisibleItemIds(page, ['offer-user-001']);
    await expect(page.locator('[data-feed-item-id="offer-user-001"]')).toContainText(/Archiv/i);

    await page.reload();
    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expectVisibleItemIds(page, ['offer-user-001']);
    await expect(page.locator('[data-feed-item-id="offer-user-001"]')).toContainText(/Archiv/i);

    await page.locator('[data-feed-item-id="offer-user-001"] [data-og7-id="feed-open-item"]').click();
    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="opportunity-status-label"]')).toContainText(/Archiv/i);
  });
});