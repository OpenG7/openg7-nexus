import {
  AdminQualityMissionRecommendation,
  missionActionDescriptors,
  resolveMissionAction,
} from '@openg7/admin-quality';

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
    validationCommands: ['yarn --cwd openg7-org test:e2e'],
    targetFiles: ['openg7-org/e2e/feed-advanced-discovery-roundtrip.spec.ts'],
    dependencies: ['Validation humaine de mission et priorite de passage.'],
    confidence: 'High',
    impact: 'High',
    suggestedOwner: 'Front owner',
    operatorPrompt: 'Créer puis déléguer la mission.',
    status: 'proposed',
    ...overrides,
  };
}

describe('admin-quality-mission-actions', () => {
  it('returns create mission actions for proposed work', () => {
    const actions = missionActionDescriptors('proposed');

    expect(actions).toEqual([
      { action: 'approve', label: 'Valider mission', tone: 'primary', hookId: 'admin-quality-approve-mission' },
      { action: 'auto-delegate', label: 'Deleguer', tone: 'secondary' },
      { action: 'defer', label: 'Differer', tone: 'neutral' },
    ]);
  });

  it('returns proof review actions for in-progress work', () => {
    const actions = missionActionDescriptors('in-progress');

    expect(actions).toEqual([
      { action: 'return-proof', label: 'Preuve revenue', tone: 'success' },
      { action: 'block', label: 'Bloquer', tone: 'danger' },
      { action: 'reset', label: 'Reinitialiser', tone: 'neutral' },
    ]);
  });

  it('resolves auto-delegate from proposed to in-progress', () => {
    const resolution = resolveMissionAction('auto-delegate', buildRecommendation({ status: 'proposed' }));

    expect(resolution).toEqual({
      kind: 'status',
      status: 'in-progress',
      message: 'Mission approuvee et deleguee.',
    });
  });

  it('resolves auto-delegate from blocked back to approved', () => {
    const resolution = resolveMissionAction('auto-delegate', buildRecommendation({ status: 'blocked' }));

    expect(resolution).toEqual({
      kind: 'status',
      status: 'approved',
      message: 'Mission debloquee et remise en file.',
    });
  });

  it('returns null when auto-delegate is not valid for the current status', () => {
    const resolution = resolveMissionAction('auto-delegate', buildRecommendation({ status: 'in-progress' }));

    expect(resolution).toBeNull();
  });

  it('resolves reset as a reset instruction instead of a status change', () => {
    const resolution = resolveMissionAction('reset', buildRecommendation({ status: 'done' }));

    expect(resolution).toEqual({
      kind: 'reset',
      message: 'Mission reinitialisee.',
    });
  });

  it('resolves approval and completion transitions with the expected messages', () => {
    const approveResolution = resolveMissionAction('approve', buildRecommendation());
    const completeResolution = resolveMissionAction('complete', buildRecommendation({ status: 'proof-returned' }));

    expect(approveResolution).toEqual({
      kind: 'status',
      status: 'approved',
      message: 'Mission approuvee par un humain.',
    });
    expect(completeResolution).toEqual({
      kind: 'status',
      status: 'done',
      message: 'Mission cloturee localement.',
    });
  });
});
