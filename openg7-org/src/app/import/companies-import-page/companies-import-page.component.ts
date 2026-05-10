import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpClientService } from '@app/core/http/http-client.service';
import { CatalogActions } from '@app/state/catalog/catalog.actions';
import { Company as CatalogCompany } from '@app/state/catalog/catalog.selectors';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';

import {
  Og7CompaniesValidationResult,
  Og7ImportedCompany,
} from '../data-access/companies-import.models';
import { CompaniesImportService } from '../data-access/companies-import.service';

interface PillarCard {
  icon: string;
  titleKey: string;
  descriptionKey: string;
}

@Component({
  selector: 'og7-companies-import-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <section class="mx-auto max-w-5xl space-y-6 p-6">
      <header class="space-y-2">
        <h1 class="text-3xl font-semibold text-slate-900">
          {{ 'importCompaniesPage.title' | translate }}
        </h1>
        <p class="text-base text-slate-600">
          {{ 'importCompaniesPage.subtitle' | translate }}
        </p>
      </header>

      <section class="grid gap-4 md:grid-cols-2">
        <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-sm font-medium text-slate-500">
            {{
              'importCompaniesPage.stats.validCompanies'
                | translate: { count: parsedCompanies().length }
            }}
          </p>
          <p class="mt-2 text-3xl font-semibold text-emerald-600">{{ parsedCompanies().length }}</p>
        </article>
        <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-sm font-medium text-slate-500">
            {{
              'importCompaniesPage.stats.errors' | translate: { count: validationErrors().length }
            }}
          </p>
          <p class="mt-2 text-3xl font-semibold text-rose-600">{{ validationErrors().length }}</p>
        </article>
      </section>

      <section class="grid gap-4 md:grid-cols-4">
        <article
          *ngFor="let pillar of pillars"
          class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm"
        >
          <span class="text-2xl" aria-hidden="true">{{ pillar.icon }}</span>
          <h3 class="font-semibold text-slate-700">
            {{ pillar.titleKey | translate }}
          </h3>
          <p class="text-slate-500">
            {{ pillar.descriptionKey | translate }}
          </p>
        </article>
      </section>

      <section
        class="space-y-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm"
      >
        <h2 class="text-xl font-semibold text-slate-800">
          {{ 'importCompaniesPage.uploadTitle' | translate }}
        </h2>
        <p class="text-sm text-slate-500">
          {{ 'importCompaniesPage.uploadHint' | translate }}
        </p>
        <form
          [formGroup]="uploadForm"
          class="flex flex-col gap-4 md:flex-row"
          (ngSubmit)="onParseManualJson()"
        >
          <label
            class="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 md:w-1/2"
          >
            <span class="mb-2 text-2xl" aria-hidden="true">📁</span>
            <span>{{ 'importCompaniesPage.uploadLabel' | translate }}</span>
            <input
              type="file"
              class="hidden"
              accept="application/json"
              (change)="onFileSelected($event)"
            />
          </label>
          <div class="w-full md:w-1/2 space-y-3">
            <button
              type="submit"
              class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <span aria-hidden="true">🔍</span>
              {{ 'importCompaniesPage.parseButton' | translate }}
            </button>
            <textarea
              formControlName="manualJson"
              rows="10"
              class="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              [placeholder]="'importCompaniesPage.textareaPlaceholder' | translate"
            ></textarea>
          </div>
        </form>
      </section>

      <section
        *ngIf="importSuccessMessage()"
        class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
      >
        {{ importSuccessMessage() }}
      </section>
      <section
        *ngIf="importFailureMessage()"
        class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
      >
        {{ importFailureMessage() }}
      </section>

      <section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-xl font-semibold text-slate-800">
              {{ 'importCompaniesPage.previewTitle' | translate }}
            </h2>
            <p class="text-sm text-slate-500">
              {{
                'importCompaniesPage.previewSubtitle'
                  | translate: { count: parsedCompanies().length }
              }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            [disabled]="parsedCompanies().length === 0 || isImporting()"
            (click)="onImportRequested()"
          >
            <span aria-hidden="true">⬆️</span>
            <span *ngIf="!isImporting(); else importingLabel">{{
              'importCompaniesPage.importButton' | translate
            }}</span>
            <ng-template #importingLabel>
              {{ 'importCompaniesPage.importing' | translate }}
            </ng-template>
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-4 py-3">
                  {{ 'importCompaniesPage.table.headers.businessId' | translate }}
                </th>
                <th class="px-4 py-3">
                  {{ 'importCompaniesPage.table.headers.name' | translate }}
                </th>
                <th class="px-4 py-3">
                  {{ 'importCompaniesPage.table.headers.province' | translate }}
                </th>
                <th class="px-4 py-3">
                  {{ 'importCompaniesPage.table.headers.sectors' | translate }}
                </th>
              </tr>
            </thead>
            <tbody
              class="divide-y divide-slate-200 bg-white"
              *ngIf="parsedCompanies().length > 0; else emptyPreview"
            >
              <tr
                *ngFor="let company of parsedCompanies(); let i = index"
                class="transition hover:bg-slate-50"
              >
                <td class="px-4 py-3 font-medium text-slate-700">{{ company.businessId }}</td>
                <td class="px-4 py-3 text-slate-600">{{ company.name }}</td>
                <td class="px-4 py-3 text-slate-600">{{ company.location.province || '—' }}</td>
                <td class="px-4 py-3 text-slate-600">{{ company.sectors.join(', ') }}</td>
              </tr>
            </tbody>
          </table>
          <ng-template #emptyPreview>
            <div class="p-6 text-center text-sm text-slate-500">
              {{ 'importCompaniesPage.table.empty' | translate }}
            </div>
          </ng-template>
        </div>
      </section>

      <section
        *ngIf="validationErrors().length > 0"
        class="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm"
      >
        <h2 class="text-lg font-semibold text-rose-700">
          {{ 'importCompaniesPage.validationTitle' | translate }}
        </h2>
        <ul class="list-disc space-y-2 pl-5 text-sm text-rose-700">
          <li *ngFor="let error of validationErrors()">{{ error }}</li>
        </ul>
      </section>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompaniesImportPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);
  private readonly importService = inject(CompaniesImportService);
  private readonly http = inject(HttpClientService);
  private readonly store = inject(Store);

  readonly fileContentRaw = signal<string | null>(null);
  readonly parsedCompanies = signal<Og7ImportedCompany[]>([]);
  readonly validationErrors = signal<string[]>([]);
  readonly isImporting = signal(false);
  readonly importSuccessMessage = signal<string | null>(null);
  readonly importFailureMessage = signal<string | null>(null);

  readonly uploadForm = this.fb.nonNullable.group({
    manualJson: [''],
  });

  readonly pillars: PillarCard[] = [
    {
      icon: '🆔',
      titleKey: 'importCompaniesPage.pillars.ids.title',
      descriptionKey: 'importCompaniesPage.pillars.ids.description',
    },
    {
      icon: '🏭',
      titleKey: 'importCompaniesPage.pillars.sectors.title',
      descriptionKey: 'importCompaniesPage.pillars.sectors.description',
    },
    {
      icon: '🗺️',
      titleKey: 'importCompaniesPage.pillars.location.title',
      descriptionKey: 'importCompaniesPage.pillars.location.description',
    },
    {
      icon: '🤝',
      titleKey: 'importCompaniesPage.pillars.contacts.title',
      descriptionKey: 'importCompaniesPage.pillars.contacts.description',
    },
  ];

  onParseManualJson(): void {
    const content = this.uploadForm.controls.manualJson.value.trim();
    this.handleParsedContent(content.length > 0 ? content : null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0);
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      this.uploadForm.controls.manualJson.setValue(text);
      this.handleParsedContent(text || null);
    };
    reader.onerror = () => {
      this.validationErrors.set([
        this.translate.instant('importCompaniesPage.validation.fileReadError', {
          fileName: file.name,
        }),
      ]);
    };
    reader.readAsText(file);
  }

  /**
   * Cette méthode valide la structure minimale fournie par les gouvernements avant de l’envoyer au backend OpenG7.
   */
  onImportRequested(): void {
    if (this.parsedCompanies().length === 0 || this.isImporting()) {
      return;
    }

    this.importSuccessMessage.set(null);
    this.importFailureMessage.set(null);
    this.isImporting.set(true);

    this.importService
      .importCompanies(this.parsedCompanies())
      .pipe(finalize(() => this.isImporting.set(false)))
      .subscribe({
        next: (response) => {
          const result = response?.data;
          const processedCount = result?.processed ?? this.parsedCompanies().length;
          this.importSuccessMessage.set(
            this.translate.instant('importCompaniesPage.successMessage', {
              count: processedCount,
            }),
          );
          if (result?.errors?.length) {
            this.validationErrors.set(
              result.errors.map((entry) => {
                const businessId = entry.businessId ?? 'n/a';
                return `#${entry.index} (${businessId}): ${entry.reason}`;
              }),
            );
          } else {
            this.validationErrors.set([]);
          }
          this.refreshCatalogCompanies();
        },
        error: (error: unknown) => {
          console.error('OpenG7 companies import failed', error);
          this.importFailureMessage.set(this.translate.instant('importCompaniesPage.errorMessage'));
        },
      });
  }

  private handleParsedContent(content: string | null): void {
    this.fileContentRaw.set(content);
    this.importSuccessMessage.set(null);
    this.importFailureMessage.set(null);

    if (!content) {
      this.parsedCompanies.set([]);
      this.validationErrors.set([]);
      return;
    }

    try {
      const raw = JSON.parse(content);
      const result = this.validateCompaniesPayload(raw);
      this.parsedCompanies.set(result.validCompanies);
      this.validationErrors.set(result.errors);
    } catch (error) {
      this.parsedCompanies.set([]);
      const message =
        error instanceof Error
          ? error.message
          : this.translate.instant('importCompaniesPage.validation.unknownError');
      this.validationErrors.set([
        this.translate.instant('importCompaniesPage.validation.invalidJson', {
          message,
        }),
      ]);
    }
  }

  private validateCompaniesPayload(payload: unknown): Og7CompaniesValidationResult {
    const errors: string[] = [];
    const validCompanies: Og7ImportedCompany[] = [];

    if (!Array.isArray(payload)) {
      errors.push(this.translate.instant('importCompaniesPage.validation.notArray'));
      return { validCompanies, errors };
    }

    payload.forEach((entry, index) => {
      if (typeof entry !== 'object' || entry === null) {
        errors.push(
          this.translate.instant('importCompaniesPage.validation.invalidEntry', {
            index: index + 1,
          }),
        );
        return;
      }

      const candidate = entry as Partial<Og7ImportedCompany> & {
        location?: Partial<Og7ImportedCompany['location']>;
        contacts?: Partial<Og7ImportedCompany['contacts']>;
      };

      const missingFields: string[] = [];
      if (typeof candidate.businessId !== 'string' || candidate.businessId.trim().length === 0) {
        missingFields.push('businessId');
      }
      if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) {
        missingFields.push('name');
      }
      if (
        !Array.isArray(candidate.sectors) ||
        candidate.sectors.some((sector) => typeof sector !== 'string')
      ) {
        missingFields.push('sectors');
      }
      if (typeof candidate.location !== 'object' || candidate.location === null) {
        missingFields.push('location');
      } else {
        if (
          typeof candidate.location.lat !== 'number' ||
          typeof candidate.location.lng !== 'number'
        ) {
          missingFields.push('location.lat-lng');
        }
      }
      if (typeof candidate.contacts !== 'object' || candidate.contacts === null) {
        missingFields.push('contacts');
      }

      if (missingFields.length > 0) {
        errors.push(
          this.translate.instant('importCompaniesPage.validation.missingFields', {
            index: index + 1,
            fields: missingFields.join(', '),
          }),
        );
        return;
      }

      const businessId = candidate.businessId as string;
      const name = candidate.name as string;
      const location = candidate.location as Og7ImportedCompany['location'];
      const contacts = candidate.contacts as Og7ImportedCompany['contacts'];

      const cleanedCompany: Og7ImportedCompany = {
        businessId,
        name,
        sectors: candidate.sectors ?? [],
        location: {
          lat: location.lat,
          lng: location.lng,
          province: location.province,
          country: location.country,
        },
        contacts: {
          website: contacts.website,
          email: contacts.email,
          phone: contacts.phone,
          contactName: contacts.contactName,
        },
      };
      validCompanies.push(cleanedCompany);
    });

    return { validCompanies, errors };
  }

  private refreshCatalogCompanies(): void {
    this.http.get<unknown>('/api/companies').subscribe({
      next: (response) => {
        const companies = this.mapCatalogCompanies(response);
        if (companies.length > 0) {
          this.store.dispatch(CatalogActions.companiesUpdated({ companies }));
        }
      },
      error: (error) => {
        console.warn('Unable to refresh catalog companies after import.', error);
      },
    });
  }

  private mapCatalogCompanies(payload: unknown): CatalogCompany[] {
    const entries = this.extractCollectionItems(payload);
    const items: CatalogCompany[] = [];

    for (const entry of entries) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        continue;
      }
      const record = entry as {
        id?: unknown;
        name?: unknown;
        attributes?: {
          name?: unknown;
        } | null;
      };
      const id = record.id;
      const nameCandidate = record.name ?? record.attributes?.name;
      const name = typeof nameCandidate === 'string' ? nameCandidate.trim() : '';
      if ((typeof id !== 'number' && typeof id !== 'string') || !name) {
        continue;
      }
      items.push({
        id: String(id),
        name,
      });
    }

    return items;
  }

  private extractCollectionItems(payload: unknown): unknown[] {
    if (Array.isArray(payload)) {
      return payload;
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return [];
    }
    const data = (payload as { data?: unknown }).data;
    return Array.isArray(data) ? data : [];
  }
}
