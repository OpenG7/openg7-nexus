import './setup';
import { expect, test, type Page } from '@playwright/test';

import { seedAuthenticatedSession } from './helpers/auth-session';

const opportunityItem = {
  id: 'opportunity-300mw',
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:02:00.000Z',
  type: 'REQUEST',
  sectorId: 'energy',
  title: 'Short-term import of 300 MW',
  summary: 'Need short-term import of 300 MW to secure peak load.',
  fromProvinceId: 'QC',
  toProvinceId: 'ON',
  mode: 'IMPORT',
  quantity: {
    value: 300,
    unit: 'MW',
  },
  urgency: 3,
  credibility: 2,
  tags: ['energy', 'import', 'winter'],
  source: {
    kind: 'PARTNER',
    label: 'Grid Ops',
  },
} as const;

const alertItem = {
  id: 'alert-ice-storm',
  createdAt: '2026-01-22T14:00:00.000Z',
  updatedAt: '2026-01-22T14:02:00.000Z',
  type: 'ALERT',
  sectorId: 'energy',
  title: 'Ice storm risk on Ontario transmission lines',
  summary: 'Icing risk expected across Ontario transmission corridors.',
  fromProvinceId: null,
  toProvinceId: 'ON',
  mode: 'BOTH',
  urgency: 3,
  credibility: 2,
  tags: ['weather', 'grid', 'ice'],
  source: {
    kind: 'GOV',
    label: 'Environment Canada',
  },
} as const;

const indicatorItem = {
  id: 'indicator-spot-ontario',
  createdAt: '2026-01-21T09:00:00.000Z',
  updatedAt: '2026-01-21T09:03:00.000Z',
  type: 'INDICATOR',
  sectorId: 'energy',
  title: 'Spot electricity price up 12 percent',
  summary: 'Ontario spot electricity prices rose in the last 72 hours.',
  fromProvinceId: null,
  toProvinceId: 'ON',
  mode: 'BOTH',
  urgency: 2,
  credibility: 2,
  tags: ['price', 'spot', 'ontario'],
  source: {
    kind: 'GOV',
    label: 'IESO',
  },
} as const;

async function mockFeedEndpoints(page: Page): Promise<void> {
  await page.route('**/api/feed/stream**', async route => {
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
      },
      body: '',
    });
  });

  await page.route('**/api/feed**', async route => {
    if (route.request().method().toUpperCase() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [alertItem, indicatorItem, opportunityItem],
        cursor: null,
      }),
    });
  });
}

async function mockAuthEndpoints(page: Page): Promise<void> {
  const profile = {
    id: 'e2e-user-1',
    email: 'e2e.user@openg7.test',
    roles: ['editor'],
    firstName: 'E2E',
    lastName: 'User',
    notificationPreferences: {
      emailOptIn: false,
      webhookUrl: null,
    },
  };

  await page.route('**/api/sectors**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/api/provinces**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/api/companies**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/api/auth/local', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jwt: 'header.payload.signature',
        user: profile,
      }),
    });
  });

  await page.route('**/api/users/me**', async route => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    const path = url.pathname.toLowerCase();

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }

    if (method === 'GET') {
      if (path.endsWith('/saved-searches') || path.includes('/saved-searches/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
        return;
      }

      if (path.endsWith('/favorites') || path.includes('/favorites/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
        return;
      }

      if (path.endsWith('/alerts') || path.includes('/alerts/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
        return;
      }

      if (path.endsWith('/sessions') || path.includes('/sessions/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            current: null,
            others: [],
            revoked: [],
          }),
        });
        return;
      }
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(profile),
    });
  });
}

async function loginAndOpenFeed(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('[data-og7="hero"][data-og7-id="section"]')).toBeVisible();

  const homeCtaLink = page.locator('og7-home-cta-row a[href="/feed"]').first();
  await expect(homeCtaLink).toBeVisible();
  await expect(homeCtaLink).toHaveAttribute('href', '/feed');
  await Promise.all([
    page.waitForURL(/\/feed($|\?)/),
    homeCtaLink.click(),
  ]);
  await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
  await expect(page.locator('.feed-stream__list li').first()).toBeVisible();
}

async function runCompleteFlow(page: Page): Promise<void> {
  await mockAuthEndpoints(page);
  await mockFeedEndpoints(page);
  await loginAndOpenFeed(page);

  const feedRows = page.locator('.feed-stream__list li');
  await feedRows
    .filter({ hasText: opportunityItem.title })
    .locator('[data-og7-id="feed-open-item"]')
    .click();
  await expect(page).toHaveURL(/\/feed\/opportunities\/.+/);
  await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
  await expect(
    page.locator('[data-og7="opportunity-detail-header"] .opportunity-header__breadcrumb[aria-label="Breadcrumb"]')
  ).toBeVisible();
  await expect(page.locator('[data-og7-id="opportunity-make-offer"]')).toHaveAccessibleName(
    /Proposer|Offer/i
  );
  const opportunityDetailPath = new URL(page.url()).pathname;
  await page.locator('[data-og7-id="opportunity-make-offer"]').click();
  await expect(page).toHaveURL(new RegExp(`/login\\?redirect=${encodeURIComponent(opportunityDetailPath)}`));
  await seedAuthenticatedSession(page);
  await page.goto(opportunityDetailPath);
  await expect(page).toHaveURL(/\/feed\/opportunities\/.+/);
  await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
  await page.locator('[data-og7-id="opportunity-make-offer"]').click();
  await expect(page.locator('[data-og7="opportunity-offer-drawer"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-og7="opportunity-offer-drawer"]')).toBeHidden();

  await page
    .locator('[data-og7="opportunity-detail-header"] .opportunity-header__breadcrumb a')
    .first()
    .click();
  await expect(page).toHaveURL(/\/feed($|\?)/);
  await expect(feedRows.first()).toBeVisible();

  await feedRows
    .filter({ hasText: alertItem.title })
    .locator('[data-og7-id="feed-open-item"]')
    .click();
  await expect(page).toHaveURL(/\/feed\/alerts\/.+/);
  await expect(page.locator('[data-og7="alert-detail-page"]')).toBeVisible();
  await expect(
    page.locator('[data-og7="alert-detail-header"] .alert-detail-header__breadcrumb[aria-label="Breadcrumb"]')
  ).toBeVisible();
  await expect(page.locator('[data-og7-id="alert-subscribe"]')).toHaveAccessibleName(
    /S'abonner|Subscribe|Subscribed/i
  );
  await page.locator('[data-og7-id="alert-subscribe"]').click();
  await page.locator('[data-og7="alert-related-opportunities"] ul li button').first().click();
  await expect(page).toHaveURL(/\/feed\/opportunities\/.+/);

  await page
    .locator('[data-og7="opportunity-detail-header"] .opportunity-header__breadcrumb a')
    .first()
    .click();
  await expect(page).toHaveURL(/\/feed($|\?)/);
  await expect(feedRows.first()).toBeVisible();

  await feedRows
    .filter({ hasText: indicatorItem.title })
    .locator('[data-og7-id="feed-open-item"]')
    .click();
  await expect(page).toHaveURL(/\/feed\/indicators\/.+/);
  await expect(page.locator('[data-og7="indicator-detail-page"]')).toBeVisible();
  await expect(
    page.locator('[data-og7="indicator-detail-header"] .indicator-hero__breadcrumb[aria-label="Breadcrumb"]')
  ).toBeVisible();

  const timeframeChips = page.locator('[data-og7="indicator-timeframe"] button');
  await expect(timeframeChips.first()).toHaveAttribute('aria-pressed', /true|false/);
  await timeframeChips.first().click();

  await page.locator('[data-og7-id="indicator-create-alert"]').click();
  await expect(page.locator('[data-og7="indicator-alert-drawer"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-og7="indicator-alert-drawer"]')).toBeHidden();
}

test.describe('App complete regression (desktop)', () => {
  test('navigates full feed journey with baseline accessibility checks', async ({ page }) => {
    await runCompleteFlow(page);
  });
});

test.describe('App complete regression (mobile)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('navigates full feed journey on mobile viewport', async ({ page }) => {
    await runCompleteFlow(page);
  });
});
