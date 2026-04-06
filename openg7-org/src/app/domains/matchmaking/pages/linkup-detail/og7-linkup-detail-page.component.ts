import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
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

const LINKUP_STATUS_TRANSITIONS: Readonly<Record<LinkupStatus, readonly LinkupStatus[]>> = {
  pending: ['pending', 'inDiscussion', 'closed'],
  inDiscussion: ['inDiscussion', 'completed', 'closed'],
  completed: ['completed'],
  closed: ['closed', 'inDiscussion'],
};

@Component({
  standalone: true,
  selector: 'og7-linkup-detail-page',
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
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
  private readonly savingStatusSignal = signal(false);
  private readonly savingNoteSignal = signal(false);
  private readonly statusDraftSignal = signal<LinkupStatus>('pending');
  private readonly noteDraftSignal = signal('');
  private readonly statusSaveErrorKeySignal = signal<string | null>(null);
  private readonly noteSaveErrorKeySignal = signal<string | null>(null);

  protected readonly linkup = this.linkupSignal.asReadonly();
  protected readonly loading = this.loadingSignal.asReadonly();
  protected readonly errorKey = this.errorKeySignal.asReadonly();
  protected readonly notFound = this.notFoundSignal.asReadonly();
  protected readonly savingStatus = this.savingStatusSignal.asReadonly();
  protected readonly savingNote = this.savingNoteSignal.asReadonly();
  protected readonly statusDraft = this.statusDraftSignal.asReadonly();
  protected readonly noteDraft = this.noteDraftSignal.asReadonly();
  protected readonly statusSaveErrorKey = this.statusSaveErrorKeySignal.asReadonly();
  protected readonly noteSaveErrorKey = this.noteSaveErrorKeySignal.asReadonly();
  protected readonly noteMaxLength = 5000;

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

  protected readonly availableStatuses = computed(() => {
    const currentStatus = this.linkupSignal()?.status ?? 'pending';
    return LINKUP_STATUS_TRANSITIONS[currentStatus].map((status) => LINKUP_STATUS_META[status]);
  });

  protected readonly noteCharacterCount = computed(() => this.noteDraftSignal().length);

  protected readonly canSaveStatus = computed(() => {
    const linkup = this.linkupSignal();
    return (
      Boolean(linkup)
      && this.statusDraftSignal() !== linkup!.status
      && !this.savingStatusSignal()
      && !this.loadingSignal()
    );
  });

  protected readonly canSaveNote = computed(() => {
    const trimmed = this.noteDraftSignal().trim();
    return (
      Boolean(this.linkupSignal())
      && trimmed.length > 0
      && trimmed.length <= this.noteMaxLength
      && !this.savingNoteSignal()
      && !this.loadingSignal()
    );
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

  protected onStatusDraftChanged(status: LinkupStatus): void {
    this.statusSaveErrorKeySignal.set(null);
    this.statusDraftSignal.set(status);
  }

  protected onNoteDraftChanged(note: string): void {
    this.noteSaveErrorKeySignal.set(null);
    this.noteDraftSignal.set(note.slice(0, this.noteMaxLength));
  }

  protected async onSaveStatus(): Promise<void> {
    const linkup = this.linkupSignal();
    const nextStatus = this.statusDraftSignal();
    if (!linkup || nextStatus === linkup.status || this.savingStatusSignal()) {
      return;
    }

    this.savingStatusSignal.set(true);
    this.statusSaveErrorKeySignal.set(null);

    try {
      const updated = await this.linkups.updateStatus(linkup.id, nextStatus);
      if (!updated) {
        this.linkupSignal.set(null);
        this.notFoundSignal.set(true);
        return;
      }
      this.applyLinkup(updated);
    } catch {
      this.statusSaveErrorKeySignal.set('pages.linkups.detail.errors.saveStatus');
    } finally {
      this.savingStatusSignal.set(false);
    }
  }

  protected async onSaveNote(): Promise<void> {
    const linkup = this.linkupSignal();
    const note = this.noteDraftSignal().trim();
    if (!linkup || !note || this.savingNoteSignal()) {
      return;
    }

    this.savingNoteSignal.set(true);
    this.noteSaveErrorKeySignal.set(null);

    try {
      const updated = await this.linkups.saveNote(linkup.id, linkup.status, note);
      if (!updated) {
        this.linkupSignal.set(null);
        this.notFoundSignal.set(true);
        return;
      }
      this.applyLinkup(updated);
      this.noteDraftSignal.set('');
    } catch {
      this.noteSaveErrorKeySignal.set('pages.linkups.detail.errors.saveNote');
    } finally {
      this.savingNoteSignal.set(false);
    }
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
    this.noteDraftSignal.set('');

    try {
      const linkup = await this.linkups.loadById(id);
      this.applyLinkup(linkup);
      this.notFoundSignal.set(linkup === null);
    } catch {
      this.linkupSignal.set(null);
      this.errorKeySignal.set('pages.linkups.detail.errors.load');
    } finally {
      this.loadingSignal.set(false);
    }
  }

  private applyLinkup(linkup: LinkupRecord | null): void {
    this.linkupSignal.set(linkup);
    this.statusDraftSignal.set(linkup?.status ?? 'pending');
    this.statusSaveErrorKeySignal.set(null);
    this.noteSaveErrorKeySignal.set(null);
  }
}
