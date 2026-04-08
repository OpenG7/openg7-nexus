import './setup';
import { expect, test } from '@playwright/test';

import { mockAuthenticatedSessionApis } from './helpers/auth-session';

test.describe('Quality breadth announcement continuity', () => {
  test('keeps alert update announcements truthful and non-duplicative through retry, navigation, and reload', async ({
    page,
  }) => {
    await mockAuthenticatedSessionApis(page);
    await page.goto('/feed/alerts/alert-001');

    await expect(page.locator('[data-og7="alert-detail-page"]')).toBeVisible();

    const reportButton = page.locator('[data-og7-id="alert-report-update"]');
    const drawer = page.locator('[data-og7="alert-update-drawer"]');
    const summaryInput = page.locator('[data-og7="alert-update-field"][data-og7-id="summary"]');
    const sourceUrlInput = page.locator('[data-og7="alert-update-field"][data-og7-id="source-url"]');
    const localError = drawer.locator('[data-og7="alert-update-status"][data-og7-id="error"]');
    const localSuccess = drawer.locator('[data-og7="alert-update-status"][data-og7-id="success"]');
    const relatedOpportunity = page.locator('[data-og7="alert-related-opportunities"] ul li button').first();

    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Object.defineProperty(window, '__og7OriginalStorageSetItem', {
        value: original,
        configurable: true,
      });
      Storage.prototype.setItem = function () {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      };
    });

    await reportButton.click();
    await expect(drawer).toBeVisible();

    await summaryInput.fill('Transmission icing confirmed by the latest operator update.');
    await sourceUrlInput.fill('https://example.com/operator-update');
    await page.locator('[data-og7-id="alert-update-submit"]').click();

    await expect(localError).toBeVisible();
    await expect(localError).toHaveAttribute('role', 'alert');
    await expect(localError).toHaveAttribute('aria-live', 'assertive');
    await expect(localSuccess).toHaveCount(0);

    await page.evaluate(() => {
      const original = (window as typeof window & { __og7OriginalStorageSetItem?: Storage['setItem'] })
        .__og7OriginalStorageSetItem;
      if (original) {
        Storage.prototype.setItem = original;
        delete (window as typeof window & { __og7OriginalStorageSetItem?: Storage['setItem'] })
          .__og7OriginalStorageSetItem;
      }
    });

    await page.locator('[data-og7-id="alert-update-submit"]').click();

    await expect(localSuccess).toBeVisible();
    await expect(localSuccess).toHaveAttribute('role', 'status');
    await expect(localSuccess).toHaveAttribute('aria-live', 'polite');
    await expect(localError).toHaveCount(0);
    await expect(drawer).toBeHidden();

    await expect(page.locator('[data-og7-id="alert-view-my-report"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="alert-report-update-another"]')).toBeVisible();

    await relatedOpportunity.click();
    await expect(page).toHaveURL(/\/feed\/opportunities\/[^/]+$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/feed\/alerts\/alert-001/);
    await expect(page.locator('[data-og7="alert-detail-page"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="alert-view-my-report"]')).toBeVisible();

    await page.reload();
    await expect(page.locator('[data-og7="alert-detail-page"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="alert-view-my-report"]')).toBeVisible();

    await page.locator('[data-og7-id="alert-view-my-report"]').click();
    await expect(page.locator('[data-og7="alert-update-report-view"]')).toBeVisible();
    await expect(page.locator('[data-og7="alert-update-report-status"][data-og7-id="pending"]')).toBeVisible();
    await expect(page.locator('[data-og7="alert-update-status"]')).toHaveCount(0);

    await page.locator('[data-og7-id="alert-update-view-close"]').click();
    await expect(drawer).toBeHidden();
    await expect(page.locator('[data-og7="alert-update-status"]')).toHaveCount(0);
  });
});