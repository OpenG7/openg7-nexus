import { CompanyImportBulkActions } from './company-import-bulk.actions';
import { companyImportBulkReducer, initialCompanyImportBulkState } from './company-import-bulk.reducer';

describe('companyImportBulkReducer', () => {
  it('marks submission lifecycle and stores start response', () => {
    const requested = companyImportBulkReducer(
      initialCompanyImportBulkState,
      CompanyImportBulkActions.startRequested()
    );
    expect(requested.submitting).toBeTrue();

    const started = companyImportBulkReducer(
      requested,
      CompanyImportBulkActions.startSucceeded({
        response: {
          jobId: 'job-1',
          statusUrl: '/status',
          eventsUrl: '/events',
          reportUrl: '/report',
          errorsUrl: '/errors',
        },
      })
    );
    expect(started.submitting).toBeFalse();
    expect(started.start?.jobId).toBe('job-1');
  });

  it('updates status, report and error preview', () => {
    const withStatus = companyImportBulkReducer(
      initialCompanyImportBulkState,
      CompanyImportBulkActions.statusLoaded({
        status: {
          jobId: 'job-2',
          state: 'running',
          phase: 'upsert',
          mode: 'upsert',
          dryRun: false,
          progress: { total: 10, processed: 5, ok: 5, failed: 0 },
          counters: { created: 3, updated: 2, skipped: 0, warnings: 1 },
          timestamps: {
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:10.000Z',
            startedAt: '2026-01-01T00:00:01.000Z',
            completedAt: null,
            cancelRequestedAt: null,
          },
          lastError: null,
        },
      })
    );
    expect(withStatus.status?.progress.processed).toBe(5);

    const withReport = companyImportBulkReducer(
      withStatus,
      CompanyImportBulkActions.reportLoaded({
        report: {
          jobId: 'job-2',
          state: 'completed',
          phase: 'finalize',
          report: {
            summary: {
              received: 10,
              processed: 10,
              ok: 10,
              failed: 0,
              created: 6,
              updated: 4,
              skipped: 0,
              warnings: 1,
            },
          },
          artifacts: {
            errorsJsonUrl: '/errors?format=json',
            errorsCsvUrl: '/errors?format=csv',
          },
        },
      })
    );
    expect(withReport.report?.state).toBe('completed');

    const withErrors = companyImportBulkReducer(
      withReport,
      CompanyImportBulkActions.errorsPreviewLoaded({
        errors: [
          {
            id: 1,
            rowNumber: 2,
            field: 'businessId',
            code: 'DUPLICATE_IN_INPUT',
            message: 'Duplicate businessId in payload.',
            rawSample: null,
            createdAt: '2026-01-01T00:00:02.000Z',
          },
        ],
      })
    );
    expect(withErrors.errorsPreview.length).toBe(1);
  });
});
