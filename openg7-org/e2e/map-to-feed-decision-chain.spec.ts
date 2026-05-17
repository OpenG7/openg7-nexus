import './setup';
import { expect, test, type Page } from '@playwright/test';

test.describe('Map to feed decision chain', () => {
  test('keeps a map-driven corridor discovery context coherent through detail navigation, back, and reload', async ({
    page,
  }) => {
    await page.goto('/');

    const mapSection = page.locator('[data-og7="home-map"]');
    const energyTradeBeat = page.locator(
      '[data-og7="map-corridor-beat"][data-og7-id="energy-trade"]',
    );
    const downstreamBridge = page.locator('[data-og7="map-corridor-downstream"]');
    const openCorridorFeed = page.locator(
      '[data-og7="action"][data-og7-id="map-open-corridor-feed"]',
    );

    await mapSection.scrollIntoViewIfNeeded();
    await expect(page.locator('[data-og7="map-corridor-card"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-og7="map-cinematic-status"]')).toHaveAttribute(
      'data-og7-state',
      'ready',
    );

    await energyTradeBeat.focus();
    await page.keyboard.press('Enter');

    await expect(energyTradeBeat).toHaveAttribute('aria-pressed', 'true');
    await expect(downstreamBridge).toHaveAttribute('data-og7-id', 'flow-energy');
    await expect(downstreamBridge).toContainText(/Quebec to Ontario|Québec vers Ontario/i);
    await expect(openCorridorFeed).toHaveAttribute('data-og7-corridor-id', 'flow-energy');

    await openCorridorFeed.focus();
    await page.keyboard.press('Enter');
    await waitForAngularFeedStream(page);

    const feedSourceContext = page.locator('[data-og7="feed-source-context"]');

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(feedSourceContext).toBeVisible();
    await expect(feedSourceContext).toContainText(/Quebec to Ontario|Québec vers Ontario/i);
    await expectSearchParams(page, {
      source: 'trade-map',
      corridorId: 'flow-energy',
      feedItemId: 'request-001',
      priority: 'critical',
      sector: 'energy',
      type: 'REQUEST',
      fromProvince: 'QC',
      toProvince: 'ON',
      mode: 'BOTH',
      q: null,
      sort: null,
    });
    await expect(page.locator('#feed-type')).toHaveValue(/REQUEST$/);
    await expect(page.locator('#feed-sector')).toHaveValue(/energy$/);
    await expect(page.locator('#feed-from')).toHaveValue(/QC$/);
    await expect(page.locator('#feed-to')).toHaveValue(/ON$/);
    await expect(page.locator('[data-feed-item-id="request-001"]')).toHaveClass(/is-highlighted/);
    await expect(
      page.locator('[data-og7="feed-source-chip"][data-og7-id="route"]'),
    ).toContainText(/QC\s*->\s*ON/);
    await expect(
      page.locator('[data-og7="feed-source-chip"][data-og7-id="priority"]'),
    ).toBeVisible();
    await expectVisibleItemIds(page, ['request-001']);

    await page.locator('#feed-search').fill('two-week');

    await expectSearchParams(page, {
      source: 'trade-map',
      corridorId: 'flow-energy',
      feedItemId: 'request-001',
      priority: 'critical',
      sector: 'energy',
      type: 'REQUEST',
      fromProvince: 'QC',
      toProvince: 'ON',
      mode: null,
      q: 'two-week',
      sort: null,
    });
    await expect(page.locator('#feed-search')).toHaveValue('two-week');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="search"]')).toContainText(
      'two-week',
    );
    await expect(
      page.locator('[data-og7="feed-filter-chip"][data-og7-id="fromProvince"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-og7="feed-filter-chip"][data-og7-id="toProvince"]'),
    ).toBeVisible();
    await expect(page.locator('[data-feed-item-id="request-001"]')).toHaveClass(/is-highlighted/);
    await expectVisibleItemIds(page, ['request-001']);

    await page.locator('[data-feed-item-id="request-001"] [data-og7-id="feed-open-item"]').click();

    const detailSourceContext = page.locator(
      '[data-og7="opportunity-detail-page"] [data-og7="feed-source-context"]',
    );

    await expect(page).toHaveURL(/\/feed\/opportunities\/request-001(?:\?.*)?$/);
    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
    await expect(detailSourceContext).toBeVisible();
    await expect(detailSourceContext).toContainText(/Quebec to Ontario|Québec vers Ontario/i);
    await expectSearchParams(page, {
      source: 'trade-map',
      corridorId: 'flow-energy',
      feedItemId: 'request-001',
      priority: 'critical',
      sector: 'energy',
      type: 'REQUEST',
      fromProvince: 'QC',
      toProvince: 'ON',
      mode: null,
      q: 'two-week',
      sort: null,
    });
    await expect(page.locator('[data-og7="opportunity-detail-header"] h1')).toContainText(
      'Short-term import of 300 MW',
    );

    await page.goBack();
    await waitForAngularFeedStream(page);

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(feedSourceContext).toBeVisible();
    await expectSearchParams(page, {
      source: 'trade-map',
      corridorId: 'flow-energy',
      feedItemId: 'request-001',
      priority: 'critical',
      sector: 'energy',
      type: 'REQUEST',
      fromProvince: 'QC',
      toProvince: 'ON',
      mode: null,
      q: 'two-week',
      sort: null,
    });
    await expect(page.locator('#feed-search')).toHaveValue('two-week');
    await expect(page.locator('#feed-from')).toHaveValue(/QC$/);
    await expect(page.locator('#feed-to')).toHaveValue(/ON$/);
    await expect(page.locator('[data-feed-item-id="request-001"]')).toHaveClass(/is-highlighted/);
    await expectVisibleItemIds(page, ['request-001']);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await waitForAngularFeedStream(page);

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(feedSourceContext).toBeVisible();
    await expectSearchParams(page, {
      source: 'trade-map',
      corridorId: 'flow-energy',
      feedItemId: 'request-001',
      priority: 'critical',
      sector: 'energy',
      type: 'REQUEST',
      fromProvince: 'QC',
      toProvince: 'ON',
      mode: null,
      q: 'two-week',
      sort: null,
    });
    await expect(page.locator('#feed-search')).toHaveValue('two-week');
    await expect(page.locator('#feed-from')).toHaveValue(/QC$/);
    await expect(page.locator('#feed-to')).toHaveValue(/ON$/);
    await expect(page.locator('[data-feed-item-id="request-001"]')).toHaveClass(/is-highlighted/);
    await expectVisibleItemIds(page, ['request-001']);
  });
});

async function expectVisibleItemIds(page: Page, expectedIds: string[]): Promise<void> {
  await expect
    .poll(async () =>
      page
        .locator('[data-feed-item-id]')
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('data-feed-item-id') ?? ''),
        ),
    )
    .toEqual(expectedIds);
}

async function expectSearchParams(
  page: Page,
  expected: Record<string, string | null>,
): Promise<void> {
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
