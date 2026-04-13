import './setup';
import { expect, test, type Page } from '@playwright/test';

test.describe('Feed stacked filters drilldown', () => {
  test('keeps stacked discovery coherent through detail roundtrip and one-filter unwind', async ({ page }) => {
    await page.goto('/feed?type=REQUEST&sector=energy');
    await waitForAngularFeedStream(page);

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expectSearchParams(page, {
      type: 'REQUEST',
      sector: 'energy',
      mode: null,
      sort: null,
      fromProvince: null,
      q: null,
    });
    await expect(page.locator('#feed-type')).toHaveValue(/REQUEST$/);
    await expect(page.locator('#feed-sector')).toHaveValue(/energy$/);
    await expectVisibleItemIds(page, ['request-001', 'request-002', 'request-008']);
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="type"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="sector"]')).toBeVisible();

    await page.goto('/feed?type=REQUEST&sector=energy&mode=IMPORT&sort=VOLUME&q=fuel');

    await expectSearchParams(page, {
      type: 'REQUEST',
      sector: 'energy',
      mode: 'IMPORT',
      sort: 'VOLUME',
      fromProvince: null,
      q: 'fuel',
    });
    await expect(page.locator('#feed-mode')).toHaveValue(/IMPORT$/);
    await expect(page.locator('#feed-sort')).toHaveValue(/VOLUME$/);
    await expect(page.locator('#feed-search')).toHaveValue('fuel');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="mode"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="search"]')).toContainText('fuel');
    await expectVisibleItemIds(page, ['request-002']);

    await page.locator('[data-feed-item-id="request-002"] [data-og7-id="feed-open-item"]').click();

    await expect(page).toHaveURL(/\/feed\/opportunities\/request-002(?:\?.*)?$/);
    await expectSearchParams(page, {
      type: 'REQUEST',
      sector: 'energy',
      mode: 'IMPORT',
      sort: 'VOLUME',
      fromProvince: null,
      q: 'fuel',
    });
    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="opportunity-detail-header"] h1')).toContainText('Refined fuel supply needed');

    await page.goBack();

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expectSearchParams(page, {
      type: 'REQUEST',
      sector: 'energy',
      mode: 'IMPORT',
      sort: 'VOLUME',
      fromProvince: null,
      q: 'fuel',
    });
    await expect(page.locator('#feed-type')).toHaveValue(/REQUEST$/);
    await expect(page.locator('#feed-sector')).toHaveValue(/energy$/);
    await expect(page.locator('#feed-mode')).toHaveValue(/IMPORT$/);
    await expect(page.locator('#feed-sort')).toHaveValue(/VOLUME$/);
    await expect(page.locator('#feed-search')).toHaveValue('fuel');
    await expectVisibleItemIds(page, ['request-002']);

    await page.goto('/feed?type=REQUEST&sector=energy&mode=IMPORT&sort=VOLUME');

    await expectSearchParams(page, {
      type: 'REQUEST',
      sector: 'energy',
      mode: 'IMPORT',
      sort: 'VOLUME',
      fromProvince: null,
      q: null,
    });
    await expect(page.locator('#feed-search')).toHaveValue('');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="search"]')).toHaveCount(0);
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="type"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="sector"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="mode"]')).toBeVisible();
    await expectVisibleItemIds(page, ['request-002', 'request-008', 'request-001']);
  });
});

async function expectVisibleItemIds(page: Page, expectedIds: string[]): Promise<void> {
  await expect
    .poll(async () =>
      page
        .locator('[data-feed-item-id]')
        .evaluateAll((elements) => elements.map((element) => element.getAttribute('data-feed-item-id') ?? ''))
    )
    .toEqual(expectedIds);
}

async function expectSearchParams(page: Page, expected: Record<string, string | null>): Promise<void> {
  for (const [key, value] of Object.entries(expected)) {
    await expect.poll(() => new URL(page.url()).searchParams.get(key)).toBe(value);
  }
}

async function waitForAngularFeedStream(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const ng = (window as { ng?: { getComponent?: (element: Element) => unknown } }).ng;
    const host = document.querySelector('og7-feed-stream');
    return Boolean(host && ng && typeof ng.getComponent === 'function' && ng.getComponent(host));
  });
}