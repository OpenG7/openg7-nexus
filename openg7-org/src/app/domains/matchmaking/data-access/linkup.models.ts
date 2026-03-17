import { ConnectionStatus } from '@app/core/models/connection';

export type LinkupStatus = ConnectionStatus;
export type LinkupTradeMode = 'import' | 'export' | 'both';

export interface LinkupParticipant {
  readonly id: string;
  readonly name: string;
  readonly province: string | null;
  readonly sector: string | null;
  readonly channel?: string | null;
}

export interface LinkupTimelineEntry {
  readonly id: string;
  readonly date: string;
  readonly summary: string;
  readonly channel?: string | null;
  readonly author?: string | null;
}

export interface LinkupNoteEntry {
  readonly id: string;
  readonly date: string;
  readonly author: string;
  readonly content: string;
}

export interface LinkupRecord {
  readonly id: string;
  readonly reference: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly status: LinkupStatus;
  readonly tradeMode: LinkupTradeMode;
  readonly companyA: LinkupParticipant;
  readonly companyB: LinkupParticipant;
  readonly primarySector: string | null;
  readonly summary: string;
  readonly timeline: readonly LinkupTimelineEntry[];
  readonly notes: readonly LinkupNoteEntry[];
}

export interface LinkupStatusMeta {
  readonly id: LinkupStatus;
  readonly labelKey: string;
  readonly chipClass: string;
}

export const LINKUP_STATUS_META: Readonly<Record<LinkupStatus, LinkupStatusMeta>> = {
  pending: {
    id: 'pending',
    labelKey: 'pages.linkups.status.pending',
    chipClass: 'og7-linkup-status--pending',
  },
  inDiscussion: {
    id: 'inDiscussion',
    labelKey: 'pages.linkups.status.inDiscussion',
    chipClass: 'og7-linkup-status--in-discussion',
  },
  completed: {
    id: 'completed',
    labelKey: 'pages.linkups.status.completed',
    chipClass: 'og7-linkup-status--completed',
  },
  closed: {
    id: 'closed',
    labelKey: 'pages.linkups.status.closed',
    chipClass: 'og7-linkup-status--closed',
  },
};

export const LINKUP_TRADE_MODE_OPTIONS: Readonly<Record<LinkupTradeMode, string>> = {
  import: 'pages.linkups.tradeMode.import',
  export: 'pages.linkups.tradeMode.export',
  both: 'pages.linkups.tradeMode.both',
};
