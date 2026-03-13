import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import { AlertUpdatePayload } from '../components/alert-detail.models';

const STORAGE_KEY = 'og7.alert-update-queue';
const MAX_UPDATES = 50;

export interface AlertUpdateRecord {
  readonly id: string;
  readonly alertId: string;
  readonly alertTitle: string;
  readonly route: string;
  readonly reason: AlertUpdatePayload['reason'];
  readonly summary: string;
  readonly sourceUrl: string | null;
  readonly createdAt: string;
  readonly status: 'pending';
}

@Injectable({ providedIn: 'root' })
export class AlertUpdateQueueService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);

  queueUpdate(input: {
    alertId: string;
    alertTitle: string;
    route: string;
    payload: AlertUpdatePayload;
  }): AlertUpdateRecord {
    const record: AlertUpdateRecord = {
      id: this.generateId(),
      alertId: input.alertId,
      alertTitle: input.alertTitle.trim(),
      route: input.route.trim(),
      reason: input.payload.reason,
      summary: input.payload.summary.trim(),
      sourceUrl: input.payload.sourceUrl?.trim() || null,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    const next = [record, ...this.restore()].slice(0, MAX_UPDATES);
    this.persist(next);
    return record;
  }

  private restore(): AlertUpdateRecord[] {
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

      return parsed.filter((entry): entry is AlertUpdateRecord => this.isAlertUpdateRecord(entry));
    } catch {
      return [];
    }
  }

  private persist(records: readonly AlertUpdateRecord[]): void {
    if (!this.browser) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `alert-update-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private isAlertUpdateRecord(value: unknown): value is AlertUpdateRecord {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const entry = value as Partial<AlertUpdateRecord>;
    return (
      typeof entry.id === 'string' &&
      typeof entry.alertId === 'string' &&
      typeof entry.alertTitle === 'string' &&
      typeof entry.route === 'string' &&
      typeof entry.summary === 'string' &&
      typeof entry.createdAt === 'string' &&
      (typeof entry.sourceUrl === 'string' || entry.sourceUrl === null) &&
      entry.status === 'pending' &&
      ['correction', 'escalation', 'resolved', 'newSource'].includes(entry.reason ?? '')
    );
  }
}
