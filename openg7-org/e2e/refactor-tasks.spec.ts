import './setup';
import { expect, test } from '@playwright/test';

import { mockAuthenticatedSessionApis } from './helpers/auth-session';

test.describe('Refactor task regressions', () => {
  test('task 1 keeps the lazy app background visible after bootstrap readiness', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);

    await page.goto('/');

    await expect(page.locator('[data-og7="app-shell"][data-og7-ready="true"]')).toBeVisible();
    await expect(page.locator('[data-og7="app-background"]')).toHaveCount(1);
    await expect(page.locator('[data-og7="app-background"] om-starry-sky')).toBeVisible();
  });

  test('task 2 keeps home and feed search results aligned through the shared query engine', async ({
    page,
  }) => {
    await mockAuthenticatedSessionApis(page);

    await page.goto('/');

    const homeSearch = page.locator('og7-home-feed-section [data-og7="search-box"] input[type="search"]');
    await homeSearch.fill('rail');
    await page.waitForTimeout(400);

    const alertsPanel = page.locator('[data-og7="home-feed-panel"][data-og7-id="alerts"]');
    const opportunitiesPanel = page.locator('[data-og7="home-feed-panel"][data-og7-id="opportunities"]');

    await expect(alertsPanel).toContainText('Wildfire smoke may disrupt rail corridors');
    await expect(opportunitiesPanel).toContainText('Rail freight slots for bulk cargo');
    await expect(opportunitiesPanel).toContainText('Certified welders for rail upgrade');
    await expect(page.locator('[data-og7="home-feed-panels"]')).not.toContainText(
      'Short-term import of 300 MW'
    );

    await page.goto('/feed?q=rail');

    const feedStream = page.locator('[data-og7="feed-stream"]');
    await expect(feedStream).toContainText('Wildfire smoke may disrupt rail corridors');
    await expect(feedStream).toContainText('Rail freight slots for bulk cargo');
    await expect(feedStream).toContainText('Certified welders for rail upgrade');
    await expect(feedStream).not.toContainText('Short-term import of 300 MW');
  });

  test('task 3 keeps the shared compact header behavior across feed detail pages', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);

    const scenarios = [
      {
        path: '/feed/opportunities/request-001',
        pageSelector: '[data-og7="opportunity-detail-page"]',
        headerSelector: '[data-og7="opportunity-detail-header"]',
        compactClass: /opportunity-header--compact/,
      },
      {
        path: '/feed/alerts/alert-001',
        pageSelector: '[data-og7="alert-detail-page"]',
        headerSelector: '[data-og7="alert-detail-header"]',
        compactClass: /alert-detail-header--compact/,
      },
      {
        path: '/feed/indicators/indicator-001',
        pageSelector: '[data-og7="indicator-detail-page"]',
        headerSelector: '[data-og7="indicator-detail-header"]',
        compactClass: /indicator-hero--compact/,
      },
    ] as const;

    for (const scenario of scenarios) {
      await page.goto(scenario.path);
      await expect(page.locator(scenario.pageSelector)).toBeVisible();
      await expect(page.locator(scenario.headerSelector)).toBeVisible();
      await expect(page.locator(scenario.headerSelector)).not.toHaveClass(scenario.compactClass);

      await page.evaluate(() => window.scrollTo(0, 720));
      await expect(page.locator(scenario.headerSelector)).toHaveClass(scenario.compactClass);
    }
  });
});
