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
import { IndicatorAlertRuleRecord } from '@app/core/indicator-alert-rules.service';

import {
  IndicatorAlertDraft,
  IndicatorAlertDrawerMode,
  IndicatorAlertSubmitState,
} from './indicator-detail.models';

interface IndicatorAlertFormModel {
  readonly thresholdDirection: FormControl<'gt' | 'lt'>;
  readonly thresholdValue: FormControl<number>;
  readonly window: FormControl<'1h' | '24h'>;
  readonly frequency: FormControl<'instant' | 'hourly' | 'daily'>;
  readonly notifyDelta: FormControl<boolean>;
  readonly note: FormControl<string>;
}

@Component({
  selector: 'og7-indicator-alert-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './indicator-alert-drawer.component.html',
  styleUrl: './indicator-alert-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndicatorAlertDrawerComponent {
  readonly open = input(false);
  readonly mode = input<IndicatorAlertDrawerMode>('compose');
  readonly indicatorTitle = input<string>('');
  readonly existingRule = input<IndicatorAlertRuleRecord | null>(null);
  readonly initialDraft = input<IndicatorAlertDraft | null>(null);
  readonly submitState = input<IndicatorAlertSubmitState>('idle');
  readonly submitError = input<string | null>(null);
  readonly retryEnabled = input(false);

  readonly closed = output<void>();
  readonly submitted = output<IndicatorAlertDraft>();
  readonly retryRequested = output<void>();

  protected readonly submitting = computed(() => this.submitState() === 'submitting');
  protected readonly viewingRule = computed(
    () => this.mode() === 'view' && Boolean(this.existingRule())
  );
  protected readonly showRetry = computed(() => {
    const state = this.submitState();
    return this.retryEnabled() && (state === 'error' || state === 'offline');
  });

  protected readonly form = new FormGroup<IndicatorAlertFormModel>({
    thresholdDirection: new FormControl<'gt' | 'lt'>('gt', { nonNullable: true }),
    thresholdValue: new FormControl(12, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(500)],
    }),
    window: new FormControl<'1h' | '24h'>('1h', { nonNullable: true }),
    frequency: new FormControl<'instant' | 'hourly' | 'daily'>('instant', { nonNullable: true }),
    notifyDelta: new FormControl(true, { nonNullable: true }),
    note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(400)] }),
  });

  constructor() {
    effect(() => {
      if (typeof document === 'undefined') {
        return;
      }
      if (this.open()) {
        document.body.classList.add('og7-indicator-alert-open');
      } else {
        document.body.classList.remove('og7-indicator-alert-open');
      }
    });

    effect(() => {
      if (!this.open() || this.mode() !== 'compose') {
        return;
      }
      const draft = this.initialDraft();
      this.form.reset({
        thresholdDirection: draft?.thresholdDirection ?? 'gt',
        thresholdValue: draft?.thresholdValue ?? 12,
        window: draft?.window ?? '1h',
        frequency: draft?.frequency ?? 'instant',
        notifyDelta: draft?.notifyDelta ?? true,
        note: draft?.note ?? '',
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
      thresholdDirection: value.thresholdDirection,
      thresholdValue: value.thresholdValue,
      window: value.window,
      frequency: value.frequency,
      notifyDelta: value.notifyDelta,
      note: value.note.trim(),
    });
  }
}
