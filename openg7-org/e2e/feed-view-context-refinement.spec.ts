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
  originProvinceId: 'ab',
  targetProvinceId: 'on',
  quantityUnit: 'bbl',
  volumeBarrels: 48000,
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
      volumeBarrels: hydrocarbonSignal.volumeBarrels,
    },
  },
} as const;

test.describe('Feed view context refinement', () => {
  test('keeps dedicated hydrocarbon view context coherent through refinement, detail, back, and reload', async ({
    page,
  }) => {
    const apiRequests = await mockHydrocarbonViewApis(page);
    await seedAuthenticatedSession(page, PROFILE);

    await page.goto('/feed/hydrocarbons?q=Prairie');

    await expect(page).toHaveURL(/\/feed\/hydrocarbons(?:\?.*)?$/);
    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-view-context"]')).toBeVisible();
    await expect(page.locator('[data-og7="hydrocarbon-signals-panel"]')).toBeVisible();
    await expectSearchParams(page, {
      q: 'Prairie',
      source: null,
      corridorId: null,
      fromProvince: 'ab',
      sector: 'energy',
      formKey: 'hydrocarbon-surplus-offer',
      type: 'OFFER',
      mode: 'EXPORT',
    });
    await expect(page.locator('#feed-search')).toHaveValue('Prairie');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="search"]')).toContainText('Prairie');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="fromProvince"]')).toContainText('Alberta');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="sector"]')).toContainText('Energy');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="formKey"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="type"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="mode"]')).toBeVisible();
    await expectVisibleItemIds(page, ['hydrocarbon-opportunity-001']);

    await expect
      .poll(() =>
        apiRequests.feedRequests.some(
          request =>
            request.sector === 'energy' &&
            request.formKey === 'hydrocarbon-surplus-offer' &&
            request.fromProvince === 'ab' &&
            request.type === 'OFFER' &&
            request.mode === 'EXPORT' &&
            request.q === 'Prairie'
        )
      )
      .toBe(true);

    await page.locator('[data-feed-item-id="hydrocarbon-opportunity-001"] [data-og7-id="feed-open-item"]').click();

    await expect(page).toHaveURL(/\/feed\/opportunities\/hydrocarbon-opportunity-001(?:\?.*)?$/);
    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="hydrocarbon-detail-card"]')).toBeVisible();
    await expectSearchParams(page, {
      q: 'Prairie',
      source: null,
      corridorId: null,
      fromProvince: 'ab',
      sector: 'energy',
      formKey: 'hydrocarbon-surplus-offer',
      type: 'OFFER',
      mode: 'EXPORT',
    });

    await page.goBack();

    await expect(page).toHaveURL(/\/feed\/hydrocarbons(?:\?.*)?$/);
    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-view-context"]')).toBeVisible();
    await expect(page.locator('[data-og7="hydrocarbon-signals-panel"]')).toBeVisible();
    await expect(page.locator('#feed-search')).toHaveValue('Prairie');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="search"]')).toContainText('Prairie');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="fromProvince"]')).toContainText('Alberta');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="sector"]')).toContainText('Energy');
    await expectVisibleItemIds(page, ['hydrocarbon-opportunity-001']);

    await page.reload();

    await expect(page).toHaveURL(/\/feed\/hydrocarbons(?:\?.*)?$/);
    await expect(page.locator('[data-og7="feed-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-view-context"]')).toBeVisible();
    await expect(page.locator('[data-og7="hydrocarbon-signals-panel"]')).toBeVisible();
    await expectSearchParams(page, {
      q: 'Prairie',
      source: null,
      corridorId: null,
      fromProvince: 'ab',
      sector: 'energy',
      formKey: 'hydrocarbon-surplus-offer',
      type: 'OFFER',
      mode: 'EXPORT',
    });
    await expect(page.locator('#feed-search')).toHaveValue('Prairie');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="search"]')).toContainText('Prairie');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="fromProvince"]')).toContainText('Alberta');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="sector"]')).toContainText('Energy');
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="formKey"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="type"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-filter-chip"][data-og7-id="mode"]')).toBeVisible();
    await expectVisibleItemIds(page, ['hydrocarbon-opportunity-001']);
  });
});

async function mockHydrocarbonViewApis(page: Page): Promise<{
  readonly feedRequests: Array<Record<string, string | null>>;
}> {
  const json = (body: unknown, status = 200) => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
  const feedRequests: Array<Record<string, string | null>> = [];

  await page.route('**/runtime-config.js', async route => {
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

  await page.route(/\/api\/sectors(?:\?.*)?$/i, async route => {
    await route.fulfill(
      json({
        data: [
          { id: 'energy', name: 'Energy' },
          { id: 'manufacturing', name: 'Advanced manufacturing' },
        ],
      })
    );
  });

  await page.route(/\/api\/provinces(?:\?.*)?$/i, async route => {
    await route.fulfill(
      json({
        data: [
          { id: 'ab', name: 'Alberta' },
          { id: 'on', name: 'Ontario' },
        ],
      })
    );
  });

  await page.route(/\/api\/companies(?:\?.*)?$/i, async route => {
    await route.fulfill(json({ data: [] }));
  });

  await page.route(/\/api\/auth\/local(?:\?.*)?$/i, async route => {
    await route.fulfill(
      json({
        jwt: 'header.eyJleHAiOjQxMDI0NDQ4MDB9.signature',
        user: PROFILE,
      })
    );
  });

  await page.route(/\/api\/users\/me(?:\/.*)?(?:\?.*)?$/i, async route => {
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

  await page.route(/\/api\/feed\/stream(?:\?.*)?$/i, async route => {
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
      },
      body: '',
    });
  });

  await page.route(/\/api\/hydrocarbon-signals(?:\?.*)?$/i, async route => {
    await route.fulfill(json({ data: [hydrocarbonSignal], meta: {} }));
  });

  await page.route(/\/api\/feed\/[^/?]+(?:\?.*)?$/i, async route => {
    if (route.request().method().toUpperCase() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill(json({ data: hydrocarbonItem }));
  });

  await page.route(/\/api\/feed(?:\?.*)?$/i, async route => {
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
      q: url.searchParams.get('q'),
    });

    await route.fulfill(
      json({
        data: [hydrocarbonItem],
        cursor: null,
      })
    );
  });

  return { feedRequests };
}

async function expectVisibleItemIds(page: Page, expectedIds: string[]): Promise<void> {
  await expect
    .poll(async () =>
      page
        .locator('[data-feed-item-id]')
        .evaluateAll(elements => elements.map(element => element.getAttribute('data-feed-item-id') ?? ''))
    )
    .toEqual(expectedIds);
}

async function expectSearchParams(page: Page, expected: Record<string, string | null>): Promise<void> {
  for (const [key, value] of Object.entries(expected)) {
    await expect.poll(() => new URL(page.url()).searchParams.get(key)).toBe(value);
  }
}