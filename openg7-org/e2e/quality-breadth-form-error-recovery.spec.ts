import './setup';
import { expect, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser, mockAuthenticatedSessionApis } from './helpers/auth-session';
import { mockProfileAndFavoritesApis } from './helpers/domain-mocks';

test.describe('Quality breadth form error recovery', () => {
  test('clears login field errors and lands in a clean authenticated state once credentials are corrected', async ({
    page,
  }) => {
    await mockAuthenticatedSessionApis(page);
    await page.goto('/login');

    const loginForm = page.locator('[data-og7="auth-login"]');
    const emailInput = page.locator('#auth-login-email');
    const passwordInput = page.locator('#auth-login-password');
    const emailError = page.locator('[data-og7="auth-login-email-error"]');
    const passwordError = page.locator('[data-og7="auth-login-password-error"]');
    const apiError = page.locator('[data-og7="auth-login-api-error"]');

    await loginForm.locator('[data-og7="auth-login-submit"]').click();

    await expect(emailError).toBeVisible();
    await expect(passwordError).toBeVisible();
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(passwordInput).toHaveAttribute('aria-invalid', 'true');

    await emailInput.fill('e2e.user@openg7.test');
    await passwordInput.fill('StrongPass123!');

    await expect(emailError).toHaveCount(0);
    await expect(passwordError).toHaveCount(0);
    await expect(emailInput).not.toHaveAttribute('aria-invalid', 'true');
    await expect(passwordInput).not.toHaveAttribute('aria-invalid', 'true');
    await expect(apiError).toBeEmpty();

    await loginForm.locator('[data-og7="auth-login-submit"]').click();

    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.locator('[data-og7="user-profile"]')).toBeVisible();
    await expect(page.locator('[data-og7="notification-toast"][data-og7-id="error"]')).toHaveCount(0);
    await expect(page.locator('[data-og7="notification-toast"][data-og7-id="success"]').last()).toBeVisible();
  });

  test('clears a profile field error before saving and finishes with one coherent success state', async ({
    page,
  }) => {
    await mockProfileAndFavoritesApis(page);
    await loginAsAuthenticatedE2eUser(page, '/profile');

    const profileForm = page.locator('[data-og7="user-profile-form"]');
    const saveButton = profileForm.locator('button[type="submit"]');
    const webhookChannel = page.locator('#profile-webhook-notifications');
    const webhookUrlInput = page.locator('#profile-notification-webhook');
    const webhookError = page.locator('[data-og7="user-profile-notification-webhook-error"]');

    await webhookChannel.check();
    await expect(webhookUrlInput).toBeEnabled();

    await webhookUrlInput.fill('http://hooks.openg7.test/not-secure');
    await webhookUrlInput.blur();

    await expect(webhookError).toBeVisible();
    await expect(saveButton).toBeDisabled();
    await expect(page.locator('[data-og7="user-profile-unsaved-changes"]')).toBeVisible();

    await webhookUrlInput.fill('https://hooks.openg7.test/recovered');

    await expect(webhookError).toHaveCount(0);
    await expect(saveButton).toBeEnabled();

    await saveButton.click();

    await expect(page.locator('[data-og7="notification-toast"][data-og7-id="error"]')).toHaveCount(0);
    await expect(page.locator('[data-og7="notification-toast"][data-og7-id="success"]').last()).toBeVisible();
    await expect(page.locator('[data-og7="user-profile-unsaved-changes"]')).toHaveCount(0);
    await expect(webhookError).toHaveCount(0);
  });

  test('clears opportunity-offer validation once the draft is corrected and submits into a single success outcome', async ({
    page,
  }) => {
    await mockAuthenticatedSessionApis(page);
    await loginAsAuthenticatedE2eUser(page, '/feed/opportunities/request-001');

    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
    await page.locator('[data-og7-id="opportunity-make-offer"]').click();

    const drawer = page.locator('[data-og7="opportunity-offer-drawer"]');
    const capacityInput = drawer.locator('[data-og7="opportunity-offer-field"][data-og7-id="capacity"]');
    const startDateInput = drawer.locator('[data-og7="opportunity-offer-field"][data-og7-id="start-date"]');
    const endDateInput = drawer.locator('[data-og7="opportunity-offer-field"][data-og7-id="end-date"]');
    const pricingModelInput = drawer.locator('[data-og7="opportunity-offer-field"][data-og7-id="pricing-model"]');
    const commentInput = drawer.locator('[data-og7="opportunity-offer-field"][data-og7-id="comment"]');
    const validationSummary = drawer.locator('[data-og7="opportunity-offer-validation"][data-og7-id="summary"]');

    await expect(drawer).toBeVisible();
    await capacityInput.fill('');
    await startDateInput.fill('');
    await endDateInput.fill('');
    await drawer.locator('[data-og7-id="opportunity-offer-submit"]').click();

    await expect(validationSummary).toBeVisible();
    await expect(startDateInput).toHaveAttribute('aria-invalid', 'true');
    await expect(endDateInput).toHaveAttribute('aria-invalid', 'true');
    await expect(commentInput).toHaveAttribute('aria-invalid', 'true');

    await capacityInput.fill('315');
    await startDateInput.fill('2026-03-20');
    await endDateInput.fill('2026-03-31');
    await pricingModelInput.selectOption('fixed');
    await commentInput.fill('Recovered draft now meets the minimum comment length and can be submitted.');

    await expect(validationSummary).toHaveCount(0);
    await expect(startDateInput).not.toHaveAttribute('aria-invalid', 'true');
    await expect(endDateInput).not.toHaveAttribute('aria-invalid', 'true');
    await expect(commentInput).not.toHaveAttribute('aria-invalid', 'true');

    await drawer.locator('[data-og7-id="opportunity-offer-submit"]').click();

    await expect(drawer).toBeHidden();
    await expect(page.locator('[data-og7="notification-toast"][data-og7-id="error"]')).toHaveCount(0);
    await expect(page.locator('[data-og7="notification-toast"][data-og7-id="success"]').last()).toBeVisible();
    await expect(page.locator('[data-og7="opportunity-qna"]')).toContainText('315 MW');
    await expect(page.locator('[data-og7="opportunity-qna"]')).toContainText('fixed');
  });
});