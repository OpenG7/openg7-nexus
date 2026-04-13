import './setup';
import { expect, type Locator, type Page, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser } from './helpers/auth-session';
import { mockProfileAndFavoritesApis } from './helpers/domain-mocks';

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

async function expectNonEmptyText(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  await expect(locator).not.toHaveText(/^\s*$/);
}

test.describe('Quality breadth screenreader status', () => {
  test('announces feed load failures through alert surfaces while preserving a live status region', async ({ page }) => {
    await enableMockFeed(page);
    await mockProfileAndFavoritesApis(page);
    await page.route('**/assets/mocks/catalog.mock.json', async route => {
      await route.abort('failed');
    });

    await loginAsAuthenticatedE2eUser(page, '/feed');

    const streamStatus = page.locator('og7-feed-stream [role="status"]').first();
    const feedError = page.locator('og7-feed-stream [role="alert"]').first();
    const errorToast = page.locator('[data-og7="notification-toast"][data-og7-id="error"]').last();
    const toastTray = page.locator('[data-og7="notification-toast-tray"]');

    await expectNonEmptyText(streamStatus.locator('.feed-stream__status-label'));
    await expect(feedError).toBeVisible();
    await expectNonEmptyText(feedError);
    await expect(errorToast).toHaveAttribute('role', 'alert');
    await expectNonEmptyText(errorToast.locator('.notification-toast-tray__message'));
    await expect(toastTray).toHaveAttribute('aria-live', 'polite');
  });

  test('announces login notices politely and API failures assertively', async ({ page }) => {
    await page.route('**/api/auth/local', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            status: 401,
            name: 'UnauthorizedError',
            message: 'auth.errors.invalidCredentials',
          },
        }),
      });
    });

    await page.goto('/login?reason=session-expired&redirect=%2Fprofile');

    const notice = page.locator('[data-og7="auth-login-notice"]');
    const loginForm = page.locator('[data-og7="auth-login"]');
    const apiError = page.locator('[data-og7="auth-login-api-error"]');

    await expect(loginForm).toBeVisible();
    await expect(notice).toHaveAttribute('role', 'status');
    await expect(notice).toHaveAttribute('aria-live', 'polite');
    await expectNonEmptyText(notice);

    await page.locator('#auth-login-email').fill('e2e.user@openg7.test');
    await page.locator('#auth-login-password').fill('WrongPass123!');
    await loginForm.locator('[data-og7="auth-login-submit"]').click();

    await expect(apiError).toHaveAttribute('role', 'alert');
    await expect(apiError).toHaveAttribute('aria-live', 'assertive');
    await expectNonEmptyText(apiError);
  });

  test('announces profile save failure and recovery through toast semantics', async ({ page }) => {
    let failProfileUpdate = true;

    await mockProfileAndFavoritesApis(page);
    await page.route('**/api/users/me/profile', async route => {
      const request = route.request();
      if (request.method().toUpperCase() !== 'PUT') {
        await route.fallback();
        return;
      }

      if (failProfileUpdate) {
        await route.abort('internetdisconnected');
        return;
      }

      await route.fallback();
    });

    await loginAsAuthenticatedE2eUser(page, '/profile');

    const profileForm = page.locator('[data-og7="user-profile-form"]');
    const saveButton = profileForm.locator('button[type="submit"]');
    const jobTitleInput = page.locator('#profile-job-title');
    const phoneInput = page.locator('#profile-phone');
    const toastTray = page.locator('[data-og7="notification-toast-tray"]');

    await expect(profileForm).toBeVisible();
    await jobTitleInput.fill('Screenreader-ready trade lead');
    await phoneInput.fill('+1 438 555 0199');
    await saveButton.click();

    const errorToast = page.locator('[data-og7="notification-toast"][data-og7-id="error"]').last();
    await expect(toastTray).toHaveAttribute('aria-live', 'polite');
    await expect(errorToast).toHaveAttribute('role', 'alert');
    await expectNonEmptyText(errorToast.locator('.notification-toast-tray__message'));
    await expect(page.locator('[data-og7="user-profile-unsaved-changes"]')).toBeVisible();

    failProfileUpdate = false;
    await saveButton.click();

    const successToast = page.locator('[data-og7="notification-toast"][data-og7-id="success"]').last();
    await expect(successToast).toHaveAttribute('role', 'status');
    await expectNonEmptyText(successToast.locator('.notification-toast-tray__message'));
    await expect(page.locator('[data-og7="user-profile-unsaved-changes"]')).toHaveCount(0);
  });
});