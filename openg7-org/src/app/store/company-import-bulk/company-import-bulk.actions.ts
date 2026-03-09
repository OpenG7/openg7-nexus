import {
  CompaniesBulkImportErrorEntry,
  CompaniesBulkImportReportResponse,
  CompaniesBulkImportStartResponse,
  CompaniesBulkImportStatusResponse,
} from '@app/import/data-access/companies-bulk-import.service';
import { createActionGroup, emptyProps, props } from '@ngrx/store';


export const CompanyImportBulkActions = createActionGroup({
  source: 'Company Import Bulk',
  events: {
    StartRequested: emptyProps(),
    StartSucceeded: props<{ response: CompaniesBulkImportStartResponse }>(),
    StartFailed: props<{ error: string }>(),
    StatusLoaded: props<{ status: CompaniesBulkImportStatusResponse }>(),
    StatusFailed: props<{ error: string }>(),
    ReportLoaded: props<{ report: CompaniesBulkImportReportResponse }>(),
    ErrorsPreviewLoaded: props<{ errors: ReadonlyArray<CompaniesBulkImportErrorEntry> }>(),
    CancelRequested: emptyProps(),
    CancelSucceeded: emptyProps(),
    CancelFailed: props<{ error: string }>(),
    StreamConnected: emptyProps(),
    StreamDisconnected: emptyProps(),
    PollingEnabled: emptyProps(),
    PollingDisabled: emptyProps(),
    Reset: emptyProps(),
  },
});
