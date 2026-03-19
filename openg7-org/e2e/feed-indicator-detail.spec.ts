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
    await expect(subscribeButton).toHaveText(/Voir mon alerte|View my alert/i);
    await expect(subscribeButton).toBeEnabled();

    await page.reload();
    await expect(page.locator('[data-og7-id="indicator-subscribe"]')).toHaveText(/Voir mon alerte|View my alert/i);
    await expect(page.locator('[data-og7-id="indicator-subscribe"]')).toBeEnabled();

    await page.locator('[data-og7="indicator-related-opportunities"] ul li button').first().click();
    await expect(page).toHaveURL(/\/feed(?:\/opportunities\/[^/?#]+|\?type=REQUEST)/);
  });

  test('shows a success toast when creating an alert from the legacy indicator route', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);
    await seedAuthenticatedSession(page);
    await page.goto('/feed/indicator-003');
    await expect(page).toHaveURL(/\/feed\/indicator-003$/);

    await expect(page.locator('[data-og7="indicator-detail-page"]')).toBeVisible();
    await page.locator('[data-og7-id="indicator-create-alert"]').click();
    await expect(page.locator('[data-og7="indicator-alert-drawer"]')).toBeVisible();

    await page.locator('[data-og7="indicator-alert-drawer"] input[type="number"]').fill('20');
    await page.locator('[data-og7="indicator-alert-drawer"] textarea').fill(
      'Notify the manufacturing coordination team if the backlog index rises further.'
    );
    await page.locator('[data-og7-id="indicator-alert-submit"]').click();

    await expect(page.locator('[data-og7="indicator-alert-drawer"]')).toBeHidden();
    await expect(page.locator('[data-og7="notification-toast"][data-og7-id="success"]')).toContainText(
      /Alerte creee et liee a cet indicateur\.|Alert created and linked to this indicator\./i
    );
  });
});


