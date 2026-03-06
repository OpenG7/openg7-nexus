import { createReducer, on } from '@ngrx/store';

import {
  CompaniesBulkImportErrorEntry,
  CompaniesBulkImportReportResponse,
  CompaniesBulkImportStartResponse,
  CompaniesBulkImportStatusResponse,
} from '@app/import/data-access/companies-bulk-import.service';

import { CompanyImportBulkActions } from './company-import-bulk.actions';

export interface CompanyImportBulkState {
  readonly submitting: boolean;
  readonly cancelling: boolean;
  readonly streamConnected: boolean;
  readonly pollingEnabled: boolean;
  readonly start: CompaniesBulkImportStartResponse | null;
  readonly status: CompaniesBulkImportStatusResponse | null;
  readonly report: CompaniesBulkImportReportResponse | null;
  readonly errorsPreview: ReadonlyArray<CompaniesBulkImportErrorEntry>;
  readonly error: string | null;
}

export const initialCompanyImportBulkState: CompanyImportBulkState = {
  submitting: false,
  cancelling: false,
  streamConnected: false,
  pollingEnabled: false,
  start: null,
  status: null,
  report: null,
  errorsPreview: [],
  error: null,
};

export const companyImportBulkReducer = createReducer(
  initialCompanyImportBulkState,
  on(CompanyImportBulkActions.startRequested, (state) => ({
    ...state,
    submitting: true,
    cancelling: false,
    start: null,
    status: null,
    report: null,
    errorsPreview: [],
    error: null,
  })),
  on(CompanyImportBulkActions.startSucceeded, (state, { response }) => ({
    ...state,
    submitting: false,
    start: response,
    error: null,
  })),
  on(CompanyImportBulkActions.startFailed, (state, { error }) => ({
    ...state,
    submitting: false,
    error,
  })),
  on(CompanyImportBulkActions.statusLoaded, (state, { status }) => ({
    ...state,
    status,
    error: null,
  })),
  on(CompanyImportBulkActions.statusFailed, (state, { error }) => ({
    ...state,
    error,
  })),
  on(CompanyImportBulkActions.reportLoaded, (state, { report }) => ({
    ...state,
    report,
  })),
  on(CompanyImportBulkActions.errorsPreviewLoaded, (state, { errors }) => ({
    ...state,
    errorsPreview: errors,
  })),
  on(CompanyImportBulkActions.cancelRequested, (state) => ({
    ...state,
    cancelling: true,
  })),
  on(CompanyImportBulkActions.cancelSucceeded, (state) => ({
    ...state,
    cancelling: false,
  })),
  on(CompanyImportBulkActions.cancelFailed, (state, { error }) => ({
    ...state,
    cancelling: false,
    error,
  })),
  on(CompanyImportBulkActions.streamConnected, (state) => ({
    ...state,
    streamConnected: true,
  })),
  on(CompanyImportBulkActions.streamDisconnected, (state) => ({
    ...state,
    streamConnected: false,
  })),
  on(CompanyImportBulkActions.pollingEnabled, (state) => ({
    ...state,
    pollingEnabled: true,
  })),
  on(CompanyImportBulkActions.pollingDisabled, (state) => ({
    ...state,
    pollingEnabled: false,
  })),
  on(CompanyImportBulkActions.reset, () => ({ ...initialCompanyImportBulkState }))
);
