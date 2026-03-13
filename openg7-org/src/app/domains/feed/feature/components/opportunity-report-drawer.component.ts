import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  input,
  output,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import {
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
  readonly opportunityTitle = input('');
  readonly submitState = input<OpportunityReportSubmitState>('idle');
  readonly submitError = input<string | null>(null);

  readonly closed = output<void>();
  readonly submitted = output<OpportunityReportPayload>();

  protected readonly form = new FormGroup<OpportunityReportFormModel>({
    reason: new FormControl<OpportunityReportReason>('incorrect', { nonNullable: true }),
    comment: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(500)],
    }),
  });

  protected readonly submitting = computed(() => false);

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
      if (!this.open()) {
        return;
      }
      this.form.reset({
        reason: 'incorrect',
        comment: '',
      });
      this.form.markAsPristine();
      this.form.markAsUntouched();
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
