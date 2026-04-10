import './setup';
import { expect, test, type Page } from '@playwright/test';

test.describe('Feed source context unwind', () => {
  test('keeps corridor source context while one explicit search refinement is added, removed, and reloaded', async ({ page }) => {
    await page.goto('/');

    const corridorItem = page.locator(
      '[data-og7="corridors-realtime"] [data-og7-id="corridor-item"][data-og7-corridor-id="essential-services"]'
    );

    await expect(corridorItem).toBeVisible();
    await corridorItem.click();

    await waitForAngularFeedStream(page);
    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-source-context"]')).toBeVisible();
    await expectSearchParams(page, {
      source: 'corridors-realtime',
      corridorId: 'essential-services',
      q: null,
      fromProvince: null,
      toProvince: null,
    });
    await expect(page.locator('#feed-from')).toHaveValue(/QC$/);
    await expect(page.locator('#feed-to')).toHaveValue(/ON$/);
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="fromProvince"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="toProvince"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="search"]')).toHaveCount(0);
    await expectVisibleItemIds(page, ['request-001', 'offer-001']);

    await page.goto('/feed?source=corridors-realtime&corridorId=essential-services&q=two-week');
    await waitForAngularFeedStream(page);

    const searchInput = page.locator('#feed-search');

    await expectSearchParams(page, {
      source: 'corridors-realtime',
      corridorId: 'essential-services',
      q: 'two-week',
      fromProvince: null,
      toProvince: null,
    });
    await expect(searchInput).toHaveValue('two-week');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="fromProvince"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="toProvince"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="search"]')).toContainText('two-week');
    await expectVisibleItemIds(page, ['request-001']);

    await page.goto('/feed?source=corridors-realtime&corridorId=essential-services');
    await waitForAngularFeedStream(page);

    await expectSearchParams(page, {
      source: 'corridors-realtime',
      corridorId: 'essential-services',
      q: null,
      fromProvince: null,
      toProvince: null,
    });
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('[data-og7="feed-source-context"]')).toBeVisible();
    await expect(page.locator('#feed-from')).toHaveValue(/QC$/);
    await expect(page.locator('#feed-to')).toHaveValue(/ON$/);
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="fromProvince"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="toProvince"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="search"]')).toHaveCount(0);
    await expectVisibleItemIds(page, ['request-001', 'offer-001']);

    await page.reload();

    await waitForAngularFeedStream(page);
    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-source-context"]')).toBeVisible();
    await expectSearchParams(page, {
      source: 'corridors-realtime',
      corridorId: 'essential-services',
      q: null,
      fromProvince: null,
      toProvince: null,
    });
    await expect(page.locator('#feed-search')).toHaveValue('');
    await expect(page.locator('#feed-from')).toHaveValue(/QC$/);
    await expect(page.locator('#feed-to')).toHaveValue(/ON$/);
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="fromProvince"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="toProvince"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="search"]')).toHaveCount(0);
    await expectVisibleItemIds(page, ['request-001', 'offer-001']);
  });
});

async function expectVisibleItemIds(page: Page, expectedIds: string[]): Promise<void> {
  await expect
    .poll(async () =>
      page
        .locator('[data-feed-item-id]')
        .evaluateAll(elements => elements.map(element => element.getAttribute('data-feed-item-id') ?? ''))
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