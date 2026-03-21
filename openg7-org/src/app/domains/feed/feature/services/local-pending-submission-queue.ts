import { isPlatformBrowser } from '@angular/common';
import { Signal, signal } from '@angular/core';

export interface LocalPendingSubmissionQueueStore<TRecord> {
  readonly records: Signal<readonly TRecord[]>;
  append(record: TRecord): void;
  latestMatching(predicate: (record: TRecord) => boolean): TRecord | null;
}

interface CreateLocalPendingSubmissionQueueStoreOptions<TRecord> {
  readonly platformId: object;
  readonly storageKey: string;
  readonly maxEntries: number;
  readonly isRecord: (value: unknown) => value is TRecord;
}

export function createLocalPendingSubmissionQueueStore<TRecord>(
  options: CreateLocalPendingSubmissionQueueStoreOptions<TRecord>
): LocalPendingSubmissionQueueStore<TRecord> {
  const browser = isPlatformBrowser(options.platformId);

  const restore = (): readonly TRecord[] => {
    if (!browser) {
      return [];
    }

    try {
      const raw = localStorage.getItem(options.storageKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((entry): entry is TRecord => options.isRecord(entry));
    } catch {
      return [];
    }
  };

  const persist = (records: readonly TRecord[]): void => {
    if (!browser) {
      return;
    }

    localStorage.setItem(options.storageKey, JSON.stringify(records));
  };

  const recordsSig = signal<readonly TRecord[]>(restore());

  return {
    records: recordsSig.asReadonly(),
    append(record: TRecord): void {
      const next = [record, ...recordsSig()].slice(0, options.maxEntries);
      recordsSig.set(next);
      persist(next);
    },
    latestMatching(predicate: (record: TRecord) => boolean): TRecord | null {
      return recordsSig().find(predicate) ?? null;
    },
  };
}

export function generateLocalPendingSubmissionId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
