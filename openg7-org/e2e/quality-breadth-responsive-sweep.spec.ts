import './setup';
import { expect, type Page, type Route, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser } from './helpers/auth-session';
import { DEFAULT_PROFILE, mockProfileAndFavoritesApis, mockSessionApis as mockDomainSessionApis } from './helpers/domain-mocks';

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

const VIEWPORTS = [
  { label: 'mobile', width: 390, height: 844 },
  { label: 'tablet portrait', width: 768, height: 1024 },
  { label: 'tablet landscape', width: 1024, height: 768 },
] as const;

const statisticsSummaryRecords: StatisticsSummaryRecord[] = [
  { id: 1, scope: 'interprovincial', intrant: 'energy', period: '2024-Q1', province: 'CA-ON', country: null },
  { id: 2, scope: 'interprovincial', intrant: 'agri-food', period: '2024-Q2', province: 'CA-QC', country: null },
  { id: 3, scope: 'international', intrant: 'energy', period: '2024-Q3', province: null, country: 'US' },
  { id: 4, scope: 'international', intrant: 'digital-services', period: '2024-Q4', province: null, country: 'FR' },
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
      intrantRaw && ['all', 'energy', 'agri-food', 'manufacturing', 'digital-services'].includes(intrantRaw.toLowerCase())
        ? (intrantRaw.toLowerCase() as StatisticsIntrant)
        : 'all';
    const period = url.searchParams.get('period');
    const province = url.searchParams.get('province');
    const country = url.searchParams.get('country');

    const filtered = statisticsSummaryRecords.filter(summary => {
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
          summaries: filtered.map(summary => ({
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
          availablePeriods: unique(filtered.map(summary => summary.period)),
          availableProvinces: unique(filtered.map(summary => summary.province)),
          availableCountries: unique(filtered.map(summary => summary.country)),
        },
        meta: {
          filters: { scope, intrant, period, province, country },
        },
      }),
    });
  });
}

async function mockPartnerProfile(page: Page): Promise<void> {
  await page.route('**/api/partner-profiles/1001**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/download')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: 'partner-profile-download',
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 1001,
          attributes: {
            legalName: 'Northern Grid Systems',
            displayName: 'Northern Grid Systems',
            role: 'supplier',
            sector: 'energy',
            province: 'ON',
            website: 'https://northern-grid.example.test',
            mission: {
              fr: 'Surface partenaire de confiance pour les flux critiques.',
              en: 'Trusted partner surface for critical flows.',
            },
            highlights: ['Cross-province resilience operator'],
            verificationStatus: 'correctionRequested',
            trustScore: 78,
            verificationSources: [
              {
                id: 1,
                name: 'Ontario registry',
                type: 'registry',
                status: 'validated',
                referenceId: 'ON-REG-01',
                url: 'https://registry.example.test/on',
              },
            ],
            trustHistory: [
              {
                id: 1,
                label: 'Corrective action review',
                type: 'evaluation',
                direction: 'inbound',
                occurredAt: '2026-04-01',
                score: 78,
                notes: 'Responsive trust details stay readable without clipping.',
              },
            ],
          },
        },
      }),
    });
  });
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

test.describe('Quality breadth responsive sweep', () => {
  test('keeps feed opportunity detail usable from mobile to tablet landscape', async ({ page }) => {
    await enableMockFeed(page);
    await mockProfileAndFavoritesApis(page);

    await loginAsAuthenticatedE2eUser(page, '/feed/opportunities/request-001');
    await expect(page.locator('[data-og7="opportunity-detail-header"]')).toBeVisible();

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const makeOfferButton = page.locator('[data-og7-id="opportunity-make-offer"]');
      await expect(page.locator('[data-og7="opportunity-detail-body"]')).toBeVisible();
      await expect(makeOfferButton).toBeVisible();
      await makeOfferButton.scrollIntoViewIfNeeded();
      await expect(makeOfferButton).toBeInViewport();
      await expectNoHorizontalOverflow(page);
    }
  });

  test('keeps statistics workspace usable from mobile to tablet landscape', async ({ page }) => {
    await mockStatisticsApi(page);
    await page.goto('/statistics');

    await expect(page.locator('[data-og7="statistics-filter-bar"]')).toBeVisible();

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const resetButton = page.locator('[data-og7="statistics-action"][data-og7-id="reset-filters"]');
      const summaryCards = page.locator('[data-og7="statistics-summary-card"]');
      const emptyState = page.locator('[data-og7="statistics-empty"]');
      await expect
        .poll(async () => (await summaryCards.count()) + (await emptyState.count()))
        .toBeGreaterThan(0);
      if ((await summaryCards.count()) > 0) {
        await expect(summaryCards.first()).toBeVisible();
      } else {
        await expect(emptyState).toBeVisible();
      }
      await resetButton.scrollIntoViewIfNeeded();
      await expect(resetButton).toBeInViewport();
      await expectNoHorizontalOverflow(page);
    }
  });

  test('keeps partner trust details reachable from mobile to tablet landscape', async ({ page }) => {
    await mockDomainSessionApis(page, DEFAULT_PROFILE);
    await mockPartnerProfile(page);

    await page.goto('/partners/1001?role=supplier');
    await expect(page.locator('og7-partner-details-panel')).toBeVisible();

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const trustPanel = page.locator('[data-og7="partner-trust"]');
      await trustPanel.scrollIntoViewIfNeeded();
      await expect(trustPanel).toBeVisible();
      await expect(page.locator('[data-og7-id="partner-trust-status"]')).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });
});
