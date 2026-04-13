import './setup';
import { expect, test, type Page } from '@playwright/test';

import { seedAuthenticatedSession } from './helpers/auth-session';

const PROFILE = {
  id: 'e2e-user-1',
  email: 'e2e.user@openg7.test',
  roles: ['editor'],
  firstName: 'E2E',
  lastName: 'User',
  accountStatus: 'active',
  premiumActive: true,
  premiumPlan: 'analyst',
  notificationPreferences: {
    emailOptIn: false,
    webhookUrl: null,
  },
} as const;

const hydrocarbonSignal = {
  id: 'signal-hydrocarbon-001',
  feedItemId: 'hydrocarbon-opportunity-001',
  title: '48,000 barrels available after Alberta corridor slowdown',
  summary: 'Northern Prairie Energy can release a 10-day crude window after reduced outbound flow.',
  companyName: 'Northern Prairie Energy',
  publicationType: 'slowdown',
  productType: 'crudeOil',
  businessReason: 'transportDisruption',
  volumeBarrels: 48000,
  quantityUnit: 'bbl',
  minimumLotBarrels: 12000,
  availableFrom: '2026-03-25',
  availableUntil: '2026-04-04',
  estimatedDelayDays: 6,
  originProvinceId: 'ab',
  targetProvinceId: 'on',
  originSite: 'Edmonton terminal cluster',
  qualityGrade: 'wcs',
  logisticsMode: ['rail', 'storageTransfer'],
  targetScope: ['sk', 'mb', 'on'],
  storagePressureLevel: 'high',
  priceReference: 'WCS less rail differential',
  responseDeadline: '2026-04-02',
  contactChannel: 'Crude desk',
  notes: 'Volume available following reduced outbound flow on main corridor.',
  tags: ['hydrocarbon', 'corridor'],
  sourceKind: 'COMPANY',
  sourceLabel: 'Northern Prairie Energy',
  status: 'active',
} as const;

const hydrocarbonItem = {
  id: hydrocarbonSignal.feedItemId,
  createdAt: '2026-03-25T10:00:00.000Z',
  updatedAt: '2026-03-25T12:00:00.000Z',
  type: 'OFFER',
  sectorId: 'energy',
  title: hydrocarbonSignal.title,
  summary: 'Northern Prairie Energy can release a 10-day crude window after reduced outbound flow on the main corridor.',
  fromProvinceId: 'ab',
  toProvinceId: 'on',
  mode: 'EXPORT',
  quantity: {
    value: 48000,
    unit: 'bbl',
  },
  urgency: 3,
  credibility: 2,
  tags: ['hydrocarbon', 'corridor', 'storage'],
  source: {
    kind: 'COMPANY',
    label: 'Northern Prairie Energy',
  },
  metadata: {
    publicationForm: {
      formKey: 'hydrocarbon-surplus-offer',
      schemaVersion: 1,
    },
    extensions: {
      companyName: hydrocarbonSignal.companyName,
      publicationType: hydrocarbonSignal.publicationType,
      productType: hydrocarbonSignal.productType,
      volumeBarrels: hydrocarbonSignal.volumeBarrels,
      minimumLotBarrels: hydrocarbonSignal.minimumLotBarrels,
      availableFrom: hydrocarbonSignal.availableFrom,
      availableUntil: hydrocarbonSignal.availableUntil,
      estimatedDelayDays: hydrocarbonSignal.estimatedDelayDays,
      originSite: hydrocarbonSignal.originSite,
      qualityGrade: hydrocarbonSignal.qualityGrade,
      logisticsMode: hydrocarbonSignal.logisticsMode,
      targetScope: hydrocarbonSignal.targetScope,
      storagePressureLevel: hydrocarbonSignal.storagePressureLevel,
      priceReference: hydrocarbonSignal.priceReference,
      contactChannel: hydrocarbonSignal.contactChannel,
      notes: hydrocarbonSignal.notes,
    },
  },
} as const;

async function mockHydrocarbonValueApis(page: Page): Promise<{
  readonly feedRequests: Array<Record<string, string | null>>;
  readonly signalRequests: Array<Record<string, string | null>>;
}> {
  const json = (body: unknown, status = 200) => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
  const feedRequests: Array<Record<string, string | null>> = [];
  const signalRequests: Array<Record<string, string | null>> = [];

  await page.route('**/runtime-config.js', async (route) => {
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

  await page.route(/\/api\/sectors(?:\?.*)?$/i, async (route) => {
    await route.fulfill(
      json({
        data: [
          { id: 'energy', name: 'Energy' },
          { id: 'manufacturing', name: 'Manufacturing' },
        ],
      })
    );
  });

  await page.route(/\/api\/provinces(?:\?.*)?$/i, async (route) => {
    await route.fulfill(
      json({
        data: [
          { id: 'ab', name: 'Alberta' },
          { id: 'sk', name: 'Saskatchewan' },
          { id: 'mb', name: 'Manitoba' },
          { id: 'on', name: 'Ontario' },
        ],
      })
    );
  });

  await page.route(/\/api\/companies(?:\?.*)?$/i, async (route) => {
    await route.fulfill(json({ data: [] }));
  });

  await page.route(/\/api\/auth\/local(?:\?.*)?$/i, async (route) => {
    await route.fulfill(
      json({
        jwt: 'header.eyJleHAiOjQxMDI0NDQ4MDB9.signature',
        user: PROFILE,
      })
    );
  });

  await page.route(/\/api\/users\/me(?:\/.*)?(?:\?.*)?$/i, async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const path = new URL(request.url()).pathname.toLowerCase();

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }

    if (method === 'GET' && path.endsWith('/saved-searches')) {
      await route.fulfill(json([]));
      return;
    }

    if (method === 'GET' && path.endsWith('/favorites')) {
      await route.fulfill(json([]));
      return;
    }

    if (method === 'GET' && path.endsWith('/alerts')) {
      await route.fulfill(json([]));
      return;
    }

    if (method === 'GET' && path.endsWith('/profile/sessions')) {
      await route.fulfill(json({ version: 1, sessions: [] }));
      return;
    }

    if (method === 'GET' && (path === '/api/users/me' || path.endsWith('/profile'))) {
      await route.fulfill(json(PROFILE));
      return;
    }

    if (method === 'POST' && path.endsWith('/profile/sessions/logout-others')) {
      await route.fulfill(
        json({
          jwt: 'header.eyJleHAiOjQxMDI0NDQ4MDB9.signature',
          user: PROFILE,
          sessionsRevoked: 0,
          sessionVersion: 1,
          sessions: [],
        })
      );
      return;
    }

    await route.fulfill(json({ message: 'Unhandled users/me route' }, 404));
  });

  await page.route(/\/api\/feed\/stream(?:\?.*)?$/i, async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
      },
      body: '',
    });
  });

  await page.route(/\/api\/hydrocarbon-signals(?:\?.*)?$/i, async (route) => {
    const url = new URL(route.request().url());
    signalRequests.push({
      originProvinceId: url.searchParams.get('originProvinceId'),
      targetProvinceId: url.searchParams.get('targetProvinceId'),
      limit: url.searchParams.get('limit'),
    });
    await route.fulfill(json({ data: [hydrocarbonSignal], meta: {} }));
  });

  await page.route(/\/api\/feed\/[^/?]+(?:\?.*)?$/i, async (route) => {
    if (route.request().method().toUpperCase() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill(json({ data: hydrocarbonItem }));
  });

  await page.route(/\/api\/feed(?:\?.*)?$/i, async (route) => {
    if (route.request().method().toUpperCase() !== 'GET') {
      await route.fallback();
      return;
    }

    const url = new URL(route.request().url());
    feedRequests.push({
      sector: url.searchParams.get('sector'),
      formKey: url.searchParams.get('formKey'),
      fromProvince: url.searchParams.get('fromProvince'),
      type: url.searchParams.get('type'),
      mode: url.searchParams.get('mode'),
    });

    await route.fulfill(
      json({
        data: [hydrocarbonItem],
        cursor: null,
      })
    );
  });

  return {
    feedRequests,
    signalRequests,
  };
}

test.describe('Hydrocarbon business journey', () => {
  test('proves a structured hydrocarbon signal flows into the filtered feed and detail page', async ({
    page,
  }) => {
    const apiRequests = await mockHydrocarbonValueApis(page);
    await seedAuthenticatedSession(page, PROFILE);

    await page.goto('/feed/hydrocarbons');

    await expect(page).toHaveURL(/\/feed\/hydrocarbons(?:\?.*)?$/);
    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-view-context"]')).toBeVisible();

    await expect(page.locator('[data-og7="feed-active-filters"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="fromProvince"]')).toContainText('Alberta');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="sector"]')).toContainText('Energy');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="formKey"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="type"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="mode"]')).toBeVisible();

    const signalItem = page.locator(
      '[data-og7="hydrocarbon-signal-item"][data-og7-signal-id="signal-hydrocarbon-001"]'
    );

    await expect(signalItem).toBeVisible();
    await expect(signalItem).toHaveAttribute('data-og7-feed-item-id', 'hydrocarbon-opportunity-001');
    await expect(signalItem).toHaveAttribute('data-og7-state', 'active');
    await expect(signalItem).toHaveAttribute('data-og7-publication-type', 'slowdown');
    await expect(signalItem).toContainText('Northern Prairie Energy');
    await expect(signalItem).toContainText('48000 bbl');

    await expect
      .poll(() =>
        apiRequests.signalRequests.some(
          (request) => request.originProvinceId === 'ab' && request.limit === '3'
        )
      )
      .toBe(true);
    await expect
      .poll(() =>
        apiRequests.feedRequests.some(
          (request) =>
            request.sector === 'energy' &&
            request.formKey === 'hydrocarbon-surplus-offer' &&
            request.fromProvince === 'ab' &&
            request.type === 'OFFER' &&
            request.mode === 'EXPORT'
        )
      )
      .toBe(true);

    await expect.poll(() => page.locator('[data-feed-item-id]').count()).toBe(1);

    const feedCard = page.locator('[data-feed-item-id="hydrocarbon-opportunity-001"]');
    await expect(feedCard).toBeVisible();
    await expect(feedCard).toContainText('48,000 barrels available after Alberta corridor slowdown');
    await expect(feedCard).toContainText('Northern Prairie Energy');
    await expect(feedCard).toContainText('48000 bbl');

    await feedCard.locator('[data-og7-id="feed-open-item"]').click();

    await expect(page).toHaveURL(/\/feed\/opportunities\/hydrocarbon-opportunity-001(?:\?.*)?$/);
    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();

    const hydrocarbonDetail = page.locator('[data-og7="hydrocarbon-detail-card"]');
    await expect(hydrocarbonDetail).toBeVisible();
    await expect(hydrocarbonDetail).toContainText('Northern Prairie Energy');
    await expect(hydrocarbonDetail).toContainText('48,000 bbl');
    await expect(hydrocarbonDetail).toContainText('2026-03-25 -> 2026-04-04');
    await expect(hydrocarbonDetail).toContainText('WCS less rail differential');
    await expect(hydrocarbonDetail).toContainText('Volume available following reduced outbound flow on main corridor.');
  });
});
