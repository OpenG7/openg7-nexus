import './setup';
import { expect, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser } from './helpers/auth-session';
import { mockImportationApis, mockProfileAndFavoritesApis } from './helpers/domain-mocks';

function searchParam(pageUrl: string, key: string): string | null {
  return new URL(pageUrl).searchParams.get(key);
}

function searchParams(pageUrl: string, key: string): string[] {
  return new URL(pageUrl).searchParams.getAll(key);
}

test.describe('Importation analytics', () => {
  test('proves compare mode, annotations, and collaborative persistence', async ({ page }) => {
    await mockProfileAndFavoritesApis(page);
    await mockImportationApis(page);

    await loginAsAuthenticatedE2eUser(page, '/importation');

    const importation = page.locator('[data-og7="importation"]');
    const overview = page.locator('[data-og7="importation-overview"]');
    const flowPanel = page.locator('[data-og7="importation-flow"]');
    const collaboration = page.locator('[data-og7="importation-collaboration"]');

    await expect(importation).toBeVisible();
    await expect(overview).toBeVisible();
    await expect(flowPanel).toBeVisible();
    await expect(collaboration).toBeVisible();

    const compareToggle = overview.locator('input[type="checkbox"]');
    const compareInput = overview.locator('input[name="compareWithDraft"]');
    const applyCompareButton = overview.locator('[data-og7="importation-filters"][data-og7-id="apply-compare"]');

    await compareToggle.check();
    await expect(compareInput).toBeEnabled();
    await compareInput.fill('2026-01');

    const compareRequest = page.waitForRequest((request) => {
      if (!request.url().includes('/api/import-flows')) {
        return false;
      }
      const url = new URL(request.url());
      return (
        url.searchParams.get('compareMode') === 'true' &&
        url.searchParams.get('compareWith') === '2026-01'
      );
    });

    await applyCompareButton.click();
    await compareRequest;

    await expect.poll(() => searchParam(page.url(), 'compareMode')).toBe('true');
    await expect.poll(() => searchParam(page.url(), 'compareWith')).toBe('2026-01');

    const compareSelect = flowPanel.locator('select');
    await expect(compareSelect).toBeVisible();
    await expect(compareSelect.locator('option')).toHaveCount(4);

    const compareTargetRequest = page.waitForRequest((request) => {
      if (!request.url().includes('/api/import-flows')) {
        return false;
      }
      const url = new URL(request.url());
      return (
        url.searchParams.get('compareMode') === 'true' &&
        url.searchParams.get('compareWith') === '2025-12'
      );
    });

    await compareSelect.selectOption('2025-12');
    await compareTargetRequest;

    await expect.poll(() => searchParam(page.url(), 'compareWith')).toBe('2025-12');
    await expect(flowPanel.locator('.og7-importation-flow__card')).toContainText('United States');
    await expect(collaboration).toContainText('Battery imports accelerated after the January procurement window.');
    await expect(collaboration).toContainText('cmd-2');

    await flowPanel.locator('.og7-importation-flow__list article button').first().click();

    await expect.poll(() => searchParam(page.url(), 'originScope')).toBe('custom');
    await expect.poll(() => searchParams(page.url(), 'originCode')).toEqual(['US']);
    await expect(overview.locator('input[name="originCodesDraft"]')).toHaveValue('US');

    const watchlistName = 'Critical US battery flows';
    const watchlistRequestPromise = page.waitForRequest((request) =>
      request.method().toUpperCase() === 'POST' && request.url().includes('/api/import-watchlists')
    );

    await collaboration.locator('input[name="watchlistName"]').fill(watchlistName);
    await collaboration.locator('.og7-importation-collaboration__watchlists button[type="submit"]').click();

    const watchlistRequest = await watchlistRequestPromise;
    const watchlistPayload = watchlistRequest.postDataJSON() as {
      name: string;
      filters: {
        compareMode: boolean;
        compareWith: string | null;
        originScope: string;
        originCodes: string[];
      };
    };

    expect(watchlistPayload.name).toBe(watchlistName);
    expect(watchlistPayload.filters.compareMode).toBe(true);
    expect(watchlistPayload.filters.compareWith).toBe('2025-12');
    expect(watchlistPayload.filters.originScope).toBe('custom');
    expect(watchlistPayload.filters.originCodes).toEqual(['US']);

    await expect(collaboration).toContainText(watchlistName);
    await expect(collaboration).toContainText('month:latest');
    await expect(collaboration).toContainText('US');

    const scheduleRequestPromise = page.waitForRequest((request) =>
      request.method().toUpperCase() === 'POST' && request.url().includes('/api/import-reports/schedule')
    );
    const scheduleResponsePromise = page.waitForResponse((response) =>
      response.request().method().toUpperCase() === 'POST' &&
      response.url().includes('/api/import-reports/schedule')
    );

    await collaboration.locator('input[name="recipients"]').fill('ops@openg7.test, trade@openg7.test');
    await collaboration.locator('select[name="format"]').selectOption('json');
    await collaboration.locator('select[name="frequency"]').selectOption('weekly');
    await collaboration.locator('textarea[name="notes"]').fill('Focus on US battery import flows.');
    await collaboration.locator('.og7-importation-collaboration__schedule button[type="submit"]').click();

    const scheduleRequest = await scheduleRequestPromise;
    const schedulePayload = scheduleRequest.postDataJSON() as {
      period: string;
      recipients: string[];
      format: string;
      frequency: string;
      notes?: string;
    };

    expect(schedulePayload.period).toBe('month');
    expect(schedulePayload.recipients).toEqual(['ops@openg7.test', 'trade@openg7.test']);
    expect(schedulePayload.format).toBe('json');
    expect(schedulePayload.frequency).toBe('weekly');
    expect(schedulePayload.notes).toBe('Focus on US battery import flows.');
    expect((await scheduleResponsePromise).status()).toBe(204);

    await expect(collaboration.locator('input[name="recipients"]')).toHaveValue('');
  });
});