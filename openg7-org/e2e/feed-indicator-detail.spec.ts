import './setup';
import { expect, test } from '@playwright/test';

import { mockAuthenticatedSessionApis, seedAuthenticatedSession } from './helpers/auth-session';

test.describe('Feed indicator detail', () => {
  test('persists an indicator subscription created from the subscribe CTA across reloads', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);
    await seedAuthenticatedSession(page);
    await page.goto('/feed/indicators/indicator-001');
    await expect(page).toHaveURL(/\/feed\/indicators\/indicator-001/);

    await expect(page.locator('[data-og7="indicator-detail-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="indicator-detail-header"]')).toBeVisible();
    await expect(page.locator('[data-og7="indicator-chart"]')).toBeVisible();
    await expect(page.locator('[data-og7="indicator-stats-aside"]')).toBeVisible();
    await page.locator('[data-og7-id="indicator-timeframe-24h"]').click();
    await page.locator('[data-og7-id="indicator-granularity-hour"]').click();

    const subscribeButton = page.locator('[data-og7-id="indicator-subscribe"]');
    await expect(subscribeButton).toHaveText(/S'abonner|Subscribe/i);
    await expect(subscribeButton).toBeEnabled();

    await subscribeButton.click();
    await expect(page.locator('[data-og7="indicator-alert-drawer"]')).toBeVisible();
    await page.locator('[data-og7="indicator-alert-drawer"] input[type="number"]').fill('15');
    await page.locator('[data-og7="indicator-alert-drawer"] textarea').fill('Notify operations if spot prices exceed threshold.');
    await page.locator('[data-og7-id="indicator-alert-submit"]').click();
    await expect(page.locator('[data-og7="indicator-alert-drawer"]')).toBeHidden();
    await expect(subscribeButton).toHaveText(/Abonne|Subscribed/i);
    await expect(subscribeButton).toBeDisabled();

    await page.reload();
    await expect(page.locator('[data-og7-id="indicator-subscribe"]')).toHaveText(/Abonne|Subscribed/i);
    await expect(page.locator('[data-og7-id="indicator-subscribe"]')).toBeDisabled();

    await page.locator('[data-og7="indicator-related-opportunities"] ul li button').first().click();
    await expect(page).toHaveURL(/\/feed(?:\/opportunities\/[^/?#]+|\?type=REQUEST)/);
  });
});


