import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { AuthService } from '@app/core/auth/auth.service';
import { createUserScopedPersistentState } from '@app/core/storage/user-scoped-persistent-state';

import { IndicatorAlertDraft } from '../components/indicator-detail.models';

const STORAGE_KEY_PREFIX = 'og7.indicator-alert-drafts.v1';

type DraftMap = Readonly<Record<string, IndicatorAlertDraft>>;

@Injectable({ providedIn: 'root' })
export class IndicatorAlertDraftsService {
  private readonly auth = inject(AuthService);
  private readonly state = createUserScopedPersistentState<DraftMap>({
    auth: this.auth,
    platformId: inject(PLATFORM_ID),
    storageKeyPrefix: STORAGE_KEY_PREFIX,
    createEmptyValue: () => ({}),
    deserialize: (value) => this.deserializeDraftMap(value),
  });

  refresh(): void {
    this.state.refresh();
  }

  draftForIndicator(indicatorId: string | null | undefined): IndicatorAlertDraft | null {
    const normalizedIndicatorId = this.normalizeId(indicatorId);
    if (!normalizedIndicatorId) {
      return null;
    }
    return this.state.value()[normalizedIndicatorId] ?? null;
  }

  save(indicatorId: string, draft: IndicatorAlertDraft): void {
    const normalizedIndicatorId = this.normalizeId(indicatorId);
    if (!normalizedIndicatorId) {
      return;
    }

    const nextDraft = this.normalizeDraft(draft);
    const next: DraftMap = {
      ...this.state.value(),
      [normalizedIndicatorId]: nextDraft,
    };

    this.state.setForCurrentUser(next, 'Indicator alert drafts require an authenticated session.');
  }

  clear(indicatorId: string): void {
    const normalizedIndicatorId = this.normalizeId(indicatorId);
    if (!normalizedIndicatorId) {
      return;
    }

    const current = this.state.value();
    if (!(normalizedIndicatorId in current)) {
      return;
    }

    const next = { ...current };
    delete next[normalizedIndicatorId];
    this.state.setForCurrentUser(next, 'Indicator alert drafts require an authenticated session.');
  }

  private deserializeDraftMap(value: unknown): DraftMap | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const restored: Record<string, IndicatorAlertDraft> = {};
    for (const [indicatorId, draft] of Object.entries(value as Record<string, unknown>)) {
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

}
