import './setup';
import { expect, test } from '@playwright/test';

test.describe('Corridors realtime', () => {
  test('opens a corridor-focused feed with derived province filters', async ({ page }) => {
    await page.goto('/');

    const corridorItem = page.locator(
      '[data-og7="corridors-realtime"] [data-og7-id="corridor-item"][data-og7-corridor-id="essential-services"]'
    );

    await expect(corridorItem).toBeVisible();
    await corridorItem.click();

    await expect(page).toHaveURL(/\/feed/);
    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();

    await expect
      .poll(() => new URL(page.url()).searchParams.get('source'))
      .toBe('corridors-realtime');
    await expect
      .poll(() => new URL(page.url()).searchParams.get('corridorId'))
      .toBe('essential-services');

    await expect(page.locator('[data-og7="feed-source-context"]')).toBeVisible();
    await expect(page.locator('#feed-from')).toHaveValue(/QC$/);
    await expect(page.locator('#feed-to')).toHaveValue(/ON$/);
    await expect(page.locator('[data-og7="feed-active-filters"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="fromProvince"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="toProvince"]')).toBeVisible();

    await expect.poll(() => page.locator('[data-feed-item-id]').count()).toBe(2);
    await expect(page.locator('[data-feed-item-id="offer-001"]')).toBeVisible();
    await expect(page.locator('[data-feed-item-id="request-001"]')).toBeVisible();
    await expect(page.locator('[data-feed-item-id="request-002"]')).toHaveCount(0);
  });
});
