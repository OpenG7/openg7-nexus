import { HttpErrorResponse } from '@angular/common/http';

const ADMIN_OPS_ACCESS_DENIED_MESSAGE =
  'Access denied. This dashboard is restricted to owner/admin accounts.';

export function resolveAdminOpsErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401 || error.status === 403) {
      return ADMIN_OPS_ACCESS_DENIED_MESSAGE;
    }

    return extractPayloadMessage(error.error) ?? trimMessage(error.message) ?? fallback;
  }

  return extractPayloadMessage(error) ?? fallback;
}

function extractPayloadMessage(payload: unknown): string | null {
  const directMessage = trimMessage(payload);
  if (directMessage) {
    return directMessage;
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as { error?: unknown; message?: unknown };
  return trimMessage(record.message) ?? extractPayloadMessage(record.error);
}

function trimMessage(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
