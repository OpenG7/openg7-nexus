import { PartnerProfile } from './partner-profile';

export type ConnectionAttachment = 'nda' | 'rfq';
export type TransportMode = 'road' | 'air' | 'rail' | 'sea';
export type IncotermCode = 'FCA' | 'FOB' | 'DDP' | 'CPT' | 'DAP' | 'EXW' | 'CIF' | 'CIP';

export type ConnectionStage = 'intro' | 'reply' | 'meeting' | 'review' | 'deal';
export type ConnectionStatus = 'pending' | 'inDiscussion' | 'completed' | 'closed';

export interface LogisticsSelection {
  readonly transports: readonly TransportMode[];
  readonly incoterm?: IncotermCode | null;
}

export interface IntroductionDraftState {
  readonly message: string;
  readonly attachments: readonly ConnectionAttachment[];
  readonly meetingSlots: readonly string[];
  readonly transports: readonly TransportMode[];
  readonly incoterm: IncotermCode | null;
}

export interface ConnectionDraft {
  readonly matchId: number;
  readonly buyerProfile: PartnerProfile;
  readonly supplierProfile: PartnerProfile;
  readonly introMessage: string;
  readonly attachments: readonly ConnectionAttachment[];
  readonly meetingSlots: readonly string[];
  readonly logistics: LogisticsSelection;
  readonly locale: 'fr' | 'en';
}

export interface ConnectionRecord {
  readonly id: number;
  readonly stage: ConnectionStage;
  readonly createdAt: string;
  readonly updatedAt?: string | null;
}

export interface ConnectionSubmissionRecord {
  readonly matchId: number;
  readonly draft: IntroductionDraftState;
  readonly record: ConnectionRecord | null;
}

export interface PipelineEvent {
  readonly stage: ConnectionStage;
  readonly timestamp: string;
}

export interface ConnectionStageHistoryEntry {
  readonly stage: ConnectionStage;
  readonly timestamp: string;
  readonly source?: string;
}

export interface ConnectionStatusHistoryEntry {
  readonly status: ConnectionStatus;
  readonly timestamp: string;
  readonly note?: string;
}

export interface ConnectionResponse {
  readonly id: number;
  readonly stage?: ConnectionStage;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface ConnectionDetails {
  readonly id: number;
  readonly matchId: number | null;
  readonly buyerProfileId: number | null;
  readonly supplierProfileId: number | null;
  readonly buyerOrganization: string | null;
  readonly supplierOrganization: string | null;
  readonly introMessage: string;
  readonly locale: 'fr' | 'en';
  readonly attachments: readonly ConnectionAttachment[];
  readonly logistics: LogisticsSelection;
  readonly meetingProposal: readonly string[];
  readonly stage: ConnectionStage;
  readonly status: ConnectionStatus;
  readonly stageHistory: readonly ConnectionStageHistoryEntry[];
  readonly statusHistory: readonly ConnectionStatusHistoryEntry[];
  readonly lastStatusAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string | null;
}

export interface ConnectionHistoryPage {
  readonly items: readonly ConnectionDetails[];
  readonly meta: {
    readonly count: number;
    readonly limit: number;
    readonly offset: number;
    readonly hasMore: boolean;
  };
}
