import './setup';
import { test, expect } from '@playwright/test';

test.describe('Trade map', () => {
  test('renders the mounted map surface with decision drilldowns', async ({ page }) => {
    await page.goto('/');

    const mapSection = page.locator('[data-og7="home-map"]');
    const tradeMap = page.locator('[data-og7="trade-map"]');

    await mapSection.scrollIntoViewIfNeeded();
    await expect(tradeMap).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-og7="map-cinematic-status"]')).toHaveAttribute('data-og7-state', 'ready');
    await expect(page.locator('[data-og7="map-decision-panel"]')).toBeVisible();
    await expect(page.locator('[data-og7="map-drilldown"][data-og7-id="agri-food"]')).toBeVisible();
    await expect(page.locator('[data-og7="map-drilldown"][data-og7-id="energy"]')).toBeVisible();
    await expect(page.locator('[data-og7="map-drilldown"][data-og7-id="digital-services"]')).toBeVisible();

    await expect(page.locator('[data-og7="map-legend"]')).toBeVisible();
    await expect(page.locator('[data-og7="map-sector-rail"]')).toBeVisible();
    await expect(page.locator('[data-og7="map-pulse-panel"]')).toBeVisible();
    await expect(page.locator('[data-og7="map-cinematic-status"]')).toBeVisible();
    await expect(page.locator('[data-og7="map-corridor-card"]')).toBeVisible();
    await expect(page.locator('[data-og7="map-corridor-beat"]')).toHaveCount(3);
    await expect(page.locator('[data-og7="map-hub-prompt"]')).toBeVisible();
  });

  test('opens a hub brief from corridor beats and returns to prompt', async ({ page }) => {
    await page.goto('/');

    const mapSection = page.locator('[data-og7="home-map"]');
    const corridorCard = page.locator('[data-og7="map-corridor-card"]');

    await mapSection.scrollIntoViewIfNeeded();
    await expect(corridorCard).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-og7="map-cinematic-status"]')).toHaveAttribute('data-og7-state', 'ready');
    await expect(corridorCard).toHaveAttribute('data-og7-id', 'flow-energy');

    const energyTradeBeat = page.locator('[data-og7="map-corridor-beat"][data-og7-id="energy-trade"]');
    await energyTradeBeat.dispatchEvent('click');
    await expect(energyTradeBeat).toHaveAttribute('aria-pressed', 'true');

    const hubCard = page.locator('[data-og7="map-hub-card"]');
    await expect(hubCard).toBeVisible();
    await expect(hubCard).toHaveAttribute('data-og7-id', 'montreal');
    await expect(corridorCard).toHaveAttribute('data-og7-id', 'flow-energy');

    await page.locator('[data-og7="action"][data-og7-id="map-hub-dismiss"]').click();

    await expect(hubCard).toBeHidden();
    await expect(page.locator('[data-og7="map-hub-prompt"]')).toBeVisible();
  });

  test('enters cinematic idle mode after inactivity', async ({ page }) => {
    await page.goto('/');

    const mapSection = page.locator('[data-og7="home-map"]');
    const corridorCard = page.locator('[data-og7="map-corridor-card"]');
    const cinematicStatus = page.locator('[data-og7="map-cinematic-status"]');

    await mapSection.scrollIntoViewIfNeeded();
    await expect(corridorCard).toBeVisible({ timeout: 10000 });
    await expect(cinematicStatus).toHaveAttribute('data-og7-state', 'ready');
    await expect(cinematicStatus).toHaveAttribute('data-og7-id', 'standby');

    const initialCorridorId = await corridorCard.getAttribute('data-og7-id');
    expect(initialCorridorId).not.toBeNull();

    await expect
      .poll(async () => cinematicStatus.getAttribute('data-og7-id'), { timeout: 12000 })
      .toBe('active');
    await expect
      .poll(async () => corridorCard.getAttribute('data-og7-id'), { timeout: 12000 })
      .not.toBe(initialCorridorId);
  });

  test('opens a downstream request feed from a map drilldown', async ({ page }) => {
    await page.goto('/');

    const mapSection = page.locator('[data-og7="home-map"]');
    const energyDrilldown = page.locator('[data-og7="map-drilldown"][data-og7-id="energy"]');
    const openFeed = page.locator('[data-og7="action"][data-og7-id="map-open-feed"]');

    await mapSection.scrollIntoViewIfNeeded();
    await expect(energyDrilldown).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-og7="map-cinematic-status"]')).toHaveAttribute('data-og7-state', 'ready');

    await energyDrilldown.dispatchEvent('click');

    await expect(energyDrilldown).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-og7="map-decision-context"]')).toBeVisible();
    await expect(page.locator('[data-og7="map-decision-context"]')).toContainText(/Energy/i);
    await expect(page.locator('[data-og7="map-corridor-card"]')).toBeVisible();

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

  test('opens a corridor-focused request feed from keyboard-driven map controls', async ({ page }) => {
    await page.goto('/');

    const mapSection = page.locator('[data-og7="home-map"]');
    const energyTradeBeat = page.locator('[data-og7="map-corridor-beat"][data-og7-id="energy-trade"]');
    const downstreamBridge = page.locator('[data-og7="map-corridor-downstream"]');
    const openCorridorFeed = page.locator('[data-og7="action"][data-og7-id="map-open-corridor-feed"]');

    await mapSection.scrollIntoViewIfNeeded();
    await expect(page.locator('[data-og7="map-corridor-card"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-og7="map-cinematic-status"]')).toHaveAttribute('data-og7-state', 'ready');

    await energyTradeBeat.focus();
    await page.keyboard.press('Enter');

    await expect(energyTradeBeat).toHaveAttribute('aria-pressed', 'true');
    await expect(downstreamBridge).toHaveAttribute('data-og7-id', 'flow-energy');
    await expect(downstreamBridge).toContainText(/Quebec to Ontario|Québec vers Ontario/i);
    await expect(openCorridorFeed).toHaveAttribute('data-og7-corridor-id', 'flow-energy');

    await openCorridorFeed.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/feed/);
    await expect
      .poll(() => new URL(page.url()).searchParams.get('source'))
      .toBe('trade-map');
    await expect
      .poll(() => new URL(page.url()).searchParams.get('corridorId'))
      .toBe('flow-energy');
    await expect
      .poll(() => new URL(page.url()).searchParams.get('sector'))
      .toBe('energy');
    await expect
      .poll(() => new URL(page.url()).searchParams.get('type'))
      .toBe('REQUEST');

    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-source-context"]')).toContainText(/Quebec to Ontario|Québec vers Ontario/i);
    await expect(page.locator('#feed-type')).toHaveValue(/REQUEST$/);
    await expect(page.locator('#feed-sector')).toHaveValue(/energy$/);
    await expect(page.locator('#feed-from')).toHaveValue(/QC$/);
    await expect(page.locator('#feed-to')).toHaveValue(/ON$/);
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="sector"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="fromProvince"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="toProvince"]')).toBeVisible();
    await expect
      .poll(async () =>
        page
          .locator('[data-feed-item-id]')
          .evaluateAll((elements) => elements.map((element) => element.getAttribute('data-feed-item-id') ?? ''))
      )
      .toEqual(['request-001']);
  });
});
