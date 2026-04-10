import './setup';
import { expect, type Page, test } from '@playwright/test';

async function expectSearchParams(page: Page, expected: Record<string, string | null>): Promise<void> {
  for (const [key, value] of Object.entries(expected)) {
    await expect.poll(() => new URL(page.url()).searchParams.get(key)).toBe(value);
  }
}

async function expectVisibleItemIds(page: Page, expectedIds: string[]): Promise<void> {
  await expect
    .poll(async () =>
      page
        .locator('[data-feed-item-id]')
        .evaluateAll(elements => elements.map(element => element.getAttribute('data-feed-item-id') ?? ''))
    )
    .toEqual(expectedIds);
}

test.describe('Feed source context drilldown', () => {
  test('preserves corridor-derived context after feed refinement, detail navigation, back, and reload', async ({ page }) => {
    await page.goto('/');

    const corridorItem = page.locator(
      '[data-og7="corridors-realtime"] [data-og7-id="corridor-item"][data-og7-corridor-id="essential-services"]'
    );

    await expect(corridorItem).toBeVisible();
    await corridorItem.click();

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-source-context"]')).toBeVisible();
    await expectSearchParams(page, {
      source: 'corridors-realtime',
      corridorId: 'essential-services',
      fromProvince: null,
      toProvince: null,
      q: null,
    });
    await expect(page.locator('#feed-from')).toHaveValue(/QC$/);
    await expect(page.locator('#feed-to')).toHaveValue(/ON$/);
    await expectVisibleItemIds(page, ['request-001', 'offer-001']);

    await page.goto('/feed?source=corridors-realtime&corridorId=essential-services&q=two-week');

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-source-context"]')).toBeVisible();

    await expectSearchParams(page, {
      source: 'corridors-realtime',
      corridorId: 'essential-services',
      fromProvince: null,
      toProvince: null,
      q: 'two-week',
    });
    await expect(page.locator('[data-og7="feed-active-filters"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="fromProvince"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="toProvince"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="search"]')).toContainText('two-week');
    await expectVisibleItemIds(page, ['request-001']);

    await page.locator('[data-feed-item-id="request-001"] [data-og7-id="feed-open-item"]').click();

    await expect(page).toHaveURL(/\/feed\/opportunities\/request-001(?:\?.*)?$/);
    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
    await expectSearchParams(page, {
      source: 'corridors-realtime',
      corridorId: 'essential-services',
      fromProvince: null,
      toProvince: null,
      q: 'two-week',
    });

    await page.goBack();

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-source-context"]')).toBeVisible();
    await expectSearchParams(page, {
      source: 'corridors-realtime',
      corridorId: 'essential-services',
      fromProvince: null,
      toProvince: null,
      q: 'two-week',
    });
    await expect(page.locator('#feed-search')).toHaveValue('two-week');
    await expect(page.locator('#feed-from')).toHaveValue(/QC$/);
    await expect(page.locator('#feed-to')).toHaveValue(/ON$/);
    await expectVisibleItemIds(page, ['request-001']);

    await page.reload();

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-source-context"]')).toBeVisible();
    await expectSearchParams(page, {
      source: 'corridors-realtime',
      corridorId: 'essential-services',
      fromProvince: null,
      toProvince: null,
      q: 'two-week',
    });
    await expect(page.locator('#feed-search')).toHaveValue('two-week');
    await expect(page.locator('#feed-from')).toHaveValue(/QC$/);
    await expect(page.locator('#feed-to')).toHaveValue(/ON$/);
    await expectVisibleItemIds(page, ['request-001']);
  });
});