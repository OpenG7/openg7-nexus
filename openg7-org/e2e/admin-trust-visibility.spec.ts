import './setup';
import { expect, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser } from './helpers/auth-session';
import { DEFAULT_PROFILE, mockProfileAndFavoritesApis } from './helpers/domain-mocks';
import {
  type MutableTrustCompany,
  type VerificationStatus,
  mockTrustLifecycleApis,
} from './helpers/trust-lifecycle-mocks';

test.describe('Admin trust visibility', () => {
  test('persists a trust decision and exposes it on the partner detail surface', async ({
    page,
  }) => {
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
      trustScore: 86,
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
          score: 86,
        },
      ],
    };

    await mockProfileAndFavoritesApis(page, {
      ...DEFAULT_PROFILE,
      roles: ['admin'],
    });
    await mockTrustLifecycleApis(page, company);

    await loginAsAuthenticatedE2eUser(page, '/admin/trust');
    await expect(page.locator('[data-og7="admin-trust"]')).toBeVisible();

    await page.locator('[data-og7-id="admin-trust-company-1001"]').click();
    await expect(page.locator('[data-og7-id="admin-trust-status"]')).toHaveValue('pending');

    await page.locator('[data-og7-id="admin-trust-status"]').selectOption('suspended');

    const newSourceForm = page.locator('[data-og7="admin-trust-new-source"]');
    await newSourceForm.locator('[formcontrolname="name"]').fill('Independent Audit Desk');
    await newSourceForm.locator('[formcontrolname="type"]').selectOption('audit');
    await newSourceForm.locator('[formcontrolname="status"]').selectOption('revoked');
    await newSourceForm.locator('[formcontrolname="referenceId"]').fill('AUD-2026-04');
    await newSourceForm
      .locator('[formcontrolname="notes"]')
      .fill('Verification badge suspended pending corrective review.');
    await newSourceForm.getByRole('button', { name: 'Add source' }).click();

    const newHistoryForm = page.locator('[data-og7="admin-trust-new-history"]');
    await newHistoryForm.locator('[formcontrolname="label"]').fill('Corrective action review');
    await newHistoryForm.locator('[formcontrolname="type"]').selectOption('evaluation');
    await newHistoryForm.locator('[formcontrolname="direction"]').selectOption('inbound');
    await newHistoryForm.locator('[formcontrolname="occurredAt"]').fill('2026-04-01');
    await newHistoryForm.locator('[formcontrolname="score"]').fill('61');
    await newHistoryForm
      .locator('[formcontrolname="notes"]')
      .fill('Operations team requested remediation evidence.');
    await newHistoryForm.getByRole('button', { name: 'Add entry' }).click();

    const [saveRequest, saveResponse] = await Promise.all([
      page.waitForRequest(
        (request) =>
          request.method().toUpperCase() === 'PUT' && request.url().includes('/api/companies/1001'),
      ),
      page.waitForResponse(
        (response) =>
          response.request().method().toUpperCase() === 'PUT' &&
          response.url().includes('/api/companies/1001'),
      ),
      page.locator('[data-og7-id="admin-trust-save"]').click(),
    ]);

    const savePayload = saveRequest.postDataJSON() as {
      data?: {
        verificationStatus?: VerificationStatus;
        verificationSources?: Array<{ name?: string; status?: string; referenceId?: string }>;
        trustHistory?: Array<{ label?: string; score?: number; occurredAt?: string }>;
      };
    };

    expect(saveResponse.status()).toBe(200);
    expect(savePayload.data?.verificationStatus).toBe('suspended');
    expect(savePayload.data?.verificationSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Independent Audit Desk',
          status: 'revoked',
          referenceId: 'AUD-2026-04',
        }),
      ]),
    );
    expect(savePayload.data?.trustHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Corrective action review',
          score: 61,
          occurredAt: '2026-04-01',
        }),
      ]),
    );

    await page.goto('/partners/1001?role=supplier');
    await expect(page.locator('og7-partner-details-panel')).toBeVisible();

    const trustPanel = page.locator('[data-og7="partner-trust"]');
    const statusBadge = page.locator('[data-og7-id="partner-trust-status"]');
    await expect(trustPanel).toBeVisible();
    await expect(statusBadge).toHaveAttribute('data-og7-state', 'suspended');
    await expect(trustPanel).toContainText('61%');
    await expect(trustPanel).toContainText('Independent Audit Desk');
    await expect(trustPanel).toContainText('Revoked');
    await expect(trustPanel).toContainText('Corrective action review');
  });

  test('supports correction-request and rejection decisions with public review visibility', async ({
    page,
  }) => {
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
      trustScore: 78,
      verificationSources: [
        {
          id: 1,
          name: 'Ontario registry',
          type: 'registry',
          status: 'pending',
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
          score: 78,
        },
      ],
    };

    await mockProfileAndFavoritesApis(page, {
      ...DEFAULT_PROFILE,
      roles: ['admin'],
    });
    await mockTrustLifecycleApis(page, company);

    await loginAsAuthenticatedE2eUser(page, '/admin/trust');
    await expect(page.locator('[data-og7="admin-trust"]')).toBeVisible();

    await page.locator('[data-og7-id="admin-trust-company-1001"]').click();
    await page.locator('[data-og7-id="admin-trust-quick-correction"]').click();
    await page
      .locator('[data-og7-id="admin-trust-review-note"]')
      .fill('Provide renewed chamber certificate and insurance evidence.');

    const [correctionRequest, correctionResponse] = await Promise.all([
      page.waitForRequest(
        (request) =>
          request.method().toUpperCase() === 'PUT' && request.url().includes('/api/companies/1001'),
      ),
      page.waitForResponse(
        (response) =>
          response.request().method().toUpperCase() === 'PUT' &&
          response.url().includes('/api/companies/1001'),
      ),
      page.locator('[data-og7-id="admin-trust-save"]').click(),
    ]);

    const correctionPayload = correctionRequest.postDataJSON() as {
      data?: {
        verificationStatus?: VerificationStatus;
        trustHistory?: Array<{ label?: string; notes?: string; occurredAt?: string }>;
      };
    };

    expect(correctionResponse.status()).toBe(200);
    expect(correctionPayload.data?.verificationStatus).toBe('correctionRequested');
    expect(correctionPayload.data?.trustHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Corrections requested',
          notes: 'Provide renewed chamber certificate and insurance evidence.',
        }),
      ]),
    );

    await page.goto('/partners/1001?role=supplier');
    const statusBadge = page.locator('[data-og7-id="partner-trust-status"]');
    const reviewDecision = page.locator('[data-og7="partner-trust-review-decision"]');
    await expect(statusBadge).toHaveAttribute('data-og7-state', 'correctionRequested');
    await expect(reviewDecision).toContainText('Corrections requested');
    await expect(reviewDecision).toContainText(
      'Provide renewed chamber certificate and insurance evidence.',
    );

    await page.goto('/admin/trust');
    await page.locator('[data-og7-id="admin-trust-company-1001"]').click();
    await page.locator('[data-og7-id="admin-trust-quick-reject"]').click();
    await page
      .locator('[data-og7-id="admin-trust-review-note"]')
      .fill('Submission rejected because incorporation documents remain expired.');

    const [rejectionRequest, rejectionResponse] = await Promise.all([
      page.waitForRequest(
        (request) =>
          request.method().toUpperCase() === 'PUT' && request.url().includes('/api/companies/1001'),
      ),
      page.waitForResponse(
        (response) =>
          response.request().method().toUpperCase() === 'PUT' &&
          response.url().includes('/api/companies/1001'),
      ),
      page.locator('[data-og7-id="admin-trust-save"]').click(),
    ]);

    const rejectionPayload = rejectionRequest.postDataJSON() as {
      data?: {
        verificationStatus?: VerificationStatus;
        trustHistory?: Array<{ label?: string; notes?: string; occurredAt?: string }>;
      };
    };

    expect(rejectionResponse.status()).toBe(200);
    expect(rejectionPayload.data?.verificationStatus).toBe('rejected');
    expect(rejectionPayload.data?.trustHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Verification rejected',
          notes: 'Submission rejected because incorporation documents remain expired.',
        }),
      ]),
    );

    await page.goto('/partners/1001?role=supplier');
    await expect(statusBadge).toHaveAttribute('data-og7-state', 'rejected');
    await expect(reviewDecision).toContainText('Verification rejected');
    await expect(reviewDecision).toContainText(
      'Submission rejected because incorporation documents remain expired.',
    );
  });
});
