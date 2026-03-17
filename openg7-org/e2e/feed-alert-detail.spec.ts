import './setup';
import { expect, test } from '@playwright/test';

import { mockAuthenticatedSessionApis, seedAuthenticatedSession } from './helpers/auth-session';

test.describe('Feed alert detail', () => {
  test('renders alert details with dedicated CTA and related links', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);
    await page.goto('/feed/alerts/alert-001');
    await expect(page).toHaveURL(/\/feed\/alerts\/alert-001/);

    await expect(page.locator('[data-og7="alert-detail-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="alert-detail-header"]')).toBeVisible();
    await expect(page.locator('[data-og7="alert-detail-body"]')).toBeVisible();
    await expect(page.locator('[data-og7="alert-context-aside"]')).toBeVisible();

    await page.locator('[data-og7-id="alert-subscribe"]').click();
    await page.locator('[data-og7-id="alert-share"]').click();
    await page.locator('[data-og7-id="alert-report-update"]').click();
    await expect(page.locator('[data-og7="alert-update-drawer"]')).toBeVisible();
    await page.locator('[data-og7="alert-update-field"][data-og7-id="summary"]').fill(
      'Transmission icing confirmed by the latest operator update.'
    );
    await page.locator('[data-og7="alert-update-field"][data-og7-id="source-url"]').fill(
      'https://example.com/operator-update'
    );
    await page.locator('[data-og7-id="alert-update-submit"]').click();
    await expect(page.locator('[data-og7="alert-update-status"][data-og7-id="success"]')).toBeVisible();
    await expect(page.locator('[data-og7="alert-update-drawer"]')).toBeHidden();
    await expect(page.locator('[data-og7-id="alert-view-my-report"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="alert-report-update-another"]')).toBeVisible();

    await page.locator('[data-og7-id="alert-view-my-report"]').click();
    await expect(page.locator('[data-og7="alert-update-report-view"]')).toBeVisible();
    await expect(page.locator('[data-og7="alert-update-report-status"][data-og7-id="pending"]')).toBeVisible();

    await page.locator('[data-og7-id="alert-update-view-close"]').click();
    await expect(page.locator('[data-og7="alert-update-drawer"]')).toBeHidden();

    await page.locator('[data-og7-id="alert-report-update-another"]').click();
    await expect(page.locator('[data-og7="alert-update-field"][data-og7-id="summary"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-og7="alert-update-drawer"]')).toBeHidden();

    await page.locator('[data-og7="alert-related-opportunities"] ul li button').first().click();
    await expect(page).toHaveURL(/\/feed\/opportunities\/[^/]+$/);
  });

  test('opens the linked opportunity composer directly from the alert CTA', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);
    await seedAuthenticatedSession(page);
    await page.goto('/feed/alerts/alert-001');

    await page.locator('[data-og7-id="alert-create-opportunity"]').click();

    await expect(page).toHaveURL(/\/feed\?.*draftSource=alert/);
    await expect(page).toHaveURL(/draftOriginType=alert/);
    await expect(page).toHaveURL(/draftOriginId=alert-001/);
    await expect(page.locator('[data-og7="feed-publish-drawer"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-composer"]')).toBeVisible();
    await expect(page.locator('#composer-title')).not.toHaveValue('');
    await expect(page.locator('#composer-summary')).not.toHaveValue('');
    await expect(page.locator('#composer-type')).toHaveValue(/REQUEST$/);
  });
});


