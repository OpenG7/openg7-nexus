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

const priorityIndicatorItem = {
  id: 'indicator-001',
  createdAt: '2026-03-25T09:30:00.000Z',
  updatedAt: '2026-03-25T12:15:00.000Z',
  type: 'INDICATOR',
  sectorId: 'energy',
  title: 'Essential services dependency tightens on the QC -> ON corridor',
  summary: 'Ontario essential services depend on Quebec balancing support and Alberta hydrocarbon continuity.',
  fromProvinceId: 'qc',
  toProvinceId: 'on',
  mode: 'BOTH',
  urgency: 3,
  credibility: 3,
  tags: ['essential-services', 'corridor', 'hydrocarbon'],
  source: {
    kind: 'GOV',
    label: 'OpenG7 Corridor Desk',
  },
  metadata: {
    extensions: {
      decisionTitle: 'Protect Ontario essential services before non-critical exports',
      decisionSummary:
        'Ontario heating, utilities and emergency fleets depend on Quebec balancing support while Alberta barrels cover the refinery shortfall.',
      decisionProtectedServices: 'Heating, utilities, municipal fleets',
      decisionPrioritySector: 'Energy continuity',
      decisionInterprovincialDependency: 'Quebec reserve imports plus Alberta hydrocarbon rerouting',
      decisionCapacitySignal: 'QC -> ON corridor under constrained headroom',
      decisionSteps: [
        'Reserve the corridor for essential services before discretionary industrial draws.',
        'Coordinate Quebec balancing support with Alberta supply continuity.',
        'Open the Alberta -> Ontario hydrocarbon release and confirm the barrel window.',
      ],
      decisionActionItemId: hydrocarbonItem.id,
      decisionActionLabel: 'Open Alberta -> Ontario hydrocarbon window',
      decisionActionRoute: 'opportunities',
    },
  },
} as const;

async function mockHydrocarbonDecisionApis(page: Page): Promise<void> {
  const json = (body: unknown, status = 200) => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
  const itemsById = new Map<string, typeof hydrocarbonItem | typeof priorityIndicatorItem>([
    [hydrocarbonItem.id, hydrocarbonItem],
    [priorityIndicatorItem.id, priorityIndicatorItem],
  ]);

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
          { id: 'qc', name: 'Quebec' },
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

  await page.route(/\/api\/feed\/[^/?]+(?:\?.*)?$/i, async (route) => {
    if (route.request().method().toUpperCase() !== 'GET') {
      await route.fallback();
      return;
    }

    const itemId = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop() ?? '');
    await route.fulfill(json({ data: itemsById.get(itemId) ?? hydrocarbonItem }));
  });

  await page.route(/\/api\/feed(?:\?.*)?$/i, async (route) => {
    if (route.request().method().toUpperCase() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill(
      json({
        data: [hydrocarbonItem],
        cursor: null,
      })
    );
  });
}

test.describe('Hydrocarbon business journey', () => {
  test('proves the essential-services priority path becomes a decision flow that opens the hydrocarbon action', async ({
    page,
  }) => {
    await mockHydrocarbonDecisionApis(page);
    await seedAuthenticatedSession(page, PROFILE);

    await page.goto('/');

    const priorityPath = page.locator(
      '[data-og7="corridor-priority-path"][data-og7-corridor-id="essential-services"]'
    );
    await expect(priorityPath).toBeVisible();
    await expect(priorityPath.locator('[data-og7-id="priority-services"]')).toBeVisible();
    await expect(priorityPath.locator('[data-og7-id="priority-sector"]')).toBeVisible();
    await expect(priorityPath.locator('[data-og7-id="priority-dependencies"]')).toBeVisible();
    await expect(priorityPath.locator('[data-og7-id="priority-capacity"]')).toBeVisible();

    await priorityPath.locator('[data-og7-id="open-priority-path"]').click();

    await expect(page).toHaveURL(/\/feed\/indicators\/indicator-001(?:\?.*)?$/);
    await expect(page.locator('[data-og7="indicator-detail-page"]')).toBeVisible();
    await expect
      .poll(() => new URL(page.url()).searchParams.get('source'))
      .toBe('corridors-realtime');
    await expect
      .poll(() => new URL(page.url()).searchParams.get('corridorId'))
      .toBe('essential-services');

    const decisionFlow = page.locator('[data-og7="indicator-decision-flow"]');
    await expect(decisionFlow).toBeVisible();
    await expect(decisionFlow).toContainText('Protect Ontario essential services before non-critical exports');
    await expect(decisionFlow).toContainText('Quebec reserve imports plus Alberta hydrocarbon rerouting');
    await expect(decisionFlow.locator('[data-og7-id="decision-step-3"]')).toContainText(
      'Open the Alberta -> Ontario hydrocarbon release'
    );

    await decisionFlow.locator('[data-og7-id="indicator-decision-open-target"]').click();

    await expect(page).toHaveURL(/\/feed\/opportunities\/hydrocarbon-opportunity-001(?:\?.*)?$/);
    await expect(page.locator('[data-og7="opportunity-detail-page"]')).toBeVisible();
    await expect
      .poll(() => new URL(page.url()).searchParams.get('corridorId'))
      .toBe('essential-services');

    const hydrocarbonDetail = page.locator('[data-og7="hydrocarbon-detail-card"]');
    await expect(hydrocarbonDetail).toBeVisible();
    await expect(hydrocarbonDetail).toContainText('Northern Prairie Energy');
    await expect(hydrocarbonDetail).toContainText('48,000 bbl');
    await expect(hydrocarbonDetail).toContainText('2026-03-25 -> 2026-04-04');
    await expect(hydrocarbonDetail).toContainText('WCS less rail differential');
    await expect(hydrocarbonDetail).toContainText('Volume available following reduced outbound flow on main corridor.');
  });
});
