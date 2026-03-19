import './setup';
import { expect, test, type Page } from '@playwright/test';

import { loginAsAuthenticatedE2eUser, mockAuthenticatedSessionApis } from './helpers/auth-session';

async function enableMockFeed(page: Page): Promise<void> {
  await page.route('**/runtime-config.js', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.__OG7_CONFIG__ = {
        FEATURE_FLAGS: {
          feedMocks: true,
          homeFeedMocks: true
        }
      };`,
    });
  });
}

async function injectConnectionMatch(page: Page, itemId: string, matchId: number): Promise<void> {
  await page.route('**/assets/mocks/catalog.mock.json', async route => {
    const response = await route.fetch();
    const payload = (await response.json()) as {
      feedItems?: Array<Record<string, unknown>>;
    };

    payload.feedItems = (payload.feedItems ?? []).map(item =>
      item['id'] === itemId ? { ...item, connectionMatchId: matchId } : item
    );

    await route.fulfill({
      response,
      json: payload,
    });
  });
}

test.describe('Opportunity engagement orchestration', () => {
  test('redirects anonymous feed contact requests to login with the current feed URL', async ({ page }) => {
    await enableMockFeed(page);
    await mockAuthenticatedSessionApis(page);

    await page.goto('/feed?q=short-term');
    await expect(page.locator('[data-feed-item-id="request-001"]')).toContainText('Short-term import of 300 MW');

    await page.locator('[data-feed-item-id="request-001"] [data-og7-id="feed-contact-item"]').click();

    await expect(page).toHaveURL(/\/login\?redirect=%2Ffeed%3Fq%3Dshort-term/);
  });

  test('routes home feed panel connect requests through the shared opportunity detail fallback', async ({ page }) => {
    await enableMockFeed(page);
    await mockAuthenticatedSessionApis(page);

    await page.goto('/');
    const opportunityButton = page.locator(
      '[data-og7="home-feed-panel"][data-og7-id="opportunities"] button',
      { hasText: 'Short-term import of 300 MW' }
    );

    await expect(opportunityButton).toBeVisible();
    await opportunityButton.click();

    await expect(page).toHaveURL(
      /\/feed\/opportunities\/request-001\?source=home-feed-panels&feedItemId=request-001/
    );
    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
  });

  test('routes opportunity detail offer actions through linkup when a connection match exists', async ({
    page,
  }) => {
    await enableMockFeed(page);
    await injectConnectionMatch(page, 'request-001', 73);
    await mockAuthenticatedSessionApis(page);
    await loginAsAuthenticatedE2eUser(page, '/feed/opportunities/request-001');

    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
    await page.locator('[data-og7-id="opportunity-make-offer"]').click();

    await expect(page).toHaveURL(/\/linkup\/73\?source=feed&feedItemId=request-001/);
  });
});
