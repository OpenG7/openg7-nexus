import type { Context } from 'koa';

const MAX_BATCH_SIZE = 25;
const MAX_EVENT_NAME_LENGTH = 120;
const MAX_DETAIL_KEYS = 50;

interface AnalyticsEnvelope {
  readonly event: string;
  readonly detail: Record<string, unknown>;
  readonly priority: boolean;
  readonly timestamp: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, maxLength) : null;
}

function normalizeTimestamp(value: unknown): string {
  const normalized = normalizeString(value, 80);
  if (!normalized) {
    return new Date().toISOString();
  }
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date().toISOString();
}

function normalizeDetail(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(Object.entries(value).slice(0, MAX_DETAIL_KEYS));
}

function normalizeEnvelope(value: unknown): AnalyticsEnvelope | null {
  if (!isRecord(value)) {
    return null;
  }
  const event = normalizeString(value.event, MAX_EVENT_NAME_LENGTH);
  if (!event) {
    return null;
  }
  return {
    event,
    detail: normalizeDetail(value.detail),
    priority: value.priority === true,
    timestamp: normalizeTimestamp(value.timestamp),
  };
}

function normalizePayload(payload: unknown): AnalyticsEnvelope[] {
  const entries = Array.isArray(payload) ? payload : [payload];
  return entries.slice(0, MAX_BATCH_SIZE).flatMap((entry) => {
    const envelope = normalizeEnvelope(entry);
    return envelope ? [envelope] : [];
  });
}

export default () => ({
  async events(ctx: Context) {
    const rawPayload = ctx.request.body;
    const accepted = normalizePayload(rawPayload);

    if (accepted.length === 0) {
      return ctx.badRequest('Invalid analytics payload.');
    }

    ctx.status = 202;
    ctx.set('cache-control', 'no-store');
    ctx.body = {
      accepted: accepted.length,
      batch: Array.isArray(rawPayload),
    };
  },
});
