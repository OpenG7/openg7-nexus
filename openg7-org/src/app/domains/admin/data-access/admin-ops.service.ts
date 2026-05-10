import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { STRAPI_ROUTES } from '@app/core/api/strapi.routes';
import { SUPPRESS_ERROR_TOAST } from '@app/core/http/error.interceptor.tokens';
import { HttpClientService } from '@app/core/http/http-client.service';
import { AdminAiProvider } from '@openg7/admin-ai/admin-ai-providers';
import { forkJoin, map, Observable } from 'rxjs';

export type AdminOpsCodexScope =
  | 'openg7-org'
  | 'strapi'
  | 'packages-contracts'
  | 'packages-tooling'
  | 'repository-root';

export interface AdminOpsHealthSnapshot {
  generatedAt: string;
  status: 'ok' | 'degraded';
  runtime: {
    env: string;
    nodeVersion: string;
    uptimeSeconds: number;
  };
  memory: {
    rssBytes: number;
    heapUsedBytes: number;
    heapTotalBytes: number;
  };
  database: {
    status: 'ok' | 'degraded';
    users: number;
    companies: number;
    feedItems: number;
  };
}

export interface AdminOpsBackupFile {
  name: string;
  sizeBytes: number;
  modifiedAt: string;
}

export interface AdminOpsBackupsSnapshot {
  generatedAt: string;
  status: 'ok' | 'warning' | 'disabled';
  enabled: boolean;
  directory: string;
  retentionDays: number;
  schedule: string | null;
  totalFiles: number;
  totalSizeBytes: number;
  lastBackupAt: string | null;
  files: AdminOpsBackupFile[];
}

export interface AdminOpsImportsSnapshot {
  generatedAt: string;
  totalCompanies: number;
  scannedCompanies: number;
  truncated: boolean;
  importedCompanies: number;
  importsLast24h: number;
  lastImportAt: string | null;
  sources: Array<{
    source: string;
    count: number;
  }>;
  recent: Array<{
    id: string;
    businessId: string | null;
    name: string;
    status: string;
    source: string | null;
    importedAt: string | null;
    updatedAt: string | null;
  }>;
}

export interface AdminOpsSecuritySnapshot {
  generatedAt: string;
  users: {
    total: number;
    blocked: number;
    registrationsLast7d: number;
  };
  sessions: {
    scannedUsers: number;
    truncated: boolean;
    active: number;
    revoked: number;
    usersWithActiveSessions: number;
  };
  uploads: {
    safetyEnabled: boolean;
    maxFileSizeBytes: number;
    allowedMimeTypes: string[];
  };
  auth: {
    sessionIdleTimeoutMs: number | null;
  };
  aiKeys: Array<{
    provider: AdminAiProvider;
    label: string;
    workflow: string;
    secretName: string | null;
    dispatchEnabled: boolean;
    keyInserted: boolean;
    state: 'ready' | 'offline' | 'scan-unavailable' | 'unsupported';
    note: string;
  }>;
  controlPlaneKeys: Array<{
    id: 'matrix-ingest-strapi' | 'matrix-ingest-url' | 'matrix-ingest-token';
    label: string;
    secretName: string;
    channel: 'strapi-env' | 'github-actions';
    target: string;
    keyInserted: boolean;
    state: 'ready' | 'offline' | 'scan-unavailable';
    note: string;
  }>;
  moderation: {
    pendingCompanies: number;
    suspendedCompanies: number;
  };
}

export interface AdminOpsAiProofArtifact {
  id: number | null;
  name: string;
  sizeBytes: number;
  expired: boolean;
  url: string | null;
}

export interface AdminOpsAiProofPullRequest {
  number: number | null;
  title: string;
  url: string | null;
  state: string;
  merged: boolean;
  mergedAt: string | null;
  branch: string | null;
}

export interface AdminOpsAiProofRun {
  id: number | null;
  number: number | null;
  url: string | null;
  status: string | null;
  conclusion: string | null;
  branch: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminOpsAiProofProviderSnapshot {
  provider: AdminAiProvider;
  label: string;
  workflow: string;
  state: 'queued' | 'in-progress' | 'completed' | 'failed' | 'unavailable';
  summary: string;
  run: AdminOpsAiProofRun | null;
  artifacts: AdminOpsAiProofArtifact[];
  pullRequest: AdminOpsAiProofPullRequest | null;
}

export interface AdminOpsAiProofSnapshot {
  generatedAt: string;
  providers: AdminOpsAiProofProviderSnapshot[];
}

export interface AdminOpsSnapshot {
  health: AdminOpsHealthSnapshot;
  backups: AdminOpsBackupsSnapshot;
  imports: AdminOpsImportsSnapshot;
  security: AdminOpsSecuritySnapshot;
}

export interface AdminOpsCodexDispatchRequest {
  provider: AdminAiProvider;
  task: string;
  scope: AdminOpsCodexScope;
  baseBranch: string;
  draftPr: boolean;
  model: string | null;
  effort: string | null;
}

export interface AdminOpsCodexDispatchResponse {
  queued: boolean;
  provider: 'github-actions';
  selectedProvider: AdminAiProvider;
  owner: string;
  repo: string;
  workflow: string;
  ref: string;
  requestedAt: string;
  request: {
    selectedProvider: AdminAiProvider;
    scope: AdminOpsCodexScope;
    baseBranch: string;
    draftPr: boolean;
    model: string | null;
    effort: string | null;
    taskLength: number;
  };
}

interface StrapiDataResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class AdminOpsService {
  private readonly http = inject(HttpClientService);

  getHealth(): Observable<AdminOpsHealthSnapshot> {
    return this.http
      .get<StrapiDataResponse<AdminOpsHealthSnapshot>>(STRAPI_ROUTES.admin.opsHealth)
      .pipe(map((response) => response.data));
  }

  getBackups(): Observable<AdminOpsBackupsSnapshot> {
    return this.http
      .get<StrapiDataResponse<AdminOpsBackupsSnapshot>>(STRAPI_ROUTES.admin.opsBackups)
      .pipe(map((response) => response.data));
  }

  getImports(): Observable<AdminOpsImportsSnapshot> {
    return this.http
      .get<StrapiDataResponse<AdminOpsImportsSnapshot>>(STRAPI_ROUTES.admin.opsImports)
      .pipe(map((response) => response.data));
  }

  getSecurity(): Observable<AdminOpsSecuritySnapshot> {
    return this.http
      .get<StrapiDataResponse<AdminOpsSecuritySnapshot>>(STRAPI_ROUTES.admin.opsSecurity)
      .pipe(map((response) => response.data));
  }

  getAiProofs(): Observable<AdminOpsAiProofSnapshot> {
    return this.http
      .get<StrapiDataResponse<AdminOpsAiProofSnapshot>>(STRAPI_ROUTES.admin.opsAiProofs)
      .pipe(map((response) => response.data));
  }

  dispatchCodexWorkflow(
    payload: AdminOpsCodexDispatchRequest,
  ): Observable<AdminOpsCodexDispatchResponse> {
    return this.http
      .post<StrapiDataResponse<AdminOpsCodexDispatchResponse>>(
        STRAPI_ROUTES.admin.opsAiDispatch,
        payload,
        {
          context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
        },
      )
      .pipe(map((response) => response.data));
  }

  getSnapshot(): Observable<AdminOpsSnapshot> {
    return forkJoin({
      health: this.getHealth(),
      backups: this.getBackups(),
      imports: this.getImports(),
      security: this.getSecurity(),
    });
  }
}
