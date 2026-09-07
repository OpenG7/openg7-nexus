import './setup';
import { expect, test, type Page } from '@playwright/test';

import { seedAuthenticatedSession } from './helpers/auth-session';
import {
  DEFAULT_PROFILE,
  mockAdminOpsApis,
  mockProfileAndFavoritesApis,
} from './helpers/domain-mocks';

type RecalculationScope = 'refresh-required' | 'selected-entry' | 'all';

interface RecalculateRequestPayload {
  scope: RecalculationScope;
  entryId: string | null;
}

interface MockHttpResponse {
  status?: number;
  body: unknown;
  delayMs?: number;
}

const ADMIN_PROFILE = {
  ...DEFAULT_PROFILE,
  email: 'contact@openg7.test',
  roles: ['admin'],
} as const;

const MATRIX_SNAPSHOT = {
  data: {
    generatedAt: '2026-05-06T16:30:00.000Z',
    sourceStatus: 'fresh',
    sourceMessage: null,
    entries: [
      {
        id: 'advanced-discovery',
        domain: 'Recherche et decouverte profonde',
        need: 'Conserver le contexte entre le feed et le detail.',
        summaryStatus: 'non',
        businessStatus: 'oui',
        implementationStatus: 'partiel',
        e2eStatus: 'partiel',
        priority: 'haute',
        managementBucket: 'proof-gap',
        needsProductWorkFirst: false,
        observedGap: 'Une chaine cross-surface reste absente.',
        nextMove: 'Ajouter une chaine map vers feed.',
        evidence: ['e2e/feed-advanced-discovery-roundtrip.spec.ts'],
        reviewedAt: '2026-04-07',
        repoSignalAt: '2026-05-02T12:00:00.000Z',
        repoSignalCommit: 'abc123def456',
        repoSignalSource: 'github-actions',
        repoSignalSummary: 'A proof package landed after the last matrix review.',
        signalDispatch: {},
      },
      {
        id: 'trust-validation',
        domain: 'Trust et validation',
        need: 'Historiser les decisions de confiance.',
        summaryStatus: 'oui',
        businessStatus: 'oui',
        implementationStatus: 'oui',
        e2eStatus: 'oui',
        priority: 'moyenne',
        managementBucket: 'covered',
        needsProductWorkFirst: false,
        observedGap: 'Le flux critique est deja prouve.',
        nextMove: 'Maintenir la regression existante.',
        evidence: ['e2e/admin-trust-visibility.spec.ts'],
        reviewedAt: '2026-05-05',
        repoSignalAt: null,
        repoSignalCommit: null,
        repoSignalSource: null,
        repoSignalSummary: null,
        signalDispatch: {},
      },
    ],
  },
};

const EMPTY_MISSION_DECISIONS = {
  data: {
    generatedAt: '2026-05-06T16:30:00.000Z',
    decisions: [],
  },
};

const AI_PROOFS_SNAPSHOT = {
  data: {
    generatedAt: '2026-05-06T16:30:00.000Z',
    providers: [
      {
        provider: 'codex',
        label: 'Codex',
        workflow: 'codex-pr.yml',
        state: 'completed',
        summary: 'Workflow #51 completed with 2 artifact(s) and PR #321.',
        run: {
          id: 501,
          number: 51,
          url: 'https://github.com/OpenG7/openg7-nexus/actions/runs/501',
          status: 'completed',
          conclusion: 'success',
          branch: 'codex/qa-proof-501',
          createdAt: '2026-05-06T16:10:00.000Z',
          updatedAt: '2026-05-06T16:20:00.000Z',
        },
        artifacts: [
          {
            id: 9001,
            name: 'playwright-report',
            sizeBytes: 2048,
            expired: false,
            url: 'https://github.com/OpenG7/openg7-nexus/actions/runs/501#artifacts',
          },
        ],
        pullRequest: {
          number: 321,
          title: 'Codex QA proof package',
          url: 'https://github.com/OpenG7/openg7-nexus/pull/321',
          state: 'open',
          merged: false,
          mergedAt: null,
          branch: 'codex/qa-proof-501',
        },
      },
    ],
  },
};

const REFRESH_REQUIRED_RECALCULATION = {
  data: {
    generatedAt: '2026-05-06T16:35:00.000Z',
    scope: 'refresh-required',
    summary: {
      analyzedCount: 1,
      proposalCount: 1,
      unchangedCount: 0,
      blockedCount: 0,
    },
    entries: [
      {
        entryId: 'advanced-discovery',
        domain: 'Recherche et decouverte profonde',
        result: 'proposal-review-required',
        confidence: 'high',
        current: {
          summaryStatus: 'non',
          businessStatus: 'oui',
          implementationStatus: 'partiel',
          e2eStatus: 'partiel',
          managementBucket: 'proof-gap',
          needsProductWorkFirst: false,
        },
        proposed: {
          summaryStatus: 'oui',
          businessStatus: 'oui',
          implementationStatus: 'oui',
          e2eStatus: 'oui',
          managementBucket: 'covered',
          needsProductWorkFirst: false,
        },
        reasons: ['Une mission marquee done est plus recente que la derniere revue.'],
        evidence: ['e2e/feed-advanced-discovery-roundtrip.spec.ts'],
        factualSignals: {
          reviewedAt: '2026-04-07',
          repoSignalAt: '2026-05-02T12:00:00.000Z',
          repoSignalCommit: 'abc123def456',
          repoSignalSource: 'github-actions',
          latestDecisionAt: '2026-05-06T16:34:00.000Z',
        },
      },
    ],
  },
};

const ALL_SCOPE_RECALCULATION = {
  data: {
    generatedAt: '2026-05-06T16:40:00.000Z',
    scope: 'all',
    summary: {
      analyzedCount: 2,
      proposalCount: 1,
      unchangedCount: 1,
      blockedCount: 0,
    },
    entries: [
      {
        entryId: 'advanced-discovery',
        domain: 'Recherche et decouverte profonde',
        result: 'proposal-review-required',
        confidence: 'high',
        current: {
          summaryStatus: 'non',
          businessStatus: 'oui',
          implementationStatus: 'partiel',
          e2eStatus: 'partiel',
          managementBucket: 'proof-gap',
          needsProductWorkFirst: false,
        },
        proposed: {
          summaryStatus: 'oui',
          businessStatus: 'oui',
          implementationStatus: 'oui',
          e2eStatus: 'oui',
          managementBucket: 'covered',
          needsProductWorkFirst: false,
        },
        reasons: ['Les signaux repo et mission convergent vers une hausse de couverture.'],
        evidence: ['e2e/feed-advanced-discovery-roundtrip.spec.ts'],
        factualSignals: {
          reviewedAt: '2026-04-07',
          repoSignalAt: '2026-05-02T12:00:00.000Z',
          repoSignalCommit: 'abc123def456',
          repoSignalSource: 'github-actions',
          latestDecisionAt: '2026-05-06T16:34:00.000Z',
        },
      },
      {
        entryId: 'trust-validation',
        domain: 'Trust et validation',
        result: 'unchanged',
        confidence: 'high',
        current: {
          summaryStatus: 'oui',
          businessStatus: 'oui',
          implementationStatus: 'oui',
          e2eStatus: 'oui',
          managementBucket: 'covered',
          needsProductWorkFirst: false,
        },
        proposed: null,
        reasons: ['La preuve et la matrice restent alignees.'],
        evidence: ['e2e/admin-trust-visibility.spec.ts'],
        factualSignals: {
          reviewedAt: '2026-05-05',
          repoSignalAt: null,
          repoSignalCommit: null,
          repoSignalSource: null,
          latestDecisionAt: null,
        },
      },
    ],
  },
};

const SELECTED_ENTRY_RECALCULATION = {
  data: {
    generatedAt: '2026-05-06T16:45:00.000Z',
    scope: 'selected-entry',
    summary: {
      analyzedCount: 1,
      proposalCount: 1,
      unchangedCount: 0,
      blockedCount: 0,
    },
    entries: [
      {
        entryId: 'advanced-discovery',
        domain: 'Recherche et decouverte profonde',
        result: 'proposal-review-required',
        confidence: 'high',
        current: {
          summaryStatus: 'non',
          businessStatus: 'oui',
          implementationStatus: 'partiel',
          e2eStatus: 'partiel',
          managementBucket: 'proof-gap',
          needsProductWorkFirst: false,
        },
        proposed: {
          summaryStatus: 'oui',
          businessStatus: 'oui',
          implementationStatus: 'oui',
          e2eStatus: 'oui',
          managementBucket: 'covered',
          needsProductWorkFirst: false,
        },
        reasons: ['La mission Codex marquee done fournit une preuve plus recente.'],
        evidence: ['e2e/feed-advanced-discovery-roundtrip.spec.ts'],
        factualSignals: {
          reviewedAt: '2026-04-07',
          repoSignalAt: '2026-05-02T12:00:00.000Z',
          repoSignalCommit: 'abc123def456',
          repoSignalSource: 'github-actions',
          latestDecisionAt: '2026-05-06T16:44:00.000Z',
        },
      },
    ],
  },
};

const SELECTED_TRUST_RECALCULATION = {
  data: {
    generatedAt: '2026-05-06T16:47:00.000Z',
    scope: 'selected-entry',
    summary: {
      analyzedCount: 1,
      proposalCount: 0,
      unchangedCount: 1,
      blockedCount: 0,
    },
    entries: [
      {
        entryId: 'trust-validation',
        domain: 'Trust et validation',
        result: 'unchanged',
        confidence: 'high',
        current: {
          summaryStatus: 'oui',
          businessStatus: 'oui',
          implementationStatus: 'oui',
          e2eStatus: 'oui',
          managementBucket: 'covered',
          needsProductWorkFirst: false,
        },
        proposed: null,
        reasons: ['La preuve et la matrice restent alignees.'],
        evidence: ['e2e/admin-trust-visibility.spec.ts'],
        factualSignals: {
          reviewedAt: '2026-05-05',
          repoSignalAt: null,
          repoSignalCommit: null,
          repoSignalSource: null,
          latestDecisionAt: null,
        },
      },
    ],
  },
};

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

async function wait(delayMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function mockAdminQualityPageApis(
  page: Page,
  options: {
    recalculateResponse:
      | MockHttpResponse
      | ((payload: RecalculateRequestPayload) => Promise<MockHttpResponse> | MockHttpResponse);
  },
): Promise<{ recalculateRequests: RecalculateRequestPayload[] }> {
  const recalculateRequests: RecalculateRequestPayload[] = [];

  await mockProfileAndFavoritesApis(page, ADMIN_PROFILE);
  await mockAdminOpsApis(page);

  await page.route('**/api/admin/ops/ai/proofs', async (route) => {
    await route.fulfill(jsonResponse(AI_PROOFS_SNAPSHOT));
  });

  await page.route('**/api/admin/quality/mission-decisions**', async (route) => {
    const request = route.request();
    if (request.method().toUpperCase() === 'GET') {
      await route.fulfill(jsonResponse(EMPTY_MISSION_DECISIONS));
      return;
    }

    await route.fulfill(jsonResponse({ data: { ok: true } }));
  });

  await page.route('**/api/admin/quality/matrix/recalculate', async (route) => {
    const payload = (route.request().postDataJSON() ?? {}) as Partial<RecalculateRequestPayload>;
    const request: RecalculateRequestPayload = {
      scope: (payload.scope as RecalculationScope) ?? 'refresh-required',
      entryId: typeof payload.entryId === 'string' ? payload.entryId : null,
    };
    recalculateRequests.push(request);

    const response =
      typeof options.recalculateResponse === 'function'
        ? await options.recalculateResponse(request)
        : options.recalculateResponse;

    if (response.delayMs && response.delayMs > 0) {
      await wait(response.delayMs);
    }

    await route.fulfill(jsonResponse(response.body, response.status ?? 200));
  });

  await page.route('**/api/admin/quality/matrix**', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.endsWith('/api/admin/quality/matrix')) {
      await route.fallback();
      return;
    }

    await route.fulfill(jsonResponse(MATRIX_SNAPSHOT));
  });

  return { recalculateRequests };
}

async function openAdminQualityPage(page: Page): Promise<void> {
  await seedAuthenticatedSession(page, ADMIN_PROFILE);
  await page.goto('/admin/quality');
  await expect(page).toHaveURL(/\/admin\/quality$/);
  await expect(page.locator('[data-og7="admin-quality-matrix"]')).toBeVisible();
  await expect(page.locator('[data-og7-id="admin-quality-filter-count"]')).toContainText(
    '2 domaines visibles sur 2',
  );
}

test.describe('Admin quality matrix recalculation', () => {
  test('filters the matrix to priority gaps from the quality reactor', async ({ page }) => {
    await mockAdminQualityPageApis(page, {
      recalculateResponse: {
        body: REFRESH_REQUIRED_RECALCULATION,
      },
    });

    await openAdminQualityPage(page);

    const reactor = page.locator('[data-og7="admin-quality-reactor"]');
    await expect(reactor).toBeVisible();
    await expect(reactor).toHaveAttribute('data-reactor-state', 'critical');
    await page.locator('[data-og7-id="admin-quality-reactor-view-gaps"]').click();

    await expect(page.locator('[data-og7-id="admin-quality-filter-count"]')).toContainText(
      '1 domaines visibles sur 2',
    );
  });

  test('recalculates refresh-required rows and exposes the pending state on the CTA', async ({
    page,
  }) => {
    let releasePendingResponse!: () => void;
    const pendingGate = new Promise<void>((resolve) => {
      releasePendingResponse = resolve;
    });

    const { recalculateRequests } = await mockAdminQualityPageApis(page, {
      recalculateResponse: async () => {
        await pendingGate;
        return {
          body: REFRESH_REQUIRED_RECALCULATION,
        };
      },
    });

    await openAdminQualityPage(page);

    const button = page.locator('[data-og7-id="admin-quality-recalculate-matrix"]');
    await expect(button).toHaveText(/Generer le plan QA/i);
    await button.click();

    await expect(button).toBeDisabled();
    await expect(button).toContainText('Analyse en cours...');
    expect(recalculateRequests).toEqual([{ scope: 'refresh-required', entryId: null }]);

    releasePendingResponse();

    await expect(button).toBeEnabled();
    await expect(
      page.locator('[data-og7="admin-quality-matrix-recalculation-summary"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-og7-id="admin-quality-matrix-recalculation-scope"]'),
    ).toHaveText('Entrees a piloter');
    await expect(
      page.locator('[data-og7="admin-quality-matrix-recalculation-summary"]'),
    ).toContainText('Propositions');
    await expect(
      page.locator('[data-og7="admin-quality-matrix-recalculation-summary"]'),
    ).toContainText('1');
    await expect(
      page.locator(
        '[data-og7="admin-quality-coverage-matrix-row"][data-og7-id="advanced-discovery"]',
      ),
    ).toContainText('Refresh matrice');
  });

  test('recalculates the full matrix when the scope is switched to all', async ({ page }) => {
    const { recalculateRequests } = await mockAdminQualityPageApis(page, {
      recalculateResponse: {
        body: ALL_SCOPE_RECALCULATION,
      },
    });

    await openAdminQualityPage(page);

    await page.locator('[data-og7-id="admin-quality-recalculate-scope"]').selectOption('all');
    await page.locator('[data-og7-id="admin-quality-recalculate-matrix"]').click();

    expect(recalculateRequests).toEqual([{ scope: 'all', entryId: null }]);
    await expect(
      page.locator('[data-og7-id="admin-quality-matrix-recalculation-scope"]'),
    ).toHaveText('Portee complete');
    await expect(
      page.locator('[data-og7="admin-quality-matrix-recalculation-summary"]'),
    ).toContainText('Analysees');
    await expect(
      page.locator('[data-og7="admin-quality-matrix-recalculation-summary"]'),
    ).toContainText('2');
  });

  test('uses the active coverage row when the selected-entry scope is requested', async ({
    page,
  }) => {
    const { recalculateRequests } = await mockAdminQualityPageApis(page, {
      recalculateResponse: {
        body: SELECTED_ENTRY_RECALCULATION,
      },
    });

    await openAdminQualityPage(page);

    await page
      .locator('[data-og7-id="admin-quality-recalculate-scope"]')
      .selectOption('selected-entry');
    await page.locator('[data-og7-id="admin-quality-recalculate-matrix"]').click();

    expect(recalculateRequests).toEqual([
      { scope: 'selected-entry', entryId: 'advanced-discovery' },
    ]);
    await expect(
      page.locator('[data-og7-id="admin-quality-matrix-recalculation-scope"]'),
    ).toHaveText('Entree ciblee');
  });

  test('targets the selected matrix row and renders the focused proposal details', async ({
    page,
  }) => {
    const { recalculateRequests } = await mockAdminQualityPageApis(page, {
      recalculateResponse: (payload) => ({
        body:
          payload.entryId === 'trust-validation'
            ? SELECTED_TRUST_RECALCULATION
            : SELECTED_ENTRY_RECALCULATION,
      }),
    });

    await openAdminQualityPage(page);

    await page
      .locator('[data-og7="admin-quality-coverage-matrix-row"][data-og7-id="trust-validation"]')
      .click();
    await page
      .locator('[data-og7-id="admin-quality-recalculate-scope"]')
      .selectOption('selected-entry');
    await page.locator('[data-og7-id="admin-quality-recalculate-matrix"]').click();

    expect(recalculateRequests).toEqual([{ scope: 'selected-entry', entryId: 'trust-validation' }]);
    await expect(
      page.locator('[data-og7-id="admin-quality-matrix-recalculation-scope"]'),
    ).toHaveText('Entree ciblee');
    await expect(
      page.locator(
        '[data-og7="admin-quality-matrix-recalculation-focus"][data-og7-id="trust-validation"]',
      ),
    ).toBeVisible();
    await expect(
      page.locator('[data-og7-id="admin-quality-matrix-recalculation-reasons"]'),
    ).toContainText('La preuve et la matrice restent alignees.');
    await expect(
      page.locator(
        '[data-og7="admin-quality-matrix-recalculation-focus"][data-og7-id="trust-validation"]',
      ),
    ).toContainText('Trust et validation');
  });

  test('surfaces the explicit backend forbidden message returned by the recalculation endpoint', async ({
    page,
  }) => {
    await mockAdminQualityPageApis(page, {
      recalculateResponse: {
        status: 403,
        body: {
          message:
            'Owner/Admin required. Authenticated as e2e.viewer@openg7.test with role editor.',
        },
      },
    });

    await openAdminQualityPage(page);

    const recalculationResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/admin/quality/matrix/recalculate') &&
        response.request().method().toUpperCase() === 'POST',
    );

    const button = page.locator('[data-og7-id="admin-quality-recalculate-matrix"]');
    await button.click();

    const response = await recalculationResponse;
    expect(response.status()).toBe(403);
    await expect(button).toBeEnabled();
    await expect(
      page.locator('[data-og7="admin-quality-matrix-recalculation-summary"]'),
    ).toHaveCount(0);

    await expect
      .poll(async () => await response.json())
      .toEqual({
        message: 'Owner/Admin required. Authenticated as e2e.viewer@openg7.test with role editor.',
      });
  });
});
