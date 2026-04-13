import './setup';
import { expect, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser, mockAuthenticatedSessionApis } from './helpers/auth-session';

test.describe('Opportunity enrichment lifecycle', () => {
  test('persists a queued opportunity report across reopen and reload', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);
    await loginAsAuthenticatedE2eUser(page, '/feed/opportunities/request-001');

    await expect(page).toHaveURL(/\/feed\/opportunities\/request-001/);
    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="opportunity-report"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="opportunity-view-my-report"]')).toHaveCount(0);

    await page.locator('[data-og7-id="opportunity-report"]').click();
    await expect(page.locator('[data-og7="opportunity-report-drawer"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="reason"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="comment"]')).toBeVisible();

    await page.locator('[data-og7-id="reason"]').selectOption('duplicate');
    await page
      .locator('[data-og7-id="comment"]')
      .fill('Duplicate capacity signal already covered by the latest Ontario balancing notice.');

    await page.locator('[data-og7-id="opportunity-report-submit"]').click();
    await expect(page.locator('[data-og7="opportunity-report-status"][data-og7-id="success"]')).toBeVisible();
    await expect(page.locator('[data-og7="opportunity-report-drawer"]')).toBeHidden();

    await expect(page.locator('.opportunity-header__sync[data-og7-state="saved-local"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="opportunity-report"]')).toHaveCount(0);
    await expect(page.locator('[data-og7-id="opportunity-view-my-report"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="opportunity-report-another"]')).toBeVisible();

    await page.getByRole('link', { name: /Opportunites|Opportunities/i }).click();

    await expect(page).toHaveURL(/\/feed(?:\?.*)?$/);
    await expect(page.locator('[data-feed-item-id="request-001"]')).toBeVisible();

    await page.locator('[data-feed-item-id="request-001"] [data-og7-id="feed-open-item"]').click();
    await expect(page).toHaveURL(/\/feed\/opportunities\/request-001(?:\?.*)?$/);
    await expect(page.locator('[data-og7-id="opportunity-view-my-report"]')).toBeVisible();

    await page.locator('[data-og7-id="opportunity-view-my-report"]').click();
    await expect(page.locator('[data-og7="opportunity-report-view"]')).toBeVisible();
    await expect(page.locator('[data-og7="opportunity-report-status"][data-og7-id="pending"]')).toBeVisible();
    await expect(page.locator('[data-og7="opportunity-report-view"]')).toContainText(
      'Duplicate capacity signal already covered by the latest Ontario balancing notice.'
    );

    await page.locator('[data-og7-id="opportunity-report-view-close"]').click();
    await expect(page.locator('[data-og7="opportunity-report-drawer"]')).toBeHidden();

    await page.locator('[data-og7-id="opportunity-report-another"]').click();
    await expect(page.locator('[data-og7-id="opportunity-report-submit"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="comment"]')).toHaveValue('');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-og7="opportunity-report-drawer"]')).toBeHidden();

    await page.reload();
    await expect(page).toHaveURL(/\/feed\/opportunities\/request-001(?:\?.*)?$/);
    await expect(page.locator('[data-og7-id="opportunity-view-my-report"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="opportunity-report-another"]')).toBeVisible();

    await page.locator('[data-og7-id="opportunity-view-my-report"]').click();
    await expect(page.locator('[data-og7="opportunity-report-view"]')).toBeVisible();
    await expect(page.locator('[data-og7="opportunity-report-status"][data-og7-id="pending"]')).toBeVisible();
    await expect(page.locator('[data-og7="opportunity-report-view"]')).toContainText(
      'Duplicate capacity signal already covered by the latest Ontario balancing notice.'
    );
  });
});