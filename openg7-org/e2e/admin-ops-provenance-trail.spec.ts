import './setup';
import { expect, test, type Page } from '@playwright/test';

import { loginAsAuthenticatedE2eUser } from './helpers/auth-session';
import { DEFAULT_PROFILE, mockProfileAndFavoritesApis } from './helpers/domain-mocks';

type AdminOpsEndpoint = 'health' | 'backups' | 'imports' | 'security';

interface MockRouteResponse {
  status?: number;
  body: unknown;
  delayMs?: number;
}

interface AdminOpsScenario {
  health: MockRouteResponse;
  backups: MockRouteResponse;
  imports: MockRouteResponse;
  security: MockRouteResponse;
}

const ADMIN_PROFILE = {
  ...DEFAULT_PROFILE,
  roles: ['admin'],
} as const;

const INITIAL_SNAPSHOT: AdminOpsScenario = {
  health: success({
    generatedAt: '2026-03-14T09:50:00.000Z',
    status: 'ok',
    runtime: { env: 'e2e', nodeVersion: '22.0.0', uptimeSeconds: 86_400 },
    memory: { rssBytes: 256_000_000, heapUsedBytes: 128_000_000, heapTotalBytes: 192_000_000 },
    database: { status: 'ok', users: 42, companies: 18, feedItems: 144 },
  }),
  backups: success({
    generatedAt: '2026-03-14T09:50:00.000Z',
    status: 'ok',
    enabled: true,
    directory: '/var/backups/openg7',
    retentionDays: 14,
    schedule: '0 2 * * *',
    totalFiles: 3,
    totalSizeBytes: 1_234_567,
    lastBackupAt: '2026-03-14T02:00:00.000Z',
    files: [{ name: 'backup-2026-03-14.tar.gz', sizeBytes: 345_678, modifiedAt: '2026-03-14T02:00:00.000Z' }],
  }),
  imports: success({
    generatedAt: '2026-03-14T09:50:00.000Z',
    totalCompanies: 18,
    scannedCompanies: 18,
    truncated: false,
    importedCompanies: 12,
    importsLast24h: 2,
    lastImportAt: '2026-03-14T07:00:00.000Z',
    sources: [{ source: 'manual', count: 7 }],
    recent: [{ id: 'imp-1', businessId: 'QC-7788', name: 'Quebec Battery Alliance', status: 'approved', source: 'manual', importedAt: '2026-03-14T07:00:00.000Z', updatedAt: '2026-03-14T07:00:00.000Z' }],
  }),
  security: success({
    generatedAt: '2026-03-14T09:50:00.000Z',
    users: { total: 42, blocked: 1, registrationsLast7d: 4 },
    sessions: { scannedUsers: 42, truncated: false, active: 18, revoked: 2, usersWithActiveSessions: 12 },
    uploads: { safetyEnabled: true, maxFileSizeBytes: 5_242_880, allowedMimeTypes: ['image/png', 'image/jpeg'] },
    auth: { sessionIdleTimeoutMs: 3_600_000 },
    moderation: { pendingCompanies: 1, suspendedCompanies: 0 },
  }),
};

const REFRESHED_SNAPSHOT: AdminOpsScenario = {
  health: success({
    generatedAt: '2026-04-01T10:15:00.000Z',
    status: 'ok',
    runtime: { env: 'e2e', nodeVersion: '22.1.0', uptimeSeconds: 172_800 },
    memory: { rssBytes: 278_000_000, heapUsedBytes: 136_000_000, heapTotalBytes: 198_000_000 },
    database: { status: 'ok', users: 45, companies: 21, feedItems: 151 },
  }, 150),
  backups: success({
    generatedAt: '2026-04-01T10:15:00.000Z',
    status: 'ok',
    enabled: true,
    directory: '/var/backups/openg7',
    retentionDays: 14,
    schedule: '0 2 * * *',
    totalFiles: 4,
    totalSizeBytes: 2_345_678,
    lastBackupAt: '2026-04-01T09:55:00.000Z',
    files: [{ name: 'backup-2026-04-01.tar.gz', sizeBytes: 456_789, modifiedAt: '2026-04-01T09:55:00.000Z' }],
  }, 150),
  imports: success({
    generatedAt: '2026-04-01T10:15:00.000Z',
    totalCompanies: 21,
    scannedCompanies: 21,
    truncated: false,
    importedCompanies: 15,
    importsLast24h: 4,
    lastImportAt: '2026-04-01T08:10:00.000Z',
    sources: [{ source: 'bulk', count: 8 }, { source: 'manual', count: 7 }],
    recent: [{ id: 'imp-2', businessId: 'ON-9911', name: 'Northern Logistics Network', status: 'approved', source: 'bulk', importedAt: '2026-04-01T08:10:00.000Z', updatedAt: '2026-04-01T08:20:00.000Z' }],
  }, 150),
  security: success({
    generatedAt: '2026-04-01T10:15:00.000Z',
    users: { total: 45, blocked: 0, registrationsLast7d: 5 },
    sessions: { scannedUsers: 45, truncated: false, active: 20, revoked: 2, usersWithActiveSessions: 14 },
    uploads: { safetyEnabled: true, maxFileSizeBytes: 10_485_760, allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf'] },
    auth: { sessionIdleTimeoutMs: 5_400_000 },
    moderation: { pendingCompanies: 2, suspendedCompanies: 0 },
  }, 150),
};

const REFRESH_ERROR_SNAPSHOT: AdminOpsScenario = {
  health: success({
    generatedAt: '2026-04-01T10:30:00.000Z',
    status: 'degraded',
    runtime: { env: 'e2e', nodeVersion: '22.1.0', uptimeSeconds: 176_400 },
    memory: { rssBytes: 280_000_000, heapUsedBytes: 140_000_000, heapTotalBytes: 200_000_000 },
    database: { status: 'ok', users: 45, companies: 21, feedItems: 153 },
  }, 150),
  backups: success({
    generatedAt: '2026-04-01T10:30:00.000Z',
    status: 'ok',
    enabled: true,
    directory: '/var/backups/openg7',
    retentionDays: 14,
    schedule: '0 2 * * *',
    totalFiles: 4,
    totalSizeBytes: 2_456_789,
    lastBackupAt: '2026-04-01T10:00:00.000Z',
    files: [{ name: 'backup-2026-04-01.tar.gz', sizeBytes: 456_789, modifiedAt: '2026-04-01T10:00:00.000Z' }],
  }, 150),
  imports: success({
    generatedAt: '2026-04-01T10:30:00.000Z',
    totalCompanies: 21,
    scannedCompanies: 21,
    truncated: false,
    importedCompanies: 15,
    importsLast24h: 4,
    lastImportAt: '2026-04-01T09:05:00.000Z',
    sources: [{ source: 'bulk', count: 8 }],
    recent: [{ id: 'imp-3', businessId: 'NB-0010', name: 'Atlantic Grid Components', status: 'approved', source: 'bulk', importedAt: '2026-04-01T09:05:00.000Z', updatedAt: '2026-04-01T09:05:00.000Z' }],
  }, 150),
  security: failure('Security snapshot unavailable.', 503, 150),
};

test.describe('Admin ops provenance trail', () => {
  test('updates visible provenance metadata when a refresh succeeds', async ({ page }) => {
    await mockProfileAndFavoritesApis(page, ADMIN_PROFILE);
    await mockAdminOpsSequence(page, [INITIAL_SNAPSHOT, REFRESHED_SNAPSHOT]);

    await loginAsAuthenticatedE2eUser(page, '/admin/ops');

    const trail = page.locator('[data-og7="admin-ops-provenance-trail"]');
    const securityEntry = page.locator('[data-og7="admin-ops-provenance-entry"][data-og7-id="security"]');
    await expect(trail).toBeVisible();
    await expect(page.locator('[data-og7-id="admin-ops-provenance-status"]')).toHaveAttribute('data-og7-state', 'fresh');
    await expect(securityEntry).toHaveAttribute('data-og7-state', 'fresh');
    await expect(securityEntry.locator('[data-og7="admin-ops-provenance-source"]')).toContainText('/api/admin/ops/security');
    await expect(securityEntry.locator('[data-og7="admin-ops-provenance-generated-at"]')).toContainText('2026-03-14');

    await page.locator('[data-og7-id="admin-ops-refresh"]').click();

    await expect(page.locator('[data-og7-id="admin-ops-provenance-status"]')).toHaveAttribute('data-og7-state', 'fresh');
    await expect(securityEntry).toHaveAttribute('data-og7-state', 'fresh');
    await expect(securityEntry.locator('[data-og7="admin-ops-provenance-generated-at"]')).toContainText('2026-04-01');
    await expect(page.locator('[data-og7="admin-ops-provenance-entry"][data-og7-id="imports"] [data-og7="admin-ops-provenance-generated-at"]')).toContainText('2026-04-01');
  });

  test('marks provenance as preserved-last-good when a refresh fails after a valid snapshot', async ({ page }) => {
    await mockProfileAndFavoritesApis(page, ADMIN_PROFILE);
    await mockAdminOpsSequence(page, [INITIAL_SNAPSHOT, REFRESH_ERROR_SNAPSHOT]);

    await loginAsAuthenticatedE2eUser(page, '/admin/ops');

    const securityEntry = page.locator('[data-og7="admin-ops-provenance-entry"][data-og7-id="security"]');
    await expect(securityEntry.locator('[data-og7="admin-ops-provenance-generated-at"]')).toContainText('2026-03-14');

    await page.locator('[data-og7-id="admin-ops-refresh"]').click();

    await expect(page.locator('[data-og7-id="admin-ops-error"]')).toContainText('Security snapshot unavailable.');
    await expect(page.locator('[data-og7-id="admin-ops-provenance-status"]')).toHaveAttribute('data-og7-state', 'preserved-last-good');
    await expect(page.locator('[data-og7-id="admin-ops-provenance-status"]')).toContainText('last successful snapshot');
    await expect(securityEntry).toHaveAttribute('data-og7-state', 'preserved-last-good');
    await expect(securityEntry.locator('[data-og7="admin-ops-provenance-source"]')).toContainText('/api/admin/ops/security');
    await expect(securityEntry.locator('[data-og7="admin-ops-provenance-generated-at"]')).toContainText('2026-03-14');
  });
});

function json(body: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

function success(data: unknown, delayMs = 0): MockRouteResponse {
  return {
    status: 200,
    body: { data },
    delayMs,
  };
}

function failure(message: string, status = 500, delayMs = 0): MockRouteResponse {
  return {
    status,
    body: { message },
    delayMs,
  };
}

async function mockAdminOpsSequence(page: Page, scenarios: readonly AdminOpsScenario[]): Promise<void> {
  const callCounts: Record<AdminOpsEndpoint, number> = {
    health: 0,
    backups: 0,
    imports: 0,
    security: 0,
  };

  const routes: Record<AdminOpsEndpoint, string> = {
    health: '**/api/admin/ops/health',
    backups: '**/api/admin/ops/backups',
    imports: '**/api/admin/ops/imports',
    security: '**/api/admin/ops/security',
  };

  for (const endpoint of Object.keys(routes) as AdminOpsEndpoint[]) {
    await page.route(routes[endpoint], async route => {
      const index = Math.min(callCounts[endpoint], scenarios.length - 1);
      const response = scenarios[index][endpoint];
      callCounts[endpoint] += 1;

      if (response.delayMs && response.delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, response.delayMs));
      }

      await route.fulfill(json(response.body, response.status ?? 200));
    });
  }
}