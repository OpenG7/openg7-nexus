import './setup';
import { expect, test } from '@playwright/test';

test('dedicated hydrocarbon feed view loads specialized context and panel', async ({ page }) => {
  await page.goto('/feed/hydrocarbons');

  await expect(page).toHaveURL(/\/feed\/hydrocarbons(?:\?.*)?$/);
  await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
  await expect(page.locator('[data-og7="feed-view-context"]')).toBeVisible();
  await expect(page.locator('[data-og7="hydrocarbon-signals-panel"]')).toBeVisible();
});
