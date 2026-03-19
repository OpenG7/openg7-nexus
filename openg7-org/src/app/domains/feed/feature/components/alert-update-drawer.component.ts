import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, startWith } from 'rxjs/operators';

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);
  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');
  private previousFocusedElement: HTMLElement | null = null;
  private readonly activeLanguage = toSignal(
    this.translate.onLangChange.pipe(
      map(event => event.lang),
      startWith(this.translate.currentLang || this.translate.getDefaultLang() || 'en')
    ),
    {
      initialValue: this.translate.currentLang || this.translate.getDefaultLang() || 'en',
    }
  );

  readonly open = input(false);
  readonly mode = input<AlertUpdateDrawerMode>('compose');
  readonly alertTitle = input('');
  readonly existingReport = input<AlertUpdateRecord | null>(null);
  readonly submitState = input<AlertUpdateSubmitState>('idle');
  readonly submitError = input<string | null>(null);

  readonly closed = output<void>();
  readonly submitted = output<AlertUpdatePayload>();
  protected readonly minSummaryLength = 10;
  protected readonly maxSummaryLength = 500;
  protected readonly dialogTitleId = 'og7-alert-update-title';
  protected readonly dialogDescriptionId = 'og7-alert-update-description';
  protected readonly reasonFieldId = 'og7-alert-update-reason';
  protected readonly summaryFieldId = 'og7-alert-update-summary';
  protected readonly summaryErrorId = 'og7-alert-update-summary-error';
  protected readonly sourceUrlFieldId = 'og7-alert-update-source-url';
  protected readonly sourceUrlErrorId = 'og7-alert-update-source-url-error';

  protected readonly form = new FormGroup<AlertUpdateFormModel>({
    reason: new FormControl<AlertUpdateReason>('correction', { nonNullable: true }),
    summary: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(this.minSummaryLength),
        Validators.maxLength(this.maxSummaryLength),
      ],
    }),
    sourceUrl: new FormControl('', {
      nonNullable: true,
      validators: [optionalHttpUrlValidator],
    }),
  });

  protected readonly submitting = computed(() => {
    const state = this.submitState();
    return state === 'submitting' || state === 'success';
  });
  protected readonly viewingReport = computed(
    () => this.mode() === 'view' && Boolean(this.existingReport())
  );

  constructor() {
    effect(onCleanup => {
      if (typeof document === 'undefined') {
        return;
      }
      const body = document.body;
      if (this.open()) {
        body.classList.add('og7-alert-update-open');
        onCleanup(() => body.classList.remove('og7-alert-update-open'));
      } else {
        body.classList.remove('og7-alert-update-open');
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

    effect(() => {
      if (!this.open()) {
        this.restoreFocus();
        return;
      }

      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        this.previousFocusedElement = document.activeElement;
      }

      queueMicrotask(() => {
        this.panelRef()?.nativeElement.focus();
      });
    });

    this.destroyRef.onDestroy(() => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('og7-alert-update-open');
      }
      this.restoreFocus();
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

  @HostListener('document:keydown.tab', ['$event'])
  protected onTabKeydown(event: Event): void {
    if (!this.open()) {
      return;
    }

    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    const panel = this.panelRef()?.nativeElement;
    if (!panel) {
      return;
    }

    const focusableElements = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(element => !element.hasAttribute('hidden') && element.tabIndex !== -1);

    if (!focusableElements.length) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last?.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  protected onBackdropClick(): void {
    this.closed.emit();
  }

  protected onSubmit(): void {
    if (this.submitting()) {
      return;
    }

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

  protected summaryInvalid(): boolean {
    return this.form.controls.summary.invalid && this.form.controls.summary.touched;
  }

  protected sourceUrlInvalid(): boolean {
    return this.form.controls.sourceUrl.invalid && this.form.controls.sourceUrl.touched;
  }

  protected summaryErrorMessage(): string | null {
    const control = this.form.controls.summary;
    if (!this.summaryInvalid()) {
      return null;
    }
    if (control.hasError('required')) {
      return this.translate.instant('validation.required');
    }
    if (control.hasError('minlength')) {
      return this.translate.instant('validation.minLength', {
        min: this.minSummaryLength,
      });
    }
    if (control.hasError('maxlength')) {
      return this.translate.instant('validation.maxLength', {
        max: this.maxSummaryLength,
      });
    }
    return null;
  }

  protected sourceUrlErrorMessage(): string | null {
    if (!this.sourceUrlInvalid()) {
      return null;
    }
    if (this.form.controls.sourceUrl.hasError('pattern')) {
      return this.translate.instant('validation.url');
    }
    return null;
  }

  protected formatReportDate(value: string): string {
    this.activeLanguage();
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) {
      return this.translate.instant('feed.alert.detail.justNow');
    }

    const locale = this.activeLanguage().toLowerCase().startsWith('fr') ? 'fr-CA' : 'en-CA';
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(timestamp);
  }

  private restoreFocus(): void {
    this.previousFocusedElement?.focus();
    this.previousFocusedElement = null;
  }
}
