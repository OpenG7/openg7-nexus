import './setup';
import { test, expect } from '@playwright/test';

import { loginAsAuthenticatedE2eUser, mockAuthenticatedSessionApis } from './helpers/auth-session';

test('login page renders', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('[data-og7="auth-login"]')).toBeVisible();
});

test('login page links to password recovery', async ({ page }) => {
  await page.goto('/login');
  const forgotLink = page.locator('[data-og7="auth-login-forgot-link"]');
  await expect(forgotLink).toBeVisible();
  await forgotLink.click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.locator('[data-og7="auth-forgot-password"]')).toBeVisible();
});

test('forgot password page renders', async ({ page }) => {
  await page.goto('/forgot-password');
  await expect(page.locator('[data-og7="auth-forgot-password"]')).toBeVisible();
});

test('register page renders', async ({ page }) => {
  await page.goto('/register');
  await expect(page.locator('[data-og7="auth-register"]')).toBeVisible();
});

test('reset password page renders', async ({ page }) => {
  await page.goto('/reset-password');
  await expect(page.locator('[data-og7="auth-reset-password"]')).toBeVisible();
});

test('profile page renders with token', async ({ page }) => {
  await mockAuthenticatedSessionApis(page);
  await loginAsAuthenticatedE2eUser(page, '/profile');
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.locator('[data-og7="user-profile"]')).toBeVisible();
});

test('access denied page renders', async ({ page }) => {
  await page.goto('/access-denied');
  await expect(page.locator('[data-og7="access-denied"]')).toBeVisible();
});
