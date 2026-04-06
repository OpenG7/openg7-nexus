import './setup';
import { expect, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser } from './helpers/auth-session';
import { DEFAULT_PROFILE, mockProfileAndFavoritesApis } from './helpers/domain-mocks';

test.describe('Notification preferences', () => {
  test('saves notification channels, frequency, and webhook settings across reload', async ({
    page,
  }) => {
    await mockProfileAndFavoritesApis(page);

    await loginAsAuthenticatedE2eUser(page, '/profile');
    await expect(page.locator('[data-og7="user-profile-form"]')).toBeVisible();

    const profileForm = page.locator('[data-og7="user-profile-form"]');
    const saveButton = profileForm.locator('button[type="submit"]');
    const inAppChannel = page.locator('#profile-alert-channel-inapp');
    const emailChannel = page.locator('#profile-email-notifications');
    const webhookChannel = page.locator('#profile-webhook-notifications');
    const frequencySelect = page.locator('#profile-alert-frequency');
    const webhookUrlInput = page.locator('#profile-notification-webhook');

    await expect(inAppChannel).toBeChecked();
    await expect(emailChannel).toBeChecked();
    await expect(webhookChannel).not.toBeChecked();
    await expect(frequencySelect).toHaveValue('daily-digest');
    await expect(webhookUrlInput).toBeDisabled();
    await expect(webhookUrlInput).toHaveValue('');

    await emailChannel.uncheck();
    await webhookChannel.check();
    await expect(webhookUrlInput).toBeEnabled();
    await webhookUrlInput.fill('https://hooks.openg7.test/profile-updated');
    await frequencySelect.selectOption('instant');
    await expect(saveButton).toBeEnabled();

    const [updateRequest, updateResponse] = await Promise.all([
      page.waitForRequest(
        (request) =>
          request.method().toUpperCase() === 'PUT' &&
          request.url().includes('/api/users/me/profile')
      ),
      page.waitForResponse(
        (response) =>
          response.request().method().toUpperCase() === 'PUT' &&
          response.url().includes('/api/users/me/profile')
      ),
      saveButton.click(),
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
        inApp: true,
        email: false,
        webhook: true,
      },
      frequency: 'instant',
      emailOptIn: false,
      webhookUrl: 'https://hooks.openg7.test/profile-updated',
    });

    await expect(page.locator('[data-og7="user-profile-unsaved-changes"]')).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(inAppChannel).toBeChecked();
    await expect(emailChannel).not.toBeChecked();
    await expect(webhookChannel).toBeChecked();
    await expect(frequencySelect).toHaveValue('instant');
    await expect(webhookUrlInput).toBeEnabled();
    await expect(webhookUrlInput).toHaveValue('https://hooks.openg7.test/profile-updated');
  });

  test('clears webhook delivery settings when webhook notifications are disabled', async ({
    page,
  }) => {
    await mockProfileAndFavoritesApis(page, {
      ...DEFAULT_PROFILE,
      notificationPreferences: {
        emailOptIn: true,
        webhookUrl: 'https://hooks.openg7.test/profile-enabled',
        channels: {
          inApp: true,
          email: true,
          webhook: true,
        },
        filters: {
          severities: ['warning', 'critical'],
          sources: ['saved-search', 'system'],
        },
        frequency: 'instant',
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '06:00',
          timezone: 'America/Toronto',
        },
      },
    });

    await loginAsAuthenticatedE2eUser(page, '/profile');
    await expect(page.locator('[data-og7="user-profile-form"]')).toBeVisible();

    const profileForm = page.locator('[data-og7="user-profile-form"]');
    const saveButton = profileForm.locator('button[type="submit"]');
    const webhookChannel = page.locator('#profile-webhook-notifications');
    const frequencySelect = page.locator('#profile-alert-frequency');
    const webhookUrlInput = page.locator('#profile-notification-webhook');

    await expect(webhookChannel).toBeChecked();
    await expect(frequencySelect).toHaveValue('instant');
    await expect(webhookUrlInput).toBeEnabled();
    await expect(webhookUrlInput).toHaveValue('https://hooks.openg7.test/profile-enabled');

    await webhookChannel.uncheck();
    await expect(webhookUrlInput).toBeDisabled();
    await expect(webhookUrlInput).toHaveValue('');
    await expect(saveButton).toBeEnabled();

    const [updateRequest, updateResponse] = await Promise.all([
      page.waitForRequest(
        (request) =>
          request.method().toUpperCase() === 'PUT' &&
          request.url().includes('/api/users/me/profile')
      ),
      page.waitForResponse(
        (response) =>
          response.request().method().toUpperCase() === 'PUT' &&
          response.url().includes('/api/users/me/profile')
      ),
      saveButton.click(),
    ]);

    const updatePayload = updateRequest.postDataJSON() as {
      notificationPreferences?: {
        channels?: { inApp?: boolean; email?: boolean; webhook?: boolean };
        frequency?: string | null;
        webhookUrl?: string | null;
      };
    };

    expect(updateResponse.status()).toBe(200);
    expect(updatePayload.notificationPreferences).toMatchObject({
      channels: {
        webhook: false,
      },
      frequency: 'instant',
      webhookUrl: null,
    });

    await expect(page.locator('[data-og7="user-profile-unsaved-changes"]')).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(webhookChannel).not.toBeChecked();
    await expect(webhookUrlInput).toBeDisabled();
    await expect(webhookUrlInput).toHaveValue('');
    await expect(frequencySelect).toHaveValue('instant');
  });
});
