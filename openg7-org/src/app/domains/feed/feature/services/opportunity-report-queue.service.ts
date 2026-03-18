import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import { OpportunityReportPayload, OpportunityReportReason } from '../components/opportunity-detail.models';

import {
  createLocalPendingSubmissionQueueStore,
  generateLocalPendingSubmissionId,
} from './local-pending-submission-queue';

const STORAGE_KEY = 'og7.opportunity-report-queue';
const MAX_REPORTS = 50;

export interface OpportunityReportRecord {
  readonly id: string;
  readonly itemId: string;
  readonly itemTitle: string;
  readonly route: string;
  readonly reason: OpportunityReportReason;
  readonly comment: string;
  readonly createdAt: string;
  readonly status: 'pending';
}

function isOpportunityReportRecord(value: unknown): value is OpportunityReportRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const entry = value as Partial<OpportunityReportRecord>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.itemId === 'string' &&
    typeof entry.itemTitle === 'string' &&
    typeof entry.route === 'string' &&
    typeof entry.comment === 'string' &&
    typeof entry.createdAt === 'string' &&
    entry.status === 'pending' &&
    ['incorrect', 'duplicate', 'abuse', 'stale'].includes(entry.reason ?? '')
  );
}

@Injectable({ providedIn: 'root' })
export class OpportunityReportQueueService {
  private readonly queueStore = createLocalPendingSubmissionQueueStore<OpportunityReportRecord>({
    platformId: inject(PLATFORM_ID),
    storageKey: STORAGE_KEY,
    maxEntries: MAX_REPORTS,
    isRecord: isOpportunityReportRecord,
  });

  queueReport(input: {
    itemId: string;
    itemTitle: string;
    route: string;
    payload: OpportunityReportPayload;
  }): OpportunityReportRecord {
    const record: OpportunityReportRecord = {
      id: generateLocalPendingSubmissionId('opportunity-report'),
      itemId: input.itemId,
      itemTitle: input.itemTitle.trim(),
      route: input.route.trim(),
      reason: input.payload.reason,
      comment: input.payload.comment.trim(),
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    this.queueStore.append(record);
    return record;
  }

  latestPendingForOpportunity(itemId: string): OpportunityReportRecord | null {
    const normalizedItemId = itemId.trim();
    if (!normalizedItemId) {
      return null;
    }

    return (
      this.queueStore.records().find(
        record => record.itemId === normalizedItemId && record.status === 'pending'
      ) ?? null
    );
  }
}
