import type { Page } from '@playwright/test';

export interface E2eAuthProfile {
  id: string;
  email: string;
  roles: string[];
  firstName: string;
  lastName: string;
  confirmed?: boolean;
  blocked?: boolean;
  accountStatus?: 'active' | 'emailNotConfirmed' | 'disabled';
  premiumActive?: boolean;
  premiumPlan?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  organization?: string | null;
  avatarUrl?: string | null;
  sectorPreferences?: string[];
  provincePreferences?: string[];
  notificationPreferences?: {
    emailOptIn?: boolean;
    webhookUrl?: string | null;
    channels?: {
      inApp?: boolean;
      email?: boolean;
      webhook?: boolean;
    };
    filters?: {
      severities?: string[];
      sources?: string[];
    };
    frequency?: string | null;
    quietHours?: {
      enabled?: boolean;
      start?: string | null;
      end?: string | null;
      timezone?: string | null;
    };
  } | null;
}

interface SeedSector {
  id: number;
  name: string;
}

interface SeedProvince {
  id: number;
  name: string;
  code: string;
}

interface SeedCompany {
  id: number;
  name: string;
  description: string | null;
  website: string | null;
  status: 'pending' | 'approved' | 'suspended';
  logoUrl: string | null;
  secondaryLogoUrl: string | null;
  country: string | null;
  sector: { id: number; name: string } | null;
  province: { id: number; name: string } | null;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'suspended';
  trustScore: number;
  verificationSources: Array<{
    id?: number | null;
    name: string;
    type: 'registry' | 'chamber' | 'audit' | 'other';
    status: 'pending' | 'validated' | 'revoked';
    referenceId?: string | null;
    url?: string | null;
    evidenceUrl?: string | null;
    issuedAt?: string | null;
    lastCheckedAt?: string | null;
    notes?: string | null;
  }>;
  trustHistory: Array<{
    id?: number | null;
    label: string;
    type: 'transaction' | 'evaluation';
    direction: 'inbound' | 'outbound';
    occurredAt: string;
    amount?: number | null;
    score?: number | null;
    notes?: string | null;
  }>;
  capacities?: Array<{
    label: string;
    value: number | null;
    unit: string | null;
  }>;
}

interface SeedFavorite {
  id: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface SeedSession {
  id: string;
  version: number;
  createdAt: string;
  lastSeenAt: string;
  status: 'active' | 'revoked';
  current: boolean;
  revokedAt: string | null;
  userAgent: string | null;
  ipAddress: string | null;
}

interface SeedConnection {
  id: string;
  matchId: number;
  buyerProfileId: number;
  supplierProfileId: number;
  buyerOrganization: string;
  supplierOrganization: string;
  introMessage: string;
  locale: 'fr' | 'en';
  attachments: string[];
  logisticsPlan: {
    incoterm?: string | null;
    transports?: string[] | null;
  } | null;
  meetingProposal: string[];
  stage: 'intro' | 'reply' | 'meeting' | 'review' | 'deal';
  status: 'pending' | 'inDiscussion' | 'completed' | 'closed';
  stageHistory: Array<{
    stage?: string | null;
    timestamp?: string | null;
    source?: string | null;
  }>;
  statusHistory: Array<{
    status?: string | null;
    timestamp?: string | null;
    note?: string | null;
  }>;
  lastStatusAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface SeedOpportunityMatch {
  id: number;
  commodity: string;
  mode: 'import' | 'export' | 'all';
  confidence: number;
  distanceKm: number | null;
  co2Estimate: number | null;
  buyer: {
    id: number;
    name: string;
    province: string;
    sector: string;
    capability: 'import' | 'export' | 'all';
  };
  seller: {
    id: number;
    name: string;
    province: string;
    sector: string;
    capability: 'import' | 'export' | 'all';
  };
}

const DEFAULT_SECTORS: SeedSector[] = [
  { id: 1, name: 'Energy' },
  { id: 2, name: 'Advanced manufacturing' },
  { id: 3, name: 'Agrifood' },
];

const DEFAULT_PROVINCES: SeedProvince[] = [
  { id: 10, name: 'Ontario', code: 'ON' },
  { id: 11, name: 'Quebec', code: 'QC' },
  { id: 12, name: 'British Columbia', code: 'BC' },
];

export const DEFAULT_PROFILE: E2eAuthProfile = {
  id: 'e2e-user-1',
  email: 'e2e.user@openg7.test',
  roles: ['editor'],
  firstName: 'E2E',
  lastName: 'User',
  confirmed: true,
  blocked: false,
  accountStatus: 'active',
  premiumActive: true,
  premiumPlan: 'analyst',
  jobTitle: 'Trade analyst',
  phone: '+1 416 555 0100',
  organization: 'OpenG7 Test Lab',
  avatarUrl: 'https://cdn.openg7.test/avatars/e2e-user.png',
  sectorPreferences: ['energy'],
  provincePreferences: ['ON', 'QC'],
  notificationPreferences: {
    emailOptIn: true,
    webhookUrl: 'https://hooks.openg7.test/profile',
    channels: {
      inApp: true,
      email: true,
      webhook: false,
    },
    filters: {
      severities: ['warning', 'critical'],
      sources: ['saved-search', 'system'],
    },
    frequency: 'daily-digest',
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '06:00',
      timezone: 'America/Toronto',
    },
  },
};

const DEFAULT_COMPANIES: SeedCompany[] = [
  {
    id: 1001,
    name: 'Northern Grid Systems',
    description: 'Provincial grid operator and energy resilience partner.',
    website: 'https://northern-grid.example.test',
    status: 'pending',
    logoUrl: null,
    secondaryLogoUrl: null,
    country: 'CA',
    sector: { id: 1, name: 'Energy' },
    province: { id: 10, name: 'Ontario' },
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
    capacities: [{ label: 'Peak support', value: 300, unit: 'MW' }],
  },
  {
    id: 1002,
    name: 'Quebec Battery Alliance',
    description: 'Battery supply chain and storage programs.',
    website: 'https://battery-alliance.example.test',
    status: 'approved',
    logoUrl: null,
    secondaryLogoUrl: null,
    country: 'CA',
    sector: { id: 2, name: 'Advanced manufacturing' },
    province: { id: 11, name: 'Quebec' },
    verificationStatus: 'verified',
    trustScore: 93,
    verificationSources: [
      {
        id: 2,
        name: 'Export chamber',
        type: 'chamber',
        status: 'validated',
        referenceId: 'QC-CC-02',
      },
    ],
    trustHistory: [
      {
        id: 2,
        label: 'Cross-border delivery review',
        type: 'transaction',
        direction: 'outbound',
        occurredAt: '2026-01-10',
        amount: 4.5,
        score: 92,
      },
    ],
    capacities: [{ label: 'Module output', value: 1200, unit: 'units/month' }],
  },
];

const DEFAULT_FAVORITES: SeedFavorite[] = [
  {
    id: 'fav-1',
    entityType: 'company',
    entityId: '1002',
    metadata: null,
    createdAt: '2026-02-01T09:00:00.000Z',
    updatedAt: '2026-02-01T09:00:00.000Z',
  },
  {
    id: 'fav-2',
    entityType: 'partner',
    entityId: '301',
    metadata: null,
    createdAt: '2026-02-02T09:00:00.000Z',
    updatedAt: '2026-02-02T09:00:00.000Z',
  },
];

const DEFAULT_SESSIONS: SeedSession[] = [
  {
    id: 'session-current',
    version: 4,
    createdAt: '2026-01-01T08:00:00.000Z',
    lastSeenAt: '2026-03-14T10:00:00.000Z',
    status: 'active',
    current: true,
    revokedAt: null,
    userAgent: 'Playwright Chromium',
    ipAddress: '127.0.0.1',
  },
  {
    id: 'session-mobile',
    version: 3,
    createdAt: '2026-02-01T08:00:00.000Z',
    lastSeenAt: '2026-03-13T16:00:00.000Z',
    status: 'active',
    current: false,
    revokedAt: null,
    userAgent: 'Mobile Safari',
    ipAddress: '10.0.0.5',
  },
];

const DEFAULT_CONNECTIONS: SeedConnection[] = [
  {
    id: 'lkp-001',
    matchId: 73,
    buyerProfileId: 201,
    supplierProfileId: 301,
    buyerOrganization: 'Hydro Quebec Transition',
    supplierOrganization: 'Prairie Electrolyzers Inc.',
    introMessage: 'Discussion ouverte pour un corridor hydrogene Quebec-Alberta.',
    locale: 'fr',
    attachments: ['nda'],
    logisticsPlan: {
      incoterm: 'FCA',
      transports: ['rail', 'road'],
    },
    meetingProposal: ['2026-03-20T14:00:00.000Z'],
    stage: 'reply',
    status: 'inDiscussion',
    stageHistory: [
      {
        stage: 'intro',
        timestamp: '2026-03-12T09:00:00.000Z',
        source: 'submitted',
      },
      {
        stage: 'reply',
        timestamp: '2026-03-13T11:30:00.000Z',
        source: 'platform',
      },
    ],
    statusHistory: [
      {
        status: 'pending',
        timestamp: '2026-03-12T09:00:00.000Z',
        note: 'Introduction initiale envoyee.',
      },
      {
        status: 'inDiscussion',
        timestamp: '2026-03-13T11:30:00.000Z',
        note: 'Les deux parties ont accepte un premier appel.',
      },
    ],
    lastStatusAt: '2026-03-13T11:30:00.000Z',
    createdAt: '2026-03-12T09:00:00.000Z',
    updatedAt: '2026-03-13T11:30:00.000Z',
  },
];

const DEFAULT_OPPORTUNITY_MATCHES: SeedOpportunityMatch[] = [
  {
    id: 73,
    commodity: 'Hydrogen electrolyzers',
    mode: 'export',
    confidence: 0.94,
    distanceKm: 2850,
    co2Estimate: 14,
    buyer: {
      id: 201,
      name: 'Hydro Quebec Transition',
      province: 'QC',
      sector: 'energy',
      capability: 'import',
    },
    seller: {
      id: 301,
      name: 'Prairie Electrolyzers Inc.',
      province: 'AB',
      sector: 'manufacturing',
      capability: 'export',
    },
  },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function json(body: unknown) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

function strapiList<T>(data: readonly T[]) {
  return { data, meta: {} };
}

function mapCompanyToStrapi(company: SeedCompany) {
  return {
    id: company.id,
    attributes: {
      name: company.name,
      description: company.description,
      website: company.website,
      status: company.status,
      logoUrl: company.logoUrl,
      secondaryLogoUrl: company.secondaryLogoUrl,
      capacities: company.capacities ?? [],
      country: company.country,
      verificationStatus: company.verificationStatus,
      verificationSources: company.verificationSources,
      trustScore: company.trustScore,
      trustHistory: company.trustHistory,
      sector: company.sector
        ? {
            data: {
              id: company.sector.id,
              attributes: {
                name: company.sector.name,
              },
            },
          }
        : { data: null },
      province: company.province
        ? {
            data: {
              id: company.province.id,
              attributes: {
                name: company.province.name,
              },
            },
          }
        : { data: null },
    },
  };
}

function mapConnectionToStrapi(connection: SeedConnection) {
  return {
    id: connection.id,
    attributes: {
      match: connection.matchId,
      buyer_profile: connection.buyerProfileId,
      supplier_profile: connection.supplierProfileId,
      buyer_organization: connection.buyerOrganization,
      supplier_organization: connection.supplierOrganization,
      intro_message: connection.introMessage,
      locale: connection.locale,
      attachments: connection.attachments,
      logistics_plan: connection.logisticsPlan,
      meeting_proposal: connection.meetingProposal,
      stage: connection.stage,
      status: connection.status,
      stageHistory: connection.stageHistory,
      statusHistory: connection.statusHistory,
      lastStatusAt: connection.lastStatusAt,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    },
  };
}

function mapOpportunityMatchToStrapi(match: SeedOpportunityMatch) {
  return {
    id: match.id,
    attributes: {
      commodity: match.commodity,
      mode: match.mode,
      confidence: match.confidence,
      distanceKm: match.distanceKm,
      co2Estimate: match.co2Estimate,
      buyer: {
        data: {
          id: match.buyer.id,
          attributes: {
            name: match.buyer.name,
            province: match.buyer.province,
            sector: match.buyer.sector,
            capability: match.buyer.capability,
          },
        },
      },
      seller: {
        data: {
          id: match.seller.id,
          attributes: {
            name: match.seller.name,
            province: match.seller.province,
            sector: match.seller.sector,
            capability: match.seller.capability,
          },
        },
      },
    },
  };
}

export async function mockSessionApis(
  page: Page,
  profile: E2eAuthProfile = DEFAULT_PROFILE
): Promise<void> {
  await page.route('**/api/auth/local**', async (route) => {
    await route.fulfill(
      json({
        jwt: 'header.eyJleHAiOjQxMDI0NDQ4MDB9.signature',
        user: profile,
      })
    );
  });

  await page.route('**/api/users/me**', async (route) => {
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
      await route.fulfill(
        json({
          version: 1,
          sessions: [],
        })
      );
      return;
    }

    if (
      method === 'GET' &&
      (path === '/api/users/me' || path.endsWith('/profile'))
    ) {
      await route.fulfill(json(profile));
      return;
    }

    await route.fulfill({ status: 404, body: 'Unhandled users/me route' });
  });

  await page.route('**/api/sectors**', async (route) => {
    await route.fulfill(json(strapiList(DEFAULT_SECTORS)));
  });

  await page.route('**/api/provinces**', async (route) => {
    await route.fulfill(json(strapiList(DEFAULT_PROVINCES)));
  });

  await page.route('**/api/companies**', async (route) => {
    await route.fulfill(json(strapiList([])));
  });
}

export async function mockProfileAndFavoritesApis(
  page: Page,
  profileSeed: E2eAuthProfile = DEFAULT_PROFILE
): Promise<void> {
  const profile = clone(profileSeed);
  const sessions = clone(DEFAULT_SESSIONS);
  const favorites = clone(DEFAULT_FAVORITES);

  await page.route('**/api/auth/local**', async (route) => {
    await route.fulfill(
      json({
        jwt: 'header.eyJleHAiOjQxMDI0NDQ4MDB9.signature',
        user: profile,
      })
    );
  });

  await page.route('**/api/sectors**', async (route) => {
    await route.fulfill(json(strapiList(DEFAULT_SECTORS)));
  });

  await page.route('**/api/provinces**', async (route) => {
    await route.fulfill(json(strapiList(DEFAULT_PROVINCES)));
  });

  await page.route('**/api/companies**', async (route) => {
    await route.fulfill(json(strapiList([])));
  });

  await page.route('**/api/users/me**', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    const path = url.pathname.toLowerCase();

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }

    if (method === 'GET' && path.endsWith('/saved-searches')) {
      await route.fulfill(json([]));
      return;
    }

    if (method === 'GET' && path.endsWith('/alerts')) {
      await route.fulfill(json([]));
      return;
    }

    if (method === 'GET' && path.endsWith('/profile/export')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          exportedAt: '2026-03-14T10:00:00.000Z',
          formatVersion: 1,
          account: profile,
          favorites,
          savedSearches: [],
          alerts: [],
        }),
      });
      return;
    }

    if (method === 'POST' && path.endsWith('/profile/sessions/logout-others')) {
      const now = '2026-03-14T10:05:00.000Z';
      let revoked = 0;
      for (const session of sessions) {
        if (!session.current && session.status === 'active') {
          session.status = 'revoked';
          session.revokedAt = now;
          revoked += 1;
        }
      }

      await route.fulfill(
        json({
          jwt: 'header.eyJleHAiOjQxMDI0NDQ4MDB9.signature',
          user: profile,
          sessionsRevoked: revoked,
          sessionVersion: 5,
          sessions,
        })
      );
      return;
    }

    if (method === 'GET' && path.endsWith('/profile/sessions')) {
      await route.fulfill(
        json({
          version: 5,
          sessions,
        })
      );
      return;
    }

    if (method === 'POST' && path.endsWith('/profile/email-change')) {
      const payload = (request.postDataJSON?.() ?? {}) as { email?: string };
      await route.fulfill(
        json({
          email: payload.email ?? 'new.email@openg7.test',
          sent: true,
          accountStatus: 'active',
        })
      );
      return;
    }

    if (method === 'GET' && path.endsWith('/favorites')) {
      await route.fulfill(json(favorites));
      return;
    }

    if (method === 'POST' && path.endsWith('/favorites')) {
      const payload = (request.postDataJSON?.() ?? {}) as Partial<SeedFavorite>;
      const now = '2026-03-14T10:10:00.000Z';
      const created: SeedFavorite = {
        id: `fav-${favorites.length + 1}`,
        entityType: String(payload.entityType ?? 'generic'),
        entityId: String(payload.entityId ?? `entity-${favorites.length + 1}`),
        metadata: payload.metadata ?? null,
        createdAt: now,
        updatedAt: now,
      };
      favorites.unshift(created);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(created),
      });
      return;
    }

    const deleteMatch = path.match(/\/api\/users\/me\/favorites\/([^/]+)\/?$/i);
    if (method === 'DELETE' && deleteMatch) {
      const favoriteId = decodeURIComponent(deleteMatch[1]);
      const index = favorites.findIndex((entry) => entry.id === favoriteId);
      if (index >= 0) {
        favorites.splice(index, 1);
      }
      await route.fulfill(json({ id: favoriteId, deleted: true }));
      return;
    }

    if (method === 'GET' && (path === '/api/users/me' || path.endsWith('/profile'))) {
      await route.fulfill(json(profile));
      return;
    }

    if (method === 'PUT' && path.endsWith('/profile')) {
      const payload = (request.postDataJSON?.() ?? {}) as Partial<E2eAuthProfile>;
      Object.assign(profile, payload);
      await route.fulfill(json(profile));
      return;
    }

    await route.fulfill({ status: 404, body: 'Unhandled users/me route' });
  });

  await page.route('**/api/auth/change-password**', async (route) => {
    await route.fulfill(
      json({
        jwt: 'header.eyJleHAiOjQxMDI0NDQ4MDB9.signature',
        user: profile,
      })
    );
  });

  await page.route('**/api/upload**', async (route) => {
    await route.fulfill(
      json([
        {
          id: 1,
          url: '/uploads/e2e-avatar.png',
        },
      ])
    );
  });
}

export async function mockCompanyApis(
  page: Page,
  companySeed: readonly SeedCompany[] = DEFAULT_COMPANIES
): Promise<void> {
  const companies = clone(companySeed);

  await page.route('**/api/companies**', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    const companyIdMatch = url.pathname.match(/\/api\/companies\/(\d+)\/?$/i);
    const companyId = companyIdMatch ? Number(companyIdMatch[1]) : null;

    if (method === 'GET') {
      const statusFilter = url.searchParams.get('filters[status][$eq]');
      const filtered =
        statusFilter && statusFilter !== 'all'
          ? companies.filter((entry) => entry.status === statusFilter)
          : companies;
      await route.fulfill(json(strapiList(filtered.map(mapCompanyToStrapi))));
      return;
    }

    if (method === 'POST') {
      const payload = (request.postDataJSON?.() ?? {}) as {
        data?: Record<string, unknown>;
      };
      const data = payload.data ?? {};
      const nextId = Math.max(...companies.map((entry) => entry.id), 1000) + 1;
      const created: SeedCompany = {
        id: nextId,
        name: String(data['name'] ?? `Company ${nextId}`),
        description: typeof data['description'] === 'string' ? data['description'] : null,
        website: typeof data['website'] === 'string' ? data['website'] : null,
        status: (data['status'] as SeedCompany['status']) ?? 'pending',
        logoUrl: typeof data['logoUrl'] === 'string' ? data['logoUrl'] : null,
        secondaryLogoUrl: typeof data['secondaryLogoUrl'] === 'string' ? data['secondaryLogoUrl'] : null,
        country: typeof data['country'] === 'string' ? data['country'] : 'CA',
        sector:
          DEFAULT_SECTORS.find((entry) => entry.id === Number(data['sector'] ?? data['sectorId'])) ?? DEFAULT_SECTORS[0],
        province:
          DEFAULT_PROVINCES.find((entry) => entry.id === Number(data['province'] ?? data['provinceId'])) ??
          DEFAULT_PROVINCES[0],
        verificationStatus: 'pending',
        trustScore: 0,
        verificationSources: [],
        trustHistory: [],
        capacities: Array.isArray(data['capacities']) ? (data['capacities'] as SeedCompany['capacities']) : [],
      };
      companies.unshift(created);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: mapCompanyToStrapi(created) }),
      });
      return;
    }

    if (method === 'PUT' && companyId != null) {
      const payload = (request.postDataJSON?.() ?? {}) as { data?: Record<string, unknown> };
      const index = companies.findIndex((entry) => entry.id === companyId);
      if (index < 0) {
        await route.fulfill({ status: 404, body: 'Company not found' });
        return;
      }

      const current = companies[index];
      const data = payload.data ?? {};
      const nextSectorId = Number(data['sector'] ?? current.sector?.id ?? DEFAULT_SECTORS[0]?.id ?? 1);
      const nextProvinceId = Number(data['province'] ?? current.province?.id ?? DEFAULT_PROVINCES[0]?.id ?? 10);
      const updated: SeedCompany = {
        ...current,
        name: typeof data['name'] === 'string' ? data['name'] : current.name,
        description:
          typeof data['description'] === 'string' || data['description'] == null
            ? (data['description'] as string | null)
            : current.description,
        website:
          typeof data['website'] === 'string' || data['website'] == null
            ? (data['website'] as string | null)
            : current.website,
        status: (data['status'] as SeedCompany['status']) ?? current.status,
        logoUrl:
          typeof data['logoUrl'] === 'string' || data['logoUrl'] == null
            ? (data['logoUrl'] as string | null)
            : current.logoUrl,
        secondaryLogoUrl:
          typeof data['secondaryLogoUrl'] === 'string' || data['secondaryLogoUrl'] == null
            ? (data['secondaryLogoUrl'] as string | null)
            : current.secondaryLogoUrl,
        country:
          typeof data['country'] === 'string' || data['country'] == null
            ? (data['country'] as string | null)
            : current.country,
        sector: DEFAULT_SECTORS.find((entry) => entry.id === nextSectorId) ?? current.sector,
        province: DEFAULT_PROVINCES.find((entry) => entry.id === nextProvinceId) ?? current.province,
        verificationStatus:
          (data['verificationStatus'] as SeedCompany['verificationStatus']) ?? current.verificationStatus,
        verificationSources: Array.isArray(data['verificationSources'])
          ? (data['verificationSources'] as SeedCompany['verificationSources'])
          : current.verificationSources,
        trustHistory: Array.isArray(data['trustHistory'])
          ? (data['trustHistory'] as SeedCompany['trustHistory'])
          : current.trustHistory,
        capacities: Array.isArray(data['capacities'])
          ? (data['capacities'] as SeedCompany['capacities'])
          : current.capacities,
      };
      companies[index] = updated;
      await route.fulfill(json({ data: mapCompanyToStrapi(updated) }));
      return;
    }

    await route.fulfill({ status: 404, body: 'Unhandled companies route' });
  });
}

export async function mockConnectionsApis(
  page: Page,
  connectionSeed: readonly SeedConnection[] = DEFAULT_CONNECTIONS,
  opportunitySeed: readonly SeedOpportunityMatch[] = DEFAULT_OPPORTUNITY_MATCHES
): Promise<void> {
  const connections = clone(connectionSeed);
  const opportunityMatches = clone(opportunitySeed);

  await page.route('**/api/connections**', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    const connectionIdMatch = url.pathname.match(/\/api\/connections\/([^/]+)\/?$/i);
    const connectionId = connectionIdMatch ? decodeURIComponent(connectionIdMatch[1]) : null;

    if (method !== 'GET') {
      await route.fulfill({ status: 404, body: 'Unhandled connections route' });
      return;
    }

    if (connectionId) {
      const connection = connections.find((entry) => entry.id === connectionId);
      if (!connection) {
        await route.fulfill({ status: 404, body: 'Connection not found' });
        return;
      }

      await route.fulfill(json({ data: mapConnectionToStrapi(connection) }));
      return;
    }

    await route.fulfill(
      json({
        data: connections.map(mapConnectionToStrapi),
        meta: {
          count: connections.length,
          limit: connections.length,
          offset: 0,
          hasMore: false,
        },
      })
    );
  });

  await page.route('**/api/opportunity-matches**', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    const matchIdMatch = url.pathname.match(/\/api\/opportunity-matches\/(\d+)\/?$/i);
    const matchId = matchIdMatch ? Number(matchIdMatch[1]) : null;

    if (method !== 'GET') {
      await route.fulfill({ status: 404, body: 'Unhandled opportunity matches route' });
      return;
    }

    if (matchId != null) {
      const match = opportunityMatches.find((entry) => entry.id === matchId);
      await route.fulfill(
        json({
          data: match ? mapOpportunityMatchToStrapi(match) : null,
        })
      );
      return;
    }

    await route.fulfill(
      json({
        data: opportunityMatches.map(mapOpportunityMatchToStrapi),
      })
    );
  });
}

export async function mockImportApis(page: Page): Promise<void> {
  await page.route('**/api/import/companies', async (route) => {
    const request = route.request();
    const payload = (request.postDataJSON?.() ?? {}) as { companies?: unknown[] };
    const total = Array.isArray(payload.companies) ? payload.companies.length : 0;
    await route.fulfill(
      json({
        data: {
          received: total,
          processed: total,
          created: total,
          updated: 0,
          skipped: 0,
          errors: [],
        },
      })
    );
  });

  await page.route('**/api/import/companies/bulk-import', async (route) => {
    await route.fulfill(
      json({
        jobId: 'bulk-job-1',
        statusUrl: '/api/import/companies/jobs/bulk-job-1',
        eventsUrl: '/__e2e__/bulk-job-1/events',
        reportUrl: '/api/import/companies/jobs/bulk-job-1/report',
        errorsUrl: '/api/import/companies/jobs/bulk-job-1/errors',
      })
    );
  });

  await page.route('**/__e2e__/bulk-job-1/events', async (route) => {
    await route.fulfill({ status: 500, body: 'Event source disabled in E2E' });
  });

  await page.route('**/api/import/companies/jobs/bulk-job-1', async (route) => {
    await route.fulfill(
      json({
        jobId: 'bulk-job-1',
        state: 'completed',
        phase: 'finished',
        mode: 'upsert',
        dryRun: false,
        progress: {
          total: 2,
          processed: 2,
          ok: 2,
          failed: 0,
        },
        counters: {
          created: 1,
          updated: 1,
          skipped: 0,
          warnings: 0,
        },
        timestamps: {
          createdAt: '2026-03-14T10:15:00.000Z',
          updatedAt: '2026-03-14T10:15:02.000Z',
          startedAt: '2026-03-14T10:15:00.000Z',
          completedAt: '2026-03-14T10:15:02.000Z',
          cancelRequestedAt: null,
        },
        lastError: null,
      })
    );
  });

  await page.route('**/api/import/companies/jobs/bulk-job-1/report', async (route) => {
    await route.fulfill(
      json({
        jobId: 'bulk-job-1',
        state: 'completed',
        phase: 'finished',
        report: {
          summary: {
            received: 2,
            processed: 2,
            ok: 2,
            failed: 0,
            created: 1,
            updated: 1,
            skipped: 0,
            warnings: 0,
            mode: 'upsert',
            dryRun: false,
          },
          completedAt: '2026-03-14T10:15:02.000Z',
        },
        artifacts: {
          errorsJsonUrl: '/api/import/companies/jobs/bulk-job-1/errors?format=json',
          errorsCsvUrl: '/api/import/companies/jobs/bulk-job-1/errors?format=csv',
        },
      })
    );
  });

  await page.route('**/api/import/companies/jobs/bulk-job-1/errors**', async (route) => {
    await route.fulfill(
      json({
        jobId: 'bulk-job-1',
        count: 0,
        data: [],
      })
    );
  });

  await page.route('**/api/import/companies/jobs/bulk-job-1/cancel', async (route) => {
    await route.fulfill(
      json({
        jobId: 'bulk-job-1',
        cancelled: true,
        state: 'cancelled',
      })
    );
  });
}

export async function mockImportationApis(page: Page): Promise<void> {
  const watchlists = [
    {
      id: 'watch-1',
      name: 'Energy resilience',
      owner: 'E2E User',
      updatedAt: '2026-03-10',
      filters: {
        periodGranularity: 'month',
        periodValue: '2026-02',
        originScope: 'global',
        originCodes: [],
        hsSections: ['27'],
        compareMode: false,
        compareWith: null,
      },
    },
  ];

  await page.route('**/api/import-flows**', async (route) => {
    await route.fulfill(
      json({
        timeline: [
          { period: '2025-12', label: 'Dec 2025', totalValue: 98, yoyDelta: 3 },
          { period: '2026-01', label: 'Jan 2026', totalValue: 103, yoyDelta: 5 },
          { period: '2026-02', label: 'Feb 2026', totalValue: 112, yoyDelta: 8 },
        ],
        flows: [
          {
            originCode: 'US',
            originName: 'United States',
            value: 112,
            yoyDelta: 8,
            share: 42,
            coordinate: [-79.38, 43.65],
            corridors: [{ target: 'Ontario', value: 61, delta: 4 }],
          },
        ],
        coverage: 94,
        lastUpdated: '2026-03-14T08:00:00.000Z',
        dataProvider: 'OpenG7 demo',
      })
    );
  });

  await page.route('**/api/import-commodities**', async (route) => {
    await route.fulfill(
      json({
        top: [
          {
            id: 'cmd-1',
            hsCode: '2710',
            label: 'Refined petroleum oils',
            value: 52,
            yoyDelta: 4,
            riskScore: 28,
            sparkline: [40, 42, 44, 52],
            flags: ['stable'],
          },
        ],
        emerging: [
          {
            id: 'cmd-2',
            hsCode: '8507',
            label: 'Battery packs',
            value: 33,
            yoyDelta: 18,
            riskScore: 55,
            sparkline: [10, 16, 22, 33],
            flags: ['growth'],
          },
        ],
        risk: [
          {
            id: 'cmd-3',
            hsCode: '2804',
            label: 'Rare gases',
            value: 18,
            yoyDelta: 11,
            riskScore: 76,
            sparkline: [8, 9, 14, 18],
            flags: ['risk'],
          },
        ],
      })
    );
  });

  await page.route('**/api/import-risk-flags**', async (route) => {
    await route.fulfill(
      json([
        {
          id: 'risk-1',
          commodityId: 'cmd-3',
          title: 'Single-source exposure',
          severity: 'warning',
          recommendation: 'Create a secondary supplier watchlist',
        },
      ])
    );
  });

  await page.route('**/api/import-suppliers**', async (route) => {
    await route.fulfill(
      json({
        suppliers: [
          {
            id: 'sup-1',
            name: 'Great Lakes Components',
            dependencyScore: 61,
            diversificationScore: 38,
            reliability: 88,
            country: 'CA',
            lastReviewed: '2026-03-01',
            recommendation: 'Maintain as primary supplier',
          },
        ],
      })
    );
  });

  await page.route('**/api/import-annotations**', async (route) => {
    await route.fulfill(
      json({
        annotations: [
          {
            id: 'ann-1',
            author: 'OpenG7 analyst',
            excerpt: 'Battery imports accelerated after the January procurement window.',
            createdAt: '2026-03-05',
            relatedCommodityId: 'cmd-2',
          },
        ],
      })
    );
  });

  await page.route('**/api/import-watchlists**', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    const watchlistIdMatch = url.pathname.match(/\/api\/import-watchlists\/([^/]+)\/?$/i);
    const watchlistId = watchlistIdMatch ? decodeURIComponent(watchlistIdMatch[1]) : null;

    if (method === 'GET' && !watchlistId) {
      await route.fulfill(json({ watchlists }));
      return;
    }

    if (method === 'POST' && !watchlistId) {
      const payload = (request.postDataJSON?.() ?? {}) as { name?: string; filters?: Record<string, unknown> };
      const created = {
        id: `watch-${watchlists.length + 1}`,
        name: payload.name ?? `Watchlist ${watchlists.length + 1}`,
        owner: 'E2E User',
        updatedAt: '2026-03-14',
        filters: payload.filters ?? {},
      };
      watchlists.unshift(created);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(created),
      });
      return;
    }

    if (method === 'PUT' && watchlistId) {
      const payload = (request.postDataJSON?.() ?? {}) as { name?: string; filters?: Record<string, unknown> };
      const index = watchlists.findIndex((entry) => entry.id === watchlistId);
      if (index < 0) {
        await route.fulfill({ status: 404, body: 'Watchlist not found' });
        return;
      }

      const updated = {
        ...watchlists[index],
        name: payload.name ?? watchlists[index].name,
        filters: payload.filters ?? watchlists[index].filters,
        updatedAt: '2026-03-14',
      };
      watchlists[index] = updated;
      await route.fulfill(json(updated));
      return;
    }

    await route.fulfill({ status: 404, body: 'Unhandled watchlists route' });
  });

  await page.route('**/api/import-knowledge**', async (route) => {
    await route.fulfill(
      json({
        articles: [
          {
            id: 'kb-1',
            title: 'How to hedge battery-grade inputs',
            summary: 'Framework for supply concentration monitoring.',
            publishedAt: '2026-03-01',
            link: 'https://openg7.test/knowledge/battery-inputs',
            tag: 'Risk',
          },
        ],
        cta: {
          id: 'cta-1',
          title: 'Need a deeper sector memo?',
          subtitle: 'Book an analyst session',
          actionLabel: 'Request review',
          actionLink: 'mailto:analysts@openg7.test',
        },
      })
    );
  });

  await page.route('**/api/import-reports/schedule', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });
}

export async function mockBillingApis(page: Page): Promise<void> {
  await page.route('**/billing-plans**', async (route) => {
    await route.fulfill(
      json({
        data: [
          {
            id: 'plan-free',
            attributes: {
              slug: 'free',
              title: 'Explorer',
              description: 'Discovery tier',
              highlight: false,
              tier: 'free',
              available: true,
              price: { amount: 0, currency: 'CAD', interval: 'month' },
              features: ['Directory', 'Watchlists'],
              capabilities: { premiumVisibility: false, priorityAnalytics: false },
            },
          },
          {
            id: 'plan-analyst',
            attributes: {
              slug: 'analyst',
              title: 'Analyst',
              description: 'Operational monitoring',
              highlight: true,
              tier: 'premium',
              available: true,
              price: { amount: 129, currency: 'CAD', interval: 'month' },
              features: ['Analytics', 'Priority visibility'],
              capabilities: { premiumVisibility: true, priorityAnalytics: true },
            },
          },
        ],
      })
    );
  });

  await page.route('**/billing/invoices**', async (route) => {
    await route.fulfill(
      json({
        data: [
          {
            id: 'inv-1',
            provider: 'internal',
            status: 'paid',
            amountDue: 129,
            amountPaid: 129,
            currency: 'CAD',
            createdAt: '2026-03-01T00:00:00.000Z',
            hostedInvoiceUrl: 'https://billing.openg7.test/invoices/1',
            invoicePdf: 'https://billing.openg7.test/invoices/1.pdf',
            lines: [],
          },
        ],
      })
    );
  });

  await page.route('**/billing/cancel', async (route) => {
    await route.fulfill(json({ cancelled: true }));
  });

  await page.route('**/billing/checkout', async (route) => {
    await route.fulfill(
      json({
        provider: 'internal',
        message: 'Checkout handled in E2E',
      })
    );
  });
}

export async function mockAdminOpsApis(page: Page): Promise<void> {
  await page.route('**/api/admin/ops/health', async (route) => {
    await route.fulfill(
      json({
        data: {
          generatedAt: '2026-03-14T09:50:00.000Z',
          status: 'ok',
          runtime: {
            env: 'e2e',
            nodeVersion: '22.0.0',
            uptimeSeconds: 86400,
          },
          memory: {
            rssBytes: 256000000,
            heapUsedBytes: 128000000,
            heapTotalBytes: 192000000,
          },
          database: {
            status: 'ok',
            users: 42,
            companies: 18,
            feedItems: 144,
          },
        },
      })
    );
  });

  await page.route('**/api/admin/ops/backups', async (route) => {
    await route.fulfill(
      json({
        data: {
          generatedAt: '2026-03-14T09:50:00.000Z',
          status: 'ok',
          enabled: true,
          directory: '/var/backups/openg7',
          retentionDays: 14,
          schedule: '0 2 * * *',
          totalFiles: 3,
          totalSizeBytes: 1234567,
          lastBackupAt: '2026-03-14T02:00:00.000Z',
          files: [
            {
              name: 'backup-2026-03-14.tar.gz',
              sizeBytes: 345678,
              modifiedAt: '2026-03-14T02:00:00.000Z',
            },
          ],
        },
      })
    );
  });

  await page.route('**/api/admin/ops/imports', async (route) => {
    await route.fulfill(
      json({
        data: {
          generatedAt: '2026-03-14T09:50:00.000Z',
          totalCompanies: 18,
          scannedCompanies: 18,
          truncated: false,
          importedCompanies: 12,
          importsLast24h: 2,
          lastImportAt: '2026-03-14T07:00:00.000Z',
          sources: [{ source: 'manual', count: 7 }],
          recent: [
            {
              id: 'imp-1',
              businessId: 'QC-7788',
              name: 'Quebec Battery Alliance',
              status: 'approved',
              source: 'manual',
              importedAt: '2026-03-14T07:00:00.000Z',
              updatedAt: '2026-03-14T07:00:00.000Z',
            },
          ],
        },
      })
    );
  });

  await page.route('**/api/admin/ops/security', async (route) => {
    await route.fulfill(
      json({
        data: {
          generatedAt: '2026-03-14T09:50:00.000Z',
          users: {
            total: 42,
            blocked: 1,
            registrationsLast7d: 4,
          },
          sessions: {
            scannedUsers: 42,
            truncated: false,
            active: 18,
            revoked: 2,
            usersWithActiveSessions: 12,
          },
          uploads: {
            safetyEnabled: true,
            maxFileSizeBytes: 5242880,
            allowedMimeTypes: ['image/png', 'image/jpeg'],
          },
          auth: {
            sessionIdleTimeoutMs: 3600000,
          },
          moderation: {
            pendingCompanies: 1,
            suspendedCompanies: 0,
          },
        },
      })
    );
  });
}
