import { FeedItem } from '../models/feed.models';

export type AlertUpdateReason = 'correction' | 'escalation' | 'resolved' | 'newSource';

export type AlertUpdateSubmitState = 'idle' | 'submitting' | 'success' | 'error';
export type AlertUpdateDrawerMode = 'compose' | 'view';
export type AlertUpdateStatus = 'pending' | 'reviewed' | 'applied' | 'rejected';

export interface AlertUpdatePayload {
  readonly reason: AlertUpdateReason;
  readonly summary: string;
  readonly sourceUrl: string | null;
}

export interface AlertUpdateRecord {
  readonly id: string;
  readonly alertId: string;
  readonly alertTitle: string;
  readonly route: string;
  readonly reason: AlertUpdateReason;
  readonly summary: string;
  readonly sourceUrl: string | null;
  readonly createdAt: string;
  readonly status: AlertUpdateStatus;
}

export interface AlertTimelineEntry {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export interface AlertUpdateEntry {
  readonly id: string;
  readonly title: string;
  readonly when: string;
}

export interface AlertSourceEntry {
  readonly id: string;
  readonly label: string;
  readonly href?: string | null;
  readonly confidence: string;
}

export interface AlertIndicatorEntry {
  readonly id: string;
  readonly label: string;
  readonly context: string;
  readonly value: string;
  readonly trend: 'up' | 'down' | 'steady';
}

export interface AlertRelatedAlertEntry {
  readonly id: string | null;
  readonly title: string;
  readonly region: string;
  readonly severity: string;
}

export interface AlertRelatedOpportunityEntry {
  readonly id: string;
  readonly title: string;
  readonly routeLabel: string;
}

export interface AlertDetailVm {
  readonly item: FeedItem;
  readonly title: string;
  readonly subtitle: string;
  readonly severityLabel: string;
  readonly confidenceLabel: string;
  readonly windowLabel: string;
  readonly summaryHeadline: string;
  readonly summaryPoints: readonly string[];
  readonly impactPoints: readonly string[];
  readonly zones: readonly string[];
  readonly infrastructures: readonly string[];
  readonly timeline: readonly AlertTimelineEntry[];
  readonly updates: readonly AlertUpdateEntry[];
  readonly recommendations: readonly string[];
  readonly sources: readonly AlertSourceEntry[];
  readonly indicators: readonly AlertIndicatorEntry[];
  readonly relatedAlerts: readonly AlertRelatedAlertEntry[];
  readonly relatedOpportunities: readonly AlertRelatedOpportunityEntry[];
  readonly updatedAtIso: string;
}
