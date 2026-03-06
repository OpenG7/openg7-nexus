# Import Companies (Async Bulk)

## Overview
This module provides asynchronous company import jobs with progress tracking and row-level errors.

- Start endpoint: `POST /api/import/companies/bulk-import`
- Job status endpoint: `GET /api/import/companies/jobs/:jobId`
- Cancel endpoint: `POST /api/import/companies/jobs/:jobId/cancel`
- Report endpoint: `GET /api/import/companies/jobs/:jobId/report`
- Errors endpoint: `GET /api/import/companies/jobs/:jobId/errors?format=json|csv`
- SSE endpoint: `GET /api/import/companies/jobs/:jobId/events`

Frontend page:
- `GET /import/companies/bulk-import` (Angular standalone page)

## API Contract

### 1) Start import job
`POST /api/import/companies/bulk-import`

Accepted inputs:
- JSON payload:
```json
{
  "mode": "upsert",
  "dryRun": false,
  "companies": [
    {
      "businessId": "BULK-001",
      "name": "Acme Inc",
      "sectors": ["Energy"],
      "location": { "lat": 45.5, "lng": -73.6, "province": "QC", "country": "Canada" },
      "contacts": { "website": "https://acme.example" }
    }
  ]
}
```
- Multipart form-data:
  - `file`: `.csv` or `.jsonl`
  - optional `mode`
  - optional `dryRun`

Headers/options:
- `Idempotency-Key`: optional, same key + same payload hash returns same `jobId`.
- `mode`: `validate-only` or `upsert` (body or headers).
- `dryRun`: boolean (body or headers). `validate-only` enforces `dryRun=true`.

Response (`202 Accepted`):
```json
{
  "jobId": "6d8f6b0a...",
  "statusUrl": "/api/import/companies/jobs/6d8f6b0a...",
  "eventsUrl": "/api/import/companies/jobs/6d8f6b0a.../events",
  "reportUrl": "/api/import/companies/jobs/6d8f6b0a.../report",
  "errorsUrl": "/api/import/companies/jobs/6d8f6b0a.../errors"
}
```

### 2) Job status
`GET /api/import/companies/jobs/:jobId`

Response:
```json
{
  "jobId": "...",
  "state": "queued|running|completed|failed|cancelled",
  "phase": "upload/store|parse|validate/normalize|dedupe|match|upsert|finalize",
  "mode": "validate-only|upsert",
  "dryRun": false,
  "progress": { "total": 1000, "processed": 750, "ok": 730, "failed": 20 },
  "counters": { "created": 500, "updated": 230, "skipped": 20, "warnings": 12 },
  "timestamps": {
    "createdAt": "...",
    "updatedAt": "...",
    "startedAt": "...",
    "completedAt": null,
    "cancelRequestedAt": null
  },
  "lastError": null
}
```

### 3) Cancel job
`POST /api/import/companies/jobs/:jobId/cancel`

Response (`202 Accepted`):
```json
{
  "jobId": "...",
  "cancelled": true,
  "state": "running|cancelled"
}
```

### 4) Report
`GET /api/import/companies/jobs/:jobId/report`

Returns summary + artifacts URLs (`errorsJsonUrl`, `errorsCsvUrl`).

### 5) Row errors
`GET /api/import/companies/jobs/:jobId/errors?format=json|csv&limit=2000`

- `json`: structured row-level errors
- `csv`: downloadable CSV

### 6) Server-Sent Events
`GET /api/import/companies/jobs/:jobId/events`

Emits progress/phase/error/terminal events for real-time UI updates.
Frontend falls back to polling if SSE is unavailable.

## Supported File Formats

### JSON array
Same structure as the JSON start payload (`companies: []`).

### JSONL
One JSON object per line with the same object shape as a company.

### CSV
Header-based mapping:
- `businessId`, `name`, `sectors`, `lat`, `lng`, `province`, `country`, `website`, `email`, `phone`, `contactName`
- `sectors` can be pipe/comma/semicolon separated (`Energy|Manufacturing`).

## Limits and Processing Notes
- JSON payload hard limit: `100000` rows.
- Chunk size: `500` rows.
- Worker phases:
  1. `upload/store`
  2. `parse`
  3. `validate/normalize`
  4. `dedupe`
  5. `match`
  6. `upsert`
  7. `finalize`
- Exactly-once-ish behavior:
  - Deterministic key uses `businessId` (unique company field).
  - Chunk retries won’t create duplicate records due upsert-by-key behavior.

## Security and Logging
- No row payload is logged as plain text.
- Job errors persist constrained row samples for diagnostics.
- Import endpoints require authenticated user permissions.

## Run Locally
1. Start Strapi:
```bash
yarn workspace @openg7/strapi dev
```
2. Start frontend:
```bash
yarn workspace @openg7/web start
```
3. Open:
`/import/companies/bulk-import`

## Test Commands

Backend:
```bash
yarn workspace @openg7/strapi test:unit:company-import-bulk
yarn workspace @openg7/strapi test:integration:company-import-bulk
```

Frontend:
```bash
yarn workspace @openg7/web ng test --watch=false --browsers=ChromeHeadless --include src/app/store/company-import-bulk/company-import-bulk.reducer.spec.ts
```
