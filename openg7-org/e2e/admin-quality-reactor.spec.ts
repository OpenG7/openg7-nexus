import './setup';
import { expect, test, type Page } from '@playwright/test';

import { seedAuthenticatedSession } from './helpers/auth-session';
import {
  DEFAULT_PROFILE,
  mockAdminOpsApis,
  mockProfileAndFavoritesApis,
} from './helpers/domain-mocks';

const NOW = '2026-09-08T12:00:00.000Z';
const ADMIN_PROFILE = { ...DEFAULT_PROFILE, email: 'contact@openg7.test', roles: ['admin'] };
const REACTOR = '[data-og7="admin-quality-reactor"]';
const COVERAGE = '[data-og7-id="admin-quality-reactor-coverage"]';
const EXPLANATIONS = '[data-og7="admin-quality-reactor-explanations"]';
const COVERAGE_SECTION = '[data-og7="admin-quality-scroll-section"][data-og7-id="coverage"]';
const COVERAGE_ROWS = '[data-og7="admin-quality-coverage-matrix-row"]';

type Bucket = 'covered' | 'proof-gap' | 'product-gap' | 'scope-limit';

function entry(id: string, bucket: Bucket, overrides: Record<string, unknown> = {}) {
  return {
    id,
    domain: `Domaine ${id}`,
    need: 'Conserver une évaluation traçable du parcours.',
    summaryStatus: bucket === 'covered' ? 'oui' : 'partiel',
    businessStatus: 'oui',
    implementationStatus: bucket === 'product-gap' ? 'partiel' : 'oui',
    e2eStatus: bucket === 'covered' ? 'oui' : 'partiel',
    priority: bucket === 'proof-gap' || bucket === 'product-gap' ? 'haute' : 'moyenne',
    managementBucket: bucket,
    needsProductWorkFirst: bucket === 'product-gap',
    observedGap: bucket === 'covered' ? 'Parcours vérifié.' : 'Une lacune reste à traiter.',
    nextMove: 'Revoir le parcours et conserver sa preuve.',
    evidence: ['e2e/admin-quality-reactor.spec.ts'],
    reviewedAt: '2026-09-07',
    repoSignalAt: null,
    signalDispatch: {},
    ...overrides,
  };
}

const AUDIT_ENTRIES = [
  ...Array.from({ length: 9 }, (_, index) => entry(`covered-${index}`, 'covered')),
  entry('proof-gap', 'proof-gap'),
  ...Array.from({ length: 4 }, (_, index) => entry(`product-gap-${index}`, 'product-gap')),
  // This editorial flag previously counted the same domain in two categories.
  entry('linkup-workflow', 'scope-limit', { needsProductWorkFirst: true }),
];

function matrix(entries: ReturnType<typeof entry>[]) {
  return { data: { generatedAt: NOW, sourceStatus: 'fresh', sourceMessage: null, entries } };
}

function gate() {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { pending, release };
}

async function mockPage(page: Page, entries: ReturnType<typeof entry>[]) {
  await page.clock.setFixedTime(new Date(NOW));
  await mockProfileAndFavoritesApis(page, ADMIN_PROFILE);
  await mockAdminOpsApis(page);
  await page.route('**/api/admin/ops/security', (route) =>
    route.fulfill({
      json: {
        data: {
          generatedAt: NOW,
          users: { total: 1, blocked: 0, registrationsLast7d: 0 },
          sessions: {
            scannedUsers: 1,
            truncated: false,
            active: 1,
            revoked: 0,
            usersWithActiveSessions: 1,
          },
          uploads: { safetyEnabled: true, maxFileSizeBytes: 5242880, allowedMimeTypes: [] },
          auth: { sessionIdleTimeoutMs: 3600000 },
          aiKeys: [],
          controlPlaneKeys: [],
          moderation: { pendingCompanies: 0, suspendedCompanies: 0 },
        },
      },
    }),
  );
  await page.route('**/api/admin/ops/ai/proofs', (route) =>
    route.fulfill({ json: { data: { generatedAt: NOW, providers: [] } } }),
  );
  await page.route('**/api/admin/quality/mission-decisions**', (route) =>
    route.fulfill({ json: { data: { generatedAt: NOW, decisions: [] } } }),
  );
  await page.route(/\/api\/admin\/quality\/matrix(?:\?.*)?$/, (route) =>
    route.fulfill({ json: matrix(entries) }),
  );
}

async function openPage(page: Page, locale: 'fr' | 'en' = 'fr') {
  await seedAuthenticatedSession(page, ADMIN_PROFILE);
  await page.goto('/admin/quality');
  await expect(page).toHaveURL(/\/admin\/quality$/);
  await expect(page.locator(REACTOR)).toBeVisible();
  if (locale === 'en') {
    await page.locator('[data-og7="lang"] > button').click();
    await page.getByRole('option', { name: 'English', exact: true }).click();
    await expect(page.locator('#admin-quality-reactor-title')).toHaveText('Quality Reactor');
  }
}

async function openExplanationsByKeyboard(page: Page) {
  const explanations = page.locator(EXPLANATIONS);
  const summary = explanations.locator(':scope > summary');
  await expect(explanations).not.toHaveAttribute('open', '');
  await summary.focus();
  await expect(summary).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(explanations).toHaveAttribute('open', '');
  return explanations;
}

async function expectCoverageEntries(page: Page, ids: string[]) {
  await expect
    .poll(() =>
      page
        .locator(COVERAGE_ROWS)
        .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-og7-id')).sort()),
    )
    .toEqual([...ids].sort());
}

async function selectMatrixFilter(page: Page, filter: string, value: string) {
  await page.locator(`[data-og7-id="admin-quality-${filter}-filter"]`).click();
  await page
    .locator(
      `[data-og7="admin-quality-combobox-option"][data-og7-id="admin-quality-${filter}-filter-${value}"]`,
    )
    .click();
}

test.describe('Quality reactor reliability', () => {
  test('explains the critical threshold and opens exactly its domains despite conflicting filters', async ({
    page,
  }) => {
    await mockPage(page, AUDIT_ENTRIES);
    await openPage(page);
    await expectCoverageEntries(
      page,
      AUDIT_ENTRIES.map(({ id }) => id),
    );
    await selectMatrixFilter(page, 'domain', 'Domaine covered-0');
    await selectMatrixFilter(page, 'priority', 'moyenne');
    await selectMatrixFilter(page, 'e2e', 'oui');
    await selectMatrixFilter(page, 'bucket', 'covered');
    await page.locator('[data-og7-id="admin-quality-search"]').fill('covered-0');
    await expectCoverageEntries(page, ['covered-0']);

    const explanations = await openExplanationsByKeyboard(page);
    const priorityReason = explanations.locator(
      '[data-og7="admin-quality-reactor-reason"][data-og7-id="priority-gaps"]',
    );
    await expect(priorityReason).toContainText(/5\s*\/\s*15/);
    await expect(priorityReason).toContainText(/33[.,]3\s*%/);
    await expect(priorityReason).toContainText(/25\s*%/);
    await expect(priorityReason).toContainText(/critique/i);
    const action = priorityReason.locator(
      '[data-og7-id="admin-quality-reactor-view-priority-gaps"]',
    );
    await action.focus();
    await expect(action).toBeFocused();
    await page.keyboard.press('Enter');
    await expectCoverageEntries(page, [
      'proof-gap',
      'product-gap-0',
      'product-gap-1',
      'product-gap-2',
      'product-gap-3',
    ]);
    await expect(page.locator(COVERAGE_SECTION)).toBeFocused();
    await expect(page.locator('[data-og7="admin-quality-reactor-filter"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="admin-quality-search"]')).toHaveValue('');
    await expect(page.locator(REACTOR).locator(COVERAGE)).toHaveText('60 %');

    const clear = page.locator('[data-og7-id="admin-quality-reactor-clear-reason"]');
    await clear.focus();
    await page.keyboard.press('Enter');
    await expectCoverageEntries(
      page,
      AUDIT_ENTRIES.map(({ id }) => id),
    );
    await expect(page.locator('[data-og7="admin-quality-reactor-filter"]')).toHaveCount(0);

    const unresolved = explanations.locator(
      '[data-og7-id="admin-quality-reactor-view-unresolved"]',
    );
    await unresolved.focus();
    await page.keyboard.press('Enter');
    await expectCoverageEntries(page, [
      'proof-gap',
      'product-gap-0',
      'product-gap-1',
      'product-gap-2',
      'product-gap-3',
      'linkup-workflow',
    ]);
  });

  test('counts the 15 audit domains once and opens the five priority gaps by keyboard', async ({
    page,
  }, testInfo) => {
    await mockPage(page, AUDIT_ENTRIES);
    await openPage(page);

    const reactor = page.locator(REACTOR);
    await expect(reactor.locator(COVERAGE)).toHaveText('60 %');
    for (const [key, count] of [
      ['covered', 9],
      ['proof-gap', 1],
      ['product-gap', 4],
      ['not-aligned', 1],
      ['not-evaluated', 0],
    ] as const) {
      await expect(reactor.locator(`[data-og7-id="${key}"]`)).toContainText(`${count} élément(s)`);
    }
    await expect(reactor).toHaveAttribute('data-reactor-state', 'critical');
    await expect(reactor).toContainText('Indisponible');
    await testInfo.attach('reactor-mixed-desktop-fr', {
      body: await reactor.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    });

    const action = reactor.locator('[data-og7-id="admin-quality-reactor-view-gaps"]');
    await action.focus();
    await expect(action).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-og7-id="admin-quality-filter-count"]')).toContainText(
      '5 domaines visibles sur 15',
    );
    await expect(
      page.locator('[data-og7="admin-quality-scroll-section"][data-og7-id="coverage"]'),
    ).toBeFocused();
    // Filtering the work list must not change the overall matrix denominator.
    await expect(reactor.locator(COVERAGE)).toHaveText('60 %');
  });

  for (const locale of ['fr', 'en'] as const) {
    test(`keeps an unknown classification readable on mobile in ${locale} with reduced motion`, async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mockPage(page, [
        entry('covered', 'covered'),
        entry('unknown', 'proof-gap', { managementBucket: null, priority: 'moyenne' }),
      ]);
      await openPage(page, locale);
      await page.setViewportSize({ width: 390, height: 844 });

      const reactor = page.locator(REACTOR);
      await expect(reactor.locator(COVERAGE)).toHaveText('50 %');
      await expect(reactor.locator('[data-og7-id="admin-quality-reactor-completude"]')).toHaveText(
        '50 %',
      );
      const unknown = reactor.locator(
        '[data-og7="admin-quality-reactor-legend"] [data-og7-id="not-evaluated"]',
      );
      await expect(unknown).toContainText(locale === 'fr' ? 'Non évalués' : 'Not evaluated');
      await expect(unknown).toContainText(locale === 'fr' ? '1 élément(s)' : '1 item(s)');
      await expect(unknown).toHaveCSS('opacity', '1');
      await expect(reactor.getByRole('status')).toContainText(
        locale === 'fr' ? '1 domaine(s) non évalué(s)' : '1 domain(s) have not been assessed',
      );
      await expect(reactor.getByRole('status')).toHaveAttribute('aria-live', 'polite');
      const explanations = await openExplanationsByKeyboard(page);
      await expect(explanations.locator(':scope > summary')).toContainText(
        locale === 'fr' ? 'Pourquoi cet état ?' : 'Why this state?',
      );
      const unknownReason = explanations.locator(
        '[data-og7="admin-quality-reactor-reason"][data-og7-id="not-evaluated"]',
      );
      const action = unknownReason.locator(
        '[data-og7-id="admin-quality-reactor-view-not-evaluated"]',
      );
      await expect(action).toHaveAccessibleName(
        locale === 'fr' ? /Voir les lignes concernées/i : /View affected rows/i,
      );
      expect(
        await reactor.evaluate((element) =>
          element
            .getAnimations({ subtree: true })
            .some((animation) => animation.playState === 'running'),
        ),
      ).toBe(false);
      expect(await reactor.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      expect(
        await explanations.evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true);
      await testInfo.attach(`reactor-unknown-mobile-${locale}`, {
        body: await reactor.screenshot({ animations: 'disabled' }),
        contentType: 'image/png',
      });
      await action.focus();
      await page.keyboard.press('Enter');
      await expectCoverageEntries(page, ['unknown']);
      await expect(page.locator(COVERAGE_SECTION)).toBeFocused();
    });
  }

  test('allows excellent only for current reviews and marks covered domains with expired reviews or newer repo signals', async ({
    page,
  }, testInfo) => {
    await mockPage(page, [entry('covered', 'covered')]);
    await openPage(page);
    const reactor = page.locator(REACTOR);
    await expect(reactor).toHaveAttribute('data-reactor-state', 'excellent');
    await expect(reactor.locator(COVERAGE)).toHaveText('100 %');
    await expect(reactor).toContainText('Indisponible');

    await page.route(/\/api\/admin\/quality\/matrix(?:\?.*)?$/, (route) =>
      route.fulfill({
        json: matrix([
          entry('expired', 'covered', { reviewedAt: '2026-07-01' }),
          entry('changed', 'covered', { repoSignalAt: '2026-09-08T10:00:00.000Z' }),
        ]),
      }),
    );
    await page.reload();
    await expect(reactor).toHaveAttribute('data-reactor-state', 'attention');
    await expect(reactor.locator(COVERAGE)).toHaveText('100 %');
    await expect(reactor.getByRole('status')).toContainText('2 domaine(s) à revalider');
    await expect(reactor).toContainText('À confirmer');
    await testInfo.attach('reactor-covered-review-required', {
      body: await reactor.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    });
  });

  test('traces stale covered domains and opens reviews separately from priority gaps', async ({
    page,
  }, testInfo) => {
    const entries = [
      entry('expired', 'covered', {
        reviewedAt: '2026-07-01',
        evidence: ['e2e/admin-quality-reactor.spec.ts'],
      }),
      entry('changed', 'covered', { repoSignalAt: '2026-09-08T10:00:00.000Z' }),
      entry('missing-review', 'covered', { reviewedAt: '', evidence: [] }),
      entry('fresh-priority-gap', 'proof-gap'),
      entry('current', 'covered'),
    ];
    await mockPage(page, entries);
    await openPage(page);
    const explanations = await openExplanationsByKeyboard(page);
    const reviewReason = explanations.locator(
      '[data-og7="admin-quality-reactor-reason"][data-og7-id="review-required"]',
    );
    const references = reviewReason.locator('details');
    await references.locator(':scope > summary').focus();
    await page.keyboard.press('Enter');
    await expect(references).toHaveAttribute('open', '');
    const expiredDomain = references.locator('[data-entry-id="expired"]');
    await expect(expiredDomain).toBeVisible();
    await expect(expiredDomain).toContainText('Domaine expired');
    await expect(expiredDomain.locator('time')).toHaveAttribute('datetime', '2026-07-01');
    await expect(expiredDomain.locator('code')).toHaveText('e2e/admin-quality-reactor.spec.ts');
    const unreviewedDomain = references.locator('[data-entry-id="missing-review"]');
    await expect(unreviewedDomain).toBeVisible();
    await expect(unreviewedDomain).toContainText('Date de revue inconnue');
    await expect(unreviewedDomain).toContainText('Aucune référence de preuve enregistrée');
    await expect(unreviewedDomain.locator('time, code')).toHaveCount(0);

    const reviewAction = reviewReason.locator(
      '[data-og7-id="admin-quality-reactor-view-review-required"]',
    );
    await reviewAction.focus();
    await page.keyboard.press('Enter');
    await expectCoverageEntries(page, ['expired', 'changed', 'missing-review']);
    await expect(page.locator(`${COVERAGE_ROWS}[data-og7-id="expired"]`)).toHaveAccessibleName(
      /Refresh matrice requis/,
    );
    await expect(page.locator(COVERAGE_SECTION)).toBeFocused();
    await expect(page.locator('[data-og7="admin-quality-reactor-filter"]')).toBeVisible();
    await expect(page.locator(REACTOR).locator(COVERAGE)).toHaveText('80 %');
    await testInfo.attach('reactor-explanations-review-trace', {
      body: await explanations.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    });

    await explanations.locator('[data-og7-id="admin-quality-reactor-view-priority-gaps"]').click();
    await expectCoverageEntries(page, ['fresh-priority-gap']);
    await page.locator('[data-og7-id="admin-quality-reactor-clear-reason"]').click();
    await expectCoverageEntries(
      page,
      entries.map(({ id }) => id),
    );
  });

  test('announces recalculation and a failed refresh while retaining critical state and the last figures', async ({
    page,
  }) => {
    await mockPage(page, AUDIT_ENTRIES);
    const recalculation = gate();
    const refresh = gate();
    await page.route('**/api/admin/quality/matrix/recalculate', async (route) => {
      await recalculation.pending;
      await route.fulfill({
        json: {
          data: {
            generatedAt: NOW,
            scope: 'refresh-required',
            summary: { analyzedCount: 15, proposalCount: 0, unchangedCount: 15, blockedCount: 0 },
            entries: [],
          },
        },
      });
    });
    await openPage(page);
    const reactor = page.locator(REACTOR);
    await expect(reactor.locator(COVERAGE)).toHaveText('60 %');
    await page.route(/\/api\/admin\/quality\/matrix(?:\?.*)?$/, async (route) => {
      await refresh.pending;
      await route.fulfill({ status: 500, json: { error: { message: 'Refresh unavailable' } } });
    });

    try {
      await page.locator('[data-og7-id="admin-quality-recalculate-matrix"]').click();
      await expect(reactor.getByRole('status')).toContainText('Recalcul de la matrice en cours');
      await expect(reactor).toHaveAttribute('data-reactor-state', 'critical');
      await expect(reactor.locator(COVERAGE)).toHaveText('60 %');
      recalculation.release();
      await expect(reactor.getByRole('status')).toContainText(
        'Actualisation de la matrice en cours',
      );
      refresh.release();
      await expect(reactor.getByRole('status')).toContainText('L’actualisation a échoué');
      await expect(reactor.getByRole('status')).toContainText(
        'Les derniers chiffres connus sont conservés',
      );
      await expect(reactor.locator(COVERAGE)).toHaveText('60 %');
      await expect(reactor).toHaveAttribute('data-reactor-state', 'critical');
    } finally {
      recalculation.release();
      refresh.release();
    }
  });

  test('distinguishes first loading from an empty matrix without presenting zero as measured coverage', async ({
    page,
  }) => {
    await mockPage(page, []);
    const initialLoad = gate();
    await page.route(/\/api\/admin\/quality\/matrix(?:\?.*)?$/, async (route) => {
      await initialLoad.pending;
      await route.fulfill({ json: matrix([]) });
    });
    try {
      await openPage(page);
      const reactor = page.locator(REACTOR);
      await expect(reactor.getByRole('status')).toContainText('Chargement de la matrice');
      await expect(reactor.locator(COVERAGE)).toHaveText('—');
      initialLoad.release();
      await expect(reactor.getByRole('status')).toContainText('Aucun domaine disponible');
      await expect(reactor.locator(COVERAGE)).toHaveText('—');
      await expect(reactor).toContainText('Sans données');
      await expect(reactor).toContainText('À confirmer');
    } finally {
      initialLoad.release();
    }
  });
});
