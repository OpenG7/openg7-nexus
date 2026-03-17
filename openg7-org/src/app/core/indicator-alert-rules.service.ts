import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';

import { AuthService } from './auth/auth.service';

const STORAGE_KEY_PREFIX = 'og7.indicator-alert-rules.v1';

export type IndicatorAlertThresholdDirection = 'gt' | 'lt';
export type IndicatorAlertWindow = '1h' | '24h';
export type IndicatorAlertFrequency = 'instant' | 'hourly' | 'daily';

export interface IndicatorAlertRuleRecord {
  id: string;
  indicatorId: string;
  indicatorTitle: string;
  thresholdDirection: IndicatorAlertThresholdDirection;
  thresholdValue: number;
  window: IndicatorAlertWindow;
  frequency: IndicatorAlertFrequency;
  notifyDelta: boolean;
  note: string;
  route: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIndicatorAlertRulePayload {
  indicatorId: string;
  indicatorTitle: string;
  thresholdDirection: IndicatorAlertThresholdDirection;
  thresholdValue: number;
  window: IndicatorAlertWindow;
  frequency: IndicatorAlertFrequency;
  notifyDelta: boolean;
  note?: string | null;
  route?: string | null;
}

@Injectable({ providedIn: 'root' })
export class IndicatorAlertRulesService {
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly entriesSig = signal<IndicatorAlertRuleRecord[]>([]);

  readonly entries = this.entriesSig.asReadonly();
  readonly hasEntries = computed(() => this.entriesSig().length > 0);

  constructor() {
    effect(() => {
      const userId = this.currentUserId();
      if (!userId) {
        this.entriesSig.set([]);
        return;
      }
      this.entriesSig.set(this.restore(userId));
    });
  }

  refresh(): void {
    const userId = this.currentUserId();
    if (!userId) {
      this.entriesSig.set([]);
      return;
    }
    this.entriesSig.set(this.restore(userId));
  }

  create(payload: CreateIndicatorAlertRulePayload): IndicatorAlertRuleRecord {
    const userId = this.currentUserIdOrThrow();
    const now = new Date().toISOString();
    const nextEntry = this.normalizeRecord({
      id: this.generateId(),
      indicatorId: payload.indicatorId,
      indicatorTitle: payload.indicatorTitle,
      thresholdDirection: payload.thresholdDirection,
      thresholdValue: payload.thresholdValue,
      window: payload.window,
      frequency: payload.frequency,
      notifyDelta: payload.notifyDelta,
      note: payload.note ?? '',
      route: payload.route ?? null,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    const nextEntries = this.sortEntries([nextEntry, ...this.entriesSig()]);
    this.entriesSig.set(nextEntries);
    this.persist(userId, nextEntries);
    return nextEntry;
  }

  setActive(id: string, active: boolean): void {
    const userId = this.currentUserIdOrThrow();
    const normalizedId = this.normalizeId(id);
    if (!normalizedId) {
      return;
    }

    const now = new Date().toISOString();
    const nextEntries = this.sortEntries(
      this.entriesSig().map((entry) =>
        entry.id === normalizedId
          ? {
              ...entry,
              active,
              updatedAt: now,
            }
          : entry
      )
    );

    this.entriesSig.set(nextEntries);
    this.persist(userId, nextEntries);
  }

  remove(id: string): void {
    const userId = this.currentUserIdOrThrow();
    const normalizedId = this.normalizeId(id);
    if (!normalizedId) {
      return;
    }

    const nextEntries = this.entriesSig().filter((entry) => entry.id !== normalizedId);
    this.entriesSig.set(nextEntries);
    this.persist(userId, nextEntries);
  }

  findActiveRuleForIndicator(indicatorId: string): IndicatorAlertRuleRecord | null {
    const normalizedIndicatorId = this.normalizeId(indicatorId);
    if (!normalizedIndicatorId) {
      return null;
    }
    return (
      this.entriesSig().find(
        (entry) => entry.active && entry.indicatorId === normalizedIndicatorId
      ) ?? null
    );
  }

  hasActiveRuleForIndicator(indicatorId: string): boolean {
    return this.findActiveRuleForIndicator(indicatorId) !== null;
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
    throw new Error('Indicator alert rules require an authenticated session.');
  }

  private storageKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}.${userId}`;
  }

  private restore(userId: string): IndicatorAlertRuleRecord[] {
    const storage = this.getStorage();
    if (!storage) {
      return [];
    }

    const raw = storage.getItem(this.storageKey(userId));
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        storage.removeItem(this.storageKey(userId));
        return [];
      }
      return this.sortEntries(parsed.map((entry) => this.normalizeRecord(entry)));
    } catch {
      storage.removeItem(this.storageKey(userId));
      return [];
    }
  }

  private persist(userId: string, entries: readonly IndicatorAlertRuleRecord[]): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.setItem(this.storageKey(userId), JSON.stringify(entries));
    } catch {
      // Ignore storage failures and keep the in-memory state.
    }
  }

  private normalizeRecord(candidate: unknown): IndicatorAlertRuleRecord {
    const record =
      candidate && typeof candidate === 'object'
        ? (candidate as Record<string, unknown>)
        : {};
    const now = new Date().toISOString();
    const createdAt = this.normalizeIsoTimestamp(record['createdAt']) ?? now;

    return {
      id: this.normalizeId(record['id']) ?? this.generateId(),
      indicatorId: this.normalizeId(record['indicatorId']) ?? 'indicator',
      indicatorTitle: this.normalizeText(record['indicatorTitle'], 'Indicator'),
      thresholdDirection: record['thresholdDirection'] === 'lt' ? 'lt' : 'gt',
      thresholdValue: this.normalizeNumber(record['thresholdValue']),
      window: record['window'] === '1h' ? '1h' : '24h',
      frequency: this.normalizeFrequency(record['frequency']),
      notifyDelta: Boolean(record['notifyDelta']),
      note: this.normalizeText(record['note'], ''),
      route: this.normalizeRoute(record['route']),
      active: record['active'] !== false,
      createdAt,
      updatedAt: this.normalizeIsoTimestamp(record['updatedAt']) ?? createdAt,
    };
  }

  private sortEntries(entries: readonly IndicatorAlertRuleRecord[]): IndicatorAlertRuleRecord[] {
    return [...entries].sort((left, right) => {
      const activeOrder = Number(right.active) - Number(left.active);
      if (activeOrder !== 0) {
        return activeOrder;
      }
      return this.toTimestamp(right.updatedAt) - this.toTimestamp(left.updatedAt);
    });
  }

  private toTimestamp(value: string | null | undefined): number {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return 0;
    }
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  private normalizeId(value: unknown): string | null {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeText(value: unknown, fallback: string): string {
    if (typeof value !== 'string') {
      return fallback;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : fallback;
  }

  private normalizeRoute(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeNumber(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private normalizeFrequency(value: unknown): IndicatorAlertFrequency {
    if (value === 'instant' || value === 'daily') {
      return value;
    }
    return 'hourly';
  }

  private normalizeIsoTimestamp(value: unknown): string | null {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return null;
    }
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) {
      return null;
    }
    return new Date(timestamp).toISOString();
  }

  private generateId(): string {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (typeof uuid === 'string' && uuid.length > 0) {
      return uuid;
    }
    return `indicator-alert-rule-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
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
