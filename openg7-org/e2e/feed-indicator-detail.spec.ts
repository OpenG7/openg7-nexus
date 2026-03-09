import './setup';
import { expect, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser, mockAuthenticatedSessionApis } from './helpers/auth-session';

test.describe('Feed indicator detail', () => {
  test('renders indicator detail and supports alert drawer flow', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);
    await loginAsAuthenticatedE2eUser(page, '/feed/indicators/indicator-001');
    await expect(page).toHaveURL(/\/feed\/indicators\/indicator-001/);

    await expect(page.locator('[data-og7="indicator-detail-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="indicator-detail-header"]')).toBeVisible();
    await expect(page.locator('[data-og7="indicator-chart"]')).toBeVisible();
    await expect(page.locator('[data-og7="indicator-stats-aside"]')).toBeVisible();

    await page.locator('[data-og7-id="indicator-subscribe"]').click();
    await page.locator('[data-og7-id="indicator-timeframe-24h"]').click();
    await page.locator('[data-og7-id="indicator-granularity-hour"]').click();

    await page.locator('[data-og7-id="indicator-create-alert"]').click();
    await expect(page.locator('[data-og7="indicator-alert-drawer"]')).toBeVisible();
    await page.locator('[data-og7="indicator-alert-drawer"] input[type="number"]').fill('15');
    await page.locator('[data-og7="indicator-alert-drawer"] textarea').fill('Notify operations if spot prices exceed threshold.');
    await page.locator('[data-og7-id="indicator-alert-submit"]').click();
    await expect(page.locator('[data-og7="indicator-alert-drawer"]')).toBeHidden();

    await page.locator('[data-og7="indicator-related-opportunities"] ul li button').first().click();
    await expect(page).toHaveURL(/\/feed(?:\/opportunities\/[^/?#]+|\?type=REQUEST)/);
  });
});


