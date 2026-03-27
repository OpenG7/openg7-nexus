import './setup';
import { expect, test, type Page } from '@playwright/test';

import { loginAsAuthenticatedE2eUser, mockAuthenticatedSessionApis } from './helpers/auth-session';

// Keep this executable journey aligned with docs/cas-d-usage-en-langage-courant.md
// under "Exemple 3 - Parcours humain complet du feed".

type FeedItemType = 'ALERT' | 'INDICATOR' | 'REQUEST';
type FeedMode = 'BOTH' | 'EXPORT' | 'IMPORT';

interface FeedApiItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: FeedItemType;
  sectorId: string | null;
  title: string;
  summary: string;
  fromProvinceId: string | null;
  toProvinceId: string | null;
  mode: FeedMode;
  urgency: number;
  credibility: number;
  tags: string[];
  source: {
    kind: 'GOV' | 'PARTNER' | 'USER';
    label: string;
  };
  status?: 'confirmed';
  originType?: 'alert';
  originId?: string;
}

const opportunityItem: FeedApiItem = {
  id: 'request-001',
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:02:00.000Z',
  type: 'REQUEST',
  sectorId: 'energy',
  title: 'Short-term import of 300 MW',
  summary: 'Need short-term import of 300 MW to secure peak load.',
  fromProvinceId: 'qc',
  toProvinceId: 'on',
  mode: 'IMPORT',
  urgency: 3,
  credibility: 2,
  tags: ['energy', 'import', 'winter'],
  source: {
    kind: 'PARTNER',
    label: 'Grid Ops',
  },
};

const alertItem: FeedApiItem = {
  id: 'alert-001',
  createdAt: '2026-01-22T14:00:00.000Z',
  updatedAt: '2026-01-22T14:02:00.000Z',
  type: 'ALERT',
  sectorId: 'energy',
  title: 'Ice storm risk on Ontario transmission lines',
  summary: 'Icing risk expected across Ontario transmission corridors.',
  fromProvinceId: null,
  toProvinceId: 'on',
  mode: 'BOTH',
  urgency: 3,
  credibility: 2,
  tags: ['weather', 'grid', 'ice'],
  source: {
    kind: 'GOV',
    label: 'Environment Canada',
  },
};

const indicatorItem: FeedApiItem = {
  id: 'indicator-001',
  createdAt: '2026-01-21T09:00:00.000Z',
  updatedAt: '2026-01-21T09:03:00.000Z',
  type: 'INDICATOR',
  sectorId: 'energy',
  title: 'Spot electricity price up 12 percent',
  summary: 'Ontario spot electricity prices rose in the last 72 hours.',
  fromProvinceId: null,
  toProvinceId: 'on',
  mode: 'BOTH',
  urgency: 2,
  credibility: 2,
  tags: ['price', 'spot', 'ontario'],
  source: {
    kind: 'GOV',
    label: 'IESO',
  },
};

async function mockRuntimeConfig(page: Page): Promise<void> {
  await page.route('**/runtime-config.js', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.__OG7_CONFIG__ = {
        FEATURE_FLAGS: {
          feedMocks: false,
          homeFeedMocks: true,
          homeCorridorsRealtimeMocks: true
        }
      };`,
    });
  });
}

async function mockCatalogApis(page: Page): Promise<void> {
  await page.route('**/api/sectors', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{ id: 'energy', name: 'Energy' }],
      }),
    });
  });

  await page.route('**/api/provinces', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { id: 'on', name: 'Ontario' },
          { id: 'qc', name: 'Quebec' },
        ],
      }),
    });
  });

  await page.route('**/api/companies', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
      }),
    });
  });
}

async function mockFeedApis(page: Page): Promise<void> {
  const publishedItems: FeedApiItem[] = [];
  const corsHeaders = {
    'access-control-allow-origin': 'http://localhost:4200',
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'Content-Type, Idempotency-Key, Authorization',
  };

  await page.route('**/api/feed/stream**', async route => {
    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders,
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
      },
      body: '',
    });
  });

  await page.route('**/api/feed**', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname !== '/api/feed') {
      await route.fallback();
      return;
    }

    const method = request.method().toUpperCase();

    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: corsHeaders,
      });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [...publishedItems, alertItem, indicatorItem, opportunityItem],
          cursor: null,
        }),
      });
      return;
    }

    if (method === 'POST') {
      const payload = request.postDataJSON() as {
        type?: FeedItemType;
        sectorId?: string | null;
        title?: string;
        summary?: string;
        fromProvinceId?: string | null;
        toProvinceId?: string | null;
        mode?: FeedMode;
        tags?: string[];
        originType?: 'alert';
        originId?: string;
      };

      const created: FeedApiItem = {
        id: `human-journey-item-${publishedItems.length + 1}`,
        createdAt: '2026-03-17T10:00:00.000Z',
        updatedAt: '2026-03-17T10:00:00.000Z',
        type: payload.type ?? 'REQUEST',
        sectorId: payload.sectorId ?? 'energy',
        title: payload.title ?? `Human journey item ${publishedItems.length + 1}`,
        summary: payload.summary ?? 'Generated by the full human journey test.',
        fromProvinceId: payload.fromProvinceId ?? null,
        toProvinceId: payload.toProvinceId ?? null,
        mode: payload.mode ?? 'IMPORT',
        urgency: 2,
        credibility: 2,
        tags: payload.tags ?? [],
        originType: payload.originType,
        originId: payload.originId,
        source: {
          kind: 'USER',
          label: 'E2E User',
        },
        status: 'confirmed',
      };

      publishedItems.unshift(created);

      await route.fulfill({
        status: 201,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: created,
        }),
      });
      return;
    }

    await route.fallback();
  });
}

async function openFeedFromHome(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('[data-og7="hero"][data-og7-id="section"]')).toBeVisible();

  const homeCtaLink = page.locator('og7-home-cta-row a[href="/feed"]').first();
  await expect(homeCtaLink).toBeVisible();
  await expect(homeCtaLink).toHaveAttribute('href', '/feed');

  await Promise.all([
    page.waitForURL(/\/feed($|\?)/),
    homeCtaLink.click(),
  ]);

  await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
}

async function openAlertsFromProfileMenu(page: Page): Promise<void> {
  await page.locator('[data-og7="profile"] > button').click();
  await page.locator('[data-og7-id="alerts"]').first().click();
  await expect(page).toHaveURL(/\/alerts/);
}

test.describe('Full human journey', () => {
  test('simulates a complete user journey across discovery, action, and follow-up', async ({ page }) => {
    await mockRuntimeConfig(page);
    await mockAuthenticatedSessionApis(page);
    await mockCatalogApis(page);
    await mockFeedApis(page);

    await openFeedFromHome(page);

    const feedRows = page.locator('.feed-stream__list li');
    await expect(feedRows.first()).toBeVisible();

    await feedRows
      .filter({ hasText: opportunityItem.title })
      .locator('[data-og7-id="feed-open-item"]')
      .click();
    await expect(page).toHaveURL(/\/feed\/opportunities\/request-001$/);
    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();

    await page.locator('[data-og7-id="opportunity-make-offer"]').click();
    await expect(page).toHaveURL(/\/login\?redirect=%2Ffeed%2Fopportunities%2Frequest-001$/);

    await loginAsAuthenticatedE2eUser(page, '/feed/opportunities/request-001');
    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();

    await page.locator('[data-og7-id="opportunity-make-offer"]').click();
    await expect(page.locator('[data-og7="opportunity-offer-drawer"]')).toBeVisible();

    await page.locator('[data-og7-id="capacity"]').fill('280');
    await page.locator('[data-og7-id="start-date"]').fill('2026-03-16');
    await page.locator('[data-og7-id="end-date"]').fill('2026-03-30');
    await page.locator('[data-og7-id="pricing-model"]').selectOption('indexed');
    await page.locator('[data-og7-id="comment"]').fill(
      'Indexed import block for the late-winter balancing window.'
    );
    await page.locator('[data-og7-id="attachment"]').setInputFiles({
      name: 'term-sheet.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('offer-term-sheet'),
    });

    await page.locator('[data-og7-id="opportunity-offer-submit"]').click();
    await expect(page.locator('[data-og7="opportunity-offer-drawer"]')).toBeHidden();

    const qna = page.locator('[data-og7="opportunity-qna"]');
    await expect(qna).toContainText(/OG7-OFR-/);
    await expect(qna).toContainText('280 MW');
    await expect(qna).toContainText('indexed');
    await expect(qna).toContainText('term-sheet.pdf');

    await expect(page.locator('[data-og7-id="opportunity-make-offer"]')).toHaveAttribute(
      'data-og7-state',
      'existing'
    );
    await page.locator('[data-og7-id="opportunity-make-offer"]').click();
    await expect(page).toHaveURL(/\/alerts\?section=offers&offerId=/);

    const offerItem = page.locator('[data-og7="opportunity-offer-item"]').first();
    await expect(offerItem).toBeVisible();
    await expect(offerItem).toHaveAttribute('data-og7-state', 'submitted');
    await expect(offerItem).toContainText('Short-term import of 300 MW');
    await expect(offerItem).toContainText('term-sheet.pdf');
    await offerItem.locator('[data-og7-id="opportunity-offer-toggle-thread"]').click();
    await expect(offerItem.locator('[data-og7="opportunity-offer-thread"]')).toContainText(
      /Tracking active|Suivi active/
    );
    await offerItem.locator('[data-og7-id="opportunity-offer-open"]').click();
    await expect(page).toHaveURL(/\/feed\/opportunities\/request-001$/);

    await openAlertsFromProfileMenu(page);
    const withdrawnOfferItem = page.locator('[data-og7="opportunity-offer-item"]').first();
    await withdrawnOfferItem.locator('[data-og7-id="opportunity-offer-withdraw"]').click();
    await expect(withdrawnOfferItem).toHaveAttribute('data-og7-state', 'withdrawn');
    await withdrawnOfferItem.locator('[data-og7-id="opportunity-offer-toggle-thread"]').click();
    await expect(withdrawnOfferItem.locator('[data-og7="opportunity-offer-thread"]')).toContainText(
      /Offer withdrawn|Offre retiree/
    );

    await page.goto('/feed');
    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();

    await feedRows
      .filter({ hasText: alertItem.title })
      .locator('[data-og7-id="feed-open-item"]')
      .click();
    await expect(page).toHaveURL(/\/feed\/alerts\/alert-001$/);
    await expect(page.locator('[data-og7="alert-detail-page"]')).toBeVisible();

    const subscribeButton = page.locator('[data-og7-id="alert-subscribe"]');
    await subscribeButton.click();
    await expect(subscribeButton).toBeDisabled();

    await page.locator('[data-og7-id="alert-report-update"]').click();
    await expect(page.locator('[data-og7="alert-update-drawer"]')).toBeVisible();
    await page.locator('[data-og7="alert-update-field"][data-og7-id="summary"]').fill(
      'Transmission icing confirmed by the latest operator update.'
    );
    await page.locator('[data-og7="alert-update-field"][data-og7-id="source-url"]').fill(
      'https://example.com/operator-update'
    );
    await page.locator('[data-og7-id="alert-update-submit"]').click();
    await expect(page.locator('[data-og7="alert-update-status"][data-og7-id="success"]')).toBeVisible();
    await expect(page.locator('[data-og7="alert-update-drawer"]')).toBeHidden();

    await page.locator('[data-og7-id="alert-view-my-report"]').click();
    await expect(page.locator('[data-og7="alert-update-report-view"]')).toBeVisible();
    await page.locator('[data-og7-id="alert-update-view-close"]').click();
    await expect(page.locator('[data-og7="alert-update-drawer"]')).toBeHidden();

    await page.locator('[data-og7-id="alert-create-opportunity"]').click();
    await expect(page).toHaveURL(/\/feed\?.*draftSource=alert/);
    await expect(page.locator('[data-og7="feed-publish-drawer"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-composer"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-composer-draft"]')).toBeVisible();

    const linkedOpportunityTitle = 'Linked resilience corridor from storm alert';
    const linkedOpportunitySummary =
      'Temporary import coordination window opened after the Ontario transmission alert.';
    await page.locator('#composer-title').fill(linkedOpportunityTitle);
    await page.locator('#composer-summary').fill(linkedOpportunitySummary);

    const publishResponse = page.waitForResponse(
      response =>
        response.url().includes('/api/feed') &&
        response.request().method().toUpperCase() === 'POST'
    );
    await page.locator('.feed-composer__submit').click();
    await publishResponse;

    await expect(page.locator('[data-og7="feed-publish-drawer"]')).toBeHidden();
    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.locator('.feed-card__title', { hasText: linkedOpportunityTitle })).toBeVisible();

    await feedRows
      .filter({ hasText: indicatorItem.title })
      .locator('[data-og7-id="feed-open-item"]')
      .click();
    await expect(page).toHaveURL(/\/feed\/indicators\/indicator-001$/);
    await expect(page.locator('[data-og7="indicator-detail-page"]')).toBeVisible();
    await page.locator('[data-og7-id="indicator-timeframe-24h"]').click();
    await page.locator('[data-og7-id="indicator-granularity-hour"]').click();

    const indicatorSubscribeButton = page.locator('[data-og7-id="indicator-subscribe"]');
    await indicatorSubscribeButton.click();
    await expect(page.locator('[data-og7="indicator-alert-drawer"]')).toBeVisible();
    await page.locator('[data-og7="indicator-alert-drawer"] input[type="number"]').fill('15');
    await page.locator('[data-og7="indicator-alert-drawer"] textarea').fill(
      'Notify operations if spot prices exceed threshold.'
    );
    await page.locator('[data-og7-id="indicator-alert-submit"]').click();
    await expect(page.locator('[data-og7="indicator-alert-drawer"]')).toBeHidden();
    await expect(indicatorSubscribeButton).toHaveText(/View my alert|Voir mon alerte/i);

    await page.locator('[data-og7="profile"] > button').click();
    await page.locator('[data-og7="profile"] a[href="/profile"]').click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.locator('[data-og7="user-profile"]')).toBeVisible();

    const exportResponse = page.waitForResponse(response =>
      response.url().includes('/api/users/me/profile/export')
    );
    await page.locator('[data-og7-id="export-account-data"]').click();
    expect((await exportResponse).status()).toBe(200);
  });
});
