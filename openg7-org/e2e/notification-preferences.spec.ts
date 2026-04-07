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

  test('saves severity and source filters across reload', async ({ page }) => {
    await mockProfileAndFavoritesApis(page, {
      ...DEFAULT_PROFILE,
      notificationPreferences: {
        emailOptIn: true,
        webhookUrl: null,
        channels: {
          inApp: true,
          email: true,
          webhook: false,
        },
        filters: {
          severities: ['warning', 'critical'],
          sources: ['saved-search', 'system'],
        },
        frequency: 'daily-digest',
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
    const severityInfo = page.locator('input[formcontrolname="alertSeverityInfo"]');
    const severityWarning = page.locator('input[formcontrolname="alertSeverityWarning"]');
    const severityCritical = page.locator('input[formcontrolname="alertSeverityCritical"]');
    const sourceSavedSearch = page.locator('input[formcontrolname="alertSourceSavedSearch"]');
    const sourceSystem = page.locator('input[formcontrolname="alertSourceSystem"]');

    await expect(severityInfo).not.toBeChecked();
    await expect(severityWarning).toBeChecked();
    await expect(severityCritical).toBeChecked();
    await expect(sourceSavedSearch).toBeChecked();
    await expect(sourceSystem).toBeChecked();

    await severityInfo.check();
    await severityCritical.uncheck();
    await sourceSystem.uncheck();
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
        filters?: {
          severities?: string[];
          sources?: string[];
        };
      };
    };

    expect(updateResponse.status()).toBe(200);
    expect(updatePayload.notificationPreferences?.filters).toEqual({
      severities: ['info', 'warning'],
      sources: ['saved-search'],
    });

    await page.reload();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(severityInfo).toBeChecked();
    await expect(severityWarning).toBeChecked();
    await expect(severityCritical).not.toBeChecked();
    await expect(sourceSavedSearch).toBeChecked();
    await expect(sourceSystem).not.toBeChecked();
  });

  test('blocks save when all severity and source filters are cleared, then saves quiet hours once valid', async ({
    page,
  }) => {
    await mockProfileAndFavoritesApis(page);

    await loginAsAuthenticatedE2eUser(page, '/profile');
    await expect(page.locator('[data-og7="user-profile-form"]')).toBeVisible();

    const profileForm = page.locator('[data-og7="user-profile-form"]');
    const saveButton = profileForm.locator('button[type="submit"]');
    const severityWarning = page.locator('input[formcontrolname="alertSeverityWarning"]');
    const severityCritical = page.locator('input[formcontrolname="alertSeverityCritical"]');
    const sourceSavedSearch = page.locator('input[formcontrolname="alertSourceSavedSearch"]');
    const sourceSystem = page.locator('input[formcontrolname="alertSourceSystem"]');
    const quietHoursEnabled = page.locator('#profile-quiet-hours-enabled');
    const quietHoursStart = page.locator('#profile-quiet-hours-start');
    const quietHoursEnd = page.locator('#profile-quiet-hours-end');
    const quietHoursTimezone = page.locator('#profile-quiet-hours-timezone');

    await severityWarning.uncheck();
    await severityCritical.uncheck();
    await sourceSavedSearch.uncheck();
    await sourceSystem.uncheck();
    await saveButton.click();

    await expect(page.locator('[data-og7-id="alerts-severity-error"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="alerts-source-error"]')).toBeVisible();

    await severityWarning.check();
    await sourceSavedSearch.check();
    await quietHoursEnabled.check();
    await expect(quietHoursStart).toBeEnabled();
    await expect(quietHoursEnd).toBeEnabled();
    await expect(quietHoursTimezone).toBeEnabled();

    await saveButton.click();
    await expect(page.locator('[data-og7-id="alerts-quiet-hours-error"]')).toBeVisible();

    await quietHoursStart.fill('21:30');
    await quietHoursEnd.fill('06:15');
    await quietHoursTimezone.fill('America/Halifax');

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
        filters?: {
          severities?: string[];
          sources?: string[];
        };
        quietHours?: {
          enabled?: boolean;
          start?: string | null;
          end?: string | null;
          timezone?: string | null;
        };
      };
    };

    expect(updateResponse.status()).toBe(200);
    expect(updatePayload.notificationPreferences).toMatchObject({
      filters: {
        severities: ['warning'],
        sources: ['saved-search'],
      },
      quietHours: {
        enabled: true,
        start: '21:30',
        end: '06:15',
        timezone: 'America/Halifax',
      },
    });

    await page.reload();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(quietHoursEnabled).toBeChecked();
    await expect(quietHoursStart).toHaveValue('21:30');
    await expect(quietHoursEnd).toHaveValue('06:15');
    await expect(quietHoursTimezone).toHaveValue('America/Halifax');
    await expect(sourceSavedSearch).toBeChecked();
    await expect(sourceSystem).not.toBeChecked();
    await expect(severityWarning).toBeChecked();
    await expect(severityCritical).not.toBeChecked();
  });

  test('blocks save when the webhook URL is not HTTPS', async ({ page }) => {
    await mockProfileAndFavoritesApis(page);

    await loginAsAuthenticatedE2eUser(page, '/profile');
    await expect(page.locator('[data-og7="user-profile-form"]')).toBeVisible();

    const profileForm = page.locator('[data-og7="user-profile-form"]');
    const saveButton = profileForm.locator('button[type="submit"]');
    const webhookChannel = page.locator('#profile-webhook-notifications');
    const webhookUrlInput = page.locator('#profile-notification-webhook');
    const webhookUrlError = page.locator('[data-og7="user-profile-notification-webhook-error"]');

    await webhookChannel.check();
    await expect(webhookUrlInput).toBeEnabled();
    await webhookUrlInput.fill('http://hooks.openg7.test/insecure');
    await webhookUrlInput.blur();

    await expect(webhookUrlError).toBeVisible();
    await expect(saveButton).toBeDisabled();

    await webhookUrlInput.fill('https://hooks.openg7.test/secure');
    await webhookUrlInput.blur();

    await expect(webhookUrlError).toHaveCount(0);
    await expect(saveButton).toBeEnabled();
  });

  test('blocks save when quiet hours timezone is invalid, then saves once corrected', async ({ page }) => {
    await mockProfileAndFavoritesApis(page);

    await loginAsAuthenticatedE2eUser(page, '/profile');
    await expect(page.locator('[data-og7="user-profile-form"]')).toBeVisible();

    const profileForm = page.locator('[data-og7="user-profile-form"]');
    const saveButton = profileForm.locator('button[type="submit"]');
    const quietHoursEnabled = page.locator('#profile-quiet-hours-enabled');
    const quietHoursStart = page.locator('#profile-quiet-hours-start');
    const quietHoursEnd = page.locator('#profile-quiet-hours-end');
    const quietHoursTimezone = page.locator('#profile-quiet-hours-timezone');
    const quietHoursTimezoneError = page.locator('[data-og7-id="alerts-quiet-hours-timezone-error"]');

    await quietHoursEnabled.check();
    await quietHoursStart.fill('20:00');
    await quietHoursEnd.fill('05:30');
    await quietHoursTimezone.fill('Mars/Olympus-Mons');
    await quietHoursTimezone.blur();

    await expect(quietHoursTimezoneError).toBeVisible();
    await expect(saveButton).toBeDisabled();

    await quietHoursTimezone.fill('America/Winnipeg');
    await quietHoursTimezone.blur();

    await expect(quietHoursTimezoneError).toHaveCount(0);
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
        quietHours?: {
          enabled?: boolean;
          start?: string | null;
          end?: string | null;
          timezone?: string | null;
        };
      };
    };

    expect(updateResponse.status()).toBe(200);
    expect(updatePayload.notificationPreferences?.quietHours).toEqual({
      enabled: true,
      start: '20:00',
      end: '05:30',
      timezone: 'America/Winnipeg',
    });
  });

  test('clears quiet hours values and persists nulls when quiet hours are disabled', async ({ page }) => {
    await mockProfileAndFavoritesApis(page, {
      ...DEFAULT_PROFILE,
      notificationPreferences: {
        emailOptIn: true,
        webhookUrl: null,
        channels: {
          inApp: true,
          email: true,
          webhook: false,
        },
        filters: {
          severities: ['warning', 'critical'],
          sources: ['saved-search', 'system'],
        },
        frequency: 'daily-digest',
        quietHours: {
          enabled: true,
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
    const quietHoursEnabled = page.locator('#profile-quiet-hours-enabled');
    const quietHoursStart = page.locator('#profile-quiet-hours-start');
    const quietHoursEnd = page.locator('#profile-quiet-hours-end');
    const quietHoursTimezone = page.locator('#profile-quiet-hours-timezone');

    await expect(quietHoursEnabled).toBeChecked();
    await expect(quietHoursStart).toHaveValue('22:00');
    await expect(quietHoursEnd).toHaveValue('06:00');
    await expect(quietHoursTimezone).toHaveValue('America/Toronto');

    await quietHoursEnabled.uncheck();
    await expect(quietHoursStart).toBeDisabled();
    await expect(quietHoursEnd).toBeDisabled();
    await expect(quietHoursTimezone).toBeDisabled();
    await expect(quietHoursStart).toHaveValue('');
    await expect(quietHoursEnd).toHaveValue('');
    await expect(quietHoursTimezone).toHaveValue('');

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
        quietHours?: {
          enabled?: boolean;
          start?: string | null;
          end?: string | null;
          timezone?: string | null;
        };
      };
    };

    expect(updateResponse.status()).toBe(200);
    expect(updatePayload.notificationPreferences?.quietHours).toEqual({
      enabled: false,
      start: null,
      end: null,
      timezone: null,
    });

    await page.reload();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(quietHoursEnabled).not.toBeChecked();
    await expect(quietHoursStart).toBeDisabled();
    await expect(quietHoursEnd).toBeDisabled();
    await expect(quietHoursTimezone).toBeDisabled();
    await expect(quietHoursStart).toHaveValue('');
    await expect(quietHoursEnd).toHaveValue('');
    await expect(quietHoursTimezone).toHaveValue('');
  });
});
