import './setup';
import { expect, type Page, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser } from './helpers/auth-session';
import { mockImportationApis, mockProfileAndFavoritesApis } from './helpers/domain-mocks';

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const metrics = await page.evaluate(() => ({
    rootScrollWidth: document.documentElement.scrollWidth,
    rootClientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
  }));

  expect(metrics.rootScrollWidth).toBeLessThanOrEqual(metrics.rootClientWidth + 1);
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.bodyClientWidth + 1);
}

test.describe('Quality breadth importation responsive sweep', () => {
  test('keeps importation decision controls reachable on narrow mobile without page-level horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockProfileAndFavoritesApis(page);
    await mockImportationApis(page);

    await loginAsAuthenticatedE2eUser(page, '/importation');

    const importation = page.locator('[data-og7="importation"]');
    const overview = page.locator('[data-og7="importation-overview"]');
    const collaboration = page.locator('[data-og7="importation-collaboration"]');
    const compareToggle = overview.locator('.og7-importation-overview__switch input[type="checkbox"]');
    const compareInput = overview.locator('input[name="compareWithDraft"]');
    const compareApply = overview.locator('[data-og7="importation-filters"][data-og7-id="apply-compare"]');

    await expect(importation).toBeVisible();
    await expect(overview).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await compareToggle.check();
    await expect(compareInput).toBeEnabled();
    await compareInput.fill('2026-02');

    const compareRequest = page.waitForRequest((request) => {
      if (!request.url().includes('/api/import-flows')) {
        return false;
      }
      const url = new URL(request.url());
      return url.searchParams.get('compareMode') === 'true' && url.searchParams.get('compareWith') === '2026-02';
    });
    await compareApply.click();
    await compareRequest;

    await expect.poll(() => new URL(page.url()).searchParams.get('compareWith')).toBe('2026-02');
    await expectNoHorizontalOverflow(page);

    await collaboration.scrollIntoViewIfNeeded();
    await expect(collaboration.locator('input[name="watchlistName"]')).toBeVisible();
    await expect(collaboration.locator('input[name="recipients"]')).toBeVisible();
    await expect(collaboration.locator('.og7-importation-collaboration__watchlists button[type="submit"]')).toBeVisible();
    await expect(collaboration.locator('.og7-importation-collaboration__schedule button[type="submit"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('keeps importation flow drilldown and collaboration cards stable on tablet landscape', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await mockProfileAndFavoritesApis(page);
    await mockImportationApis(page);

    await loginAsAuthenticatedE2eUser(page, '/importation');

    const flowPanel = page.locator('[data-og7="importation-flow"]');
    const collaboration = page.locator('[data-og7="importation-collaboration"]');
    const drilldownButton = flowPanel.locator('.og7-importation-flow__list article button').first();

    await expect(flowPanel).toBeVisible();
    await expect(collaboration).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await drilldownButton.click();
    await expect.poll(() => new URL(page.url()).searchParams.get('originScope')).toBe('custom');
    await expect.poll(() => new URL(page.url()).searchParams.getAll('originCode')).toEqual(['US']);
    await expect(flowPanel.locator('.og7-importation-flow__legend')).toBeVisible();
    await expect(collaboration.locator('.og7-importation-collaboration__watchlist-grid article').first()).toBeVisible();
    await expect(collaboration.locator('.og7-importation-collaboration__annotations li').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
