import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import {
  PublicationFieldConfig,
  PublicationFieldOption,
  PublicationFormConfig,
} from '../form-config/publication-form-config.models';

@Component({
  selector: 'og7-dynamic-publication-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './og7-dynamic-publication-form.component.html',
  styleUrl: './og7-dynamic-publication-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Og7DynamicPublicationFormComponent {
  private readonly fb = new FormBuilder();
  private readonly primaryFieldRef = viewChild<ElementRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>>('primaryField');

  readonly config = input.required<PublicationFormConfig>();
  readonly fieldOptions = input<Record<string, readonly PublicationFieldOption[]>>({});
  readonly submitState = input<'idle' | 'submitting' | 'success' | 'error' | 'offline'>('idle');
  readonly submitError = input<string | null>(null);
  readonly errors = input<readonly string[]>([]);
  readonly warnings = input<readonly string[]>([]);

  readonly submitted = output<Record<string, unknown>>();

  protected readonly form = signal(this.fb.group({}));
  protected readonly submitAttempted = signal(false);
  protected readonly submitting = computed(() => this.submitState() === 'submitting');

  constructor() {
    effect(() => {
      const config = this.config();
      const controls = Object.fromEntries(
        config.sections.flatMap((section) =>
          section.fields.map((field) => [field.key, this.createControl(field)])
        )
      );
      this.form.set(this.fb.group(controls));
      this.submitAttempted.set(false);
    });
  }

  focusPrimaryField(): void {
    this.primaryFieldRef()?.nativeElement.focus();
  }

  protected optionsFor(field: PublicationFieldConfig): readonly PublicationFieldOption[] {
    return this.fieldOptions()[field.key] ?? field.options ?? [];
  }

  protected isPrimaryField(fieldIndex: number): boolean {
    return fieldIndex === 0;
  }

  protected onMultiSelectChange(fieldKey: string, event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    const values = Array.from(target.selectedOptions).map(option => option.value);
    this.controlFor(fieldKey)?.setValue(values);
    this.controlFor(fieldKey)?.markAsDirty();
  }

  protected controlFor(fieldKey: string): AbstractControl | null {
    return this.form().get(fieldKey);
  }

  protected showField(field: PublicationFieldConfig): boolean {
    if (!field.visibleWhen?.length) {
      return true;
    }

    const rawValue = this.form().getRawValue() as Record<string, unknown>;
    return field.visibleWhen.every((condition) => {
      const current = rawValue[condition.field];
      switch (condition.operator) {
        case 'equals':
          return current === condition.value;
        case 'notEquals':
          return current !== condition.value;
        case 'truthy':
          return Boolean(current);
        case 'falsy':
          return !current;
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(current as never);
        case 'notIn':
          return Array.isArray(condition.value) && !condition.value.includes(current as never);
        default:
          return true;
      }
    });
  }

  protected fieldErrorKeys(field: PublicationFieldConfig): string[] {
    const control = this.controlFor(field.key);
    if (!control) {
      return [];
    }

    const shouldShow = this.submitAttempted() || control.touched || control.dirty;
    if (!shouldShow) {
      return [];
    }

    const errorKeys: string[] = [];

    if (control.hasError('required')) {
      errorKeys.push('forms.common.validation.required');
    }

    for (const validator of field.validators ?? []) {
      if (validator.type === 'minLength' && control.hasError('minlength')) {
        errorKeys.push(validator.errorKey);
      }
      if (validator.type === 'maxLength' && control.hasError('maxlength')) {
        errorKeys.push(validator.errorKey);
      }
      if (validator.type === 'min' && control.hasError('min')) {
        errorKeys.push(validator.errorKey);
      }
      if (validator.type === 'max' && control.hasError('max')) {
        errorKeys.push(validator.errorKey);
      }
      if (validator.type === 'pattern' && control.hasError('pattern')) {
        errorKeys.push(validator.errorKey);
      }
      if (validator.type === 'dateOrder' && this.hasDateOrderError(field)) {
        errorKeys.push(validator.errorKey);
      }
    }

    return Array.from(new Set(errorKeys));
  }

  protected hasVisibleErrors(field: PublicationFieldConfig): boolean {
    return this.fieldErrorKeys(field).length > 0;
  }

  protected handleSubmit(): void {
    this.submitAttempted.set(true);
    this.form().markAllAsTouched();

    const hasDateOrderIssues = this.config().sections.some((section) =>
      section.fields.some((field) => this.hasDateOrderError(field))
    );

    if (this.form().invalid || hasDateOrderIssues) {
      return;
    }

    this.submitted.emit(this.form().getRawValue() as Record<string, unknown>);
  }

  private createControl(field: PublicationFieldConfig) {
    const validators = [];
    if (field.required) {
      validators.push(Validators.required);
    }

    for (const validator of field.validators ?? []) {
      if (validator.type === 'minLength' && typeof validator.value === 'number') {
        validators.push(Validators.minLength(validator.value));
      }
      if (validator.type === 'maxLength' && typeof validator.value === 'number') {
        validators.push(Validators.maxLength(validator.value));
      }
      if (validator.type === 'min' && typeof validator.value === 'number') {
        validators.push(Validators.min(validator.value));
      }
      if (validator.type === 'max' && typeof validator.value === 'number') {
        validators.push(Validators.max(validator.value));
      }
      if (validator.type === 'pattern' && typeof validator.value === 'string') {
        validators.push(Validators.pattern(validator.value));
      }
    }

    const initialValue =
      field.defaultValue ??
      (field.type === 'checkbox' ? false : field.type === 'multiselect' ? [] : '');
    return this.fb.control(initialValue, validators);
  }

  private hasDateOrderError(field: PublicationFieldConfig): boolean {
    const dateOrderValidator = (field.validators ?? []).find((validator) => validator.type === 'dateOrder');
    if (!dateOrderValidator?.compareWithField) {
      return false;
    }

    const currentValue = this.controlFor(field.key)?.value;
    const compareWithValue = this.controlFor(dateOrderValidator.compareWithField)?.value;
    if (!currentValue || !compareWithValue) {
      return false;
    }

    return String(currentValue) < String(compareWithValue);
  }
}