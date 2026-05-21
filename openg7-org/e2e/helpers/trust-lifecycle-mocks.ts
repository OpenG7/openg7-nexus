import type { Page } from '@playwright/test';

export type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'correctionRequested'
  | 'rejected'
  | 'suspended';
export type VerificationSourceStatus = 'pending' | 'validated' | 'revoked';
export type VerificationSourceType = 'registry' | 'chamber' | 'audit' | 'other';
export type TrustRecordType = 'transaction' | 'evaluation';
export type TrustDirection = 'inbound' | 'outbound';

export interface VerificationSource {
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

export interface TrustRecord {
  id?: number | null;
  label: string;
  type: TrustRecordType;
  direction: TrustDirection;
  occurredAt: string;
  amount?: number | null;
  score?: number | null;
  notes?: string | null;
}

export interface MutableTrustCompany {
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

interface PendingFailure {
  status: number;
  body: unknown;
}

export interface TrustLifecycleApiController {
  failNextCompanyUpdate(status?: number, body?: unknown): void;
  companyUpdateRequests(): number;
  partnerProfileRequests(): number;
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

function mapSector(name: string): 'energy' | 'manufacturing' | 'digital-services' {
  const normalized = name.trim().toLowerCase();
  if (normalized === 'advanced manufacturing' || normalized === 'manufacturing') {
    return 'manufacturing';
  }
  if (normalized === 'energy') {
    return 'energy';
  }
  return 'digital-services';
}

function mapPartnerProfile(company: MutableTrustCompany) {
  return {
    data: {
      id: company.id,
      attributes: {
        legalName: company.name,
        displayName: company.name,
        role: 'supplier',
        status: company.status,
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

function latestTrustScore(history: readonly TrustRecord[]): number | null {
  const scored = history.filter((entry) => typeof entry.score === 'number');
  const latestByDate = scored
    .slice()
    .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))
    .find((entry) => !Number.isNaN(Date.parse(entry.occurredAt)));

  return (latestByDate ?? scored[scored.length - 1])?.score ?? null;
}

export function recomputeTrustScore(
  status: VerificationStatus,
  history: readonly TrustRecord[],
): number {
  const latestScore = latestTrustScore(history);
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

export async function mockTrustLifecycleApis(
  page: Page,
  company: MutableTrustCompany,
): Promise<TrustLifecycleApiController> {
  let pendingFailure: PendingFailure | null = null;
  let companyUpdateRequestCount = 0;
  let partnerProfileRequestCount = 0;

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
      companyUpdateRequestCount += 1;

      if (pendingFailure) {
        const failure = pendingFailure;
        pendingFailure = null;
        await route.fulfill(json(failure.body, failure.status));
        return;
      }

      const payload = (request.postDataJSON?.() ?? {}) as {
        data?: {
          status?: MutableTrustCompany['status'];
          verificationStatus?: VerificationStatus;
          verificationSources?: VerificationSource[];
          trustHistory?: TrustRecord[];
        };
      };

      const next = payload.data ?? {};
      company.status = next.status ?? company.status;
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
    partnerProfileRequestCount += 1;
    await route.fulfill(json(mapPartnerProfile(company)));
  });

  return {
    failNextCompanyUpdate(status = 500, body: unknown = { message: 'Forced trust update failure' }) {
      pendingFailure = { status, body };
    },
    companyUpdateRequests() {
      return companyUpdateRequestCount;
    },
    partnerProfileRequests() {
      return partnerProfileRequestCount;
    },
  };
}
