import './setup';
import { expect, type Page, test } from '@playwright/test';

test.describe('Feed context switch comparison', () => {
  test('keeps two inherited discovery contexts legible after one refinement each and a detail roundtrip', async ({
    page,
  }) => {
    await page.goto('/feed?source=home-feed-panels&feedItemId=request-001&q=300%20MW');

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-source-context"]')).toBeVisible();
    await expectSearchParams(page, {
      source: 'home-feed-panels',
      feedItemId: 'request-001',
      corridorId: null,
      q: '300 MW',
      fromProvince: null,
      toProvince: null,
    });
    await expect(page.locator('#feed-search')).toHaveValue('300 MW');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="search"]')).toContainText('300 MW');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="fromProvince"]')).toHaveCount(0);
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="toProvince"]')).toHaveCount(0);
    await expect(page.locator('[data-feed-item-id="request-001"]')).toHaveClass(/is-highlighted/);
    await expectVisibleItemIds(page, ['request-001']);

    await page.locator('[data-feed-item-id="request-001"] [data-og7-id="feed-open-item"]').click();

    await expect(page).toHaveURL(/\/feed\/opportunities\/request-001(?:\?.*)?$/);
    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
    await expectSearchParams(page, {
      source: 'home-feed-panels',
      feedItemId: 'request-001',
      corridorId: null,
      q: '300 MW',
      fromProvince: null,
      toProvince: null,
    });

    await page.goBack();

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-source-context"]')).toBeVisible();
    await expect(page.locator('#feed-search')).toHaveValue('300 MW');
    await expect(page.locator('[data-feed-item-id="request-001"]')).toHaveClass(/is-highlighted/);
    await expectVisibleItemIds(page, ['request-001']);

    await page.goto('/feed?source=corridors-realtime&corridorId=essential-services&q=two-week');

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    const corridorContext = page.locator('[data-og7="feed-source-context"]');
    await expect(corridorContext).toBeVisible();
    await expect(corridorContext).toContainText('Services essentiels');
    await expectSearchParams(page, {
      source: 'corridors-realtime',
      feedItemId: null,
      corridorId: 'essential-services',
      q: 'two-week',
      fromProvince: null,
      toProvince: null,
    });
    await expect(page.locator('#feed-search')).toHaveValue('two-week');
    await expect(page.locator('#feed-from')).toHaveValue(/QC$/);
    await expect(page.locator('#feed-to')).toHaveValue(/ON$/);
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="search"]')).toContainText('two-week');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="fromProvince"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="toProvince"]')).toBeVisible();
    await expect(page.locator('[data-feed-item-id="request-001"]')).not.toHaveClass(/is-highlighted/);
    await expectVisibleItemIds(page, ['request-001']);

    await page.locator('[data-feed-item-id="request-001"] [data-og7-id="feed-open-item"]').click();

    await expect(page).toHaveURL(/\/feed\/opportunities\/request-001(?:\?.*)?$/);
    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
    await expectSearchParams(page, {
      source: 'corridors-realtime',
      feedItemId: null,
      corridorId: 'essential-services',
      q: 'two-week',
      fromProvince: null,
      toProvince: null,
    });

    await page.goBack();

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(corridorContext).toBeVisible();
    await expect(page.locator('#feed-search')).toHaveValue('two-week');
    await expect(page.locator('#feed-from')).toHaveValue(/QC$/);
    await expect(page.locator('#feed-to')).toHaveValue(/ON$/);
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="fromProvince"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="toProvince"]')).toBeVisible();
    await expectVisibleItemIds(page, ['request-001']);
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