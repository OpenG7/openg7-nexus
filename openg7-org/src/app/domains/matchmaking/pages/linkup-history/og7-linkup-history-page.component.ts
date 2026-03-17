import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LinkupDataService } from '@app/domains/matchmaking/data-access/linkup-data.service';
import {
  LINKUP_STATUS_META,
  LINKUP_TRADE_MODE_OPTIONS,
  LinkupRecord,
  LinkupStatus,
  LinkupTradeMode,
} from '@app/domains/matchmaking/data-access/linkup.models';
import { Og7SearchFieldComponent } from '@app/shared/components/search/og7-search-field.component';
import { TranslateModule } from '@ngx-translate/core';

interface StatusFilterOption {
  readonly id: LinkupStatus | 'all';
  readonly labelKey: string;
}

interface TradeModeFilterOption {
  readonly id: LinkupTradeMode | 'all';
  readonly labelKey: string;
}

@Component({
  standalone: true,
  selector: 'og7-linkup-history-page',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    Og7SearchFieldComponent,
  ],
  templateUrl: './og7-linkup-history-page.component.html',
  styleUrls: ['./og7-linkup-history-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Og7LinkupHistoryPageComponent {
  private readonly linkups = inject(LinkupDataService);
  private readonly itemsSignal = signal<readonly LinkupRecord[]>([]);
  private readonly loadingSignal = signal(true);
  private readonly errorKeySignal = signal<string | null>(null);

  private readonly filterStatusSignal = signal<LinkupStatus | 'all'>('all');
  private readonly filterModeSignal = signal<LinkupTradeMode | 'all'>('all');
  private readonly searchTermSignal = signal('');

  protected readonly statuses: readonly StatusFilterOption[] = [
    { id: 'all', labelKey: 'pages.linkups.filters.status.all' },
    { id: 'pending', labelKey: LINKUP_STATUS_META.pending.labelKey },
    { id: 'inDiscussion', labelKey: LINKUP_STATUS_META.inDiscussion.labelKey },
    { id: 'completed', labelKey: LINKUP_STATUS_META.completed.labelKey },
    { id: 'closed', labelKey: LINKUP_STATUS_META.closed.labelKey },
  ];

  protected readonly tradeModes: readonly TradeModeFilterOption[] = [
    { id: 'all', labelKey: 'pages.linkups.filters.tradeMode.all' },
    { id: 'import', labelKey: LINKUP_TRADE_MODE_OPTIONS.import },
    { id: 'export', labelKey: LINKUP_TRADE_MODE_OPTIONS.export },
    { id: 'both', labelKey: LINKUP_TRADE_MODE_OPTIONS.both },
  ];

  protected readonly loading = this.loadingSignal.asReadonly();
  protected readonly errorKey = this.errorKeySignal.asReadonly();
  protected readonly filterStatus = this.filterStatusSignal.asReadonly();
  protected readonly filterMode = this.filterModeSignal.asReadonly();
  protected readonly searchTerm = this.searchTermSignal.asReadonly();

  protected readonly filteredLinkups = computed(() => {
    const statusFilter = this.filterStatusSignal();
    const tradeModeFilter = this.filterModeSignal();
    const search = this.searchTermSignal().trim().toLowerCase();

    return this.itemsSignal().filter((linkup) => {
      if (statusFilter !== 'all' && linkup.status !== statusFilter) {
        return false;
      }
      if (tradeModeFilter !== 'all' && linkup.tradeMode !== tradeModeFilter) {
        return false;
      }
      if (!search) {
        return true;
      }
      return this.matchesSearch(linkup, search);
    });
  });

  protected readonly hasActiveFilters = computed(() => {
    return (
      this.filterStatusSignal() !== 'all'
      || this.filterModeSignal() !== 'all'
      || Boolean(this.searchTermSignal().trim())
    );
  });

  protected readonly statusCounts = computed(() => {
    const counts: Record<LinkupStatus, number> = {
      pending: 0,
      inDiscussion: 0,
      completed: 0,
      closed: 0,
    };
    for (const linkup of this.itemsSignal()) {
      counts[linkup.status] += 1;
    }
    return counts as Readonly<Record<LinkupStatus, number>>;
  });

  protected readonly totalLinkups = computed(() => this.itemsSignal().length);

  constructor() {
    void this.loadHistory();
  }

  protected statusClass(status: LinkupStatus): string {
    return LINKUP_STATUS_META[status].chipClass;
  }

  protected statusLabel(status: LinkupStatus): string {
    return LINKUP_STATUS_META[status].labelKey;
  }

  protected onStatusSelected(status: LinkupStatus | 'all'): void {
    this.filterStatusSignal.set(status);
  }

  protected onTradeModeSelected(mode: LinkupTradeMode | 'all'): void {
    this.filterModeSignal.set(mode);
  }

  protected onSearchChanged(term: string): void {
    this.searchTermSignal.set(term);
  }

  protected onResetFilters(): void {
    this.filterStatusSignal.set('all');
    this.filterModeSignal.set('all');
    this.searchTermSignal.set('');
  }

  protected onRetry(): void {
    void this.loadHistory();
  }

  protected trackByLinkupId(_: number, item: LinkupRecord): string {
    return item.id;
  }

  private async loadHistory(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorKeySignal.set(null);
    try {
      this.itemsSignal.set(await this.linkups.loadHistory());
    } catch {
      this.itemsSignal.set([]);
      this.errorKeySignal.set('pages.linkups.errors.load');
    } finally {
      this.loadingSignal.set(false);
    }
  }

  private matchesSearch(linkup: LinkupRecord, query: string): boolean {
    const haystacks = [
      linkup.companyA.name,
      linkup.companyA.province ?? '',
      linkup.companyA.sector ?? '',
      linkup.companyB.name,
      linkup.companyB.province ?? '',
      linkup.companyB.sector ?? '',
      linkup.primarySector ?? '',
      linkup.summary,
    ];

    return haystacks.some((value) => value.toLowerCase().includes(query));
  }
}
