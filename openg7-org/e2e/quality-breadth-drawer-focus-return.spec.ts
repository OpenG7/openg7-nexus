import './setup';
import { expect, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser, mockAuthenticatedSessionApis } from './helpers/auth-session';

test.describe('Quality breadth drawer focus return', () => {
  test('keeps the opportunity offer drawer keyboard-usable and returns focus to its opener', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);
    await loginAsAuthenticatedE2eUser(page, '/feed/opportunities/request-001');

    await expect(page).toHaveURL(/\/feed\/opportunities\/request-001/);

    const opener = page.locator('[data-og7-id="opportunity-make-offer"]');
    const drawer = page.locator('[data-og7="opportunity-offer-drawer"]');
    const closeButton = drawer.locator('header button').first();
    const capacity = drawer.locator('[data-og7-id="capacity"]');
    const startDate = drawer.locator('[data-og7-id="start-date"]');
    const submitButton = drawer.locator('[data-og7-id="opportunity-offer-submit"]');

    await opener.focus();
    await expect(opener).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(drawer).toBeVisible();
    await page.waitForTimeout(0);

    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(capacity).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(startDate).toBeFocused();

    await submitButton.focus();
    await expect(submitButton).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(opener).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(drawer).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(drawer).toBeHidden();
    await expect(opener).toBeFocused();
  });
});