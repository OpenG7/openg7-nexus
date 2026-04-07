import './setup';
import { expect, type Locator, type Page, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser } from './helpers/auth-session';
import { DEFAULT_PROFILE, mockCompanyApis, mockProfileAndFavoritesApis } from './helpers/domain-mocks';

async function enableMockFeed(page: Page): Promise<void> {
  await page.route('**/runtime-config.js', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.__OG7_CONFIG__ = {
        FEATURE_FLAGS: {
          feedMocks: true,
          homeFeedMocks: true
        }
      };`,
    });
  });
}

async function waitForAngularFeedStream(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const ng = (window as { ng?: { getComponent?: (element: Element) => unknown } }).ng;
    const host = document.querySelector('og7-feed-stream');
    return Boolean(host && ng && typeof ng.getComponent === 'function' && ng.getComponent(host));
  });
}

async function expectAssociatedLabel(control: Locator): Promise<void> {
  await expect(control).toBeVisible();
  const hasLabel = await control.evaluate(element => {
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

test.describe('Quality breadth accessibility', () => {
  test('keeps feed filters keyboard-usable and announces feed state', async ({ page }) => {
    await enableMockFeed(page);
    await mockProfileAndFavoritesApis(page);

    await loginAsAuthenticatedE2eUser(page, '/feed?type=REQUEST&sector=energy&fromProvince=AB&mode=IMPORT&sort=VOLUME&q=fuel');
    await waitForAngularFeedStream(page);

    const searchInput = page.locator('#feed-search');
    const typeSelect = page.locator('#feed-type');
    const sectorSelect = page.locator('#feed-sector');
    const fromSelect = page.locator('#feed-from');
    const clearButton = page.locator('[data-og7-id="feed-clear-filters"]');
    const streamStatus = page.locator('og7-feed-stream [role="status"]').first();

    await expectAssociatedLabel(searchInput);
    await expectAssociatedLabel(typeSelect);
    await expectAssociatedLabel(sectorSelect);
    await expectAssociatedLabel(fromSelect);
    await expect(streamStatus).toBeVisible();
    await expect(streamStatus.locator('.feed-stream__status-label')).not.toHaveText(/^\s*$/);

    await activateWithKeyboard(page, clearButton);

    await expect(page.locator('[data-og7="feed-active-filters"]')).toHaveCount(0);
    await expect(searchInput).toHaveValue('');
    await expect
      .poll(() => new URL(page.url()).searchParams.get('type'))
      .toBeNull();
    await expect
      .poll(() => new URL(page.url()).searchParams.get('q'))
      .toBeNull();
  });

  test('keeps profile notification controls labeled and savable without mouse input', async ({ page }) => {
    await mockProfileAndFavoritesApis(page);

    await loginAsAuthenticatedE2eUser(page, '/profile');
    await expect(page.locator('[data-og7="user-profile-form"]')).toBeVisible();

    const emailChannel = page.locator('#profile-email-notifications');
    const webhookChannel = page.locator('#profile-webhook-notifications');
    const frequencySelect = page.locator('#profile-alert-frequency');
    const webhookUrlInput = page.locator('#profile-notification-webhook');
    const saveButton = page.locator('[data-og7="user-profile-form"] button[type="submit"]').first();

    await expectAssociatedLabel(emailChannel);
    await expectAssociatedLabel(webhookChannel);
    await expectAssociatedLabel(frequencySelect);
    await expectAssociatedLabel(webhookUrlInput);

    await activateWithKeyboard(page, emailChannel, 'Space');
    await activateWithKeyboard(page, webhookChannel, 'Space');
    await expect(webhookUrlInput).toBeEnabled();

    await frequencySelect.selectOption('instant');
    await webhookUrlInput.focus();
    await page.keyboard.type('https://hooks.openg7.test/profile-a11y');

    const [updateRequest, updateResponse] = await Promise.all([
      page.waitForRequest(request => request.method().toUpperCase() === 'PUT' && request.url().includes('/api/users/me/profile')),
      page.waitForResponse(response => response.request().method().toUpperCase() === 'PUT' && response.url().includes('/api/users/me/profile')),
      activateWithKeyboard(page, saveButton),
    ]);

    const updatePayload = updateRequest.postDataJSON() as {
      notificationPreferences?: {
        channels?: { inApp?: boolean; email?: boolean; webhook?: boolean };
        frequency?: string | null;
        emailOptIn?: boolean;
        webhookUrl?: string | null;
      };
    };

    expect(updateResponse.status()).toBe(200);
    expect(updatePayload.notificationPreferences).toMatchObject({
      channels: {
        email: false,
        webhook: true,
      },
      frequency: 'instant',
      emailOptIn: false,
      webhookUrl: 'https://hooks.openg7.test/profile-a11y',
    });
    await expect(page.locator('[data-og7="user-profile-unsaved-changes"]')).toHaveCount(0);
  });

  test('keeps admin trust review decisions keyboard-operable with labeled critical controls', async ({ page }) => {
    await mockProfileAndFavoritesApis(page, {
      ...DEFAULT_PROFILE,
      roles: ['admin'],
    });
    await mockCompanyApis(page);

    await loginAsAuthenticatedE2eUser(page, '/admin/trust');
    await expect(page.locator('[data-og7="admin-trust"]')).toBeVisible();

    const queueItem = page.locator('[data-og7-id="admin-trust-company-1001"]');
    const statusSelect = page.locator('[data-og7-id="admin-trust-status"]');
    const reviewNote = page.locator('[data-og7-id="admin-trust-review-note"]');
    const quickCorrection = page.locator('[data-og7-id="admin-trust-quick-correction"]');
    const saveButton = page.locator('[data-og7-id="admin-trust-save"]');

    await activateWithKeyboard(page, queueItem);
    await expect(page.locator('[data-og7="admin-trust-review-workspace"]')).toBeVisible();
    await expectAssociatedLabel(statusSelect);
    await expectAssociatedLabel(reviewNote);

    await activateWithKeyboard(page, quickCorrection, 'Space');
    await expect(statusSelect).toHaveValue('correctionRequested');

    await reviewNote.focus();
    await expect(reviewNote).toBeFocused();
    await page.keyboard.type('Keyboard-only correction review note.');

    const [saveRequest, saveResponse] = await Promise.all([
      page.waitForRequest(request => request.method().toUpperCase() === 'PUT' && request.url().includes('/api/companies/1001')),
      page.waitForResponse(response => response.request().method().toUpperCase() === 'PUT' && response.url().includes('/api/companies/1001')),
      activateWithKeyboard(page, saveButton),
    ]);

    const savePayload = saveRequest.postDataJSON() as {
      data?: {
        verificationStatus?: string;
        trustHistory?: Array<{ notes?: string | null }>;
      };
    };

    expect(saveResponse.status()).toBe(200);
    expect(savePayload.data?.verificationStatus).toBe('correctionRequested');
    expect(savePayload.data?.trustHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ notes: expect.stringContaining('Keyboard-only correction review note.') }),
      ])
    );
  });
});