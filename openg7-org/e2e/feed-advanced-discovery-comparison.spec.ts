import './setup';
import { expect, type Page, test } from '@playwright/test';

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

async function expectSelectedLabel(page: Page, selector: string, expectedLabel: string): Promise<void> {
  await expect
    .poll(async () =>
      page.locator(selector).evaluate(element => {
        if (!(element instanceof HTMLSelectElement)) {
          return null;
        }

        return element.selectedOptions.item(0)?.textContent?.trim() ?? null;
      })
    )
    .toBe(expectedLabel);
}

test.describe('Feed advanced discovery comparison', () => {
  test('keeps comparison-oriented discovery state coherent across two filter combinations and a detail roundtrip', async ({ page }) => {
    await page.goto('/feed?type=REQUEST&sector=energy&mode=IMPORT&sort=VOLUME');

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expectSearchParams(page, {
      type: 'REQUEST',
      sector: 'energy',
      mode: 'IMPORT',
      sort: 'VOLUME',
      q: null,
    });
    await expectVisibleItemIds(page, ['request-002', 'request-008', 'request-001']);
    await expect(page.locator('[data-feed-item-id="request-002"]')).toContainText('Refined fuel supply needed');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="sector"]')).toBeVisible();

    await page.goto('/feed?type=REQUEST&sector=services&mode=IMPORT&sort=VOLUME');

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();

    await expectSearchParams(page, {
      type: 'REQUEST',
      sector: 'services',
      mode: 'IMPORT',
      sort: 'VOLUME',
      q: null,
    });
    await expectVisibleItemIds(page, ['request-009', 'request-003', 'request-006']);
    await expect(page.locator('[data-feed-item-id="request-009"]')).toContainText('Telecom field crews');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="sector"]')).toContainText('Services');

    await page.locator('[data-feed-item-id="request-009"] [data-og7-id="feed-open-item"]').click();

    await expect(page).toHaveURL(/\/feed\/opportunities\/request-009\?type=REQUEST&sector=services&mode=IMPORT&sort=VOLUME$/);
    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="opportunity-detail-header"] h1')).toContainText('Telecom field crews');

    await page.goBack();

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expectSearchParams(page, {
      type: 'REQUEST',
      sector: 'services',
      mode: 'IMPORT',
      sort: 'VOLUME',
      q: null,
    });
    await expectSelectedLabel(page, '#feed-type', 'Demande');
    await expectSelectedLabel(page, '#feed-sector', 'Services');
    await expectSelectedLabel(page, '#feed-mode', 'Import');
    await expectSelectedLabel(page, '#feed-sort', 'Volume');
    await expectVisibleItemIds(page, ['request-009', 'request-003', 'request-006']);
  });
});