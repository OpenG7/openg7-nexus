import { FeedItem } from '../models/feed.models';

export type OpportunityQnaTab = 'questions' | 'offers' | 'history';

export type OpportunitySyncState = 'offline' | 'saved-local' | 'syncing' | 'synced';

export type OpportunityReportReason = 'incorrect' | 'duplicate' | 'abuse' | 'stale';

export type OpportunityReportSubmitState = 'idle' | 'success' | 'error';

export interface OpportunityDetailSectionItem {
  readonly labelKey: string;
  readonly value: string;
}

export interface OpportunityDocumentLink {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly kind: 'pdf' | 'link';
}

export interface OpportunityQnaMessage {
  readonly id: string;
  readonly tab: OpportunityQnaTab;
  readonly author: string;
  readonly content: string;
  readonly createdAt: string;
}

export interface OpportunityIndicator {
  readonly id: string;
  readonly label: string;
  readonly context: string;
  readonly delta: string;
  readonly trend: 'up' | 'down' | 'steady';
}

export interface OpportunityAlertItem {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly severity: 'critical' | 'warning' | 'info';
}

export interface OpportunityOfferPayload {
  readonly capacityMw: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly pricingModel: string;
  readonly comment: string;
  readonly attachmentName: string | null;
}

export interface OpportunityReportPayload {
  readonly reason: OpportunityReportReason;
  readonly comment: string;
}

export type OpportunityOfferSubmitState = 'idle' | 'submitting' | 'success' | 'error' | 'offline';

export interface OpportunityDetailVm {
  readonly item: FeedItem;
  readonly title: string;
  readonly routeLabel: string;
  readonly subtitle: string;
  readonly statusLabel: string;
  readonly urgencyLabel: string | null;
  readonly visibilityLabel: string;
  readonly tags: readonly string[];
  readonly summaryHeadline: string;
  readonly periodLabel: string;
  readonly deliveryPoint: string;
  readonly pricingType: string;
  readonly specs: readonly OpportunityDetailSectionItem[];
  readonly terms: readonly OpportunityDetailSectionItem[];
  readonly documents: readonly OpportunityDocumentLink[];
  readonly qnaMessages: readonly OpportunityQnaMessage[];
  readonly capacityMw: number;
  readonly updatedAtIso: string;
  readonly fromLabel: string;
  readonly toLabel: string;
  readonly indicators: readonly OpportunityIndicator[];
  readonly alerts: readonly OpportunityAlertItem[];
}
