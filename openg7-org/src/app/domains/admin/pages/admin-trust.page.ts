import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import {
  CompanyRecord,
  CompanyService,
  CompanyTrustDirection,
  CompanyTrustRecord,
  CompanyTrustRecordType,
  CompanyVerificationSource,
  CompanyVerificationSourceStatus,
  CompanyVerificationSourceType,
  CompanyVerificationStatus,
} from '@app/core/services/company.service';

const VERIFICATION_STATUS_LABELS: Record<CompanyVerificationStatus, string> = {
  unverified: 'Unverified',
  pending: 'Pending review',
  verified: 'Verified',
  correctionRequested: 'Correction requested',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

const SOURCE_STATUS_LABELS: Record<CompanyVerificationSourceStatus, string> = {
  pending: 'Pending',
  validated: 'Validated',
  revoked: 'Revoked',
};

const SOURCE_TYPE_LABELS: Record<CompanyVerificationSourceType, string> = {
  registry: 'Official registry',
  chamber: 'Chamber of commerce',
  audit: 'Audit',
  other: 'Other',
};

const HISTORY_TYPE_LABELS: Record<CompanyTrustRecordType, string> = {
  transaction: 'Transaction',
  evaluation: 'Evaluation',
};

const HISTORY_DIRECTION_LABELS: Record<CompanyTrustDirection, string> = {
  inbound: 'Inbound',
  outbound: 'Outbound',
};

@Component({
  standalone: true,
  selector: 'og7-admin-trust-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-trust.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Chargée par le routeur Angular pour afficher la page « Admin Trust » du dossier « domains/admin/pages ».
 * Raison d’être : Lie le template standalone et les dépendances de cette page pour la rendre navigable.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns AdminTrustPage gérée par le framework.
 */
export class AdminTrustPage implements OnInit {
  private readonly companiesService = inject(CompanyService);
  private readonly notifications = injectNotificationStore();
  private readonly fb = inject(FormBuilder);

  protected readonly companies = this.companiesService.companies();
  protected readonly loading = this.companiesService.loading();
  protected readonly error = this.companiesService.error();

  protected readonly selectedCompany = signal<CompanyRecord | null>(null);
  protected readonly sources = signal<CompanyVerificationSource[]>([]);
  protected readonly history = signal<CompanyTrustRecord[]>([]);
  protected readonly saving = signal(false);
  protected readonly reviewNoteControl = this.fb.control('', { nonNullable: true });

  protected readonly statusControl = this.fb.control<CompanyVerificationStatus>('unverified', {
    nonNullable: true,
  });

  protected readonly verificationStatuses = [
    'unverified',
    'pending',
    'verified',
    'correctionRequested',
    'rejected',
    'suspended',
  ] as const;
  protected readonly sourceTypes = ['registry', 'chamber', 'audit', 'other'] as const;
  protected readonly sourceStatuses = ['pending', 'validated', 'revoked'] as const;
  protected readonly historyTypes = ['transaction', 'evaluation'] as const;
  protected readonly historyDirections = ['inbound', 'outbound'] as const;
  protected readonly reviewCompanies = computed(() =>
    [...this.companies()].sort((left, right) => {
      const delta = this.reviewPriority(left) - this.reviewPriority(right);
      return delta !== 0 ? delta : left.name.localeCompare(right.name);
    })
  );
  protected readonly reviewQueueStats = computed(() => {
    const companies = this.companies();
    const awaiting = companies.filter(
      (company) => company.verificationStatus === 'pending' || company.verificationStatus === 'unverified'
    ).length;
    const correctionLoop = companies.filter(
      (company) => company.verificationStatus === 'correctionRequested'
    ).length;
    const blocked = companies.filter(
      (company) => company.verificationStatus === 'rejected' || company.verificationStatus === 'suspended'
    ).length;
    const readyToVerify = companies.filter(
      (company) =>
        this.hasValidatedSource(company.verificationSources) &&
        company.verificationStatus !== 'verified' &&
        company.verificationStatus !== 'rejected'
    ).length;

    return [
      { id: 'awaiting', label: 'Awaiting review', value: awaiting, tone: 'amber' },
      { id: 'correction', label: 'Correction loop', value: correctionLoop, tone: 'orange' },
      { id: 'ready', label: 'Ready to verify', value: readyToVerify, tone: 'emerald' },
      { id: 'blocked', label: 'Blocked decisions', value: blocked, tone: 'rose' },
    ] as const;
  });

  protected readonly newSourceForm = this.fb.group({
    name: ['', Validators.required],
    type: this.fb.control<CompanyVerificationSourceType>('registry', { nonNullable: true }),
    status: this.fb.control<CompanyVerificationSourceStatus>('pending', { nonNullable: true }),
    referenceId: [''],
    url: [''],
    evidenceUrl: [''],
    issuedAt: [''],
    lastCheckedAt: [''],
    notes: [''],
  });

  protected readonly newHistoryForm = this.fb.group({
    label: ['', Validators.required],
    type: this.fb.control<CompanyTrustRecordType>('transaction', { nonNullable: true }),
    direction: this.fb.control<CompanyTrustDirection>('inbound', { nonNullable: true }),
    occurredAt: ['', Validators.required],
    amount: [''],
    score: [''],
    notes: [''],
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.companiesService.loadCompanies({ status: 'all' });
  }

  selectCompany(company: CompanyRecord): void {
    this.selectedCompany.set(company);
    this.statusControl.setValue(company.verificationStatus);
    this.sources.set(company.verificationSources.slice());
    this.history.set(company.trustHistory.slice());
    this.reviewNoteControl.setValue('');
  }

  statusLabel(status: CompanyVerificationStatus): string {
    return VERIFICATION_STATUS_LABELS[status] ?? status;
  }

  reviewToneClass(tone: 'amber' | 'orange' | 'emerald' | 'rose'): string {
    switch (tone) {
      case 'emerald':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'orange':
        return 'border-orange-200 bg-orange-50 text-orange-700';
      case 'rose':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      default:
        return 'border-amber-200 bg-amber-50 text-amber-700';
    }
  }

  sourceStatusLabel(status: CompanyVerificationSourceStatus): string {
    return SOURCE_STATUS_LABELS[status] ?? status;
  }

  sourceTypeLabel(type: CompanyVerificationSourceType): string {
    return SOURCE_TYPE_LABELS[type] ?? type;
  }

  historyTypeLabel(type: CompanyTrustRecordType): string {
    return HISTORY_TYPE_LABELS[type] ?? type;
  }

  historyDirectionLabel(direction: CompanyTrustDirection): string {
    return HISTORY_DIRECTION_LABELS[direction] ?? direction;
  }

  reviewSummary(company: CompanyRecord): string {
    switch (company.verificationStatus) {
      case 'verified':
        return 'Verified and synced publicly.';
      case 'correctionRequested':
        return 'Waiting on partner corrections before approval.';
      case 'rejected':
        return 'Rejected until a new proof package is submitted.';
      case 'suspended':
        return 'Badge visibility is suspended pending follow-up.';
      case 'pending':
        return this.hasValidatedSource(company.verificationSources)
          ? 'Validated evidence is ready for a decision.'
          : 'Awaiting initial verification review.';
      default:
        return 'No formal proof package is attached yet.';
    }
  }

  selectedReviewReasons(): string[] {
    const company = this.selectedCompany();
    if (!company) {
      return [];
    }

    const nextStatus = this.statusControl.value;
    const sources = this.sources();
    const history = this.history();
    const reasons: string[] = [];

    if (!this.hasValidatedSource(sources)) {
      reasons.push('No validated evidence source is attached yet.');
    }
    if (sources.some((source) => source.status === 'revoked')) {
      reasons.push('At least one badge source is revoked and needs follow-up.');
    }
    if (!history.some((record) => record.type === 'evaluation')) {
      reasons.push('No formal evaluation has been logged for this company.');
    }
    if (company.verificationStatus !== nextStatus) {
      reasons.push(`Pending decision: ${this.statusLabel(nextStatus)}.`);
    }
    if (nextStatus === 'correctionRequested') {
      reasons.push('The partner must submit corrected evidence before verification resumes.');
    }
    if (nextStatus === 'rejected') {
      reasons.push('The current proof package is blocked until a new submission is created.');
    }
    if (!reasons.length) {
      reasons.push('Current verification package is internally consistent.');
    }

    return reasons;
  }

  applyQuickDecision(status: CompanyVerificationStatus): void {
    this.statusControl.setValue(status);
    if (!this.reviewNoteControl.value.trim()) {
      this.reviewNoteControl.setValue(this.defaultReviewNote(status));
    }
  }

  setSourceType(index: number, raw: string): void {
    const type = raw === 'audit' || raw === 'chamber' || raw === 'other' ? raw : 'registry';
    this.patchSource(index, { type });
  }

  setSourceStatus(index: number, raw: string): void {
    const status = raw === 'validated' || raw === 'revoked' ? raw : 'pending';
    this.patchSource(index, { status });
  }

  updateSourceField(index: number, field: keyof CompanyVerificationSource, value: string): void {
    let patch: Partial<CompanyVerificationSource> | null = null;
    if (field === 'issuedAt' || field === 'lastCheckedAt') {
      patch = { [field]: value ? value : null } as Partial<CompanyVerificationSource>;
    } else if (field === 'referenceId' || field === 'url' || field === 'evidenceUrl') {
      const trimmed = value.trim();
      patch = { [field]: trimmed ? trimmed : null } as Partial<CompanyVerificationSource>;
    } else if (field === 'notes') {
      const trimmed = value.trim();
      patch = { notes: trimmed ? trimmed : null };
    } else if (field === 'name') {
      patch = { name: value.trim() };
    }
    if (patch) {
      this.patchSource(index, patch);
    }
  }

  removeSource(index: number): void {
    const list = this.sources().slice();
    if (index < 0 || index >= list.length) {
      return;
    }
    list.splice(index, 1);
    this.sources.set(list);
  }

  addSource(): void {
    if (this.newSourceForm.invalid) {
      return;
    }
    const value = this.newSourceForm.getRawValue();
    const name = value.name?.trim() ?? '';
    if (!name) {
      return;
    }
    const next: CompanyVerificationSource = {
      id: null,
      name,
      type: value.type,
      status: value.status,
      referenceId: value.referenceId?.trim() || null,
      url: value.url?.trim() || null,
      evidenceUrl: value.evidenceUrl?.trim() || null,
      issuedAt: value.issuedAt || null,
      lastCheckedAt: value.lastCheckedAt || null,
      notes: value.notes?.trim() || null,
    };
    this.sources.set([...this.sources(), next]);
    this.newSourceForm.reset({
      name: '',
      type: 'registry',
      status: 'pending',
      referenceId: '',
      url: '',
      evidenceUrl: '',
      issuedAt: '',
      lastCheckedAt: '',
      notes: '',
    });
  }

  setHistoryType(index: number, raw: string): void {
    const type = raw === 'evaluation' ? 'evaluation' : 'transaction';
    this.patchHistory(index, { type });
  }

  setHistoryDirection(index: number, raw: string): void {
    const direction = raw === 'outbound' ? 'outbound' : 'inbound';
    this.patchHistory(index, { direction });
  }

  updateHistoryField(index: number, field: keyof CompanyTrustRecord, value: string): void {
    if (field === 'amount' || field === 'score') {
      const numeric = value.trim() === '' ? null : Number(value);
      this.patchHistory(index, { [field]: Number.isNaN(numeric) ? null : numeric } as Partial<CompanyTrustRecord>);
      return;
    }
    let patch: Partial<CompanyTrustRecord> | null = null;
    if (field === 'label') {
      patch = { label: value.trim() };
    } else if (field === 'notes') {
      const trimmed = value.trim();
      patch = { notes: trimmed ? trimmed : null };
    } else if (field === 'occurredAt') {
      patch = { occurredAt: value };
    }
    if (patch) {
      this.patchHistory(index, patch);
    }
  }

  removeHistoryEntry(index: number): void {
    const list = this.history().slice();
    if (index < 0 || index >= list.length) {
      return;
    }
    list.splice(index, 1);
    this.history.set(list);
  }

  addHistoryEntry(): void {
    if (this.newHistoryForm.invalid) {
      return;
    }
    const value = this.newHistoryForm.getRawValue();
    const label = value.label?.trim() ?? '';
    const occurredAt = value.occurredAt ?? '';
    if (!label || !occurredAt) {
      return;
    }
    const entry: CompanyTrustRecord = {
      id: null,
      label,
      type: value.type,
      direction: value.direction,
      occurredAt,
      amount: value.amount?.trim() ? Number(value.amount) || null : null,
      score: value.score?.trim() ? Number(value.score) || null : null,
      notes: value.notes?.trim() || null,
    };
    this.history.set([...this.history(), entry]);
    this.newHistoryForm.reset({
      label: '',
      type: 'transaction',
      direction: 'inbound',
      occurredAt: '',
      amount: '',
      score: '',
      notes: '',
    });
  }

  save(): void {
    const company = this.selectedCompany();
    if (!company || this.saving()) {
      return;
    }

    const nextStatus = this.statusControl.value;
    const decisionEntry = this.buildReviewEntry(company, nextStatus);
    const trustHistory = decisionEntry ? [...this.history(), decisionEntry] : this.history();

    this.saving.set(true);
    this.companiesService
      .updateVerification(company.id, {
        verificationStatus: nextStatus,
        verificationSources: this.sources(),
        trustHistory,
      })
      .subscribe({
        next: (updated) => {
          this.notifications.success('Verification data updated.', {
            source: 'admin-trust',
            metadata: { companyId: updated.id },
          });
          this.selectedCompany.set(updated);
          this.statusControl.setValue(updated.verificationStatus);
          this.sources.set(updated.verificationSources.slice());
          this.history.set(updated.trustHistory.slice());
          this.reviewNoteControl.setValue('');
          this.saving.set(false);
        },
        error: () => {
          this.notifications.error('Failed to update verification data.', {
            source: 'admin-trust',
            metadata: { companyId: company.id },
          });
          this.saving.set(false);
        },
      });
  }

  private patchSource(index: number, patch: Partial<CompanyVerificationSource>): void {
    const list = this.sources().slice();
    const target = list[index];
    if (!target) {
      return;
    }
    list[index] = { ...target, ...patch };
    this.sources.set(list);
  }

  private patchHistory(index: number, patch: Partial<CompanyTrustRecord>): void {
    const list = this.history().slice();
    const target = list[index];
    if (!target) {
      return;
    }
    list[index] = { ...target, ...patch };
    this.history.set(list);
  }

  private reviewPriority(company: CompanyRecord): number {
    switch (company.verificationStatus) {
      case 'correctionRequested':
        return 0;
      case 'pending':
        return this.hasValidatedSource(company.verificationSources) ? 1 : 2;
      case 'rejected':
        return 3;
      case 'suspended':
        return 4;
      case 'unverified':
        return 5;
      default:
        return 6;
    }
  }

  private hasValidatedSource(
    sources: readonly Pick<CompanyVerificationSource, 'status'>[] | null | undefined
  ): boolean {
    return (sources ?? []).some((source) => source.status === 'validated');
  }

  private buildReviewEntry(
    company: CompanyRecord,
    nextStatus: CompanyVerificationStatus
  ): CompanyTrustRecord | null {
    const reviewNote = this.reviewNoteControl.value.trim();
    if (!reviewNote && company.verificationStatus === nextStatus) {
      return null;
    }

    return {
      id: null,
      label: this.reviewEntryLabel(nextStatus),
      type: 'evaluation',
      direction: 'inbound',
      occurredAt: this.today(),
      score: null,
      notes: reviewNote || this.defaultReviewNote(nextStatus),
    };
  }

  private reviewEntryLabel(status: CompanyVerificationStatus): string {
    switch (status) {
      case 'verified':
        return 'Verification approved';
      case 'correctionRequested':
        return 'Corrections requested';
      case 'rejected':
        return 'Verification rejected';
      case 'suspended':
        return 'Verification suspended';
      case 'pending':
        return 'Verification queued for review';
      default:
        return 'Verification reset';
    }
  }

  private defaultReviewNote(status: CompanyVerificationStatus): string {
    switch (status) {
      case 'verified':
        return 'Evidence package approved and public badge can stay visible.';
      case 'correctionRequested':
        return 'Additional supporting evidence is required before verification can continue.';
      case 'rejected':
        return 'Current evidence package was rejected and must be resubmitted.';
      case 'suspended':
        return 'Badge exposure is suspended pending a follow-up review.';
      case 'pending':
        return 'Verification remains in the active review queue.';
      default:
        return 'Verification package was reset to an unverified state.';
    }
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
