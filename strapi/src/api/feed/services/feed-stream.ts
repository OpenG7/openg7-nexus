import type { ServerResponse } from 'node:http';

export interface FeedRealtimeEnvelope {
  readonly eventId: string;
  readonly type: 'feed.item.created' | 'feed.item.updated' | 'feed.item.deleted';
  readonly payload: unknown;
  readonly cursor?: string | null;
}

interface FeedStreamClient {
  readonly id: string;
  readonly userId: string;
  readonly response: ServerResponse;
}

const HEARTBEAT_INTERVAL_MS = 15_000;
const clients = new Map<string, FeedStreamClient>();
let sequence = 0;
let heartbeatTimer: NodeJS.Timeout | null = null;

function writeToClient(client: FeedStreamClient, payload: string): boolean {
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

function writeSseEnvelope(client: FeedStreamClient, envelope: FeedRealtimeEnvelope): boolean {
  const payload = `id: ${envelope.eventId}\ndata: ${JSON.stringify(envelope)}\n\n`;
  return writeToClient(client, payload);
}

function writeHeartbeat(client: FeedStreamClient): boolean {
  return writeToClient(client, ': heartbeat\n\n');
}

function ensureHeartbeatRunning(): void {
  if (heartbeatTimer) {
    return;
  }

  heartbeatTimer = setInterval(() => {
    const staleClients: string[] = [];
    for (const [id, client] of clients.entries()) {
      if (!writeHeartbeat(client)) {
        staleClients.push(id);
      }
    }
    for (const id of staleClients) {
      clients.delete(id);
    }

    if (clients.size === 0 && heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }, HEARTBEAT_INTERVAL_MS);

  heartbeatTimer.unref?.();
}

export function registerFeedStreamClient(response: ServerResponse, userId: string): string {
  const id = `feed-stream-${Date.now()}-${++sequence}`;
  const client: FeedStreamClient = { id, userId, response };
  clients.set(id, client);
  ensureHeartbeatRunning();
  writeToClient(client, ': connected\n\n');
  return id;
}

export function unregisterFeedStreamClient(id: string): void {
  clients.delete(id);
  if (clients.size === 0 && heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export function broadcastFeedEnvelope(envelope: FeedRealtimeEnvelope): void {
  const staleClients: string[] = [];
  for (const [id, client] of clients.entries()) {
    if (!writeSseEnvelope(client, envelope)) {
      staleClients.push(id);
    }
  }

  for (const id of staleClients) {
    clients.delete(id);
  }

  if (clients.size === 0 && heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}
