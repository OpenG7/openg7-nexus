import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import { AlertUpdatePayload, AlertUpdateRecord } from '../components/alert-detail.models';
import {
  createLocalPendingSubmissionQueueStore,
  generateLocalPendingSubmissionId,
} from './local-pending-submission-queue';

const STORAGE_KEY = 'og7.alert-update-queue';
const MAX_UPDATES = 50;

function isAlertUpdateRecord(value: unknown): value is AlertUpdateRecord {
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
    ['pending', 'reviewed', 'applied', 'rejected'].includes(entry.status ?? '') &&
    ['correction', 'escalation', 'resolved', 'newSource'].includes(entry.reason ?? '')
  );
}

@Injectable({ providedIn: 'root' })
export class AlertUpdateQueueService {
  private readonly queueStore = createLocalPendingSubmissionQueueStore<AlertUpdateRecord>({
    platformId: inject(PLATFORM_ID),
    storageKey: STORAGE_KEY,
    maxEntries: MAX_UPDATES,
    isRecord: isAlertUpdateRecord,
  });

  queueUpdate(input: {
    alertId: string;
    alertTitle: string;
    route: string;
    payload: AlertUpdatePayload;
  }): AlertUpdateRecord {
    const record: AlertUpdateRecord = {
      id: generateLocalPendingSubmissionId('alert-update'),
      alertId: input.alertId,
      alertTitle: input.alertTitle.trim(),
      route: input.route.trim(),
      reason: input.payload.reason,
      summary: input.payload.summary.trim(),
      sourceUrl: input.payload.sourceUrl?.trim() || null,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    this.queueStore.append(record);
    return record;
  }

  latestPendingForAlert(alertId: string): AlertUpdateRecord | null {
    const normalizedAlertId = alertId.trim();
    if (!normalizedAlertId) {
      return null;
    }

    return (
      this.queueStore.records().find(
        record => record.alertId === normalizedAlertId && record.status === 'pending'
      ) ?? null
    );
  }
}
