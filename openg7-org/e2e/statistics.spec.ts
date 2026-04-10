import './setup';
import { expect, test } from '@playwright/test';

type Scope = 'interprovincial' | 'international' | 'all';
type Intrant = 'all' | 'energy' | 'agri-food' | 'manufacturing' | 'digital-services';

interface SummaryRecord {
  id: number;
  scope: Scope;
  intrant: Intrant;
  period: string | null;
  province: string | null;
  country: string | null;
}

const allSummaries: SummaryRecord[] = [
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
  {
    id: 4,
    scope: 'international',
    intrant: 'digital-services',
    period: '2024-Q4',
    province: null,
    country: 'FR',
  },
];

const unique = (values: readonly (string | null)[]) =>
  Array.from(new Set(values.filter((v): v is string => Boolean(v))));

test('statistics filters update the dataset', async ({ page }) => {
  await page.route('**/api/statistics**', async route => {
    const url = new URL(route.request().url());
    const requestedScopeRaw = url.searchParams.get('scope');
    const requestedScope: Scope =
      requestedScopeRaw && ['interprovincial', 'international', 'all'].includes(requestedScopeRaw.toLowerCase())
        ? (requestedScopeRaw.toLowerCase() as Scope)
        : 'interprovincial';
    const requestedIntrantRaw = url.searchParams.get('intrant');
    const requestedIntrant: Intrant =
      requestedIntrantRaw && ['all', 'energy', 'agri-food', 'manufacturing', 'digital-services'].includes(requestedIntrantRaw.toLowerCase())
        ? (requestedIntrantRaw.toLowerCase() as Intrant)
        : 'all';
    const requestedPeriod = url.searchParams.get('period');
    const requestedProvince = url.searchParams.get('province');
    const requestedCountry = url.searchParams.get('country');

    const filtered = allSummaries.filter(summary => {
      const scopeMatch = requestedScope === 'all' || summary.scope === requestedScope;
      const intrantMatch = requestedIntrant === 'all' || summary.intrant === requestedIntrant;
      const periodMatch = !requestedPeriod || summary.period === requestedPeriod;
      const provinceMatch = !requestedProvince || summary.province === requestedProvince;
      const countryMatch = !requestedCountry || summary.country === requestedCountry;
      return scopeMatch && intrantMatch && periodMatch && provinceMatch && countryMatch;
    });

    const payload = {
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
        filters: {
          scope: requestedScope,
          intrant: requestedIntrant,
          period: requestedPeriod,
          province: requestedProvince,
          country: requestedCountry,
        },
      },
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });

  await page.goto('/statistics');
  await expect(page.locator('[data-og7="app-shell"][data-og7-ready="true"]')).toBeVisible();
  await expect(page.locator('[data-og7="statistics-scope-toggle"]')).toBeVisible();

  await Promise.all([
    page.waitForResponse((response) => {
      const url = response.url();
      return url.includes('/api/statistics') && url.includes('scope=international') && !url.includes('intrant=');
    }),
    page.locator('[data-og7="statistics-scope-toggle"] button').nth(1).click(),
  ]);

  await Promise.all([
    page.waitForResponse((response) => {
      const url = response.url();
      return url.includes('/api/statistics') && url.includes('scope=international') && url.includes('intrant=energy');
    }),
    page.locator('[data-og7="statistics-intrant-filter"][data-og7-value="energy"]').click(),
  ]);

  const summaryCards = page.locator('[data-og7="statistics-summary-card"]');
  const emptyState = page.locator('[data-og7="statistics-empty"]');
  await expect.poll(async () => (await summaryCards.count()) + (await emptyState.count())).toBeGreaterThan(0);

  if ((await summaryCards.count()) > 0) {
    await expect(summaryCards.first()).toBeVisible();
    await expect
      .poll(async () => {
        const intrants = await summaryCards.evaluateAll(cards =>
          cards.map(card => card.getAttribute('data-og7-intrant'))
        );
        return unique(intrants);
      })
      .toEqual(['energy']);
    return;
  }

  await expect(emptyState).toBeVisible();
});
