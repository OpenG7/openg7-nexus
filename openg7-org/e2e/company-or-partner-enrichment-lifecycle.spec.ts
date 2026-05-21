import './setup';
import { expect, test, type Page, type Request, type Response } from '@playwright/test';

import { loginAsAuthenticatedE2eUser } from './helpers/auth-session';
import { DEFAULT_PROFILE, mockProfileAndFavoritesApis } from './helpers/domain-mocks';
import {
  type MutableTrustCompany,
  type TrustDirection,
  type TrustRecordType,
  type VerificationStatus,
  type VerificationSourceStatus,
  type VerificationSourceType,
  mockTrustLifecycleApis,
} from './helpers/trust-lifecycle-mocks';

const COMPANY_ID = 1001;

interface NewVerificationSourceFormValue {
  name: string;
  type: VerificationSourceType;
  status: VerificationSourceStatus;
  referenceId?: string;
  url?: string;
  evidenceUrl?: string;
  issuedAt?: string;
  lastCheckedAt?: string;
  notes?: string;
}

interface NewTrustHistoryFormValue {
  label: string;
  type: TrustRecordType;
  direction: TrustDirection;
  occurredAt: string;
  amount?: string;
  score?: string;
  notes?: string;
}

interface TrustSaveResult {
  request: Request;
  response: Response;
}

function isCompanyUpdateRequest(request: Request, companyId = COMPANY_ID): boolean {
  return (
    request.method().toUpperCase() === 'PUT' &&
    request.url().includes(`/api/companies/${companyId}`)
  );
}

function isCompanyUpdateResponse(response: Response, companyId = COMPANY_ID): boolean {
  return isCompanyUpdateRequest(response.request(), companyId);
}

async function saveTrustChanges(page: Page, companyId = COMPANY_ID): Promise<TrustSaveResult> {
  const [request, response] = await Promise.all([
    page.waitForRequest((candidate) => isCompanyUpdateRequest(candidate, companyId)),
    page.waitForResponse((candidate) => isCompanyUpdateResponse(candidate, companyId)),
    page.locator('[data-og7-id="admin-trust-save"]').click(),
  ]);

  return { request, response };
}

function adminCompanyItem(page: Page, companyId = COMPANY_ID) {
  return page.locator(`[data-og7-id="admin-trust-company-${companyId}"]`);
}

async function selectAdminCompany(page: Page, companyId = COMPANY_ID): Promise<void> {
  await adminCompanyItem(page, companyId).click();
}

async function addVerificationSource(
  page: Page,
  source: NewVerificationSourceFormValue,
): Promise<void> {
  const form = page.locator('[data-og7="admin-trust-new-source"]');
  await form.locator('[formcontrolname="name"]').fill(source.name);
  await form.locator('[formcontrolname="type"]').selectOption(source.type);
  await form.locator('[formcontrolname="status"]').selectOption(source.status);

  for (const [field, value] of Object.entries({
    referenceId: source.referenceId,
    url: source.url,
    evidenceUrl: source.evidenceUrl,
    issuedAt: source.issuedAt,
    lastCheckedAt: source.lastCheckedAt,
    notes: source.notes,
  })) {
    if (value) {
      await form.locator(`[formcontrolname="${field}"]`).fill(value);
    }
  }

  await form.getByRole('button', { name: 'Add source' }).click();
}

async function addTrustHistoryEntry(
  page: Page,
  entry: NewTrustHistoryFormValue,
): Promise<void> {
  const form = page.locator('[data-og7="admin-trust-new-history"]');
  await form.locator('[formcontrolname="label"]').fill(entry.label);
  await form.locator('[formcontrolname="type"]').selectOption(entry.type);
  await form.locator('[formcontrolname="direction"]').selectOption(entry.direction);
  await form.locator('[formcontrolname="occurredAt"]').fill(entry.occurredAt);

  for (const [field, value] of Object.entries({
    amount: entry.amount,
    score: entry.score,
    notes: entry.notes,
  })) {
    if (value) {
      await form.locator(`[formcontrolname="${field}"]`).fill(value);
    }
  }

  await form.getByRole('button', { name: 'Add entry' }).click();
}

test.describe('Company or partner enrichment lifecycle', () => {
  test('persists a richer trust-enrichment lifecycle across admin reload and partner reopen', async ({
    page,
  }) => {
    const company: MutableTrustCompany = {
      id: COMPANY_ID,
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
    const trustApis = await mockTrustLifecycleApis(page, company);

    await loginAsAuthenticatedE2eUser(page, `/partners/${COMPANY_ID}?role=supplier`);
    await expect(page.locator('[data-og7="partner-trust"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="partner-trust-status"]')).toHaveAttribute(
      'data-og7-state',
      'pending',
    );
    await expect(page.locator('[data-og7-id="partner-trust-score"]')).toContainText('84%');

    await page.goto('/admin/trust');
    await expect(page.locator('[data-og7="admin-trust"]')).toBeVisible();

    await selectAdminCompany(page);
    await page.locator('[data-og7-id="admin-trust-quick-suspend"]').click();
    await page
      .locator('[data-og7-id="admin-trust-review-note"]')
      .fill('Temporary network failure should preserve this decision note.');

    trustApis.failNextCompanyUpdate(500);
    const { response: failedSaveResponse } = await saveTrustChanges(page);

    expect(failedSaveResponse.status()).toBe(500);
    await expect(
      page.locator('[data-og7="notification-toast"][data-og7-id="error"]').last(),
    ).toBeVisible();
    await expect(page.locator('[data-og7-id="admin-trust-save"]')).toBeEnabled();
    await expect(page.locator('[data-og7-id="admin-trust-status"]')).toHaveValue('suspended');
    await expect(page.locator('[data-og7-id="admin-trust-review-note"]')).toHaveValue(
      'Temporary network failure should preserve this decision note.',
    );

    await page.locator('[data-og7-id="admin-trust-quick-correction"]').click();
    await page.locator('[data-og7-id="admin-trust-profile-quick-review"]').click();
    await page
      .locator('[data-og7-id="admin-trust-review-note"]')
      .fill('Provide renewed chamber certificate and updated grid compliance memo.');
    await page
      .locator('[data-og7-id="admin-trust-profile-note"]')
      .fill('Profile update package reopened to align new evidence and partner-facing copy.');

    await addVerificationSource(page, {
      name: 'Independent Audit Desk',
      type: 'audit',
      status: 'revoked',
      referenceId: 'AUD-2026-04',
      url: 'https://audit.example.test/source/AUD-2026-04',
      evidenceUrl: 'https://audit.example.test/evidence/AUD-2026-04.pdf',
      issuedAt: '2026-04-02',
      lastCheckedAt: '2026-04-04',
      notes: 'Badge suspended until corrective evidence is reviewed.',
    });
    await addTrustHistoryEntry(page, {
      label: 'Corrective action review',
      type: 'evaluation',
      direction: 'inbound',
      occurredAt: '2026-04-01',
      score: '63',
      notes: 'Operations team requested remediation evidence.',
    });

    const { request: correctionRequest, response: correctionResponse } =
      await saveTrustChanges(page);

    const correctionPayload = correctionRequest.postDataJSON() as {
      data?: {
        verificationStatus?: VerificationStatus;
        verificationSources?: Array<{
          name?: string;
          status?: string;
          referenceId?: string;
          url?: string | null;
          evidenceUrl?: string | null;
          issuedAt?: string | null;
          lastCheckedAt?: string | null;
        }>;
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
          url: 'https://audit.example.test/source/AUD-2026-04',
          evidenceUrl: 'https://audit.example.test/evidence/AUD-2026-04.pdf',
          issuedAt: '2026-04-02',
          lastCheckedAt: '2026-04-04',
        }),
      ]),
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
        expect.objectContaining({
          label: 'Profile evolution: Edit under review',
          notes: 'Profile update package reopened to align new evidence and partner-facing copy.',
        }),
      ]),
    );

    await page.reload();
    await expect(page.locator('[data-og7="admin-trust"]')).toBeVisible();
    await selectAdminCompany(page);

    await expect(page.locator('[data-og7-id="admin-trust-status"]')).toHaveValue(
      'correctionRequested',
    );
    await expect(page.locator('[data-og7-id="admin-trust-profile-status"]')).toHaveValue(
      'reviewing',
    );
    await expect(adminCompanyItem(page)).toContainText('Correction requested');
    await expect(adminCompanyItem(page)).toContainText('63%');
    await expect(page.locator('[data-og7="admin-trust-profile-trace"]')).toContainText(
      'Profile evolution: Edit under review',
    );
    await expect(page.locator('[data-og7="admin-trust-profile-trace"]')).toContainText(
      'Profile update package reopened to align new evidence and partner-facing copy.',
    );
    await expect(page.locator('text=Independent Audit Desk')).toBeVisible();

    const sourceCard = page
      .locator('[data-og7="admin-trust-source-item"]')
      .filter({ hasText: 'Independent Audit Desk' })
      .first();
    await expect(sourceCard).toHaveAttribute('data-og7-state', 'revoked');
    await expect(sourceCard).toHaveAttribute('data-og7-type', 'audit');
    const correctiveHistory = page
      .locator('[data-og7="admin-trust-history-item"][data-og7-label="Corrective action review"]')
      .first();
    await expect(correctiveHistory).toHaveAttribute('data-og7-type', 'evaluation');
    await expect(correctiveHistory).toHaveAttribute('data-og7-direction', 'inbound');
    await sourceCard.locator('[data-og7-id="admin-trust-source-status"]').selectOption('validated');
    await expect(sourceCard).toHaveAttribute('data-og7-state', 'validated');
    await page.locator('[data-og7-id="admin-trust-quick-verify"]').click();
    await page.locator('[data-og7-id="admin-trust-profile-quick-sync"]').click();
    await page
      .locator('[data-og7-id="admin-trust-review-note"]')
      .fill('Renewed evidence package approved after corrective review.');
    await page
      .locator('[data-og7-id="admin-trust-profile-note"]')
      .fill('Company and partner surfaces refreshed with the corrected proof bundle.');

    const { request: approvalRequest, response: approvalResponse } = await saveTrustChanges(page);

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
      ]),
    );
    expect(approvalPayload.data?.trustHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Verification approved',
          notes: 'Renewed evidence package approved after corrective review.',
        }),
        expect.objectContaining({
          label: 'Profile evolution: Edit synced',
          notes: 'Company and partner surfaces refreshed with the corrected proof bundle.',
        }),
      ]),
    );

    await page.locator('[data-og7-id="admin-trust-quick-publish"]').click();
    await page
      .locator('[data-og7-id="admin-trust-review-note"]')
      .fill('Profile approved for public discovery after trust verification cleared.');

    const { request: publicationRequest, response: publicationResponse } =
      await saveTrustChanges(page);

    const publicationPayload = publicationRequest.postDataJSON() as {
      data?: {
        status?: MutableTrustCompany['status'];
        trustHistory?: Array<{ label?: string; notes?: string }>;
      };
    };

    expect(publicationResponse.status()).toBe(200);
    expect(publicationPayload.data?.status).toBe('approved');
    expect(publicationPayload.data?.trustHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Publication approved',
          notes: 'Profile approved for public discovery after trust verification cleared.',
        }),
      ]),
    );

    await page.reload();
    await expect(page.locator('[data-og7="admin-trust"]')).toBeVisible();
    await selectAdminCompany(page);
    await expect(page.locator('[data-og7-id="admin-trust-publication-status"]')).toHaveValue(
      'approved',
    );
    await expect(page.locator('[data-og7-id="admin-trust-profile-status"]')).toHaveValue('synced');
    await expect(adminCompanyItem(page)).toContainText('Published');

    await page.goto(`/partners/${COMPANY_ID}?role=supplier`);
    const trustPanel = page.locator('[data-og7="partner-trust"]');
    const publicationLifecycle = page.locator('[data-og7="partner-publication-lifecycle"]');
    const profileLifecycle = page.locator('[data-og7="partner-profile-lifecycle"]');
    const profileStatus = page.locator('[data-og7-id="partner-profile-status"]');
    const profileTrace = page.locator('[data-og7="partner-profile-trace"]');
    const publicationStatus = page.locator('[data-og7-id="partner-publication-status"]');
    const publicationTrace = page.locator('[data-og7="partner-publication-trace"]');
    const statusBadge = page.locator('[data-og7-id="partner-trust-status"]');
    const reviewDecision = page.locator('[data-og7="partner-trust-review-decision"]');

    await expect(trustPanel).toBeVisible();
    await expect(publicationLifecycle).toBeVisible();
    await expect(profileLifecycle).toBeVisible();
    await expect(profileStatus).toHaveAttribute('data-og7-state', 'synced');
    await expect(page.locator('[data-og7-id="partner-profile-summary"]')).toContainText(
      /durably synced across partner surfaces|synchronisée durablement sur les surfaces partenaire/,
    );
    await expect(profileTrace).toContainText('Profile evolution: Edit synced');
    await expect(profileTrace).toContainText(
      'Company and partner surfaces refreshed with the corrected proof bundle.',
    );
    await expect(publicationStatus).toHaveAttribute('data-og7-state', 'approved');
    await expect(page.locator('[data-og7-id="partner-publication-summary"]')).toContainText(
      /visible across public discovery and partner surfaces|visible sur les surfaces de découverte publique et partenaire/,
    );
    await expect(publicationTrace).toContainText('Publication approved');
    await expect(publicationTrace).toContainText(
      'Profile approved for public discovery after trust verification cleared.',
    );
    await expect(statusBadge).toHaveAttribute('data-og7-state', 'verified');
    await expect(trustPanel).toContainText('88%');
    await expect(reviewDecision).toContainText('Verification approved');
    await expect(reviewDecision).toContainText(
      'Renewed evidence package approved after corrective review.',
    );
    expect(trustApis.partnerProfileRequests()).toBeGreaterThanOrEqual(2);
    const partnerAuditSource = page
      .locator('[data-og7="partner-trust-source-item"]')
      .filter({ hasText: 'Independent Audit Desk' });
    await expect(partnerAuditSource).toHaveAttribute('data-og7-state', 'validated');
    await expect(partnerAuditSource).toContainText('AUD-2026-04');
    await expect(partnerAuditSource).toContainText(
      'Badge suspended until corrective evidence is reviewed.',
    );
    await expect(
      partnerAuditSource.locator('a[href="https://audit.example.test/source/AUD-2026-04"]'),
    ).toHaveCount(1);
    await expect(
      partnerAuditSource.locator(
        'a[href="https://audit.example.test/evidence/AUD-2026-04.pdf"]',
      ),
    ).toHaveCount(1);
    await expect(
      page
        .locator('[data-og7="partner-trust-history-item"]')
        .filter({ hasText: 'Corrective action review' }),
    ).toBeVisible();
    await expect(
      page
        .locator('[data-og7="partner-trust-history-item"]')
        .filter({ hasText: 'Verification approved' }),
    ).toBeVisible();

    await page.reload();

    await expect(trustPanel).toBeVisible();
    await expect(profileStatus).toHaveAttribute('data-og7-state', 'synced');
    await expect(profileTrace).toContainText('Profile evolution: Edit synced');
    await expect(profileTrace).toContainText(
      'Company and partner surfaces refreshed with the corrected proof bundle.',
    );
    await expect(publicationStatus).toHaveAttribute('data-og7-state', 'approved');
    await expect(publicationTrace).toContainText('Publication approved');
    await expect(publicationTrace).toContainText(
      'Profile approved for public discovery after trust verification cleared.',
    );
    await expect(statusBadge).toHaveAttribute('data-og7-state', 'verified');
    await expect(reviewDecision).toContainText('Verification approved');
    await expect(reviewDecision).toContainText(
      'Renewed evidence package approved after corrective review.',
    );
    await expect(
      page
        .locator('[data-og7="partner-trust-source-item"]')
        .filter({ hasText: 'Independent Audit Desk' }),
    ).toHaveAttribute('data-og7-state', 'validated');
  });
});
