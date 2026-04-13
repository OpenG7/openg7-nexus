import './setup';
import { expect, test } from '@playwright/test';

import { mockAuthenticatedSessionApis, seedAuthenticatedSession } from './helpers/auth-session';

test.describe('Quality breadth offline edge continuity', () => {
  test('keeps one indicator alert draft coherent through navigation interruption, reload, and retry', async ({
    page,
  }) => {
    await mockAuthenticatedSessionApis(page);
    await seedAuthenticatedSession(page);

    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.setItem(
        'og7.indicator-alert-drafts.v1.e2e-user-1',
        JSON.stringify({
          'indicator-001': {
            thresholdDirection: 'gt',
            thresholdValue: 19,
            window: '24h',
            frequency: 'hourly',
            notifyDelta: true,
            note: 'Keep this alert draft stable while navigation is interrupted.',
          },
        })
      );
    });

    await page.goto('/feed/indicators/indicator-001');
    await expect(page.locator('[data-og7="indicator-detail-page"]')).toBeVisible();

    const subscribeButton = page.locator('[data-og7-id="indicator-subscribe"]');
    const drawer = page.locator('[data-og7="indicator-alert-drawer"]');
    const thresholdInput = drawer.locator('[data-og7-id="threshold-value"]');
    const noteInput = drawer.locator('[data-og7-id="note"]');
    const relatedOpportunity = page.locator('[data-og7="indicator-related-opportunities"] ul li button').first();

    await expect(subscribeButton).toHaveText(/S'abonner|Subscribe/i);
    await subscribeButton.click();

    await expect(drawer).toBeVisible();
    await expect(drawer.locator('[data-og7="indicator-alert-status"][data-og7-id="offline"]')).toBeVisible();
    await expect(drawer.locator('[data-og7-id="indicator-alert-retry"]')).toBeVisible();
    await expect(thresholdInput).toHaveValue('19');
    await expect(noteInput).toHaveValue('Keep this alert draft stable while navigation is interrupted.');

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(subscribeButton).toHaveText(/S'abonner|Subscribe/i);

    await relatedOpportunity.click();
    await expect(page).toHaveURL(/\/feed(?:\/opportunities\/[^/?#]+|\?type=REQUEST)/);

    await page.goBack();
    await expect(page).toHaveURL(/\/feed\/indicators\/indicator-001/);
    await expect(page.locator('[data-og7="indicator-detail-page"]')).toBeVisible();
    await expect(subscribeButton).toHaveText(/S'abonner|Subscribe/i);

    await subscribeButton.click();
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('[data-og7="indicator-alert-status"][data-og7-id="offline"]')).toBeVisible();
    await expect(thresholdInput).toHaveValue('19');
    await expect(noteInput).toHaveValue('Keep this alert draft stable while navigation is interrupted.');

    await page.reload();
    await expect(page.locator('[data-og7="indicator-detail-page"]')).toBeVisible();
    await expect(subscribeButton).toHaveText(/S'abonner|Subscribe/i);

    await subscribeButton.click();
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('[data-og7="indicator-alert-status"][data-og7-id="offline"]')).toBeVisible();
    await expect(drawer.locator('[data-og7-id="indicator-alert-retry"]')).toBeVisible();
    await expect(thresholdInput).toHaveValue('19');
    await expect(noteInput).toHaveValue('Keep this alert draft stable while navigation is interrupted.');
    await expect(drawer.locator('[data-og7="indicator-alert-view"]')).toHaveCount(0);

    await drawer.locator('[data-og7-id="indicator-alert-retry"]').click();

    await expect(drawer).toBeHidden();
    await expect(subscribeButton).toHaveText(/Voir mon alerte|View my alert/i);

    await relatedOpportunity.click();
    await expect(page).toHaveURL(/\/feed(?:\/opportunities\/[^/?#]+|\?type=REQUEST)/);

    await page.goBack();
    await expect(page).toHaveURL(/\/feed\/indicators\/indicator-001/);
    await expect(subscribeButton).toHaveText(/Voir mon alerte|View my alert/i);

    await subscribeButton.click();
    await expect(page.locator('[data-og7="indicator-alert-view"]')).toBeVisible();
    await expect(page.locator('[data-og7="indicator-alert-drawer"] [data-og7="indicator-alert-status"][data-og7-id="offline"]')).toHaveCount(0);
  });
});