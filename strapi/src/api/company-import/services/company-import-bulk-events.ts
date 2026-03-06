import type { ServerResponse } from 'node:http';

export type CompanyImportBulkEventType =
  | 'bulk-import.connected'
  | 'bulk-import.phase'
  | 'bulk-import.progress'
  | 'bulk-import.error'
  | 'bulk-import.completed'
  | 'bulk-import.cancelled';

export interface CompanyImportBulkEvent {
  readonly eventId: string;
  readonly type: CompanyImportBulkEventType;
  readonly payload: unknown;
  readonly jobId: string;
}

interface CompanyImportBulkStreamClient {
  readonly id: string;
  readonly userId: string;
  readonly jobId: string;
  readonly response: ServerResponse;
}

const HEARTBEAT_INTERVAL_MS = 15_000;
const clients = new Map<string, CompanyImportBulkStreamClient>();
let sequence = 0;
let heartbeatTimer: NodeJS.Timeout | null = null;

function writeToClient(client: CompanyImportBulkStreamClient, payload: string): boolean {
  const response = client.response;
  if (response.writableEnded || response.destroyed) {
    return false;
  }
  try {
    response.write(payload);
    return true;
  } catch {
    return false;
  }
}

function writeHeartbeat(client: CompanyImportBulkStreamClient): boolean {
  return writeToClient(client, ': heartbeat\n\n');
}

function ensureHeartbeatRunning(): void {
  if (heartbeatTimer) {
    return;
  }
  heartbeatTimer = setInterval(() => {
    const staleClientIds: string[] = [];
    for (const [id, client] of clients.entries()) {
      if (!writeHeartbeat(client)) {
        staleClientIds.push(id);
      }
    }
    staleClientIds.forEach((id) => clients.delete(id));
    if (clients.size === 0 && heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }, HEARTBEAT_INTERVAL_MS);
  heartbeatTimer.unref?.();
}

function writeEnvelope(client: CompanyImportBulkStreamClient, event: CompanyImportBulkEvent): boolean {
  return writeToClient(client, `id: ${event.eventId}\ndata: ${JSON.stringify(event)}\n\n`);
}

function buildConnectedEvent(jobId: string): CompanyImportBulkEvent {
  return {
    eventId: `bulk-import-connected-${jobId}-${Date.now()}`,
    type: 'bulk-import.connected',
    jobId,
    payload: { connectedAt: new Date().toISOString() },
  };
}

export function registerCompanyImportBulkStreamClient(
  response: ServerResponse,
  userId: string,
  jobId: string
): string {
  const id = `bulk-import-stream-${Date.now()}-${++sequence}`;
  const client: CompanyImportBulkStreamClient = { id, userId, jobId, response };
  clients.set(id, client);
  ensureHeartbeatRunning();
  writeEnvelope(client, buildConnectedEvent(jobId));
  return id;
}

export function unregisterCompanyImportBulkStreamClient(clientId: string): void {
  clients.delete(clientId);
  if (clients.size === 0 && heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export function broadcastCompanyImportBulkEvent(event: CompanyImportBulkEvent): void {
  const staleClientIds: string[] = [];
  for (const [id, client] of clients.entries()) {
    if (client.jobId !== event.jobId) {
      continue;
    }
    if (!writeEnvelope(client, event)) {
      staleClientIds.push(id);
    }
  }
  staleClientIds.forEach((id) => clients.delete(id));
  if (clients.size === 0 && heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}
