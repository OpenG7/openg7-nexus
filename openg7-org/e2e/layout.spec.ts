import './setup';
import { test, expect } from '@playwright/test';

test('global layout renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-og7="app-shell"]')).toBeVisible();
  const header = page.locator('og7-site-header');
  await expect(header).toBeVisible();
  await expect(
    header.locator('[data-og7="search-box"][data-og7-id="spotlight-trigger"]').first(),
  ).toBeVisible();
  const languageButton = header.locator('[data-og7="lang"] > button');
  await expect(languageButton).toBeVisible();
  await expect(languageButton).toHaveText(/fr|en/i);
});
