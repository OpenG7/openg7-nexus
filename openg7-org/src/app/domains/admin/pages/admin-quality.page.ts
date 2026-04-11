import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import {
  AdminQualityMatrixBucket,
  AdminQualityMatrixEntry,
  AdminQualityMatrixPriority,
  AdminQualityMatrixService,
  AdminQualityMatrixSnapshot,
  AdminQualityMatrixStatus,
} from '../data-access/admin-quality-matrix.service';

type FilterValue<T extends string> = 'all' | T;

@Component({
  standalone: true,
  selector: 'og7-admin-quality-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-quality.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminQualityPage implements OnInit {
  private readonly service = inject(AdminQualityMatrixService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly snapshot = signal<AdminQualityMatrixSnapshot | null>(null);

  readonly search = signal('');
  readonly selectedDomain = signal<FilterValue<string>>('all');
  readonly selectedPriority = signal<FilterValue<AdminQualityMatrixPriority>>('all');
  readonly selectedE2EStatus = signal<FilterValue<AdminQualityMatrixStatus>>('all');
  readonly selectedBucket = signal<FilterValue<AdminQualityMatrixBucket>>('all');

  readonly entries = computed(() => this.snapshot()?.entries ?? []);

  readonly domainOptions = computed(() => {
    const options = new Set(this.entries().map((entry) => entry.domain));
    return ['all', ...Array.from(options).sort((left, right) => left.localeCompare(right, 'fr-CA'))];
  });

  readonly filteredEntries = computed(() => {
    const query = this.search().trim().toLocaleLowerCase('fr-CA');

    return [...this.entries()]
      .filter((entry) => {
        if (this.selectedDomain() !== 'all' && entry.domain !== this.selectedDomain()) {
          return false;
        }
        if (this.selectedPriority() !== 'all' && entry.priority !== this.selectedPriority()) {
          return false;
        }
        if (this.selectedE2EStatus() !== 'all' && entry.e2eStatus !== this.selectedE2EStatus()) {
          return false;
        }
        if (this.selectedBucket() !== 'all' && entry.managementBucket !== this.selectedBucket()) {
          return false;
        }
        if (!query) {
          return true;
        }

        const haystack = [entry.domain, entry.need, entry.observedGap, entry.nextMove, ...entry.evidence]
          .join(' ')
          .toLocaleLowerCase('fr-CA');

        return haystack.includes(query);
      })
      .sort((left, right) => this.compareEntries(left, right));
  });

  readonly totalDomains = computed(() => this.entries().length);
  readonly provedCount = computed(() => this.entries().filter((entry) => entry.e2eStatus === 'oui').length);
  readonly proofGapCount = computed(
    () =>
      this.entries().filter(
        (entry) => entry.e2eStatus !== 'oui' && !entry.needsProductWorkFirst && entry.managementBucket === 'proof-gap'
      ).length
  );
  readonly productWorkCount = computed(
    () => this.entries().filter((entry) => entry.e2eStatus !== 'oui' && entry.needsProductWorkFirst).length
  );
  readonly highPriorityGapCount = computed(
    () => this.entries().filter((entry) => entry.e2eStatus !== 'oui' && entry.priority === 'haute').length
  );

  readonly hasActiveFilters = computed(
    () =>
      Boolean(this.search().trim()) ||
      this.selectedDomain() !== 'all' ||
      this.selectedPriority() !== 'all' ||
      this.selectedE2EStatus() !== 'all' ||
      this.selectedBucket() !== 'all'
  );

  ngOnInit(): void {
    this.service
      .loadMatrix()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (snapshot) => {
          this.snapshot.set(snapshot);
          this.loading.set(false);
          this.error.set(null);
        },
        error: () => {
          this.error.set("Impossible de charger la matrice QA.");
          this.loading.set(false);
        },
      });
  }

  setSearch(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.search.set(value);
  }

  setDomainFilter(event: Event): void {
    this.selectedDomain.set(((event.target as HTMLSelectElement | null)?.value as FilterValue<string>) ?? 'all');
  }

  setPriorityFilter(event: Event): void {
    this.selectedPriority.set(
      ((event.target as HTMLSelectElement | null)?.value as FilterValue<AdminQualityMatrixPriority>) ?? 'all'
    );
  }

  setE2EFilter(event: Event): void {
    this.selectedE2EStatus.set(
      ((event.target as HTMLSelectElement | null)?.value as FilterValue<AdminQualityMatrixStatus>) ?? 'all'
    );
  }

  setBucketFilter(event: Event): void {
    this.selectedBucket.set(
      ((event.target as HTMLSelectElement | null)?.value as FilterValue<AdminQualityMatrixBucket>) ?? 'all'
    );
  }

  resetFilters(): void {
    this.search.set('');
    this.selectedDomain.set('all');
    this.selectedPriority.set('all');
    this.selectedE2EStatus.set('all');
    this.selectedBucket.set('all');
  }

  statusLabel(status: AdminQualityMatrixStatus): string {
    switch (status) {
      case 'oui':
        return 'Oui';
      case 'partiel':
        return 'Partiel';
      case 'hors MVP':
        return 'Hors MVP';
      default:
        return 'Non';
    }
  }

  priorityLabel(priority: AdminQualityMatrixPriority): string {
    switch (priority) {
      case 'haute':
        return 'Haute';
      case 'basse':
        return 'Basse';
      default:
        return 'Moyenne';
    }
  }

  bucketLabel(bucket: AdminQualityMatrixBucket): string {
    switch (bucket) {
      case 'covered':
        return 'Couvert';
      case 'product-gap':
        return 'Produit d abord';
      case 'scope-limit':
        return 'Hors scope courant';
      default:
        return 'Preuve a renforcer';
    }
  }

  statusClasses(status: AdminQualityMatrixStatus): string {
    switch (status) {
      case 'oui':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'partiel':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'hors MVP':
        return 'border-slate-200 bg-slate-100 text-slate-700';
      default:
        return 'border-rose-200 bg-rose-50 text-rose-700';
    }
  }

  priorityClasses(priority: AdminQualityMatrixPriority): string {
    switch (priority) {
      case 'haute':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      case 'basse':
        return 'border-slate-200 bg-slate-100 text-slate-700';
      default:
        return 'border-amber-200 bg-amber-50 text-amber-700';
    }
  }

  bucketClasses(bucket: AdminQualityMatrixBucket): string {
    switch (bucket) {
      case 'covered':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'product-gap':
        return 'border-indigo-200 bg-indigo-50 text-indigo-700';
      case 'scope-limit':
        return 'border-slate-200 bg-slate-100 text-slate-700';
      default:
        return 'border-sky-200 bg-sky-50 text-sky-700';
    }
  }

  readinessLabel(entry: AdminQualityMatrixEntry): string {
    if (entry.e2eStatus === 'oui') {
      return 'Prouve';
    }
    if (entry.needsProductWorkFirst) {
      return 'Produit d abord';
    }
    return 'Pret pour preuve QA';
  }

  readinessClasses(entry: AdminQualityMatrixEntry): string {
    if (entry.e2eStatus === 'oui') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }
    if (entry.needsProductWorkFirst) {
      return 'border-indigo-200 bg-indigo-50 text-indigo-700';
    }
    return 'border-sky-200 bg-sky-50 text-sky-700';
  }

  trackEntry = (_: number, entry: AdminQualityMatrixEntry) => entry.id;

  private compareEntries(left: AdminQualityMatrixEntry, right: AdminQualityMatrixEntry): number {
    return (
      this.priorityRank(right.priority) - this.priorityRank(left.priority) ||
      this.statusRank(left.e2eStatus) - this.statusRank(right.e2eStatus) ||
      left.domain.localeCompare(right.domain, 'fr-CA') ||
      left.need.localeCompare(right.need, 'fr-CA')
    );
  }

  private priorityRank(priority: AdminQualityMatrixPriority): number {
    switch (priority) {
      case 'haute':
        return 3;
      case 'moyenne':
        return 2;
      default:
        return 1;
    }
  }

  private statusRank(status: AdminQualityMatrixStatus): number {
    switch (status) {
      case 'non':
        return 0;
      case 'partiel':
        return 1;
      case 'hors MVP':
        return 2;
      default:
        return 3;
    }
  }
}
