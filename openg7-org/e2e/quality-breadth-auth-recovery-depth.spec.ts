import './setup';
import { expect, type Locator, type Page, test } from '@playwright/test';

function json(body: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

async function activateWithKeyboard(page: Page, target: Locator, key: 'Enter' | 'Space' = 'Enter'): Promise<void> {
  await target.focus();
  await expect(target).toBeFocused();
  await page.keyboard.press(key);
}

async function mockPublicShellApis(page: Page): Promise<void> {
  await page.route('**/api/sectors**', async route => {
    await route.fulfill(json({ data: [] }));
  });

  await page.route('**/api/provinces**', async route => {
    await route.fulfill(json({ data: [] }));
  });

  await page.route('**/api/companies**', async route => {
    await route.fulfill(json({ data: [] }));
  });
}

test.describe('Quality breadth auth recovery depth', () => {
  test('keeps forgot-password recovery keyboard-usable through validation, API failure, and success', async ({
    page,
  }) => {
    let shouldFail = true;

    await mockPublicShellApis(page);
    await page.route('**/api/auth/forgot-password', async route => {
      const request = route.request();
      if (request.method().toUpperCase() === 'OPTIONS') {
        await route.fulfill({ status: 204 });
        return;
      }

      if (shouldFail) {
        await route.fulfill(
          json(
            {
              error: {
                status: 500,
                name: 'ApplicationError',
                message: 'Recovery email service temporarily unavailable.',
              },
            },
            500
          )
        );
        return;
      }

      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/forgot-password');
    await expect(page.locator('[data-og7="auth-forgot-password"]')).toBeVisible();

    const form = page.locator('[data-og7="auth-forgot-password"]');
    const emailInput = page.locator('#auth-forgot-password-email');
    const submitButton = page.locator('[data-og7="auth-forgot-password-submit"]');
    const fieldError = page.locator('[data-og7="auth-forgot-password-email-error"]');

    await activateWithKeyboard(page, submitButton);
    await expect(fieldError).toBeVisible();
    await expect(fieldError).toHaveAttribute('role', 'alert');
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(emailInput).toHaveAttribute('aria-describedby', 'auth-forgot-password-email-error');
    await expect(emailInput).toBeFocused();

    await emailInput.fill('invalid-email');
    await page.keyboard.press('Enter');
    await expect(fieldError).toBeVisible();
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');

    const firstAttempt = page.waitForResponse(
      response =>
        response.request().method().toUpperCase() === 'POST' &&
        response.url().includes('/api/auth/forgot-password') &&
        response.status() === 500
    );
    await emailInput.fill('user@openg7.test');
    await page.keyboard.press('Enter');
    await firstAttempt;

    const apiError = page.locator('[data-og7="auth-forgot-password-api-error"]');
    await expect(apiError).toBeVisible();
    await expect(apiError).toHaveAttribute('role', 'alert');
    await expect(apiError).toHaveAttribute('aria-live', 'assertive');
    await expect(page.locator('[data-og7="notification-toast"][data-og7-id="error"]').last()).toBeVisible();
    await expect(form).toHaveAttribute('aria-busy', 'false');

    shouldFail = false;

    const secondAttempt = page.waitForResponse(
      response =>
        response.request().method().toUpperCase() === 'POST' &&
        response.url().includes('/api/auth/forgot-password') &&
        response.status() === 204
    );
    await page.keyboard.press('Enter');
    await secondAttempt;

    const success = page.locator('[data-og7="auth-forgot-password-success"]');
    await expect(success).toBeVisible();
    await expect(success).toHaveAttribute('role', 'status');
    await expect(success).toHaveAttribute('aria-live', 'polite');
    await expect(emailInput).toHaveValue('');
    await expect(emailInput).toBeFocused();
    await expect(page.locator('[data-og7="notification-toast"][data-og7-id="success"]').last()).toBeVisible();
  });

  test('keeps reset-password recovery coherent through mismatch correction, API failure, and success redirect', async ({
    page,
  }) => {
    let shouldFail = true;

    await mockPublicShellApis(page);
    await page.route('**/api/auth/reset-password', async route => {
      const request = route.request();
      if (request.method().toUpperCase() === 'OPTIONS') {
        await route.fulfill({ status: 204 });
        return;
      }

      if (shouldFail) {
        await route.fulfill(
          json(
            {
              error: {
                status: 400,
                name: 'ValidationError',
                message: 'Reset token rejected by the auth service.',
              },
            },
            400
          )
        );
        return;
      }

      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/reset-password?token=e2e-reset-token');
    await expect(page.locator('[data-og7="auth-reset-password"]')).toBeVisible();

    const tokenInput = page.locator('#auth-reset-password-token');
    const passwordInput = page.locator('#auth-reset-password-password');
    const confirmInput = page.locator('#auth-reset-password-confirm-password');
    const submitButton = page.locator('[data-og7="auth-reset-password-submit"]');
    const confirmError = page.locator('[data-og7="auth-reset-password-confirm-password-error"]');

    await expect(tokenInput).toHaveValue('e2e-reset-token');
    await passwordInput.fill('StrongPass123!');
    await confirmInput.fill('WrongPass123!');
    await activateWithKeyboard(page, submitButton);

    await expect(confirmError).toBeVisible();
    await expect(confirmError).toHaveAttribute('role', 'alert');
    await expect(confirmInput).toHaveAttribute('aria-invalid', 'true');
    await expect(confirmInput).toHaveAttribute('aria-describedby', 'auth-reset-password-confirm-password-error');

    const firstAttempt = page.waitForResponse(
      response =>
        response.request().method().toUpperCase() === 'POST' &&
        response.url().includes('/api/auth/reset-password') &&
        response.status() === 400
    );
    await confirmInput.fill('StrongPass123!');
    await page.keyboard.press('Enter');
    await firstAttempt;

    const apiError = page.locator('[data-og7="auth-reset-password-api-error"]');
    await expect(apiError).toBeVisible();
    await expect(apiError).toHaveAttribute('role', 'alert');
    await expect(apiError).toHaveAttribute('aria-live', 'assertive');
    await expect(page.locator('[data-og7="notification-toast"][data-og7-id="error"]').last()).toBeVisible();
    await expect(page.locator('[data-og7="auth-reset-password-strength"]')).toContainText(/Strong|Fort/i);

    shouldFail = false;

    const secondAttempt = page.waitForResponse(
      response =>
        response.request().method().toUpperCase() === 'POST' &&
        response.url().includes('/api/auth/reset-password') &&
        response.status() === 204
    );
    await page.keyboard.press('Enter');
    await secondAttempt;

    const success = page.locator('[data-og7="auth-reset-password-success"]');
    await expect(success).toBeVisible();
    await expect(success).toHaveAttribute('role', 'status');
    await expect(success).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('[data-og7="notification-toast"][data-og7-id="success"]').last()).toBeVisible();
    await expect(page).toHaveURL(/\/login$/, { timeout: 5000 });
  });
});
