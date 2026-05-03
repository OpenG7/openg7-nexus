import './setup';
import { test, expect } from '@playwright/test';

test.describe('Trade map', () => {
  test('renders the mounted map surface with decision drilldowns', async ({ page }) => {
    await page.goto('/');

    const mapSection = page.locator('[data-og7="home-map"]');
    const tradeMap = page.locator('[data-og7="trade-map"]');

    await mapSection.scrollIntoViewIfNeeded();
    await expect(tradeMap).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-og7="map-decision-panel"]')).toBeVisible();
    await expect(page.locator('[data-og7="map-drilldown"][data-og7-id="agri-food"]')).toBeVisible();
    await expect(page.locator('[data-og7="map-drilldown"][data-og7-id="energy"]')).toBeVisible();
    await expect(page.locator('[data-og7="map-drilldown"][data-og7-id="digital-services"]')).toBeVisible();

    await expect(page.locator('[data-og7="map-legend"]')).toBeVisible();
    await expect(page.locator('[data-og7="map-sector-chips"]')).toBeVisible();
    await expect(page.locator('[data-og7="map-basemap-toggle"]')).toBeVisible();
    await expect(page.locator('[data-og7="map-zoom-control"]')).toBeVisible();

    const layer = (id: string) => page.locator(`[data-og7="map-layer"][data-og7-layer="${id}"]`);
    await expect(layer('flows')).toBeVisible();
    await expect(layer('markers')).toBeVisible();
    await expect(layer('highlight')).toHaveCount(0);
    await expect(page.locator('[data-og7="map-tooltip"]')).toBeVisible();
    await expect(page.locator('[data-og7="map-aria-live"]')).toBeVisible();
  });

  test('opens a downstream request feed from a keyboard-driven map drilldown', async ({ page }) => {
    await page.goto('/');

    const mapSection = page.locator('[data-og7="home-map"]');
    const energyDrilldown = page.locator('[data-og7="map-drilldown"][data-og7-id="energy"]');
    const openFeed = page.locator('[data-og7="action"][data-og7-id="map-open-feed"]');
    const highlightLayer = page.locator('[data-og7="map-layer"][data-og7-layer="highlight"]');

    await mapSection.scrollIntoViewIfNeeded();
    await expect(energyDrilldown).toBeVisible({ timeout: 10000 });

    await energyDrilldown.focus();
    await page.keyboard.press('Enter');

    await expect(energyDrilldown).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-og7="map-decision-context"]')).toBeVisible();
    await expect(page.locator('[data-og7="map-decision-context"]')).toContainText(/Energy/i);
    await expect(highlightLayer).toBeVisible();

    await openFeed.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/feed/);
    await expect
      .poll(() => new URL(page.url()).searchParams.get('source'))
      .toBe('trade-map');
    await expect
      .poll(() => new URL(page.url()).searchParams.get('sector'))
      .toBe('energy');
    await expect
      .poll(() => new URL(page.url()).searchParams.get('type'))
      .toBe('REQUEST');

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-source-context"]')).toBeVisible();
    await expect(page.locator('#feed-type')).toHaveValue(/REQUEST$/);
    await expect(page.locator('#feed-sector')).toHaveValue(/energy$/);
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="type"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="sector"]')).toBeVisible();
    await expect
      .poll(async () =>
        page
          .locator('[data-feed-item-id]')
          .evaluateAll((elements) => elements.map((element) => element.getAttribute('data-feed-item-id') ?? ''))
      )
      .toEqual(['request-001', 'request-002', 'request-008']);
  });
});
