import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { OpportunityOfferPayload, OpportunityOfferSubmitState } from './opportunity-detail.models';

@Component({
  selector: 'og7-opportunity-offer-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './opportunity-offer-drawer.component.html',
  styleUrl: './opportunity-offer-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpportunityOfferDrawerComponent {
  private readonly fb = inject(FormBuilder);

  readonly open = input(false);
  readonly initialCapacityMw = input(300);
  readonly initialStartDate = input<string | null>('');
  readonly initialEndDate = input<string | null>('');
  readonly submitState = input<OpportunityOfferSubmitState>('idle');
  readonly submitError = input<string | null>(null);
  readonly retryEnabled = input(false);

  readonly closed = output<void>();
  readonly submitted = output<OpportunityOfferPayload>();
  readonly retryRequested = output<void>();

  protected readonly visible = computed(() => this.open());
  protected readonly submitAttempted = signal(false);
  protected readonly minCommentLength = 10;
  /**
   * Computed signal that indicates whether the form submission is currently in progress.
   * Returns true when the submit state equals 'submitting', false otherwise.
   * This is a read-only computed property that reactively tracks the submission status.
   */
  protected readonly submitting = computed(() => this.submitState() === 'submitting');
  protected readonly showRetry = computed(() => {
    const state = this.submitState();
    return this.retryEnabled() && (state === 'error' || state === 'offline');
  });

  protected readonly form = this.fb.nonNullable.group({
    capacityMw: [300, [Validators.required, Validators.min(1)]],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    pricingModel: ['spot', Validators.required],
    comment: ['', [Validators.required, Validators.minLength(10)]],
    attachmentName: [''],
  });

  constructor() {
    effect(() => {
      if (typeof document === 'undefined') {
        return;
      }
      if (this.visible()) {
        document.body.classList.add('og7-opportunity-offer-open');
      } else {
        document.body.classList.remove('og7-opportunity-offer-open');
      }
    });

    effect(() => {
      if (!this.visible()) {
        return;
      }
      this.form.patchValue({
        capacityMw: this.initialCapacityMw(),
        startDate: this.initialStartDate() ?? '',
        endDate: this.initialEndDate() ?? '',
        pricingModel: 'spot',
        comment: '',
        attachmentName: '',
      });
      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.submitAttempted.set(false);
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (!this.visible()) {
      return;
    }
    this.closed.emit();
  }

  protected onBackdropClick(): void {
    this.closed.emit();
  }

  protected onAttachmentSelected(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    const file = target.files?.item(0);
    this.form.controls.attachmentName.setValue(file?.name ?? '');
  }

  protected submit(): void {
    this.submitAttempted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.submitted.emit({
      capacityMw: value.capacityMw,
      startDate: value.startDate,
      endDate: value.endDate,
      pricingModel: value.pricingModel,
      comment: value.comment.trim(),
      attachmentName: value.attachmentName.trim() || null,
    });
  }
}
