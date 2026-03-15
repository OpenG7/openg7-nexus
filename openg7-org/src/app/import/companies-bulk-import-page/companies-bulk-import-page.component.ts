import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { startWith } from 'rxjs';

import { CompaniesBulkImportMode } from '../data-access/companies-bulk-import.service';

import { CompaniesBulkImportFacade } from './companies-bulk-import.facade';

@Component({
  selector: 'og7-companies-bulk-import-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  providers: [CompaniesBulkImportFacade],
  template: `
    <section
      class="relative isolate mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:px-8"
      data-og7="companies-bulk-import-page"
    >
      <div class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,rgba(14,116,144,0.22),transparent_68%)]"></div>
      <div class="pointer-events-none absolute -left-20 top-24 -z-10 h-56 w-56 rounded-full bg-cyan-200/35 blur-3xl"></div>
      <div class="pointer-events-none absolute -right-20 top-20 -z-10 h-64 w-64 rounded-full bg-sky-100/60 blur-3xl"></div>

      <header
        class="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.45)] backdrop-blur"
        data-og7-id="bulk-import-header"
      >
        <div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 class="text-3xl font-semibold text-slate-900 sm:text-4xl">
              {{ 'importCompaniesBulkPage.title' | translate }}
            </h1>
            <p class="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
              {{ 'importCompaniesBulkPage.subtitle' | translate }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <span class="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
              {{ 'importCompaniesBulkPage.badges.formats' | translate }}
            </span>
            <span class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {{ 'importCompaniesBulkPage.badges.liveTracking' | translate }}
            </span>
          </div>
        </div>
      </header>

      <form
        class="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-cyan-50/45 p-6 shadow-[0_18px_40px_-35px_rgba(15,23,42,0.45)]"
        [formGroup]="form"
        (ngSubmit)="submit()"
      >
        <div class="flex flex-col gap-1">
          <h2 class="text-lg font-semibold text-slate-900">
            {{ 'importCompaniesBulkPage.fields.mode' | translate }}
          </h2>
          <p class="text-sm text-slate-600">
            {{ 'importCompaniesBulkPage.fileHint' | translate }}
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label class="space-y-2 text-sm text-slate-700">
            <span class="font-medium">{{ 'importCompaniesBulkPage.fields.mode' | translate }}</span>
            <select
              formControlName="mode"
              class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="upsert">{{ 'importCompaniesBulkPage.modes.upsert' | translate }}</option>
              <option value="validate-only">{{ 'importCompaniesBulkPage.modes.validateOnly' | translate }}</option>
            </select>
          </label>

          <label class="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm">
            <input
              type="checkbox"
              formControlName="dryRun"
              class="rounded border-slate-300 text-sky-600 focus:ring-sky-300"
            />
            <span class="font-medium">{{ 'importCompaniesBulkPage.fields.dryRun' | translate }}</span>
          </label>
        </div>

        <div class="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <label
            class="group flex min-h-[16rem] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/85 p-6 text-center shadow-sm transition hover:border-sky-300 hover:bg-sky-50/80"
          >
            <span
              class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-500 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-sky-200/70"
            >
              CSV
            </span>
            <span class="text-sm font-semibold text-slate-900">
              {{ 'importCompaniesBulkPage.fields.file' | translate }}
            </span>
            <span class="mt-2 max-w-xs text-xs text-slate-500">
              {{ 'importCompaniesBulkPage.fileHint' | translate }}
            </span>
            <input
              type="file"
              accept=".csv,.jsonl,.ndjson"
              (change)="onFileSelected($event)"
              class="sr-only"
            />
          </label>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-slate-700">
              {{ 'importCompaniesBulkPage.fields.jsonFallback' | translate }}
            </label>
            <textarea
              formControlName="companiesJson"
              rows="12"
              class="min-h-[16rem] w-full rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-slate-100 shadow-inner shadow-slate-900/20 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              [placeholder]="'importCompaniesBulkPage.jsonPlaceholder' | translate"
            ></textarea>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
          <button
            type="submit"
            class="rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_-20px_rgba(14,165,233,0.55)] transition hover:from-cyan-400 hover:via-sky-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:from-slate-300 disabled:via-slate-300 disabled:to-slate-300 disabled:text-slate-500"
            [disabled]="facade.submitting()"
            data-og7="action"
            data-og7-id="bulk-import-start"
          >
            {{ facade.submitting() ? ('importCompaniesBulkPage.actions.starting' | translate) : ('importCompaniesBulkPage.actions.start' | translate) }}
          </button>
          <button
            type="button"
            class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            (click)="cancel()"
            [disabled]="facade.cancelling() || !facade.status() || isTerminal()"
            data-og7="action"
            data-og7-id="bulk-import-cancel"
          >
            {{ facade.cancelling() ? ('importCompaniesBulkPage.actions.cancelling' | translate) : ('importCompaniesBulkPage.actions.cancel' | translate) }}
          </button>
          <button
            type="button"
            class="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
            (click)="reset()"
          >
            {{ 'importCompaniesBulkPage.actions.reset' | translate }}
          </button>
          <span
            *ngIf="selectedFileName()"
            class="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800"
          >
            {{ 'importCompaniesBulkPage.selectedFile' | translate:{ file: selectedFileName() } }}
          </span>
        </div>

        <p *ngIf="facade.error()" class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {{ facade.error() }}
        </p>
      </form>

      <section
        *ngIf="facade.status() as status"
        class="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-[0_18px_40px_-35px_rgba(15,23,42,0.45)]"
        data-og7="bulk-import-progress"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-xl font-semibold text-slate-900">{{ 'importCompaniesBulkPage.progress.title' | translate }}</h2>
            <p class="mt-1 text-sm text-slate-600">
              {{ 'importCompaniesBulkPage.progress.phase' | translate:{ phase: status.phase } }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span
              *ngIf="facade.streamConnected()"
              class="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800"
            >
              {{ 'importCompaniesBulkPage.badges.liveTracking' | translate }}
            </span>
            <span
              class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
              [ngClass]="statePillClass(status.state)"
            >
              {{ ('importCompaniesBulkPage.states.' + status.state) | translate }}
            </span>
          </div>
        </div>

        <div class="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div class="h-full rounded-full bg-cyan-500 transition-all duration-300" [style.width.%]="progressPercent()"></div>
        </div>

        <dl class="grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
            <dt class="text-xs uppercase tracking-wide text-slate-500">{{ 'importCompaniesBulkPage.progress.total' | translate }}</dt>
            <dd class="mt-1 text-lg font-semibold text-slate-900">{{ status.progress.total }}</dd>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
            <dt class="text-xs uppercase tracking-wide text-slate-500">{{ 'importCompaniesBulkPage.progress.processed' | translate }}</dt>
            <dd class="mt-1 text-lg font-semibold text-slate-900">{{ status.progress.processed }}</dd>
          </div>
          <div class="rounded-xl border border-slate-200 bg-emerald-50/80 p-4 shadow-sm">
            <dt class="text-xs uppercase tracking-wide text-emerald-700/80">{{ 'importCompaniesBulkPage.progress.ok' | translate }}</dt>
            <dd class="mt-1 text-lg font-semibold text-emerald-700">{{ status.progress.ok }}</dd>
          </div>
          <div class="rounded-xl border border-slate-200 bg-rose-50/80 p-4 shadow-sm">
            <dt class="text-xs uppercase tracking-wide text-rose-700/80">{{ 'importCompaniesBulkPage.progress.failed' | translate }}</dt>
            <dd class="mt-1 text-lg font-semibold text-rose-700">{{ status.progress.failed }}</dd>
          </div>
        </dl>
      </section>

      <section
        *ngIf="facade.errorsPreview().length > 0"
        class="mt-6 space-y-3 rounded-2xl border border-rose-200 bg-rose-50/95 p-6 shadow-[0_18px_40px_-35px_rgba(244,63,94,0.25)]"
        data-og7="bulk-import-errors-preview"
      >
        <h2 class="text-lg font-semibold text-rose-700">{{ 'importCompaniesBulkPage.errors.title' | translate }}</h2>
        <ul class="space-y-2 text-sm text-rose-800">
          <li *ngFor="let error of facade.errorsPreview()">
            <span class="font-semibold">#{{ error.rowNumber }}</span> - {{ error.code }} - {{ error.message }}
          </li>
        </ul>
      </section>

      <section
        *ngIf="facade.report() as report"
        class="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-[0_18px_40px_-35px_rgba(15,23,42,0.45)]"
        data-og7="bulk-import-report"
      >
        <h2 class="text-xl font-semibold text-slate-900">{{ 'importCompaniesBulkPage.report.title' | translate }}</h2>
        <p class="text-sm text-slate-600">
          {{ 'importCompaniesBulkPage.report.summary' | translate:{
            processed: report.report.summary.processed,
            ok: report.report.summary.ok,
            failed: report.report.summary.failed
          } }}
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <a
            class="rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-sm font-semibold text-sky-800 transition hover:border-sky-300 hover:bg-sky-100"
            [href]="report.artifacts.errorsCsvUrl"
            target="_blank"
            rel="noopener"
          >
            {{ 'importCompaniesBulkPage.report.downloadCsv' | translate }}
          </a>
          <a
            class="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
            [href]="report.artifacts.errorsJsonUrl"
            target="_blank"
            rel="noopener"
          >
            {{ 'importCompaniesBulkPage.report.downloadJson' | translate }}
          </a>
        </div>
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

  constructor() {
    this.form.controls.mode.valueChanges
      .pipe(startWith(this.form.controls.mode.value), takeUntilDestroyed())
      .subscribe((mode) => {
        const dryRunControl = this.form.controls.dryRun;

        if (mode === 'validate-only') {
          dryRunControl.setValue(true, { emitEvent: false });
          dryRunControl.disable({ emitEvent: false });
          return;
        }

        dryRunControl.enable({ emitEvent: false });
      });
  }

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
