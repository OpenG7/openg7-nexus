import './setup';
import { expect, Page, Route, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser, mockAuthenticatedSessionApis } from './helpers/auth-session';

type StatisticsScope = 'interprovincial' | 'international' | 'all';
type StatisticsIntrant = 'all' | 'energy' | 'agri-food' | 'manufacturing' | 'digital-services';

interface StatisticsSummaryRecord {
  id: number;
  scope: StatisticsScope;
  intrant: StatisticsIntrant;
  period: string | null;
  province: string | null;
  country: string | null;
}

interface SavedSearchRecord {
  id: string;
  name: string;
  scope: 'all' | 'companies' | 'partners' | 'feed' | 'map' | 'opportunities';
  filters: Record<string, unknown>;
  notifyEnabled: boolean;
  frequency: 'realtime' | 'daily' | 'weekly';
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
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
    intrant: 'agri-food',
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
];

function createDeferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
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

function buildStatisticsResponse(
  summaries: readonly StatisticsSummaryRecord[],
  scope: StatisticsScope
) {
  const unique = (values: readonly (string | null)[]) =>
    Array.from(new Set(values.filter((value): value is string => Boolean(value))));

  return {
    data: {
      summaries: summaries.map((summary) => ({
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
        totalFlows: summaries.length,
        totalFlowsUnitKey: 'pages.statistics.units.billionCAD',
        activeCorridors: summaries.length,
        updatedAt: '2026-04-07T09:00:00.000Z',
      },
      availablePeriods: unique(summaries.map((summary) => summary.period)),
      availableProvinces: unique(summaries.map((summary) => summary.province)),
      availableCountries: unique(summaries.map((summary) => summary.country)),
    },
    meta: {
      filters: {
        scope,
        intrant: 'all',
        period: null,
        province: null,
        country: null,
      },
    },
  };
}

test.describe('Quality breadth perceived performance', () => {
  test('keeps opportunity detail in an explicit loading state until delayed hydration resolves', async ({
    page,
  }) => {
    const detailReady = createDeferred();

    await installControllableFeedEventSource(page, true);
    await disableFeedMocks(page);
    await mockAuthenticatedSessionApis(page);
    await page.route('**/api/feed**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (url.pathname === '/api/feed/request-001' && request.method().toUpperCase() === 'GET') {
        await detailReady.promise;
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

      if (url.pathname === '/api/feed' && request.method().toUpperCase() === 'GET') {
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
    await expect(page.getByRole('heading', { name: 'Short-term import of 300 MW' })).toHaveCount(0);
    await expect(page.locator('[data-og7="opportunity-detail-missing"]')).toHaveCount(0);

    detailReady.resolve();

    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Short-term import of 300 MW' })).toBeVisible();
    await expect(page.locator('[data-og7="opportunity-context-aside"]')).toContainText('300 MW');
    await expect(page.locator('[data-og7="opportunity-detail-loading"]')).toHaveCount(0);
  });

  test('shows an explicit loading handoff on delayed statistics scope changes before rendering the next result set', async ({
    page,
  }) => {
    const internationalReady = createDeferred();
    const internationalSummaries = statisticsSummaryRecords.filter(
      (summary) => summary.scope === 'international'
    );

    await page.route('**/api/statistics**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.searchParams.get('scope') !== 'international') {
        await route.fallback();
        return;
      }

      await internationalReady.promise;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildStatisticsResponse(internationalSummaries, 'international')),
      });
    });

    await page.goto('/statistics');
    await expect(page.locator('[data-og7="statistics-filter-bar"]')).toBeVisible();

    await page.getByRole('button', { name: 'International' }).click();

    await expect(page.locator('[data-og7="statistics-loading"]')).toBeVisible();
    await expect(page.locator('[data-og7="statistics-summary-card"]')).toHaveCount(0);
    await expect(page.locator('[data-og7="statistics-error"]')).toHaveCount(0);

    internationalReady.resolve();

    await expect(page.locator('[data-og7="statistics-summary-card"]').first()).toBeVisible();
    await expect(page.locator('[data-og7="statistics-loading"]')).toHaveCount(0);
    await expect(page.locator('[data-og7="statistics-error"]')).toHaveCount(0);
    await expect(page.locator('[data-og7="statistics-summary-card"][data-og7-scope="international"]')).toHaveCount(
      internationalSummaries.length
    );
  });

  test('shows saved-search loading immediately and keeps creation state truthful across a retry cycle', async ({
    page,
  }) => {
    const listReady = createDeferred();
    const firstCreateReady = createDeferred();
    const secondCreateReady = createDeferred();
    let createAttempts = 0;
    const savedSearches: SavedSearchRecord[] = [];

    await mockAuthenticatedSessionApis(page);
    await page.route('**/api/users/me/saved-searches**', async (route) => {
      const request = route.request();
      const method = request.method().toUpperCase();
      const url = new URL(request.url());
      const path = url.pathname;
      const idMatch = path.match(/\/saved-searches\/([^/]+)\/?$/i);
      const resourceId = idMatch ? decodeURIComponent(idMatch[1]) : null;

      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204 });
        return;
      }

      if (method === 'GET' && path.endsWith('/saved-searches')) {
        await listReady.promise;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(savedSearches),
        });
        return;
      }

      if (method === 'POST' && path.endsWith('/saved-searches')) {
        createAttempts += 1;

        if (createAttempts === 1) {
          await firstCreateReady.promise;
          await route.abort('failed');
          return;
        }

        await secondCreateReady.promise;
        const payload = (request.postDataJSON?.() ?? {}) as Partial<SavedSearchRecord>;
        const created: SavedSearchRecord = {
          id: `saved-${savedSearches.length + 1}`,
          name: typeof payload.name === 'string' ? payload.name : 'Saved search',
          scope: payload.scope === 'feed' ? 'feed' : 'all',
          filters:
            payload.filters && typeof payload.filters === 'object' && !Array.isArray(payload.filters)
              ? payload.filters
              : {},
          notifyEnabled: Boolean(payload.notifyEnabled),
          frequency: payload.frequency === 'weekly' ? 'weekly' : payload.frequency === 'realtime' ? 'realtime' : 'daily',
          lastRunAt: null,
          createdAt: '2026-04-07T09:00:00.000Z',
          updatedAt: '2026-04-07T09:00:00.000Z',
        };
        savedSearches.unshift(created);

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(created),
        });
        return;
      }

      await route.fallback();
    });

    await loginAsAuthenticatedE2eUser(page, '/saved-searches');

    await expect(page.locator('[data-og7="saved-searches"]')).toBeVisible();
    await expect(page.locator('[data-og7="saved-search-list"]')).toContainText(
      /Chargement de vos recherches sauvegardees|Chargement de vos recherches sauvegardées|Loading your saved searches/i
    );
    await expect(page.locator('[data-og7="saved-search-item"]')).toHaveCount(0);
    await expect(page.locator('[data-og7-id="saved-search-error"]')).toHaveCount(0);

    listReady.resolve();

    await expect(page.locator('[data-og7-id="saved-search-empty"]')).toBeVisible();

    await page.locator('[data-og7-id="saved-search-name"]').fill('Ontario energy watch');
    await page.locator('[data-og7-id="saved-search-query"]').fill('energy import qc');
    await page.locator('[data-og7-id="saved-search-scope"]').selectOption('feed');
    await page.locator('[data-og7-id="saved-search-notify"]').check();

    const createButton = page.locator('[data-og7-id="saved-search-create"]');
    await createButton.click();

    await expect(createButton).toBeDisabled();
    await expect(page.locator('[data-og7-id="saved-search-error"]')).toHaveCount(0);
    await expect(page.locator('[data-og7="saved-search-item"]')).toHaveCount(0);

    firstCreateReady.resolve();

    await expect(page.locator('[data-og7-id="saved-search-error"]')).toBeVisible();
    await expect(createButton).toBeEnabled();
    await expect(page.locator('[data-og7="saved-search-item"]')).toHaveCount(0);

    await createButton.click();
    await expect(createButton).toBeDisabled();
    await expect(page.locator('[data-og7="saved-search-item"]')).toHaveCount(0);

    secondCreateReady.resolve();

    await expect(page.locator('[data-og7-id="saved-search-error"]')).toHaveCount(0);
    await expect(page.locator('[data-og7-id="saved-search-empty"]')).toHaveCount(0);
    const firstItem = page.locator('[data-og7="saved-search-item"]').first();
    await expect(firstItem).toContainText('Ontario energy watch');
    await expect(firstItem).toContainText('energy import qc');
  });
});
