import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';

import {
  registerCompanyImportBulkStreamClient,
  unregisterCompanyImportBulkStreamClient,
} from '../services/company-import-bulk-events';
import {
  cancelCompanyImportBulkJob,
  enqueueCompanyImportBulkJob,
  extractCompaniesArray,
  extractUploadedFile,
  getCompanyImportBulkErrors,
  getCompanyImportBulkJobStatus,
  getCompanyImportBulkReport,
  parseBulkImportHeadersAndOptions,
} from '../services/company-import-bulk-jobs';

function normalizeUserId(ctx: Context): string | null {
  const currentUser = (ctx.state as Record<string, unknown> | undefined)?.user as
    | { id?: number | string }
    | undefined;
  if (!currentUser?.id) {
    return null;
  }
  return String(currentUser.id);
}

function buildJobUrls(jobId: string) {
  const base = `/api/import/companies/jobs/${jobId}`;
  return {
    statusUrl: base,
    eventsUrl: `${base}/events`,
    reportUrl: `${base}/report`,
    errorsUrl: `${base}/errors`,
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async start(ctx: Context) {
    const userId = normalizeUserId(ctx);
    if (!userId) {
      return ctx.unauthorized();
    }

    const options = parseBulkImportHeadersAndOptions({
      body: ctx.request.body,
      headers: (ctx.request.header ?? {}) as Record<string, unknown>,
    });

    let companies: unknown[] | null = null;
    const uploadedFile = extractUploadedFile((ctx.request as any).files);
    try {
      companies = extractCompaniesArray(ctx.request.body);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid JSON payload.';
      return ctx.badRequest(message);
    }

    if (!companies && !uploadedFile) {
      return ctx.badRequest('Either multipart file or companies JSON payload is required.');
    }

    try {
      const queued = await enqueueCompanyImportBulkJob(strapi, {
        userId,
        mode: options.mode,
        dryRun: options.dryRun,
        idempotencyKey: options.idempotencyKey,
        companies,
        uploadedFile,
      });
      ctx.status = 202;
      ctx.body = {
        jobId: queued.jobId,
        ...buildJobUrls(queued.jobId),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to create bulk import job.';
      return ctx.badRequest(message);
    }
  },

  async status(ctx: Context) {
    const userId = normalizeUserId(ctx);
    if (!userId) {
      return ctx.unauthorized();
    }
    const jobId = String(ctx.params.jobId ?? '').trim();
    if (!jobId) {
      return ctx.badRequest('jobId is required.');
    }
    const status = await getCompanyImportBulkJobStatus(strapi, userId, jobId);
    if (!status) {
      return ctx.notFound('Bulk import job not found.');
    }
    ctx.body = status;
  },

  async cancel(ctx: Context) {
    const userId = normalizeUserId(ctx);
    if (!userId) {
      return ctx.unauthorized();
    }
    const jobId = String(ctx.params.jobId ?? '').trim();
    if (!jobId) {
      return ctx.badRequest('jobId is required.');
    }
    const result = await cancelCompanyImportBulkJob(strapi, userId, jobId);
    if (result.state == null) {
      return ctx.notFound('Bulk import job not found.');
    }
    ctx.status = 202;
    ctx.body = {
      jobId,
      cancelled: result.cancelled,
      state: result.state,
    };
  },

  async report(ctx: Context) {
    const userId = normalizeUserId(ctx);
    if (!userId) {
      return ctx.unauthorized();
    }
    const jobId = String(ctx.params.jobId ?? '').trim();
    if (!jobId) {
      return ctx.badRequest('jobId is required.');
    }
    const report = await getCompanyImportBulkReport(strapi, userId, jobId);
    if (!report) {
      return ctx.notFound('Bulk import job not found.');
    }
    ctx.body = report;
  },

  async errors(ctx: Context) {
    const userId = normalizeUserId(ctx);
    if (!userId) {
      return ctx.unauthorized();
    }
    const jobId = String(ctx.params.jobId ?? '').trim();
    if (!jobId) {
      return ctx.badRequest('jobId is required.');
    }
    const formatRaw = String((ctx.query.format ?? 'json') as string).toLowerCase();
    const format = formatRaw === 'csv' ? 'csv' : 'json';
    const limit = Number(String(ctx.query.limit ?? '2000'));
    const payload = await getCompanyImportBulkErrors(
      strapi,
      userId,
      jobId,
      format,
      Number.isFinite(limit) ? limit : 2000
    );
    if (!payload) {
      return ctx.notFound('Bulk import job not found.');
    }
    if (format === 'csv') {
      ctx.set('Content-Type', 'text/csv; charset=utf-8');
      ctx.body = payload.csv ?? '';
      return;
    }
    ctx.body = payload.json ?? { jobId, data: [] };
  },

  async events(ctx: Context) {
    const userId = normalizeUserId(ctx);
    if (!userId) {
      return ctx.unauthorized();
    }
    const jobId = String(ctx.params.jobId ?? '').trim();
    if (!jobId) {
      return ctx.badRequest('jobId is required.');
    }
    const status = await getCompanyImportBulkJobStatus(strapi, userId, jobId);
    if (!status) {
      return ctx.notFound('Bulk import job not found.');
    }

    const response = ctx.res as {
      statusCode: number;
      setHeader: (name: string, value: string) => void;
      flushHeaders?: () => void;
      write: (chunk: string) => void;
    };

    response.statusCode = 200;
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders?.();
    ctx.respond = false;

    const clientId = registerCompanyImportBulkStreamClient(response as any, userId, jobId);
    response.write(
      `id: bulk-import-status-${jobId}-${Date.now()}\ndata: ${JSON.stringify({
        type: 'bulk-import.progress',
        jobId,
        payload: status,
      })}\n\n`
    );

    const request = ctx.req as {
      on: (event: string, listener: () => void) => void;
      setTimeout?: (timeout: number) => void;
    };
    const cleanup = () => unregisterCompanyImportBulkStreamClient(clientId);
    request.setTimeout?.(0);
    request.on('close', cleanup);
    request.on('end', cleanup);
    request.on('error', cleanup);
  },
});
