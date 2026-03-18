import { FeedItem } from '../models/feed.models';

export type IndicatorTimeframe = '24h' | '72h' | '7d';

export type IndicatorGranularity = 'hour' | '15m' | 'day';

export type IndicatorConnectionState = 'online' | 'offline' | 'degraded';

export type IndicatorStatusLevel = 'normal' | 'high' | 'critical';

export interface IndicatorPoint {
  readonly ts: string;
  readonly value: number;
}

export interface IndicatorStatEntry {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly delta: string;
  readonly trend: 'up' | 'down' | 'steady';
  readonly series: readonly number[];
}

export interface IndicatorRelatedEntry {
  readonly id: string | null;
  readonly title: string;
  readonly context: string;
  readonly sparkline: readonly number[];
  readonly route: 'alert' | 'opportunity';
}

export interface IndicatorDetailVm {
  readonly item: FeedItem;
  readonly title: string;
  readonly subtitle: string;
  readonly provinceLabel: string;
  readonly sectorLabel: string;
  readonly kindLabel: string;
  readonly statusLevel: IndicatorStatusLevel;
  readonly statusLabel: string;
  readonly deltaPctLabel: string;
  readonly deltaAbsLabel: string;
  readonly windowHours: number;
  readonly granularityLabel: string;
  readonly unitLabel: string;
  readonly currentValueLabel: string;
  readonly variationLabel: string;
  readonly keyFactors: readonly string[];
  readonly completedLabel: string;
  readonly lastUpdatedIso: string;
  readonly points: readonly IndicatorPoint[];
  readonly stats: readonly IndicatorStatEntry[];
  readonly relatedAlerts: readonly IndicatorRelatedEntry[];
  readonly relatedOpportunities: readonly IndicatorRelatedEntry[];
}

export interface IndicatorAlertDraft {
  readonly thresholdDirection: 'gt' | 'lt';
  readonly thresholdValue: number;
  readonly window: '1h' | '24h';
  readonly frequency: 'instant' | 'hourly' | 'daily';
  readonly notifyDelta: boolean;
  readonly note: string;
}

export type IndicatorAlertDrawerMode = 'compose' | 'view';

export type IndicatorAlertSubmitState = 'idle' | 'submitting' | 'success' | 'error' | 'offline';
