import type { Core } from '@strapi/strapi';

const ACCOUNT_PROFILE_UID = 'api::account-profile.account-profile' as any;
const CONNECTION_UID = 'api::connection.connection' as any;

const DEFAULT_HISTORY_LIMIT = 20;
const MAX_HISTORY_LIMIT = 100;
const ALLOWED_ATTACHMENTS = new Set(['nda', 'rfq']);
const ALLOWED_TRANSPORTS = new Set(['ROAD', 'AIR', 'RAIL', 'SEA']);
const ALLOWED_INCOTERMS = new Set(['FCA', 'FOB', 'DDP', 'CPT', 'DAP', 'EXW', 'CIF', 'CIP']);
const ALLOWED_STATUSES = new Set(['pending', 'inDiscussion', 'completed', 'closed']);
const ALLOWED_STAGES = new Set(['intro', 'reply', 'meeting', 'review', 'deal']);

type ConnectionStatus = 'pending' | 'inDiscussion' | 'completed' | 'closed';
type ConnectionStage = 'intro' | 'reply' | 'meeting' | 'review' | 'deal';

interface AuthenticatedUser {
  id: number | string;
}

interface ConnectionCreatePayload {
  readonly matchId: number;
  readonly buyerProfileId: number;
  readonly supplierProfileId: number;
  readonly buyerOrganization: string;
  readonly buyerOrganizationKey: string;
  readonly supplierOrganization: string;
  readonly supplierOrganizationKey: string;
  readonly introMessage: string;
  readonly locale: 'fr' | 'en';
  readonly attachments: readonly string[];
  readonly logisticsPlan: {
    readonly incoterm: string | null;
    readonly transports: readonly string[];
  };
  readonly meetingProposal: readonly string[];
}

interface StatusUpdatePayload {
  readonly status: ConnectionStatus;
  readonly note: string | null;
}

interface StageHistoryEntry {
  readonly stage: ConnectionStage;
  readonly timestamp: string;
  readonly source?: string;
}

interface StatusHistoryEntry {
  readonly status: ConnectionStatus;
  readonly timestamp: string;
  readonly note?: string;
}

interface ActorContext {
  readonly userId: number | string;
  readonly organization: string | null;
  readonly organizationKey: string | null;
}

const ALLOWED_STATUS_TRANSITIONS: Record<ConnectionStatus, readonly ConnectionStatus[]> = {
  pending: ['inDiscussion', 'completed', 'closed'],
  inDiscussion: ['completed', 'closed'],
  completed: ['closed'],
  closed: [],
};

function normalizeString(value: unknown, maxLength = 500): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, maxLength);
}

function normalizeOrganizationKey(value: unknown): string | null {
  const normalized = normalizeString(value, 160);
  if (!normalized) {
    return null;
  }
  return normalized.toLowerCase().replace(/\s+/g, ' ');
}

function normalizeInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeId(value: unknown): number | string | null {
  const integer = normalizeInteger(value);
  if (integer != null && integer > 0) {
    return integer;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizeFindManyResult<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}

function extractPayloadSource(input: unknown): Record<string, unknown> {
  const record = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  if (record.data && typeof record.data === 'object' && !Array.isArray(record.data)) {
    return record.data as Record<string, unknown>;
  }
  return record;
}

function parseLocale(value: unknown): 'fr' | 'en' {
  const normalized = normalizeString(value, 5)?.toLowerCase();
  if (normalized === 'en') {
    return 'en';
  }
  return 'fr';
}

function parseRequiredPositiveInteger(fieldName: string, value: unknown): number {
  const parsed = normalizeInteger(value);
  if (parsed == null || parsed <= 0) {
    throw new Error(`${fieldName} is required and must be a positive integer.`);
  }
  return parsed;
}

function sanitizeRequiredOrganization(fieldName: string, value: unknown): {
  readonly name: string;
  readonly key: string;
} {
  const name = normalizeString(value, 160);
  const key = normalizeOrganizationKey(value);
  if (!name || !key) {
    throw new Error(`${fieldName} is required.`);
  }
  return { name, key };
}

function sanitizeIntroMessage(value: unknown): string {
  const message = normalizeString(value, 4000);
  if (!message) {
    throw new Error('intro_message is required.');
  }
  if (message.length < 20) {
    throw new Error('intro_message must be at least 20 characters long.');
  }
  if (message.length > 2000) {
    throw new Error('intro_message must be at most 2000 characters long.');
  }
  return message;
}

function sanitizeAttachments(value: unknown): string[] {
  if (value == null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error('attachments must be an array.');
  }

  const unique = new Set<string>();
  for (const entry of value) {
    const normalized = normalizeString(entry, 32)?.toLowerCase();
    if (!normalized) {
      continue;
    }
    if (!ALLOWED_ATTACHMENTS.has(normalized)) {
      throw new Error(`attachments contains unsupported value: ${normalized}.`);
    }
    unique.add(normalized);
  }

  return Array.from(unique);
}

function sanitizeLogisticsPlan(value: unknown): ConnectionCreatePayload['logisticsPlan'] {
  const record =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const incoterm = normalizeString(record.incoterm, 16)?.toUpperCase() ?? null;
  if (incoterm && !ALLOWED_INCOTERMS.has(incoterm)) {
    throw new Error(`logistics_plan.incoterm contains unsupported value: ${incoterm}.`);
  }

  const transportsRaw = Array.isArray(record.transports) ? record.transports : [];
  const transports = new Set<string>();
  for (const entry of transportsRaw) {
    const normalized = normalizeString(entry, 16)?.toUpperCase();
    if (!normalized) {
      continue;
    }
    if (!ALLOWED_TRANSPORTS.has(normalized)) {
      throw new Error(`logistics_plan.transports contains unsupported value: ${normalized}.`);
    }
    transports.add(normalized);
  }

  return {
    incoterm,
    transports: Array.from(transports),
  };
}

function sanitizeMeetingProposal(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error('meeting_proposal must be an array of ISO datetime strings.');
  }

  const unique = new Set<string>();
  for (const entry of value) {
    const iso = normalizeIsoDate(entry);
    if (!iso) {
      throw new Error('meeting_proposal must contain valid ISO datetime strings.');
    }
    unique.add(iso);
  }

  if (unique.size < 1) {
    throw new Error('meeting_proposal must contain at least one slot.');
  }
  if (unique.size > 8) {
    throw new Error('meeting_proposal must contain at most eight slots.');
  }

  return Array.from(unique).sort((left, right) => left.localeCompare(right));
}

function normalizeAttachments(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();
  for (const entry of value) {
    const normalized = normalizeString(entry, 32)?.toLowerCase();
    if (!normalized || !ALLOWED_ATTACHMENTS.has(normalized)) {
      continue;
    }
    unique.add(normalized);
  }

  return Array.from(unique);
}

function normalizeLogisticsPlan(value: unknown): ConnectionCreatePayload['logisticsPlan'] {
  const record =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const incoterm = normalizeString(record.incoterm, 16)?.toUpperCase() ?? null;
  const transportsRaw = Array.isArray(record.transports) ? record.transports : [];
  const transports = new Set<string>();

  for (const entry of transportsRaw) {
    const normalized = normalizeString(entry, 16)?.toUpperCase();
    if (!normalized || !ALLOWED_TRANSPORTS.has(normalized)) {
      continue;
    }
    transports.add(normalized);
  }

  return {
    incoterm: incoterm && ALLOWED_INCOTERMS.has(incoterm) ? incoterm : null,
    transports: Array.from(transports),
  };
}

function normalizeMeetingProposal(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();
  for (const entry of value) {
    const iso = normalizeIsoDate(entry);
    if (!iso) {
      continue;
    }
    unique.add(iso);
  }

  return Array.from(unique).sort((left, right) => left.localeCompare(right));
}

function sanitizeCreatePayload(input: unknown): ConnectionCreatePayload {
  const source = extractPayloadSource(input);

  const matchId = parseRequiredPositiveInteger('match', source.match);
  const buyerProfileId = parseRequiredPositiveInteger('buyer_profile', source.buyer_profile);
  const supplierProfileId = parseRequiredPositiveInteger('supplier_profile', source.supplier_profile);
  const buyerOrganization = sanitizeRequiredOrganization(
    'buyer_organization',
    source.buyer_organization
  );
  const supplierOrganization = sanitizeRequiredOrganization(
    'supplier_organization',
    source.supplier_organization
  );
  const introMessage = sanitizeIntroMessage(source.intro_message);
  const locale = parseLocale(source.locale);
  const attachments = sanitizeAttachments(source.attachments);
  const logisticsPlan = sanitizeLogisticsPlan(source.logistics_plan);
  const meetingProposal = sanitizeMeetingProposal(source.meeting_proposal);

  if (buyerProfileId === supplierProfileId) {
    throw new Error('buyer_profile and supplier_profile must differ.');
  }

  return {
    matchId,
    buyerProfileId,
    supplierProfileId,
    buyerOrganization: buyerOrganization.name,
    buyerOrganizationKey: buyerOrganization.key,
    supplierOrganization: supplierOrganization.name,
    supplierOrganizationKey: supplierOrganization.key,
    introMessage,
    locale,
    attachments,
    logisticsPlan,
    meetingProposal,
  };
}

function normalizeStatus(value: unknown, fallback: ConnectionStatus = 'pending'): ConnectionStatus {
  const normalized = normalizeString(value, 20);
  if (!normalized || !ALLOWED_STATUSES.has(normalized)) {
    return fallback;
  }
  return normalized as ConnectionStatus;
}

function normalizeStage(value: unknown, fallback: ConnectionStage = 'reply'): ConnectionStage {
  const normalized = normalizeString(value, 20);
  if (!normalized || !ALLOWED_STAGES.has(normalized)) {
    return fallback;
  }
  return normalized as ConnectionStage;
}

function sanitizeStatusUpdatePayload(input: unknown): StatusUpdatePayload {
  const source = extractPayloadSource(input);
  const status = normalizeString(source.status, 32);
  if (!status || !ALLOWED_STATUSES.has(status)) {
    throw new Error('status is required and must be one of: pending, inDiscussion, completed, closed.');
  }

  const note = normalizeString(source.note, 280);
  return {
    status: status as ConnectionStatus,
    note,
  };
}

function parseHistoryQuery(query: Record<string, unknown>): {
  readonly limit: number;
  readonly offset: number;
  readonly status: ConnectionStatus | null;
} {
  const rawLimit = normalizeInteger(query.limit);
  const rawOffset = normalizeInteger(query.offset);

  const limit = rawLimit == null
    ? DEFAULT_HISTORY_LIMIT
    : rawLimit < 1
      ? 1
      : rawLimit > MAX_HISTORY_LIMIT
        ? MAX_HISTORY_LIMIT
        : rawLimit;

  const offset = rawOffset == null ? 0 : Math.max(0, rawOffset);
  const status = normalizeString(query.status, 32);

  return {
    limit,
    offset,
    status: status && ALLOWED_STATUSES.has(status) ? (status as ConnectionStatus) : null,
  };
}

function mapStatusToStage(status: ConnectionStatus): ConnectionStage {
  switch (status) {
    case 'inDiscussion':
      return 'meeting';
    case 'completed':
      return 'deal';
    case 'closed':
      return 'deal';
    case 'pending':
    default:
      return 'reply';
  }
}

function normalizeStageHistory(value: unknown): StageHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: StageHistoryEntry[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const stage = normalizeStage(record.stage, 'reply');
    const timestamp = normalizeIsoDate(record.timestamp) ?? new Date().toISOString();
    const source = normalizeString(record.source, 60) ?? undefined;
    normalized.push({
      stage,
      timestamp,
      ...(source ? { source } : {}),
    });
  }

  return normalized;
}

function normalizeStatusHistory(value: unknown): StatusHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: StatusHistoryEntry[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const status = normalizeStatus(record.status, 'pending');
    const timestamp = normalizeIsoDate(record.timestamp) ?? new Date().toISOString();
    const note = normalizeString(record.note, 280) ?? undefined;
    normalized.push({
      status,
      timestamp,
      ...(note ? { note } : {}),
    });
  }

  return normalized;
}

function isStatusTransitionAllowed(current: ConnectionStatus, next: ConnectionStatus): boolean {
  if (current === next) {
    return true;
  }
  return ALLOWED_STATUS_TRANSITIONS[current].includes(next);
}

function toConnectionResponse(entity: Record<string, unknown>) {
  const id = normalizeInteger(entity.id) ?? entity.id;
  const status = normalizeStatus(entity.status, 'pending');
  const stage = normalizeStage(entity.stage, mapStatusToStage(status));
  const createdAt = normalizeIsoDate(entity.createdAt) ?? new Date().toISOString();
  const updatedAt = normalizeIsoDate(entity.updatedAt);
  const lastStatusAt = normalizeIsoDate(entity.lastStatusAt) ?? updatedAt ?? createdAt;

  const attachments = normalizeAttachments(entity.attachments);
  const logisticsPlan = normalizeLogisticsPlan(entity.logisticsPlan);
  const meetingProposal = normalizeMeetingProposal(entity.meetingProposal);
  const locale = parseLocale(entity.locale);

  return {
    id,
    attributes: {
      match: normalizeInteger(entity.matchId) ?? null,
      buyer_profile: normalizeInteger(entity.buyerProfileId) ?? null,
      supplier_profile: normalizeInteger(entity.supplierProfileId) ?? null,
      buyer_organization: normalizeString(entity.buyerOrganization, 160) ?? null,
      supplier_organization: normalizeString(entity.supplierOrganization, 160) ?? null,
      intro_message: normalizeString(entity.introMessage, 4000) ?? '',
      locale,
      attachments,
      logistics_plan: logisticsPlan,
      meeting_proposal: meetingProposal,
      stage,
      status,
      stageHistory: normalizeStageHistory(entity.stageHistory),
      statusHistory: normalizeStatusHistory(entity.statusHistory),
      lastStatusAt,
      createdAt,
      updatedAt,
    },
  };
}

async function resolveActorContext(
  strapi: Core.Strapi,
  userId: number | string
): Promise<ActorContext> {
  const profiles = normalizeFindManyResult(
    await strapi.entityService.findMany(ACCOUNT_PROFILE_UID, {
      filters: {
        user: {
          id: userId,
        },
      },
      limit: 1,
    })
  );

  const profile = (profiles[0] as Record<string, unknown> | undefined) ?? null;
  const organization = normalizeString(profile?.organization, 160);

  return {
    userId,
    organization,
    organizationKey: normalizeOrganizationKey(organization),
  };
}

function buildActorAccessFilters(actor: ActorContext): Record<string, unknown>[] {
  const filters: Record<string, unknown>[] = [
    {
      user: {
        id: actor.userId,
      },
    },
  ];

  if (actor.organizationKey) {
    filters.push({ buyerOrganizationKey: actor.organizationKey });
    filters.push({ supplierOrganizationKey: actor.organizationKey });
  }

  return filters;
}

async function findConnectionForActor(
  strapi: Core.Strapi,
  actor: ActorContext,
  connectionId: number | string
): Promise<Record<string, unknown> | null> {
  const matches = normalizeFindManyResult(
    await strapi.entityService.findMany(CONNECTION_UID, {
      filters: {
        id: connectionId,
        $or: buildActorAccessFilters(actor),
      },
      limit: 1,
    })
  );

  return (matches[0] as Record<string, unknown> | undefined) ?? null;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async create(ctx: Record<string, unknown>) {
    const currentUser = (ctx.state as Record<string, unknown> | undefined)?.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return (ctx as any).unauthorized();
    }

    let payload: ConnectionCreatePayload;
    try {
      const body =
        ctx.request && typeof ctx.request === 'object'
          ? (ctx.request as Record<string, unknown>).body
          : undefined;
      payload = sanitizeCreatePayload(body);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid connections payload.';
      return (ctx as any).badRequest(message);
    }

    const now = new Date().toISOString();
    const initialStatus: ConnectionStatus = 'pending';
    const initialStage: ConnectionStage = 'reply';

    const created = (await strapi.entityService.create(CONNECTION_UID, {
      data: {
        user: currentUser.id,
        matchId: payload.matchId,
        buyerProfileId: payload.buyerProfileId,
        supplierProfileId: payload.supplierProfileId,
        buyerOrganization: payload.buyerOrganization,
        buyerOrganizationKey: payload.buyerOrganizationKey,
        supplierOrganization: payload.supplierOrganization,
        supplierOrganizationKey: payload.supplierOrganizationKey,
        introMessage: payload.introMessage,
        locale: payload.locale,
        attachments: payload.attachments,
        logisticsPlan: payload.logisticsPlan,
        meetingProposal: payload.meetingProposal,
        stage: initialStage,
        stageHistory: [
          {
            stage: 'intro',
            timestamp: now,
            source: 'submitted',
          },
          {
            stage: initialStage,
            timestamp: now,
            source: 'submitted',
          },
        ],
        status: initialStatus,
        statusHistory: [
          {
            status: initialStatus,
            timestamp: now,
            note: 'Connection created',
          },
        ],
        lastStatusAt: now,
      } as any,
    })) as Record<string, unknown>;

    (ctx as any).status = 201;
    (ctx as any).body = {
      data: toConnectionResponse(created),
    };
  },

  async history(ctx: Record<string, unknown>) {
    const currentUser = (ctx.state as Record<string, unknown> | undefined)?.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return (ctx as any).unauthorized();
    }

    const actor = await resolveActorContext(strapi, currentUser.id);

    const query =
      ctx.request && typeof ctx.request === 'object'
        ? (((ctx.request as Record<string, unknown>).query as Record<string, unknown>) ?? {})
        : {};
    const parsed = parseHistoryQuery(query);

    const filters: Record<string, unknown> = {
      $or: buildActorAccessFilters(actor),
    };

    if (parsed.status) {
      filters.status = parsed.status;
    }

    const entries = normalizeFindManyResult(
      await strapi.entityService.findMany(CONNECTION_UID, {
        filters,
        sort: ['updatedAt:desc', 'id:desc'],
        start: parsed.offset,
        limit: parsed.limit + 1,
      })
    );

    const hasMore = entries.length > parsed.limit;
    const page = hasMore ? entries.slice(0, parsed.limit) : entries;

    (ctx as any).body = {
      data: page.map((entry) => toConnectionResponse(entry as Record<string, unknown>)),
      meta: {
        count: page.length,
        limit: parsed.limit,
        offset: parsed.offset,
        hasMore,
      },
    };
  },

  async findOne(ctx: Record<string, unknown>) {
    const currentUser = (ctx.state as Record<string, unknown> | undefined)?.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return (ctx as any).unauthorized();
    }
    const actor = await resolveActorContext(strapi, currentUser.id);

    const connectionId = normalizeId((ctx.params as Record<string, unknown> | undefined)?.id);
    if (!connectionId) {
      return (ctx as any).badRequest('id is required.');
    }

    const existing = await findConnectionForActor(strapi, actor, connectionId);
    if (!existing) {
      return (ctx as any).notFound('connection.notFound');
    }

    (ctx as any).body = {
      data: toConnectionResponse(existing),
    };
  },

  async updateStatus(ctx: Record<string, unknown>) {
    const currentUser = (ctx.state as Record<string, unknown> | undefined)?.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return (ctx as any).unauthorized();
    }
    const actor = await resolveActorContext(strapi, currentUser.id);

    const connectionId = normalizeId((ctx.params as Record<string, unknown> | undefined)?.id);
    if (!connectionId) {
      return (ctx as any).badRequest('id is required.');
    }

    const existing = await findConnectionForActor(strapi, actor, connectionId);
    if (!existing) {
      return (ctx as any).notFound('connection.notFound');
    }

    let payload: StatusUpdatePayload;
    try {
      const body =
        ctx.request && typeof ctx.request === 'object'
          ? (ctx.request as Record<string, unknown>).body
          : undefined;
      payload = sanitizeStatusUpdatePayload(body);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid status payload.';
      return (ctx as any).badRequest(message);
    }

    const currentStatus = normalizeStatus(existing.status, 'pending');
    if (!isStatusTransitionAllowed(currentStatus, payload.status)) {
      return (ctx as any).badRequest(
        `status transition is invalid (${currentStatus} -> ${payload.status}).`
      );
    }

    if (currentStatus === payload.status) {
      (ctx as any).body = {
        data: toConnectionResponse(existing),
      };
      return;
    }

    const now = new Date().toISOString();
    const nextStage = mapStatusToStage(payload.status);
    const currentStage = normalizeStage(existing.stage, mapStatusToStage(currentStatus));

    const statusHistory = normalizeStatusHistory(existing.statusHistory);
    statusHistory.push({
      status: payload.status,
      timestamp: now,
      ...(payload.note ? { note: payload.note } : {}),
    });

    const stageHistory = normalizeStageHistory(existing.stageHistory);
    if (currentStage !== nextStage) {
      stageHistory.push({
        stage: nextStage,
        timestamp: now,
        source: 'status-update',
      });
    }

    const entityId = normalizeId(existing.id);
    if (!entityId) {
      return (ctx as any).notFound('connection.notFound');
    }

    const updated = (await strapi.entityService.update(CONNECTION_UID, entityId, {
      data: {
        status: payload.status,
        stage: nextStage,
        statusHistory,
        stageHistory,
        lastStatusAt: now,
      } as any,
    })) as Record<string, unknown>;

    (ctx as any).body = {
      data: toConnectionResponse(updated),
    };
  },
});
