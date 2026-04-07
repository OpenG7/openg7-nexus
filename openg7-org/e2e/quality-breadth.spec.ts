import './setup';
import { expect, Locator, Page, Route, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser, mockAuthenticatedSessionApis } from './helpers/auth-session';
import { mockProfileAndFavoritesApis } from './helpers/domain-mocks';

type StatisticsScope = 'interprovincial' | 'international' | 'all';
type StatisticsIntrant = 'all' | 'energy' | 'agriculture' | 'manufacturing' | 'services';

interface StatisticsSummaryRecord {
  id: number;
  scope: StatisticsScope;
  intrant: StatisticsIntrant;
  period: string | null;
  province: string | null;
  country: string | null;
}

const statisticsSummaryRecords: StatisticsSummaryRecord[] = [
  {
    id: 1,
    scope: 'interprovincial',
    intrant: 'energy',
    period: '2024-Q1',
    province: 'CA-ON',
    country: null,
  },
  {
    id: 2,
    scope: 'interprovincial',
    intrant: 'agriculture',
    period: '2024-Q2',
    province: 'CA-QC',
    country: null,
  },
  {
    id: 3,
    scope: 'international',
    intrant: 'energy',
    period: '2024-Q3',
    province: null,
    country: 'US',
  },
  {
    id: 4,
    scope: 'international',
    intrant: 'services',
    period: '2024-Q4',
    province: null,
    country: 'FR',
  },
];

async function enableMockFeed(page: Page): Promise<void> {
  await page.route('**/runtime-config.js', async (route: Route) => {
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

async function disableFeedMocks(page: Page): Promise<void> {
  await page.route('**/runtime-config.js', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.__OG7_CONFIG__ = {
        FEATURE_FLAGS: {
          feedMocks: false,
          homeFeedMocks: false
        }
      };`,
    });
  });
}

async function mockStatisticsApi(page: Page): Promise<void> {
  const unique = (values: readonly (string | null)[]) =>
    Array.from(new Set(values.filter((value): value is string => Boolean(value))));

  await page.route('**/api/statistics**', async (route: Route) => {
    const url = new URL(route.request().url());
    const scopeRaw = url.searchParams.get('scope');
    const scope: StatisticsScope =
      scopeRaw && ['interprovincial', 'international', 'all'].includes(scopeRaw.toLowerCase())
        ? (scopeRaw.toLowerCase() as StatisticsScope)
        : 'interprovincial';
    const intrantRaw = url.searchParams.get('intrant');
    const intrant: StatisticsIntrant =
      intrantRaw && ['all', 'energy', 'agriculture', 'manufacturing', 'services'].includes(intrantRaw.toLowerCase())
        ? (intrantRaw.toLowerCase() as StatisticsIntrant)
        : 'all';
    const period = url.searchParams.get('period');
    const province = url.searchParams.get('province');
    const country = url.searchParams.get('country');

    const filtered = statisticsSummaryRecords.filter((summary) => {
      const scopeMatch = scope === 'all' || summary.scope === scope;
      const intrantMatch = intrant === 'all' || summary.intrant === intrant;
      const periodMatch = !period || summary.period === period;
      const provinceMatch = !province || summary.province === province;
      const countryMatch = !country || summary.country === country;
      return scopeMatch && intrantMatch && periodMatch && provinceMatch && countryMatch;
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          summaries: filtered.map((summary) => ({
            id: summary.id,
            slug: `summary-${summary.id}`,
            scope: summary.scope,
            intrant: summary.intrant,
            value: 100 + summary.id,
            change: 2,
            unitKey: 'pages.statistics.units.billionCAD',
            titleKey: 'pages.statistics.summaries.energyFlow.title',
            descriptionKey: 'pages.statistics.summaries.energyFlow.description',
            period: summary.period,
            province: summary.province,
            country: summary.country,
          })),
          insights: [],
          snapshot: {
            totalFlows: filtered.length,
            totalFlowsUnitKey: 'pages.statistics.units.billionCAD',
            activeCorridors: filtered.length,
            updatedAt: new Date().toISOString(),
          },
          availablePeriods: unique(filtered.map((summary) => summary.period)),
          availableProvinces: unique(filtered.map((summary) => summary.province)),
          availableCountries: unique(filtered.map((summary) => summary.country)),
        },
        meta: {
          filters: {
            scope,
            intrant,
            period,
            province,
            country,
          },
        },
      }),
    });
  });
}

async function installControllableFeedEventSource(
  page: Page,
  initiallyConnected: boolean
): Promise<void> {
  await page.addInitScript(
    ({ connected }: { connected: boolean }) => {
      const runtimeWindow = window as Window & {
        __og7FeedStreamConnected?: boolean;
        __og7SetFeedStreamConnected?: (next: boolean) => void;
        EventSource?: typeof EventSource;
      };
      const instances = new Set<ControlledEventSource>();

      const notifyInstance = (instance: ControlledEventSource): void => {
        if (runtimeWindow.__og7FeedStreamConnected) {
          instance.onopen?.(new Event('open'));
          return;
        }

        instance.onerror?.(new Event('error'));
      };

      runtimeWindow.__og7FeedStreamConnected = connected;
      runtimeWindow.__og7SetFeedStreamConnected = (next: boolean) => {
        runtimeWindow.__og7FeedStreamConnected = next;
        for (const instance of instances) {
          notifyInstance(instance);
        }
      };

      class ControlledEventSource {
        onopen: ((event: Event) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        onmessage: ((event: MessageEvent<string>) => void) | null = null;

        constructor(_url: string) {
          instances.add(this);
          setTimeout(() => {
            notifyInstance(this);
          }, 0);
        }

        close(): void {
          instances.delete(this);
        }
      }

      runtimeWindow.EventSource = ControlledEventSource as unknown as typeof EventSource;
    },
    { connected: initiallyConnected }
  );
}

async function expectAssociatedLabel(control: Locator): Promise<void> {
  await expect(control).toBeVisible();
  const hasLabel = await control.evaluate((element) => {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) {
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

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const metrics = await page.evaluate(() => ({
    rootScrollWidth: document.documentElement.scrollWidth,
    rootClientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
  }));

  expect(metrics.rootScrollWidth).toBeLessThanOrEqual(metrics.rootClientWidth + 1);
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.bodyClientWidth + 1);
}

test.describe('Quality breadth', () => {
  test('recovers the saved-searches surface after a transient network failure and hard reload', async ({ page }) => {
    let failSavedSearches = true;

    await mockProfileAndFavoritesApis(page);
    await page.route('**/api/users/me/saved-searches**', async (route) => {
      if (failSavedSearches) {
        await route.abort('failed');
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await loginAsAuthenticatedE2eUser(page, '/saved-searches');

    await expect(page).toHaveURL(/\/saved-searches$/);
    await expect(page.locator('[data-og7="saved-searches"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="saved-search-error"]')).toBeVisible();

    failSavedSearches = false;
    await page.reload();

    await expect(page).toHaveURL(/\/saved-searches$/);
    await expect(page.locator('[data-og7-id="saved-search-error"]')).toHaveCount(0);
    await expect(page.locator('[data-og7-id="saved-search-empty"]')).toBeVisible();
  });

  test('preserves pending profile edits through an offline-like save failure and succeeds on retry', async ({
    page,
  }) => {
    let failProfileUpdate = true;

    await mockProfileAndFavoritesApis(page);
    await page.route('**/api/users/me/profile', async (route) => {
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
    await expect(page.locator('[data-og7="user-profile-form"]')).toBeVisible();

    const profileForm = page.locator('[data-og7="user-profile-form"]');
    const saveButton = profileForm.locator('button[type="submit"]');
    const jobTitleInput = page.locator('#profile-job-title');
    const phoneInput = page.locator('#profile-phone');

    await jobTitleInput.fill('Offline-ready trade lead');
    await phoneInput.fill('+1 438 555 0177');
    await expect(saveButton).toBeEnabled();

    await saveButton.click();

    await expect(
      page.locator('[data-og7="notification-toast"][data-og7-id="error"]').last()
    ).toBeVisible();
    await expect(page.locator('[data-og7="user-profile-unsaved-changes"]')).toBeVisible();
    await expect(jobTitleInput).toHaveValue('Offline-ready trade lead');
    await expect(phoneInput).toHaveValue('+1 438 555 0177');

    failProfileUpdate = false;
    await saveButton.click();

    await expect(
      page.locator('[data-og7="notification-toast"][data-og7-id="success"]').last()
    ).toBeVisible();
    await expect(page.locator('[data-og7="user-profile-unsaved-changes"]')).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(jobTitleInput).toHaveValue('Offline-ready trade lead');
    await expect(phoneInput).toHaveValue('+1 438 555 0177');
  });

  test('allows resilient opportunity offer resubmission after a transient publish failure', async ({ page }) => {
    let publishAttempt = 0;

    await installControllableFeedEventSource(page, true);
    await disableFeedMocks(page);
    await mockAuthenticatedSessionApis(page);
    await page.route('**/api/feed**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (url.pathname === '/api/feed/request-001' && request.method().toUpperCase() === 'GET') {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not found' }),
        });
        return;
      }

      if (url.pathname !== '/api/feed') {
        await route.fallback();
        return;
      }

      if (request.method().toUpperCase() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], cursor: null }),
        });
        return;
      }

      if (request.method().toUpperCase() === 'POST') {
        publishAttempt += 1;
        if (publishAttempt === 1) {
          await route.abort('internetdisconnected');
          return;
        }

        const payload = request.postDataJSON() as {
          type: string;
          sectorId: string | null;
          title: string;
          summary: string;
          fromProvinceId: string | null;
          toProvinceId: string | null;
          mode: string;
          tags?: string[];
        };

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: `feed-offer-${publishAttempt}`,
              createdAt: '2026-03-17T10:00:00.000Z',
              updatedAt: '2026-03-17T10:00:00.000Z',
              type: payload.type,
              sectorId: payload.sectorId,
              title: payload.title,
              summary: payload.summary,
              fromProvinceId: payload.fromProvinceId,
              toProvinceId: payload.toProvinceId,
              mode: payload.mode,
              tags: payload.tags ?? [],
              source: {
                kind: 'USER',
                label: 'E2E User',
              },
              status: 'confirmed',
            },
          }),
        });
        return;
      }

      await route.fallback();
    });

    await loginAsAuthenticatedE2eUser(page, '/feed/opportunities/request-001');

    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
    await page.locator('[data-og7-id="opportunity-make-offer"]').click();

    const drawer = page.locator('[data-og7="opportunity-offer-drawer"]');
    await expect(drawer).toBeVisible();

    const capacityInput = drawer.locator('[data-og7-id="capacity"]');
    const startDateInput = drawer.locator('[data-og7-id="start-date"]');
    const endDateInput = drawer.locator('[data-og7-id="end-date"]');
    const pricingModelInput = drawer.locator('[data-og7-id="pricing-model"]');
    const commentInput = drawer.locator('[data-og7-id="comment"]');

    await capacityInput.fill('315');
    await startDateInput.fill('2026-03-20');
    await endDateInput.fill('2026-03-31');
    await pricingModelInput.selectOption('fixed');
    await commentInput.fill('Offline recovery should preserve this offer draft until the feed reconnects.');

    await drawer.locator('[data-og7-id="opportunity-offer-submit"]').click();

    await expect(drawer.locator('[data-og7="opportunity-offer-status"][data-og7-id="error"]')).toBeVisible();
    await expect(page).toHaveURL(/\/feed\/opportunities\/request-001/);
    await expect(drawer).toBeVisible();

    await capacityInput.fill('315');
    await startDateInput.fill('2026-03-20');
    await endDateInput.fill('2026-03-31');
    await pricingModelInput.selectOption('fixed');
    await commentInput.fill('Offline recovery should preserve this offer draft until the feed reconnects.');
    await drawer.locator('[data-og7-id="opportunity-offer-submit"]').click();

    await expect(drawer).toBeHidden();
    await expect(page.locator('[data-og7="notification-toast"][data-og7-id="success"]').last()).toBeVisible();
    await expect(page.locator('[data-og7="opportunity-qna"]')).toContainText('315 MW');
    await expect(page.locator('[data-og7="opportunity-qna"]')).toContainText('fixed');
  });

  test('surfaces a clear loading state on delayed opportunity detail hydration before rendering the content', async ({
    page,
  }) => {
    let releaseDetailResponse!: () => void;
    const detailResponseReady = new Promise<void>((resolve) => {
      releaseDetailResponse = resolve;
    });

    await installControllableFeedEventSource(page, true);
    await disableFeedMocks(page);
    await mockAuthenticatedSessionApis(page);
    await page.route('**/api/feed**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (url.pathname === '/api/feed/request-001' && request.method().toUpperCase() === 'GET') {
        await detailResponseReady;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'request-001',
              createdAt: '2026-02-03T09:05:00Z',
              updatedAt: '2026-02-03T09:25:00Z',
              type: 'REQUEST',
              sectorId: 'energy',
              title: 'Short-term import of 300 MW',
              summary: 'ON grid seeks 300 MW import for two-week demand spike.',
              fromProvinceId: 'qc',
              toProvinceId: 'on',
              mode: 'IMPORT',
              quantity: {
                value: 300,
                unit: 'MW',
              },
              urgency: 3,
              credibility: 3,
              tags: ['grid', 'peak'],
              source: {
                kind: 'GOV',
                label: 'IESO Ontario',
              },
              status: 'confirmed',
            },
          }),
        });
        return;
      }

      if (url.pathname !== '/api/feed') {
        await route.fallback();
        return;
      }

      if (request.method().toUpperCase() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], cursor: null }),
        });
        return;
      }

      await route.fallback();
    });

    await loginAsAuthenticatedE2eUser(page, '/feed/opportunities/request-001');

    await expect(page.locator('[data-og7="opportunity-detail-loading"]')).toBeVisible();
    await expect(page.locator('[data-og7="opportunity-detail-missing"]')).toHaveCount(0);

    releaseDetailResponse();

    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Short-term import of 300 MW' })).toBeVisible();
    await expect(page.locator('[data-og7="opportunity-detail-loading"]')).toHaveCount(0);
    await expect(page.locator('[data-og7="opportunity-context-aside"]')).toContainText('300 MW');
    await expect(page.locator('[data-og7="opportunity-detail-missing"]')).toHaveCount(0);
  });

  test('exposes baseline accessibility semantics on the profile notification controls', async ({ page }) => {
    await mockProfileAndFavoritesApis(page);
    await loginAsAuthenticatedE2eUser(page, '/profile');

    await expect(page.locator('[data-og7="user-profile"]')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

    await expectAssociatedLabel(page.locator('#profile-email-notifications'));
    await expectAssociatedLabel(page.locator('#profile-webhook-notifications'));
    await expectAssociatedLabel(page.locator('#profile-alert-frequency'));

    await page.locator('#profile-quiet-hours-enabled').check();

    await expectAssociatedLabel(page.locator('#profile-quiet-hours-enabled'));
    await expectAssociatedLabel(page.locator('#profile-quiet-hours-start'));
    await expectAssociatedLabel(page.locator('#profile-quiet-hours-end'));
    await expectAssociatedLabel(page.locator('#profile-quiet-hours-timezone'));
  });

  test('announces login validation and API failures with accessible error semantics', async ({ page }) => {
    await page.route('**/api/auth/local', async (route: Route) => {
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

    await page.goto('/login');

    const loginForm = page.locator('[data-og7="auth-login"]');
    const emailInput = page.locator('#auth-login-email');
    const passwordInput = page.locator('#auth-login-password');
    const emailError = page.locator('[data-og7="auth-login-email-error"]');
    const passwordError = page.locator('[data-og7="auth-login-password-error"]');
    const apiError = page.locator('[data-og7="auth-login-api-error"]');

    await expect(loginForm).toBeVisible();
    await emailInput.focus();
    await page.keyboard.press('Tab');
    await passwordInput.focus();
    await page.keyboard.press('Tab');

    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
    await expect(emailInput).toHaveAttribute('aria-describedby', /auth-login-email-error/);
    await expect(passwordInput).toHaveAttribute('aria-describedby', /auth-login-password-error/);
    await expect(emailError).toBeVisible();
    await expect(emailError).toHaveAttribute('role', 'alert');
    await expect(passwordError).toBeVisible();
    await expect(passwordError).toHaveAttribute('role', 'alert');

    await emailInput.fill('e2e.user@openg7.test');
    await passwordInput.fill('WrongPass123!');
    await loginForm.locator('[data-og7="auth-login-submit"]').click();

    await expect(apiError).toBeVisible();
    await expect(apiError).toHaveAttribute('role', 'alert');
    await expect(apiError).toHaveAttribute('aria-live', 'assertive');
  });

  test('keeps the statistics workspace keyboard-usable with labeled filters and named complementary regions', async ({
    page,
  }) => {
    await mockStatisticsApi(page);
    await page.goto('/statistics');

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expectAssociatedLabel(page.locator('[data-og7="statistics-period-filter"] select'));
    await expectAssociatedLabel(page.locator('[data-og7="statistics-country-filter"] select'));
    await expectAssociatedLabel(page.locator('[data-og7="statistics-province-filter"] select'));
    await expect(page.locator('aside[role="complementary"][aria-labelledby]')).toHaveCount(2);

    await Promise.all([
      page.waitForResponse((response) => {
        const url = response.url();
        return url.includes('/api/statistics') && url.includes('scope=international') && !url.includes('intrant=');
      }),
      (async () => {
        const internationalButton = page.locator('[data-og7="statistics-scope-toggle"] button').nth(1);
        await internationalButton.focus();
        await page.keyboard.press('Enter');
      })(),
    ]);

    await expect(page.locator('[data-og7="statistics-summary-card"]')).toHaveCount(2);
    await expect(page.locator('[data-og7="statistics-scope-toggle"] button').nth(1)).toHaveClass(
      /statistics-scope-toggle__button--active/
    );
    await expect(page.locator('.statistics-context-card[role="complementary"]')).toHaveCount(2);
  });
});

test.describe('Quality breadth mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('keeps critical mobile account navigation keyboard-usable with correct menu state', async ({ page }) => {
    await mockProfileAndFavoritesApis(page);
    await loginAsAuthenticatedE2eUser(page, '/');

    const toggle = page.locator('[data-og7-id="mobile-menu-toggle"]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAttribute('aria-label', /.+/);

    await toggle.focus();
    await page.keyboard.press('Enter');

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-og7="mobile-menu"]')).toBeVisible();

    await page.locator('[data-og7="mobile-menu"] [data-og7-id="saved-searches"]').click();
    await expect(page).toHaveURL(/\/saved-searches$/);
    await expect(page.locator('[data-og7="saved-searches"]')).toBeVisible();

    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-og7="mobile-menu"]')).toBeVisible();

    await page.locator('[data-og7="mobile-menu"] [data-og7-id="favorites"]').click();
    await expect(page).toHaveURL(/\/favorites$/);
    await expect(page.locator('[data-og7="favorites"]')).toBeVisible();
  });
});

test.describe('Quality breadth tablet', () => {
  test.use({ viewport: { width: 1024, height: 900 } });

  test('keeps opportunity detail stacked and horizontally stable on tablet widths', async ({ page }) => {
    await enableMockFeed(page);
    await mockAuthenticatedSessionApis(page);
    await loginAsAuthenticatedE2eUser(page, '/feed/opportunities/request-001');

    const detailPage = page.locator('[data-og7="opportunity-detail-page"]');
    const body = page.locator('og7-opportunity-detail-body');
    const aside = page.locator('og7-opportunity-context-aside');
    const makeOffer = page.locator('[data-og7-id="opportunity-make-offer"]');

    await expect(detailPage).toBeVisible();
    await expect(body).toBeVisible();
    await expect(aside).toBeVisible();
    await expect(makeOffer).toBeVisible();

    const bodyBox = await body.boundingBox();
    const asideBox = await aside.boundingBox();

    expect(bodyBox).not.toBeNull();
    expect(asideBox).not.toBeNull();
    expect((asideBox?.y ?? 0)).toBeGreaterThan((bodyBox?.y ?? 0) + 40);

    await expectNoHorizontalOverflow(page);
  });

  test('keeps the dense statistics workspace stable on narrow tablet widths without horizontal overflow', async ({
    page,
  }) => {
    await mockStatisticsApi(page);
    await page.setViewportSize({ width: 820, height: 900 });
    await page.goto('/statistics');

    const main = page.locator('.statistics-workspace__main');
    const contextRail = page.locator('.statistics-context-rail');
    const filterBar = page.locator('[data-og7="statistics-filter-bar"]');
    const resetButton = page.locator('[data-og7="statistics-action"][data-og7-id="reset-filters"]');
    const summaryCards = page.locator('[data-og7="statistics-summary-card"]');
    const emptyState = page.locator('[data-og7="statistics-empty"]');

    await expect(filterBar).toBeVisible();
    await expect(resetButton).toBeVisible();
    await expect
      .poll(async () => (await summaryCards.count()) + (await emptyState.count()))
      .toBeGreaterThan(0);
    if ((await summaryCards.count()) > 0) {
      await expect(summaryCards.first()).toBeVisible();
    } else {
      await expect(emptyState).toBeVisible();
    }
    await expect(contextRail).toBeVisible();

    const mainBox = await main.boundingBox();
    const railBox = await contextRail.boundingBox();

    expect(mainBox).not.toBeNull();
    expect(railBox).not.toBeNull();
    expect((railBox?.y ?? 0)).toBeGreaterThan((mainBox?.y ?? 0) + 40);

    await expectNoHorizontalOverflow(page);
  });
});