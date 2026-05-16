import { Injectable, PLATFORM_ID, Signal, computed, inject } from '@angular/core';
import { AuthService } from '@app/core/auth/auth.service';
import {
  CompanyStatus,
  CompanyTrustRecord,
  CompanyTrustDirection,
  CompanyTrustRecordType,
  CompanyVerificationSource,
  CompanyVerificationSourceStatus,
  CompanyVerificationSourceType,
  CompanyVerificationStatus,
} from '@app/core/services/company.service';
import { createUserScopedPersistentState } from '@app/core/storage/user-scoped-persistent-state';

const STORAGE_KEY_PREFIX = 'og7.admin-trust-drafts.v1';

export interface AdminTrustLifecycleDraft {
  readonly companyId: number;
  readonly verificationStatus: CompanyVerificationStatus;
  readonly publicationStatus: CompanyStatus;
  readonly verificationSources: readonly CompanyVerificationSource[];
  readonly trustHistory: readonly CompanyTrustRecord[];
  readonly reviewNote: string;
  readonly updatedAt: string;
}

type AdminTrustDraftMap = Readonly<Record<string, AdminTrustLifecycleDraft>>;

@Injectable({ providedIn: 'root' })
export class AdminTrustDraftsService {
  private readonly auth = inject(AuthService);
  private readonly state = createUserScopedPersistentState<AdminTrustDraftMap>({
    auth: this.auth,
    platformId: inject(PLATFORM_ID),
    storageKeyPrefix: STORAGE_KEY_PREFIX,
    createEmptyValue: () => ({}),
    deserialize: (value) => this.deserializeDraftMap(value),
  });

  readonly drafts = this.state.value;
  readonly queuedCompanyIds: Signal<readonly number[]> = computed(() =>
    Object.values(this.drafts())
      .map((draft) => draft.companyId)
      .filter((companyId, index, values) => values.indexOf(companyId) === index)
      .sort((left, right) => left - right),
  );

  draftFor(companyId: number | null | undefined): AdminTrustLifecycleDraft | null {
    const normalizedId = this.normalizeCompanyId(companyId);
    if (normalizedId == null) {
      return null;
    }
    return this.drafts()[String(normalizedId)] ?? null;
  }

  saveDraft(draft: AdminTrustLifecycleDraft): AdminTrustLifecycleDraft {
    const normalized = this.normalizeDraft(draft);
    if (!normalized) {
      throw new Error('adminTrustDraft.invalidDraft');
    }

    this.state.updateForCurrentUser(
      (current) => ({
        ...current,
        [String(normalized.companyId)]: normalized,
      }),
      'Admin trust drafts require an authenticated session.',
    );

    return normalized;
  }

  clearDraft(companyId: number): void {
    const normalizedId = this.normalizeCompanyId(companyId);
    if (normalizedId == null) {
      return;
    }

    this.state.updateForCurrentUser((current) => {
      if (!current[String(normalizedId)]) {
        return current;
      }

      const next = { ...current };
      delete next[String(normalizedId)];
      return next;
    }, 'Admin trust drafts require an authenticated session.');
  }

  private deserializeDraftMap(value: unknown): AdminTrustDraftMap | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const entries = Object.entries(value as Record<string, unknown>);
    const next: Record<string, AdminTrustLifecycleDraft> = {};
    for (const [key, rawDraft] of entries) {
      const draft = this.normalizeDraft(rawDraft);
      if (!draft) {
        continue;
      }
      next[key] = draft;
    }

    return next;
  }

  private normalizeDraft(value: unknown): AdminTrustLifecycleDraft | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const entry = value as Partial<AdminTrustLifecycleDraft>;
    const companyId = this.normalizeCompanyId(entry.companyId);
    if (companyId == null) {
      return null;
    }

    const verificationStatus = this.normalizeVerificationStatus(entry.verificationStatus);
    const publicationStatus = this.normalizePublicationStatus(entry.publicationStatus);
    const updatedAt =
      typeof entry.updatedAt === 'string' && entry.updatedAt.trim()
        ? entry.updatedAt
        : new Date().toISOString();

    return {
      companyId,
      verificationStatus,
      publicationStatus,
      verificationSources: this.normalizeVerificationSources(entry.verificationSources),
      trustHistory: this.normalizeTrustHistory(entry.trustHistory),
      reviewNote: typeof entry.reviewNote === 'string' ? entry.reviewNote : '',
      updatedAt,
    };
  }

  private normalizeCompanyId(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      return null;
    }
    return value;
  }

  private normalizeVerificationStatus(value: unknown): CompanyVerificationStatus {
    return value === 'pending' ||
      value === 'verified' ||
      value === 'correctionRequested' ||
      value === 'rejected' ||
      value === 'suspended'
      ? value
      : 'unverified';
  }

  private normalizePublicationStatus(value: unknown): CompanyStatus {
    return value === 'approved' || value === 'suspended' ? value : 'pending';
  }

  private normalizeVerificationSources(
    value: readonly CompanyVerificationSource[] | unknown,
  ): readonly CompanyVerificationSource[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((source) => this.normalizeVerificationSource(source))
      .filter((source): source is CompanyVerificationSource => source !== null);
  }

  private normalizeVerificationSource(value: unknown): CompanyVerificationSource | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const entry = value as Partial<CompanyVerificationSource>;
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    if (!name) {
      return null;
    }

    return {
      id: typeof entry.id === 'number' ? entry.id : null,
      name,
      type: this.normalizeVerificationSourceType(entry.type),
      status: this.normalizeVerificationSourceStatus(entry.status),
      referenceId: this.normalizeOptionalString(entry.referenceId),
      url: this.normalizeOptionalString(entry.url),
      evidenceUrl: this.normalizeOptionalString(entry.evidenceUrl),
      issuedAt: this.normalizeOptionalString(entry.issuedAt),
      lastCheckedAt: this.normalizeOptionalString(entry.lastCheckedAt),
      notes: this.normalizeOptionalString(entry.notes),
    };
  }

  private normalizeVerificationSourceType(value: unknown): CompanyVerificationSourceType {
    return value === 'chamber' || value === 'audit' || value === 'other' ? value : 'registry';
  }

  private normalizeVerificationSourceStatus(value: unknown): CompanyVerificationSourceStatus {
    return value === 'validated' || value === 'revoked' ? value : 'pending';
  }

  private normalizeTrustHistory(
    value: readonly CompanyTrustRecord[] | unknown,
  ): readonly CompanyTrustRecord[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((record) => this.normalizeTrustRecord(record))
      .filter((record): record is CompanyTrustRecord => record !== null);
  }

  private normalizeTrustRecord(value: unknown): CompanyTrustRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const entry = value as Partial<CompanyTrustRecord>;
    const label = typeof entry.label === 'string' ? entry.label.trim() : '';
    const occurredAt = typeof entry.occurredAt === 'string' ? entry.occurredAt.trim() : '';
    if (!label || !occurredAt) {
      return null;
    }

    return {
      id: typeof entry.id === 'number' ? entry.id : null,
      label,
      type: this.normalizeTrustRecordType(entry.type),
      direction: this.normalizeTrustDirection(entry.direction),
      occurredAt,
      amount: this.normalizeOptionalNumber(entry.amount),
      score: this.normalizeOptionalNumber(entry.score),
      notes: this.normalizeOptionalString(entry.notes),
    };
  }

  private normalizeTrustRecordType(value: unknown): CompanyTrustRecordType {
    return value === 'evaluation' ? value : 'transaction';
  }

  private normalizeTrustDirection(value: unknown): CompanyTrustDirection {
    return value === 'outbound' ? value : 'inbound';
  }

  private normalizeOptionalString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private normalizeOptionalNumber(value: unknown): number | null {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return null;
    }
    return value;
  }
}
