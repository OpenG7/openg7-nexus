import {
  AdminQualityMatrixEntry,
  normalizeAdminQualityMatrixBucket,
} from '../data-access/admin-quality-matrix.service';

import {
  ADMIN_QUALITY_REACTOR_THRESHOLDS,
  AdminQualityReactorSignalId,
  AdminQualityReactorSignalSeverity,
  resolveAdminQualityReactorSignalSeverity,
} from './admin-quality-reactor-state';

export type AdminQualityReactorReasonId = AdminQualityReactorSignalId | 'review-required';

export interface AdminQualityReactorReason {
  readonly id: AdminQualityReactorReasonId;
  readonly labelKey: string;
  readonly messageKey: string;
  readonly severity: AdminQualityReactorSignalSeverity;
  readonly params: {
    readonly count: number;
    readonly total: number;
    readonly percent: number;
    readonly threshold?: number;
  };
  readonly entries: readonly Pick<
    AdminQualityMatrixEntry,
    'id' | 'domain' | 'reviewedAt' | 'evidence'
  >[];
}

export function buildAdminQualityReactorReasons(
  entries: readonly AdminQualityMatrixEntry[],
  refreshRequiredEntryIds: readonly string[],
): readonly AdminQualityReactorReason[] {
  const refreshRequired = new Set(refreshRequiredEntryIds);
  const groups: Record<AdminQualityReactorReasonId, AdminQualityMatrixEntry[]> = {
    'priority-gaps': [],
    unresolved: [],
    'not-evaluated': [],
    'review-required': [],
  };

  for (const entry of entries) {
    const bucket = normalizeAdminQualityMatrixBucket(entry.managementBucket);
    if (bucket !== 'covered') {
      groups.unresolved.push(entry);
      if (entry.priority === 'haute') {
        groups['priority-gaps'].push(entry);
      }
    }
    if (bucket === 'not-evaluated') {
      groups['not-evaluated'].push(entry);
    }
    if (refreshRequired.has(entry.id)) {
      groups['review-required'].push(entry);
    }
  }

  const reasons: AdminQualityReactorReason[] = [];
  const reasonIds: readonly AdminQualityReactorReasonId[] = [
    'priority-gaps',
    'unresolved',
    'not-evaluated',
    'review-required',
  ];
  for (const id of reasonIds) {
    const affectedEntries = groups[id];
    if (affectedEntries.length === 0) {
      continue;
    }

    const count = affectedEntries.length;
    const total = entries.length;
    const severity =
      id === 'review-required'
        ? 'attention'
        : resolveAdminQualityReactorSignalSeverity(id, count, total);
    const thresholds = id === 'review-required' ? null : ADMIN_QUALITY_REACTOR_THRESHOLDS[id];
    const thresholdRatio = severity === 'critical' ? thresholds?.critical : thresholds?.attention;
    const threshold = thresholdRatio ? thresholdRatio * 100 : undefined;
    const keyPrefix = `admin.quality.reactor.explanations.reasons.${id}`;

    reasons.push({
      id,
      labelKey: `${keyPrefix}.label`,
      messageKey: `${keyPrefix}.${severity}`,
      severity,
      params: {
        count,
        total,
        percent: displayPercent(count, total, thresholds),
        ...(threshold === undefined ? {} : { threshold }),
      },
      entries: affectedEntries.map(({ id, domain, reviewedAt, evidence }) => ({
        id,
        domain,
        reviewedAt,
        evidence,
      })),
    });
  }

  return reasons;
}

function displayPercent(
  count: number,
  total: number,
  thresholds: { readonly critical: number; readonly attention: number } | null,
): number {
  const percent = (count / total) * 100;
  const rounded = Math.round(percent * 10) / 10;
  // Do not display a threshold as reached when the exact ratio is still below it.
  const roundsAcrossThreshold =
    thresholds &&
    [thresholds.critical, thresholds.attention].some(
      (threshold) => count / total < threshold && rounded >= threshold * 100,
    );
  return roundsAcrossThreshold ? Math.floor(percent * 10) / 10 : rounded;
}
