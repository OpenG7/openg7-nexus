import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import type { Core } from '@strapi/strapi';

const OPPORTUNITY_OFFER_UID = 'api::opportunity-offer.opportunity-offer' as any;
const RECIPIENT_KINDS = new Set(['GOV', 'COMPANY', 'PARTNER', 'USER']);
const STATUS_SUBMITTED = 'submitted';
const DEFAULT_ATTACHMENT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_ATTACHMENT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
const ATTACHMENT_EXTENSIONS_BY_MIME = new Map<string, readonly string[]>([
  ['application/pdf', ['.pdf']],
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['image/webp', ['.webp']],
]);

interface AuthenticatedUser {
  id: number | string;
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

interface OpportunityOfferPayload {
  opportunityId: string;
  opportunityTitle: string;
  opportunityRoute: string | null;
  feedItemId: string | null;
  recipientKind: 'GOV' | 'COMPANY' | 'PARTNER' | 'USER';
  recipientLabel: string;
  capacityMw: number;
  startDate: string;
  endDate: string;
  pricingModel: string;
  comment: string;
  attachmentId: string | null;
  attachmentName: string | null;
  correlationId: string | null;
}

interface OpportunityOfferEntity extends Record<string, unknown> {
  id: number | string;
}

interface UploadedFileLike extends Record<string, unknown> {
  filepath?: unknown;
  path?: unknown;
  mimetype?: unknown;
  size?: unknown;
  originalFilename?: unknown;
  name?: unknown;
}

interface ValidatedAttachmentFile {
  file: UploadedFileLike;
  filepath: string;
  mimeType: string;
  size: number;
  name: string;
}

interface UploadedAssetEntity extends Record<string, unknown> {
  id: number | string;
}

function normalizeString(value: unknown, maxLength = 500): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, maxLength) : null;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDateOnly(value: unknown): string | null {
  const normalized = normalizeString(value, 20);
  if (!normalized || !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }
  const timestamp = Date.parse(`${normalized}T00:00:00.000Z`);
  return Number.isFinite(timestamp) ? normalized : null;
}

function normalizeRecipientKind(value: unknown): OpportunityOfferPayload['recipientKind'] {
  const normalized = normalizeString(value, 24)?.toUpperCase();
  if (!normalized || !RECIPIENT_KINDS.has(normalized)) {
    return 'PARTNER';
  }
  return normalized as OpportunityOfferPayload['recipientKind'];
}

function normalizeFindManyResult<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function normalizeIdempotencyKey(ctx: Record<string, unknown>): string | null {
  const headers =
    ctx.request && typeof ctx.request === 'object'
      ? (((ctx.request as Record<string, unknown>).header as Record<string, unknown>) ?? {})
      : {};
  return normalizeString(headers['idempotency-key'], 140);
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
}

function parseMimeTypeList(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((entry) => normalizeString(entry, 120)?.toLowerCase())
        .filter((entry): entry is string => Boolean(entry)),
    ),
  );
}

function getAttachmentAllowedMimeTypes(): string[] {
  const configured = parseMimeTypeList(process.env.OPPORTUNITY_OFFER_ATTACHMENT_ALLOWED_MIME_TYPES);
  return configured.length > 0 ? configured : [...DEFAULT_ATTACHMENT_ALLOWED_MIME_TYPES];
}

function getAttachmentMaxFileSizeBytes(): number {
  return parsePositiveInteger(
    process.env.OPPORTUNITY_OFFER_ATTACHMENT_MAX_FILE_SIZE_BYTES ??
      process.env.UPLOAD_MAX_FILE_SIZE_BYTES,
    DEFAULT_ATTACHMENT_MAX_FILE_SIZE_BYTES,
  );
}

function collectUploadedFiles(value: unknown, target: UploadedFileLike[]): void {
  if (!value) {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectUploadedFiles(item, target);
    }
    return;
  }
  if (typeof value !== 'object') {
    return;
  }

  const record = value as Record<string, unknown>;
  if (
    'filepath' in record ||
    'path' in record ||
    'mimetype' in record ||
    'originalFilename' in record
  ) {
    target.push(record as UploadedFileLike);
    return;
  }

  for (const nested of Object.values(record)) {
    collectUploadedFiles(nested, target);
  }
}

function extractUploadedAttachment(files: unknown): UploadedFileLike | null {
  const uploadedFiles: UploadedFileLike[] = [];
  collectUploadedFiles(files, uploadedFiles);
  return uploadedFiles[0] ?? null;
}

function normalizeMimeType(value: unknown): string | null {
  return normalizeString(value, 120)?.toLowerCase() ?? null;
}

function normalizeFileName(value: unknown): string | null {
  const normalized = normalizeString(value, 220);
  if (!normalized) {
    return null;
  }
  return normalized.replace(/[^a-zA-Z0-9._() -]/g, '_').slice(0, 180);
}

function attachmentError(status: number, message: string): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

function buildAttachmentErrorResponse(
  status: number,
  message: string,
  details: Record<string, unknown> = {},
) {
  return {
    data: null,
    error: {
      status,
      name: 'OpportunityOfferAttachmentError',
      message,
      details,
    },
  };
}

function validateAttachmentFile(file: UploadedFileLike): ValidatedAttachmentFile {
  const allowedMimeTypes = getAttachmentAllowedMimeTypes();
  const allowedMimeTypeSet = new Set(allowedMimeTypes);
  const maxFileSizeBytes = getAttachmentMaxFileSizeBytes();
  const filepath = normalizeString(file.filepath ?? file.path, 1000);
  const mimeType = normalizeMimeType(file.mimetype);
  const size = normalizeNumber(file.size);
  const name = normalizeFileName(file.originalFilename ?? file.name);

  if (!filepath) {
    throw attachmentError(400, 'Attachment file path is missing.');
  }
  if (!name) {
    throw attachmentError(400, 'Attachment filename is required.');
  }
  if (!mimeType || !allowedMimeTypeSet.has(mimeType)) {
    throw attachmentError(415, 'Attachment file type is not allowed.');
  }
  if (size == null || size <= 0) {
    throw attachmentError(400, 'Attachment file is empty.');
  }
  if (size > maxFileSizeBytes) {
    throw attachmentError(413, 'Attachment file exceeds the configured size limit.');
  }

  const extension = extname(name).toLowerCase();
  const allowedExtensions = ATTACHMENT_EXTENSIONS_BY_MIME.get(mimeType);
  if (!allowedExtensions?.includes(extension)) {
    throw attachmentError(415, 'Attachment filename extension does not match its content type.');
  }

  return {
    file,
    filepath,
    mimeType,
    size,
    name,
  };
}

async function scanAttachmentSignature(file: ValidatedAttachmentFile): Promise<void> {
  const signature = await readFile(file.filepath).then((buffer) => buffer.subarray(0, 16));
  const bytes = Array.from(signature);
  const ascii = signature.toString('ascii');
  const isPdf = file.mimeType === 'application/pdf' && ascii.startsWith('%PDF-');
  const isJpeg =
    file.mimeType === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    file.mimeType === 'image/png' &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isWebp =
    file.mimeType === 'image/webp' && ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP';

  if (!isPdf && !isJpeg && !isPng && !isWebp) {
    throw attachmentError(415, 'Attachment content signature does not match its declared type.');
  }
}

function toAttachmentResponse(asset: UploadedAssetEntity, validated: ValidatedAttachmentFile) {
  return {
    id: String(asset.id),
    name: typeof asset.name === 'string' ? asset.name : validated.name,
    mime: typeof asset.mime === 'string' ? asset.mime : validated.mimeType,
    size: normalizeNumber(asset.size) ?? validated.size,
    url: typeof asset.url === 'string' ? asset.url : null,
    scanStatus: 'passed' as const,
  };
}

function sanitizePayload(payload: unknown): OpportunityOfferPayload {
  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const opportunityId = normalizeString(record.opportunityId, 160);
  const opportunityTitle = normalizeString(record.opportunityTitle, 180);
  const recipientLabel = normalizeString(record.recipientLabel, 180);
  const capacityMw = normalizeNumber(record.capacityMw);
  const startDate = normalizeDateOnly(record.startDate);
  const endDate = normalizeDateOnly(record.endDate);
  const pricingModel = normalizeString(record.pricingModel, 80);
  const comment = normalizeString(record.comment, 5000);

  if (!opportunityId) {
    throw new Error('opportunityId is required.');
  }
  if (!opportunityTitle) {
    throw new Error('opportunityTitle is required.');
  }
  if (!recipientLabel) {
    throw new Error('recipientLabel is required.');
  }
  if (capacityMw == null || capacityMw <= 0) {
    throw new Error('capacityMw must be greater than 0.');
  }
  if (!startDate) {
    throw new Error('startDate must be a YYYY-MM-DD date.');
  }
  if (!endDate) {
    throw new Error('endDate must be a YYYY-MM-DD date.');
  }
  if (endDate < startDate) {
    throw new Error('endDate must be on or after startDate.');
  }
  if (!pricingModel) {
    throw new Error('pricingModel is required.');
  }
  if (!comment || comment.length < 10) {
    throw new Error('comment must be at least 10 characters.');
  }

  return {
    opportunityId,
    opportunityTitle,
    opportunityRoute: normalizeString(record.opportunityRoute, 240),
    feedItemId: normalizeString(record.feedItemId, 160),
    recipientKind: normalizeRecipientKind(record.recipientKind),
    recipientLabel,
    capacityMw,
    startDate,
    endDate,
    pricingModel,
    comment,
    attachmentId: normalizeString(record.attachmentId, 160),
    attachmentName: normalizeString(record.attachmentName, 220),
    correlationId: normalizeString(record.correlationId, 160),
  };
}

function buildSenderLabel(user: AuthenticatedUser): string {
  const firstName = normalizeString(user.firstName, 80);
  const lastName = normalizeString(user.lastName, 80);
  const fullName = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  if (fullName) {
    return fullName;
  }
  return (
    normalizeString(user.email, 180) ??
    normalizeString(user.username, 180) ??
    `User ${String(user.id)}`
  );
}

function buildSenderEmail(user: AuthenticatedUser): string {
  return normalizeString(user.email, 180) ?? 'unknown@openg7.local';
}

function generateReference(referenceDateIso: string): string {
  const date = new Date(referenceDateIso);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OG7-OFR-${year}${month}${day}-${suffix}`;
}

function generateRecordId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) {
    return `${prefix}-${uuid}`;
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function createInitialActivities(createdAt: string) {
  return [
    {
      id: generateRecordId('offer-activity'),
      type: 'tracked',
      actor: 'system',
      createdAt,
    },
    {
      id: generateRecordId('offer-activity'),
      type: 'submitted',
      actor: 'sender',
      createdAt,
    },
  ];
}

function toOfferResponse(entity: OpportunityOfferEntity) {
  return {
    id: String(entity.id),
    reference: typeof entity.reference === 'string' ? entity.reference : '',
    opportunityId: typeof entity.opportunityId === 'string' ? entity.opportunityId : '',
    opportunityTitle: typeof entity.opportunityTitle === 'string' ? entity.opportunityTitle : '',
    opportunityRoute: typeof entity.opportunityRoute === 'string' ? entity.opportunityRoute : null,
    feedItemId: typeof entity.feedItemId === 'string' ? entity.feedItemId : null,
    recipientKind: RECIPIENT_KINDS.has(String(entity.recipientKind))
      ? entity.recipientKind
      : 'PARTNER',
    recipientLabel: typeof entity.recipientLabel === 'string' ? entity.recipientLabel : '',
    senderUserId: typeof entity.senderUserId === 'string' ? entity.senderUserId : '',
    senderLabel: typeof entity.senderLabel === 'string' ? entity.senderLabel : '',
    senderEmail: typeof entity.senderEmail === 'string' ? entity.senderEmail : '',
    capacityMw: normalizeNumber(entity.capacityMw) ?? 0,
    startDate: typeof entity.startDate === 'string' ? entity.startDate : '',
    endDate: typeof entity.endDate === 'string' ? entity.endDate : '',
    pricingModel: typeof entity.pricingModel === 'string' ? entity.pricingModel : '',
    comment: typeof entity.comment === 'string' ? entity.comment : '',
    attachmentId: typeof entity.attachmentId === 'string' ? entity.attachmentId : null,
    attachmentName: typeof entity.attachmentName === 'string' ? entity.attachmentName : null,
    status: typeof entity.status === 'string' ? entity.status : STATUS_SUBMITTED,
    allocatedCapacityMw: normalizeNumber(entity.allocatedCapacityMw),
    remainingOpportunityCapacityMw: normalizeNumber(entity.remainingOpportunityCapacityMw),
    createdAt: typeof entity.createdAt === 'string' ? entity.createdAt : '',
    updatedAt: typeof entity.updatedAt === 'string' ? entity.updatedAt : '',
    submittedAt: typeof entity.submittedAt === 'string' ? entity.submittedAt : '',
    withdrawnAt: typeof entity.withdrawnAt === 'string' ? entity.withdrawnAt : null,
    activities: Array.isArray(entity.activities) ? entity.activities : [],
    correlationId: typeof entity.correlationId === 'string' ? entity.correlationId : null,
    idempotencyKey: typeof entity.idempotencyKey === 'string' ? entity.idempotencyKey : null,
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async uploadAttachment(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    const requestWithFiles = ctx.request as typeof ctx.request & { files?: unknown };
    const uploadedFile = extractUploadedAttachment(requestWithFiles.files);
    if (!uploadedFile) {
      return ctx.badRequest('Attachment file is required.');
    }

    let validated: ValidatedAttachmentFile;
    try {
      validated = validateAttachmentFile(uploadedFile);
      await scanAttachmentSignature(validated);
    } catch (error: unknown) {
      const status =
        typeof (error as { status?: unknown }).status === 'number'
          ? (error as { status: number }).status
          : 400;
      const message = error instanceof Error ? error.message : 'Invalid attachment file.';
      ctx.status = status;
      ctx.body = buildAttachmentErrorResponse(status, message, {
        allowedMimeTypes: getAttachmentAllowedMimeTypes(),
        maxFileSizeBytes: getAttachmentMaxFileSizeBytes(),
      });
      return;
    }

    const uploadFile = validated.file;
    uploadFile.name = validated.name;
    uploadFile.originalFilename = validated.name;

    const uploaded = await strapi
      .plugin('upload')
      .service('upload')
      .upload({
        data: {
          fileInfo: {
            name: validated.name,
            alternativeText: `Opportunity offer attachment uploaded by user ${String(currentUser.id)}`,
          },
        },
        files: uploadFile,
      });
    const asset = normalizeFindManyResult(uploaded)[0] as UploadedAssetEntity | undefined;
    if (!asset?.id) {
      ctx.status = 502;
      ctx.body = buildAttachmentErrorResponse(502, 'Attachment storage response is malformed.');
      return;
    }

    ctx.status = 201;
    ctx.body = {
      data: toAttachmentResponse(asset, validated),
    };
  },

  async me(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    const query = ctx.request?.query ?? {};
    const opportunityId = normalizeString((query as Record<string, unknown>).opportunityId, 160);
    const filters: Record<string, unknown> = {
      user: {
        id: currentUser.id,
      },
    };
    if (opportunityId) {
      filters.opportunityId = opportunityId;
    }

    const entries = await strapi.entityService.findMany(OPPORTUNITY_OFFER_UID, {
      filters,
      sort: ['updatedAt:desc', 'createdAt:desc'],
    });

    ctx.body = {
      data: normalizeFindManyResult(entries).map((entry) =>
        toOfferResponse(entry as OpportunityOfferEntity),
      ),
    };
  },

  async createMe(ctx) {
    const currentUser = ctx.state.user as AuthenticatedUser | undefined;
    if (!currentUser?.id) {
      return ctx.unauthorized();
    }

    let payload: OpportunityOfferPayload;
    try {
      payload = sanitizePayload(ctx.request.body);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid opportunity offer payload.';
      return ctx.badRequest(message);
    }

    const idempotencyKey = normalizeIdempotencyKey(ctx);
    if (idempotencyKey) {
      const existing = normalizeFindManyResult(
        await strapi.entityService.findMany(OPPORTUNITY_OFFER_UID, {
          filters: {
            user: { id: currentUser.id },
            idempotencyKey,
          },
          sort: ['createdAt:desc'],
          limit: 1,
        }),
      )[0] as OpportunityOfferEntity | undefined;

      if (existing) {
        ctx.body = {
          data: toOfferResponse(existing),
        };
        return;
      }
    }

    const now = new Date().toISOString();
    const created = await strapi.entityService.create(OPPORTUNITY_OFFER_UID, {
      data: {
        user: currentUser.id,
        reference: generateReference(now),
        opportunityId: payload.opportunityId,
        opportunityTitle: payload.opportunityTitle,
        opportunityRoute: payload.opportunityRoute,
        feedItemId: payload.feedItemId,
        recipientKind: payload.recipientKind,
        recipientLabel: payload.recipientLabel,
        senderUserId: String(currentUser.id),
        senderLabel: buildSenderLabel(currentUser),
        senderEmail: buildSenderEmail(currentUser),
        capacityMw: payload.capacityMw,
        startDate: payload.startDate,
        endDate: payload.endDate,
        pricingModel: payload.pricingModel,
        comment: payload.comment,
        attachmentId: payload.attachmentId,
        attachmentName: payload.attachmentName,
        status: STATUS_SUBMITTED,
        allocatedCapacityMw: null,
        remainingOpportunityCapacityMw: null,
        submittedAt: now,
        withdrawnAt: null,
        activities: createInitialActivities(now),
        correlationId: payload.correlationId,
        idempotencyKey,
      } as any,
    });

    ctx.status = 201;
    ctx.body = {
      data: toOfferResponse(created as OpportunityOfferEntity),
    };
  },
});
