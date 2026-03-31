import './setup';
import { expect, test } from '@playwright/test';

test('header more menu navigates to the hydrocarbon feed view', async ({ page }) => {
  await page.goto('/');

  await page.locator('[data-og7="more"] > button').click();
  await page.locator('a[href="/feed/hydrocarbons"]').click();

  await expect(page).toHaveURL(/\/feed\/hydrocarbons$/);
  await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
  await expect(page.locator('[data-og7="feed-view-context"]')).toBeVisible();
  await expect(page.locator('[data-og7="hydrocarbon-signals-panel"]')).toBeVisible();
});