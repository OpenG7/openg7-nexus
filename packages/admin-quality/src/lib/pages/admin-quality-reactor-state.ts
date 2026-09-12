import {
  AdminQualityMatrixEntry,
  normalizeAdminQualityMatrixBucket,
} from '../data-access/admin-quality-matrix.service';

export interface AdminQualityReactorCounts {
  readonly total: number;
  readonly covered: number;
  readonly proofGap: number;
  readonly productGap: number;
  readonly scopeLimit: number;
  readonly notEvaluated: number;
  readonly highPriorityGap: number;
}

export type AdminQualityReactorState = 'stable' | 'attention' | 'critical' | 'excellent';

export const ADMIN_QUALITY_REACTOR_THRESHOLDS = {
  'priority-gaps': { critical: 0.25, attention: 0 },
  unresolved: { critical: 0.5, attention: 0.2 },
  'not-evaluated': { critical: 0.25, attention: 0 },
} as const;

export type AdminQualityReactorSignalId = keyof typeof ADMIN_QUALITY_REACTOR_THRESHOLDS;
export type AdminQualityReactorSignalSeverity = 'critical' | 'attention' | 'info';

export function resolveAdminQualityReactorSignalSeverity(
  signal: AdminQualityReactorSignalId,
  count: number,
  total: number,
): AdminQualityReactorSignalSeverity {
  if (count === 0 || total === 0) {
    return 'info';
  }

  const thresholds = ADMIN_QUALITY_REACTOR_THRESHOLDS[signal];
  const ratio = count / total;
  if (ratio >= thresholds.critical) {
    return 'critical';
  }
  return ratio >= thresholds.attention ? 'attention' : 'info';
}

export function countAdminQualityReactorCategories(
  entries: readonly Pick<AdminQualityMatrixEntry, 'managementBucket' | 'priority'>[],
): AdminQualityReactorCounts {
  const counts = {
    total: entries.length,
    covered: 0,
    proofGap: 0,
    productGap: 0,
    scopeLimit: 0,
    notEvaluated: 0,
    highPriorityGap: 0,
  };

  for (const entry of entries) {
    const bucket = normalizeAdminQualityMatrixBucket(entry.managementBucket);
    switch (bucket) {
      case 'covered':
        counts.covered += 1;
        break;
      case 'proof-gap':
        counts.proofGap += 1;
        break;
      case 'product-gap':
        counts.productGap += 1;
        break;
      case 'scope-limit':
        counts.scopeLimit += 1;
        break;
      case 'not-evaluated':
        counts.notEvaluated += 1;
        break;
    }
    if (bucket !== 'covered' && entry.priority === 'haute') {
      counts.highPriorityGap += 1;
    }
  }

  return counts;
}

export function resolveAdminQualityReactorState(
  counts: AdminQualityReactorCounts,
): AdminQualityReactorState {
  if (counts.total === 0) {
    return 'stable';
  }

  const severities = [
    resolveAdminQualityReactorSignalSeverity('priority-gaps', counts.highPriorityGap, counts.total),
    resolveAdminQualityReactorSignalSeverity(
      'unresolved',
      counts.total - counts.covered,
      counts.total,
    ),
    resolveAdminQualityReactorSignalSeverity('not-evaluated', counts.notEvaluated, counts.total),
  ];
  if (severities.includes('critical')) {
    return 'critical';
  }
  if (severities.includes('attention')) {
    return 'attention';
  }
  return counts.covered === counts.total ? 'excellent' : 'stable';
}
