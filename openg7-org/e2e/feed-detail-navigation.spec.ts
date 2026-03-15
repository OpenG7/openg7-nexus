import './setup';
import { expect, test } from '@playwright/test';

import { mockAuthenticatedSessionApis } from './helpers/auth-session';

test.describe('Feed detail navigation', () => {
  test('opens opportunity or alert detail page depending on tile type', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);
    await page.goto('/feed');
    await expect(page).toHaveURL(/\/feed($|\?)/);

    const opportunityCard = page.locator('.feed-stream__list li').filter({
      hasText: 'Short-term import of 300 MW',
    });
    await opportunityCard.locator('[data-og7-id="feed-open-item"]').click();
    await expect(page).toHaveURL(/\/feed\/opportunities\/request-001$/);

    await page.locator('[data-og7="opportunity-detail-header"] a[href="/feed"]').first().click();
    await expect(page).toHaveURL(/\/feed($|\?)/);

    const alertCard = page.locator('.feed-stream__list li').filter({
      hasText: 'Ice storm risk on Ontario transmission lines',
    });
    await alertCard.locator('[data-og7-id="feed-open-item"]').click();
    await expect(page).toHaveURL(/\/feed\/alerts\/alert-001$/);

    await page.locator('[data-og7="alert-detail-header"] a[href="/feed"]').first().click();
    await expect(page).toHaveURL(/\/feed($|\?)/);

    const indicatorCard = page.locator('.feed-stream__list li').filter({
      hasText: 'Spot electricity price up 12 percent',
    });
    await indicatorCard.locator('[data-og7-id="feed-open-item"]').click();
    await expect(page).toHaveURL(/\/feed\/indicators\/indicator-001$/);
  });
});



