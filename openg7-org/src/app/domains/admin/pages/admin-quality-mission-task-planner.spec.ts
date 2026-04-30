import { AdminQualityMissionRecommendation } from './admin-quality-mission-control';
import { buildMissionTasks, summarizeMissionQuota } from './admin-quality-mission-task-planner';

function buildRecommendation(
  overrides: Partial<AdminQualityMissionRecommendation> = {}
): AdminQualityMissionRecommendation {
  return {
    id: 'advanced-discovery::core',
    kind: 'core',
    title: 'Etendre la preuve QA',
    summary: 'Ajouter une chaine map vers feed.',
    whyNow: 'Une chaine cross-surface reste absente.',
    rationale: ['Le flux doit rester pilotable.'],
    acceptanceCriteria: ['Une preuve E2E existe.'],
    validationCommands: ['yarn --cwd openg7-org build', 'yarn --cwd openg7-org exec playwright test'],
    targetFiles: [
      'openg7-org/e2e/feed-advanced-discovery-roundtrip.spec.ts',
      'openg7-org/src/app/domains/feed/feature/feed.page.ts',
    ],
    dependencies: ['Validation humaine de mission et priorite de passage.'],
    confidence: 'High',
    impact: 'High',
    suggestedOwner: 'Front owner',
    operatorPrompt: 'Creer puis deleguer la mission.',
    status: 'proposed',
    ...overrides,
  };
}

describe('admin-quality-mission-task-planner', () => {
  it('builds alignment, implementation, validation, and proof tasks', () => {
    const tasks = buildMissionTasks(buildRecommendation(), 'Hard');

    expect(tasks.map((task) => task.kind)).toEqual([
      'alignment',
      'implementation',
      'implementation',
      'validation',
      'validation',
      'proof',
    ]);
    expect(tasks[0]?.blocking).toBeTrue();
    expect(tasks[1]?.headline).toContain('feed-advanced-discovery-roundtrip.spec.ts');
  });

  it('summarizes quota sufficiency from generated tasks', () => {
    const tasks = buildMissionTasks(buildRecommendation(), 'Medium');
    const summary = summarizeMissionQuota(tasks, 20);

    expect(summary.taskCount).toBe(6);
    expect(summary.requiredUnits).toBeGreaterThan(20);
    expect(summary.sufficient).toBeFalse();
    expect(summary.shortageUnits).toBe(summary.requiredUnits - 20);
  });
});
