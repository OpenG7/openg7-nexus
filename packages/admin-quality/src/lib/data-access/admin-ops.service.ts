import { AdminAiProvider } from './admin-ai-providers';

export type AdminOpsCodexScope =
  | 'openg7-org'
  | 'strapi'
  | 'packages-contracts'
  | 'packages-tooling'
  | 'repository-root';

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
