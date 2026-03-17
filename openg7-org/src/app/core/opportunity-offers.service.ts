import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';

import { AuthService } from './auth/auth.service';

const STORAGE_KEY_PREFIX = 'og7.opportunity-offers.v1';

export type OpportunityOfferRecipientKind = 'GOV' | 'COMPANY' | 'PARTNER' | 'USER';
export type OpportunityOfferStatus = 'submitted' | 'withdrawn';
export type OpportunityOfferActivityType = 'submitted' | 'tracked' | 'withdrawn';
export type OpportunityOfferActivityActor = 'sender' | 'system';

export interface OpportunityOfferActivityRecord {
  id: string;
  type: OpportunityOfferActivityType;
  actor: OpportunityOfferActivityActor;
  createdAt: string;
}

export interface OpportunityOfferRecord {
  id: string;
  reference: string;
  opportunityId: string;
  opportunityTitle: string;
  opportunityRoute: string | null;
  recipientKind: OpportunityOfferRecipientKind;
  recipientLabel: string;
  senderUserId: string;
  senderLabel: string;
  senderEmail: string;
  capacityMw: number;
  startDate: string;
  endDate: string;
  pricingModel: string;
  comment: string;
  attachmentName: string | null;
  status: OpportunityOfferStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string;
  withdrawnAt: string | null;
  activities: readonly OpportunityOfferActivityRecord[];
}

export interface CreateOpportunityOfferPayload {
  opportunityId: string;
  opportunityTitle: string;
  opportunityRoute?: string | null;
  recipientKind: OpportunityOfferRecipientKind;
  recipientLabel: string;
  capacityMw: number;
  startDate: string;
  endDate: string;
  pricingModel: string;
  comment: string;
  attachmentName?: string | null;
}

@Injectable({ providedIn: 'root' })
export class OpportunityOffersService {
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly entriesSig = signal<OpportunityOfferRecord[]>([]);

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

  entriesForOpportunity(opportunityId: string | null | undefined): readonly OpportunityOfferRecord[] {
    const normalizedId = this.normalizeId(opportunityId);
    if (!normalizedId) {
      return [];
    }
    return this.entriesSig().filter((entry) => entry.opportunityId === normalizedId);
  }

  create(payload: CreateOpportunityOfferPayload): OpportunityOfferRecord {
    const user = this.currentUserOrThrow();
    const now = new Date().toISOString();
    const record = this.normalizeRecord({
      id: this.generateId(),
      reference: this.generateReference(now),
      opportunityId: payload.opportunityId,
      opportunityTitle: payload.opportunityTitle,
      opportunityRoute: payload.opportunityRoute ?? null,
      recipientKind: payload.recipientKind,
      recipientLabel: payload.recipientLabel,
      senderUserId: user.id,
      senderLabel: user.label,
      senderEmail: user.email,
      capacityMw: payload.capacityMw,
      startDate: payload.startDate,
      endDate: payload.endDate,
      pricingModel: payload.pricingModel,
      comment: payload.comment,
      attachmentName: payload.attachmentName ?? null,
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
      submittedAt: now,
      withdrawnAt: null,
      activities: this.createInitialActivities(now),
    });

    const nextEntries = this.sortEntries([record, ...this.entriesSig()]);
    this.entriesSig.set(nextEntries);
    this.persist(user.id, nextEntries);
    return record;
  }

  withdraw(id: string): OpportunityOfferRecord | null {
    const userId = this.currentUserIdOrThrow();
    const normalizedId = this.normalizeId(id);
    if (!normalizedId) {
      return null;
    }

    let updatedRecord: OpportunityOfferRecord | null = null;
    const now = new Date().toISOString();
    const nextEntries = this.sortEntries(
      this.entriesSig().map((entry) => {
        if (entry.id !== normalizedId || entry.status === 'withdrawn') {
          return entry;
        }
        updatedRecord = {
          ...entry,
          status: 'withdrawn',
          updatedAt: now,
          withdrawnAt: now,
          activities: this.sortActivities([
            this.createActivity({
              type: 'withdrawn',
              actor: 'sender',
              createdAt: now,
            }),
            ...entry.activities,
          ]),
        };
        return updatedRecord;
      })
    );

    this.entriesSig.set(nextEntries);
    this.persist(userId, nextEntries);
    return updatedRecord;
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
    throw new Error('Opportunity offers require an authenticated session.');
  }

  private currentUserOrThrow(): { id: string; email: string; label: string } {
    const userId = this.currentUserIdOrThrow();
    const profile = this.auth.user();
    const email = this.normalizeText(profile?.email, 'unknown@openg7.local');
    const firstName = this.normalizeText(profile?.firstName, '');
    const lastName = this.normalizeText(profile?.lastName, '');
    const label = [firstName, lastName].filter(Boolean).join(' ').trim() || email;
    return {
      id: userId,
      email,
      label,
    };
  }

  private storageKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}.${userId}`;
  }

  private restore(userId: string): OpportunityOfferRecord[] {
    const storage = this.getStorage();
    if (!storage) {
      return [];
    }

    const key = this.storageKey(userId);
    const raw = storage.getItem(key);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        storage.removeItem(key);
        return [];
      }
      return this.sortEntries(parsed.map((entry) => this.normalizeRecord(entry)));
    } catch {
      storage.removeItem(key);
      return [];
    }
  }

  private persist(userId: string, entries: readonly OpportunityOfferRecord[]): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.setItem(this.storageKey(userId), JSON.stringify(entries));
    } catch {
      // Keep the in-memory state when storage is unavailable.
    }
  }

  private normalizeRecord(candidate: unknown): OpportunityOfferRecord {
    const record =
      candidate && typeof candidate === 'object'
        ? (candidate as Record<string, unknown>)
        : {};
    const now = new Date().toISOString();
    const createdAt = this.normalizeIsoTimestamp(record['createdAt']) ?? now;
    const updatedAt = this.normalizeIsoTimestamp(record['updatedAt']) ?? createdAt;
    const submittedAt = this.normalizeIsoTimestamp(record['submittedAt']) ?? createdAt;
    const withdrawnAt = this.normalizeIsoTimestamp(record['withdrawnAt']);
    const status = record['status'] === 'withdrawn' ? 'withdrawn' : 'submitted';
    const reference = this.normalizeText(record['reference'], this.generateReference(createdAt));
    const activities = this.normalizeActivities(record['activities'], {
      createdAt: updatedAt,
      submittedAt,
      withdrawnAt,
      status,
    });

    return {
      id: this.normalizeId(record['id']) ?? this.generateId(),
      reference,
      opportunityId: this.normalizeId(record['opportunityId']) ?? 'opportunity',
      opportunityTitle: this.normalizeText(record['opportunityTitle'], 'Opportunity'),
      opportunityRoute: this.normalizeRoute(record['opportunityRoute']),
      recipientKind: this.normalizeRecipientKind(record['recipientKind']),
      recipientLabel: this.normalizeText(record['recipientLabel'], 'Unknown recipient'),
      senderUserId: this.normalizeId(record['senderUserId']) ?? 'user',
      senderLabel: this.normalizeText(record['senderLabel'], 'Unknown sender'),
      senderEmail: this.normalizeText(record['senderEmail'], 'unknown@openg7.local'),
      capacityMw: this.normalizeNumber(record['capacityMw']),
      startDate: this.normalizeText(record['startDate'], ''),
      endDate: this.normalizeText(record['endDate'], ''),
      pricingModel: this.normalizeText(record['pricingModel'], 'spot'),
      comment: this.normalizeText(record['comment'], ''),
      attachmentName: this.normalizeNullableText(record['attachmentName']),
      status,
      createdAt,
      updatedAt: this.maxTimestamp(updatedAt, activities[0]?.createdAt ?? null),
      submittedAt,
      withdrawnAt,
      activities,
    };
  }

  private sortEntries(entries: readonly OpportunityOfferRecord[]): OpportunityOfferRecord[] {
    return [...entries].sort((left, right) => {
      const statusOrder = this.statusPriority(left.status) - this.statusPriority(right.status);
      if (statusOrder !== 0) {
        return statusOrder;
      }
      return this.toTimestamp(right.updatedAt) - this.toTimestamp(left.updatedAt);
    });
  }

  private statusPriority(status: OpportunityOfferStatus): number {
    return status === 'submitted' ? 0 : 1;
  }

  private normalizeActivities(
    candidate: unknown,
    fallback: {
      createdAt: string;
      submittedAt: string;
      withdrawnAt: string | null;
      status: OpportunityOfferStatus;
    }
  ): OpportunityOfferActivityRecord[] {
    if (Array.isArray(candidate)) {
      const normalized = this.sortActivities(
        candidate
          .map((entry) => this.normalizeActivity(entry))
          .filter((entry): entry is OpportunityOfferActivityRecord => Boolean(entry))
      );
      if (normalized.length > 0) {
        return normalized;
      }
    }

    const activities: OpportunityOfferActivityRecord[] = [
      this.createActivity({
        type: 'tracked',
        actor: 'system',
        createdAt: fallback.createdAt,
      }),
      this.createActivity({
        type: 'submitted',
        actor: 'sender',
        createdAt: fallback.submittedAt,
      }),
    ];

    if (fallback.status === 'withdrawn' && fallback.withdrawnAt) {
      activities.unshift(
        this.createActivity({
          type: 'withdrawn',
          actor: 'sender',
          createdAt: fallback.withdrawnAt,
        })
      );
    }

    return this.sortActivities(activities);
  }

  private normalizeActivity(candidate: unknown): OpportunityOfferActivityRecord | null {
    const activity =
      candidate && typeof candidate === 'object'
        ? (candidate as Record<string, unknown>)
        : {};
    const createdAt = this.normalizeIsoTimestamp(activity['createdAt']);
    if (!createdAt) {
      return null;
    }

    const type = this.normalizeActivityType(activity['type']);
    const actor = activity['actor'] === 'sender' ? 'sender' : 'system';

    return {
      id: this.normalizeId(activity['id']) ?? this.generateId(),
      type,
      actor,
      createdAt,
    };
  }

  private createInitialActivities(createdAt: string): readonly OpportunityOfferActivityRecord[] {
    return this.sortActivities([
      this.createActivity({
        type: 'tracked',
        actor: 'system',
        createdAt,
      }),
      this.createActivity({
        type: 'submitted',
        actor: 'sender',
        createdAt,
      }),
    ]);
  }

  private createActivity(input: {
    type: OpportunityOfferActivityType;
    actor: OpportunityOfferActivityActor;
    createdAt: string;
  }): OpportunityOfferActivityRecord {
    return {
      id: this.generateId(),
      type: input.type,
      actor: input.actor,
      createdAt: input.createdAt,
    };
  }

  private sortActivities(entries: readonly OpportunityOfferActivityRecord[]): OpportunityOfferActivityRecord[] {
    return [...entries].sort((left, right) => {
      const timestampOrder = this.toTimestamp(right.createdAt) - this.toTimestamp(left.createdAt);
      if (timestampOrder !== 0) {
        return timestampOrder;
      }
      return this.activityPriority(left.type) - this.activityPriority(right.type);
    });
  }

  private activityPriority(type: OpportunityOfferActivityType): number {
    switch (type) {
      case 'withdrawn':
        return 0;
      case 'tracked':
        return 1;
      default:
        return 2;
    }
  }

  private normalizeActivityType(value: unknown): OpportunityOfferActivityType {
    if (value === 'submitted' || value === 'tracked' || value === 'withdrawn') {
      return value;
    }
    return 'tracked';
  }

  private maxTimestamp(...values: Array<string | null | undefined>): string {
    let maxValue: string | null = null;
    let maxTimestamp = 0;

    for (const value of values) {
      const timestamp = this.toTimestamp(value);
      if (timestamp >= maxTimestamp) {
        maxTimestamp = timestamp;
        maxValue = value ?? maxValue;
      }
    }

    return maxValue ?? new Date().toISOString();
  }

  private toTimestamp(value: string | null | undefined): number {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return 0;
    }
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  private normalizeRecipientKind(value: unknown): OpportunityOfferRecipientKind {
    if (value === 'GOV' || value === 'COMPANY' || value === 'PARTNER' || value === 'USER') {
      return value;
    }
    return 'PARTNER';
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

  private normalizeNumber(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
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

  private normalizeNullableText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeRoute(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private generateReference(referenceDateIso: string): string {
    const date = new Date(referenceDateIso);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `OG7-OFR-${year}${month}${day}-${suffix}`;
  }

  private generateId(): string {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (typeof uuid === 'string' && uuid.length > 0) {
      return uuid;
    }
    return `opportunity-offer-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
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
