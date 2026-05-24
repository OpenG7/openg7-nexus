import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import type {
  AdminQualityMatrixBucket,
  AdminQualityMatrixEditPayload,
  AdminQualityMatrixEntry,
  AdminQualityMatrixPriority,
} from '../data-access/admin-quality-matrix.service';

const BUCKET_OPTIONS: ReadonlyArray<{ readonly value: AdminQualityMatrixBucket; readonly label: string }> = [
  { value: 'covered', label: 'Couvert' },
  { value: 'proof-gap', label: 'Manque de preuve' },
  { value: 'product-gap', label: 'Lacune produit' },
  { value: 'scope-limit', label: 'Hors perimetre' },
];

const PRIORITY_OPTIONS: ReadonlyArray<{ readonly value: AdminQualityMatrixPriority; readonly label: string }> = [
  { value: 'haute', label: 'Haute' },
  { value: 'moyenne', label: 'Moyenne' },
  { value: 'basse', label: 'Basse' },
];

@Component({
  selector: 'og7-admin-quality-entry-edit',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (entry(); as e) {
      <div class="og7-entry-edit flex flex-col gap-4 min-h-0">
        <!-- identity -->
        <div class="flex items-center gap-2 flex-wrap">
          <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-xs font-mono">{{ e.id }}</span>
          <span class="text-xs text-slate-600 font-medium">{{ e.domain }}</span>
          <span class="text-xs text-slate-400 flex-1 truncate">{{ e.need }}</span>
        </div>

        <!-- agent narrative banner -->
        @if (e.agentNarrativeGeneratedAt) {
          <div class="flex items-center gap-2 px-3 py-2 rounded bg-sky-50 border border-sky-200 text-xs text-sky-700">
            <span class="font-semibold">Suggestions IA disponibles</span>
            <span class="text-sky-500">&mdash; {{ e.agentNarrativeModel ?? 'IA' }} &middot; {{ e.agentNarrativeGeneratedAt | date:'dd/MM/yyyy HH:mm' }}</span>
          </div>
        }

        <!-- observedGap -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <label class="text-xs font-semibold text-slate-700 uppercase tracking-wide">Ecart observe</label>
            @if (e.agentObservedGap) {
              <button
                type="button"
                class="px-2 py-0.5 rounded text-xs bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors"
                [disabled]="pending()"
                (click)="applyAgentObservedGap()"
              >Appliquer suggestion IA</button>
            }
          </div>
          <textarea
            class="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white text-xs text-slate-800 resize-none focus:outline-none focus:ring-1 focus:ring-sky-400 min-h-16"
            rows="4"
            [value]="observedGap()"
            [disabled]="pending()"
            (input)="onObservedGapInput($event)"
          ></textarea>
          @if (e.agentObservedGap && observedGap() !== e.agentObservedGap) {
            <div class="text-xs text-sky-600 italic px-1">Suggestion IA: {{ e.agentObservedGap | slice:0:120 }}{{ e.agentObservedGap.length > 120 ? '…' : '' }}</div>
          }
        </div>

        <!-- nextMove -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <label class="text-xs font-semibold text-slate-700 uppercase tracking-wide">Prochaine action</label>
            @if (e.agentNextMove) {
              <button
                type="button"
                class="px-2 py-0.5 rounded text-xs bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors"
                [disabled]="pending()"
                (click)="applyAgentNextMove()"
              >Appliquer suggestion IA</button>
            }
          </div>
          <textarea
            class="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white text-xs text-slate-800 resize-none focus:outline-none focus:ring-1 focus:ring-sky-400 min-h-16"
            rows="4"
            [value]="nextMove()"
            [disabled]="pending()"
            (input)="onNextMoveInput($event)"
          ></textarea>
          @if (e.agentNextMove && nextMove() !== e.agentNextMove) {
            <div class="text-xs text-sky-600 italic px-1">Suggestion IA: {{ e.agentNextMove | slice:0:120 }}{{ e.agentNextMove.length > 120 ? '…' : '' }}</div>
          }
        </div>

        <!-- bucket + priority row -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-slate-700 uppercase tracking-wide">Bucket</label>
            <select
              class="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-400"
              [value]="managementBucket()"
              [disabled]="pending()"
              (change)="onBucketChange($event)"
            >
              @for (opt of bucketOptions; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-slate-700 uppercase tracking-wide">Priorite</label>
            <select
              class="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-400"
              [value]="priority()"
              [disabled]="pending()"
              (change)="onPriorityChange($event)"
            >
              @for (opt of priorityOptions; track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
          </div>
        </div>

        <!-- needsProductWorkFirst + reviewedAt row -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="og7-needs-product-{{ e.id }}"
              class="w-3.5 h-3.5 accent-sky-600"
              [checked]="needsProductWorkFirst()"
              [disabled]="pending()"
              (change)="onNeedsProductChange($event)"
            />
            <label
              [for]="'og7-needs-product-' + e.id"
              class="text-xs text-slate-700 select-none cursor-pointer"
            >Necessite travail produit d'abord</label>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-slate-700 uppercase tracking-wide">Revise le</label>
            <input
              type="date"
              class="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-400"
              [value]="reviewedAt() | slice:0:10"
              [disabled]="pending()"
              (input)="onReviewedAtInput($event)"
            />
          </div>
        </div>

        <!-- actions row -->
        <div class="flex items-center gap-2 pt-1 flex-wrap">
          <button
            type="button"
            class="px-3 py-1.5 rounded text-xs font-medium bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            [disabled]="pending() || !isDirty()"
            (click)="onSave()"
          >
            @if (pending()) { Enregistrement… } @else { Enregistrer }
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-colors"
            [disabled]="pending()"
            (click)="onCancel()"
          >Annuler</button>
          <div class="flex-1"></div>
          <button
            type="button"
            class="px-3 py-1.5 rounded text-xs font-medium border border-sky-200 text-sky-700 hover:bg-sky-50 disabled:opacity-50 transition-colors"
            [disabled]="pending()"
            (click)="onAgentSuggest()"
            title="Demander une suggestion de narratif a l'IA"
          >✦ Suggerer via IA</button>
        </div>
      </div>
    }
  `,
})
export class AdminQualityEntryEditComponent {
  readonly entry = input<AdminQualityMatrixEntry | null>(null);
  readonly pending = input<boolean>(false);

  readonly saved = output<AdminQualityMatrixEditPayload>();
  readonly cancelled = output<void>();
  readonly agentSuggestionRequested = output<void>();

  protected readonly observedGap = signal('');
  protected readonly nextMove = signal('');
  protected readonly managementBucket = signal<AdminQualityMatrixBucket>('proof-gap');
  protected readonly needsProductWorkFirst = signal(false);
  protected readonly priority = signal<AdminQualityMatrixPriority>('moyenne');
  protected readonly reviewedAt = signal('');

  protected readonly bucketOptions = BUCKET_OPTIONS;
  protected readonly priorityOptions = PRIORITY_OPTIONS;

  protected readonly isDirty = computed(() => {
    const e = this.entry();
    if (!e) {
      return false;
    }
    return (
      this.observedGap() !== (e.observedGap ?? '') ||
      this.nextMove() !== (e.nextMove ?? '') ||
      this.managementBucket() !== e.managementBucket ||
      this.needsProductWorkFirst() !== e.needsProductWorkFirst ||
      this.priority() !== e.priority ||
      this.reviewedAt().slice(0, 10) !== (e.reviewedAt ?? '').slice(0, 10)
    );
  });

  constructor() {
    effect(() => {
      const e = this.entry();
      if (!e) {
        return;
      }
      this.observedGap.set(e.observedGap ?? '');
      this.nextMove.set(e.nextMove ?? '');
      this.managementBucket.set(e.managementBucket);
      this.needsProductWorkFirst.set(e.needsProductWorkFirst);
      this.priority.set(e.priority);
      this.reviewedAt.set(e.reviewedAt ?? '');
    });
  }

  protected applyAgentObservedGap(): void {
    const value = this.entry()?.agentObservedGap;
    if (value) {
      this.observedGap.set(value);
    }
  }

  protected applyAgentNextMove(): void {
    const value = this.entry()?.agentNextMove;
    if (value) {
      this.nextMove.set(value);
    }
  }

  protected onObservedGapInput(event: Event): void {
    this.observedGap.set((event.target as HTMLTextAreaElement).value);
  }

  protected onNextMoveInput(event: Event): void {
    this.nextMove.set((event.target as HTMLTextAreaElement).value);
  }

  protected onBucketChange(event: Event): void {
    this.managementBucket.set(
      (event.target as HTMLSelectElement).value as AdminQualityMatrixBucket,
    );
  }

  protected onPriorityChange(event: Event): void {
    this.priority.set((event.target as HTMLSelectElement).value as AdminQualityMatrixPriority);
  }

  protected onNeedsProductChange(event: Event): void {
    this.needsProductWorkFirst.set((event.target as HTMLInputElement).checked);
  }

  protected onReviewedAtInput(event: Event): void {
    this.reviewedAt.set((event.target as HTMLInputElement).value);
  }

  protected onSave(): void {
    this.saved.emit({
      observedGap: this.observedGap() || null,
      nextMove: this.nextMove() || null,
      managementBucket: this.managementBucket(),
      needsProductWorkFirst: this.needsProductWorkFirst(),
      priority: this.priority(),
      reviewedAt: this.reviewedAt() || null,
    });
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  protected onAgentSuggest(): void {
    this.agentSuggestionRequested.emit();
  }
}
