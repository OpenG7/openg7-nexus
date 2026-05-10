import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StrapiClient } from '@app/core/api/strapi-client';
import { G7_COUNTRY_CODES, CountryCode, isCountryCode } from '@app/core/models/country';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import {
  CompanyCapacity,
  CompanyPayload,
  CompanyService,
} from '@app/core/services/company.service';
import { TranslateModule } from '@ngx-translate/core';

interface SelectOption {
  readonly id: number;
  readonly name: string;
}

type Step = 'general' | 'capacities' | 'logos';

@Component({
  standalone: true,
  selector: 'og7-company-register-page',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './company-register.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Chargée par le routeur Angular pour afficher la page « Company Register » du dossier « domains/enterprise/pages ».
 * Raison d’être : Lie le template standalone et les dépendances de cette page pour la rendre navigable.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns CompanyRegisterPage gérée par le framework.
 */
export class CompanyRegisterPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly notifications = injectNotificationStore();
  private readonly companyService = inject(CompanyService);
  private readonly strapiClient = inject(StrapiClient);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly stepIndex = signal(0);
  protected readonly sectors = signal<readonly SelectOption[]>([]);
  protected readonly provinces = signal<readonly SelectOption[]>([]);
  protected readonly countries = signal<readonly CountryCode[]>(G7_COUNTRY_CODES);

  protected readonly stepOrder: readonly Step[] = ['general', 'capacities', 'logos'];
  protected readonly stepLabels = computed(() => [
    'General information',
    'Capabilities',
    'Logos & branding',
  ]);
  protected readonly currentStep = computed<Step>(
    () => this.stepOrder[this.stepIndex()] ?? 'general',
  );
  protected readonly currentStepIndex = this.stepIndex.asReadonly();

  protected readonly form = this.fb.group({
    general: this.fb.group({
      name: ['', Validators.required],
      description: [''],
      website: [''],
      sectorId: ['', Validators.required],
      provinceId: ['', Validators.required],
      country: ['', Validators.required],
    }),
    capacities: this.fb.array([this.createCapacityGroup()]),
    logos: this.fb.group({
      logoUrl: [''],
      secondaryLogoUrl: [''],
    }),
  });

  ngOnInit(): void {
    void this.loadTaxonomies();
  }

  protected generalGroup(): FormGroup {
    return this.form.get('general') as FormGroup;
  }

  protected logosGroup(): FormGroup {
    return this.form.get('logos') as FormGroup;
  }

  protected capacityControls(): FormArray<FormGroup> {
    return this.form.get('capacities') as FormArray<FormGroup>;
  }

  protected isGeneralInvalid(control: 'name' | 'sectorId' | 'provinceId' | 'country'): boolean {
    const field = this.generalGroup().get(control);
    return Boolean(field && field.invalid && field.touched);
  }

  protected addCapacity(): void {
    this.capacityControls().push(this.createCapacityGroup());
  }

  protected removeCapacity(index: number): void {
    const array = this.capacityControls();
    if (array.length <= 1) {
      array.at(0)?.reset({ label: '', value: '', unit: '' });
      return;
    }
    array.removeAt(index);
  }

  protected nextStep(): void {
    if (!this.validateStep(this.stepIndex())) {
      return;
    }
    if (this.stepIndex() < this.stepOrder.length - 1) {
      this.stepIndex.update((value) => value + 1);
    }
  }

  protected previousStep(): void {
    if (this.stepIndex() > 0) {
      this.stepIndex.update((value) => value - 1);
    }
  }

  protected onSubmit(): void {
    if (this.submitting()) {
      return;
    }
    if (!this.validateStep(this.stepIndex()) || !this.form.valid) {
      return;
    }
    this.submitting.set(true);
    const payload = this.buildPayload();
    this.companyService.createCompany(payload).subscribe({
      next: async (company) => {
        this.notifications.success('Your company has been submitted for moderation.', {
          source: 'companies',
          metadata: { companyId: company?.id },
        });
        this.form.reset();
        this.generalGroup().reset({
          name: '',
          description: '',
          website: '',
          sectorId: '',
          provinceId: '',
          country: '',
        });
        this.logosGroup().reset({ logoUrl: '', secondaryLogoUrl: '' });
        this.capacityControls().clear();
        this.capacityControls().push(this.createCapacityGroup());
        this.stepIndex.set(0);
        this.submitting.set(false);
        await this.router.navigate(['/profile']);
      },
      error: () => {
        this.notifications.error('Unable to submit your company. Please try again later.', {
          source: 'companies',
          deliver: { email: true },
        });
        this.submitting.set(false);
      },
    });
  }

  private createCapacityGroup(): FormGroup {
    return this.fb.group({
      label: ['', Validators.required],
      value: [''],
      unit: [''],
    });
  }

  private async loadTaxonomies(): Promise<void> {
    try {
      const [sectors, provinces] = await Promise.all([
        this.strapiClient.sectors(),
        this.strapiClient.provinces(),
      ]);
      this.sectors.set((sectors?.data ?? []).map(this.mapOption));
      this.provinces.set((provinces?.data ?? []).map(this.mapOption));
    } catch (error) {
      this.notifications.error('Unable to load catalog data.', {
        source: 'company-register',
        context: error,
      });
    }
  }

  private mapOption = (value: unknown): SelectOption => {
    if (!value || typeof value !== 'object') {
      return { id: 0, name: 'Unknown' };
    }
    const record = value as {
      id?: unknown;
      name?: unknown;
      attributes?: { id?: unknown; name?: unknown } | null;
    };
    if (typeof record.id === 'number' && 'name' in record) {
      return { id: record.id, name: String(record.name ?? 'Unknown') };
    }
    const id = Number(record.id ?? record.attributes?.id ?? 0);
    const nameCandidate = record.name ?? record.attributes?.name;
    return {
      id,
      name: typeof nameCandidate === 'string' ? nameCandidate : 'Unknown',
    };
  };

  private validateStep(index: number): boolean {
    if (index === 0) {
      const general = this.generalGroup();
      general.markAllAsTouched();
      return general.valid;
    }
    if (index === 1) {
      const capacities = this.capacityControls();
      capacities.controls.forEach((control) => control.markAllAsTouched());
      return capacities.controls.every((control) => control.valid);
    }
    if (index === 2) {
      this.logosGroup().markAllAsTouched();
    }
    return true;
  }

  private buildPayload(): CompanyPayload & { name: string } {
    const general = this.generalGroup().value as Record<string, unknown>;
    const logos = this.logosGroup().value as Record<string, unknown>;
    const capacities = this.capacityControls().value as Record<string, unknown>[];

    return {
      name: String(general['name'] ?? '').trim(),
      description: this.normalizeString(general['description']),
      website: this.normalizeString(general['website']),
      sectorId: this.normalizeNumber(general['sectorId']),
      provinceId: this.normalizeNumber(general['provinceId']),
      country: this.normalizeCountryCode(general['country']),
      capacities: capacities
        .map((entry) => ({
          label: String(entry['label'] ?? '').trim(),
          value: this.normalizeNumber(entry['value']),
          unit: this.normalizeString(entry['unit']),
        }))
        .filter((entry) => entry.label.length > 0) as CompanyCapacity[],
      logoUrl: this.normalizeString(logos['logoUrl']),
      secondaryLogoUrl: this.normalizeString(logos['secondaryLogoUrl']),
    };
  }

  private normalizeString(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    return null;
  }

  private normalizeNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    return null;
  }

  private normalizeCountryCode(value: unknown): CountryCode | null {
    if (!isCountryCode(value)) {
      return null;
    }
    const normalized = (value as string).trim().toUpperCase();
    return normalized as CountryCode;
  }
}
