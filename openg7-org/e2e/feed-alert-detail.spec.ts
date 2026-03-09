import './setup';
import { expect, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser, mockAuthenticatedSessionApis } from './helpers/auth-session';

test.describe('Feed alert detail', () => {
  test('renders alert details with dedicated CTA and related links', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);
    await loginAsAuthenticatedE2eUser(page, '/feed/alerts/alert-001');
    await expect(page).toHaveURL(/\/feed\/alerts\/alert-001/);

    await expect(page.locator('[data-og7="alert-detail-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="alert-detail-header"]')).toBeVisible();
    await expect(page.locator('[data-og7="alert-detail-body"]')).toBeVisible();
    await expect(page.locator('[data-og7="alert-context-aside"]')).toBeVisible();

    await page.locator('[data-og7-id="alert-subscribe"]').click();
    await page.locator('[data-og7-id="alert-report-update"]').click();
    await page.locator('[data-og7-id="alert-share"]').click();

    await page.locator('[data-og7="alert-related-opportunities"] ul li button').first().click();
    await expect(page).toHaveURL(/\/feed\/opportunities\/[^/]+$/);
  });
});


