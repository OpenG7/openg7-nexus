import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { CompaniesBulkImportMode } from '../data-access/companies-bulk-import.service';
import { CompaniesBulkImportFacade } from './companies-bulk-import.facade';

@Component({
  selector: 'og7-companies-bulk-import-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  providers: [CompaniesBulkImportFacade],
  template: `
    <section class="mx-auto max-w-5xl space-y-6 p-6" data-og7="companies-bulk-import-page">
      <header class="space-y-2">
        <h1 class="text-3xl font-semibold text-slate-900">{{ 'importCompaniesBulkPage.title' | translate }}</h1>
        <p class="text-base text-slate-600">{{ 'importCompaniesBulkPage.subtitle' | translate }}</p>
      </header>

      <form class="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" [formGroup]="form" (ngSubmit)="submit()">
        <div class="grid gap-4 md:grid-cols-2">
          <label class="space-y-2 text-sm text-slate-700">
            <span class="font-medium">{{ 'importCompaniesBulkPage.fields.mode' | translate }}</span>
            <select formControlName="mode" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="upsert">{{ 'importCompaniesBulkPage.modes.upsert' | translate }}</option>
              <option value="validate-only">{{ 'importCompaniesBulkPage.modes.validateOnly' | translate }}</option>
            </select>
          </label>

          <label class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" formControlName="dryRun" class="rounded border-slate-300" [disabled]="form.controls.mode.value === 'validate-only'" />
            <span>{{ 'importCompaniesBulkPage.fields.dryRun' | translate }}</span>
          </label>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-slate-700">{{ 'importCompaniesBulkPage.fields.file' | translate }}</label>
          <input
            type="file"
            accept=".csv,.jsonl,.ndjson"
            (change)="onFileSelected($event)"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <p class="text-xs text-slate-500">{{ 'importCompaniesBulkPage.fileHint' | translate }}</p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-slate-700">{{ 'importCompaniesBulkPage.fields.jsonFallback' | translate }}</label>
          <textarea
            formControlName="companiesJson"
            rows="8"
            class="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-800"
            [placeholder]="'importCompaniesBulkPage.jsonPlaceholder' | translate"
          ></textarea>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            [disabled]="facade.submitting()"
            data-og7="action"
            data-og7-id="bulk-import-start"
          >
            {{ facade.submitting() ? ('importCompaniesBulkPage.actions.starting' | translate) : ('importCompaniesBulkPage.actions.start' | translate) }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            (click)="cancel()"
            [disabled]="facade.cancelling() || !facade.status() || isTerminal()"
            data-og7="action"
            data-og7-id="bulk-import-cancel"
          >
            {{ facade.cancelling() ? ('importCompaniesBulkPage.actions.cancelling' | translate) : ('importCompaniesBulkPage.actions.cancel' | translate) }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            (click)="reset()"
          >
            {{ 'importCompaniesBulkPage.actions.reset' | translate }}
          </button>
          <span *ngIf="selectedFileName()" class="text-xs text-slate-500">
            {{ 'importCompaniesBulkPage.selectedFile' | translate:{ file: selectedFileName() } }}
          </span>
        </div>

        <p *ngIf="facade.error()" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {{ facade.error() }}
        </p>
      </form>

      <section *ngIf="facade.status() as status" class="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" data-og7="bulk-import-progress">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-xl font-semibold text-slate-900">{{ 'importCompaniesBulkPage.progress.title' | translate }}</h2>
          <span
            class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
            [ngClass]="statePillClass(status.state)"
          >
            {{ ('importCompaniesBulkPage.states.' + status.state) | translate }}
          </span>
        </div>
        <p class="text-sm text-slate-600">
          {{ 'importCompaniesBulkPage.progress.phase' | translate:{ phase: status.phase } }}
        </p>

        <div class="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div class="h-full rounded-full bg-cyan-500 transition-all duration-300" [style.width.%]="progressPercent()"></div>
        </div>

        <dl class="grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <dt class="text-xs uppercase tracking-wide text-slate-500">{{ 'importCompaniesBulkPage.progress.total' | translate }}</dt>
            <dd class="mt-1 text-lg font-semibold text-slate-900">{{ status.progress.total }}</dd>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <dt class="text-xs uppercase tracking-wide text-slate-500">{{ 'importCompaniesBulkPage.progress.processed' | translate }}</dt>
            <dd class="mt-1 text-lg font-semibold text-slate-900">{{ status.progress.processed }}</dd>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <dt class="text-xs uppercase tracking-wide text-slate-500">{{ 'importCompaniesBulkPage.progress.ok' | translate }}</dt>
            <dd class="mt-1 text-lg font-semibold text-emerald-700">{{ status.progress.ok }}</dd>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <dt class="text-xs uppercase tracking-wide text-slate-500">{{ 'importCompaniesBulkPage.progress.failed' | translate }}</dt>
            <dd class="mt-1 text-lg font-semibold text-rose-700">{{ status.progress.failed }}</dd>
          </div>
        </dl>
      </section>

      <section *ngIf="facade.errorsPreview().length > 0" class="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm" data-og7="bulk-import-errors-preview">
        <h2 class="text-lg font-semibold text-rose-700">{{ 'importCompaniesBulkPage.errors.title' | translate }}</h2>
        <ul class="space-y-2 text-sm text-rose-800">
          <li *ngFor="let error of facade.errorsPreview()">
            <span class="font-semibold">#{{ error.rowNumber }}</span> — {{ error.code }} — {{ error.message }}
          </li>
        </ul>
      </section>

      <section *ngIf="facade.report() as report" class="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" data-og7="bulk-import-report">
        <h2 class="text-xl font-semibold text-slate-900">{{ 'importCompaniesBulkPage.report.title' | translate }}</h2>
        <p class="text-sm text-slate-600">
          {{ 'importCompaniesBulkPage.report.summary' | translate:{
            processed: report.report.summary.processed,
            ok: report.report.summary.ok,
            failed: report.report.summary.failed
          } }}
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <a class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
             [href]="report.artifacts.errorsCsvUrl" target="_blank" rel="noopener">
            {{ 'importCompaniesBulkPage.report.downloadCsv' | translate }}
          </a>
          <a class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
             [href]="report.artifacts.errorsJsonUrl" target="_blank" rel="noopener">
            {{ 'importCompaniesBulkPage.report.downloadJson' | translate }}
          </a>
        </div>
      </section>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompaniesBulkImportPageComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly facade = inject(CompaniesBulkImportFacade);

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly selectedFileName = computed(() => this.selectedFile()?.name ?? null);
  protected readonly progressPercent = computed(() => {
    const status = this.facade.status();
    if (!status || status.progress.total <= 0) {
      return 0;
    }
    const ratio = (status.progress.processed / status.progress.total) * 100;
    return Number.isFinite(ratio) ? Math.max(0, Math.min(100, ratio)) : 0;
  });

  protected readonly form = this.fb.nonNullable.group({
    mode: ['upsert' as CompaniesBulkImportMode],
    dryRun: [false],
    companiesJson: [
      JSON.stringify(
        [
          {
            businessId: 'BULK-DEMO-001',
            name: 'OpenG7 Demo Company',
            sectors: ['Energy'],
            location: { lat: 45.5017, lng: -73.5673, province: 'QC', country: 'Canada' },
            contacts: { website: 'https://demo.openg7.org' },
          },
        ],
        null,
        2
      ),
    ],
  });

  async submit(): Promise<void> {
    const mode = this.form.controls.mode.value;
    const dryRun = mode === 'validate-only' ? true : this.form.controls.dryRun.value;
    const file = this.selectedFile();

    if (file) {
      await this.facade.startFromFile({ file, mode, dryRun });
      return;
    }

    let companies: unknown[];
    try {
      const parsed = JSON.parse(this.form.controls.companiesJson.value) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error('JSON payload must be an array.');
      }
      companies = parsed;
    } catch {
      await this.facade.startFromJson({ companies: [], mode, dryRun });
      return;
    }

    await this.facade.startFromJson({ companies, mode, dryRun });
  }

  async cancel(): Promise<void> {
    await this.facade.cancelCurrentJob();
  }

  reset(): void {
    this.selectedFile.set(null);
    this.facade.reset();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0) ?? null;
    this.selectedFile.set(file);
  }

  isTerminal(): boolean {
    const state = this.facade.status()?.state;
    return state === 'completed' || state === 'failed' || state === 'cancelled';
  }

  statePillClass(state: string): string {
    if (state === 'completed') {
      return 'bg-emerald-100 text-emerald-800';
    }
    if (state === 'failed') {
      return 'bg-rose-100 text-rose-800';
    }
    if (state === 'cancelled') {
      return 'bg-amber-100 text-amber-800';
    }
    return 'bg-cyan-100 text-cyan-800';
  }
}
