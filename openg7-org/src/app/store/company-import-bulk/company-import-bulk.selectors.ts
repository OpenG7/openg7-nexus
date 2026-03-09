import { createFeatureSelector, createSelector } from '@ngrx/store';

import { CompanyImportBulkState } from './company-import-bulk.reducer';

export const selectCompanyImportBulkState =
  createFeatureSelector<CompanyImportBulkState>('companyImportBulk');

export const selectCompanyImportBulkSubmitting = createSelector(
  selectCompanyImportBulkState,
  (state) => state.submitting
);

export const selectCompanyImportBulkCancelling = createSelector(
  selectCompanyImportBulkState,
  (state) => state.cancelling
);

export const selectCompanyImportBulkStart = createSelector(
  selectCompanyImportBulkState,
  (state) => state.start
);

export const selectCompanyImportBulkStatus = createSelector(
  selectCompanyImportBulkState,
  (state) => state.status
);

export const selectCompanyImportBulkReport = createSelector(
  selectCompanyImportBulkState,
  (state) => state.report
);

export const selectCompanyImportBulkErrorsPreview = createSelector(
  selectCompanyImportBulkState,
  (state) => state.errorsPreview
);

export const selectCompanyImportBulkError = createSelector(
  selectCompanyImportBulkState,
  (state) => state.error
);

export const selectCompanyImportBulkStreamConnected = createSelector(
  selectCompanyImportBulkState,
  (state) => state.streamConnected
);

export const selectCompanyImportBulkPollingEnabled = createSelector(
  selectCompanyImportBulkState,
  (state) => state.pollingEnabled
);
