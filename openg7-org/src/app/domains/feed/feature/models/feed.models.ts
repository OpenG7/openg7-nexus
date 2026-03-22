import { Signal } from '@angular/core';

export type FeedItemType =
  | 'OFFER'
  | 'REQUEST'
  | 'ALERT'
  | 'TENDER'
  | 'CAPACITY'
  | 'INDICATOR';

export type FeedItemCategory = 'OPPORTUNITY' | 'ALERT' | 'INDICATOR';

export type FeedOriginType = 'alert' | 'opportunity' | 'indicator';

export type FlowMode = 'EXPORT' | 'IMPORT' | 'BOTH';

export type FeedSort = 'NEWEST' | 'URGENCY' | 'VOLUME' | 'CREDIBILITY';

export type QuantityUnit = 'MW' | 'MWh' | 'bbl_d' | 'ton' | 'kg' | 'hours' | 'cad' | 'usd';

export interface Quantity {
  readonly value: number;
  readonly unit: QuantityUnit;
}

export interface FeedItemSource {
  readonly kind: 'GOV' | 'COMPANY' | 'PARTNER' | 'USER';
  readonly label: string;
  readonly url?: string;
}

export interface FeedPublicationMetadata {
  readonly publicationForm?: {
    readonly formKey: string;
    readonly schemaVersion: number;
  } | null;
  readonly extensions?: Readonly<Record<string, unknown>> | null;
}

export interface FeedItem {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt?: string | null;
  readonly type: FeedItemType;
  readonly sectorId: string | null;
  readonly title: string;
  readonly summary: string;
  readonly fromProvinceId?: string | null;
  readonly toProvinceId?: string | null;
  readonly mode: FlowMode;
  readonly quantity?: Quantity | null;
  readonly urgency?: 1 | 2 | 3 | null;
  readonly credibility?: 1 | 2 | 3 | null;
  readonly volumeScore?: number | null;
  readonly tags?: readonly string[];
  readonly originType?: FeedOriginType | null;
  readonly originId?: string | null;
  readonly connectionMatchId?: number | null;
  readonly source: FeedItemSource;
  readonly status?: 'confirmed' | 'pending' | 'failed';
  readonly optimisticIdempotencyKey?: string;
  readonly accessibilitySummary?: string | null;
  readonly metadata?: FeedPublicationMetadata | null;
  readonly geo?: {
    readonly from?: { lat: number; lng: number };
    readonly to?: { lat: number; lng: number };
  };
}

export interface FeedRealtimeEnvelope {
  readonly eventId?: string;
  readonly type: 'feed.item.created' | 'feed.item.updated' | 'feed.item.deleted';
  readonly payload: unknown;
  readonly cursor?: string | null;
}

export interface FeedFilterState {
  readonly fromProvinceId: string | null;
  readonly toProvinceId: string | null;
  readonly sectorId: string | null;
  readonly formKey: string | null;
  readonly category: FeedItemCategory | null;
  readonly type: FeedItemType | null;
  readonly mode: FlowMode;
  readonly sort: FeedSort;
  readonly search: string;
}

export interface FeedSnapshot {
  readonly items: readonly FeedItem[];
  readonly cursor: string | null;
  readonly filters: FeedFilterState;
  readonly onboardingSeen: boolean;
}

export interface FeedComposerDraft {
  readonly type: FeedItemType | null;
  readonly title: string;
  readonly summary: string;
  readonly sectorId: string | null;
  readonly fromProvinceId?: string | null;
  readonly toProvinceId?: string | null;
  readonly mode: FlowMode;
  readonly quantity?: Quantity | null;
  readonly tags?: readonly string[];
  readonly originType?: FeedOriginType | null;
  readonly originId?: string | null;
  readonly connectionMatchId?: number | null;
}

export interface FeedComposerValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export type FeedPublishOutcomeStatus = 'success' | 'validation-error' | 'request-error';

export interface FeedPublishOutcome {
  readonly status: FeedPublishOutcomeStatus;
  readonly validation: FeedComposerValidationResult;
  readonly item?: FeedItem;
  readonly error?: string;
}

export interface FeedPublishOptions {
  readonly metadata?: FeedPublicationMetadata | null;
}

export interface FeedRealtimeConnectionState {
  readonly connected: Signal<boolean>;
  readonly reconnecting: Signal<boolean>;
  readonly error: Signal<string | null>;
}

// Legacy reply model retained for paused UI components.
export interface FeedReply {
  readonly id: string;
  readonly author: { displayName: string };
  readonly content: string;
  readonly createdAt: string;
}
