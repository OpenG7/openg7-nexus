import './setup';
import { expect, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser, seedAuthenticatedSession } from './helpers/auth-session';
import { DEFAULT_PROFILE, mockCompanyApis, mockProfileAndFavoritesApis } from './helpers/domain-mocks';

test.describe('Use-case audit gap coverage', () => {
  test('submits the full company registration stepper', async ({ page }) => {
    await mockProfileAndFavoritesApis(page);
    await mockCompanyApis(page);

    await loginAsAuthenticatedE2eUser(page, '/companies/register');
    await expect(page.locator('[data-og7="company-register"]')).toBeVisible();

    await page.locator('#company-name').fill('Prairie Hydrogen Works');
    await page.locator('#company-description').fill('Hydrogen production and storage programs.');
    await page.locator('#company-website').fill('https://prairie-hydrogen.example.test');
    await page.locator('#company-sector').selectOption('1');
    await page.locator('#company-country').selectOption('CA');
    await page.locator('#company-province').selectOption('10');

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('[data-og7="company-register-step-capacities"]')).toBeVisible();

    await page.locator('#capacity-label-0').fill('Annual output');
    await page.locator('#capacity-value-0').fill('5000');
    await page.locator('#capacity-unit-0').fill('tonnes');

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('[data-og7="company-register-step-logos"]')).toBeVisible();

    await page.locator('#company-logo').fill('https://cdn.example.test/logo.png');
    await page.locator('#company-logo-secondary').fill('https://cdn.example.test/logo-alt.png');

    const [createRequest, createResponse] = await Promise.all([
      page.waitForRequest((request) => request.method().toUpperCase() === 'POST' && request.url().includes('/api/companies')),
      page.waitForResponse((response) => response.request().method().toUpperCase() === 'POST' && response.url().includes('/api/companies')),
      page.getByRole('button', { name: 'Submit company' }).click(),
    ]);

    const requestPayload = createRequest.postDataJSON() as {
      data?: {
        name?: string;
        description?: string;
        website?: string;
        sector?: number;
        province?: number;
        country?: string;
        capacities?: Array<{ label?: string; value?: number; unit?: string }>;
        logoUrl?: string;
        secondaryLogoUrl?: string;
      };
    };

    expect(createResponse.status()).toBe(201);
    expect(requestPayload.data).toMatchObject({
      name: 'Prairie Hydrogen Works',
      description: 'Hydrogen production and storage programs.',
      website: 'https://prairie-hydrogen.example.test',
      sector: 1,
      province: 10,
      country: 'CA',
      logoUrl: 'https://cdn.example.test/logo.png',
      secondaryLogoUrl: 'https://cdn.example.test/logo-alt.png',
    });
    expect(requestPayload.data?.capacities).toEqual([
      {
        label: 'Annual output',
        value: 5000,
        unit: 'tonnes',
      },
    ]);

    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.locator('[data-og7="user-profile"]')).toBeVisible();
  });

  test('restores the authenticated session after a hard reload on a protected route', async ({ page }) => {
    await mockProfileAndFavoritesApis(page);

    await page.goto('/');
    await seedAuthenticatedSession(page);
    await page.goto('/profile');
    await expect(page.locator('[data-og7="user-profile"]')).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.locator('[data-og7="user-profile"]')).toBeVisible();

    await page.goto('/favorites');
    await expect(page).toHaveURL(/\/favorites$/);
    await expect(page.locator('[data-og7="favorites"]')).toBeVisible();
  });

  test('persists profile updates and covers password and email-change flows', async ({ page }) => {
    await mockProfileAndFavoritesApis(page);

    await loginAsAuthenticatedE2eUser(page, '/profile');
    await expect(page.locator('[data-og7="user-profile-form"]')).toBeVisible();

    const profileForm = page.locator('[data-og7="user-profile-form"]');
    const profileSaveButton = profileForm.locator('button[type="submit"]');

    await page.locator('#profile-job-title').fill('Director of Trade Ops');
    await page.locator('#profile-phone').fill('+1 514 555 0199');
    await expect(profileSaveButton).toBeEnabled();

    const [updateRequest, updateResponse] = await Promise.all([
      page.waitForRequest((request) => request.method().toUpperCase() === 'PUT' && request.url().includes('/api/users/me/profile')),
      page.waitForResponse((response) => response.request().method().toUpperCase() === 'PUT' && response.url().includes('/api/users/me/profile')),
      profileSaveButton.click(),
    ]);

    const updatePayload = updateRequest.postDataJSON() as {
      jobTitle?: string | null;
      phone?: string | null;
    };

    expect(updateResponse.status()).toBe(200);
    expect(updatePayload).toMatchObject({
      jobTitle: 'Director of Trade Ops',
      phone: '+1 514 555 0199',
    });

    await expect(page.locator('[data-og7="user-profile-unsaved-changes"]')).toHaveCount(0);
    await page.reload();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.locator('#profile-job-title')).toHaveValue('Director of Trade Ops');
    await expect(page.locator('#profile-phone')).toHaveValue('+1 514 555 0199');

    const passwordForm = page.locator('[data-og7="user-profile-change-password"]');
    const encryptedTokenBefore = await page.evaluate(() => window.localStorage.getItem('auth_token'));

    await passwordForm.locator('#profile-password-current').fill('StrongPass123!');
    await passwordForm.locator('#profile-password-new').fill('StrongerPass456!');
    await passwordForm.locator('#profile-password-confirmation').fill('StrongerPass456!');

    const passwordResponse = page.waitForResponse(
      (response) =>
        response.request().method().toUpperCase() === 'POST' &&
        response.url().includes('/api/auth/change-password')
    );
    await passwordForm.locator('button[type="submit"]').click();
    expect((await passwordResponse).status()).toBe(200);
    await expect(passwordForm.locator('#profile-password-current')).toHaveValue('');
    await expect(passwordForm.locator('#profile-password-new')).toHaveValue('');
    await expect(passwordForm.locator('#profile-password-confirmation')).toHaveValue('');
    await expect(passwordForm.locator('button[type="submit"]')).toBeDisabled();
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('auth_token')))
      .not.toBe(encryptedTokenBefore);

    const emailChangeForm = page.locator('[data-og7="user-profile-change-email"]');
    await emailChangeForm.locator('#profile-email-change-new').fill('updated.user@openg7.test');
    await emailChangeForm.locator('#profile-email-change-password').fill('StrongPass123!');

    const emailChangeResponse = page.waitForResponse(
      (response) =>
        response.request().method().toUpperCase() === 'POST' &&
        response.url().includes('/api/users/me/profile/email-change')
    );
    await emailChangeForm.locator('button[type="submit"]').click();
    expect((await emailChangeResponse).status()).toBe(200);
    await expect(emailChangeForm.locator('#profile-email-change-new')).toHaveValue('');
    await expect(emailChangeForm.locator('#profile-email-change-password')).toHaveValue('');
    await expect(emailChangeForm.locator('button[type="submit"]')).toBeDisabled();
  });

  test('persists admin trust changes through save', async ({ page }) => {
    await mockProfileAndFavoritesApis(page, {
      ...DEFAULT_PROFILE,
      roles: ['admin'],
    });
    await mockCompanyApis(page);

    await loginAsAuthenticatedE2eUser(page, '/admin/trust');
    await expect(page.locator('[data-og7="admin-trust"]')).toBeVisible();

    await page.locator('aside button').first().click();

    const newSourceForm = page.locator('[data-og7="admin-trust-new-source"]');
    await newSourceForm.locator('[formcontrolname="name"]').fill('National Chamber of Commerce');
    await newSourceForm.locator('[formcontrolname="type"]').selectOption('chamber');
    await newSourceForm.locator('[formcontrolname="status"]').selectOption('validated');
    await newSourceForm.locator('[formcontrolname="referenceId"]').fill('NCC-2026');
    await newSourceForm.getByRole('button', { name: 'Add source' }).click();
    await expect(page.getByText('National Chamber of Commerce')).toBeVisible();

    const newHistoryForm = page.locator('[data-og7="admin-trust-new-history"]');
    await newHistoryForm.locator('[formcontrolname="label"]').fill('Cross-province trust review');
    await newHistoryForm.locator('[formcontrolname="type"]').selectOption('evaluation');
    await newHistoryForm.locator('[formcontrolname="direction"]').selectOption('outbound');
    await newHistoryForm.locator('[formcontrolname="occurredAt"]').fill('2026-03-15');
    await newHistoryForm.locator('[formcontrolname="score"]').fill('94');
    await newHistoryForm.getByRole('button', { name: 'Add entry' }).click();
    await expect
      .poll(() => page.locator('input').evaluateAll((inputs) => inputs.map((input) => input.value)))
      .toContain('Cross-province trust review');

    const [saveRequest, saveResponse] = await Promise.all([
      page.waitForRequest((request) => request.method().toUpperCase() === 'PUT' && request.url().includes('/api/companies/1001')),
      page.waitForResponse((response) => response.request().method().toUpperCase() === 'PUT' && response.url().includes('/api/companies/1001')),
      page.locator('[data-og7-id="admin-trust-save"]').click(),
    ]);

    const savePayload = saveRequest.postDataJSON() as {
      data?: {
        verificationSources?: Array<{ name?: string; referenceId?: string; type?: string; status?: string }>;
        trustHistory?: Array<{ label?: string; type?: string; direction?: string; occurredAt?: string; score?: number }>;
      };
    };

    expect(saveResponse.status()).toBe(200);
    expect(savePayload.data?.verificationSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'National Chamber of Commerce',
          referenceId: 'NCC-2026',
          type: 'chamber',
          status: 'validated',
        }),
      ])
    );
    expect(savePayload.data?.trustHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Cross-province trust review',
          type: 'evaluation',
          direction: 'outbound',
          occurredAt: '2026-03-15',
          score: 94,
        }),
      ])
    );

    await page.reload();
    await page.locator('aside button').first().click();
    await expect(page.getByText('National Chamber of Commerce')).toBeVisible();
    await expect
      .poll(() => page.locator('input').evaluateAll((inputs) => inputs.map((input) => input.value)))
      .toContain('Cross-province trust review');
  });
});
