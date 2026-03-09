import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, NgZone, PLATFORM_ID, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import { CompanyImportBulkActions } from '../../store/company-import-bulk/company-import-bulk.actions';
import {
  selectCompanyImportBulkCancelling,
  selectCompanyImportBulkError,
  selectCompanyImportBulkErrorsPreview,
  selectCompanyImportBulkPollingEnabled,
  selectCompanyImportBulkReport,
  selectCompanyImportBulkStart,
  selectCompanyImportBulkStatus,
  selectCompanyImportBulkStreamConnected,
  selectCompanyImportBulkSubmitting,
} from '../../store/company-import-bulk/company-import-bulk.selectors';
import {
  CompaniesBulkImportMode,
  CompaniesBulkImportService,
  CompaniesBulkImportStartResponse,
} from '../data-access/companies-bulk-import.service';

@Injectable()
export class CompaniesBulkImportFacade {
  private readonly api = inject(CompaniesBulkImportService);
  private readonly store = inject(Store);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  private eventSource: EventSource | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private statusInFlight = false;

  readonly submitting = this.store.selectSignal(selectCompanyImportBulkSubmitting);
  readonly cancelling = this.store.selectSignal(selectCompanyImportBulkCancelling);
  readonly start = this.store.selectSignal(selectCompanyImportBulkStart);
  readonly status = this.store.selectSignal(selectCompanyImportBulkStatus);
  readonly report = this.store.selectSignal(selectCompanyImportBulkReport);
  readonly errorsPreview = this.store.selectSignal(selectCompanyImportBulkErrorsPreview);
  readonly streamConnected = this.store.selectSignal(selectCompanyImportBulkStreamConnected);
  readonly pollingEnabled = this.store.selectSignal(selectCompanyImportBulkPollingEnabled);
  readonly error = this.store.selectSignal(selectCompanyImportBulkError);

  constructor() {
    this.destroyRef.onDestroy(() => this.teardownRealtime());
  }

  async startFromJson(options: {
    readonly companies: ReadonlyArray<unknown>;
    readonly mode: CompaniesBulkImportMode;
    readonly dryRun: boolean;
  }): Promise<void> {
    await this.startImport(
      this.api.startWithJson({
        companies: options.companies,
        mode: options.mode,
        dryRun: options.dryRun,
        idempotencyKey: this.buildIdempotencyKey(),
      })
    );
  }

  async startFromFile(options: {
    readonly file: File;
    readonly mode: CompaniesBulkImportMode;
    readonly dryRun: boolean;
  }): Promise<void> {
    await this.startImport(
      this.api.startWithFile({
        file: options.file,
        mode: options.mode,
        dryRun: options.dryRun,
        idempotencyKey: this.buildIdempotencyKey(),
      })
    );
  }

  async cancelCurrentJob(): Promise<void> {
    const jobId = this.start()?.jobId ?? this.status()?.jobId;
    if (!jobId) {
      return;
    }
    this.store.dispatch(CompanyImportBulkActions.cancelRequested());
    try {
      await firstValueFrom(this.api.cancel(jobId));
      this.store.dispatch(CompanyImportBulkActions.cancelSucceeded());
      await this.refreshStatus(jobId);
    } catch (error: unknown) {
      this.store.dispatch(
        CompanyImportBulkActions.cancelFailed({
          error: this.resolveErrorMessage(error, 'Unable to cancel the import job.'),
        })
      );
    }
  }

  reset(): void {
    this.teardownRealtime();
    this.store.dispatch(CompanyImportBulkActions.reset());
  }

  private async startImport(start$Promise: ReturnType<CompaniesBulkImportService['startWithJson']>): Promise<void> {
    this.store.dispatch(CompanyImportBulkActions.startRequested());
    this.teardownRealtime();
    try {
      const response = await firstValueFrom(start$Promise);
      this.store.dispatch(CompanyImportBulkActions.startSucceeded({ response }));
      await this.watchJob(response);
    } catch (error: unknown) {
      this.store.dispatch(
        CompanyImportBulkActions.startFailed({
          error: this.resolveErrorMessage(error, 'Unable to start the bulk import.'),
        })
      );
    }
  }

  private async watchJob(start: CompaniesBulkImportStartResponse): Promise<void> {
    await this.refreshStatus(start.jobId);
    if (!this.browser || typeof EventSource === 'undefined') {
      this.startPolling(start.jobId);
      return;
    }
    this.connectEventSource(start.eventsUrl, start.jobId);
  }

  private connectEventSource(url: string, jobId: string): void {
    try {
      this.eventSource = new EventSource(url, { withCredentials: true } as EventSourceInit);
      this.store.dispatch(CompanyImportBulkActions.streamConnected());
      this.store.dispatch(CompanyImportBulkActions.pollingDisabled());
    } catch {
      this.store.dispatch(CompanyImportBulkActions.streamDisconnected());
      this.startPolling(jobId);
      return;
    }

    this.eventSource.onmessage = () => {
      this.zone.run(() => {
        void this.refreshStatus(jobId);
      });
    };
    this.eventSource.onerror = () => {
      this.zone.run(() => {
        this.store.dispatch(CompanyImportBulkActions.streamDisconnected());
        this.closeEventSource();
        this.startPolling(jobId);
      });
    };
  }

  private startPolling(jobId: string): void {
    this.stopPolling();
    this.store.dispatch(CompanyImportBulkActions.pollingEnabled());
    this.pollTimer = setInterval(() => {
      void this.refreshStatus(jobId);
    }, 2000);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.store.dispatch(CompanyImportBulkActions.pollingDisabled());
  }

  private closeEventSource(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private teardownRealtime(): void {
    this.closeEventSource();
    this.stopPolling();
    this.store.dispatch(CompanyImportBulkActions.streamDisconnected());
  }

  private async refreshStatus(jobId: string): Promise<void> {
    if (this.statusInFlight) {
      return;
    }
    this.statusInFlight = true;
    try {
      const status = await firstValueFrom(this.api.getStatus(jobId));
      this.store.dispatch(CompanyImportBulkActions.statusLoaded({ status }));
      if (status.state === 'completed' || status.state === 'failed' || status.state === 'cancelled') {
        this.teardownRealtime();
        await this.loadReportAndErrors(jobId);
      }
    } catch (error: unknown) {
      this.store.dispatch(
        CompanyImportBulkActions.statusFailed({
          error: this.resolveErrorMessage(error, 'Unable to refresh bulk import status.'),
        })
      );
    } finally {
      this.statusInFlight = false;
    }
  }

  private async loadReportAndErrors(jobId: string): Promise<void> {
    try {
      const report = await firstValueFrom(this.api.getReport(jobId));
      this.store.dispatch(CompanyImportBulkActions.reportLoaded({ report }));
    } catch {
      // Keep the latest status visible even if report fetch fails.
    }

    try {
      const errors = await firstValueFrom(this.api.getErrors(jobId, 'json', 25));
      this.store.dispatch(CompanyImportBulkActions.errorsPreviewLoaded({ errors: errors.data }));
    } catch {
      this.store.dispatch(CompanyImportBulkActions.errorsPreviewLoaded({ errors: [] }));
    }
  }

  private buildIdempotencyKey(): string {
    if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    const maybe = error as { error?: { error?: { message?: string } | string; message?: string }; message?: string };
    const nestedErrorMessage =
      typeof maybe?.error?.error === 'object' ? maybe.error.error.message : maybe?.error?.error;
    const message =
      nestedErrorMessage ??
      maybe?.error?.message ??
      maybe?.message;
    return typeof message === 'string' && message.trim() ? message.trim() : fallback;
  }
}
