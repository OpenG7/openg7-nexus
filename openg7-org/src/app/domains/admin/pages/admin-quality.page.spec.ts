import { OverlayContainer } from '@angular/cdk/overlay';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  NotificationStore,
  NotificationStoreApi,
} from '@app/core/observability/notification.store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AdminQualityBrowserService, AdminQualityPage } from '@openg7/admin-quality';
import { of, throwError } from 'rxjs';

import { AdminOpsService } from '../data-access/admin-ops.service';
import {
  AdminQualityMatrixRecalculationSnapshot,
  AdminQualityMatrixService,
  AdminQualityMatrixSnapshot,
} from '../data-access/admin-quality-matrix.service';
import {
  AdminQualityMissionDecisionSaveInput,
  AdminQualityMissionDecisionSnapshot,
  AdminQualityMissionDecisionsService,
} from '../data-access/admin-quality-mission-decisions.service';
import {
  ADMIN_QUALITY_MATRIX_PORT,
  ADMIN_QUALITY_MISSION_DECISIONS_PORT,
  ADMIN_QUALITY_NOTIFICATIONS,
  ADMIN_QUALITY_OPS_PORT,
} from '../data-access/admin-quality.ports';

class AdminQualityMatrixServiceMock {
  readonly loadMatrix = jasmine.createSpy('loadMatrix').and.returnValue(
    of<AdminQualityMatrixSnapshot>({
      generatedAt: '2026-04-11T14:00:00.000Z',
      sourceStatus: 'fresh',
      sourceMessage: null,
      entries: [
        {
          id: 'advanced-discovery',
          domain: 'Recherche et decouverte profonde',
          need: 'Conserver le contexte entre le feed et le detail.',
          summaryStatus: 'non',
          businessStatus: 'oui',
          implementationStatus: 'partiel',
          e2eStatus: 'partiel',
          priority: 'haute',
          managementBucket: 'proof-gap',
          needsProductWorkFirst: false,
          observedGap: 'Une chaine cross-surface reste absente.',
          nextMove: 'Ajouter une chaine map vers feed.',
          evidence: ['e2e/feed-advanced-discovery-roundtrip.spec.ts'],
          reviewedAt: '2026-04-07',
          repoSignalAt: null,
          repoSignalCommit: null,
          repoSignalSource: null,
          repoSignalSummary: null,
          signalDispatch: {},
        },
        {
          id: 'trust-validation',
          domain: 'Trust et validation',
          need: 'Historiser les decisions de confiance.',
          summaryStatus: 'oui',
          businessStatus: 'oui',
          implementationStatus: 'oui',
          e2eStatus: 'oui',
          priority: 'moyenne',
          managementBucket: 'covered',
          needsProductWorkFirst: false,
          observedGap: 'Le flux critique est deja prouve.',
          nextMove: 'Maintenir la regression existante.',
          evidence: ['e2e/admin-trust-visibility.spec.ts'],
          reviewedAt: '2026-04-07',
          repoSignalAt: null,
          repoSignalCommit: null,
          repoSignalSource: null,
          repoSignalSummary: null,
          signalDispatch: {},
        },
        {
          id: 'observability',
          domain: 'Observabilite et tracabilite',
          need: 'Afficher un audit trail visible.',
          summaryStatus: 'partiel',
          businessStatus: 'oui',
          implementationStatus: 'partiel',
          e2eStatus: 'partiel',
          priority: 'moyenne',
          managementBucket: 'product-gap',
          needsProductWorkFirst: true,
          observedGap: "L'audit trail n'est pas encore expose.",
          nextMove: "Exposer une trace d'action sensible.",
          evidence: ['e2e/admin-ops-provenance-trail.spec.ts'],
          reviewedAt: '2026-04-07',
          repoSignalAt: null,
          repoSignalCommit: null,
          repoSignalSource: null,
          repoSignalSummary: null,
          signalDispatch: {},
        },
      ],
    }),
  );
  readonly recalculateMatrix = jasmine.createSpy('recalculateMatrix').and.returnValue(
    of<AdminQualityMatrixRecalculationSnapshot>({
      generatedAt: '2026-05-02T20:00:00.000Z',
      scope: 'refresh-required',
      summary: {
        analyzedCount: 1,
        proposalCount: 1,
        unchangedCount: 0,
        blockedCount: 0,
      },
      entries: [
        {
          entryId: 'advanced-discovery',
          domain: 'Recherche et decouverte profonde',
          result: 'proposal-review-required',
          confidence: 'high',
          current: {
            summaryStatus: 'non',
            businessStatus: 'partiel',
            implementationStatus: 'partiel',
            e2eStatus: 'partiel',
            managementBucket: 'proof-gap',
            needsProductWorkFirst: false,
          },
          proposed: {
            summaryStatus: 'oui',
            businessStatus: 'oui',
            implementationStatus: 'oui',
            e2eStatus: 'oui',
            managementBucket: 'covered',
            needsProductWorkFirst: false,
          },
          reasons: ['Une mission marquee done est plus recente que la derniere revue.'],
          evidence: ['e2e/feed-advanced-discovery-roundtrip.spec.ts'],
          pilot: {
            score: 100,
            bucket: 'ready-to-close',
            priority: 'now',
            actionType: 'close-entry',
            rationale: ['Une mission marquee done est plus recente que la derniere revue.'],
            targetFiles: ['e2e/feed-advanced-discovery-roundtrip.spec.ts'],
            acceptanceCriteria: [
              'La proposition QA est appliquee par un Owner apres verification humaine.',
            ],
            suggestedCommands: [
              'yarn workspace @openg7/strapi test:integration:admin-quality-matrix',
            ],
            expectedEvidence: ['Matrice mise a jour', 'Recalcul sans nouvelle proposition'],
            blockingReason: null,
          },
          factualSignals: {
            reviewedAt: '2026-04-07',
            repoSignalAt: '2026-05-02T12:00:00.000Z',
            repoSignalCommit: 'abc123def456',
            repoSignalSource: 'github-actions',
            latestDecisionAt: '2026-05-02T19:59:00.000Z',
          },
        },
      ],
    }),
  );
  readonly applyMatrixProposal = jasmine.createSpy('applyMatrixProposal').and.returnValue(
    of({
      appliedAt: '2026-05-02T20:05:00.000Z',
      entry: {
        id: 'advanced-discovery',
        domain: 'Recherche et decouverte profonde',
        need: 'Conserver le contexte entre le feed et le detail.',
        summaryStatus: 'oui',
        businessStatus: 'oui',
        implementationStatus: 'oui',
        e2eStatus: 'oui',
        priority: 'haute',
        managementBucket: 'covered',
        needsProductWorkFirst: false,
        observedGap: 'Une chaine cross-surface reste absente.',
        nextMove: 'Ajouter une chaine map vers feed.',
        evidence: ['e2e/feed-advanced-discovery-roundtrip.spec.ts'],
        reviewedAt: '2026-05-02',
        repoSignalAt: '2026-05-02T12:00:00.000Z',
        repoSignalCommit: 'abc123def456',
        repoSignalSource: 'github-actions',
        repoSignalSummary: null,
        signalDispatch: {},
      },
      proposal: {
        entryId: 'advanced-discovery',
        domain: 'Recherche et decouverte profonde',
        result: 'proposal-review-required' as const,
        confidence: 'high' as const,
        current: {
          summaryStatus: 'non' as const,
          businessStatus: 'partiel' as const,
          implementationStatus: 'partiel' as const,
          e2eStatus: 'partiel' as const,
          managementBucket: 'proof-gap' as const,
          needsProductWorkFirst: false,
        },
        proposed: {
          summaryStatus: 'oui' as const,
          businessStatus: 'oui' as const,
          implementationStatus: 'oui' as const,
          e2eStatus: 'oui' as const,
          managementBucket: 'covered' as const,
          needsProductWorkFirst: false,
        },
        reasons: ['Une mission marquee done est plus recente que la derniere revue.'],
        evidence: ['e2e/feed-advanced-discovery-roundtrip.spec.ts'],
        pilot: {
          score: 100,
          bucket: 'ready-to-close',
          priority: 'now',
          actionType: 'close-entry',
          rationale: ['Une mission marquee done est plus recente que la derniere revue.'],
          targetFiles: ['e2e/feed-advanced-discovery-roundtrip.spec.ts'],
          acceptanceCriteria: [
            'La proposition QA est appliquee par un Owner apres verification humaine.',
          ],
          suggestedCommands: [
            'yarn workspace @openg7/strapi test:integration:admin-quality-matrix',
          ],
          expectedEvidence: ['Matrice mise a jour', 'Recalcul sans nouvelle proposition'],
          blockingReason: null,
        },
        factualSignals: {
          reviewedAt: '2026-04-07',
          repoSignalAt: '2026-05-02T12:00:00.000Z',
          repoSignalCommit: 'abc123def456',
          repoSignalSource: 'github-actions',
          latestDecisionAt: '2026-05-02T19:59:00.000Z',
        },
      },
    }),
  );
}

class AdminQualityMissionDecisionsServiceMock {
  readonly loadDecisions = jasmine.createSpy('loadDecisions').and.returnValue(
    of<AdminQualityMissionDecisionSnapshot>({
      generatedAt: '2026-04-30T00:00:00.000Z',
      decisions: [],
    }),
  );
  readonly saveDecision = jasmine
    .createSpy('saveDecision')
    .and.callFake((input: AdminQualityMissionDecisionSaveInput) =>
      of({
        ...input,
        decidedByUserId: '1',
        createdAt: '2026-04-30T00:00:00.000Z',
        updatedAt: '2026-04-30T00:00:00.000Z',
      }),
    );
  readonly deleteDecision = jasmine
    .createSpy('deleteDecision')
    .and.callFake((recommendationId: string) =>
      of({
        recommendationId,
        deleted: true,
      }),
    );
}

class AdminOpsServiceMock {
  readonly getSecurity = jasmine.createSpy('getSecurity').and.returnValue(
    of({
      generatedAt: '2026-04-30T00:00:00.000Z',
      users: {
        total: 3,
        blocked: 0,
        registrationsLast7d: 1,
      },
      sessions: {
        scannedUsers: 3,
        truncated: false,
        active: 1,
        revoked: 0,
        usersWithActiveSessions: 1,
      },
      uploads: {
        safetyEnabled: true,
        maxFileSizeBytes: 5242880,
        allowedMimeTypes: ['image/png'],
      },
      auth: {
        sessionIdleTimeoutMs: 43200000,
      },
      aiKeys: [
        {
          provider: 'codex',
          label: 'Codex',
          workflow: 'codex-pr.yml',
          secretName: 'OPENAI_API_KEY',
          dispatchEnabled: true,
          keyInserted: true,
          state: 'ready',
          note: 'Key detected. The engine bay is armed and ready for dispatch.',
        },
        {
          provider: 'copilot',
          label: 'GitHub Copilot',
          workflow: 'copilot-pr.yml',
          secretName: null,
          dispatchEnabled: false,
          keyInserted: false,
          state: 'unsupported',
          note: 'No stable ignition key is wired for this console yet.',
        },
        {
          provider: 'claude',
          label: 'Claude',
          workflow: 'claude-pr.yml',
          secretName: 'ANTHROPIC_API_KEY',
          dispatchEnabled: true,
          keyInserted: true,
          state: 'ready',
          note: 'Key detected. The engine bay is armed and ready for dispatch.',
        },
        {
          provider: 'gemini',
          label: 'Gemini',
          workflow: 'gemini-pr.yml',
          secretName: 'GEMINI_API_KEY',
          dispatchEnabled: false,
          keyInserted: false,
          state: 'offline',
          note: 'Insert GEMINI_API_KEY into GitHub Actions secrets to power this module.',
        },
      ],
      moderation: {
        pendingCompanies: 0,
        suspendedCompanies: 0,
      },
    }),
  );
  readonly getAiProofs = jasmine.createSpy('getAiProofs').and.returnValue(
    of({
      generatedAt: '2026-04-30T00:12:00.000Z',
      providers: [
        {
          provider: 'codex',
          label: 'Codex',
          workflow: 'codex-pr.yml',
          state: 'completed' as const,
          summary: 'Workflow #51 completed with 2 artifact(s) and PR #321.',
          run: {
            id: 501,
            number: 51,
            url: 'https://github.com/OpenG7/openg7-nexus/actions/runs/501',
            status: 'completed',
            conclusion: 'success',
            branch: 'codex/qa-proof-501',
            createdAt: '2026-04-30T00:00:00.000Z',
            updatedAt: '2026-04-30T00:08:00.000Z',
          },
          artifacts: [
            {
              id: 9001,
              name: 'playwright-report',
              sizeBytes: 2048,
              expired: false,
              url: 'https://github.com/OpenG7/openg7-nexus/actions/runs/501#artifacts',
            },
            {
              id: 9002,
              name: 'logs',
              sizeBytes: 1024,
              expired: false,
              url: 'https://github.com/OpenG7/openg7-nexus/actions/runs/501#artifacts',
            },
          ],
          pullRequest: {
            number: 321,
            title: 'Codex QA proof package',
            url: 'https://github.com/OpenG7/openg7-nexus/pull/321',
            state: 'open',
            merged: false,
            mergedAt: null,
            branch: 'codex/qa-proof-501',
          },
        },
        {
          provider: 'copilot',
          label: 'GitHub Copilot',
          workflow: 'copilot-pr.yml',
          state: 'failed' as const,
          summary: 'Workflow #7 finished with conclusion failure.',
          run: {
            id: 701,
            number: 7,
            url: 'https://github.com/OpenG7/openg7-nexus/actions/runs/701',
            status: 'completed',
            conclusion: 'failure',
            branch: 'copilot/placeholder-701',
            createdAt: '2026-04-30T00:12:00.000Z',
            updatedAt: '2026-04-30T00:13:00.000Z',
          },
          artifacts: [],
          pullRequest: null,
        },
        {
          provider: 'claude',
          label: 'Claude',
          workflow: 'claude-pr.yml',
          state: 'in-progress' as const,
          summary: 'Workflow #18 is executing on claude/qa-proof-601.',
          run: {
            id: 601,
            number: 18,
            url: 'https://github.com/OpenG7/openg7-nexus/actions/runs/601',
            status: 'in_progress',
            conclusion: null,
            branch: 'claude/qa-proof-601',
            createdAt: '2026-04-30T00:10:00.000Z',
            updatedAt: '2026-04-30T00:11:00.000Z',
          },
          artifacts: [
            {
              id: 9003,
              name: 'draft-proof',
              sizeBytes: 512,
              expired: false,
              url: 'https://github.com/OpenG7/openg7-nexus/actions/runs/601#artifacts',
            },
          ],
          pullRequest: {
            number: 322,
            title: 'Claude draft improvements',
            url: 'https://github.com/OpenG7/openg7-nexus/pull/322',
            state: 'open',
            merged: false,
            mergedAt: null,
            branch: 'claude/qa-proof-601',
          },
        },
        {
          provider: 'gemini',
          label: 'Gemini',
          workflow: 'gemini-pr.yml',
          state: 'unavailable' as const,
          summary: 'No workflow run detected yet for gemini-pr.yml.',
          run: null,
          artifacts: [],
          pullRequest: null,
        },
      ],
    }),
  );
  readonly dispatchCodexWorkflow = jasmine
    .createSpy('dispatchCodexWorkflow')
    .and.callFake((payload: { provider: 'codex' | 'copilot' | 'claude' | 'gemini' }) =>
      of({
        queued: true,
        provider: 'github-actions' as const,
        selectedProvider: payload.provider,
        owner: 'OpenG7',
        repo: 'openg7-nexus',
        workflow: `${payload.provider}-pr.yml`,
        ref: 'main',
        requestedAt: '2026-04-30T00:00:00.000Z',
        request: {
          selectedProvider: payload.provider,
          scope: 'openg7-org' as const,
          baseBranch: 'main',
          draftPr: true,
          model: 'gpt-5.4',
          effort: null,
          correlationId: null,
          idempotencyKey: null,
          taskLength: 49,
        },
      }),
    );
}

describe('AdminQualityPage', () => {
  let service: AdminQualityMatrixServiceMock;
  let opsService: AdminOpsServiceMock;
  let missionDecisions: AdminQualityMissionDecisionsServiceMock;
  let notifications: jasmine.SpyObj<NotificationStoreApi>;

  function queryByDataOg7Id<T extends HTMLElement>(
    root: ParentNode,
    id: string,
    selector = '[data-og7-id]',
  ): T | null {
    return (
      Array.from(root.querySelectorAll<T>(selector)).find(
        (element) => element.getAttribute('data-og7-id') === id,
      ) ?? null
    );
  }

  async function selectAdminQualityComboboxOption(
    fixture: ComponentFixture<AdminQualityPage>,
    triggerId: string,
    optionValue: string,
  ): Promise<void> {
    const root = fixture.nativeElement as HTMLElement;
    const trigger = queryByDataOg7Id<HTMLButtonElement>(
      root,
      triggerId,
      '[data-og7="admin-quality-combobox"]',
    );

    expect(trigger).withContext(triggerId).not.toBeNull();

    trigger?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const optionId = `${triggerId}-${optionValue}`;
    const option = queryByDataOg7Id<HTMLButtonElement>(
      document.body,
      optionId,
      '[data-og7="admin-quality-combobox-option"]',
    );

    expect(option).withContext(optionId).not.toBeNull();

    option?.click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.removeItem('og7.admin-quality.mission-control.v1');
    localStorage.removeItem('og7.admin-quality.view-state.v1');
    service = new AdminQualityMatrixServiceMock();
    opsService = new AdminOpsServiceMock();
    missionDecisions = new AdminQualityMissionDecisionsServiceMock();
    notifications = jasmine.createSpyObj<NotificationStoreApi>('NotificationStoreApi', [
      'success',
      'info',
      'error',
    ]);

    await TestBed.configureTestingModule({
      imports: [AdminQualityPage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: AdminQualityMatrixService, useValue: service },
        { provide: AdminOpsService, useValue: opsService },
        { provide: AdminQualityMissionDecisionsService, useValue: missionDecisions },
        { provide: ADMIN_QUALITY_MATRIX_PORT, useValue: service },
        { provide: ADMIN_QUALITY_OPS_PORT, useValue: opsService },
        { provide: ADMIN_QUALITY_MISSION_DECISIONS_PORT, useValue: missionDecisions },
        { provide: ADMIN_QUALITY_NOTIFICATIONS, useValue: notifications },
        { provide: NotificationStore, useValue: notifications },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      'en',
      {
        admin: {
          quality: {
            workspace: {
              compact: {
                label: 'Workspace',
                title: 'Active workspace',
                subtitle: 'QA, delegation, and actions are available in the side panel.',
                open: 'Open workspace',
                primarySurface: 'Primary surface: {{ surface }}',
                domains: '{{ count }} domain(s)',
                actions: '{{ count }} action(s)',
                activeSurface: 'Active surface: {{ surface }}',
                activePanel: 'Active panel',
                activePanelCount: '{{ count }} item(s)',
              },
              drawer: {
                label: 'Workspace',
                activeSurface: 'Active surface',
                selectedCount: '{{ count }} item(s)',
                close: 'Close workspace',
                closeAction: 'Close',
                backdropLabel: 'Close workspace',
                tabsLabel: 'Workspace surfaces',
              },
              tabs: {
                qaQueue: 'QA Queue',
                delegation: 'Delegation',
                actions: 'Actions',
              },
              surfaces: {
                qaQueue: { title: 'QA Queue', subtitle: 'Requirements and coverage review' },
                delegation: { title: 'Delegation', subtitle: 'Automatic delegation plan' },
                actions: { title: 'Actions', subtitle: 'Action registry and instrumentation' },
              },
              qaQueue: {
                kicker: 'QA Queue',
                title: 'QA Queue',
                subtitle: 'Requirements and coverage review',
                emptyTitle: 'QA Queue pending',
                emptyBody:
                  'The QA queue will connect to the detailed matrix once structured data is available.',
                status: {
                  yes: 'Proved',
                  partial: 'Partial',
                  no: 'To cover',
                  outOfScope: 'Out of MVP',
                },
              },
              delegation: {
                header: 'Delegation',
                emptyTitle: 'Delegation unavailable',
                missing: 'No delegation plan is available for the current selection.',
                modes: {
                  qaProof: 'QA proof',
                  productClosure: 'Product closure',
                  hardening: 'Hardening',
                  scopeCadrage: 'Scope framing',
                },
                cards: {
                  action: 'Action',
                  projectStatus: 'Project status',
                  repos: 'Repos',
                  labels: 'Labels',
                  acceptance: 'Acceptance criteria',
                  execution: 'Likely execution plan',
                  files: 'Files',
                  validation: 'Validation',
                  signalFocus: 'Signal context',
                  signalAttention: 'Requires attention',
                  recommendedAction: 'Recommended action',
                  observedGap: 'Observed gap',
                  nextMove: 'Next move',
                  recommendations: 'Recommendations',
                  recommendationsBody: 'One recommendation per line.',
                  brief: 'Codex brief',
                  briefBody: 'Prompt ready to copy, review, or delegate quickly.',
                  issue: 'GitHub issue',
                  issueBody: 'Precomposed issue for delegation or follow-up.',
                },
                buttons: {
                  copyBrief: 'Copy brief',
                  copyIssue: 'Copy issue',
                  openGithub: 'Open on GitHub',
                },
                acceptanceCount: '{{ count }} item(s)',
                executionCount: '{{ files }} file(s) · {{ commands }} command(s)',
              },
              recalculation: {
                kicker: 'Matrix recalculation',
                current: 'Current state',
                proposed: 'Proposed state',
                recommendations: 'Recommendations',
                reasons: 'Reasons',
                evidence: 'Evidence',
                result: {
                  proposal: 'Proposal',
                  insufficientProof: 'Insufficient proof',
                  conflictingSignals: 'Conflicting signals',
                  unchanged: 'Unchanged',
                },
                confidence: {
                  high: 'High confidence',
                  medium: 'Medium confidence',
                  low: 'Low confidence',
                },
                factual: {
                  reviewedAt: 'Last review',
                  repoSignalAt: 'Repo signal',
                  repoSignalCommit: 'Commit',
                  repoSignalSource: 'Source',
                  latestDecisionAt: 'Mission decision',
                },
                buttons: {
                  apply: 'Apply proposal',
                  applying: 'Applying proposal...',
                },
              },
              actions: {
                kicker: 'Actions',
                title: 'Actions',
                subtitle: 'Action registry and instrumentation',
                emptyTitle: 'Actions pending',
                emptyBody:
                  'The action registry will appear here once the active domain exposes structured instrumentation.',
                status: {
                  proved: 'Proved',
                  documented: 'Documented',
                  needsCompletion: 'Needs completion',
                },
              },
              notifications: {
                briefCopied: 'Codex brief copied.',
                issueCopied: 'GitHub issue copied.',
                copyFailed: 'Unable to copy the workspace item.',
                githubUnavailable: 'No GitHub URL is available for this delegation.',
              },
            },
            codex: {
              runway: {
                label: 'Codex Ops clearance',
                title: 'Generated task plan',
                subtitle:
                  'Review the estimated task volume and live Ops readiness before dispatch.',
                status: {
                  sufficient: 'Ops ready',
                  insufficient: 'Ops blocked',
                },
                metrics: {
                  tasks: 'Tasks',
                  tasksBody: 'Generated from the active mission.',
                  required: 'Estimated units',
                  requiredBody: 'Estimated units for the current plan.',
                  available: 'Ops status',
                  availableBody: 'Live readiness from Owner Ops.',
                  remaining: 'Workflow',
                  remainingBody: 'GitHub Actions workflow selected by the backend.',
                  missing: 'Workflow',
                  missingBody: 'Fix the Ops readiness blocker before dispatch.',
                },
                ready: 'The mission can be dispatched directly from Mission Control.',
                blocked:
                  'Dispatch is blocked until Ops reports an enabled workflow and inserted key.',
              },
              tasks: {
                label: 'Generated tasks',
                title: '{{ count }} task(s) ready for the active mission',
                blocking: 'Blocking',
                units: '{{ count }} unit(s)',
                kinds: {
                  alignment: 'Alignment',
                  implementation: 'Implementation',
                  validation: 'Validation',
                  proof: 'Proof',
                },
              },
              notifications: {
                insufficientQuota: 'Ops readiness is blocking dispatch.',
              },
            },
          },
        },
      },
      true,
    );
    translate.use('en');
  });

  afterEach(() => {
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  it('renders summary counts from the QA matrix snapshot', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;

    expect(service.loadMatrix).toHaveBeenCalled();
    expect(missionDecisions.loadDecisions).toHaveBeenCalled();
    expect(root.querySelector('[data-og7-id="proved-domains"]')?.textContent).toContain('1');
    expect(root.querySelector('[data-og7-id="proof-gap-domains"]')?.textContent).toContain('1');
    expect(root.querySelector('[data-og7-id="product-work-domains"]')?.textContent).toContain('1');
    expect(root.querySelector('[data-og7-id="admin-quality-mission-sync"]')?.textContent).toContain(
      'Missions serveur',
    );
    expect(
      root.querySelector(
        '[data-og7="admin-quality-domain-icon"][data-og7-id="advanced-discovery"]',
      ),
    ).not.toBeNull();
  });

  it('keeps the hero status pills high contrast on the QA cockpit shell', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const matrixShell = root.querySelector('[data-og7="admin-quality-matrix"]') as HTMLElement;
    const heroBriefing = root.querySelector(
      '[data-og7="admin-quality-hero-briefing"]',
    ) as HTMLElement;
    const heroSummary = root.querySelector(
      '[data-og7="admin-quality-hero-summary"]',
    ) as HTMLElement;
    const generatedAt = root.querySelector(
      '[data-og7-id="admin-quality-generated-at"]',
    ) as HTMLElement;
    const sourceStatus = root.querySelector(
      '[data-og7-id="admin-quality-source-status"]',
    ) as HTMLElement;
    const missionSync = root.querySelector(
      '[data-og7-id="admin-quality-mission-sync"]',
    ) as HTMLElement;
    const missionSyncStatus = root.querySelector(
      '[data-og7-id="admin-quality-mission-sync-status"]',
    ) as HTMLElement;

    expect(matrixShell.className).toContain('px-4');
    expect(matrixShell.className).toContain('xl:px-8');
    expect(matrixShell.className).not.toContain('xl:px-0');
    expect(heroBriefing.className).not.toContain('absolute');
    expect(heroSummary.textContent).toContain('Chantiers');
    expect(heroSummary.textContent).toContain('Preuves');
    expect(heroSummary.textContent).toContain('Produit');
    expect(heroSummary.textContent).toContain('Signaux');
    expect(generatedAt.className).toContain('bg-slate-950/56');
    expect(generatedAt.className).toContain('text-white');
    expect(sourceStatus.className).toContain('text-white');
    expect(sourceStatus.className).toContain('shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]');
    expect(missionSync.className).toContain('bg-slate-950/56');
    expect(missionSync.className).toContain('text-white');
    expect(missionSyncStatus.className).toContain('text-white');
    expect(missionSyncStatus.className).toContain('shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]');
  });

  it('shows an explicit access denied message when the matrix endpoint returns 403', () => {
    service.loadMatrix.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden',
            error: { message: 'Forbidden' },
          }),
      ),
    );
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const errorBanner = root.querySelector('[data-og7-id="admin-quality-error"]');

    expect(errorBanner).not.toBeNull();
    expect(errorBanner?.textContent).toContain(
      'Acces refuse a la matrice QA. Connectez-vous avec un compte web Owner ou Admin.',
    );
  });

  it('shows a reconnect message when the matrix endpoint returns 401', () => {
    service.loadMatrix.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            statusText: 'Unauthorized',
            error: { message: 'Unauthorized' },
          }),
      ),
    );
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const errorBanner = root.querySelector('[data-og7-id="admin-quality-error"]');

    expect(errorBanner).not.toBeNull();
    expect(errorBanner?.textContent).toContain(
      'Session admin expiree. Reconnectez-vous puis relancez le recalcul de la matrice QA.',
    );
  });

  it('renders a compact workspace bar and opens the drawer on demand', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const mainCockpit = root.querySelector(
      '[data-og7="admin-quality-main-cockpit"]',
    ) as HTMLElement;
    const consoleRemote = root.querySelector(
      '[data-og7="admin-quality-console-remote"]',
    ) as HTMLElement;
    const consoleScreen = root.querySelector(
      '[data-og7="admin-quality-console-screen"]',
    ) as HTMLElement;
    const consoleMapBeacons = root.querySelectorAll<HTMLElement>(
      '[data-og7="admin-quality-console-map-beacon"]',
    );
    const consoleActions = root.querySelector('[data-og7="admin-quality-console-actions"]');
    const consoleActiveSurface = root.querySelector(
      '[data-og7-id="admin-quality-console-active-surface"]',
    );
    const consoleStage = root.querySelector(
      '[data-og7="admin-quality-console-stage"]',
    ) as HTMLElement;
    const surfaceStage = root.querySelector(
      '[data-og7="admin-quality-console-surface-stage"]',
    ) as HTMLElement;
    const consoleContextButton = root.querySelector(
      '[data-og7-id="admin-quality-console-context"]',
    ) as HTMLButtonElement;
    const consoleQueueButton = root.querySelector(
      '[data-og7-id="admin-quality-console-queue"]',
    ) as HTMLButtonElement;
    const workspaceBar = root.querySelector(
      '[data-og7="admin-quality-workspace-bar"]',
    ) as HTMLElement;
    const sidePanel = root.querySelector('[data-og7="admin-quality-side-panel"]') as HTMLElement;
    const aiPilotBlock = root.querySelector(
      '[data-og7="admin-quality-ai-pilot-block"]',
    ) as HTMLElement;
    const missionDeskButton = root.querySelector(
      '[data-og7-id="admin-quality-side-panel-open-mission"]',
    ) as HTMLButtonElement;
    const secondaryQueue = root.querySelector(
      '[data-og7="admin-quality-secondary-queue"]',
    ) as HTMLDetailsElement;
    const secondaryQueueScroller = secondaryQueue.querySelector('.og7-admin-quality-scrollbar');
    const secondaryQueueTitle = root.querySelector(
      '[data-og7="admin-quality-secondary-queue"] h2',
    ) as HTMLElement;

    expect(mainCockpit.className).toContain('xl:grid-cols-[minmax(0,1fr)_17rem]');
    expect(mainCockpit.className).toContain('2xl:grid-cols-[minmax(0,1fr)_18rem]');
    expect(consoleRemote).not.toBeNull();
    expect(consoleRemote.getAttribute('data-og7-layout')).toBe('command-deck');
    expect(consoleRemote.getAttribute('data-og7-density')).toBe('near-hud');
    expect(consoleRemote.className).toContain('p-1.5');
    expect(consoleScreen).not.toBeNull();
    expect(consoleScreen.className).toContain('p-1.5');
    expect(consoleMapBeacons.length).toBe(2);
    expect(consoleMapBeacons[0]?.className).toContain('og7-console-map-beacon');
    expect(consoleMapBeacons[0]?.getAttribute('data-og7-beat')).toBe('lead');
    expect(consoleMapBeacons[1]?.getAttribute('data-og7-beat')).toBe('echo');
    expect(getComputedStyle(consoleMapBeacons[0] as Element).animationName).toContain(
      'og7-console-map-heartbeat',
    );
    expect(consoleActions?.getAttribute('data-og7-layout')).toBe('command-grid');
    expect(consoleActiveSurface?.textContent).toContain('Contexte');
    expect(consoleStage.className).toContain('gap-3');
    expect(consoleStage.className).not.toContain('2xl:grid-cols');
    expect(surfaceStage).not.toBeNull();
    expect(root.querySelectorAll('[data-og7="admin-quality-secondary-queue"]').length).toBe(1);
    expect(consoleContextButton.getAttribute('aria-pressed')).toBe('true');
    expect(sidePanel.getAttribute('data-og7-visible')).toBe('true');
    expect(workspaceBar).not.toBeNull();
    expect(workspaceBar.getAttribute('data-og7-visible')).toBe('false');
    expect(workspaceBar.className).toContain('hidden');
    expect(aiPilotBlock.getAttribute('data-og7-visible')).toBe('false');
    expect(secondaryQueue).not.toBeNull();
    expect(secondaryQueue.closest('[data-og7="admin-quality-console-surface-stage"]')).toBe(
      surfaceStage,
    );
    expect(
      secondaryQueue.closest('[data-og7="admin-quality-scroll-section"][data-og7-id="coverage"]'),
    ).toBeNull();
    expect(secondaryQueue.open).toBeFalse();
    expect(secondaryQueue.getAttribute('data-og7-visible')).toBe('false');
    expect(secondaryQueueScroller).not.toBeNull();
    expect((secondaryQueueScroller as HTMLElement).className).toContain('overflow-auto');
    expect(secondaryQueue.className).toContain('bg-slate-950/58');
    expect(secondaryQueue.className).not.toContain('og7-admin-quality-surface');
    expect(secondaryQueue.className).not.toContain('bg-slate-50');
    expect(secondaryQueueTitle.className).toContain('text-white');
    expect(root.querySelector('[data-og7="admin-quality-workspace-drawer"]')).toBeNull();

    consoleQueueButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.activeConsoleSurface()).toBe('queue');
    expect(consoleActiveSurface?.textContent).toContain('Queue');
    expect(secondaryQueue.open).toBeTrue();
    expect(secondaryQueue.getAttribute('data-og7-visible')).toBe('true');
    expect(sidePanel.getAttribute('data-og7-visible')).toBe('true');

    consoleContextButton.click();
    fixture.detectChanges();

    missionDeskButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.activeConsoleSurface()).toBe('workspace');
    expect(fixture.componentInstance.activeWorkspaceSurface()).toBe('delegation');
    expect(workspaceBar.getAttribute('data-og7-visible')).toBe('true');
    expect(sidePanel.getAttribute('data-og7-visible')).toBe('true');

    const openWorkspaceButton = root.querySelector(
      '[data-og7-id="admin-quality-open-workspace"]',
    ) as HTMLButtonElement;
    openWorkspaceButton.click();
    fixture.detectChanges();

    const actionsTab = root.querySelector(
      '[data-og7-id="admin-quality-workspace-tab-actions"]',
    ) as HTMLButtonElement;
    const closeButton = root.querySelector(
      '[data-og7-id="admin-quality-workspace-close"]',
    ) as HTMLButtonElement;

    expect(root.querySelector('[data-og7="admin-quality-workspace-drawer"]')).not.toBeNull();
    expect(actionsTab.getAttribute('aria-selected')).toBe('false');

    actionsTab.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.activeWorkspaceSurface()).toBe('actions');

    closeButton.click();
    fixture.detectChanges();

    expect(root.querySelector('[data-og7="admin-quality-workspace-drawer"]')).toBeNull();
  });

  it('renders the compact coverage matrix and updates the delegation drawer when the active domain changes', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const matrix = root.querySelector('[data-og7="admin-quality-coverage-matrix"]');
    const rows = root.querySelectorAll('[data-og7="admin-quality-coverage-matrix-row"]');
    const signalLegend = root.querySelector(
      '[data-og7="admin-quality-coverage-matrix-signal-legend"]',
    );
    const dataDeck = root.querySelector('[data-og7="admin-quality-coverage-data"]') as HTMLElement;
    const legendToggle = root.querySelector(
      '[data-og7-id="admin-quality-coverage-matrix-legend-toggle"]',
    ) as HTMLButtonElement;
    const advancedRow = root.querySelector(
      '[data-og7="admin-quality-coverage-matrix-row"][data-og7-id="advanced-discovery"]',
    ) as HTMLButtonElement;
    const trustRow = root.querySelector(
      '[data-og7="admin-quality-coverage-matrix-row"][data-og7-id="trust-validation"]',
    ) as HTMLButtonElement;

    expect(matrix).not.toBeNull();
    expect(rows.length).toBe(3);
    expect(signalLegend).not.toBeNull();
    expect(dataDeck).not.toBeNull();
    expect(dataDeck.className).not.toContain('overflow-x-auto');
    expect(advancedRow.textContent).toContain('Recherche et decouverte profonde');
    expect(advancedRow.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(legendToggle.getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelector('[data-og7="admin-quality-coverage-matrix-legend"]')).toBeNull();
    expect(advancedRow.querySelectorAll('[data-og7-attention="true"]').length).toBeGreaterThan(0);
    expect(trustRow.querySelector('[data-og7-attention="true"]')).toBeNull();

    legendToggle.click();
    fixture.detectChanges();

    expect(legendToggle.getAttribute('aria-expanded')).toBe('true');
    expect(
      root.querySelectorAll('[data-og7="admin-quality-coverage-matrix-legend-item"]').length,
    ).toBe(6);

    trustRow.click();
    fixture.detectChanges();

    const openWorkspaceButton = root.querySelector(
      '[data-og7-id="admin-quality-open-workspace"]',
    ) as HTMLButtonElement;
    openWorkspaceButton.click();
    fixture.detectChanges();

    expect(
      root
        .querySelector(
          '[data-og7="admin-quality-coverage-matrix-row"][data-og7-id="trust-validation"]',
        )
        ?.getAttribute('data-og7-selected'),
    ).toBe('true');
    expect(
      root.querySelector('[data-og7="admin-quality-workspace-panel"][data-og7-id="delegation"]')
        ?.textContent,
    ).toContain('Renforcer la regression - Trust et validation');
  });

  it('filters rows by search term and E2E status', async () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const search = root.querySelector('[data-og7-id="admin-quality-search"]') as HTMLInputElement;

    search.value = 'map';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    let rows = root.querySelectorAll('[data-og7="admin-quality-row"]');
    expect(rows.length).toBe(1);
    expect(rows[0]?.getAttribute('data-og7-id')).toBe('advanced-discovery');

    search.value = '';
    search.dispatchEvent(new Event('input'));
    await selectAdminQualityComboboxOption(fixture, 'admin-quality-e2e-filter', 'oui');

    rows = root.querySelectorAll('[data-og7="admin-quality-row"]');
    expect(rows.length).toBe(1);
    expect(rows[0]?.getAttribute('data-og7-id')).toBe('trust-validation');
  });

  it('surfaces active filters as readable chips in the sticky rail', async () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const resetButton = root.querySelector(
      '[data-og7-id="admin-quality-reset-filters"]',
    ) as HTMLButtonElement;

    expect(root.querySelector('[data-og7="admin-quality-active-filters"]')).toBeNull();
    expect(root.textContent).toContain(
      'Aucun filtre actif. La vue montre tout le portefeuille QA.',
    );
    expect(resetButton.disabled).toBeTrue();

    await selectAdminQualityComboboxOption(
      fixture,
      'admin-quality-domain-filter',
      'Trust et validation',
    );

    const chips = root.querySelectorAll('[data-og7="admin-quality-active-filter"]');
    expect(chips.length).toBe(1);
    expect(chips[0]?.textContent).toContain('Domaine : Trust et validation');
    expect(resetButton.disabled).toBeFalse();
  });

  it('keeps the visible domain selected after filters replace the previous focus', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const trustRow = root.querySelector(
      '[data-og7="admin-quality-coverage-matrix-row"][data-og7-id="trust-validation"]',
    ) as HTMLButtonElement;
    const search = root.querySelector('[data-og7-id="admin-quality-search"]') as HTMLInputElement;

    trustRow.click();
    fixture.detectChanges();

    expect(
      root
        .querySelector('[data-og7="admin-quality-coverage-matrix-row"][data-og7-selected="true"]')
        ?.getAttribute('data-og7-id'),
    ).toBe('trust-validation');

    search.value = 'map';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(
      root
        .querySelector('[data-og7="admin-quality-coverage-matrix-row"][data-og7-selected="true"]')
        ?.getAttribute('data-og7-id'),
    ).toBe('advanced-discovery');

    search.value = '';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(
      root
        .querySelector('[data-og7="admin-quality-coverage-matrix-row"][data-og7-selected="true"]')
        ?.getAttribute('data-og7-id'),
    ).toBe('advanced-discovery');
  });

  it('shows an actions empty state in the workspace drawer when filters leave no visible domain', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const search = root.querySelector('[data-og7-id="admin-quality-search"]') as HTMLInputElement;
    const openWorkspaceButton = root.querySelector(
      '[data-og7-id="admin-quality-open-workspace"]',
    ) as HTMLButtonElement;

    search.value = 'zzz';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    openWorkspaceButton.click();
    fixture.detectChanges();

    const actionsTab = root.querySelector(
      '[data-og7-id="admin-quality-workspace-tab-actions"]',
    ) as HTMLButtonElement;
    actionsTab.click();
    fixture.detectChanges();

    expect(root.querySelector('[data-og7-id="admin-quality-empty"]')?.textContent).toContain(
      'Aucun domaine ne correspond aux filtres actifs.',
    );
    expect(root.querySelectorAll('[data-og7="admin-quality-workspace-action-item"]').length).toBe(
      0,
    );
    expect(
      root.querySelector('[data-og7="admin-quality-workspace-panel"][data-og7-id="actions"]')
        ?.textContent,
    ).toContain('Actions pending');
  });

  it('distinguishes active scope from global totals in the command rail', async () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const commandRail = root.querySelector('[data-og7="admin-quality-command-rail"]');
    const commandRailLayout = root.querySelector(
      '[data-og7="admin-quality-command-rail"] [data-og7-layout="compact-six"]',
    ) as HTMLElement;
    const commandRailCards = root.querySelectorAll(
      '[data-og7="admin-quality-command-rail"] [data-og7="admin-quality-summary"]',
    );

    expect(commandRail?.getAttribute('data-og7-density')).toBe('compact');
    expect(commandRailLayout.className).toContain('xl:grid-cols-6');
    expect(commandRailCards.length).toBe(6);
    expect(commandRailCards[0]?.getAttribute('data-og7-density')).toBe('compact');
    expect(root.querySelector('[data-og7-id="rail-heading"]')?.textContent).toContain(
      'Vue globale',
    );

    await selectAdminQualityComboboxOption(
      fixture,
      'admin-quality-domain-filter',
      'Trust et validation',
    );

    expect(root.querySelector('[data-og7-id="rail-heading"]')?.textContent).toContain(
      'Scope actif',
    );
    expect(root.querySelector('[data-og7-id="total-domains"]')?.textContent).toContain('Global 3');
    expect(root.querySelector('[data-og7-id="proved-domains"]')?.textContent).toContain('Global 1');
  });

  it('restores the last admin-quality console scope from localStorage', async () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();
    await fixture.whenStable();

    let root = fixture.nativeElement as HTMLElement;
    const openWorkspaceButton = root.querySelector(
      '[data-og7-id="admin-quality-open-workspace"]',
    ) as HTMLButtonElement;

    await selectAdminQualityComboboxOption(
      fixture,
      'admin-quality-domain-filter',
      'Observabilite et tracabilite',
    );

    openWorkspaceButton.click();
    fixture.detectChanges();

    const actionsTab = root.querySelector(
      '[data-og7-id="admin-quality-workspace-tab-actions"]',
    ) as HTMLButtonElement;
    actionsTab.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(JSON.parse(localStorage.getItem('og7.admin-quality.view-state.v1') ?? '{}')).toEqual(
      jasmine.objectContaining({
        selectedDomain: 'Observabilite et tracabilite',
        activeWorkspaceSurface: 'actions',
      }),
    );

    fixture.destroy();

    const restoredFixture = TestBed.createComponent(AdminQualityPage);
    restoredFixture.detectChanges();
    await restoredFixture.whenStable();
    restoredFixture.detectChanges();

    root = restoredFixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('[data-og7="admin-quality-coverage-matrix-row"]').length).toBe(1);
    expect(
      root
        .querySelector('[data-og7="admin-quality-coverage-matrix-row"][data-og7-selected="true"]')
        ?.getAttribute('data-og7-id'),
    ).toBe('observability');
    expect(restoredFixture.componentInstance.activeWorkspaceSurface()).toBe('actions');
    expect(root.querySelector('[data-og7="admin-quality-workspace-bar"]')?.textContent).toContain(
      'Actions',
    );
  });

  it('renders delegation content inside the workspace drawer and updates it when another row is selected', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const openWorkspaceButton = root.querySelector(
      '[data-og7-id="admin-quality-open-workspace"]',
    ) as HTMLButtonElement;
    openWorkspaceButton.click();
    fixture.detectChanges();

    expect(
      root.querySelector('[data-og7="admin-quality-workspace-panel"][data-og7-id="delegation"]'),
    ).not.toBeNull();
    expect(root.textContent).toContain('Etendre la preuve QA - Recherche et decouverte profonde');

    const trustRow = root.querySelector(
      '[data-og7="admin-quality-coverage-matrix-row"][data-og7-id="trust-validation"]',
    ) as HTMLButtonElement;
    trustRow.click();
    fixture.detectChanges();

    expect(root.textContent).toContain('Renforcer la regression - Trust et validation');
    expect(root.querySelector('[data-og7-id="admin-quality-open-issue"]')).not.toBeNull();
  });

  it('renders mission decisions in the HUD and moves the active mission to ready after approval', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const missionAccordion = root.querySelector(
      '[data-og7="admin-quality-accordion"][data-og7-id="mission-control"]',
    ) as HTMLDetailsElement;
    const missionAccordionToggle = root.querySelector(
      '[data-og7-id="admin-quality-accordion-toggle-mission-control"]',
    );
    const missionControl = root.querySelector('[data-og7="admin-quality-mission-control"]');
    const missionHero = root.querySelector('[data-og7="admin-quality-mission-hero"]');
    const missionHudBrief = root.querySelector('[data-og7="admin-quality-hud-mission-brief"]');
    const missionHudGapCard = root.querySelector('[data-og7-id="admin-quality-hud-gap-card"]');
    const missionHudSuggestedCard = root.querySelector(
      '[data-og7-id="admin-quality-hud-suggested-mission-card"]',
    );
    const missionHudConfidenceCard = root.querySelector(
      '[data-og7-id="admin-quality-hud-ai-confidence-card"]',
    );
    const missionWorkflow = root.querySelector('[data-og7="admin-quality-mission-workflow"]');
    const missionControlShell = root.querySelector(
      '[data-og7="admin-quality-mission-control-shell"]',
    );
    const consoleMissionActions = root.querySelector(
      '[data-og7="admin-quality-console-mission-actions"]',
    );
    const recommendations = root.querySelectorAll('[data-og7="admin-quality-recommendation"]');
    const recommendationButtons = root.querySelectorAll(
      '[data-og7="admin-quality-recommendation"] > button',
    ) as NodeListOf<HTMLButtonElement>;

    expect(missionAccordion).toBeNull();
    expect(missionAccordionToggle).toBeNull();
    expect(missionControl).toBeNull();
    expect(root.textContent).not.toContain('Surface avancee');
    expect(root.textContent).not.toContain('Mission control complet');
    expect(missionHero).toBeNull();
    expect(missionHudBrief).not.toBeNull();
    expect(missionHudBrief?.getAttribute('data-og7-layout')).toBe('strategic-brief');
    expect(missionHudGapCard?.textContent).toContain('Gap constate');
    expect(missionHudGapCard?.textContent).toContain('Une chaine cross-surface reste absente');
    expect(missionHudSuggestedCard?.textContent).toContain('Mission suggeree');
    expect(missionHudSuggestedCard?.textContent).toContain('Ajouter une chaine map vers feed');
    expect(missionHudConfidenceCard?.textContent).toContain('Confiance AI');
    expect(missionHudConfidenceCard?.textContent).toContain('72%');
    expect(missionWorkflow).toBeNull();
    expect(root.querySelector('[data-og7="admin-quality-local-state"]')).toBeNull();
    expect(missionHudBrief?.textContent).not.toContain('Valider mission');
    expect(missionHudBrief?.textContent).not.toContain('Lancer Codex');
    expect(missionHudBrief?.textContent).not.toContain('Differer');
    expect(consoleMissionActions).not.toBeNull();
    expect(consoleMissionActions?.textContent).toContain('Valider mission');
    expect(consoleMissionActions?.textContent).toContain('Lancer Codex');
    expect(consoleMissionActions?.textContent).toContain('Differer');
    expect(recommendations.length).toBe(0);
    expect(fixture.componentInstance.selectedMission()?.status).toBe('proposed');
    expect(consoleMissionActions?.textContent).toContain('En attente');
    expect(recommendationButtons.length).toBe(0);

    const updatedApproveButton = consoleMissionActions?.querySelector(
      '[data-og7-id="admin-quality-approve-mission"]',
    ) as HTMLButtonElement;
    expect(updatedApproveButton.closest('[data-og7="admin-quality-console-mission-actions"]')).toBe(
      consoleMissionActions,
    );
    const missionControlRadarSweep = root.querySelector(
      '[data-og7="admin-quality-mission-control-radar-sweep"]',
    );
    const missionControlContactLogCount = root.querySelector(
      '[data-og7="admin-quality-mission-control-contact-log-count"]',
    );
    const selectedMissionId = fixture.componentInstance.selectedMission()?.id;
    updatedApproveButton.click();
    fixture.detectChanges();

    const contactLogEntries = root.querySelectorAll(
      '[data-og7="admin-quality-mission-control-contact-log-entry"]',
    );
    const contactLogTimes = root.querySelectorAll(
      '[data-og7="admin-quality-mission-control-contact-log-time"]',
    );

    expect(fixture.componentInstance.selectedMission()?.status).toBe('approved');
    expect(consoleMissionActions?.textContent).toContain('Prete');
    expect(missionControlShell).toBeNull();
    expect(missionControlRadarSweep).toBeNull();
    expect(missionControlContactLogCount?.textContent).toContain('2 evenements');
    expect(contactLogEntries[0]?.getAttribute('data-og7-kind')).toBe('action');
    expect(contactLogEntries[0]?.getAttribute('data-og7-id')).toBe('mission');
    expect(contactLogEntries[0]?.getAttribute('data-og7-signal')).toBe('primary');
    expect(contactLogEntries[0]?.getAttribute('data-og7-age')).toBe('current');
    expect(contactLogTimes[0]?.textContent).toContain('T+0');
    expect(contactLogEntries[0]?.textContent).toContain('Latest action');
    expect(contactLogEntries[0]?.textContent).toContain('Approve');
    expect(contactLogEntries[0]?.textContent).toContain('now');
    expect(contactLogEntries[1]?.getAttribute('data-og7-age')).toBe('recent');
    expect(notifications.success).toHaveBeenCalledWith('Mission approuvee par un humain.', {
      source: 'admin-quality',
    });
    expect(missionDecisions.saveDecision).toHaveBeenCalledWith(
      jasmine.objectContaining({
        recommendationId: selectedMissionId,
        status: 'approved',
      }),
    );
  });

  it('generates mission tasks and shows Ops readiness for the active mission', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const runway = root.querySelector('[data-og7="admin-quality-codex-runway"]');
    const quotaStatus = root.querySelector('[data-og7-id="admin-quality-codex-quota-status"]');
    const generatedTasksSummary = root.querySelector('[data-og7="admin-quality-generated-tasks"]');
    const generatedTasks = root.querySelectorAll('[data-og7="admin-quality-generated-task"]');
    const generatedTaskKindSummaries = root.querySelectorAll(
      '[data-og7="admin-quality-generated-task-kind-summary"]',
    );
    const generatedTaskSummaryCount = root.querySelector(
      '[data-og7-id="admin-quality-generated-task-summary-count"]',
    );
    const generatedTaskSummaryUnits = root.querySelector(
      '[data-og7-id="admin-quality-generated-task-summary-units"]',
    );
    const generatedTaskSummaryBlocking = root.querySelector(
      '[data-og7-id="admin-quality-generated-task-summary-blocking"]',
    );
    const generatedTaskSummaryWorkflow = root.querySelector(
      '[data-og7-id="admin-quality-generated-task-summary-workflow"]',
    );
    const generatedTaskCount = root.querySelector(
      '[data-og7-id="admin-quality-generated-task-count"]',
    );
    const hudCodexLabels = root.querySelector('[data-og7="admin-quality-hud-codex-labels"]');
    const hudCodexUnits = root.querySelector('[data-og7-id="admin-quality-hud-codex-units"]');
    const hudCodexWorkflow = root.querySelector('[data-og7-id="admin-quality-hud-codex-workflow"]');
    const hudMissionBrief = root.querySelector('[data-og7="admin-quality-hud-mission-brief"]');
    const hudGapCard = root.querySelector('[data-og7-id="admin-quality-hud-gap-card"]');
    const hudSuggestedMissionCard = root.querySelector(
      '[data-og7-id="admin-quality-hud-suggested-mission-card"]',
    );
    const hudAiConfidenceCard = root.querySelector(
      '[data-og7-id="admin-quality-hud-ai-confidence-card"]',
    );
    const aiBay = root.querySelector('[data-og7="admin-quality-ai-bay"]');
    const missionLoop = root.querySelector('[data-og7="admin-quality-mission-loop"]');
    const missionLoopRail = root.querySelector('[data-og7="admin-quality-mission-loop-rail"]');
    const missionLoopSteps = root.querySelectorAll('[data-og7="admin-quality-mission-loop-step"]');
    const duplicateMissionEnergyLane = root.querySelector(
      '[data-og7="admin-quality-mission-energy-lane"]',
    );
    const missionHud = root.querySelector('[data-og7="admin-quality-mission-hud"]');
    const missionHudRadarStrip = root.querySelector(
      '[data-og7="admin-quality-hud-radar-strip"]',
    ) as HTMLElement;
    const missionHudRadarIndicators = root.querySelector(
      '[data-og7="admin-quality-hud-radar-indicators"]',
    ) as HTMLElement;
    const missionHudAmbientLayer = root.querySelector(
      '[data-og7="admin-quality-hud-ambient-layer"]',
    );
    const missionControlShell = root.querySelector(
      '[data-og7="admin-quality-mission-control-shell"]',
    );
    const missionControlRadar = root.querySelector(
      '[data-og7="admin-quality-mission-control-radar"]',
    );
    const missionControlRadarSweep = root.querySelector(
      '[data-og7="admin-quality-mission-control-radar-sweep"]',
    );
    const missionControlAcquisitionRings = root.querySelectorAll(
      '[data-og7="admin-quality-mission-control-radar-acquisition-ring"]',
    );
    const missionControlRadarTrails = root.querySelectorAll(
      '[data-og7="admin-quality-mission-control-radar-trail"]',
    );
    const missionControlRadarEndpoints = root.querySelectorAll(
      '[data-og7="admin-quality-mission-control-radar-trail-endpoint"]',
    );
    const missionControlRadarEchoes = root.querySelectorAll(
      '[data-og7="admin-quality-mission-control-radar-echo"]',
    );
    const missionControlSignature = root.querySelector(
      '[data-og7="admin-quality-mission-control-signature"]',
    );
    const missionControlContactLock = root.querySelector(
      '[data-og7="admin-quality-mission-control-contact-lock"]',
    );
    const missionControlContactLog = root.querySelector(
      '[data-og7="admin-quality-mission-control-contact-log"]',
    ) as HTMLElement;
    const missionHudContactLogShell = root.querySelector(
      '[data-og7="admin-quality-hud-contact-log-shell"]',
    );
    const missionControlContactLogCount = root.querySelector(
      '[data-og7="admin-quality-mission-control-contact-log-count"]',
    );
    const missionControlContactLogSignal = root.querySelector(
      '[data-og7="admin-quality-mission-control-contact-log-signal"]',
    );
    const contactLogEntries = root.querySelectorAll(
      '[data-og7="admin-quality-mission-control-contact-log-entry"]',
    );
    const coveragePanel = root.querySelector(
      '[data-og7="admin-quality-panel-shell"][data-og7-id="coverage"]',
    );
    const workspacePanel = root.querySelector('[data-og7="admin-quality-workspace-bar"]');
    const workspaceTabs = root.querySelector(
      '[data-og7="admin-quality-workspace-inspector-tabs"]',
    ) as HTMLElement;
    const workspaceTabButtons = root.querySelectorAll<HTMLElement>(
      '[data-og7="admin-quality-workspace-inspector-tabs"] [role="tab"]',
    );
    const cockpitSyncBands = root.querySelectorAll('[data-og7="admin-quality-cockpit-sync-band"]');
    const missionHudTimeline = root.querySelector(
      '[data-og7="admin-quality-hud-mission-timeline"]',
    ) as HTMLElement;
    const missionHudTimelineTrack = root.querySelector(
      '[data-og7="admin-quality-hud-timeline-track"][data-og7-layout="desktop"]',
    ) as HTMLElement;
    const missionHudTimelineSteps = missionHudTimelineTrack.querySelectorAll(
      '[data-og7="admin-quality-hud-timeline-step"]',
    );
    const missionHudTimelineConnectors = missionHudTimelineTrack.querySelectorAll(
      '[data-og7="admin-quality-hud-timeline-connector"]',
    );
    const missionHudActiveTimelineStep = root.querySelector(
      '[data-og7-id="admin-quality-hud-active-timeline-step"]',
    );
    const standaloneMissionTimeline = root.querySelector(
      '[data-og7-id="admin-quality-mission-timeline"]',
    );
    const consoleHudControls = root.querySelector(
      '[data-og7="admin-quality-console-hud-controls"]',
    ) as HTMLElement;
    const consoleModeGrid = root.querySelector(
      '[data-og7="admin-quality-console-actions"]',
    ) as HTMLElement;
    const consoleDeskActions = root.querySelector(
      '[data-og7="admin-quality-console-desk-actions"]',
    ) as HTMLElement;
    const consoleMissionActions = root.querySelector(
      '[data-og7="admin-quality-console-mission-actions"]',
    ) as HTMLElement;
    const workspaceHudChip = root.querySelector(
      '[data-og7-id="admin-quality-hud-section-workspace"]',
    ) as HTMLElement;
    const workspaceHudChipLabel = workspaceHudChip.querySelector('span:last-child') as HTMLElement;
    const hudToggle = root.querySelector('[data-og7-id="admin-quality-hud-toggle"]') as HTMLElement;
    const missionDeskAction = root.querySelector(
      '[data-og7-id="admin-quality-hud-open-workspace"]',
    ) as HTMLElement;
    const proofDeskAction = root.querySelector(
      '[data-og7-id="admin-quality-hud-open-actions"]',
    ) as HTMLElement;
    const proofTelemetry = root.querySelector('[data-og7="admin-quality-proof-telemetry"]');
    const sidePanel = root.querySelector('[data-og7="admin-quality-side-panel"]');
    const sidePanelEntry = root.querySelector('[data-og7-id="admin-quality-side-panel-entry"]');
    const sidePanelMission = root.querySelector('[data-og7-id="admin-quality-side-panel-mission"]');

    expect(runway).toBeNull();
    expect(missionHud).not.toBeNull();
    expect(missionHud?.getAttribute('data-og7-expanded')).toBe('true');
    expect(missionHud?.getAttribute('data-og7-ambient')).toBe('nominal');
    expect(missionHud?.getAttribute('data-og7-cockpit-tone')).toBe('codex');
    expect(missionHud?.getAttribute('data-og7-layout')).toBe('compact-radar-strip');
    expect((missionHud as HTMLElement).className).toContain('py-2.5');
    expect(missionHudRadarStrip.getAttribute('data-og7-layout')).toBe('radar-indicator');
    expect(missionHudRadarStrip.className).toContain('sm:pr-72');
    expect(missionHudRadarIndicators.closest('[data-og7="admin-quality-mission-hud"]')).toBe(
      missionHud,
    );
    expect(missionHudAmbientLayer).not.toBeNull();
    expect(missionControlShell).toBeNull();
    expect(missionControlRadar).toBeNull();
    expect(missionControlRadarSweep).toBeNull();
    expect(missionControlContactLogCount?.textContent).toContain('1 evenement');
    expect(missionControlContactLogSignal?.textContent).toContain('live pulse');
    expect(missionControlContactLog.getAttribute('data-og7-layout')).toBe('micro-rail');
    expect(missionControlContactLog.className).toContain('lg:grid-cols-2');
    expect(missionHudContactLogShell).not.toBeNull();
    expect(
      missionControlContactLog.closest('[data-og7="admin-quality-hud-contact-log-shell"]'),
    ).toBe(missionHudContactLogShell);
    expect(missionControlContactLog.closest('[data-og7="admin-quality-mission-hud"]')).toBe(
      missionHud,
    );
    expect(missionControlAcquisitionRings.length).toBe(0);
    expect(missionControlRadarTrails.length).toBe(0);
    expect(missionControlRadarEndpoints.length).toBe(0);
    expect(missionControlRadarEchoes.length).toBe(0);
    expect(missionControlSignature).toBeNull();
    expect(missionControlContactLock).toBeNull();
    expect(root.textContent).not.toContain('Radar statique');
    expect(contactLogEntries.length).toBe(1);
    expect(contactLogEntries[0]?.getAttribute('data-og7-kind')).toBe('lock');
    expect(contactLogEntries[0]?.getAttribute('data-og7-id')).toBe('coverage');
    expect(contactLogEntries[0]?.getAttribute('data-og7-state')).toBe('locked');
    expect(contactLogEntries[0]?.getAttribute('data-og7-reason')).toBe('section-pulse');
    expect(contactLogEntries[0]?.getAttribute('data-og7-signal')).toBe('pulse');
    expect(contactLogEntries[0]?.getAttribute('data-og7-age')).toBe('current');
    expect(
      root.querySelector('[data-og7="admin-quality-mission-control-contact-log-time"]')
        ?.textContent,
    ).toContain('T+0');
    expect(contactLogEntries[0]?.textContent).toContain('Latest lock');
    expect(contactLogEntries[0]?.textContent).toContain('Section pulse');
    expect(contactLogEntries[0]?.textContent).toContain('now');
    expect(contactLogEntries[0]?.textContent).toContain('Coverage matrix');
    expect(coveragePanel?.getAttribute('data-og7-lock-focus')).toBe('true');
    expect(missionControlShell).toBeNull();
    expect(workspacePanel?.getAttribute('data-og7-lock-focus')).toBe('false');
    expect(workspaceTabs.getAttribute('data-og7-layout')).toBe('vertical-list');
    expect(workspaceTabs.className).not.toContain('grid-cols-3');
    expect(workspaceTabButtons.length).toBe(3);
    expect(workspaceTabButtons[1]?.className).toContain('text-left');
    expect(cockpitSyncBands.length).toBe(1);
    expect(missionHud?.textContent).toContain('Etendre la preuve QA');
    expect(hudMissionBrief).not.toBeNull();
    expect(hudMissionBrief?.closest('[data-og7="admin-quality-mission-hud"]')).toBe(missionHud);
    expect(hudGapCard?.textContent).toContain('Gap constate');
    expect(hudSuggestedMissionCard?.textContent).toContain('Mission suggeree');
    expect(hudAiConfidenceCard?.textContent).toContain('Confiance AI');
    expect(hudAiConfidenceCard?.textContent).toContain('72%');
    expect(sidePanel).not.toBeNull();
    expect(sidePanel?.textContent).toContain('Contexte actif');
    expect(sidePanelEntry?.textContent).toContain('Recherche et decouverte profonde');
    expect(sidePanelMission).toBeNull();
    expect(missionHud?.textContent).toContain('Recherche et decouverte profonde');
    expect(hudCodexLabels).not.toBeNull();
    expect(hudCodexLabels?.closest('[data-og7="admin-quality-mission-hud"]')).toBe(missionHud);
    expect(generatedTaskCount?.textContent).toContain('8');
    expect(hudCodexUnits?.textContent).toContain('unites');
    expect(hudCodexWorkflow?.textContent).toContain('codex-pr.yml');
    expect(missionHudTimeline).not.toBeNull();
    expect(missionHudTimeline.closest('[data-og7="admin-quality-mission-hud"]')).toBe(missionHud);
    expect(missionHudTimeline.getAttribute('data-og7-layout')).toBe('embedded-compact');
    expect(missionHudTimeline.textContent).toContain('Timeline de la mission');
    expect(missionHudTimelineSteps.length).toBe(5);
    expect(missionHudTimelineConnectors.length).toBe(4);
    expect(missionHudTimelineSteps[0]?.getAttribute('data-og7-id')).toBe('analysis');
    expect(missionHudTimelineSteps[3]?.getAttribute('data-og7-id')).toBe('review');
    expect(missionHudActiveTimelineStep).not.toBeNull();
    expect(standaloneMissionTimeline).toBeNull();
    expect(consoleHudControls).not.toBeNull();
    expect(consoleModeGrid.getAttribute('data-og7-layout')).toBe('command-grid');
    expect(consoleMissionActions.getAttribute('data-og7-layout')).toBe('command-bar');
    expect(workspaceHudChip.closest('[data-og7="admin-quality-console-hud-controls"]')).toBe(
      consoleHudControls,
    );
    expect(workspaceHudChip.getAttribute('aria-label')).toBe('Workspace deck');
    expect(workspaceHudChipLabel.textContent).toContain('Workspace');
    expect(workspaceHudChipLabel.className).not.toContain('truncate');
    expect(workspaceHudChipLabel.className).toContain('text-[7px]');
    expect(hudToggle.closest('[data-og7="admin-quality-console-hud-controls"]')).toBe(
      consoleHudControls,
    );
    expect(missionDeskAction.closest('[data-og7="admin-quality-console-desk-actions"]')).toBe(
      consoleDeskActions,
    );
    expect(proofDeskAction.closest('[data-og7="admin-quality-console-desk-actions"]')).toBe(
      consoleDeskActions,
    );
    expect(missionDeskAction.closest('[data-og7="admin-quality-mission-hud"]')).toBeNull();
    expect(proofDeskAction.closest('[data-og7="admin-quality-mission-hud"]')).toBeNull();
    expect(root.querySelector('[data-og7="admin-quality-hud-expanded-panels"]')).toBeNull();
    expect(root.querySelector('[data-og7-id="admin-quality-hud-ops-status"]')).toBeNull();
    expect(root.querySelector('[data-og7-id="admin-quality-hud-proof-status"]')).toBeNull();
    expect(root.querySelector('[data-og7-id="admin-quality-hud-telemetry-status"]')).toBeNull();
    expect(root.querySelector('[data-og7-id="admin-quality-hud-required-units"]')).toBeNull();
    expect(missionLoop).toBeNull();
    expect(missionLoopRail).toBeNull();
    expect(missionLoopSteps.length).toBe(0);
    expect(duplicateMissionEnergyLane).toBeNull();
    expect(proofTelemetry).toBeNull();
    expect(
      root.querySelector('[data-og7-id="admin-quality-hud-proof-run"]')?.textContent,
    ).toContain('Run #51');
    expect(
      root.querySelector('[data-og7-id="admin-quality-hud-proof-artifacts"]')?.textContent,
    ).toContain('2 artifact(s)');
    expect(root.querySelector('[data-og7-id="admin-quality-hud-proof-pr"]')?.textContent).toContain(
      'PR #321',
    );
    expect(quotaStatus?.textContent).toContain('Ops ready');
    expect(generatedTasksSummary).toBeNull();
    expect(generatedTasks.length).toBe(0);
    expect(generatedTaskKindSummaries.length).toBe(0);
    expect(generatedTaskSummaryCount).toBeNull();
    expect(generatedTaskSummaryUnits).toBeNull();
    expect(generatedTaskSummaryBlocking).toBeNull();
    expect(generatedTaskSummaryWorkflow).toBeNull();
    expect(
      root.querySelector('[data-og7-id="admin-quality-codex-ops-status"]')?.textContent,
    ).toContain('Ops pret');
    expect(aiBay).toBeNull();
    expect(
      root.querySelector('[data-og7="admin-quality-mission-loop-step"][data-og7-id="dispatch"]'),
    ).toBeNull();
  });

  it('toggles the sticky mission HUD between expanded and compact modes', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const toggleButton = root.querySelector(
      '[data-og7-id="admin-quality-hud-toggle"]',
    ) as HTMLButtonElement;

    expect(root.querySelector('[data-og7="admin-quality-hud-expanded-panels"]')).toBeNull();
    expect(root.querySelector('[data-og7-id="admin-quality-hud-proof-run"]')).not.toBeNull();
    expect(root.querySelector('[data-og7-id="admin-quality-hud-proof-artifacts"]')).not.toBeNull();
    expect(root.querySelector('[data-og7-id="admin-quality-hud-proof-pr"]')).not.toBeNull();

    toggleButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.missionHudExpanded()).toBeFalse();
    expect(root.querySelector('[data-og7="admin-quality-hud-expanded-panels"]')).toBeNull();
    expect(root.querySelector('[data-og7-id="admin-quality-hud-proof-run"]')).toBeNull();
    expect(root.querySelector('[data-og7-id="admin-quality-hud-proof-artifacts"]')).toBeNull();
    expect(root.querySelector('[data-og7-id="admin-quality-hud-proof-pr"]')).toBeNull();
    expect(root.querySelector('[data-og7="admin-quality-hud-mission-brief"]')).not.toBeNull();
    expect(
      root.querySelector('[data-og7-id="admin-quality-hud-suggested-mission-card"]')?.textContent,
    ).toContain('Mission suggeree');
    expect(
      root
        .querySelector('[data-og7="admin-quality-mission-hud"]')
        ?.getAttribute('data-og7-expanded'),
    ).toBe('false');
    expect(root.querySelector('[data-og7-id="admin-quality-hud-summary"]')?.textContent).toContain(
      'Ops pret',
    );
  });

  it('avoids exposing a 0s telemetry sweep boundary', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.aiOpsSecurityStatus.set('ready');
    component.aiOpsSecurityRefreshing.set(false);
    component.aiOpsSecurityDegraded.set(false);
    component.aiOpsLastSuccessfulRefreshAt.set(1_000);
    component.aiOpsLiveNow.set(31_000);

    expect(component.selectedAiTelemetryDetail()).toContain('Next sweep pending');
    expect(component.selectedAiTelemetryDetail()).not.toContain('Next sweep in 0s');
  });

  it('surfaces an explicit local AI key note in the sticky mission HUD', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    const adminOps = TestBed.inject(AdminOpsService) as unknown as AdminOpsServiceMock;

    adminOps.getSecurity.and.returnValue(
      of({
        generatedAt: '2026-04-30T00:00:00.000Z',
        users: {
          total: 3,
          blocked: 0,
          registrationsLast7d: 1,
        },
        sessions: {
          scannedUsers: 3,
          truncated: false,
          active: 1,
          revoked: 0,
          usersWithActiveSessions: 1,
        },
        uploads: {
          safetyEnabled: true,
          maxFileSizeBytes: 5242880,
          allowedMimeTypes: ['image/png'],
        },
        auth: {
          sessionIdleTimeoutMs: 43200000,
        },
        aiKeys: [
          {
            provider: 'codex',
            label: 'Codex',
            workflow: 'codex-pr.yml',
            secretName: 'OPENAI_API_KEY',
            dispatchEnabled: true,
            keyInserted: true,
            state: 'offline',
            note: 'Local OPENAI_API_KEY detected in Strapi env for development, but GitHub dispatch still requires the repository secret OPENAI_API_KEY.',
          },
          {
            provider: 'copilot',
            label: 'GitHub Copilot',
            workflow: 'copilot-pr.yml',
            secretName: null,
            dispatchEnabled: false,
            keyInserted: false,
            state: 'unsupported',
            note: 'No stable ignition key is wired for this console yet.',
          },
          {
            provider: 'claude',
            label: 'Claude',
            workflow: 'claude-pr.yml',
            secretName: 'ANTHROPIC_API_KEY',
            dispatchEnabled: true,
            keyInserted: true,
            state: 'ready',
            note: 'Key detected in GitHub Actions secrets. The engine bay is armed and ready for dispatch.',
          },
          {
            provider: 'gemini',
            label: 'Gemini',
            workflow: 'gemini-pr.yml',
            secretName: 'GEMINI_API_KEY',
            dispatchEnabled: false,
            keyInserted: false,
            state: 'offline',
            note: 'Insert GEMINI_API_KEY into GitHub Actions secrets to power this module. For local development, you can also set GEMINI_API_KEY in strapi/.env.',
          },
        ],
        moderation: {
          pendingCompanies: 0,
          suspendedCompanies: 0,
        },
      }),
    );

    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;

    expect(
      root.querySelector('[data-og7-id="admin-quality-codex-ops-status"]')?.textContent,
    ).toContain('Cle locale');
    expect(root.querySelector('[data-og7-id="admin-quality-hud-ops-detail"]')).toBeNull();
  });

  it('opens the workspace directly from the console remote desk actions', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const proofDeskButton = root.querySelector(
      '[data-og7-id="admin-quality-hud-open-actions"]',
    ) as HTMLButtonElement;

    proofDeskButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.workspaceOpen()).toBeTrue();
    expect(fixture.componentInstance.activeWorkspaceSurface()).toBe('actions');
    expect(root.querySelector('[data-og7="admin-quality-workspace-drawer"]')).not.toBeNull();
  });

  it('recalculates the matrix, reloads the snapshot, and renders the focus summary', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const button = root.querySelector(
      '[data-og7-id="admin-quality-recalculate-matrix"]',
    ) as HTMLButtonElement;

    button.click();
    fixture.detectChanges();

    const summary = root.querySelector('[data-og7="admin-quality-matrix-recalculation-summary"]');
    const focus = root.querySelector(
      '[data-og7="admin-quality-matrix-recalculation-focus"][data-og7-id="advanced-discovery"]',
    );
    const backlog = root.querySelector('[data-og7="admin-quality-matrix-pilot-backlog"]');

    expect(service.loadMatrix).toHaveBeenCalledTimes(2);
    expect(service.recalculateMatrix).toHaveBeenCalledWith('refresh-required', null);
    expect(summary?.textContent).toContain('Recalcul matrice');
    expect(summary?.textContent).toContain('Propositions');
    expect(backlog?.textContent).toContain('Backlog pilote par la matrice');
    expect(backlog?.textContent).toContain('Recherche et decouverte profonde');
    expect(backlog?.textContent).toContain('Cloturer la ligne');
    expect(focus?.textContent).toContain('Synthese');
    expect(focus?.textContent).toContain('Metier');
    expect(focus?.textContent).toContain('non -> oui');
    expect(focus?.textContent).toContain('partiel -> oui');
    expect(focus?.textContent).toContain('Implementation');
    expect(focus?.textContent).toContain('Pilotage developpement');
    expect(focus?.textContent).toContain('A lancer maintenant');
    expect(focus?.textContent).toContain('Score 100/100');
    expect(focus?.textContent).toContain('Cloturer la ligne');
    expect(focus?.textContent).toContain('Recommandations');
    expect(notifications.success).toHaveBeenCalledWith(
      'Plan QA genere: 1 entree(s) analysee(s), 1 a piloter, 1 proposition(s), 0 blocage(s).',
      { source: 'admin-quality' },
    );
  });

  it('recalculates the selected entry when the scoped selector targets the active row', async () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const button = root.querySelector(
      '[data-og7-id="admin-quality-recalculate-matrix"]',
    ) as HTMLButtonElement;

    await selectAdminQualityComboboxOption(
      fixture,
      'admin-quality-recalculate-scope',
      'selected-entry',
    );
    button.click();

    expect(service.recalculateMatrix).toHaveBeenCalledWith('selected-entry', 'advanced-discovery');
  });

  it('renders readable recalculation scope options inside the dark admin shell', async () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const trigger = queryByDataOg7Id<HTMLButtonElement>(
      root,
      'admin-quality-recalculate-scope',
      '[data-og7="admin-quality-combobox"]',
    );

    expect(trigger).not.toBeNull();
    expect(trigger?.tagName).toBe('BUTTON');
    expect(trigger?.className).toContain('bg-[#0c1729]');
    trigger?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const listbox = queryByDataOg7Id<HTMLElement>(
      document.body,
      'admin-quality-recalculate-scope-listbox',
      '[data-og7="admin-quality-combobox-listbox"]',
    );
    const options = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>(
        '[data-og7="admin-quality-combobox-option"]',
      ),
    ).filter((option) =>
      option.getAttribute('data-og7-id')?.startsWith('admin-quality-recalculate-scope-'),
    );

    expect(listbox).not.toBeNull();
    expect(listbox?.className).toContain('bg-[linear-gradient');
    expect(listbox?.className).toContain('text-slate-100');
    expect(options.map((option) => option.querySelector('span')?.textContent?.trim())).toEqual([
      'Entrees a piloter',
      'Entree active',
      'Toute la matrice',
    ]);
  });

  it('surfaces the first construction priorities without filters or search', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const buildNow = root.querySelector('[data-og7="admin-quality-build-now"]');
    const primary = root.querySelector('[data-og7="admin-quality-next-best-action"]');
    const groups = root.querySelector('[data-og7="admin-quality-build-now-groups"]');
    const items = Array.from(
      root.querySelectorAll<HTMLElement>('[data-og7="admin-quality-build-now-item"]'),
    );

    expect(buildNow?.textContent).toContain('A construire maintenant');
    expect(primary?.textContent).toContain(
      'Produire la preuve sur Recherche et decouverte profonde',
    );
    expect(primary?.textContent).toContain('La matrice recommande de produire la preuve');
    expect(groups?.textContent).toContain('A construire');
    expect(groups?.textContent).toContain('A prouver');
    expect(groups?.textContent).toContain('1');
    expect(items.length).toBe(2);
    expect(items[0].dataset['og7Id']).toBe('advanced-discovery');
    expect(items[0].textContent).toContain('Produire la preuve');
    expect(items[0].textContent).toContain('Haute priorite');
    expect(items[0].textContent).toContain('Preuve manquante');
    expect(items[0].textContent).toContain('Automatisable');
    expect(items[0].textContent).toContain('Ajouter une chaine map vers feed');
    expect(items[1].dataset['og7Id']).toBe('observability');
    expect(items[1].textContent).toContain('Construire la surface');
    expect(items[1].textContent).toContain('Decision humaine');

    (
      items[0].querySelector('[data-og7-id="admin-quality-build-now-open"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedEntry()?.id).toBe('advanced-discovery');
    expect(fixture.componentInstance.workspaceOpen()).toBeTrue();
    expect(fixture.componentInstance.activeWorkspaceSurface()).toBe('delegation');

    (
      items[0].querySelector('[data-og7-id="admin-quality-build-now-plan"]') as HTMLButtonElement
    ).click();
    expect(fixture.componentInstance.matrixRecalculationScope()).toBe('selected-entry');
    expect(service.recalculateMatrix).toHaveBeenCalledWith('selected-entry', 'advanced-discovery');

    (
      items[0].querySelector(
        '[data-og7-id="admin-quality-build-now-create-mission"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.missionDecisions()['advanced-discovery::core']).toBe(
      'approved',
    );
    expect(fixture.componentInstance.selectedMission()?.id).toBe('advanced-discovery::core');
    expect(fixture.componentInstance.missionHudActiveSection()).toBe('mission');
    expect(missionDecisions.saveDecision).toHaveBeenCalledWith(
      jasmine.objectContaining({
        recommendationId: 'advanced-discovery::core',
        entryId: 'advanced-discovery',
        status: 'approved',
      }),
    );
  });

  it('applies the selected recalculation proposal from the workspace drawer and reruns the recalculation silently', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const recalcButton = root.querySelector(
      '[data-og7-id="admin-quality-recalculate-matrix"]',
    ) as HTMLButtonElement;

    recalcButton.click();
    fixture.componentInstance.openWorkspace('delegation');
    fixture.detectChanges();

    const applyButton = root.querySelector(
      '[data-og7-id="admin-quality-apply-proposal"]',
    ) as HTMLButtonElement;

    applyButton.click();

    expect(service.applyMatrixProposal).toHaveBeenCalledWith('advanced-discovery');
    expect(service.loadMatrix).toHaveBeenCalledTimes(3);
    expect(service.recalculateMatrix).toHaveBeenCalledTimes(2);
    expect(notifications.success).toHaveBeenCalledWith(
      'Proposition appliquee pour Recherche et decouverte profonde.',
      { source: 'admin-quality' },
    );
  });

  it('opens the delegation drawer from a clicked coverage signal, lets the operator edit the brief, and records the delegation trace', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const row = root.querySelector(
      '[data-og7="admin-quality-coverage-matrix-row"][data-og7-id="advanced-discovery"]',
    ) as HTMLElement;
    const e2eSignal = row.querySelector(
      '[data-og7="admin-quality-coverage-signal"][data-og7-id="e2e"]',
    ) as HTMLElement;

    e2eSignal.click();
    fixture.detectChanges();

    const drawer = root.querySelector('[data-og7="admin-quality-workspace-drawer"]');
    const signalContext = root.querySelector(
      '[data-og7="admin-quality-workspace-signal-context"][data-og7-id="e2e"]',
    );
    const promptEditor = root.querySelector(
      '[data-og7-id="admin-quality-codex-prompt-editor"]',
    ) as HTMLTextAreaElement;
    const recommendationsEditor = root.querySelector(
      '[data-og7-id="admin-quality-recommendations-editor"]',
    ) as HTMLTextAreaElement;
    const launchButton = root.querySelector(
      '[data-og7-id="admin-quality-confirm-dispatch"]',
    ) as HTMLButtonElement;

    expect(fixture.componentInstance.workspaceOpen()).toBeTrue();
    expect(fixture.componentInstance.activeWorkspaceSurface()).toBe('delegation');
    expect(fixture.componentInstance.selectedSignalContext()?.signalId).toBe('e2e');
    expect(drawer).not.toBeNull();
    expect(signalContext).not.toBeNull();
    expect(promptEditor.value).toContain('Signal focus: E - End-to-end');
    expect(recommendationsEditor.value).toContain('Tu devrais demander une preuve executable');

    recommendationsEditor.value =
      'Keep the matrix partial until stronger proof exists.\nWait until the product scope expands.';
    recommendationsEditor.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    promptEditor.value = 'Operator override brief';
    promptEditor.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    launchButton.click();
    fixture.detectChanges();

    expect(opsService.dispatchCodexWorkflow).toHaveBeenCalledWith({
      provider: 'codex',
      task: 'Operator override brief',
      scope: 'openg7-org',
      baseBranch: 'main',
      draftPr: true,
      model: 'gpt-5.4',
      effort: null,
    });
    expect(launchButton.disabled).toBeTrue();
    expect(fixture.componentInstance.selectedSignalDispatchReady()).toBeFalse();
    expect(
      root.querySelector('[data-og7-id="admin-quality-dispatch-blocked"]')?.textContent,
    ).toContain(
      "Le bouton reste verrouille jusqu'a reception d'une confirmation serveur plus recente",
    );
    expect(notifications.info).toHaveBeenCalledWith('Codex queued via codex-pr.yml on main.', {
      source: 'admin-quality',
    });
    expect(missionDecisions.saveDecision).toHaveBeenCalled();
    const signalGuidanceCall = missionDecisions.saveDecision.calls
      .allArgs()
      .map(([input]) => input)
      .find(
        (input) =>
          input.recommendationId === 'advanced-discovery::signal-guidance::e2e' &&
          Array.isArray(input.metadata.recommendations),
      );
    expect(signalGuidanceCall?.metadata.recommendations).toEqual([
      'Keep the matrix partial until stronger proof exists.',
      'Wait until the product scope expands.',
    ]);
    expect(
      root.querySelector(
        '[data-og7="admin-quality-coverage-delegation-trace"][data-og7-id="advanced-discovery"]',
      )?.textContent,
    ).toContain('Derniere delegation: E via Codex');
  });

  it('updates the sticky mission HUD active section when a console remote chip is selected', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const workspaceChip = root.querySelector(
      '[data-og7-id="admin-quality-hud-section-workspace"]',
    ) as HTMLButtonElement;
    const contactLock = root.querySelector(
      '[data-og7="admin-quality-mission-control-contact-lock"]',
    );
    const contactLog = () =>
      Array.from(
        root.querySelectorAll('[data-og7="admin-quality-mission-control-contact-log-entry"]'),
      );
    const workspacePanel = root.querySelector('[data-og7="admin-quality-workspace-bar"]');
    const coveragePanel = root.querySelector(
      '[data-og7="admin-quality-panel-shell"][data-og7-id="coverage"]',
    );
    const missionControlContactLogCount = root.querySelector(
      '[data-og7="admin-quality-mission-control-contact-log-count"]',
    );
    const contactLogTimes = () =>
      Array.from(
        root.querySelectorAll('[data-og7="admin-quality-mission-control-contact-log-time"]'),
      );

    workspaceChip.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.missionHudActiveSection()).toBe('workspace');
    expect(
      root.querySelector('[data-og7-id="admin-quality-hud-active-section-label"]')?.textContent,
    ).toContain('Workspace deck');
    expect(workspaceChip.getAttribute('data-og7-active')).toBe('true');
    expect(workspaceChip.getAttribute('data-og7-pulse')).toBe('true');
    expect(contactLock).toBeNull();
    expect(contactLog().length).toBe(2);
    expect(contactLog()[0]?.getAttribute('data-og7-id')).toBe('workspace');
    expect(contactLog()[0]?.getAttribute('data-og7-kind')).toBe('lock');
    expect(contactLog()[0]?.getAttribute('data-og7-state')).toBe('acquiring');
    expect(contactLog()[0]?.getAttribute('data-og7-reason')).toBe('manual-targeting');
    expect(contactLog()[0]?.getAttribute('data-og7-signal')).toBe('manual');
    expect(contactLog()[0]?.textContent).toContain('Latest lock');
    expect(contactLog()[0]?.textContent).toContain('Manual targeting');
    expect(contactLogTimes()[0]?.textContent).toContain('T+0');
    expect(contactLogTimes()[1]?.textContent).toContain('T-1');
    expect(contactLog()[0]?.getAttribute('data-og7-age')).toBe('current');
    expect(contactLog()[1]?.getAttribute('data-og7-age')).toBe('recent');
    expect(contactLog()[0]?.textContent).toContain('Workspace deck');
    expect(missionControlContactLogCount?.textContent).toContain('2 evenements');
    expect(contactLog()[1]?.getAttribute('data-og7-id')).toBe('coverage');
    expect(contactLog()[1]?.getAttribute('data-og7-state')).toBe('locked');
    expect(workspacePanel?.getAttribute('data-og7-lock-focus')).toBe('true');
    expect(coveragePanel?.getAttribute('data-og7-lock-focus')).toBe('false');

    (contactLog()[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.missionHudActiveSection()).toBe('coverage');
    expect(contactLog().length).toBe(3);
    expect(contactLog()[0]?.getAttribute('data-og7-id')).toBe('coverage');
    expect(contactLog()[0]?.getAttribute('data-og7-reason')).toBe('manual-targeting');
    expect(contactLog()[0]?.textContent).toContain('Manual targeting');
    expect(contactLog()[2]?.getAttribute('data-og7-age')).toBe('stale');
    expect(contactLogTimes()[2]?.textContent).toContain('T-2');
    expect(missionControlContactLogCount?.textContent).toContain('3 evenements');
    expect(coveragePanel?.getAttribute('data-og7-lock-focus')).toBe('true');
  });

  it('keeps provider readiness compact in the HUD after removing socket details', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const handoff = root.querySelector('[data-og7="admin-quality-provider-ops-handoff"]');
    const activeSocket = root.querySelector('[data-og7-id="admin-quality-provider-active-socket"]');
    const opsLink = root.querySelector('[data-og7-id="admin-quality-open-provider-sockets"]');
    const quotaStatus = root.querySelector('[data-og7-id="admin-quality-codex-quota-status"]');
    const opsStatus = root.querySelector('[data-og7-id="admin-quality-codex-ops-status"]');

    expect(root.querySelector('[data-og7="admin-quality-provider-comparison"]')).toBeNull();
    expect(root.querySelector('[data-og7="admin-quality-provider-comparison-rail"]')).toBeNull();
    expect(
      root.querySelectorAll('[data-og7="admin-quality-provider-comparison-card"]').length,
    ).toBe(0);
    expect(handoff).toBeNull();
    expect(activeSocket).toBeNull();
    expect(opsLink).toBeNull();
    expect(quotaStatus?.textContent).toContain('Ops ready');
    expect(opsStatus?.textContent).toContain('Ops pret');
  });

  it('blocks delegation when Ops readiness does not allow dispatch', () => {
    opsService.getSecurity.and.returnValue(
      of({
        aiKeys: [
          {
            provider: 'codex',
            label: 'Codex',
            workflow: 'codex-pr.yml',
            secretName: 'OPENAI_API_KEY',
            dispatchEnabled: false,
            keyInserted: true,
            state: 'ready',
            note: 'Key detected. The engine bay stays in standby until dispatch is enabled.',
          },
        ],
      }),
    );

    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const consoleMissionActions = root.querySelector(
      '[data-og7="admin-quality-console-mission-actions"]',
    );
    const delegateButton = Array.from(
      consoleMissionActions?.querySelectorAll('[data-og7="action"]') ?? [],
    ).find((element) => element.textContent?.includes('Lancer Codex')) as
      | HTMLButtonElement
      | undefined;
    const quotaStatus = root.querySelector('[data-og7-id="admin-quality-codex-quota-status"]');

    expect(fixture.componentInstance.selectedAiDispatchReady()).toBeFalse();
    expect(quotaStatus?.textContent).toContain('Ops blocked');
    expect(delegateButton?.disabled).toBeFalse();
    expect(delegateButton?.getAttribute('aria-disabled')).toBe('true');

    delegateButton?.click();
    fixture.detectChanges();

    expect(quotaStatus?.closest('[data-og7="admin-quality-hud-codex-labels"]')).not.toBeNull();
    expect(root.querySelector('[data-og7="admin-quality-codex-runway"]')).toBeNull();
    expect(notifications.error).toHaveBeenCalledWith(
      jasmine.stringContaining('OPS_CODEX_DISPATCH_ENABLED=true'),
      jasmine.objectContaining({ source: 'admin-quality' }),
    );
    expect(opsService.dispatchCodexWorkflow).not.toHaveBeenCalled();
    expect(fixture.componentInstance.selectedMission()?.status).toBe('proposed');
  });

  it('uses the selected provider Ops module to arm or constrain dispatch', async () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const quotaStatus = root.querySelector('[data-og7-id="admin-quality-codex-quota-status"]');
    const aiBay = root.querySelector('[data-og7="admin-quality-ai-bay"]');
    const providerHandoff = root.querySelector('[data-og7="admin-quality-provider-ops-handoff"]');
    const activeSocket = () =>
      root.querySelector('[data-og7-id="admin-quality-provider-active-socket"]');
    const missionControlShell = root.querySelector(
      '[data-og7="admin-quality-mission-control-shell"]',
    );
    const missionControlSignature = root.querySelector(
      '[data-og7="admin-quality-mission-control-signature"]',
    );
    const missionHud = root.querySelector('[data-og7="admin-quality-mission-hud"]');

    expect(fixture.componentInstance.selectedAiDispatchReady()).toBeTrue();
    expect(quotaStatus?.textContent).toContain('Ops ready');
    expect(aiBay).toBeNull();
    expect(providerHandoff).toBeNull();
    expect(activeSocket()).toBeNull();
    expect(missionControlShell).toBeNull();
    expect(missionHud?.getAttribute('data-og7-cockpit-tone')).toBe('codex');
    expect(missionControlSignature).toBeNull();

    await selectAdminQualityComboboxOption(fixture, 'admin-quality-ai-provider', 'copilot');

    expect(fixture.componentInstance.selectedAiProvider()).toBe('copilot');
    expect(fixture.componentInstance.selectedAiDispatchReady()).toBeFalse();
    expect(quotaStatus?.textContent).toContain('Ops blocked');
    expect(activeSocket()).toBeNull();

    await selectAdminQualityComboboxOption(fixture, 'admin-quality-ai-provider', 'claude');

    expect(fixture.componentInstance.selectedAiProvider()).toBe('claude');
    expect(fixture.componentInstance.selectedAiDispatchReady()).toBeTrue();
    expect(quotaStatus?.textContent).toContain('Ops ready');
    expect(missionControlShell).toBeNull();
    expect(missionHud?.getAttribute('data-og7-cockpit-tone')).toBe('claude');
    expect(root.querySelector('[data-og7="admin-quality-mission-control-signature"]')).toBeNull();
  });

  it('dispatches the selected mission directly from Mission Control when delegation starts', () => {
    const confirmSpy = spyOn(TestBed.inject(AdminQualityBrowserService), 'confirm').and.returnValue(
      true,
    );
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const consoleMissionActions = root.querySelector(
      '[data-og7="admin-quality-console-mission-actions"]',
    );
    const delegateButton = Array.from(
      consoleMissionActions?.querySelectorAll('[data-og7="action"]') ?? [],
    ).find((element) => element.textContent?.includes('Lancer Codex')) as
      | HTMLButtonElement
      | undefined;

    delegateButton?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedMission()?.status).toBe('in-progress');
    expect(confirmSpy).toHaveBeenCalledWith(jasmine.stringContaining('Lancer Codex'));
    expect(missionDecisions.saveDecision).toHaveBeenCalledWith(
      jasmine.objectContaining({
        recommendationId: 'advanced-discovery::core',
        status: 'in-progress',
      }),
    );
    expect(opsService.dispatchCodexWorkflow).toHaveBeenCalledWith({
      provider: 'codex',
      task: jasmine.stringContaining('Recherche et decouverte profonde'),
      scope: 'openg7-org',
      baseBranch: 'main',
      draftPr: true,
      model: 'gpt-5.4',
      effort: null,
    });
    expect(notifications.info).toHaveBeenCalledWith('Codex queued via codex-pr.yml on main.', {
      source: 'admin-quality',
    });
    expect(
      root.querySelector('[data-og7="admin-quality-mission-loop-step"][data-og7-id="dispatch"]'),
    ).toBeNull();
    expect(root.querySelector('[data-og7="admin-quality-mission-energy-lane"]')).toBeNull();
    expect(
      root.querySelector('[data-og7="admin-quality-mission-loop-step"][data-og7-id="proof"]'),
    ).toBeNull();
  });

  it('marks a matrix row as refresh-required when a completed mission is newer than the last review', () => {
    missionDecisions.loadDecisions.and.returnValue(
      of<AdminQualityMissionDecisionSnapshot>({
        generatedAt: '2026-05-02T12:00:00.000Z',
        decisions: [
          {
            recommendationId: 'trust-validation::governance',
            entryId: 'trust-validation',
            kind: 'governance',
            status: 'done',
            title: 'Boucler la gouvernance de mission',
            message: 'Mission cloturee apres merge sur main.',
            operatorPrompt: 'Refresh matrix after merge.',
            metadata: {},
            decidedByUserId: '42',
            createdAt: '2026-05-02T11:00:00.000Z',
            updatedAt: '2026-05-02T12:00:00.000Z',
          },
        ],
      }),
    );

    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const trustEntry = component.entries().find((entry) => entry.id === 'trust-validation');

    expect(trustEntry).toBeTruthy();
    expect(component.entryNeedsMatrixRefresh(trustEntry!)).toBeTrue();
    expect(component.readinessLabel(trustEntry!)).toBe('Refresh matrice');
    expect(root.textContent).toContain('Refresh matrice');
  });

  it('marks a matrix row as refresh-required when a merge signal is newer than the last review', () => {
    service.loadMatrix.and.returnValue(
      of<AdminQualityMatrixSnapshot>({
        generatedAt: '2026-05-02T12:00:00.000Z',
        sourceStatus: 'fresh',
        sourceMessage: null,
        entries: [
          {
            id: 'trust-validation',
            domain: 'Trust et validation',
            need: 'Historiser les decisions de confiance.',
            summaryStatus: 'oui',
            businessStatus: 'oui',
            implementationStatus: 'oui',
            e2eStatus: 'oui',
            priority: 'moyenne',
            managementBucket: 'covered',
            needsProductWorkFirst: false,
            observedGap: 'Le flux critique est deja prouve.',
            nextMove: 'Maintenir la regression existante.',
            evidence: ['e2e/admin-trust-visibility.spec.ts'],
            reviewedAt: '2026-04-07',
            repoSignalAt: '2026-05-02T12:00:00.000Z',
            repoSignalCommit: 'abc123def456',
            repoSignalSource: 'github-actions',
            repoSignalSummary: 'targeted sync after merge to main',
            signalDispatch: {},
          },
        ],
      }),
    );

    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const trustEntry = component.entries().find((entry) => entry.id === 'trust-validation');

    expect(trustEntry).toBeTruthy();
    expect(component.entryNeedsMatrixRefresh(trustEntry!)).toBeTrue();
    expect(component.readinessLabel(trustEntry!)).toBe('Refresh matrice');
    expect(root.textContent).toContain('Refresh matrice');
  });

  it('selects the next mission after closing the current one without keeping stale signal dispatch armed', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const entry = component.selectedEntry();

    expect(entry?.id).toBe('advanced-discovery');

    component.selectCoverageSignal({
      entry: entry!,
      signalId: 'e2e',
      shortLabel: 'E',
      label: 'E - End-to-end',
      attention: true,
    });
    fixture.detectChanges();

    const currentMission = component.selectedMission();

    expect(currentMission?.id).toBe('advanced-discovery::core');
    expect(component.selectedSignalContext()?.signalId).toBe('e2e');

    component.handleMissionAction({
      action: 'complete',
      recommendation: {
        ...currentMission!,
        status: 'proof-returned',
      },
    });
    fixture.detectChanges();

    expect(component.selectedMission()?.id).toBe('advanced-discovery::safety-net');
    expect(component.selectedMission()?.status).toBe('proposed');
    expect(component.missionControl()?.phase).toBe('awaiting-human');
    expect(component.missionHudActiveSection()).toBe('mission');
    expect(component.selectedSignalContext()).toBeNull();
    expect(component.selectedSignalDispatchReady()).toBeFalse();
    expect(missionDecisions.saveDecision).toHaveBeenCalledWith(
      jasmine.objectContaining({
        recommendationId: 'advanced-discovery::core',
        status: 'done',
      }),
    );
  });

  it('moves the mission cockpit backward and forward with arrow controls', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const entry = component.selectedEntry();
    const previousButton = () =>
      root.querySelector('[data-og7-id="admin-quality-cockpit-previous"]') as HTMLButtonElement;
    const nextButton = () =>
      root.querySelector('[data-og7-id="admin-quality-cockpit-next"]') as HTMLButtonElement;
    const position = () => root.querySelector('[data-og7-id="admin-quality-cockpit-position"]');

    component.selectCoverageSignal({
      entry: entry!,
      signalId: 'e2e',
      shortLabel: 'E',
      label: 'E - End-to-end',
      attention: true,
    });
    fixture.detectChanges();

    expect(component.selectedMission()?.id).toBe('advanced-discovery::core');
    expect(previousButton().disabled).toBeTrue();
    expect(nextButton().disabled).toBeFalse();
    expect(position()?.textContent).toContain('1 / 3');

    nextButton().click();
    fixture.detectChanges();

    expect(component.selectedMission()?.id).toBe('advanced-discovery::safety-net');
    expect(component.selectedSignalContext()).toBeNull();
    expect(component.selectedSignalDispatchReady()).toBeFalse();
    expect(component.missionHudActiveSection()).toBe('mission');
    expect(previousButton().disabled).toBeFalse();
    expect(nextButton().disabled).toBeFalse();
    expect(position()?.textContent).toContain('2 / 3');

    nextButton().click();
    fixture.detectChanges();

    expect(component.selectedMission()?.id).toBe('advanced-discovery::governance');
    expect(nextButton().disabled).toBeTrue();
    expect(position()?.textContent).toContain('3 / 3');

    previousButton().click();
    fixture.detectChanges();

    expect(component.selectedMission()?.id).toBe('advanced-discovery::safety-net');
    expect(position()?.textContent).toContain('2 / 3');
  });

  it('renders the compact actions list in the workspace drawer and updates it on row change', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const openWorkspaceButton = root.querySelector(
      '[data-og7-id="admin-quality-open-workspace"]',
    ) as HTMLButtonElement;
    openWorkspaceButton.click();
    fixture.detectChanges();

    const actionsTab = root.querySelector(
      '[data-og7-id="admin-quality-workspace-tab-actions"]',
    ) as HTMLButtonElement;
    actionsTab.click();
    fixture.detectChanges();

    let actionRows = root.querySelectorAll('[data-og7="admin-quality-workspace-action-item"]');

    expect(
      root.querySelector('[data-og7="admin-quality-workspace-panel"][data-og7-id="actions"]'),
    ).not.toBeNull();
    expect(actionRows.length).toBe(2);
    const initialActionIds = Array.from(actionRows).map((row) => row.getAttribute('data-og7-id'));
    expect(initialActionIds.every((id) => typeof id === 'string' && id.length > 0)).toBeTrue();

    const trustRow = root.querySelector(
      '[data-og7="admin-quality-coverage-matrix-row"][data-og7-id="trust-validation"]',
    ) as HTMLButtonElement;
    trustRow.click();
    fixture.detectChanges();

    actionRows = root.querySelectorAll('[data-og7="admin-quality-workspace-action-item"]');
    expect(actionRows.length).toBe(2);
    const trustActionIds = Array.from(actionRows)
      .map((row) => row.getAttribute('data-og7-id'))
      .sort();
    expect(trustActionIds).toEqual(['admin-trust-quick-verify', 'admin-trust-save'].sort());
  });

  it('stops spoken briefing when the active admin-quality context changes', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const page = fixture.componentInstance;
    const stopSpy = spyOn(page, 'stopMissionVoice').and.callFake(() => undefined);
    const root = fixture.nativeElement as HTMLElement;
    const openWorkspaceButton = root.querySelector(
      '[data-og7-id="admin-quality-open-workspace"]',
    ) as HTMLButtonElement;
    const alternateMission = page.missionControl()!.recommendations[1]!;

    page.speaking.set(true);
    openWorkspaceButton.click();
    fixture.detectChanges();

    expect(stopSpy).toHaveBeenCalledWith(false);

    stopSpy.calls.reset();
    page.speaking.set(true);
    page.selectMission(alternateMission);
    fixture.detectChanges();

    expect(stopSpy).toHaveBeenCalledWith(false);
  });

  it('resets active filters back to the full table', async () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const resetButton = root.querySelector(
      '[data-og7-id="admin-quality-reset-filters"]',
    ) as HTMLButtonElement;

    await selectAdminQualityComboboxOption(fixture, 'admin-quality-bucket-filter', 'product-gap');

    expect(root.querySelectorAll('[data-og7="admin-quality-row"]').length).toBe(1);

    resetButton.click();
    fixture.detectChanges();

    expect(root.querySelectorAll('[data-og7="admin-quality-row"]').length).toBe(3);
  });
});
