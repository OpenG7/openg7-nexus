import './setup';
import { expect, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser } from './helpers/auth-session';
import { DEFAULT_PROFILE, mockProfileAndFavoritesApis } from './helpers/domain-mocks';

type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'correctionRequested'
  | 'rejected'
  | 'suspended';
type VerificationSourceStatus = 'pending' | 'validated' | 'revoked';
type VerificationSourceType = 'registry' | 'chamber' | 'audit' | 'other';
type TrustRecordType = 'transaction' | 'evaluation';
type TrustDirection = 'inbound' | 'outbound';

interface VerificationSource {
  id?: number | null;
  name: string;
  type: VerificationSourceType;
  status: VerificationSourceStatus;
  referenceId?: string | null;
  url?: string | null;
  evidenceUrl?: string | null;
  issuedAt?: string | null;
  lastCheckedAt?: string | null;
  notes?: string | null;
}

interface TrustRecord {
  id?: number | null;
  label: string;
  type: TrustRecordType;
  direction: TrustDirection;
  occurredAt: string;
  amount?: number | null;
  score?: number | null;
  notes?: string | null;
}

interface MutableTrustCompany {
  id: number;
  name: string;
  description: string | null;
  website: string | null;
  status: 'pending' | 'approved' | 'suspended';
  country: string | null;
  sector: { id: number; name: string };
  province: { id: number; name: string; code: string };
  verificationStatus: VerificationStatus;
  trustScore: number;
  verificationSources: VerificationSource[];
  trustHistory: TrustRecord[];
}

function json(body: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

function mapCompanyToStrapi(company: MutableTrustCompany) {
  return {
    id: company.id,
    attributes: {
      name: company.name,
      description: company.description,
      website: company.website,
      status: company.status,
      capacities: [],
      logoUrl: null,
      secondaryLogoUrl: null,
      country: company.country,
      verificationStatus: company.verificationStatus,
      verificationSources: company.verificationSources,
      trustScore: company.trustScore,
      trustHistory: company.trustHistory,
      sector: {
        data: {
          id: company.sector.id,
          attributes: {
            name: company.sector.name,
          },
        },
      },
      province: {
        data: {
          id: company.province.id,
          attributes: {
            name: company.province.name,
          },
        },
      },
    },
  };
}

function mapSector(name: string): 'energy' | 'manufacturing' | 'services' {
  const normalized = name.trim().toLowerCase();
  if (normalized === 'advanced manufacturing') {
    return 'manufacturing';
  }
  if (normalized === 'energy') {
    return 'energy';
  }
  return 'services';
}

function mapPartnerProfile(company: MutableTrustCompany) {
  return {
    data: {
      id: company.id,
      attributes: {
        legalName: company.name,
        displayName: company.name,
        role: 'supplier',
        sector: mapSector(company.sector.name),
        province: company.province.code,
        website: company.website,
        mission: {
          fr: "Surface publique de confiance synchronisee depuis l'admin.",
          en: 'Public trust surface synchronized from admin data.',
        },
        highlights: ['Cross-province resilience operator'],
        verificationStatus: company.verificationStatus,
        trustScore: company.trustScore,
        verificationSources: company.verificationSources,
        trustHistory: company.trustHistory,
      },
    },
  };
}

function recomputeTrustScore(status: VerificationStatus, history: readonly TrustRecord[]): number {
  const latestScore = history.find((entry) => typeof entry.score === 'number')?.score ?? null;
  if (status === 'rejected') {
    return latestScore != null ? Math.min(45, Math.round(latestScore)) : 38;
  }
  if (status === 'correctionRequested') {
    return latestScore != null ? Math.min(76, Math.round(latestScore)) : 72;
  }
  if (status === 'suspended') {
    return 61;
  }
  if (status === 'verified') {
    return latestScore != null ? Math.max(88, Math.round(latestScore)) : 92;
  }
  if (status === 'pending') {
    return latestScore != null ? Math.min(86, Math.round(latestScore)) : 78;
  }
  return latestScore != null ? Math.max(40, Math.round(latestScore)) : 50;
}

async function mockAdminTrustLifecycleApis(page: Parameters<typeof test>[0]['page'], company: MutableTrustCompany) {
  await page.route('**/api/companies**', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    const path = url.pathname.toLowerCase();
    const companyIdMatch = path.match(/\/api\/companies\/(\d+)\/?$/i);
    const companyId = companyIdMatch ? Number(companyIdMatch[1]) : null;

    if (method === 'GET' && companyId == null) {
      await route.fulfill(json({ data: [mapCompanyToStrapi(company)], meta: {} }));
      return;
    }

    if (method === 'PUT' && companyId === company.id) {
      const payload = (request.postDataJSON?.() ?? {}) as {
        data?: {
          verificationStatus?: VerificationStatus;
          verificationSources?: VerificationSource[];
          trustHistory?: TrustRecord[];
        };
      };

      const next = payload.data ?? {};
      company.verificationStatus = next.verificationStatus ?? company.verificationStatus;
      company.verificationSources = Array.isArray(next.verificationSources)
        ? next.verificationSources.map((entry, index) => ({
            id: entry.id ?? index + 1,
            ...entry,
          }))
        : company.verificationSources;
      company.trustHistory = Array.isArray(next.trustHistory)
        ? next.trustHistory.map((entry, index) => ({
            id: entry.id ?? index + 1,
            ...entry,
          }))
        : company.trustHistory;
      company.trustScore = recomputeTrustScore(company.verificationStatus, company.trustHistory);

      await route.fulfill(json({ data: mapCompanyToStrapi(company) }));
      return;
    }

    await route.fulfill(json({ message: 'Unhandled companies route' }, 404));
  });

  await page.route(`**/api/partner-profiles/${company.id}**`, async (route) => {
    await route.fulfill(json(mapPartnerProfile(company)));
  });
}

test.describe('Company or partner enrichment lifecycle', () => {
  test('persists a richer trust-enrichment lifecycle across admin reload and partner reopen', async ({ page }) => {
    const company: MutableTrustCompany = {
      id: 1001,
      name: 'Northern Grid Systems',
      description: 'Provincial grid operator and energy resilience partner.',
      website: 'https://northern-grid.example.test',
      status: 'pending',
      country: 'CA',
      sector: { id: 1, name: 'Energy' },
      province: { id: 10, name: 'Ontario', code: 'ON' },
      verificationStatus: 'pending',
      trustScore: 84,
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
          label: 'Initial diligence review',
          type: 'evaluation',
          direction: 'inbound',
          occurredAt: '2026-01-05',
          score: 84,
          notes: 'Baseline review completed before public exposure.',
        },
      ],
    };

    await mockProfileAndFavoritesApis(page, {
      ...DEFAULT_PROFILE,
      roles: ['admin'],
    });
    await mockAdminTrustLifecycleApis(page, company);

    await loginAsAuthenticatedE2eUser(page, '/admin/trust');
    await expect(page.locator('[data-og7="admin-trust"]')).toBeVisible();

    await page.locator('[data-og7-id="admin-trust-company-1001"]').click();
    await page.locator('[data-og7-id="admin-trust-quick-correction"]').click();
    await page
      .locator('[data-og7-id="admin-trust-review-note"]')
      .fill('Provide renewed chamber certificate and updated grid compliance memo.');

    const newSourceForm = page.locator('[data-og7="admin-trust-new-source"]');
    await newSourceForm.locator('[formcontrolname="name"]').fill('Independent Audit Desk');
    await newSourceForm.locator('[formcontrolname="type"]').selectOption('audit');
    await newSourceForm.locator('[formcontrolname="status"]').selectOption('revoked');
    await newSourceForm.locator('[formcontrolname="referenceId"]').fill('AUD-2026-04');
    await newSourceForm.locator('[formcontrolname="notes"]').fill('Badge suspended until corrective evidence is reviewed.');
    await newSourceForm.getByRole('button', { name: 'Add source' }).click();

    const newHistoryForm = page.locator('[data-og7="admin-trust-new-history"]');
    await newHistoryForm.locator('[formcontrolname="label"]').fill('Corrective action review');
    await newHistoryForm.locator('[formcontrolname="type"]').selectOption('evaluation');
    await newHistoryForm.locator('[formcontrolname="direction"]').selectOption('inbound');
    await newHistoryForm.locator('[formcontrolname="occurredAt"]').fill('2026-04-01');
    await newHistoryForm.locator('[formcontrolname="score"]').fill('63');
    await newHistoryForm.locator('[formcontrolname="notes"]').fill('Operations team requested remediation evidence.');
    await newHistoryForm.getByRole('button', { name: 'Add entry' }).click();

    const [correctionRequest, correctionResponse] = await Promise.all([
      page.waitForRequest(
        (request) => request.method().toUpperCase() === 'PUT' && request.url().includes('/api/companies/1001')
      ),
      page.waitForResponse(
        (response) =>
          response.request().method().toUpperCase() === 'PUT' && response.url().includes('/api/companies/1001')
      ),
      page.locator('[data-og7-id="admin-trust-save"]').click(),
    ]);

    const correctionPayload = correctionRequest.postDataJSON() as {
      data?: {
        verificationStatus?: VerificationStatus;
        verificationSources?: Array<{ name?: string; status?: string; referenceId?: string }>;
        trustHistory?: Array<{ label?: string; notes?: string; occurredAt?: string }>;
      };
    };

    expect(correctionResponse.status()).toBe(200);
    expect(correctionPayload.data?.verificationStatus).toBe('correctionRequested');
    expect(correctionPayload.data?.verificationSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Independent Audit Desk',
          status: 'revoked',
          referenceId: 'AUD-2026-04',
        }),
      ])
    );
    expect(correctionPayload.data?.trustHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Corrective action review',
          notes: 'Operations team requested remediation evidence.',
          occurredAt: '2026-04-01',
        }),
        expect.objectContaining({
          label: 'Corrections requested',
          notes: 'Provide renewed chamber certificate and updated grid compliance memo.',
        }),
      ])
    );

    await page.reload();
    await expect(page.locator('[data-og7="admin-trust"]')).toBeVisible();
    await page.locator('[data-og7-id="admin-trust-company-1001"]').click();

    await expect(page.locator('[data-og7-id="admin-trust-status"]')).toHaveValue('correctionRequested');
    await expect(page.locator('[data-og7-id="admin-trust-company-1001"]')).toContainText('Correction requested');
    await expect(page.locator('text=Independent Audit Desk')).toBeVisible();

    const sourceCard = page.locator('li').filter({ hasText: 'Independent Audit Desk' }).first();
    await sourceCard.locator('select').nth(1).selectOption('validated');
    await page.locator('[data-og7-id="admin-trust-quick-verify"]').click();
    await page
      .locator('[data-og7-id="admin-trust-review-note"]')
      .fill('Renewed evidence package approved after corrective review.');

    const [approvalRequest, approvalResponse] = await Promise.all([
      page.waitForRequest(
        (request) => request.method().toUpperCase() === 'PUT' && request.url().includes('/api/companies/1001')
      ),
      page.waitForResponse(
        (response) =>
          response.request().method().toUpperCase() === 'PUT' && response.url().includes('/api/companies/1001')
      ),
      page.locator('[data-og7-id="admin-trust-save"]').click(),
    ]);

    const approvalPayload = approvalRequest.postDataJSON() as {
      data?: {
        verificationStatus?: VerificationStatus;
        verificationSources?: Array<{ name?: string; status?: string }>;
        trustHistory?: Array<{ label?: string; notes?: string }>;
      };
    };

    expect(approvalResponse.status()).toBe(200);
    expect(approvalPayload.data?.verificationStatus).toBe('verified');
    expect(approvalPayload.data?.verificationSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Independent Audit Desk',
          status: 'validated',
        }),
      ])
    );
    expect(approvalPayload.data?.trustHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Verification approved',
          notes: 'Renewed evidence package approved after corrective review.',
        }),
      ])
    );

    await page.goto('/partners/1001?role=supplier');
    const trustPanel = page.locator('[data-og7="partner-trust"]');
    const statusBadge = page.locator('[data-og7-id="partner-trust-status"]');
    const reviewDecision = page.locator('[data-og7="partner-trust-review-decision"]');

    await expect(trustPanel).toBeVisible();
    await expect(statusBadge).toHaveAttribute('data-og7-state', 'verified');
    await expect(trustPanel).toContainText('88%');
    await expect(reviewDecision).toContainText('Verification approved');
    await expect(reviewDecision).toContainText('Renewed evidence package approved after corrective review.');
    await expect(page.locator('[data-og7="partner-trust-source-item"]').filter({ hasText: 'Independent Audit Desk' })).toContainText(
      'Validated'
    );
    await expect(page.locator('[data-og7="partner-trust-history-item"]').filter({ hasText: 'Corrective action review' })).toBeVisible();
    await expect(page.locator('[data-og7="partner-trust-history-item"]').filter({ hasText: 'Verification approved' })).toBeVisible();

    await page.reload();

    await expect(trustPanel).toBeVisible();
    await expect(statusBadge).toHaveAttribute('data-og7-state', 'verified');
    await expect(reviewDecision).toContainText('Verification approved');
    await expect(reviewDecision).toContainText('Renewed evidence package approved after corrective review.');
    await expect(page.locator('[data-og7="partner-trust-source-item"]').filter({ hasText: 'Independent Audit Desk' })).toContainText(
      'Validated'
    );
  });
});