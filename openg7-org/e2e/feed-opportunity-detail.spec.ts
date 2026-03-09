import './setup';
import { expect, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser, mockAuthenticatedSessionApis } from './helpers/auth-session';

test.describe('Feed opportunity detail', () => {
  test('renders details, opens offer drawer, and filters by chip', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);
    await loginAsAuthenticatedE2eUser(page, '/feed/opportunities/request-001');
    await expect(page).toHaveURL(/\/feed\/opportunities\/request-001/);

    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="opportunity-detail-header"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Short-term import of 300 MW' })).toBeVisible();
    await expect(page.locator('[data-og7="opportunity-context-aside"]')).toBeVisible();

    await page.locator('[data-og7-id="opportunity-make-offer"]').click();
    await expect(page.locator('[data-og7="opportunity-offer-drawer"]')).toBeVisible();

    await page.locator('[data-og7="opportunity-offer-drawer"] input[type="number"]').fill('280');
    await page.locator('[data-og7="opportunity-offer-drawer"] textarea').fill('We can secure balancing and deliver in 15-minute ramps.');
    await page.locator('[data-og7-id="opportunity-offer-submit"]').click();
    await expect(page.locator('[data-og7="opportunity-offer-drawer"]')).toBeHidden();

    await page.locator('[data-og7-id="opportunity-make-offer"]').click();
    await expect(page.locator('[data-og7="opportunity-offer-drawer"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-og7="opportunity-offer-drawer"]')).toBeHidden();

    await page.locator('[data-og7-id="opportunity-chip-import"]').click();
    await expect(page).toHaveURL(/\/feed\?.*mode=IMPORT/);
  });
});


