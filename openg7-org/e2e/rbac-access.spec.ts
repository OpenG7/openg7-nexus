import './setup';
import { expect, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser } from './helpers/auth-session';
import {
  DEFAULT_PROFILE,
  mockAdminOpsApis,
  mockCompanyApis,
  mockProfileAndFavoritesApis,
  mockSessionApis,
} from './helpers/domain-mocks';

test.describe('RBAC access matrix', () => {
  test('redirects anonymous visitors to login for protected routes', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin$/);
    await expect(page.locator('[data-og7="auth-login"]')).toBeVisible();

    await page.goto('/pro');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fpro$/);
    await expect(page.locator('[data-og7="auth-login"]')).toBeVisible();
  });

  test('redirects non-admin editors to access denied for admin routes', async ({ page }) => {
    await mockSessionApis(page, DEFAULT_PROFILE);

    await loginAsAuthenticatedE2eUser(page, '/admin');

    await expect(page).toHaveURL(/\/access-denied$/);
    await expect(page.locator('[data-og7="access-denied"]')).toBeVisible();
  });

  test('allows editors with write permission to access /pro', async ({ page }) => {
    await mockSessionApis(page, DEFAULT_PROFILE);

    await loginAsAuthenticatedE2eUser(page, '/pro');

    await expect(page).toHaveURL(/\/pro$/);
    await expect(page.locator('[data-og7="user-profile"]')).toBeVisible();
    await expect(
      page.locator('[data-og7="user-profile-status"] [data-og7-id="account-status-active"]')
    ).toBeVisible();
    await expect(page.locator('[data-og7="user-profile-resend-activation"]')).toHaveCount(0);
  });

  test('allows admins to access admin surfaces', async ({ page }) => {
    const adminProfile = {
      ...DEFAULT_PROFILE,
      roles: ['admin'],
    };

    await mockProfileAndFavoritesApis(page, adminProfile);
    await mockCompanyApis(page);
    await mockAdminOpsApis(page);

    await loginAsAuthenticatedE2eUser(page, '/admin');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('[data-og7="admin-companies"]')).toBeVisible();

    await page.goto('/admin/trust');
    await expect(page).toHaveURL(/\/admin\/trust$/);
    await expect(page.locator('[data-og7="admin-trust"]')).toBeVisible();

    await page.goto('/admin/ops');
    await expect(page).toHaveURL(/\/admin\/ops$/);
    await expect(page.locator('[data-og7="admin-ops"]')).toBeVisible();
  });

  test('surfaces pending activation accounts with a resend flow', async ({ page }) => {
    await mockSessionApis(page, {
      ...DEFAULT_PROFILE,
      accountStatus: 'emailNotConfirmed',
    });

    await loginAsAuthenticatedE2eUser(page, '/profile');

    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.locator('[data-og7="user-profile"]')).toBeVisible();
    await expect(
      page.locator(
        '[data-og7="user-profile-status"] [data-og7-id="account-status-email-not-confirmed"]'
      )
    ).toBeVisible();
    await expect(page.locator('[data-og7="user-profile-resend-activation"]')).toBeVisible();
  });

  test('surfaces disabled accounts without activation recovery action', async ({ page }) => {
    await mockSessionApis(page, {
      ...DEFAULT_PROFILE,
      accountStatus: 'disabled',
    });

    await loginAsAuthenticatedE2eUser(page, '/profile');

    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.locator('[data-og7="user-profile"]')).toBeVisible();
    await expect(
      page.locator('[data-og7="user-profile-status"] [data-og7-id="account-status-disabled"]')
    ).toBeVisible();
    await expect(page.locator('[data-og7="user-profile-resend-activation"]')).toHaveCount(0);
  });
});
