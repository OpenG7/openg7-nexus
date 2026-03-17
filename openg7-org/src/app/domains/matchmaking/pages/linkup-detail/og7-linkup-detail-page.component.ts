import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LinkupDataService } from '@app/domains/matchmaking/data-access/linkup-data.service';
import {
  LINKUP_STATUS_META,
  LINKUP_TRADE_MODE_OPTIONS,
  LinkupNoteEntry,
  LinkupRecord,
  LinkupStatus,
  LinkupTimelineEntry,
  LinkupTradeMode,
} from '@app/domains/matchmaking/data-access/linkup.models';
import { TranslateModule } from '@ngx-translate/core';
import { map } from 'rxjs';

@Component({
  standalone: true,
  selector: 'og7-linkup-detail-page',
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './og7-linkup-detail-page.component.html',
  styleUrls: ['./og7-linkup-detail-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Og7LinkupDetailPageComponent {
  private readonly linkups = inject(LinkupDataService);
  private readonly route = inject(ActivatedRoute);

  private readonly linkupIdSignal = signal<string | null>(this.route.snapshot.paramMap.get('id'));
  private readonly linkupSignal = signal<LinkupRecord | null>(null);
  private readonly loadingSignal = signal(true);
  private readonly errorKeySignal = signal<string | null>(null);
  private readonly notFoundSignal = signal(false);

  protected readonly linkup = this.linkupSignal.asReadonly();
  protected readonly loading = this.loadingSignal.asReadonly();
  protected readonly errorKey = this.errorKeySignal.asReadonly();
  protected readonly notFound = this.notFoundSignal.asReadonly();

  protected readonly headerTitle = computed(() => {
    const linkup = this.linkupSignal();
    if (!linkup) {
      return '';
    }
    return `${linkup.companyA.name} <-> ${linkup.companyB.name}`;
  });

  protected readonly sortedTimeline = computed<readonly LinkupTimelineEntry[]>(() => {
    const linkup = this.linkupSignal();
    if (!linkup) {
      return [];
    }
    return [...linkup.timeline].sort((a, b) => a.date.localeCompare(b.date));
  });

  protected readonly notes = computed<readonly LinkupNoteEntry[]>(() => {
    const linkup = this.linkupSignal();
    if (!linkup) {
      return [];
    }
    return [...linkup.notes].sort((a, b) => b.date.localeCompare(a.date));
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        takeUntilDestroyed(),
      )
      .subscribe((id) => {
        this.linkupIdSignal.set(id);
        void this.loadLinkup(id);
      });
  }

  protected statusClass(status: LinkupStatus): string {
    return LINKUP_STATUS_META[status].chipClass;
  }

  protected statusLabel(status: LinkupStatus): string {
    return LINKUP_STATUS_META[status].labelKey;
  }

  protected tradeModeLabel(mode: LinkupTradeMode): string {
    return LINKUP_TRADE_MODE_OPTIONS[mode];
  }

  protected onRetry(): void {
    void this.loadLinkup(this.linkupIdSignal());
  }

  private async loadLinkup(id: string | null): Promise<void> {
    if (!id) {
      this.linkupSignal.set(null);
      this.loadingSignal.set(false);
      this.notFoundSignal.set(true);
      this.errorKeySignal.set(null);
      return;
    }

    this.loadingSignal.set(true);
    this.errorKeySignal.set(null);
    this.notFoundSignal.set(false);

    try {
      const linkup = await this.linkups.loadById(id);
      this.linkupSignal.set(linkup);
      this.notFoundSignal.set(linkup === null);
    } catch {
      this.linkupSignal.set(null);
      this.errorKeySignal.set('pages.linkups.detail.errors.load');
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
