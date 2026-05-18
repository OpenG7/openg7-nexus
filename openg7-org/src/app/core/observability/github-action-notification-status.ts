export type GithubActionNotificationState =
  | 'queued'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'unavailable';

export interface GithubActionNotificationStatus {
  readonly state: GithubActionNotificationState;
  readonly label: string;
  readonly detail: string;
  readonly workflow: string | null;
  readonly runUrl: string | null;
  readonly runNumber: number | null;
  readonly correlationId: string | null;
  readonly updatedAt: string;
}

export const GITHUB_ACTION_STATUS_METADATA_KEY = 'githubActionStatus';

export function readGithubActionNotificationStatus(
  metadata: Record<string, unknown> | null | undefined,
): GithubActionNotificationStatus | null {
  const candidate = metadata?.[GITHUB_ACTION_STATUS_METADATA_KEY];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return null;
  }

  const record = candidate as Record<string, unknown>;
  const state = normalizeGithubActionState(record['state']);
  const label = normalizeString(record['label']);
  const detail = normalizeString(record['detail']);

  if (!state || !label || !detail) {
    return null;
  }

  return {
    state,
    label,
    detail,
    workflow: normalizeString(record['workflow']),
    runUrl: normalizeString(record['runUrl']),
    runNumber: normalizeNumber(record['runNumber']),
    correlationId: normalizeString(record['correlationId']),
    updatedAt: normalizeString(record['updatedAt']) ?? new Date(0).toISOString(),
  };
}

export function githubActionStatusMetadata(
  status: GithubActionNotificationStatus,
): Record<typeof GITHUB_ACTION_STATUS_METADATA_KEY, GithubActionNotificationStatus> {
  return {
    [GITHUB_ACTION_STATUS_METADATA_KEY]: status,
  };
}

function normalizeGithubActionState(value: unknown): GithubActionNotificationState | null {
  switch (value) {
    case 'queued':
    case 'in-progress':
    case 'completed':
    case 'failed':
    case 'unavailable':
      return value;
    default:
      return null;
  }
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
