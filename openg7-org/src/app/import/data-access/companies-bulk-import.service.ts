import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type CompaniesBulkImportMode = 'validate-only' | 'upsert';
export type CompaniesBulkImportState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface CompaniesBulkImportStartResponse {
  readonly jobId: string;
  readonly statusUrl: string;
  readonly eventsUrl: string;
  readonly reportUrl: string;
  readonly errorsUrl?: string;
}

export interface CompaniesBulkImportStatusResponse {
  readonly jobId: string;
  readonly state: CompaniesBulkImportState;
  readonly phase: string;
  readonly mode: CompaniesBulkImportMode;
  readonly dryRun: boolean;
  readonly progress: {
    readonly total: number;
    readonly processed: number;
    readonly ok: number;
    readonly failed: number;
  };
  readonly counters: {
    readonly created: number;
    readonly updated: number;
    readonly skipped: number;
    readonly warnings: number;
  };
  readonly timestamps: {
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly startedAt: string | null;
    readonly completedAt: string | null;
    readonly cancelRequestedAt: string | null;
  };
  readonly lastError: string | null;
}

export interface CompaniesBulkImportReportResponse {
  readonly jobId: string;
  readonly state: CompaniesBulkImportState;
  readonly phase: string;
  readonly report: {
    readonly summary: {
      readonly received: number;
      readonly processed: number;
      readonly ok: number;
      readonly failed: number;
      readonly created: number;
      readonly updated: number;
      readonly skipped: number;
      readonly warnings: number;
      readonly mode?: CompaniesBulkImportMode;
      readonly dryRun?: boolean;
    };
    readonly completedAt?: string;
  };
  readonly artifacts: {
    readonly errorsJsonUrl: string;
    readonly errorsCsvUrl: string;
  };
}

export interface CompaniesBulkImportErrorEntry {
  readonly id: number;
  readonly rowNumber: number;
  readonly field: string | null;
  readonly code: string;
  readonly message: string;
  readonly rawSample: string | null;
  readonly createdAt: string;
}

export interface CompaniesBulkImportErrorsResponse {
  readonly jobId: string;
  readonly count: number;
  readonly data: ReadonlyArray<CompaniesBulkImportErrorEntry>;
}

export interface CompaniesBulkImportCancelResponse {
  readonly jobId: string;
  readonly cancelled: boolean;
  readonly state: CompaniesBulkImportState;
}

@Injectable({ providedIn: 'root' })
export class CompaniesBulkImportService {
  private readonly http = inject(HttpClient);

  startWithJson(options: {
    readonly companies: ReadonlyArray<unknown>;
    readonly mode: CompaniesBulkImportMode;
    readonly dryRun: boolean;
    readonly idempotencyKey?: string | null;
  }): Observable<CompaniesBulkImportStartResponse> {
    const headers = options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : undefined;
    return this.http.post<CompaniesBulkImportStartResponse>(
      '/api/import/companies/bulk-import',
      {
        mode: options.mode,
        dryRun: options.dryRun,
        companies: options.companies,
      },
      { headers }
    );
  }

  startWithFile(options: {
    readonly file: File;
    readonly mode: CompaniesBulkImportMode;
    readonly dryRun: boolean;
    readonly idempotencyKey?: string | null;
  }): Observable<CompaniesBulkImportStartResponse> {
    const payload = new FormData();
    payload.append('file', options.file);
    payload.append('mode', options.mode);
    payload.append('dryRun', String(options.dryRun));
    const headers = options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : undefined;
    return this.http.post<CompaniesBulkImportStartResponse>('/api/import/companies/bulk-import', payload, { headers });
  }

  getStatus(jobId: string): Observable<CompaniesBulkImportStatusResponse> {
    return this.http.get<CompaniesBulkImportStatusResponse>(`/api/import/companies/jobs/${encodeURIComponent(jobId)}`);
  }

  cancel(jobId: string): Observable<CompaniesBulkImportCancelResponse> {
    return this.http.post<CompaniesBulkImportCancelResponse>(
      `/api/import/companies/jobs/${encodeURIComponent(jobId)}/cancel`,
      {}
    );
  }

  getReport(jobId: string): Observable<CompaniesBulkImportReportResponse> {
    return this.http.get<CompaniesBulkImportReportResponse>(`/api/import/companies/jobs/${encodeURIComponent(jobId)}/report`);
  }

  getErrors(jobId: string, format: 'json' | 'csv', limit = 100): Observable<CompaniesBulkImportErrorsResponse> {
    const params = new HttpParams().set('format', format).set('limit', String(limit));
    return this.http.get<CompaniesBulkImportErrorsResponse>(
      `/api/import/companies/jobs/${encodeURIComponent(jobId)}/errors`,
      { params }
    );
  }
}
