import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { OpportunityReportRecord } from '../services/opportunity-report-queue.service';

import {
  OpportunityReportDrawerMode,
  OpportunityReportPayload,
  OpportunityReportReason,
  OpportunityReportSubmitState,
} from './opportunity-detail.models';

interface OpportunityReportFormModel {
  readonly reason: FormControl<OpportunityReportReason>;
  readonly comment: FormControl<string>;
}

@Component({
  selector: 'og7-opportunity-report-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './opportunity-report-drawer.component.html',
  styleUrl: './opportunity-report-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpportunityReportDrawerComponent {
  readonly open = input(false);
  readonly mode = input<OpportunityReportDrawerMode>('compose');
  readonly opportunityTitle = input('');
  readonly existingReport = input<OpportunityReportRecord | null>(null);
  readonly submitState = input<OpportunityReportSubmitState>('idle');
  readonly submitError = input<string | null>(null);

  readonly closed = output<void>();
  readonly submitted = output<OpportunityReportPayload>();
  protected readonly submitAttempted = signal(false);
  protected readonly minCommentLength = 10;
  protected readonly maxCommentLength = 500;

  protected readonly form = new FormGroup<OpportunityReportFormModel>({
    reason: new FormControl<OpportunityReportReason>('incorrect', { nonNullable: true }),
    comment: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(500)],
    }),
  });

  protected readonly submitting = computed(() => false);
  protected readonly viewingReport = computed(
    () => this.mode() === 'view' && Boolean(this.existingReport())
  );

  constructor() {
    effect(() => {
      if (typeof document === 'undefined') {
        return;
      }
      if (this.open()) {
        document.body.classList.add('og7-opportunity-report-open');
      } else {
        document.body.classList.remove('og7-opportunity-report-open');
      }
    });

    effect(() => {
      if (!this.open() || this.mode() !== 'compose') {
        return;
      }
      this.form.reset({
        reason: 'incorrect',
        comment: '',
      });
      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.submitAttempted.set(false);
    });
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.open()) {
      return;
    }
    if (event.key.toLowerCase() !== 'escape') {
      return;
    }
    event.preventDefault();
    this.closed.emit();
  }

  protected onBackdropClick(): void {
    this.closed.emit();
  }

  protected onSubmit(): void {
    this.submitAttempted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    this.submitted.emit({
      reason: value.reason,
      comment: value.comment.trim(),
    });
  }
}
