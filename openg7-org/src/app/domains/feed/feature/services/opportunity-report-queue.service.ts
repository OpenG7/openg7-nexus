import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import { OpportunityReportPayload, OpportunityReportReason } from '../components/opportunity-detail.models';

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

@Injectable({ providedIn: 'root' })
export class OpportunityReportQueueService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);

  queueReport(input: {
    itemId: string;
    itemTitle: string;
    route: string;
    payload: OpportunityReportPayload;
  }): OpportunityReportRecord {
    const record: OpportunityReportRecord = {
      id: this.generateId(),
      itemId: input.itemId,
      itemTitle: input.itemTitle.trim(),
      route: input.route.trim(),
      reason: input.payload.reason,
      comment: input.payload.comment.trim(),
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    const next = [record, ...this.restore()].slice(0, MAX_REPORTS);
    this.persist(next);
    return record;
  }

  private restore(): OpportunityReportRecord[] {
    if (!this.browser) {
      return [];
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((entry): entry is OpportunityReportRecord => this.isReportRecord(entry));
    } catch {
      return [];
    }
  }

  private persist(records: readonly OpportunityReportRecord[]): void {
    if (!this.browser) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `opportunity-report-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private isReportRecord(value: unknown): value is OpportunityReportRecord {
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
}
