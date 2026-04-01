import './setup';
import { expect, test, type Page } from '@playwright/test';

import { loginAsAuthenticatedE2eUser } from './helpers/auth-session';
import {
  DEFAULT_PROFILE,
  mockAdminOpsApis,
  mockBillingApis,
  mockCompanyApis,
  mockConnectionsApis,
  mockImportApis,
  mockImportationApis,
  mockProfileAndFavoritesApis,
  mockSessionApis,
} from './helpers/domain-mocks';

async function mockStatisticsApi(page: Page): Promise<void> {
  await page.route('**/api/statistics**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          summaries: [
            {
              id: 1,
              slug: 'summary-1',
              scope: 'interprovincial',
              intrant: 'energy',
              value: 101,
              change: 2,
              unitKey: 'pages.statistics.units.billionCAD',
              titleKey: 'pages.statistics.summaries.energyFlow.title',
              descriptionKey: 'pages.statistics.summaries.energyFlow.description',
              period: '2024-Q1',
              province: 'CA-ON',
              country: null,
            },
          ],
          insights: [],
          snapshot: {
            totalFlows: 1,
            totalFlowsUnitKey: 'pages.statistics.units.billionCAD',
            activeCorridors: 1,
            updatedAt: '2026-03-14T08:00:00.000Z',
          },
          availablePeriods: ['2024-Q1'],
          availableProvinces: ['CA-ON'],
          availableCountries: [],
        },
        meta: {
          filters: {
            scope: 'interprovincial',
            intrant: 'all',
            period: null,
            province: null,
            country: null,
          },
        },
      }),
    });
  });
}

test.describe('Use-case audit', () => {
  test('covers public discovery, marketing and analytics surfaces', async ({ page }) => {
    await mockSessionApis(page);
    await mockBillingApis(page);
    await mockStatisticsApi(page);

    await page.goto('/features');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.goto('/sectors');
    await expect(page.locator('[data-og7="strategic-sectors-page"]')).toBeVisible();
    await page.locator('[data-og7="search-box"] input').first().fill('battery');
    await expect(page.locator('[data-og7="strategic-sectors-cards"]')).toBeVisible();

    await page.goto('/pricing');
    await expect(page.locator('[data-og7="subscription-plans"]')).toBeVisible();
    await expect(page.locator('[data-og7="pricing-sticky-cta"]')).toBeVisible();

    await page.goto('/statistics');
    await expect(page.locator('[data-og7="statistics-scope-toggle"]')).toBeVisible();
    await expect(page.locator('[data-og7="statistics-filter-bar"]')).toBeVisible();
    await expect
      .poll(async () =>
        page.locator('[data-og7="statistics-summary-card"], [data-og7="statistics-empty"]').count()
      )
      .toBeGreaterThan(0);
  });

  test('covers company onboarding surface, manual import and bulk import workflows', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(globalThis, 'EventSource', {
        value: undefined,
        configurable: true,
      });
    });

    await mockProfileAndFavoritesApis(page);
    await mockCompanyApis(page);
    await mockImportApis(page);

    await loginAsAuthenticatedE2eUser(page, '/companies/register');
    await expect(page.locator('[data-og7="company-register"]')).toBeVisible();
    await expect(page.locator('#company-sector option')).toHaveCount(4);
    await expect(page.locator('#company-province option')).toHaveCount(4);

    await page.locator('#company-name').fill('Prairie Hydrogen Works');
    await page.locator('#company-description').fill('Hydrogen production and storage programs.');
    await page.locator('#company-website').fill('https://prairie-hydrogen.example.test');
    await page.locator('#company-sector').selectOption('1');
    await page.locator('#company-country').selectOption('CA');
    await page.locator('#company-province').selectOption('10');
    await expect(page.locator('#company-name')).toHaveValue('Prairie Hydrogen Works');
    await expect(page.locator('#company-sector')).toHaveValue('1');
    await expect(page.locator('#company-country')).toHaveValue('CA');
    await expect(page.locator('#company-province')).toHaveValue('10');

    await loginAsAuthenticatedE2eUser(page, '/import/companies');
    const importTextarea = page.locator('textarea[formcontrolname="manualJson"]');
    await importTextarea.fill(
      JSON.stringify([
        {
          businessId: 'ON-7788',
          name: 'Great Lakes Components',
          location: { lat: 43.6532, lng: -79.3832, province: 'ON', country: 'CA' },
          sectors: ['energy'],
          contacts: {
            website: 'https://great-lakes.example.test',
            email: 'ops@great-lakes.example.test',
            phone: '+1 416 555 0188',
            contactName: 'Morgan Lee',
          },
        },
      ])
    );
    await importTextarea.locator('xpath=ancestor::form[1]').locator('button[type="submit"]').click();
    await expect(page.locator('table tbody tr').first()).toContainText('Great Lakes Components');
    const manualImportResponse = page.waitForResponse((response) =>
      response.request().method().toUpperCase() === 'POST' &&
      response.url().includes('/api/import/companies')
    );
    await page.getByRole('button', { name: /Import/i }).last().click();
    expect((await manualImportResponse).status()).toBe(200);
    await expect(page.locator('table tbody tr')).toHaveCount(1);

    await loginAsAuthenticatedE2eUser(page, '/import/companies/bulk-import');
    await expect(page.locator('[data-og7="companies-bulk-import-page"]')).toBeVisible();
    await page.locator('textarea[formcontrolname="companiesJson"]').fill(
      JSON.stringify([
        {
          businessId: 'QC-2001',
          name: 'Nord Shore Export',
          sectors: ['energy'],
          location: { lat: 46.8139, lng: -71.208, province: 'QC', country: 'CA' },
          contacts: { website: 'https://nord-shore.example.test' },
        },
        {
          businessId: 'ON-2002',
          name: 'Ontario Storage Grid',
          sectors: ['energy'],
          location: { lat: 43.6532, lng: -79.3832, province: 'ON', country: 'CA' },
          contacts: { website: 'https://ontario-storage.example.test' },
        },
      ])
    );
    await page.locator('[data-og7-id="bulk-import-start"]').click();
    await expect(page.locator('[data-og7="bulk-import-progress"]')).toBeVisible();
    await expect(page.locator('[data-og7="bulk-import-report"]')).toBeVisible();
  });

  test('covers importation dashboards, watchlists and report scheduling', async ({ page }) => {
    await mockProfileAndFavoritesApis(page);
    await mockImportationApis(page);

    await loginAsAuthenticatedE2eUser(page, '/importation');
    await expect(page.locator('[data-og7="importation"]')).toBeVisible();
    await expect(page.locator('[data-og7="importation-overview"]')).toBeVisible();
    await expect(page.locator('[data-og7="importation-flow"]')).toBeVisible();
    await expect(page.locator('[data-og7="importation-commodities"]')).toBeVisible();
    await expect(page.locator('[data-og7="importation-suppliers"]')).toBeVisible();
    await expect(page.locator('[data-og7="importation-collaboration"]')).toBeVisible();
    await expect(page.locator('[data-og7="importation-knowledge"]')).toBeVisible();

    await page.locator('[data-og7="importation-collaboration"] input[name="watchlistName"]').fill('Critical minerals');
    await page.locator('[data-og7="importation-collaboration"] button[type="submit"]').first().click();
    await expect(page.locator('[data-og7="importation-collaboration"]')).toContainText('Critical minerals');

    await page.locator('[data-og7="importation-collaboration"] input[name="recipients"]').fill('ops@openg7.test');
    const scheduleResponse = page.waitForResponse((response) =>
      response.url().includes('/api/import-reports/schedule')
    );
    await page.locator('[data-og7="importation-collaboration"] button[type="submit"]').last().click();
    expect((await scheduleResponse).status()).toBe(204);
  });

  test('covers profile management and favorites workflows', async ({ page }) => {
    await mockProfileAndFavoritesApis(page);

    await loginAsAuthenticatedE2eUser(page, '/profile');
    await expect(page.locator('[data-og7="user-profile"]')).toBeVisible();
    await expect(page.locator('[data-og7="user-profile-form"]')).toBeVisible();
    await expect(page.locator('#profile-email')).toHaveValue('e2e.user@openg7.test');

    const exportResponse = page.waitForResponse((response) =>
      response.url().includes('/api/users/me/profile/export')
    );
    await page.locator('[data-og7-id="export-account-data"]').click();
    expect((await exportResponse).status()).toBe(200);

    await page.locator('[data-og7-id="refresh-sessions"]').click();
    await expect(page.locator('[data-og7-id="session-item"]')).toHaveCount(2);
    await page.locator('[data-og7-id="logout-other-sessions"]').click();
    await expect(page.locator('[data-og7-id="session-item"]')).toHaveCount(2);

    await loginAsAuthenticatedE2eUser(page, '/favorites');
    await expect(page.locator('[data-og7="favorites"]')).toBeVisible();
    await page.locator('[data-og7-id="favorites-remove"]').first().click();
    await page.locator('[data-og7-id="favorites-clear"]').click();
    await expect(page.locator('[data-og7-id="favorites-empty"]')).toBeVisible();
  });

  test('covers linkup, partner and admin surfaces', async ({ page }) => {
    const adminProfile = {
      ...DEFAULT_PROFILE,
      roles: ['admin'],
    };

    await mockProfileAndFavoritesApis(page, adminProfile);
    await mockCompanyApis(page);
    await mockConnectionsApis(page);
    await mockAdminOpsApis(page);

    await loginAsAuthenticatedE2eUser(page, '/linkups');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.locator('.og7-linkup-history__action').first().click();
    await expect(page).toHaveURL(/\/linkups\/lkp-001$/);
    await expect(page.locator('.og7-linkup-detail')).toBeVisible();

    await page.goto('/linkup/101');
    await expect(page.locator('og7-intro-stepper')).toBeVisible();

    await page.goto('/partners/301');
    await expect(page.locator('og7-partner-details-panel')).toBeVisible();

    await page.goto('/entreprise/301');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await loginAsAuthenticatedE2eUser(page, '/admin');
    await expect(page.locator('[data-og7="admin-companies"]')).toBeVisible();
    const moderationUpdate = page.waitForResponse((response) =>
      response.request().method().toUpperCase() === 'PUT' &&
      response.url().includes('/api/companies/')
    );
    await page.locator('select').first().selectOption('approved');
    await moderationUpdate;

    await loginAsAuthenticatedE2eUser(page, '/admin/trust');
    await expect(page.locator('[data-og7="admin-trust"]')).toBeVisible();
    await page.locator('aside button').first().click();
    await page.locator('input[formcontrolname="name"]').fill('National Chamber of Commerce');
    await page.getByRole('button', { name: /Add source/i }).click();
    await expect(page.getByText('National Chamber of Commerce')).toBeVisible();

    await loginAsAuthenticatedE2eUser(page, '/admin/ops');
    await expect(page.locator('[data-og7="admin-ops"]')).toBeVisible();
    await expect(page.locator('[data-og7="admin-ops"]')).toContainText('backup-2026-03-14.tar.gz');
  });
});
