import {
  AdminQualityMatrixBucket,
  AdminQualityMatrixEntry,
  AdminQualityReactorReasonId,
  AdminQualityReactorSignalSeverity,
  buildAdminQualityReactorReasons,
  countAdminQualityReactorCategories,
  resolveAdminQualityReactorState,
} from '@openg7/admin-quality';

function entry(
  id: string,
  overrides: Partial<AdminQualityMatrixEntry> = {},
): AdminQualityMatrixEntry {
  return {
    id,
    domain: `Domain ${id}`,
    need: 'Demonstrable coverage',
    summaryStatus: 'oui',
    businessStatus: 'oui',
    implementationStatus: 'oui',
    e2eStatus: 'oui',
    priority: 'moyenne',
    managementBucket: 'covered',
    needsProductWorkFirst: false,
    observedGap: '',
    nextMove: '',
    evidence: [`e2e/${id}.spec.ts`],
    reviewedAt: '2026-09-08',
    repoSignalAt: null,
    repoSignalCommit: null,
    repoSignalSource: null,
    repoSignalSummary: null,
    signalDispatch: {},
    ...overrides,
  };
}

function matrix(
  total: number,
  affected: number,
  overrides: Partial<AdminQualityMatrixEntry>,
): readonly AdminQualityMatrixEntry[] {
  return Array.from({ length: total }, (_, index) =>
    entry(String(index), index < affected ? overrides : {}),
  );
}

describe('Quality reactor explanations', () => {
  it('does not invent causes for an empty or completely covered matrix', () => {
    expect(buildAdminQualityReactorReasons([], ['absent'])).toEqual([]);
    const entries = matrix(4, 0, {});
    expect(buildAdminQualityReactorReasons(entries, [])).toEqual([]);
    expect(resolveAdminQualityReactorState(countAdminQualityReactorCategories([]))).toBe('stable');
    expect(resolveAdminQualityReactorState(countAdminQualityReactorCategories(entries))).toBe(
      'excellent',
    );
  });

  const boundaries: readonly {
    id: AdminQualityReactorReasonId;
    total: number;
    affected: number;
    severity: AdminQualityReactorSignalSeverity;
    threshold?: number;
    overrides: Partial<AdminQualityMatrixEntry>;
  }[] = [
    {
      id: 'priority-gaps',
      total: 4,
      affected: 1,
      severity: 'critical',
      threshold: 25,
      overrides: { managementBucket: 'proof-gap', priority: 'haute' },
    },
    {
      id: 'priority-gaps',
      total: 5,
      affected: 1,
      severity: 'attention',
      overrides: { managementBucket: 'proof-gap', priority: 'haute' },
    },
    {
      id: 'unresolved',
      total: 4,
      affected: 2,
      severity: 'critical',
      threshold: 50,
      overrides: { managementBucket: 'product-gap' },
    },
    {
      id: 'unresolved',
      total: 5,
      affected: 2,
      severity: 'attention',
      threshold: 20,
      overrides: { managementBucket: 'product-gap' },
    },
    {
      id: 'unresolved',
      total: 5,
      affected: 1,
      severity: 'attention',
      threshold: 20,
      overrides: { managementBucket: 'scope-limit' },
    },
    {
      id: 'unresolved',
      total: 6,
      affected: 1,
      severity: 'info',
      threshold: 20,
      overrides: { managementBucket: 'scope-limit' },
    },
    {
      id: 'not-evaluated',
      total: 4,
      affected: 1,
      severity: 'critical',
      threshold: 25,
      overrides: { managementBucket: 'not-evaluated' },
    },
    {
      id: 'not-evaluated',
      total: 5,
      affected: 1,
      severity: 'attention',
      overrides: { managementBucket: 'not-evaluated' },
    },
  ];

  for (const boundary of boundaries) {
    it(`explains ${boundary.id} at ${boundary.affected}/${boundary.total} with the actual state threshold`, () => {
      const entries = matrix(boundary.total, boundary.affected, boundary.overrides);
      const reasons = buildAdminQualityReactorReasons(entries, []);
      const reason = reasons.find(({ id }) => id === boundary.id)!;

      expect(reason.severity).toBe(boundary.severity);
      expect(reason.params.count).toBe(boundary.affected);
      expect(reason.params.total).toBe(boundary.total);
      expect(reason.params.threshold).toBe(boundary.threshold);
      expect(reason.messageKey).toBe(
        `admin.quality.reactor.explanations.reasons.${boundary.id}.${boundary.severity}`,
      );
      expect(reason.entries.map(({ id }) => id)).toEqual(
        entries.slice(0, boundary.affected).map(({ id }) => id),
      );
      expect(resolveAdminQualityReactorState(countAdminQualityReactorCategories(entries))).toBe(
        boundary.severity === 'info' ? 'stable' : boundary.severity,
      );
    });
  }

  it('normalizes unknown categories and does not reclassify scope limits from product-work flags', () => {
    const entries = [
      entry('unknown', {
        managementBucket: 'future-category' as AdminQualityMatrixBucket,
        priority: 'haute',
      }),
      entry('scope', { managementBucket: 'scope-limit', needsProductWorkFirst: true }),
      entry('covered', { priority: 'haute', needsProductWorkFirst: true }),
    ];
    const reasons = buildAdminQualityReactorReasons(entries, []);

    expect(reasons.map(({ id }) => id)).toEqual(['priority-gaps', 'unresolved', 'not-evaluated']);
    expect(reasons[0].entries.map(({ id }) => id)).toEqual(['unknown']);
    expect(reasons[1].entries.map(({ id }) => id)).toEqual(['unknown', 'scope']);
    expect(reasons[2].entries.map(({ id }) => id)).toEqual(['unknown']);
  });

  it('uses the exact refresh IDs and preserves recorded reviews and evidence without inventing proof', () => {
    const entries = [
      entry('old-date', { reviewedAt: '2020-01-01' }),
      entry('repo-changed'),
      entry('missing-review', { reviewedAt: '', evidence: [] }),
    ];
    const reasons = buildAdminQualityReactorReasons(entries, [
      'repo-changed',
      'missing-review',
      'repo-changed',
      'absent',
    ]);

    expect(reasons.length).toBe(1);
    expect(reasons[0].id).toBe('review-required');
    expect(reasons[0].severity).toBe('attention');
    expect(reasons[0].params).toEqual({ count: 2, total: 3, percent: 66.7 });
    expect(reasons[0].entries).toEqual([
      {
        id: 'repo-changed',
        domain: 'Domain repo-changed',
        reviewedAt: '2026-09-08',
        evidence: ['e2e/repo-changed.spec.ts'],
      },
      { id: 'missing-review', domain: 'Domain missing-review', reviewedAt: '', evidence: [] },
    ]);
  });

  it('keeps overlapping causes separate and in a stable order without duplicating entries within a cause', () => {
    const entries = [entry('shared', { managementBucket: 'not-evaluated', priority: 'haute' })];
    const reasons = buildAdminQualityReactorReasons(entries, ['shared', 'shared']);

    expect(reasons.map(({ id }) => id)).toEqual([
      'priority-gaps',
      'unresolved',
      'not-evaluated',
      'review-required',
    ]);
    expect(
      reasons.every((reason) => reason.params.count === 1 && reason.entries.length === 1),
    ).toBeTrue();
  });

  it('does not round a percentage up across an unmet critical or attention threshold', () => {
    const priorityEntries = matrix(1001, 250, { managementBucket: 'proof-gap', priority: 'haute' });
    const unresolvedEntries = matrix(1001, 500, { managementBucket: 'product-gap' });
    const belowAttentionEntries = matrix(1001, 200, { managementBucket: 'scope-limit' });

    const priority = buildAdminQualityReactorReasons(priorityEntries, [])[0];
    const unresolved = buildAdminQualityReactorReasons(unresolvedEntries, [])[0];
    const belowAttention = buildAdminQualityReactorReasons(belowAttentionEntries, [])[0];

    expect(priority.params.percent).toBe(24.9);
    expect(priority.severity).toBe('attention');
    expect(unresolved.params.percent).toBe(49.9);
    expect(unresolved.severity).toBe('attention');
    expect(belowAttention.params.percent).toBe(19.9);
    expect(belowAttention.severity).toBe('info');
  });
});
