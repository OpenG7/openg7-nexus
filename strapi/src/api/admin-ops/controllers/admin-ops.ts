import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';

const USER_UID = 'plugin::users-permissions.user' as any;
const COMPANY_UID = 'api::company.company' as any;
const FEED_UID = 'api::feed.feed' as any;
const ADMIN_OPS_AUDIT_LOG_UID = 'api::admin-ops-audit-log.admin-ops-audit-log' as any;
const SESSION_STORE_PLUGIN = 'openg7-auth-sessions';
const SESSION_KEY_PREFIX = 'user';
const DEFAULT_BACKUP_RETENTION_DAYS = 30;
const DEFAULT_BACKUP_MAX_FILES = 25;
const DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_UPLOAD_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_IMPORT_SCAN_LIMIT = 2000;
const DEFAULT_AUDIT_LOG_LIMIT = 50;
const DEFAULT_SECURITY_SESSION_SCAN_LIMIT = 250;
const DEFAULT_SESSION_IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000;
const DEFAULT_AI_GITHUB_API_URL = 'https://api.github.com';
const DEFAULT_AI_GITHUB_REF = 'main';
const DEFAULT_AI_TIMEOUT_MS = 10_000;
const DEFAULT_AI_ALLOWED_SCOPES = [
  'openg7-org',
  'strapi',
  'packages-contracts',
  'packages-tooling',
  'repository-root',
] as const;
const DEFAULT_AI_ALLOWED_BASE_BRANCHES = ['main'] as const;
const ADMIN_AI_PROVIDERS = ['codex', 'copilot', 'claude', 'gemini'] as const;

type AdminAiProvider = (typeof ADMIN_AI_PROVIDERS)[number];

const DEFAULT_AI_PROVIDER_WORKFLOWS: Readonly<Record<AdminAiProvider, string>> = {
  codex: 'codex-pr.yml',
  copilot: 'copilot-pr.yml',
  claude: 'claude-pr.yml',
  gemini: 'gemini-pr.yml',
};

const ADMIN_AI_PROVIDER_SECRET_NAMES: Readonly<Record<AdminAiProvider, string | null>> = {
  codex: 'OPENAI_API_KEY',
  copilot: null,
  claude: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

const ADMIN_AI_PROVIDER_LABELS: Readonly<Record<AdminAiProvider, string>> = {
  codex: 'Codex',
  copilot: 'GitHub Copilot',
  claude: 'Claude',
  gemini: 'Gemini',
};

type AiIgnitionState = 'ready' | 'offline' | 'scan-unavailable' | 'unsupported';
type AiProofState = 'queued' | 'in-progress' | 'completed' | 'failed' | 'unavailable';
type ControlPlaneKeyState = 'ready' | 'offline' | 'scan-unavailable';

interface BackupFileEntry {
  readonly name: string;
  readonly sizeBytes: number;
  readonly modifiedAt: string;
}

interface SessionStateLike {
  readonly sessions?: unknown;
}

interface SessionEntryLike {
  readonly revokedAt?: unknown;
}

interface ImportedCompanyLike {
  readonly id?: number | string;
  readonly name?: unknown;
  readonly businessId?: unknown;
  readonly status?: unknown;
  readonly importMetadata?: unknown;
  readonly updatedAt?: unknown;
}

interface AdminOpsUserLike {
  readonly id?: number | string;
  readonly email?: unknown;
  readonly username?: unknown;
  readonly blocked?: unknown;
  readonly createdAt?: unknown;
  readonly updatedAt?: unknown;
}

type AdminOpsAuditLogSeverity = 'ready' | 'warning' | 'offline';
type AdminOpsAuditLogCategory =
  | 'import'
  | 'security'
  | 'ai'
  | 'backup'
  | 'admin-quality'
  | 'governance';
type AdminOpsAuditLogEyebrow =
  | 'Import'
  | 'Security'
  | 'AI'
  | 'Backup'
  | 'Admin quality'
  | 'Governance';

const AUDIT_LOG_CATEGORIES = new Set<AdminOpsAuditLogCategory>([
  'import',
  'security',
  'ai',
  'backup',
  'admin-quality',
  'governance',
]);
const AUDIT_LOG_SEVERITIES = new Set<AdminOpsAuditLogSeverity>(['ready', 'warning', 'offline']);
const AUDIT_LOG_EYEBROWS = new Set<AdminOpsAuditLogEyebrow>([
  'Import',
  'Security',
  'AI',
  'Backup',
  'Admin quality',
  'Governance',
]);

interface AdminOpsAuditLogEntry {
  readonly id: string;
  readonly category: AdminOpsAuditLogCategory;
  readonly action: string;
  readonly eyebrow: AdminOpsAuditLogEyebrow;
  readonly title: string;
  readonly summary: string;
  readonly occurredAt: string;
  readonly sourceRoute: string;
  readonly severity: AdminOpsAuditLogSeverity;
  readonly actor: string;
  readonly target: string;
  readonly metadata: Record<string, string | number | boolean | null>;
}

interface AdminOpsAuditLogDraft extends Omit<AdminOpsAuditLogEntry, 'id'> {
  readonly eventId: string;
  readonly actorId?: string | null;
  readonly targetId?: string | null;
  readonly correlationId?: string | null;
  readonly idempotencyKey?: string | null;
  readonly ipHash?: string | null;
  readonly userAgentHash?: string | null;
  readonly schemaVersion?: number;
  readonly policyVersion?: string | null;
  readonly locale?: string | null;
  readonly timezone?: string | null;
  readonly retentionUntil?: string | null;
}

interface AdminOpsAuditLogEntity {
  readonly id?: number | string;
  readonly eventId?: unknown;
  readonly category?: unknown;
  readonly action?: unknown;
  readonly eyebrow?: unknown;
  readonly title?: unknown;
  readonly summary?: unknown;
  readonly occurredAt?: unknown;
  readonly sourceRoute?: unknown;
  readonly severity?: unknown;
  readonly actor?: unknown;
  readonly target?: unknown;
  readonly metadata?: unknown;
}

interface AdminOpsAuditLogQuery {
  readonly limit: number;
  readonly category: AdminOpsAuditLogCategory | null;
  readonly severity: AdminOpsAuditLogSeverity | null;
  readonly from: string | null;
  readonly to: string | null;
}

interface AiDispatchConfig {
  readonly selectedProvider: AdminAiProvider;
  readonly enabled: boolean;
  readonly configured: boolean;
  readonly apiUrl: string;
  readonly owner: string | null;
  readonly repo: string | null;
  readonly workflow: string;
  readonly ref: string;
  readonly token: string | null;
  readonly timeoutMs: number;
  readonly allowedScopes: string[];
  readonly allowedBaseBranches: string[];
}

interface AiDispatchInput {
  readonly provider: AdminAiProvider;
  readonly task: string;
  readonly scope: string;
  readonly baseBranch: string;
  readonly draftPr: boolean;
  readonly model: string | null;
  readonly effort: string | null;
  readonly correlationId: string | null;
  readonly idempotencyKey: string | null;
}

interface AiIgnitionModuleSnapshot {
  readonly provider: AdminAiProvider;
  readonly label: string;
  readonly workflow: string;
  readonly secretName: string | null;
  readonly dispatchEnabled: boolean;
  readonly keyInserted: boolean;
  readonly state: AiIgnitionState;
  readonly note: string;
}

interface ControlPlaneKeySnapshot {
  readonly id: 'matrix-ingest-strapi' | 'matrix-ingest-url' | 'matrix-ingest-token';
  readonly label: string;
  readonly secretName: string;
  readonly channel: 'strapi-env' | 'github-actions';
  readonly target: string;
  readonly keyInserted: boolean;
  readonly state: ControlPlaneKeyState;
  readonly note: string;
}

interface AiProofArtifactSnapshot {
  readonly id: number | null;
  readonly name: string;
  readonly sizeBytes: number;
  readonly expired: boolean;
  readonly url: string | null;
}

interface AiProofPullRequestSnapshot {
  readonly number: number | null;
  readonly title: string;
  readonly url: string | null;
  readonly state: string;
  readonly merged: boolean;
  readonly mergedAt: string | null;
  readonly branch: string | null;
}

interface AiProofRunSnapshot {
  readonly id: number | null;
  readonly number: number | null;
  readonly url: string | null;
  readonly displayTitle: string | null;
  readonly correlationId: string | null;
  readonly status: string | null;
  readonly conclusion: string | null;
  readonly branch: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

interface AiProofProviderSnapshot {
  readonly provider: AdminAiProvider;
  readonly label: string;
  readonly workflow: string;
  readonly state: AiProofState;
  readonly summary: string;
  readonly run: AiProofRunSnapshot | null;
  readonly artifacts: AiProofArtifactSnapshot[];
  readonly pullRequest: AiProofPullRequestSnapshot | null;
}

interface GitHubWorkflowRunListPayload {
  readonly workflow_runs?: Array<Record<string, unknown>>;
}

interface GitHubArtifactsListPayload {
  readonly artifacts?: Array<Record<string, unknown>>;
}

function normalizeString(value: unknown, maxLength = 320): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, maxLength);
}

function normalizeText(value: unknown, maxLength = 320): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, maxLength);
}

function normalizeWorkflowToken(value: unknown, maxLength = 160): string | null {
  const normalized = normalizeText(value, maxLength);
  if (!normalized) {
    return null;
  }
  if (!/^[A-Za-z0-9._/-]+$/.test(normalized)) {
    return null;
  }
  return normalized;
}

function normalizeAiProvider(value: unknown): AdminAiProvider | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return ADMIN_AI_PROVIDERS.includes(normalized as AdminAiProvider)
    ? (normalized as AdminAiProvider)
    : null;
}

function normalizeInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  const parsed = normalizeInteger(value);
  if (parsed == null || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return null;
}

function parseDelimitedLowerStrings(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }
  const unique = new Set<string>();
  const entries = value
    .split(/[\s,;]+/)
    .map((entry) => normalizeString(entry, 120))
    .filter((entry): entry is string => Boolean(entry));

  for (const entry of entries) {
    unique.add(entry);
  }

  return Array.from(unique);
}

function parseDelimitedWorkflowTokens(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }
  const unique = new Set<string>();
  const entries = value
    .split(/[\s,;]+/)
    .map((entry) => normalizeWorkflowToken(entry, 160))
    .filter((entry): entry is string => Boolean(entry));

  for (const entry of entries) {
    unique.add(entry);
  }

  return Array.from(unique);
}

function resolveNormalizedText(values: ReadonlyArray<unknown>, maxLength = 320): string | null {
  for (const value of values) {
    const normalized = normalizeText(value, maxLength);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

function resolveWorkflowTokenValue(values: ReadonlyArray<unknown>, maxLength = 160): string | null {
  for (const value of values) {
    const normalized = normalizeWorkflowToken(value, maxLength);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

function resolveBooleanValue(values: ReadonlyArray<unknown>): boolean | null {
  for (const value of values) {
    const normalized = normalizeBoolean(value);
    if (normalized != null) {
      return normalized;
    }
  }
  return null;
}

function resolvePositiveIntegerValue(values: ReadonlyArray<unknown>, fallback: number): number {
  for (const value of values) {
    const parsed = normalizeInteger(value);
    if (parsed != null && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
}

function resolveDelimitedLowerStrings(values: ReadonlyArray<unknown>): string[] {
  for (const value of values) {
    const parsed = parseDelimitedLowerStrings(value);
    if (parsed.length > 0) {
      return parsed;
    }
  }
  return [];
}

function resolveDelimitedWorkflowTokens(values: ReadonlyArray<unknown>): string[] {
  for (const value of values) {
    const parsed = parseDelimitedWorkflowTokens(value);
    if (parsed.length > 0) {
      return parsed;
    }
  }
  return [];
}

function aiProviderEnvKey(provider: AdminAiProvider, suffix: string): string {
  return `OPS_AI_${provider.toUpperCase()}_${suffix}`;
}

function resolveAiSecretsProbeConfig(): {
  apiUrl: string;
  owner: string;
  repo: string;
  token: string;
} | null {
  for (const provider of ADMIN_AI_PROVIDERS) {
    const config = getAiDispatchConfig(provider);
    if (config.token && config.owner && config.repo) {
      return {
        apiUrl: config.apiUrl,
        owner: config.owner,
        repo: config.repo,
        token: config.token,
      };
    }
  }

  return null;
}

async function fetchGitHubActionsSecretNames(): Promise<Set<string> | null> {
  const probe = resolveAiSecretsProbeConfig();
  if (!probe) {
    return null;
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), DEFAULT_AI_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${probe.apiUrl}/repos/${probe.owner}/${probe.repo}/actions/secrets?per_page=100`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${probe.token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'openg7-admin-ops',
        },
        signal: abortController.signal,
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { secrets?: Array<{ name?: unknown }> };
    const secretNames = new Set<string>();

    for (const secret of Array.isArray(payload.secrets) ? payload.secrets : []) {
      const normalized = normalizeWorkflowToken(secret?.name, 160);
      if (normalized) {
        secretNames.add(normalized);
      }
    }

    return secretNames;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function hasLocalAiProviderKey(secretName: string | null): boolean {
  if (!secretName) {
    return false;
  }

  return Boolean(normalizeText(process.env[secretName], 4000));
}

async function fetchGitHubJson<T>(config: AiDispatchConfig, endpoint: string): Promise<T | null> {
  if (!config.token || !config.owner || !config.repo) {
    return null;
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), config.timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${config.token}`,
        'User-Agent': 'openg7-admin-ops',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: abortController.signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeUrl(value: unknown): string | null {
  const normalized = normalizeText(value, 500);
  if (!normalized) {
    return null;
  }

  return /^https?:\/\//i.test(normalized) ? normalized : null;
}

function parseAiProofRun(value: unknown): AiProofRunSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const displayTitle = normalizeText(record.display_title ?? record.name, 240);
  const correlationId = extractCorrelationId(displayTitle);

  return {
    id: normalizeInteger(record.id),
    number: normalizeInteger(record.run_number),
    url: normalizeUrl(record.html_url),
    displayTitle,
    correlationId,
    status: normalizeText(record.status, 80),
    conclusion: normalizeText(record.conclusion, 80),
    branch: normalizeText(record.head_branch, 160),
    createdAt: normalizeIsoDate(record.created_at),
    updatedAt: normalizeIsoDate(record.updated_at),
  };
}

function extractCorrelationId(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/og7-[a-z0-9-]+/i);
  return match?.[0] ?? null;
}

async function fetchLatestWorkflowRun(
  config: AiDispatchConfig,
  correlationId?: string | null,
): Promise<AiProofRunSnapshot | null> {
  if (!config.owner || !config.repo) {
    return null;
  }

  const runsUrl = new URL(
    `${config.apiUrl}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/actions/workflows/${encodeURIComponent(config.workflow)}/runs`,
  );
  runsUrl.searchParams.set('per_page', correlationId ? '10' : '1');
  runsUrl.searchParams.set('branch', config.ref);
  runsUrl.searchParams.set('event', 'workflow_dispatch');

  const payload = await fetchGitHubJson<GitHubWorkflowRunListPayload>(config, runsUrl.toString());
  const runs = Array.isArray(payload?.workflow_runs) ? payload.workflow_runs : [];
  const run = correlationId
    ? runs.find((candidate) => {
        const parsed = parseAiProofRun(candidate);
        return parsed?.correlationId === correlationId;
      })
    : runs[0];
  return parseAiProofRun(run);
}

async function fetchWorkflowRunArtifacts(
  config: AiDispatchConfig,
  run: AiProofRunSnapshot,
): Promise<AiProofArtifactSnapshot[]> {
  if (!config.owner || !config.repo || run.id == null) {
    return [];
  }

  const artifactsUrl = `${config.apiUrl}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/actions/runs/${run.id}/artifacts`;
  const payload = await fetchGitHubJson<GitHubArtifactsListPayload>(config, artifactsUrl);

  return Array.isArray(payload?.artifacts)
    ? payload.artifacts.map((artifact) => {
        const artifactRecord = artifact as Record<string, unknown>;
        return {
          id: normalizeInteger(artifactRecord.id),
          name: normalizeText(artifactRecord.name, 180) ?? 'artifact',
          sizeBytes: Math.max(0, normalizeInteger(artifactRecord.size_in_bytes) ?? 0),
          expired: Boolean(artifactRecord.expired),
          url: run.url ? `${run.url}#artifacts` : null,
        };
      })
    : [];
}

async function fetchPullRequestForBranch(
  config: AiDispatchConfig,
  branch: string,
): Promise<AiProofPullRequestSnapshot | null> {
  if (!config.owner || !config.repo) {
    return null;
  }

  const pullsUrl = new URL(
    `${config.apiUrl}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/pulls`,
  );
  pullsUrl.searchParams.set('head', `${config.owner}:${branch}`);
  pullsUrl.searchParams.set('state', 'all');
  pullsUrl.searchParams.set('per_page', '5');

  const payload = await fetchGitHubJson<Array<Record<string, unknown>>>(
    config,
    pullsUrl.toString(),
  );
  const pull = Array.isArray(payload) ? payload[0] : null;
  if (!pull) {
    return null;
  }

  return {
    number: normalizeInteger(pull.number),
    title: normalizeText(pull.title, 200) ?? 'Pull request',
    url: normalizeUrl(pull.html_url),
    state: normalizeText(pull.state, 40) ?? 'unknown',
    merged: Boolean(pull.merged_at),
    mergedAt: normalizeIsoDate(pull.merged_at),
    branch,
  };
}

function resolveAiProofState(
  run: AiProofRunSnapshot | null,
  artifacts: readonly AiProofArtifactSnapshot[],
): AiProofState {
  if (!run?.status) {
    return 'unavailable';
  }

  if (run.status === 'queued' || run.status === 'waiting') {
    return 'queued';
  }

  if (run.status === 'in_progress' || run.status === 'requested' || run.status === 'pending') {
    return 'in-progress';
  }

  if (run.status === 'completed') {
    return run.conclusion === 'success' && artifacts.length >= 0 ? 'completed' : 'failed';
  }

  return 'unavailable';
}

function buildAiProofSummary(
  state: AiProofState,
  workflow: string,
  run: AiProofRunSnapshot | null,
  artifacts: readonly AiProofArtifactSnapshot[],
  pullRequest: AiProofPullRequestSnapshot | null,
): string {
  if (!run) {
    return `No workflow run detected yet for ${workflow}.`;
  }

  switch (state) {
    case 'queued':
      return `Workflow #${run.number ?? 'n/a'} is queued on ${run.branch ?? 'the last branch'}.`;
    case 'in-progress':
      return `Workflow #${run.number ?? 'n/a'} is executing on ${run.branch ?? 'the active branch'}.`;
    case 'completed':
      return `Workflow #${run.number ?? 'n/a'} completed with ${artifacts.length} artifact(s)${pullRequest ? ` and PR #${pullRequest.number ?? 'n/a'}` : ''}.`;
    case 'failed':
      return `Workflow #${run.number ?? 'n/a'} finished with conclusion ${run.conclusion ?? 'unknown'}.`;
    default:
      return `GitHub evidence is unavailable for ${workflow}.`;
  }
}

function normalizeAiProofQuery(rawQuery?: unknown): { correlationId: string | null } {
  const query = rawQuery && typeof rawQuery === 'object' ? (rawQuery as Record<string, unknown>) : {};
  return {
    correlationId: normalizeWorkflowToken(query.correlationId ?? query.correlation_id, 160),
  };
}

async function buildAiProofProviders(
  query: { correlationId: string | null },
): Promise<AiProofProviderSnapshot[]> {
  return Promise.all(
    ADMIN_AI_PROVIDERS.map(async (provider) => {
      const config = getAiDispatchConfig(provider);
      const baseSnapshot = {
        provider,
        label: ADMIN_AI_PROVIDER_LABELS[provider],
        workflow: config.workflow,
      } as const;

      if (!config.configured) {
        return {
          ...baseSnapshot,
          state: 'unavailable' as const,
          summary: 'GitHub workflow monitoring is not configured for this provider.',
          run: null,
          artifacts: [],
          pullRequest: null,
        };
      }

      try {
        const run = await fetchLatestWorkflowRun(config, query.correlationId);
        if (!run) {
          return {
            ...baseSnapshot,
            state: 'unavailable' as const,
            summary: `No workflow run detected yet for ${config.workflow}.`,
            run: null,
            artifacts: [],
            pullRequest: null,
          };
        }

        const [artifacts, pullRequest] = await Promise.all([
          fetchWorkflowRunArtifacts(config, run),
          run.branch ? fetchPullRequestForBranch(config, run.branch) : Promise.resolve(null),
        ]);
        const state = resolveAiProofState(run, artifacts);

        return {
          ...baseSnapshot,
          state,
          summary: buildAiProofSummary(state, config.workflow, run, artifacts, pullRequest),
          run,
          artifacts,
          pullRequest,
        };
      } catch {
        return {
          ...baseSnapshot,
          state: 'unavailable' as const,
          summary: `GitHub evidence is unavailable for ${config.workflow}.`,
          run: null,
          artifacts: [],
          pullRequest: null,
        };
      }
    }),
  );
}

async function buildAiProofSnapshot(rawQuery?: unknown) {
  const query = normalizeAiProofQuery(rawQuery);
  return {
    generatedAt: new Date().toISOString(),
    providers: await buildAiProofProviders(query),
  };
}

async function buildAiIgnitionModules(): Promise<AiIgnitionModuleSnapshot[]> {
  const repoSecretNames = await fetchGitHubActionsSecretNames();

  return ADMIN_AI_PROVIDERS.map((provider) => {
    const config = getAiDispatchConfig(provider);
    const secretName = ADMIN_AI_PROVIDER_SECRET_NAMES[provider];
    const repoKeyInserted = Boolean(secretName && repoSecretNames?.has(secretName));
    const localKeyInserted = hasLocalAiProviderKey(secretName);
    const keyInserted = repoKeyInserted || localKeyInserted;

    let state: AiIgnitionState;
    let note: string;

    if (!secretName) {
      state = 'unsupported';
      note = 'No stable ignition key is wired for this console yet.';
    } else if (repoKeyInserted) {
      state = 'ready';
      note = config.enabled
        ? 'Key detected in GitHub Actions secrets. The engine bay is armed and ready for dispatch.'
        : 'Key detected in GitHub Actions secrets. The engine bay stays in standby until dispatch is enabled.';
    } else if (localKeyInserted) {
      state = config.enabled ? 'offline' : 'ready';
      note = config.enabled
        ? `Local ${secretName} detected in Strapi env for development, but GitHub dispatch still requires the repository secret ${secretName}.`
        : `Local ${secretName} detected in Strapi env for development. Enable dispatch and add the repository secret ${secretName} to arm the GitHub workflow.`;
    } else if (repoSecretNames == null) {
      state = 'scan-unavailable';
      note = `The control plane could not verify GitHub Actions secrets for this module. For local development, you can still set ${secretName} in strapi/.env.`;
    } else {
      state = 'offline';
      note = `Insert ${secretName} into GitHub Actions secrets to power this module. For local development, you can also set ${secretName} in strapi/.env.`;
    }

    return {
      provider,
      label: ADMIN_AI_PROVIDER_LABELS[provider],
      workflow: config.workflow,
      secretName,
      dispatchEnabled: config.enabled,
      keyInserted,
      state,
      note,
    };
  });
}

async function buildControlPlaneKeys(): Promise<ControlPlaneKeySnapshot[]> {
  const repoSecretNames = await fetchGitHubActionsSecretNames();
  const repoSecretScanUnavailable = repoSecretNames == null;
  const strapiMatrixTokenInserted = Boolean(process.env.STRAPI_ADMIN_QUALITY_INGEST_TOKEN?.trim());
  const githubMatrixUrlInserted = Boolean(repoSecretNames?.has('ADMIN_QUALITY_MATRIX_INGEST_URL'));
  const githubMatrixTokenInserted = Boolean(
    repoSecretNames?.has('ADMIN_QUALITY_MATRIX_INGEST_TOKEN'),
  );

  return [
    {
      id: 'matrix-ingest-strapi',
      label: 'Matrix ingest token',
      secretName: 'STRAPI_ADMIN_QUALITY_INGEST_TOKEN',
      channel: 'strapi-env',
      target: '/api/admin/quality/matrix/ingest',
      keyInserted: strapiMatrixTokenInserted,
      state: strapiMatrixTokenInserted ? 'ready' : 'offline',
      note: strapiMatrixTokenInserted
        ? 'Strapi can accept post-merge matrix signals on the ingest endpoint.'
        : 'Insert STRAPI_ADMIN_QUALITY_INGEST_TOKEN into the Strapi runtime before relying on merge ingestion.',
    },
    {
      id: 'matrix-ingest-url',
      label: 'Matrix ingest URL',
      secretName: 'ADMIN_QUALITY_MATRIX_INGEST_URL',
      channel: 'github-actions',
      target: '.github/workflows/admin-quality-matrix-sync.yml',
      keyInserted: githubMatrixUrlInserted,
      state: repoSecretScanUnavailable
        ? 'scan-unavailable'
        : githubMatrixUrlInserted
          ? 'ready'
          : 'offline',
      note: repoSecretScanUnavailable
        ? 'The control plane could not verify whether GitHub stores ADMIN_QUALITY_MATRIX_INGEST_URL.'
        : githubMatrixUrlInserted
          ? 'GitHub Actions can resolve the target ingest endpoint for matrix refresh publication.'
          : 'Insert ADMIN_QUALITY_MATRIX_INGEST_URL into GitHub Actions secrets to point the matrix sync workflow at Strapi.',
    },
    {
      id: 'matrix-ingest-token',
      label: 'Matrix ingest token',
      secretName: 'ADMIN_QUALITY_MATRIX_INGEST_TOKEN',
      channel: 'github-actions',
      target: '.github/workflows/admin-quality-matrix-sync.yml',
      keyInserted: githubMatrixTokenInserted,
      state: repoSecretScanUnavailable
        ? 'scan-unavailable'
        : githubMatrixTokenInserted
          ? 'ready'
          : 'offline',
      note: repoSecretScanUnavailable
        ? 'The control plane could not verify whether GitHub stores ADMIN_QUALITY_MATRIX_INGEST_TOKEN.'
        : githubMatrixTokenInserted
          ? 'GitHub Actions stores a bearer token for post-merge matrix publication. Equality with Strapi is still a runtime/operator concern.'
          : 'Insert ADMIN_QUALITY_MATRIX_INGEST_TOKEN into GitHub Actions secrets and keep it aligned with STRAPI_ADMIN_QUALITY_INGEST_TOKEN.',
    },
  ];
}

function normalizeIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function normalizeFindManyResult<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}

function normalizeMimeType(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function parseMimeTypeEnv(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }
  const unique = new Set<string>();
  const entries = value
    .split(/[\s,;]+/)
    .map((entry) => normalizeMimeType(entry))
    .filter((entry): entry is string => Boolean(entry));

  for (const entry of entries) {
    unique.add(entry);
  }
  return Array.from(unique);
}

function parseSessionIdleTimeoutMs(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return DEFAULT_SESSION_IDLE_TIMEOUT_MS;
  }
  const normalized = value.trim().toLowerCase();
  if (['0', 'off', 'none', 'false', 'disabled'].includes(normalized)) {
    return null;
  }
  const parsed = Number.parseInt(normalized, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_SESSION_IDLE_TIMEOUT_MS;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function respondHttpError(ctx: Context, status: number, name: string, message: string): void {
  ctx.status = status;
  ctx.body = {
    data: null,
    error: {
      status,
      name,
      message,
    },
  };
}

function getAiDispatchConfig(provider: AdminAiProvider): AiDispatchConfig {
  const isCodex = provider === 'codex';
  const allowedScopes = resolveDelimitedLowerStrings([
    process.env[aiProviderEnvKey(provider, 'ALLOWED_SCOPES')],
    process.env.OPS_AI_ALLOWED_SCOPES,
    isCodex ? process.env.OPS_CODEX_ALLOWED_SCOPES : null,
  ]);
  const allowedBaseBranches = resolveDelimitedWorkflowTokens([
    process.env[aiProviderEnvKey(provider, 'ALLOWED_BASE_BRANCHES')],
    process.env.OPS_AI_ALLOWED_BASE_BRANCHES,
    isCodex ? process.env.OPS_CODEX_ALLOWED_BASE_BRANCHES : null,
  ]);
  const token = resolveNormalizedText(
    [
      process.env[aiProviderEnvKey(provider, 'GITHUB_TOKEN')],
      process.env.OPS_AI_GITHUB_TOKEN,
      process.env.OPS_CODEX_GITHUB_TOKEN,
    ],
    500,
  );
  const owner = resolveWorkflowTokenValue(
    [
      process.env[aiProviderEnvKey(provider, 'GITHUB_OWNER')],
      process.env.OPS_AI_GITHUB_OWNER,
      process.env.OPS_CODEX_GITHUB_OWNER,
    ],
    120,
  );
  const repo = resolveWorkflowTokenValue(
    [
      process.env[aiProviderEnvKey(provider, 'GITHUB_REPO')],
      process.env.OPS_AI_GITHUB_REPO,
      process.env.OPS_CODEX_GITHUB_REPO,
    ],
    120,
  );
  const workflow =
    resolveWorkflowTokenValue(
      [
        process.env[aiProviderEnvKey(provider, 'GITHUB_WORKFLOW')],
        isCodex ? process.env.OPS_CODEX_GITHUB_WORKFLOW : null,
      ],
      160,
    ) ?? DEFAULT_AI_PROVIDER_WORKFLOWS[provider];
  const ref =
    resolveWorkflowTokenValue(
      [
        process.env[aiProviderEnvKey(provider, 'GITHUB_REF')],
        process.env.OPS_AI_GITHUB_REF,
        isCodex ? process.env.OPS_CODEX_GITHUB_REF : null,
      ],
      160,
    ) ?? DEFAULT_AI_GITHUB_REF;

  return {
    selectedProvider: provider,
    enabled:
      resolveBooleanValue([
        process.env[aiProviderEnvKey(provider, 'DISPATCH_ENABLED')],
        process.env.OPS_AI_DISPATCH_ENABLED,
        isCodex ? process.env.OPS_CODEX_DISPATCH_ENABLED : null,
      ]) ?? false,
    configured: Boolean(token && owner && repo && workflow),
    apiUrl:
      resolveNormalizedText(
        [
          process.env[aiProviderEnvKey(provider, 'GITHUB_API_URL')],
          process.env.OPS_AI_GITHUB_API_URL,
          process.env.OPS_CODEX_GITHUB_API_URL,
        ],
        500,
      )?.replace(/\/+$/, '') ?? DEFAULT_AI_GITHUB_API_URL,
    owner,
    repo,
    workflow,
    ref,
    token,
    timeoutMs: resolvePositiveIntegerValue(
      [
        process.env[aiProviderEnvKey(provider, 'TIMEOUT_MS')],
        process.env.OPS_AI_TIMEOUT_MS,
        process.env.OPS_CODEX_TIMEOUT_MS,
      ],
      DEFAULT_AI_TIMEOUT_MS,
    ),
    allowedScopes: allowedScopes.length > 0 ? allowedScopes : Array.from(DEFAULT_AI_ALLOWED_SCOPES),
    allowedBaseBranches:
      allowedBaseBranches.length > 0
        ? allowedBaseBranches
        : Array.from(DEFAULT_AI_ALLOWED_BASE_BRANCHES),
  };
}

function validateAiDispatchInput(
  body: unknown,
  config: AiDispatchConfig,
): { input: AiDispatchInput | null; error: string | null } {
  const record =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;

  if (!record) {
    return {
      input: null,
      error: 'owner.ops.ai.payload.invalid',
    };
  }

  const provider =
    record.provider == null ? config.selectedProvider : normalizeAiProvider(record.provider);
  if (!provider) {
    return {
      input: null,
      error: 'owner.ops.ai.provider.invalid',
    };
  }

  const task = normalizeText(record.task, 2_000);
  if (!task) {
    return {
      input: null,
      error: 'owner.ops.ai.task.required',
    };
  }

  const scope = normalizeString(record.scope, 80);
  if (!scope || !config.allowedScopes.includes(scope)) {
    return {
      input: null,
      error: 'owner.ops.ai.scope.invalid',
    };
  }

  const baseBranch = normalizeWorkflowToken(record.baseBranch ?? record.base_branch, 160);
  if (!baseBranch || !config.allowedBaseBranches.includes(baseBranch)) {
    return {
      input: null,
      error: 'owner.ops.ai.base_branch.invalid',
    };
  }

  return {
    input: {
      provider,
      task,
      scope,
      baseBranch,
      draftPr: parseBoolean(record.draftPr ?? record.draft_pr, true),
      model: normalizeText(record.model, 120),
      effort: normalizeText(record.effort, 80),
      correlationId: normalizeWorkflowToken(record.correlationId ?? record.correlation_id, 160),
      idempotencyKey: normalizeWorkflowToken(record.idempotencyKey ?? record.idempotency_key, 160),
    },
    error: null,
  };
}

async function dispatchAiWorkflow(
  config: AiDispatchConfig,
  input: AiDispatchInput,
): Promise<Record<string, unknown>> {
  if (!config.token || !config.owner || !config.repo) {
    throw new Error(`${config.selectedProvider} GitHub dispatch is not configured.`);
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), config.timeoutMs);
  const endpoint = `${config.apiUrl}/repos/${encodeURIComponent(
    config.owner,
  )}/${encodeURIComponent(config.repo)}/actions/workflows/${encodeURIComponent(
    config.workflow,
  )}/dispatches`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: abortController.signal,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'OpenG7-Strapi-AdminOps',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        ref: config.ref,
        inputs: {
          task: input.task,
          scope: input.scope,
          base_branch: input.baseBranch,
          draft_pr: input.draftPr ? 'true' : 'false',
          model: input.model ?? '',
          effort: input.effort ?? '',
          correlation_id: input.correlationId ?? '',
          idempotency_key: input.idempotencyKey ?? '',
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text || 'GitHub workflow dispatch failed'}`);
    }

    return {
      queued: true,
      provider: 'github-actions',
      selectedProvider: config.selectedProvider,
      owner: config.owner,
      repo: config.repo,
      workflow: config.workflow,
      ref: config.ref,
      requestedAt: new Date().toISOString(),
      request: {
        selectedProvider: input.provider,
        scope: input.scope,
        baseBranch: input.baseBranch,
        draftPr: input.draftPr,
        model: input.model,
        effort: input.effort,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
        taskLength: input.task.length,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function buildHealthSnapshot(strapi: Core.Strapi) {
  const now = new Date().toISOString();
  const memory = process.memoryUsage();
  let databaseStatus: 'ok' | 'degraded' = 'ok';
  let users = 0;
  let companies = 0;
  let feedItems = 0;

  try {
    const userQuery = strapi.db.query(USER_UID);
    const companyQuery = strapi.db.query(COMPANY_UID);
    const feedQuery = strapi.db.query(FEED_UID);
    [users, companies, feedItems] = await Promise.all([
      userQuery.count(),
      companyQuery.count(),
      feedQuery.count(),
    ]);
  } catch {
    databaseStatus = 'degraded';
  }

  return {
    generatedAt: now,
    status: databaseStatus === 'ok' ? 'ok' : 'degraded',
    runtime: {
      env: process.env.STRAPI_ENV || process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      uptimeSeconds: Math.round(process.uptime()),
    },
    memory: {
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
    },
    database: {
      status: databaseStatus,
      users,
      companies,
      feedItems,
    },
  };
}

async function listBackupFiles(backupDir: string, maxFiles: number): Promise<BackupFileEntry[]> {
  const entries = await (async () => {
    try {
      return await fs.readdir(backupDir, { encoding: 'utf8', withFileTypes: true });
    } catch (error: unknown) {
      const message = toErrorMessage(error).toLowerCase();
      if (message.includes('enoent')) {
        return [] as Awaited<ReturnType<typeof fs.readdir>>;
      }
      throw error;
    }
  })();

  if (!entries.length) {
    return [];
  }

  try {
    const files: BackupFileEntry[] = [];
    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }
      const filename = typeof entry.name === 'string' ? entry.name : entry.name.toString('utf8');
      const fullPath = path.join(backupDir, filename);
      try {
        const stats = await fs.stat(fullPath);
        if (!stats.isFile()) {
          continue;
        }
        files.push({
          name: filename,
          sizeBytes: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        });
      } catch {
        // Ignore unreadable file entries.
      }
    }
    files.sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt));
    return files.slice(0, maxFiles);
  } catch {
    return [];
  }
}

async function buildBackupsSnapshot(strapi: Core.Strapi) {
  const enabled = parseBoolean(process.env.OPS_BACKUP_ENABLED, true);
  const backupDir =
    normalizeString(process.env.OPS_BACKUP_DIR, 500) ?? path.join(strapi.dirs.app.root, 'backups');
  const retentionDays = parsePositiveInteger(
    process.env.OPS_BACKUP_RETENTION_DAYS,
    DEFAULT_BACKUP_RETENTION_DAYS,
  );
  const schedule = normalizeString(process.env.OPS_BACKUP_SCHEDULE, 120);
  const maxFiles = parsePositiveInteger(process.env.OPS_BACKUP_MAX_FILES, DEFAULT_BACKUP_MAX_FILES);
  const files = enabled ? await listBackupFiles(backupDir, maxFiles) : [];
  const totalSizeBytes = files.reduce((total, file) => total + file.sizeBytes, 0);
  const lastBackupAt = files.length > 0 ? files[0].modifiedAt : null;
  const status: 'ok' | 'warning' | 'disabled' = !enabled
    ? 'disabled'
    : files.length > 0
      ? 'ok'
      : 'warning';

  return {
    generatedAt: new Date().toISOString(),
    status,
    enabled,
    directory: backupDir,
    retentionDays,
    schedule,
    totalFiles: files.length,
    totalSizeBytes,
    lastBackupAt,
    files,
  };
}

function extractImportMetadata(value: unknown): {
  source: string | null;
  importedAt: string | null;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { source: null, importedAt: null };
  }
  const record = value as Record<string, unknown>;
  return {
    source: normalizeString(record.source, 120),
    importedAt: normalizeIsoDate(record.importedAt),
  };
}

async function buildImportsSnapshot(strapi: Core.Strapi) {
  const importScanLimit = parsePositiveInteger(
    process.env.OPS_IMPORT_SCAN_LIMIT,
    DEFAULT_IMPORT_SCAN_LIMIT,
  );
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  const companyQuery = strapi.db.query(COMPANY_UID);
  const totalCompanies = await companyQuery.count();
  const companies = normalizeFindManyResult(
    (await strapi.entityService.findMany(COMPANY_UID, {
      fields: ['id', 'name', 'businessId', 'status', 'importMetadata', 'updatedAt'],
      publicationState: 'preview',
      sort: ['updatedAt:desc', 'id:desc'],
      limit: importScanLimit,
    })) as ImportedCompanyLike[] | ImportedCompanyLike | null,
  );

  let importedCompanies = 0;
  let importsLast24h = 0;
  let lastImportAt: string | null = null;
  const sourceCounts = new Map<string, number>();
  const recent: Array<{
    id: string;
    businessId: string | null;
    name: string;
    status: string;
    source: string | null;
    importedAt: string | null;
    updatedAt: string | null;
  }> = [];

  for (const company of companies) {
    const metadata = extractImportMetadata(company.importMetadata);
    if (metadata.source) {
      sourceCounts.set(metadata.source, (sourceCounts.get(metadata.source) ?? 0) + 1);
    }
    if (metadata.source === 'province-upload') {
      importedCompanies += 1;
    }
    if (metadata.importedAt) {
      const importedAtMs = new Date(metadata.importedAt).getTime();
      if (Number.isFinite(importedAtMs) && importedAtMs >= dayAgo) {
        importsLast24h += 1;
      }
      if (!lastImportAt || metadata.importedAt.localeCompare(lastImportAt) > 0) {
        lastImportAt = metadata.importedAt;
      }
    }

    const updatedAt = normalizeIsoDate(company.updatedAt);
    if (!metadata.source && !metadata.importedAt) {
      continue;
    }

    recent.push({
      id: String(company.id ?? ''),
      businessId: normalizeString(company.businessId, 80),
      name: normalizeString(company.name, 180) ?? 'Unknown company',
      status: normalizeString(company.status, 40) ?? 'unknown',
      source: metadata.source,
      importedAt: metadata.importedAt,
      updatedAt,
    });
  }

  recent.sort((left, right) => {
    const leftDate = left.importedAt ?? left.updatedAt ?? '1970-01-01T00:00:00.000Z';
    const rightDate = right.importedAt ?? right.updatedAt ?? '1970-01-01T00:00:00.000Z';
    return rightDate.localeCompare(leftDate);
  });

  const sources = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((left, right) => right.count - left.count || left.source.localeCompare(right.source));

  return {
    generatedAt: new Date().toISOString(),
    totalCompanies,
    scannedCompanies: companies.length,
    truncated: companies.length >= importScanLimit && totalCompanies > companies.length,
    importedCompanies,
    importsLast24h,
    lastImportAt,
    sources,
    recent: recent.slice(0, 20),
  };
}

function auditSeverityFromImportStatus(status: string): AdminOpsAuditLogSeverity {
  const normalized = status.trim().toLowerCase();
  if (/(failed|error|rejected|blocked)/.test(normalized)) {
    return 'offline';
  }
  if (/(imported|complete|completed|approved|ok|success)/.test(normalized)) {
    return 'ready';
  }
  return 'warning';
}

function normalizeAuditLogCategory(value: unknown): AdminOpsAuditLogCategory | null {
  const normalized = normalizeString(value, 40);
  return normalized && AUDIT_LOG_CATEGORIES.has(normalized as AdminOpsAuditLogCategory)
    ? (normalized as AdminOpsAuditLogCategory)
    : null;
}

function normalizeAuditLogSeverity(value: unknown): AdminOpsAuditLogSeverity | null {
  const normalized = normalizeString(value, 40);
  return normalized && AUDIT_LOG_SEVERITIES.has(normalized as AdminOpsAuditLogSeverity)
    ? (normalized as AdminOpsAuditLogSeverity)
    : null;
}

function normalizeAuditLogEyebrow(value: unknown): AdminOpsAuditLogEyebrow | null {
  const normalized = normalizeString(value, 80);
  return normalized && AUDIT_LOG_EYEBROWS.has(normalized as AdminOpsAuditLogEyebrow)
    ? (normalized as AdminOpsAuditLogEyebrow)
    : null;
}

function firstQueryValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function normalizeAuditLogQuery(value: unknown): AdminOpsAuditLogQuery {
  const query = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const record = query as Record<string, unknown>;

  return {
    limit: Math.min(
      parsePositiveInteger(firstQueryValue(record.limit), DEFAULT_AUDIT_LOG_LIMIT),
      250,
    ),
    category: normalizeAuditLogCategory(firstQueryValue(record.category)),
    severity: normalizeAuditLogSeverity(firstQueryValue(record.severity)),
    from: normalizeIsoDate(firstQueryValue(record.from)),
    to: normalizeIsoDate(firstQueryValue(record.to)),
  };
}

function normalizeAuditMetadata(value: unknown): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const metadata: Record<string, string | number | boolean | null> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    if (entry == null) {
      metadata[key] = null;
      return;
    }
    if (typeof entry === 'string' || typeof entry === 'boolean') {
      metadata[key] = entry;
      return;
    }
    if (typeof entry === 'number') {
      metadata[key] = Number.isFinite(entry) ? entry : null;
    }
  });
  return metadata;
}

function buildAuditLogFilters(query: AdminOpsAuditLogQuery): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  if (query.category) {
    filters.category = query.category;
  }
  if (query.severity) {
    filters.severity = query.severity;
  }

  const occurredAt: Record<string, string> = {};
  if (query.from) {
    occurredAt.$gte = query.from;
  }
  if (query.to) {
    occurredAt.$lte = query.to;
  }
  if (Object.keys(occurredAt).length > 0) {
    filters.occurredAt = occurredAt;
  }

  return filters;
}

function toAuditLogEntry(
  value: AdminOpsAuditLogEntity | AdminOpsAuditLogDraft,
): AdminOpsAuditLogEntry {
  const fallbackId = 'id' in value ? value.id : null;
  const eventId = normalizeString(value.eventId, 180) ?? String(fallbackId ?? 'audit-unknown');

  return {
    id: eventId,
    category: normalizeAuditLogCategory(value.category) ?? 'security',
    action: normalizeString(value.action, 140) ?? 'admin.ops.audit.unknown',
    eyebrow: normalizeAuditLogEyebrow(value.eyebrow) ?? 'Security',
    title: normalizeString(value.title, 220) ?? 'Admin operation',
    summary: normalizeString(value.summary, 1_000) ?? 'No audit summary available.',
    occurredAt: normalizeIsoDate(value.occurredAt) ?? new Date().toISOString(),
    sourceRoute: normalizeString(value.sourceRoute, 240) ?? '/api/admin/ops/audit-log',
    severity: normalizeAuditLogSeverity(value.severity) ?? 'warning',
    actor: normalizeString(value.actor, 180) ?? 'system',
    target: normalizeString(value.target, 220) ?? 'admin-ops',
    metadata: normalizeAuditMetadata(value.metadata),
  };
}

async function appendAuditLogEvent(
  strapi: Core.Strapi,
  event: AdminOpsAuditLogDraft,
): Promise<boolean> {
  const eventId = normalizeString(event.eventId, 180);
  if (!eventId) {
    return false;
  }

  const existing = normalizeFindManyResult(
    (await strapi.entityService.findMany(ADMIN_OPS_AUDIT_LOG_UID, {
      fields: ['id'],
      filters: { eventId },
      limit: 1,
    })) as AdminOpsAuditLogEntity[] | AdminOpsAuditLogEntity | null,
  );

  if (existing.length > 0) {
    return false;
  }

  await strapi.entityService.create(ADMIN_OPS_AUDIT_LOG_UID, {
    data: {
      eventId,
      category: event.category,
      action: event.action,
      eyebrow: event.eyebrow,
      title: event.title,
      summary: event.summary,
      occurredAt: event.occurredAt,
      sourceRoute: event.sourceRoute,
      severity: event.severity,
      actor: event.actor,
      actorId: event.actorId ?? null,
      target: event.target,
      targetId: event.targetId ?? null,
      correlationId: event.correlationId ?? null,
      idempotencyKey: event.idempotencyKey ?? null,
      ipHash: event.ipHash ?? null,
      userAgentHash: event.userAgentHash ?? null,
      metadata: event.metadata,
      schemaVersion: event.schemaVersion ?? 1,
      policyVersion: event.policyVersion ?? null,
      locale: event.locale ?? null,
      timezone: event.timezone ?? null,
      retentionUntil: event.retentionUntil ?? null,
    } as any,
  });

  return true;
}

async function safeAppendAuditLogEvent(
  strapi: Core.Strapi,
  event: AdminOpsAuditLogDraft,
): Promise<void> {
  try {
    await appendAuditLogEvent(strapi, event);
  } catch (error: unknown) {
    strapi.log.warn(`[ops] Failed to append audit log event: ${toErrorMessage(error)}`);
  }
}

function hashAuditValue(value: unknown): string | null {
  const normalized = normalizeString(value, 1_000);
  if (!normalized) {
    return null;
  }
  return createHash('sha256').update(normalized).digest('hex');
}

function auditHeader(ctx: Context, name: string): string | null {
  const headers = (ctx.headers ?? {}) as Record<string, unknown>;
  return normalizeString(headers[name] ?? headers[name.toLowerCase()], 320);
}

function auditRequestHashes(ctx: Context): { ipHash: string | null; userAgentHash: string | null } {
  const forwardedFor = auditHeader(ctx, 'x-forwarded-for');
  const clientIp = forwardedFor?.split(',')[0]?.trim() || normalizeString(ctx.ip, 120);

  return {
    ipHash: hashAuditValue(clientIp),
    userAgentHash: hashAuditValue(auditHeader(ctx, 'user-agent')),
  };
}

function auditRequestCorrelation(ctx: Context): {
  correlationId: string | null;
  idempotencyKey: string | null;
} {
  return {
    correlationId: auditHeader(ctx, 'x-correlation-id') ?? auditHeader(ctx, 'correlation-id'),
    idempotencyKey: auditHeader(ctx, 'idempotency-key'),
  };
}

function auditUserContext(ctx: Context): { actor: string; actorId: string | null } {
  const user = ctx.state?.user as Record<string, unknown> | null | undefined;
  const userId = user?.id == null ? null : String(user.id);
  const email = normalizeString(user?.email, 180);
  const username = normalizeString(user?.username, 180);

  return {
    actor: email ?? username ?? (userId ? `user:${userId}` : 'authenticated-admin'),
    actorId: userId,
  };
}

function buildAiDispatchAuditEvent(
  ctx: Context,
  config: AiDispatchConfig,
  input: AiDispatchInput,
  response: Record<string, unknown>,
): AdminOpsAuditLogDraft {
  const { actor, actorId } = auditUserContext(ctx);
  const requestCorrelation = auditRequestCorrelation(ctx);
  const correlationId = input.correlationId ?? requestCorrelation.correlationId;
  const idempotencyKey = input.idempotencyKey ?? requestCorrelation.idempotencyKey;
  const { ipHash, userAgentHash } = auditRequestHashes(ctx);
  const eventEntropy = idempotencyKey
    ? `${config.selectedProvider}:${idempotencyKey}`
    : `${config.selectedProvider}:${randomUUID()}`;
  const eventHash = hashAuditValue(eventEntropy)?.slice(0, 24) ?? randomUUID();
  const requestedAt = normalizeIsoDate(response.requestedAt) ?? new Date().toISOString();

  return {
    eventId: `audit-ai-dispatch-${config.selectedProvider}-${eventHash}`,
    category: 'ai',
    action: 'admin.ops.ai.dispatch.queued',
    eyebrow: 'AI',
    title: `${ADMIN_AI_PROVIDER_LABELS[config.selectedProvider]} workflow dispatch queued`,
    summary: `${input.scope} -> ${config.workflow} on ${input.baseBranch}`,
    occurredAt: requestedAt,
    sourceRoute: '/api/admin/ops/ai/dispatch',
    severity: 'ready',
    actor,
    actorId,
    target: config.workflow,
    targetId: `${config.owner ?? 'unknown'}/${config.repo ?? 'unknown'}:${config.workflow}`,
    correlationId,
    idempotencyKey,
    ipHash,
    userAgentHash,
    metadata: {
      provider: config.selectedProvider,
      owner: config.owner,
      repo: config.repo,
      workflow: config.workflow,
      ref: config.ref,
      scope: input.scope,
      baseBranch: input.baseBranch,
      draftPr: input.draftPr,
      model: input.model,
      effort: input.effort,
      taskLength: input.task.length,
    },
  };
}

async function buildDerivedAuditLogEvents(
  strapi: Core.Strapi,
  generatedAt: string,
): Promise<{ events: AdminOpsAuditLogDraft[]; sourceTruncated: boolean }> {
  const auditLimit = parsePositiveInteger(process.env.OPS_AUDIT_LOG_LIMIT, DEFAULT_AUDIT_LOG_LIMIT);
  const events: AdminOpsAuditLogDraft[] = [];
  let sourceTruncated = false;

  const companies = normalizeFindManyResult(
    (await strapi.entityService.findMany(COMPANY_UID, {
      fields: ['id', 'name', 'businessId', 'status', 'importMetadata', 'updatedAt'],
      publicationState: 'preview',
      sort: ['updatedAt:desc', 'id:desc'],
      limit: auditLimit,
    })) as ImportedCompanyLike[] | ImportedCompanyLike | null,
  );
  sourceTruncated ||= companies.length >= auditLimit;

  for (const company of companies) {
    const metadata = extractImportMetadata(company.importMetadata);
    if (!metadata.source && !metadata.importedAt) {
      continue;
    }

    const companyId = String(company.id ?? 'unknown');
    const businessId = normalizeString(company.businessId, 80);
    const name = normalizeString(company.name, 180) ?? 'Unknown company';
    const status = normalizeString(company.status, 40) ?? 'unknown';
    const source = metadata.source ?? 'unknown source';
    const occurredAt = metadata.importedAt ?? normalizeIsoDate(company.updatedAt) ?? generatedAt;

    events.push({
      eventId: `audit-import-${companyId}`,
      category: 'import',
      action: 'company.import.recorded',
      eyebrow: 'Import',
      title: name,
      summary: `${businessId ?? 'no-business-id'} - ${source} - ${status}`,
      occurredAt,
      sourceRoute: '/api/admin/ops/imports',
      severity: auditSeverityFromImportStatus(status),
      actor: source,
      actorId: null,
      target: businessId ?? companyId,
      targetId: companyId,
      correlationId: null,
      idempotencyKey: null,
      ipHash: null,
      userAgentHash: null,
      metadata: {
        companyId,
        businessId,
        source,
        status,
        importedAt: metadata.importedAt,
        updatedAt: normalizeIsoDate(company.updatedAt),
      },
    });
  }

  const blockedUsers = normalizeFindManyResult(
    (await strapi.db.query(USER_UID).findMany({
      select: ['id', 'email', 'username', 'blocked', 'createdAt', 'updatedAt'],
      where: { blocked: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      limit: Math.min(auditLimit, 20),
    })) as AdminOpsUserLike[] | AdminOpsUserLike | null,
  );
  sourceTruncated ||= blockedUsers.length >= Math.min(auditLimit, 20);

  for (const user of blockedUsers) {
    const userId = String(user.id ?? 'unknown');
    const email = normalizeString(user.email, 180);
    const username = normalizeString(user.username, 180);
    const occurredAt =
      normalizeIsoDate(user.updatedAt) ?? normalizeIsoDate(user.createdAt) ?? generatedAt;

    events.push({
      eventId: `audit-security-blocked-user-${userId}`,
      category: 'security',
      action: 'security.user.blocked',
      eyebrow: 'Security',
      title: 'Blocked account present',
      summary: `${email ?? username ?? `User ${userId}`} is blocked in the latest user snapshot.`,
      occurredAt,
      sourceRoute: '/api/admin/ops/security',
      severity: 'warning',
      actor: 'security-policy',
      actorId: null,
      target: email ?? username ?? userId,
      targetId: userId,
      correlationId: null,
      idempotencyKey: null,
      ipHash: null,
      userAgentHash: null,
      metadata: {
        userId,
        email,
        username,
        blocked: Boolean(user.blocked),
      },
    });
  }

  const sessionScanLimit = parsePositiveInteger(
    process.env.OPS_SECURITY_SESSION_SCAN_LIMIT,
    DEFAULT_SECURITY_SESSION_SCAN_LIMIT,
  );
  const usersForSessionScan = normalizeFindManyResult(
    (await strapi.db.query(USER_UID).findMany({
      select: ['id'],
      orderBy: [{ updatedAt: 'desc' }],
      limit: sessionScanLimit,
    })) as Array<{ id?: number | string }> | { id?: number | string } | null,
  );
  sourceTruncated ||= usersForSessionScan.length >= sessionScanLimit;
  let revokedSessions = 0;

  for (const user of usersForSessionScan) {
    if (!user?.id) {
      continue;
    }
    try {
      const store = strapi.store({
        type: 'plugin',
        name: SESSION_STORE_PLUGIN,
        key: `${SESSION_KEY_PREFIX}:${String(user.id)}`,
      });
      const rawState = await store.get();
      revokedSessions += parseSessionState(rawState).revoked;
    } catch {
      // Ignore malformed session buckets and continue.
    }
  }

  if (revokedSessions > 0) {
    events.push({
      eventId: `audit-security-revoked-sessions-${generatedAt.slice(0, 10)}`,
      category: 'security',
      action: 'security.session.revocation.detected',
      eyebrow: 'Security',
      title: 'Session revocations observed',
      summary: `${revokedSessions} revoked sessions across ${usersForSessionScan.length} scanned users.`,
      occurredAt: generatedAt,
      sourceRoute: '/api/admin/ops/security',
      severity: 'warning',
      actor: 'session-store',
      actorId: null,
      target: 'user-sessions',
      targetId: 'user-sessions',
      correlationId: null,
      idempotencyKey: null,
      ipHash: null,
      userAgentHash: null,
      metadata: {
        revokedSessions,
        scannedUsers: usersForSessionScan.length,
        truncated: usersForSessionScan.length >= sessionScanLimit,
      },
    });
  }

  return { events, sourceTruncated };
}

async function syncDerivedAuditLogEvents(
  strapi: Core.Strapi,
  generatedAt: string,
): Promise<boolean> {
  const { events, sourceTruncated } = await buildDerivedAuditLogEvents(strapi, generatedAt);
  for (const event of events) {
    await appendAuditLogEvent(strapi, event);
  }
  return sourceTruncated;
}

async function buildAuditLogSnapshot(strapi: Core.Strapi, rawQuery?: unknown) {
  const generatedAt = new Date().toISOString();
  const query = normalizeAuditLogQuery(rawQuery);
  const sourceTruncated = await syncDerivedAuditLogEvents(strapi, generatedAt);
  const records = normalizeFindManyResult(
    (await strapi.entityService.findMany(ADMIN_OPS_AUDIT_LOG_UID, {
      filters: buildAuditLogFilters(query),
      sort: ['occurredAt:desc', 'id:desc'],
      limit: query.limit + 1,
    })) as AdminOpsAuditLogEntity[] | AdminOpsAuditLogEntity | null,
  );
  const entries = records.slice(0, query.limit).map((record) => toAuditLogEntry(record));

  return {
    generatedAt,
    source: 'admin-ops-audit-log' as const,
    truncated: sourceTruncated || records.length > query.limit,
    entries,
  };
}

function parseSessionState(value: unknown): { active: number; revoked: number } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { active: 0, revoked: 0 };
  }
  const state = value as SessionStateLike;
  const sessions = Array.isArray(state.sessions) ? state.sessions : [];
  let active = 0;
  let revoked = 0;
  for (const entry of sessions) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }
    const session = entry as SessionEntryLike;
    const revokedAt = normalizeIsoDate(session.revokedAt);
    if (revokedAt) {
      revoked += 1;
    } else {
      active += 1;
    }
  }
  return { active, revoked };
}

async function buildSecuritySnapshot(strapi: Core.Strapi) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const userQuery = strapi.db.query(USER_UID);
  const companyQuery = strapi.db.query(COMPANY_UID);
  const [totalUsers, blockedUsers, registrationsLast7d, pendingCompanies, suspendedCompanies] =
    await Promise.all([
      userQuery.count(),
      userQuery.count({
        where: { blocked: true },
      }),
      userQuery.count({
        where: {
          createdAt: {
            $gte: sevenDaysAgo,
          },
        },
      }),
      companyQuery.count({
        where: { status: 'pending' },
      }),
      companyQuery.count({
        where: { status: 'suspended' },
      }),
    ]);

  const sessionScanLimit = parsePositiveInteger(
    process.env.OPS_SECURITY_SESSION_SCAN_LIMIT,
    DEFAULT_SECURITY_SESSION_SCAN_LIMIT,
  );
  const usersForSessionScan = normalizeFindManyResult(
    (await userQuery.findMany({
      select: ['id'],
      orderBy: [{ updatedAt: 'desc' }],
      limit: sessionScanLimit,
    })) as Array<{ id?: number | string }> | { id?: number | string } | null,
  );

  let activeSessions = 0;
  let revokedSessions = 0;
  let usersWithActiveSessions = 0;

  for (const user of usersForSessionScan) {
    if (!user?.id) {
      continue;
    }
    try {
      const store = strapi.store({
        type: 'plugin',
        name: SESSION_STORE_PLUGIN,
        key: `${SESSION_KEY_PREFIX}:${String(user.id)}`,
      });
      const rawState = await store.get();
      const stats = parseSessionState(rawState);
      activeSessions += stats.active;
      revokedSessions += stats.revoked;
      if (stats.active > 0) {
        usersWithActiveSessions += 1;
      }
    } catch {
      // Ignore malformed session buckets and continue.
    }
  }

  const uploadSafetyEnabled = parseBoolean(process.env.UPLOAD_SAFETY_ENABLED, true);
  const maxFileSizeBytes = parsePositiveInteger(
    process.env.UPLOAD_MAX_FILE_SIZE_BYTES,
    DEFAULT_UPLOAD_MAX_FILE_SIZE_BYTES,
  );
  const allowedMimeTypes = (() => {
    const fromEnv = parseMimeTypeEnv(process.env.UPLOAD_ALLOWED_MIME_TYPES);
    if (fromEnv.length > 0) {
      return fromEnv;
    }
    return DEFAULT_UPLOAD_ALLOWED_MIME_TYPES;
  })();
  const aiKeys = await buildAiIgnitionModules();
  const controlPlaneKeys = await buildControlPlaneKeys();

  return {
    generatedAt: new Date().toISOString(),
    users: {
      total: totalUsers,
      blocked: blockedUsers,
      registrationsLast7d,
    },
    sessions: {
      scannedUsers: usersForSessionScan.length,
      truncated: totalUsers > usersForSessionScan.length,
      active: activeSessions,
      revoked: revokedSessions,
      usersWithActiveSessions,
    },
    uploads: {
      safetyEnabled: uploadSafetyEnabled,
      maxFileSizeBytes,
      allowedMimeTypes,
    },
    auth: {
      sessionIdleTimeoutMs: parseSessionIdleTimeoutMs(process.env.AUTH_SESSION_IDLE_TIMEOUT_MS),
    },
    aiKeys,
    controlPlaneKeys,
    moderation: {
      pendingCompanies,
      suspendedCompanies,
    },
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async health(ctx: Context) {
    try {
      ctx.body = { data: await buildHealthSnapshot(strapi) };
    } catch (error: unknown) {
      strapi.log.error(`[ops] Failed to build health snapshot: ${toErrorMessage(error)}`);
      ctx.internalServerError('owner.ops.health.failed');
    }
  },

  async backups(ctx: Context) {
    try {
      ctx.body = { data: await buildBackupsSnapshot(strapi) };
    } catch (error: unknown) {
      strapi.log.error(`[ops] Failed to build backups snapshot: ${toErrorMessage(error)}`);
      ctx.internalServerError('owner.ops.backups.failed');
    }
  },

  async imports(ctx: Context) {
    try {
      ctx.body = { data: await buildImportsSnapshot(strapi) };
    } catch (error: unknown) {
      strapi.log.error(`[ops] Failed to build imports snapshot: ${toErrorMessage(error)}`);
      ctx.internalServerError('owner.ops.imports.failed');
    }
  },

  async security(ctx: Context) {
    try {
      ctx.body = { data: await buildSecuritySnapshot(strapi) };
    } catch (error: unknown) {
      strapi.log.error(`[ops] Failed to build security snapshot: ${toErrorMessage(error)}`);
      ctx.internalServerError('owner.ops.security.failed');
    }
  },

  async auditLog(ctx: Context) {
    try {
      ctx.body = { data: await buildAuditLogSnapshot(strapi, ctx.query) };
    } catch (error: unknown) {
      strapi.log.error(`[ops] Failed to build audit log: ${toErrorMessage(error)}`);
      ctx.internalServerError('owner.ops.auditLog.failed');
    }
  },

  async proofs(ctx: Context) {
    try {
      ctx.body = { data: await buildAiProofSnapshot(ctx.query) };
    } catch (error: unknown) {
      strapi.log.error(`[ops] Failed to build AI proof snapshot: ${toErrorMessage(error)}`);
      ctx.internalServerError('owner.ops.ai.proofs.failed');
    }
  },

  async dispatchCodexWorkflow(ctx: Context) {
    const body = (ctx.request as Context['request']).body;
    const record =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : null;
    const requestedProvider =
      record?.provider == null ? 'codex' : normalizeAiProvider(record.provider);

    if (record?.provider != null && !requestedProvider) {
      ctx.badRequest('owner.ops.ai.provider.invalid');
      return;
    }

    const config = getAiDispatchConfig(requestedProvider ?? 'codex');

    if (!config.enabled || !config.configured) {
      strapi.log.warn(
        `[ops] ${config.selectedProvider} workflow dispatch requested while integration is disabled.`,
      );
      respondHttpError(ctx, 503, 'ServiceUnavailableError', 'owner.ops.ai.disabled');
      return;
    }

    const { input, error } = validateAiDispatchInput(body, config);
    if (error || !input) {
      ctx.badRequest(error ?? 'owner.ops.ai.payload.invalid');
      return;
    }

    try {
      const response = await dispatchAiWorkflow(config, input);
      await safeAppendAuditLogEvent(
        strapi,
        buildAiDispatchAuditEvent(ctx, config, input, response),
      );
      ctx.body = {
        data: response,
      };
    } catch (error: unknown) {
      strapi.log.error(
        `[ops] Failed to dispatch ${config.selectedProvider} workflow: ${toErrorMessage(error)}`,
      );
      respondHttpError(ctx, 502, 'BadGatewayError', 'owner.ops.ai.dispatch.failed');
    }
  },
});
