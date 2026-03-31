import { Injectable, PLATFORM_ID, computed, inject } from '@angular/core';

import { AuthService } from './auth/auth.service';
import { createUserScopedPersistentState } from './storage/user-scoped-persistent-state';

const STORAGE_KEY_PREFIX = 'og7.opportunity-offers.v1';

export type OpportunityOfferRecipientKind = 'GOV' | 'COMPANY' | 'PARTNER' | 'USER';
export type OpportunityOfferStatus = 'submitted' | 'inDiscussion' | 'partiallyServed' | 'withdrawn';
export type OpportunityOfferActivityType =
  | 'submitted'
  | 'tracked'
  | 'qualified'
  | 'inDiscussion'
  | 'partiallyServed'
  | 'withdrawn';
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
  allocatedCapacityMw: number | null;
  remainingOpportunityCapacityMw: number | null;
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
  private readonly state = createUserScopedPersistentState<OpportunityOfferRecord[]>({
    auth: this.auth,
    platformId: inject(PLATFORM_ID),
    storageKeyPrefix: STORAGE_KEY_PREFIX,
    createEmptyValue: () => [],
    deserialize: (value) => this.deserializeEntries(value),
  });

  readonly entries = this.state.value;
  readonly hasEntries = computed(() => this.entries().length > 0);

  refresh(): void {
    this.state.refresh();
  }

  entriesForOpportunity(opportunityId: string | null | undefined): readonly OpportunityOfferRecord[] {
    const normalizedId = this.normalizeId(opportunityId);
    if (!normalizedId) {
      return [];
    }
    return this.entries().filter((entry) => entry.opportunityId === normalizedId);
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
      allocatedCapacityMw: null,
      remainingOpportunityCapacityMw: null,
      createdAt: now,
      updatedAt: now,
      submittedAt: now,
      withdrawnAt: null,
      activities: this.createInitialActivities(now),
    });

    const nextEntries = this.sortEntries([record, ...this.entries()]);
    this.state.setForCurrentUser(
      nextEntries,
      'Opportunity offers require an authenticated session.'
    );
    return record;
  }

  markInDiscussion(id: string): OpportunityOfferRecord | null {
    const normalizedId = this.normalizeId(id);
    if (!normalizedId) {
      return null;
    }

    let updatedRecord: OpportunityOfferRecord | null = null;
    const now = new Date().toISOString();
    const nextEntries = this.sortEntries(
      this.entries().map((entry) => {
        if (
          entry.id !== normalizedId ||
          entry.status === 'withdrawn' ||
          entry.status === 'inDiscussion' ||
          entry.status === 'partiallyServed'
        ) {
          return entry;
        }

        const newActivities: OpportunityOfferActivityRecord[] = [];
        if (!entry.activities.some((activity) => activity.type === 'qualified')) {
          newActivities.push(
            this.createActivity({
              type: 'qualified',
              actor: 'system',
              createdAt: now,
            })
          );
        }
        newActivities.push(
          this.createActivity({
            type: 'inDiscussion',
            actor: 'system',
            createdAt: now,
          })
        );

        updatedRecord = {
          ...entry,
          status: 'inDiscussion',
          updatedAt: now,
          activities: this.sortActivities([...newActivities, ...entry.activities]),
        };
        return updatedRecord;
      })
    );

    this.state.setForCurrentUser(
      nextEntries,
      'Opportunity offers require an authenticated session.'
    );
    return updatedRecord;
  }

  markPartiallyServed(
    id: string,
    allocation: { allocatedCapacityMw: number; remainingOpportunityCapacityMw: number | null }
  ): OpportunityOfferRecord | null {
    const normalizedId = this.normalizeId(id);
    if (!normalizedId) {
      return null;
    }

    const allocatedCapacityMw = this.normalizeNumber(allocation.allocatedCapacityMw);
    const remainingOpportunityCapacityMw = this.normalizeNullableNumber(
      allocation.remainingOpportunityCapacityMw
    );

    let updatedRecord: OpportunityOfferRecord | null = null;
    const now = new Date().toISOString();
    const nextEntries = this.sortEntries(
      this.entries().map((entry) => {
        if (entry.id !== normalizedId || entry.status === 'withdrawn' || entry.status === 'partiallyServed') {
          return entry;
        }

        const newActivities: OpportunityOfferActivityRecord[] = [];
        if (!entry.activities.some((activity) => activity.type === 'qualified')) {
          newActivities.push(
            this.createActivity({
              type: 'qualified',
              actor: 'system',
              createdAt: now,
            })
          );
        }
        if (!entry.activities.some((activity) => activity.type === 'inDiscussion')) {
          newActivities.push(
            this.createActivity({
              type: 'inDiscussion',
              actor: 'system',
              createdAt: now,
            })
          );
        }
        newActivities.push(
          this.createActivity({
            type: 'partiallyServed',
            actor: 'system',
            createdAt: now,
          })
        );

        updatedRecord = {
          ...entry,
          status: 'partiallyServed',
          allocatedCapacityMw,
          remainingOpportunityCapacityMw,
          updatedAt: now,
          activities: this.sortActivities([...newActivities, ...entry.activities]),
        };
        return updatedRecord;
      })
    );

    this.state.setForCurrentUser(
      nextEntries,
      'Opportunity offers require an authenticated session.'
    );
    return updatedRecord;
  }

  withdraw(id: string): OpportunityOfferRecord | null {
    const normalizedId = this.normalizeId(id);
    if (!normalizedId) {
      return null;
    }

    let updatedRecord: OpportunityOfferRecord | null = null;
    const now = new Date().toISOString();
    const nextEntries = this.sortEntries(
      this.entries().map((entry) => {
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

    this.state.setForCurrentUser(
      nextEntries,
      'Opportunity offers require an authenticated session.'
    );
    return updatedRecord;
  }

  private currentUserOrThrow(): { id: string; email: string; label: string } {
    const userId = this.state.requireCurrentUserId(
      'Opportunity offers require an authenticated session.'
    );
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

  private deserializeEntries(value: unknown): OpportunityOfferRecord[] | null {
    if (!Array.isArray(value)) {
      return null;
    }

    return this.sortEntries(value.map((entry) => this.normalizeRecord(entry)));
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
    const status = this.normalizeStatus(record['status']);
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
      allocatedCapacityMw: this.normalizeNullableNumber(record['allocatedCapacityMw']),
      remainingOpportunityCapacityMw: this.normalizeNullableNumber(record['remainingOpportunityCapacityMw']),
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
    switch (status) {
      case 'inDiscussion':
        return 0;
      case 'submitted':
        return 1;
      case 'partiallyServed':
        return 2;
      default:
        return 3;
    }
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

    if (fallback.status === 'inDiscussion' || fallback.status === 'partiallyServed') {
      activities.unshift(
        this.createActivity({
          type: 'qualified',
          actor: 'system',
          createdAt: fallback.createdAt,
        }),
        this.createActivity({
          type: 'inDiscussion',
          actor: 'system',
          createdAt: fallback.createdAt,
        })
      );
    }

    if (fallback.status === 'partiallyServed') {
      activities.unshift(
        this.createActivity({
          type: 'partiallyServed',
          actor: 'system',
          createdAt: fallback.createdAt,
        })
      );
    }

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
      case 'partiallyServed':
        return 0;
      case 'withdrawn':
        return 1;
      case 'inDiscussion':
        return 2;
      case 'qualified':
        return 3;
      case 'tracked':
        return 4;
      default:
        return 5;
    }
  }

  private normalizeActivityType(value: unknown): OpportunityOfferActivityType {
    if (
      value === 'submitted' ||
      value === 'tracked' ||
      value === 'qualified' ||
      value === 'inDiscussion' ||
      value === 'partiallyServed' ||
      value === 'withdrawn'
    ) {
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

  private normalizeNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private normalizeStatus(value: unknown): OpportunityOfferStatus {
    if (
      value === 'submitted' ||
      value === 'inDiscussion' ||
      value === 'partiallyServed' ||
      value === 'withdrawn'
    ) {
      return value;
    }
    return 'submitted';
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
}
