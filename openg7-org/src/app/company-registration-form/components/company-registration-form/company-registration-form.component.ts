import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { CompanyProfile, TradeScope } from '../../models/registration.model';
import { isoCountryValidator } from '../../validators/country.validator';
import { caPhoneValidator } from '../../validators/phone.validator';
import { urlValidator } from '../../validators/url.validator';

const CANADIAN_PROVINCES: readonly string[] = [
  'AB',
  'BC',
  'MB',
  'NB',
  'NL',
  'NS',
  'NT',
  'NU',
  'ON',
  'PE',
  'QC',
  'SK',
  'YT',
];

const AVAILABLE_COUNTRIES: readonly string[] = [
  'CA',
  'US',
  'MX',
  'FR',
  'DE',
  'IT',
  'ES',
  'GB',
  'IE',
  'NL',
  'BE',
  'SE',
  'NO',
  'DK',
  'FI',
  'PL',
  'PT',
  'CH',
  'AT',
  'CZ',
  'SK',
  'HU',
  'RO',
  'BG',
  'GR',
  'TR',
  'JP',
  'KR',
  'CN',
  'IN',
  'AU',
  'NZ',
  'BR',
  'AR',
  'CL',
  'ZA',
  'MA',
  'EG',
  'SA',
  'AE',
];

interface RegistrationFormValue {
  legalName: string;
  website?: string | null;
  headquarterCountry: string;
  headquarterProvince?: string | null;
  tradeScope: TradeScope;
  provincesServed: string[] | null;
  countriesServed: string[] | null;
  sector: string;
  description?: string | null;
  capacityNote?: string | null;
  foreignRegistrationId?: string | null;
  canadianRepresentative_name?: string | null;
  canadianRepresentative_email?: string | null;
  contact_fullName: string;
  contact_role: string;
  contact_email: string;
  contact_phone?: string | null;
  acceptedTerms: boolean;
}

@Component({
  selector: 'og7-company-registration-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  templateUrl: './company-registration-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « registration/components/company-registration-form » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Company Registration Form ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns CompanyRegistrationFormComponent gérée par le framework.
 */
export class CompanyRegistrationFormComponent {
  private static arrayRequired(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (Array.isArray(value) && value.length > 0) {
        return null;
      }
      return { required: true };
    };
  }

  private readonly fb = inject(FormBuilder);

  private readonly presetCountry = signal<string | null>('CA');
  private readonly presetScope = signal<TradeScope>('canada');

  readonly provinces = signal<readonly string[]>(CANADIAN_PROVINCES);
  readonly countries = signal<readonly string[]>(AVAILABLE_COUNTRIES);

  readonly form = this.fb.group({
    legalName: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(2)],
      nonNullable: true,
    }),
    website: this.fb.control<string | null>(null, {
      validators: [urlValidator],
    }),
    headquarterCountry: this.fb.control('CA', {
      validators: [Validators.required, isoCountryValidator],
      nonNullable: true,
    }),
    headquarterProvince: this.fb.control<string | null>('', {
      validators: [],
    }),
    tradeScope: this.fb.control<TradeScope>('canada', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    provincesServed: this.fb.control<string[] | null>([], {
      validators: [],
    }),
    countriesServed: this.fb.control<string[] | null>([], {
      validators: [],
    }),
    sector: this.fb.control('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    description: this.fb.control<string | null>(null),
    capacityNote: this.fb.control<string | null>(null),
    foreignRegistrationId: this.fb.control<string | null>(null),
    canadianRepresentative_name: this.fb.control<string | null>(null),
    canadianRepresentative_email: this.fb.control<string | null>(null, {
      validators: [Validators.email],
    }),
    contact_fullName: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(2)],
      nonNullable: true,
    }),
    contact_role: this.fb.control('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    contact_email: this.fb.control('', {
      validators: [Validators.required, Validators.email],
      nonNullable: true,
    }),
    contact_phone: this.fb.control<string | null>(null, {
      validators: [caPhoneValidator],
    }),
    acceptedTerms: this.fb.control(false, {
      validators: [Validators.requiredTrue],
      nonNullable: true,
    }),
  });

  private readonly headquarterCountrySig = toSignal(
    this.form.controls.headquarterCountry.valueChanges,
    { initialValue: this.form.controls.headquarterCountry.value },
  );
  private readonly tradeScopeSig = toSignal(this.form.controls.tradeScope.valueChanges, {
    initialValue: this.form.controls.tradeScope.value,
  });

  readonly isCanada = computed(() => (this.headquarterCountrySig()?.toUpperCase() ?? '') === 'CA');
  readonly scope = computed(() => this.tradeScopeSig() ?? 'canada');

  @Output() readonly submitted = new EventEmitter<CompanyProfile>();

  @Input()
  set initialCountry(value: string | null | undefined) {
    const normalized = value?.toUpperCase() ?? null;
    this.presetCountry.set(normalized ?? 'CA');
    if (normalized && this.form.controls.headquarterCountry.value !== normalized) {
      this.form.controls.headquarterCountry.setValue(normalized);
    }
  }

  get initialCountry(): string | null {
    return this.presetCountry();
  }

  @Input()
  set initialScope(value: TradeScope | null | undefined) {
    if (!value) {
      return;
    }
    this.presetScope.set(value);
    if (this.form.controls.tradeScope.value !== value) {
      this.form.controls.tradeScope.setValue(value);
    }
  }

  get initialScope(): TradeScope | null {
    return this.presetScope();
  }

  constructor() {
    effect(() => {
      const requireProvince = this.isCanada();
      const provinceControl = this.form.controls.headquarterProvince;
      provinceControl.clearValidators();
      if (requireProvince) {
        provinceControl.addValidators([Validators.required]);
      }
      provinceControl.updateValueAndValidity({ emitEvent: false });

      const scope = this.scope();
      const provincesControl = this.form.controls.provincesServed;
      const countriesControl = this.form.controls.countriesServed;

      provincesControl.clearValidators();
      countriesControl.clearValidators();

      if (scope === 'canada' || scope === 'both') {
        provincesControl.addValidators([CompanyRegistrationFormComponent.arrayRequired()]);
      }
      if (scope === 'international' || scope === 'both') {
        countriesControl.addValidators([CompanyRegistrationFormComponent.arrayRequired()]);
      }

      provincesControl.updateValueAndValidity({ emitEvent: false });
      countriesControl.updateValueAndValidity({ emitEvent: false });
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue() as RegistrationFormValue;
    this.submitted.emit(this.toProfile(raw));
    this.form.markAsPristine();
  }

  private toProfile(raw: RegistrationFormValue): CompanyProfile {
    const country = raw.headquarterCountry?.toUpperCase() ?? 'CA';
    const provinces = Array.isArray(raw.provincesServed) ? raw.provincesServed : [];
    const countries = Array.isArray(raw.countriesServed) ? raw.countriesServed : [];
    const representativeName = raw.canadianRepresentative_name?.trim();
    const representativeEmail = raw.canadianRepresentative_email?.trim();
    return {
      legalName: raw.legalName.trim(),
      website: raw.website?.trim() || undefined,
      headquarterCountry: country,
      headquarterProvince: country === 'CA' ? (raw.headquarterProvince ?? undefined) : undefined,
      tradeScope: raw.tradeScope,
      provincesServed: provinces,
      countriesServed: countries,
      sector: raw.sector.trim(),
      description: raw.description?.trim() || undefined,
      capacityNote: raw.capacityNote?.trim() || undefined,
      foreignRegistrationId: raw.foreignRegistrationId?.trim() || undefined,
      canadianRepresentative:
        representativeName && representativeEmail
          ? { name: representativeName, email: representativeEmail }
          : null,
      contact: {
        fullName: raw.contact_fullName.trim(),
        role: raw.contact_role.trim(),
        email: raw.contact_email.trim(),
        phone: raw.contact_phone?.trim() || undefined,
      },
      acceptedTerms: raw.acceptedTerms,
    };
  }
}
