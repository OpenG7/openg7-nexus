import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { AuthService } from '@app/core/auth/auth.service';

import { IndicatorAlertDraft } from '../components/indicator-detail.models';

const STORAGE_KEY_PREFIX = 'og7.indicator-alert-drafts.v1';

type DraftMap = Readonly<Record<string, IndicatorAlertDraft>>;

@Injectable({ providedIn: 'root' })
export class IndicatorAlertDraftsService {
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly draftsSig = signal<DraftMap>({});

  constructor() {
    effect(() => {
      const userId = this.currentUserId();
      if (!userId) {
        this.draftsSig.set({});
        return;
      }
      this.draftsSig.set(this.restore(userId));
    });
  }

  refresh(): void {
    const userId = this.currentUserId();
    if (!userId) {
      this.draftsSig.set({});
      return;
    }
    this.draftsSig.set(this.restore(userId));
  }

  draftForIndicator(indicatorId: string | null | undefined): IndicatorAlertDraft | null {
    const normalizedIndicatorId = this.normalizeId(indicatorId);
    if (!normalizedIndicatorId) {
      return null;
    }
    return this.draftsSig()[normalizedIndicatorId] ?? null;
  }

  save(indicatorId: string, draft: IndicatorAlertDraft): void {
    const userId = this.currentUserIdOrThrow();
    const normalizedIndicatorId = this.normalizeId(indicatorId);
    if (!normalizedIndicatorId) {
      return;
    }

    const nextDraft = this.normalizeDraft(draft);
    const next: DraftMap = {
      ...this.draftsSig(),
      [normalizedIndicatorId]: nextDraft,
    };

    this.draftsSig.set(next);
    this.persist(userId, next);
  }

  clear(indicatorId: string): void {
    const userId = this.currentUserIdOrThrow();
    const normalizedIndicatorId = this.normalizeId(indicatorId);
    if (!normalizedIndicatorId) {
      return;
    }

    const current = this.draftsSig();
    if (!(normalizedIndicatorId in current)) {
      return;
    }

    const next = { ...current };
    delete next[normalizedIndicatorId];
    this.draftsSig.set(next);
    this.persist(userId, next);
  }

  private currentUserId(): string | null {
    if (!this.browser || !this.auth.isAuthenticated()) {
      return null;
    }
    return this.normalizeId(this.auth.user()?.id ?? null);
  }

  private currentUserIdOrThrow(): string {
    const userId = this.currentUserId();
    if (userId) {
      return userId;
    }
    throw new Error('Indicator alert drafts require an authenticated session.');
  }

  private storageKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}.${userId}`;
  }

  private restore(userId: string): DraftMap {
    const storage = this.getStorage();
    if (!storage) {
      return {};
    }

    const raw = storage.getItem(this.storageKey(userId));
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        storage.removeItem(this.storageKey(userId));
        return {};
      }

      const restored: Record<string, IndicatorAlertDraft> = {};
      for (const [indicatorId, draft] of Object.entries(parsed as Record<string, unknown>)) {
        const normalizedIndicatorId = this.normalizeId(indicatorId);
        if (!normalizedIndicatorId) {
          continue;
        }

        const normalizedDraft = this.normalizeDraftCandidate(draft);
        if (normalizedDraft) {
          restored[normalizedIndicatorId] = normalizedDraft;
        }
      }

      return restored;
    } catch {
      storage.removeItem(this.storageKey(userId));
      return {};
    }
  }

  private persist(userId: string, drafts: DraftMap): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.setItem(this.storageKey(userId), JSON.stringify(drafts));
    } catch {
      // Keep the in-memory state when storage is unavailable.
    }
  }

  private normalizeDraft(draft: IndicatorAlertDraft): IndicatorAlertDraft {
    return {
      thresholdDirection: draft.thresholdDirection,
      thresholdValue: draft.thresholdValue,
      window: draft.window,
      frequency: draft.frequency,
      notifyDelta: draft.notifyDelta,
      note: draft.note.trim(),
    };
  }

  private normalizeDraftCandidate(value: unknown): IndicatorAlertDraft | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const candidate = value as Partial<IndicatorAlertDraft>;
    const thresholdValue =
      typeof candidate.thresholdValue === 'number'
        ? candidate.thresholdValue
        : Number(candidate.thresholdValue);
    const thresholdDirection = candidate.thresholdDirection;
    const window = candidate.window;
    const frequency = candidate.frequency;

    if (
      !Number.isFinite(thresholdValue) ||
      !this.isThresholdDirection(thresholdDirection) ||
      !this.isWindow(window) ||
      !this.isFrequency(frequency) ||
      typeof candidate.notifyDelta !== 'boolean' ||
      typeof candidate.note !== 'string'
    ) {
      return null;
    }

    return {
      thresholdDirection,
      thresholdValue,
      window,
      frequency,
      notifyDelta: candidate.notifyDelta,
      note: candidate.note.trim(),
    };
  }

  private isThresholdDirection(value: unknown): value is IndicatorAlertDraft['thresholdDirection'] {
    return value === 'gt' || value === 'lt';
  }

  private isWindow(value: unknown): value is IndicatorAlertDraft['window'] {
    return value === '1h' || value === '24h';
  }

  private isFrequency(value: unknown): value is IndicatorAlertDraft['frequency'] {
    return value === 'instant' || value === 'hourly' || value === 'daily';
  }

  private normalizeId(value: unknown): string | null {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  }

  private getStorage(): Storage | null {
    if (!this.browser) {
      return null;
    }

    const storage =
      typeof window !== 'undefined'
        ? window.localStorage
        : (globalThis as { localStorage?: Storage }).localStorage;

    if (!storage) {
      return null;
    }

    try {
      return storage;
    } catch {
      return null;
    }
  }
}
