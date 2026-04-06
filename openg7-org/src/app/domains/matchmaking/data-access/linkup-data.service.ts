import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ConnectionDetails } from '@app/core/models/connection';
import { OpportunityMatch } from '@app/core/models/opportunity';
import { ConnectionsService } from '@app/core/services/connections.service';
import { OpportunityService } from '@app/core/services/opportunity.service';
import { firstValueFrom } from 'rxjs';

import {
  LinkupNoteEntry,
  LinkupParticipant,
  LinkupRecord,
  LinkupStatus,
  LinkupTimelineEntry,
  LinkupTradeMode,
} from './linkup.models';

const HISTORY_PAGE_SIZE = 100;
const PLATFORM_CHANNEL_KEY = 'pages.linkups.channels.platform';
const SYSTEM_AUTHOR_KEY = 'pages.linkups.detail.systemAuthor';

@Injectable({ providedIn: 'root' })
export class LinkupDataService {
  private readonly connections = inject(ConnectionsService);
  private readonly opportunities = inject(OpportunityService);

  async loadHistory(): Promise<readonly LinkupRecord[]> {
    const items = await this.loadAllConnections();
    const matches = await this.resolveMatches(items);
    return items.map((connection) =>
      mapConnectionToLinkupRecord(connection, matches.get(connection.matchId ?? -1) ?? null)
    );
  }

  async loadById(id: string | number): Promise<LinkupRecord | null> {
    try {
      const connection = await firstValueFrom(this.connections.getConnectionById(id));
      return this.mapConnection(connection);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async updateStatus(id: string | number, status: LinkupStatus): Promise<LinkupRecord | null> {
    const connection = await firstValueFrom(this.connections.updateConnectionStatus(id, status));
    return this.mapConnection(connection);
  }

  async saveNote(
    id: string | number,
    currentStatus: LinkupStatus,
    note: string,
  ): Promise<LinkupRecord | null> {
    const trimmed = note.trim();
    if (!trimmed) {
      return this.loadById(id);
    }
    const connection = await firstValueFrom(
      this.connections.updateConnectionStatus(id, currentStatus, trimmed)
    );
    return this.mapConnection(connection);
  }

  private async loadAllConnections(): Promise<readonly ConnectionDetails[]> {
    const items: ConnectionDetails[] = [];
    let offset = 0;

    while (true) {
      const page = await firstValueFrom(
        this.connections.getConnectionHistoryPage({
          limit: HISTORY_PAGE_SIZE,
          offset,
        })
      );
      items.push(...page.items);
      if (!page.meta.hasMore || page.items.length === 0) {
        break;
      }
      offset += page.items.length;
    }

    return items;
  }

  private async resolveMatches(
    connections: readonly ConnectionDetails[]
  ): Promise<ReadonlyMap<number, OpportunityMatch>> {
    const uniqueMatchIds = Array.from(
      new Set(
        connections
          .map((connection) => connection.matchId)
          .filter((matchId): matchId is number => typeof matchId === 'number' && matchId > 0)
      )
    );

    const entries = await Promise.all(
      uniqueMatchIds.map(async (matchId) => [matchId, await this.opportunities.findMatchById(matchId)] as const)
    );

    return new Map(
      entries.filter((entry): entry is readonly [number, OpportunityMatch] => entry[1] !== null)
    );
  }

  private async mapConnection(connection: ConnectionDetails | null): Promise<LinkupRecord | null> {
    if (!connection) {
      return null;
    }
    const match = await this.resolveMatch(connection);
    return mapConnectionToLinkupRecord(connection, match);
  }

  private async resolveMatch(connection: ConnectionDetails): Promise<OpportunityMatch | null> {
    return connection.matchId ? await this.opportunities.findMatchById(connection.matchId) : null;
  }
}

export function mapConnectionToLinkupRecord(
  connection: ConnectionDetails,
  match: OpportunityMatch | null,
): LinkupRecord {
  const buyer = buildParticipant(
    connection.buyerProfileId,
    connection.buyerOrganization,
    match ? `provinces.${match.buyer.province}` : null,
    match ? `sectors.${match.buyer.sector}` : null,
  );
  const supplier = buildParticipant(
    connection.supplierProfileId,
    connection.supplierOrganization,
    match ? `provinces.${match.seller.province}` : null,
    match ? `sectors.${match.seller.sector}` : null,
  );

  return {
    id: String(connection.id),
    reference: buildReference(connection.id),
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt ?? connection.lastStatusAt ?? connection.createdAt,
    status: connection.status,
    tradeMode: mapTradeMode(match),
    companyA: buyer,
    companyB: supplier,
    primarySector: resolvePrimarySector(match),
    summary: connection.introMessage || match?.commodity || '',
    timeline: buildTimeline(connection),
    notes: buildNotes(connection),
  };
}

function buildParticipant(
  id: number | null,
  organization: string | null,
  province: string | null,
  sector: string | null,
): LinkupParticipant {
  return {
    id: String(id ?? organization ?? 'unknown'),
    name: organization ?? 'pages.linkups.detail.systemAuthor',
    province,
    sector,
    channel: PLATFORM_CHANNEL_KEY,
  };
}

function buildReference(id: number): string {
  return `OG7-LINKUP-${String(id).padStart(6, '0')}`;
}

function mapTradeMode(match: OpportunityMatch | null): LinkupTradeMode {
  if (match?.mode === 'import' || match?.mode === 'export') {
    return match.mode;
  }
  return 'both';
}

function resolvePrimarySector(match: OpportunityMatch | null): string | null {
  if (!match) {
    return null;
  }
  if (match.buyer.sector === match.seller.sector) {
    return `sectors.${match.buyer.sector}`;
  }
  return `sectors.${match.buyer.sector}`;
}

function buildTimeline(connection: ConnectionDetails): readonly LinkupTimelineEntry[] {
  const entries: LinkupTimelineEntry[] = [];

  connection.stageHistory.forEach((entry, index) => {
    entries.push({
      id: `stage-${connection.id}-${index}`,
      date: entry.timestamp,
      summary: `pages.linkups.timeline.stage.${entry.stage}`,
      channel: PLATFORM_CHANNEL_KEY,
      author: resolveStageAuthor(connection, entry),
    });
  });

  connection.statusHistory.forEach((entry, index) => {
    entries.push({
      id: `status-${connection.id}-${index}`,
      date: entry.timestamp,
      summary: `pages.linkups.timeline.status.${entry.status}`,
      channel: PLATFORM_CHANNEL_KEY,
      author: SYSTEM_AUTHOR_KEY,
    });
  });

  if (entries.length === 0) {
    entries.push({
      id: `created-${connection.id}`,
      date: connection.createdAt,
      summary: 'pages.linkups.timeline.stage.reply',
      channel: PLATFORM_CHANNEL_KEY,
      author: connection.buyerOrganization ?? SYSTEM_AUTHOR_KEY,
    });
  }

  return [...entries].sort((left, right) => left.date.localeCompare(right.date));
}

function buildNotes(connection: ConnectionDetails): readonly LinkupNoteEntry[] {
  return connection.statusHistory
    .filter((entry): entry is ConnectionDetails['statusHistory'][number] & { note: string } => Boolean(entry.note))
    .map((entry, index) => ({
      id: `note-${connection.id}-${index}`,
      date: entry.timestamp,
      author: SYSTEM_AUTHOR_KEY,
      content: entry.note,
    }))
    .sort((left, right) => right.date.localeCompare(left.date));
}

function resolveStageAuthor(
  connection: ConnectionDetails,
  entry: ConnectionDetails['stageHistory'][number],
): string {
  if (entry.stage === 'intro' || entry.source === 'submitted') {
    return connection.buyerOrganization ?? SYSTEM_AUTHOR_KEY;
  }
  return SYSTEM_AUTHOR_KEY;
}
