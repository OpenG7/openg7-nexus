import './setup';
import { expect, test } from '@playwright/test';

test.describe('Feed advanced discovery roundtrip', () => {
  test('keeps filtered feed context intact through an opportunity detail roundtrip', async ({ page }) => {
    await page.goto('/feed?type=REQUEST&sector=energy&mode=IMPORT');

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expectSearchParams(page, {
      type: 'REQUEST',
      sector: 'energy',
      mode: 'IMPORT',
      sort: null,
      fromProvince: null,
    });
    await expect(page.locator('#feed-type')).toHaveValue(/REQUEST$/);
    await expect(page.locator('#feed-sector')).toHaveValue(/energy$/);
    await expect(page.locator('#feed-mode')).toHaveValue(/IMPORT$/);
    await expectVisibleItemIds(page, ['request-001', 'request-002', 'request-008']);
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="type"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="sector"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="mode"]')).toBeVisible();

    await page.goto('/feed?type=REQUEST&sector=energy&mode=IMPORT&sort=VOLUME');

    await expectSearchParams(page, {
      type: 'REQUEST',
      sector: 'energy',
      mode: 'IMPORT',
      sort: 'VOLUME',
      fromProvince: null,
    });
    await expect(page.locator('#feed-sort')).toHaveValue(/VOLUME$/);
    await page.locator('.feed-stream__status button').click();
    await expectVisibleItemIds(page, ['request-002', 'request-008', 'request-001']);

    await page.goto('/feed?type=REQUEST&sector=energy&mode=IMPORT&sort=VOLUME&fromProvince=AB');

    await expectSearchParams(page, {
      type: 'REQUEST',
      sector: 'energy',
      mode: 'IMPORT',
      sort: 'VOLUME',
      fromProvince: 'AB',
    });
    await expect(page.locator('#feed-from')).toHaveValue(/AB$/);
    await page.locator('.feed-stream__status button').click();
    await expectVisibleItemIds(page, ['request-002']);
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="fromProvince"]')).toBeVisible();

    await page.locator('[data-feed-item-id="request-002"] [data-og7-id="feed-open-item"]').click();

    await expect(page).toHaveURL(/\/feed\/opportunities\/request-002(?:\?.*)?$/);
    await expectSearchParams(page, {
      type: 'REQUEST',
      sector: 'energy',
      mode: 'IMPORT',
      sort: 'VOLUME',
      fromProvince: 'AB',
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
      fromProvince: 'AB',
    });
    await expect(page.locator('#feed-type')).toHaveValue(/REQUEST$/);
    await expect(page.locator('#feed-sector')).toHaveValue(/energy$/);
    await expect(page.locator('#feed-mode')).toHaveValue(/IMPORT$/);
    await expect(page.locator('#feed-sort')).toHaveValue(/VOLUME$/);
    await expect(page.locator('#feed-from')).toHaveValue(/AB$/);
    await expectVisibleItemIds(page, ['request-002']);
    await expect(page.locator('[data-og7="feed-active-filters"]')).toBeVisible();
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

async function expectSearchParams(
  page: Page,
  expected: Record<string, string | null>
): Promise<void> {
  for (const [key, value] of Object.entries(expected)) {
    await expect
      .poll(() => new URL(page.url()).searchParams.get(key))
      .toBe(value);
  }
}
