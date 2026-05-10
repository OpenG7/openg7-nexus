import './setup';
import { expect, test } from '@playwright/test';

test.describe('Home sections', () => {
  test('renders hero and live feed sections', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('[data-og7="hero"][data-og7-id="section"]')).toBeVisible();
    await expect(
      page.locator('[data-og7="search-box"] input[type="search"]').first(),
    ).toBeVisible();
    await expect(page.locator('[data-og7="corridors-realtime"]')).toBeVisible();
  });

  test('feed controls expose scope tabs and filter chips', async ({ page }) => {
    await page.goto('/');

    const scopeTabs = page.locator('[role="tablist"] button[role="tab"]');
    await expect(scopeTabs.first()).toBeVisible();

    const filterChips = page.locator('og7-home-feed-section button[aria-pressed]');
    await expect(filterChips.first()).toBeVisible();
  });
});
