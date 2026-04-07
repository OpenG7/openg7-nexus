import './setup';
import { expect, test, type Page } from '@playwright/test';

test.describe('Feed deep-link persistence', () => {
  test('rehydrates a shared filtered feed link across reload, then clears both UI and URL state', async ({ page }) => {
    await page.goto('/feed?type=REQUEST&sector=energy&fromProvince=AB&mode=IMPORT&sort=VOLUME&q=fuel');
    await waitForAngularFeedStream(page);
    console.log(
      'feed-stream before clear',
      await page.evaluate(() => {
        const ng = (window as { ng?: { getComponent?: (element: Element) => Record<string, unknown> } }).ng;
        const host = document.querySelector('og7-feed-stream');
        const component = host && ng?.getComponent ? ng.getComponent(host) : null;
        return component
          ? {
              hasClearFilters: typeof component['clearFilters'],
              selectedType: typeof component['selectedType'] === 'function' ? component['selectedType']() : null,
              searchTerm: typeof component['searchTerm'] === 'function' ? component['searchTerm']() : null,
            }
          : null;
      })
    );

    await expectFeedDeepLinkState(page);
    await expectVisibleItemIds(page, ['request-002']);

    console.log(
      'clearFilters direct call result',
      await page.evaluate(() => {
        const ng = (window as { ng?: { getComponent?: (element: Element) => Record<string, unknown> } }).ng;
        const host = document.querySelector('og7-feed-stream');
        const component = host && ng?.getComponent ? ng.getComponent(host) : null;
        try {
          if (component && typeof component['clearFilters'] === 'function') {
            component['clearFilters']();
          }
          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            message: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );
    await page.evaluate(() => {
      const ng = (window as { ng?: { getComponent?: (element: Element) => Record<string, unknown> } }).ng;
      const host = document.querySelector('og7-feed-stream');
      const component = host && ng?.getComponent ? ng.getComponent(host) : null;
      return component;
    });
    console.log(
      'feed-stream after clear click',
      await page.evaluate(() => {
        const ng = (window as { ng?: { getComponent?: (element: Element) => Record<string, unknown> } }).ng;
        const host = document.querySelector('og7-feed-stream');
        const component = host && ng?.getComponent ? ng.getComponent(host) : null;
        return component
          ? {
              selectedType: typeof component['selectedType'] === 'function' ? component['selectedType']() : null,
              searchTerm: typeof component['searchTerm'] === 'function' ? component['searchTerm']() : null,
            }
          : null;
      })
    );

    await expectClearedFeedState(page);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await waitForAngularFeedStream(page);

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expectClearedFeedState(page);
  });
});

async function expectFeedDeepLinkState(page: Page): Promise<void> {
  await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
  await expectSearchParams(page, {
    type: 'REQUEST',
    sector: 'energy',
    fromProvince: 'AB',
    mode: 'IMPORT',
    sort: 'VOLUME',
    q: 'fuel',
  });
  await expect(page.locator('#feed-search')).toHaveValue('fuel');
  await expect(page.locator('#feed-type')).toHaveValue(/REQUEST$/);
  await expect(page.locator('#feed-sector')).toHaveValue(/energy$/);
  await expect(page.locator('#feed-from')).toHaveValue(/AB$/);
  await expect(page.locator('#feed-mode')).toHaveValue(/IMPORT$/);
  await expect(page.locator('#feed-sort')).toHaveValue(/VOLUME$/);
  await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="type"]')).toBeVisible();
  await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="sector"]')).toBeVisible();
  await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="fromProvince"]')).toBeVisible();
  await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="mode"]')).toBeVisible();
  await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="search"]')).toBeVisible();
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

async function expectSearchParams(page: Page, expected: Record<string, string | null>): Promise<void> {
  for (const [key, value] of Object.entries(expected)) {
    await expect
      .poll(() => new URL(page.url()).searchParams.get(key))
      .toBe(value);
  }
}

async function expectClearedFeedState(page: Page): Promise<void> {
  await expectSearchParams(page, {
    type: null,
    sector: null,
    fromProvince: null,
    mode: null,
    sort: null,
    q: null,
  });
  await expect(page.locator('#feed-search')).toHaveValue('');
  await expect(page.locator('#feed-type')).toHaveValue('null');
  await expect(page.locator('#feed-sector')).toHaveValue('null');
  await expect(page.locator('#feed-from')).toHaveValue('null');
  await expect(page.locator('#feed-mode')).toHaveValue(/BOTH$/);
  await expect(page.locator('#feed-sort')).toHaveValue(/NEWEST$/);
  await expect(page.locator('[data-og7="feed-active-filters"]')).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .locator('[data-feed-item-id]')
        .evaluateAll(elements => elements.map(element => element.getAttribute('data-feed-item-id') ?? ''))
    )
    .toContain('request-001');
  await expect
    .poll(() =>
      page
        .locator('[data-feed-item-id]')
        .evaluateAll(elements => elements.map(element => element.getAttribute('data-feed-item-id') ?? ''))
    )
    .toContain('offer-001');
}

async function waitForAngularFeedStream(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const ng = (window as { ng?: { getComponent?: (element: Element) => unknown } }).ng;
    const host = document.querySelector('og7-feed-stream');
    return Boolean(host && ng && typeof ng.getComponent === 'function' && ng.getComponent(host));
  });
}
