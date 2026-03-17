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
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import {
  AlertUpdateDrawerMode,
  AlertUpdatePayload,
  AlertUpdateRecord,
  AlertUpdateReason,
  AlertUpdateSubmitState,
} from './alert-detail.models';

interface AlertUpdateFormModel {
  readonly reason: FormControl<AlertUpdateReason>;
  readonly summary: FormControl<string>;
  readonly sourceUrl: FormControl<string>;
}

function optionalHttpUrlValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value?.trim() ?? '';
  if (!value.length) {
    return null;
  }
  return /^https?:\/\/\S+$/i.test(value) ? null : { pattern: true };
}

@Component({
  selector: 'og7-alert-update-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './alert-update-drawer.component.html',
  styleUrl: './alert-update-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertUpdateDrawerComponent {
  readonly open = input(false);
  readonly mode = input<AlertUpdateDrawerMode>('compose');
  readonly alertTitle = input('');
  readonly existingReport = input<AlertUpdateRecord | null>(null);
  readonly submitState = input<AlertUpdateSubmitState>('idle');
  readonly submitError = input<string | null>(null);

  readonly closed = output<void>();
  readonly submitted = output<AlertUpdatePayload>();

  protected readonly form = new FormGroup<AlertUpdateFormModel>({
    reason: new FormControl<AlertUpdateReason>('correction', { nonNullable: true }),
    summary: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(500)],
    }),
    sourceUrl: new FormControl('', {
      nonNullable: true,
      validators: [optionalHttpUrlValidator],
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
        document.body.classList.add('og7-alert-update-open');
      } else {
        document.body.classList.remove('og7-alert-update-open');
      }
    });

    effect(() => {
      if (!this.open() || this.mode() !== 'compose') {
        return;
      }
      this.form.reset({
        reason: 'correction',
        summary: '',
        sourceUrl: '',
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
    const sourceUrl = value.sourceUrl.trim();
    this.submitted.emit({
      reason: value.reason,
      summary: value.summary.trim(),
      sourceUrl: sourceUrl.length ? sourceUrl : null,
    });
  }
}
