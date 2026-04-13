import './setup';
import { expect, type Locator, type Page, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser } from './helpers/auth-session';
import { mockImportationApis, mockProfileAndFavoritesApis } from './helpers/domain-mocks';

async function expectAssociatedLabel(control: Locator): Promise<void> {
  await expect(control).toBeVisible();
  const hasLabel = await control.evaluate((element) => {
    if (
      !(element instanceof HTMLInputElement) &&
      !(element instanceof HTMLSelectElement) &&
      !(element instanceof HTMLTextAreaElement)
    ) {
      return false;
    }

    const labels = element.labels;
    if (labels && labels.length > 0) {
      return true;
    }

    return Boolean(element.getAttribute('aria-label') || element.getAttribute('aria-labelledby'));
  });

  expect(hasLabel).toBeTruthy();
}

async function activateWithKeyboard(page: Page, target: Locator, key: 'Enter' | 'Space' = 'Enter'): Promise<void> {
  await target.focus();
  await expect(target).toBeFocused();
  await page.keyboard.press(key);
}

test.describe('Quality breadth importation accessibility depth', () => {
  test('keeps the compare filter labeled and keyboard-usable through invalid-to-valid recovery', async ({
    page,
  }) => {
    await mockProfileAndFavoritesApis(page);
    await mockImportationApis(page);

    await loginAsAuthenticatedE2eUser(page, '/importation');

    const overview = page.locator('[data-og7="importation-overview"]');
    const compareToggle = overview.locator('.og7-importation-overview__switch input[type="checkbox"]');
    const compareInput = overview.locator('input[name="compareWithDraft"]');
    const compareError = overview.locator('.og7-importation-overview__field-error').last();

    await expect(overview).toBeVisible();
    await expectAssociatedLabel(compareToggle);
    await expectAssociatedLabel(compareInput);

    await activateWithKeyboard(page, compareToggle, 'Space');
    await expect(compareInput).toBeEnabled();

    await compareInput.focus();
    await expect(compareInput).toBeFocused();
    await compareInput.fill('2026-13');
    await page.keyboard.press('Enter');

    await expect(compareInput).toHaveAttribute('aria-invalid', 'true');
    await expect(compareError).toBeVisible();
    await expect(compareError).toHaveAttribute('role', 'alert');
    await expect(compareError).toHaveAttribute('aria-live', 'assertive');

    await compareInput.fill('2026-02');
    await page.keyboard.press('Enter');

    await expect(compareError).toHaveCount(0);
    await expect.poll(() => new URL(page.url()).searchParams.get('compareMode')).toBe('true');
    await expect.poll(() => new URL(page.url()).searchParams.get('compareWith')).toBe('2026-02');
  });

  test('announces collaboration-form validation errors and still submits corrected keyboard input', async ({
    page,
  }) => {
    await mockProfileAndFavoritesApis(page);
    await mockImportationApis(page);

    await loginAsAuthenticatedE2eUser(page, '/importation');

    const collaboration = page.locator('[data-og7="importation-collaboration"]');
    const watchlistInput = collaboration.locator('input[name="watchlistName"]');
    const watchlistSubmit = collaboration.locator('.og7-importation-collaboration__watchlists button[type="submit"]');
    const watchlistError = collaboration
      .locator('.og7-importation-collaboration__watchlists .og7-importation-collaboration__error')
      .first();

    const recipientsInput = collaboration.locator('input[name="recipients"]');
    const scheduleSubmit = collaboration.locator('.og7-importation-collaboration__schedule button[type="submit"]');
    const scheduleError = collaboration
      .locator('.og7-importation-collaboration__schedule .og7-importation-collaboration__error')
      .first();

    await expect(collaboration).toBeVisible();
    await expectAssociatedLabel(watchlistInput);
    await expectAssociatedLabel(recipientsInput);

    await watchlistInput.fill('AB');
    await activateWithKeyboard(page, watchlistSubmit);

    await expect(watchlistInput).toHaveAttribute('aria-invalid', 'true');
    await expect(watchlistError).toBeVisible();
    await expect(watchlistError).toHaveAttribute('role', 'alert');
    await expect(watchlistError).toHaveAttribute('aria-live', 'assertive');

    const watchlistRequest = page.waitForRequest(
      (request) =>
        request.method().toUpperCase() === 'POST' && request.url().includes('/api/import-watchlists')
    );
    await watchlistInput.fill('Battery corridor watch');
    await activateWithKeyboard(page, watchlistSubmit);
    await watchlistRequest;

    await expect(watchlistError).toHaveCount(0);
    await expect(watchlistInput).toHaveValue('');
    await expect(collaboration).toContainText('Battery corridor watch');

    await recipientsInput.fill('ops@openg7.test, invalid-email');
    await activateWithKeyboard(page, scheduleSubmit);

    await expect(recipientsInput).toHaveAttribute('aria-invalid', 'true');
    await expect(scheduleError).toBeVisible();
    await expect(scheduleError).toHaveAttribute('role', 'alert');
    await expect(scheduleError).toHaveAttribute('aria-live', 'assertive');

    const scheduleRequest = page.waitForRequest(
      (request) =>
        request.method().toUpperCase() === 'POST' &&
        request.url().includes('/api/import-reports/schedule')
    );
    await recipientsInput.fill('ops@openg7.test, trade@openg7.test');
    await activateWithKeyboard(page, scheduleSubmit);

    const payload = (await scheduleRequest).postDataJSON() as {
      recipients?: string[];
      format?: string;
      frequency?: string;
    };

    expect(payload.recipients).toEqual(['ops@openg7.test', 'trade@openg7.test']);
    expect(payload.format).toBe('csv');
    expect(payload.frequency).toBe('monthly');
    await expect(scheduleError).toHaveCount(0);
    await expect(recipientsInput).toHaveValue('');
  });
});
