import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  NotificationStore,
  NotificationStoreApi,
} from '@app/core/observability/notification.store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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

import { AdminQualityPage } from './admin-quality.page';

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
    const heroBriefing = root.querySelector('[data-og7="admin-quality-hero-briefing"]') as HTMLElement;
    const heroSummary = root.querySelector('[data-og7="admin-quality-hero-summary"]') as HTMLElement;
    const generatedAt = root.querySelector('[data-og7-id="admin-quality-generated-at"]') as HTMLElement;
    const sourceStatus = root.querySelector('[data-og7-id="admin-quality-source-status"]') as HTMLElement;
    const missionSync = root.querySelector('[data-og7-id="admin-quality-mission-sync"]') as HTMLElement;
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
    const consoleRemote = root.querySelector('[data-og7="admin-quality-console-remote"]');
    const consoleStage = root.querySelector('[data-og7="admin-quality-console-stage"]') as HTMLElement;
    const surfaceStage = root.querySelector(
      '[data-og7="admin-quality-console-surface-stage"]',
    ) as HTMLElement;
    const consoleContextButton = root.querySelector(
      '[data-og7-id="admin-quality-console-context"]',
    ) as HTMLButtonElement;
    const consoleQueueButton = root.querySelector(
      '[data-og7-id="admin-quality-console-queue"]',
    ) as HTMLButtonElement;
    const workspaceBar = root.querySelector('[data-og7="admin-quality-workspace-bar"]') as HTMLElement;
    const sidePanel = root.querySelector('[data-og7="admin-quality-side-panel"]') as HTMLElement;
    const aiPilotBlock = root.querySelector('[data-og7="admin-quality-ai-pilot-block"]') as HTMLElement;
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

    expect(consoleRemote).not.toBeNull();
    expect(consoleStage.className).toContain('2xl:grid-cols');
    expect(surfaceStage).not.toBeNull();
    expect(root.querySelectorAll('[data-og7="admin-quality-secondary-queue"]').length).toBe(1);
    expect(consoleContextButton.getAttribute('aria-pressed')).toBe('true');
    expect(sidePanel.getAttribute('data-og7-visible')).toBe('true');
    expect(workspaceBar).not.toBeNull();
    expect(workspaceBar.getAttribute('data-og7-visible')).toBe('false');
    expect(workspaceBar.className).toContain('hidden');
    expect(aiPilotBlock.getAttribute('data-og7-visible')).toBe('false');
    expect(secondaryQueue).not.toBeNull();
    expect(secondaryQueue.closest('[data-og7="admin-quality-console-surface-stage"]')).toBe(surfaceStage);
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
    expect(legendToggle.getAttribute('aria-expanded')).toBe('true');
    expect(
      root.querySelectorAll('[data-og7="admin-quality-coverage-matrix-legend-item"]').length,
    ).toBe(6);
    expect(advancedRow.querySelectorAll('[data-og7-attention="true"]').length).toBeGreaterThan(0);
    expect(trustRow.querySelector('[data-og7-attention="true"]')).toBeNull();

    legendToggle.click();
    fixture.detectChanges();

    expect(legendToggle.getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelector('[data-og7="admin-quality-coverage-matrix-legend"]')).toBeNull();

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

  it('filters rows by search term and E2E status', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const search = root.querySelector('[data-og7-id="admin-quality-search"]') as HTMLInputElement;
    const e2eFilter = root.querySelector(
      '[data-og7-id="admin-quality-e2e-filter"]',
    ) as HTMLSelectElement;

    search.value = 'map';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    let rows = root.querySelectorAll('[data-og7="admin-quality-row"]');
    expect(rows.length).toBe(1);
    expect(rows[0]?.getAttribute('data-og7-id')).toBe('advanced-discovery');

    search.value = '';
    search.dispatchEvent(new Event('input'));
    e2eFilter.value = 'oui';
    e2eFilter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    rows = root.querySelectorAll('[data-og7="admin-quality-row"]');
    expect(rows.length).toBe(1);
    expect(rows[0]?.getAttribute('data-og7-id')).toBe('trust-validation');
  });

  it('surfaces active filters as readable chips in the sticky rail', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const domainFilter = root.querySelector(
      '[data-og7-id="admin-quality-domain-filter"]',
    ) as HTMLSelectElement;
    const resetButton = root.querySelector(
      '[data-og7-id="admin-quality-reset-filters"]',
    ) as HTMLButtonElement;

    expect(root.querySelector('[data-og7="admin-quality-active-filters"]')).toBeNull();
    expect(root.textContent).toContain(
      'Aucun filtre actif. La vue montre tout le portefeuille QA.',
    );
    expect(resetButton.disabled).toBeTrue();

    domainFilter.value = 'Trust et validation';
    domainFilter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

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

  it('distinguishes active scope from global totals in the command rail', () => {
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
    const domainFilter = root.querySelector(
      '[data-og7-id="admin-quality-domain-filter"]',
    ) as HTMLSelectElement;

    expect(commandRail?.getAttribute('data-og7-density')).toBe('compact');
    expect(commandRailLayout.className).toContain('xl:grid-cols-6');
    expect(commandRailCards.length).toBe(6);
    expect(commandRailCards[0]?.getAttribute('data-og7-density')).toBe('compact');
    expect(root.querySelector('[data-og7-id="rail-heading"]')?.textContent).toContain(
      'Vue globale',
    );

    domainFilter.value = 'Trust et validation';
    domainFilter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

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
    const domainFilter = root.querySelector(
      '[data-og7-id="admin-quality-domain-filter"]',
    ) as HTMLSelectElement;
    const openWorkspaceButton = root.querySelector(
      '[data-og7-id="admin-quality-open-workspace"]',
    ) as HTMLButtonElement;

    domainFilter.value = 'Observabilite et tracabilite';
    domainFilter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

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

  it('renders mission control recommendations and moves to ready after approval', () => {
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
    const missionWorkflow = root.querySelector('[data-og7="admin-quality-mission-workflow"]');
    const missionControlShell = root.querySelector(
      '[data-og7="admin-quality-mission-control-shell"]',
    );
    const consoleMissionActions = root.querySelector(
      '[data-og7="admin-quality-console-mission-actions"]',
    );
    const recommendations = root.querySelectorAll('[data-og7="admin-quality-recommendation"]');
    let recommendationButtons = root.querySelectorAll(
      '[data-og7="admin-quality-recommendation"] > button',
    ) as NodeListOf<HTMLButtonElement>;

    expect(missionAccordion).not.toBeNull();
    expect(missionAccordion.open).toBeFalse();
    expect(missionAccordionToggle?.textContent).toContain('Mission control complet');
    expect(missionControl).not.toBeNull();
    expect(missionHero).not.toBeNull();
    expect(missionHero?.getAttribute('data-og7-density')).toBe('compact');
    expect((missionHero as HTMLElement).className).toContain('p-3');
    expect(missionWorkflow).not.toBeNull();
    expect(root.querySelector('[data-og7="admin-quality-local-state"]')).toBeNull();
    expect(missionControl?.textContent).toContain('Mission Control');
    expect(missionControl?.textContent).toContain('Gap constate');
    expect(missionControl?.textContent).toContain('Mission suggeree');
    expect(missionHero?.textContent).not.toContain('Valider mission');
    expect(missionHero?.textContent).not.toContain('Lancer Codex');
    expect(missionHero?.textContent).not.toContain('Differer');
    expect(consoleMissionActions).not.toBeNull();
    expect(consoleMissionActions?.textContent).toContain('Valider mission');
    expect(consoleMissionActions?.textContent).toContain('Lancer Codex');
    expect(consoleMissionActions?.textContent).toContain('Differer');
    expect(recommendations.length).toBe(3);
    expect(root.textContent).toContain('Validation humaine requise');
    expect(recommendationButtons[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(recommendationButtons[1]?.getAttribute('aria-pressed')).toBe('false');

    recommendationButtons[1]?.click();
    fixture.detectChanges();

    recommendationButtons = root.querySelectorAll(
      '[data-og7="admin-quality-recommendation"] > button',
    ) as NodeListOf<HTMLButtonElement>;
    expect(recommendationButtons[0]?.getAttribute('aria-pressed')).toBe('false');
    expect(recommendationButtons[1]?.getAttribute('aria-pressed')).toBe('true');

    const updatedApproveButton = consoleMissionActions?.querySelector(
      '[data-og7-id="admin-quality-approve-mission"]',
    ) as HTMLButtonElement;
    expect(updatedApproveButton.closest('[data-og7="admin-quality-console-mission-actions"]')).toBe(
      consoleMissionActions,
    );
    const missionControlRadarSweep = root.querySelector(
      '[data-og7="admin-quality-mission-control-radar-sweep"]',
    );
    const missionControlCadence = root.querySelector(
      '[data-og7="admin-quality-mission-control-cadence"]',
    );
    const missionControlCadenceDetail = root.querySelector(
      '[data-og7="admin-quality-mission-control-cadence-detail"]',
    );
    updatedApproveButton.click();
    fixture.detectChanges();

    const contactLogEntries = root.querySelectorAll(
      '[data-og7="admin-quality-mission-control-contact-log-entry"]',
    );
    const contactLogTimes = root.querySelectorAll(
      '[data-og7="admin-quality-mission-control-contact-log-time"]',
    );

    expect(root.textContent).toContain('Pret a lancer');
    expect(missionControlShell?.getAttribute('data-og7-radar-signal')).toBe('primary');
    expect(missionControlRadarSweep?.getAttribute('data-og7-mode')).toBe('action');
    expect(missionControlCadence?.textContent).toContain('2 events / active cycle');
    expect(missionControlCadenceDetail?.textContent).toContain('1 lock');
    expect(missionControlCadenceDetail?.textContent).toContain('1 action');
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
        recommendationId: 'advanced-discovery::safety-net',
        status: 'approved',
      }),
    );
  });

  it('generates mission tasks and shows Ops readiness for the active mission', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const runway = root.querySelector('[data-og7="admin-quality-codex-runway"]') as HTMLElement;
    const runwayMetrics = runway.querySelector('[data-og7-layout="compact-grid"]') as HTMLElement;
    const quotaStatus = root.querySelector('[data-og7-id="admin-quality-codex-quota-status"]');
    const generatedTasks = root.querySelectorAll('[data-og7="admin-quality-generated-task"]');
    const generatedTaskCount = root.querySelector(
      '[data-og7-id="admin-quality-generated-task-count"]',
    );
    const telemetryStatus = root.querySelector('[data-og7-id="admin-quality-ai-telemetry-status"]');
    const telemetryDetail = root.querySelector('[data-og7-id="admin-quality-ai-telemetry-detail"]');
    const missionLoop = root.querySelector('[data-og7="admin-quality-mission-loop"]');
    const missionLoopRail = root.querySelector(
      '[data-og7="admin-quality-mission-loop-rail"]',
    ) as HTMLElement;
    const missionLoopSteps = root.querySelectorAll('[data-og7="admin-quality-mission-loop-step"]');
    const missionEnergyLane = root.querySelector('[data-og7="admin-quality-mission-energy-lane"]');
    const missionEnergySegments = root.querySelectorAll(
      '[data-og7="admin-quality-mission-energy-lane-segment"]',
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
    const missionControlCadence = root.querySelector(
      '[data-og7="admin-quality-mission-control-cadence"]',
    );
    const missionControlCadenceDetail = root.querySelector(
      '[data-og7="admin-quality-mission-control-cadence-detail"]',
    );
    const cockpitSyncBands = root.querySelectorAll('[data-og7="admin-quality-cockpit-sync-band"]');
    const missionHudMiniLane = root.querySelector('[data-og7="admin-quality-hud-energy-lane"]');
    const missionHudMiniSegments = root.querySelectorAll(
      '[data-og7="admin-quality-hud-energy-segment"]',
    );
    const consoleHudControls = root.querySelector(
      '[data-og7="admin-quality-console-hud-controls"]',
    ) as HTMLElement;
    const consoleDeskActions = root.querySelector(
      '[data-og7="admin-quality-console-desk-actions"]',
    ) as HTMLElement;
    const workspaceHudChip = root.querySelector(
      '[data-og7-id="admin-quality-hud-section-workspace"]',
    ) as HTMLElement;
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

    expect(runway).not.toBeNull();
    expect(runway.getAttribute('data-og7-density')).toBe('compact');
    expect(runway.className).toContain('p-3');
    expect(runwayMetrics.className).toContain('xl:grid-cols-4');
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
    expect(missionControlShell?.getAttribute('data-og7-ambient')).toBe('nominal');
    expect(missionControlShell?.getAttribute('data-og7-provider')).toBe('codex');
    expect(missionControlShell?.getAttribute('data-og7-cockpit-tone')).toBe('codex');
    expect(missionControlShell?.getAttribute('data-og7-proof-stream')).toBe('high');
    expect(missionControlShell?.getAttribute('data-og7-radar-signal')).toBe('pulse');
    expect(missionControlShell?.getAttribute('data-og7-radar-motion')).toBe('static');
    expect(missionControlShell?.getAttribute('data-og7-radar-layout')).toBe('compact');
    expect(missionControlRadar).not.toBeNull();
    expect(missionControlRadarSweep).not.toBeNull();
    expect(missionControlRadarSweep?.getAttribute('data-og7-speed')).toBe('nominal');
    expect(missionControlRadarSweep?.getAttribute('data-og7-mode')).toBe('lock');
    expect(getComputedStyle(missionControlRadarSweep as Element).animationName).toBe('none');
    expect(getComputedStyle(missionControlRadarSweep as Element).display).toBe('none');
    expect(missionControlCadence?.textContent).toContain('1 event / active cycle');
    expect(missionControlCadenceDetail?.textContent).toContain('1 lock');
    expect(missionControlCadenceDetail?.textContent).toContain('0 action');
    expect(missionControlContactLog.getAttribute('data-og7-layout')).toBe('compact-grid');
    expect(missionControlContactLog.className).toContain('xl:grid-cols-2');
    expect(missionControlAcquisitionRings.length).toBe(3);
    expect(missionControlRadarTrails.length).toBe(3);
    expect(missionControlRadarEndpoints.length).toBe(3);
    expect(missionControlRadarEchoes.length).toBe(3);
    expect(
      root
        .querySelector('[data-og7="admin-quality-mission-control-radar-echo"][data-og7-id="coverage"]')
        ?.getAttribute('data-og7-active'),
    ).toBe('true');
    expect(
      root
        .querySelector(
          '[data-og7="admin-quality-mission-control-radar-acquisition-ring"][data-og7-id="coverage"]',
        )
        ?.getAttribute('data-og7-active'),
    ).toBe('true');
    expect(
      root
        .querySelector('[data-og7="admin-quality-mission-control-radar-trail"][data-og7-id="coverage"]')
        ?.getAttribute('data-og7-intensity'),
    ).toBe('high');
    expect(
      root
        .querySelector('[data-og7="admin-quality-mission-control-radar-echo"][data-og7-id="workspace"]')
        ?.getAttribute('data-og7-active'),
    ).toBe('false');
    expect(missionControlSignature?.textContent).toContain('Codex spectrum');
    expect(missionControlContactLock?.textContent).toContain('Contact lock');
    expect(missionControlContactLock?.textContent).toContain('Coverage matrix');
    expect(missionControlContactLock?.textContent).toContain('3/3');
    expect(contactLogEntries.length).toBe(1);
    expect(contactLogEntries[0]?.getAttribute('data-og7-kind')).toBe('lock');
    expect(contactLogEntries[0]?.getAttribute('data-og7-id')).toBe('coverage');
    expect(contactLogEntries[0]?.getAttribute('data-og7-state')).toBe('locked');
    expect(contactLogEntries[0]?.getAttribute('data-og7-reason')).toBe('section-pulse');
    expect(contactLogEntries[0]?.getAttribute('data-og7-signal')).toBe('pulse');
    expect(contactLogEntries[0]?.getAttribute('data-og7-age')).toBe('current');
    expect(
      root.querySelector('[data-og7="admin-quality-mission-control-contact-log-time"]')?.textContent,
    ).toContain('T+0');
    expect(contactLogEntries[0]?.textContent).toContain('Latest lock');
    expect(contactLogEntries[0]?.textContent).toContain('Section pulse');
    expect(contactLogEntries[0]?.textContent).toContain('now');
    expect(contactLogEntries[0]?.textContent).toContain('Coverage matrix');
    expect(coveragePanel?.getAttribute('data-og7-lock-focus')).toBe('true');
    expect(missionControlShell?.getAttribute('data-og7-lock-focus')).toBe('false');
    expect(workspacePanel?.getAttribute('data-og7-lock-focus')).toBe('false');
    expect(workspaceTabs.getAttribute('data-og7-layout')).toBe('vertical-list');
    expect(workspaceTabs.className).not.toContain('grid-cols-3');
    expect(workspaceTabButtons.length).toBe(3);
    expect(workspaceTabButtons[1]?.className).toContain('text-left');
    expect(cockpitSyncBands.length).toBe(2);
    expect(missionHud?.textContent).toContain('Etendre la preuve QA');
    expect(sidePanel).not.toBeNull();
    expect(sidePanel?.textContent).toContain('Contexte actif');
    expect(sidePanelEntry?.textContent).toContain('Recherche et decouverte profonde');
    expect(sidePanelMission?.textContent).toContain('Etendre la preuve QA');
    expect(missionHud?.textContent).toContain('Recherche et decouverte profonde');
    expect(missionHudMiniLane).not.toBeNull();
    expect(missionHudMiniLane?.getAttribute('data-og7-layout')).toBe('compact');
    expect(missionHudMiniSegments.length).toBe(3);
    expect(missionHudMiniSegments[0]?.getAttribute('data-og7-state')).toBe('flowing');
    expect(consoleHudControls).not.toBeNull();
    expect(workspaceHudChip.closest('[data-og7="admin-quality-console-hud-controls"]')).toBe(
      consoleHudControls,
    );
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
    expect(root.querySelector('[data-og7-id="admin-quality-hud-ops-status"]')?.textContent).toContain(
      'Ops pret',
    );
    expect(
      root.querySelector('[data-og7-id="admin-quality-hud-proof-status"]')?.textContent,
    ).toContain('Proof package ready');
    expect(
      root.querySelector('[data-og7-id="admin-quality-hud-proof-status"]')?.getAttribute(
        'data-og7-hot',
      ),
    ).toBe('true');
    expect(missionLoop).not.toBeNull();
    expect(missionLoopRail.getAttribute('data-og7-layout')).toBe('responsive-grid');
    expect(missionLoopRail.className).not.toContain('overflow-x-auto');
    expect(missionLoopRail.className).not.toContain('min-w-max');
    expect(missionLoopSteps.length).toBe(4);
    expect(missionLoopSteps[0]?.className).toContain('min-w-0');
    expect(missionEnergyLane).not.toBeNull();
    expect(missionEnergySegments.length).toBe(3);
    expect(missionEnergySegments[0]?.getAttribute('data-og7-state')).toBe('flowing');
    expect(missionEnergySegments[1]?.getAttribute('data-og7-state')).toBe('standby');
    expect(proofTelemetry?.textContent).toContain(
      'Workflow #51 completed with 2 artifact(s) and PR #321.',
    );
    expect(proofTelemetry?.textContent).toContain('2 artifact(s)');
    expect(proofTelemetry?.textContent).toContain('PR #321');
    expect(quotaStatus?.textContent).toContain('Ops ready');
    expect(generatedTasks.length).toBe(8);
    expect(generatedTaskCount?.textContent).toContain('8');
    expect(runway?.textContent).toContain(
      'The mission can be dispatched directly from Mission Control.',
    );
    expect(
      root.querySelector('[data-og7-id="admin-quality-codex-ops-status"]')?.textContent,
    ).toContain('Ops pret');
    expect(telemetryStatus?.textContent).toContain('Live pulse nominal');
    expect(telemetryStatus?.getAttribute('data-og7-state')).toBe('live');
    expect(telemetryDetail?.textContent).toContain('Next sweep in');
    expect(
      root
        .querySelector('[data-og7="admin-quality-mission-loop-step"][data-og7-id="dispatch"]')
        ?.getAttribute('data-og7-status'),
    ).toBe('pending');
  });

  it('toggles the sticky mission HUD between expanded and compact modes', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const toggleButton = root.querySelector(
      '[data-og7-id="admin-quality-hud-toggle"]',
    ) as HTMLButtonElement;

    expect(root.querySelector('[data-og7="admin-quality-hud-expanded-panels"]')).not.toBeNull();

    toggleButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.missionHudExpanded()).toBeFalse();
    expect(root.querySelector('[data-og7="admin-quality-hud-expanded-panels"]')).toBeNull();
    expect(root.querySelector('[data-og7="admin-quality-mission-hud"]')?.getAttribute('data-og7-expanded')).toBe(
      'false',
    );
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

    expect(root.querySelector('[data-og7-id="admin-quality-hud-ops-status"]')?.textContent).toContain(
      'Cle locale',
    );
    expect(root.querySelector('[data-og7-id="admin-quality-hud-ops-detail"]')?.textContent).toContain(
      'Local OPENAI_API_KEY detected in Strapi env for development',
    );
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

    const summary = root.querySelector(
      '[data-og7="admin-quality-matrix-recalculation-summary"]',
    );
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

  it('recalculates the selected entry when the scoped selector targets the active row', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const scopeSelect = root.querySelector(
      '[data-og7-id="admin-quality-recalculate-scope"]',
    ) as HTMLSelectElement;
    const button = root.querySelector(
      '[data-og7-id="admin-quality-recalculate-matrix"]',
    ) as HTMLButtonElement;

    scopeSelect.value = 'selected-entry';
    scopeSelect.dispatchEvent(new Event('change'));
    button.click();

    expect(service.recalculateMatrix).toHaveBeenCalledWith('selected-entry', 'advanced-discovery');
  });

  it('renders readable recalculation scope options inside the dark admin shell', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const options = Array.from(
      root.querySelectorAll<HTMLOptionElement>(
        '[data-og7-id="admin-quality-recalculate-scope"] option',
      ),
    );

    expect(options.map((option) => option.textContent?.trim())).toEqual([
      'Entrees a piloter',
      'Entree active',
      'Toute la matrice',
    ]);
    expect(options.every((option) => option.classList.contains('bg-slate-950'))).toBeTrue();
    expect(options.every((option) => option.classList.contains('text-slate-100'))).toBeTrue();
  });

  it('surfaces the first construction priorities without filters or search', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const buildNow = root.querySelector('[data-og7="admin-quality-build-now"]');
    const primary = root.querySelector('[data-og7="admin-quality-next-best-action"]');
    const groups = root.querySelector('[data-og7="admin-quality-build-now-groups"]');
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-og7="admin-quality-build-now-item"]'));

    expect(buildNow?.textContent).toContain('A construire maintenant');
    expect(primary?.textContent).toContain('Produire la preuve sur Recherche et decouverte profonde');
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

    (items[0].querySelector('[data-og7-id="admin-quality-build-now-open"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedEntry()?.id).toBe('advanced-discovery');
    expect(fixture.componentInstance.workspaceOpen()).toBeTrue();
    expect(fixture.componentInstance.activeWorkspaceSurface()).toBe('delegation');

    (items[0].querySelector('[data-og7-id="admin-quality-build-now-plan"]') as HTMLButtonElement).click();
    expect(fixture.componentInstance.matrixRecalculationScope()).toBe('selected-entry');
    expect(service.recalculateMatrix).toHaveBeenCalledWith('selected-entry', 'advanced-discovery');

    (items[0].querySelector('[data-og7-id="admin-quality-build-now-create-mission"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.missionDecisions()['advanced-discovery::core']).toBe('approved');
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
    expect(root.querySelector('[data-og7-id="admin-quality-dispatch-blocked"]')?.textContent).toContain(
      'Le bouton reste verrouille jusqu\'a reception d\'une confirmation serveur plus recente',
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
    const workspaceEcho = root.querySelector(
      '[data-og7="admin-quality-mission-control-radar-echo"][data-og7-id="workspace"]',
    ) as HTMLButtonElement;
    const workspaceTrail = root.querySelector(
      '[data-og7="admin-quality-mission-control-radar-trail"][data-og7-id="workspace"]',
    );
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
    const missionControlShell = root.querySelector(
      '[data-og7="admin-quality-mission-control-shell"]',
    );
    const missionControlRadarSweep = root.querySelector(
      '[data-og7="admin-quality-mission-control-radar-sweep"]',
    );
    const missionControlCadence = root.querySelector(
      '[data-og7="admin-quality-mission-control-cadence"]',
    );
    const missionControlCadenceDetail = root.querySelector(
      '[data-og7="admin-quality-mission-control-cadence-detail"]',
    );
    const contactLogTimes = () =>
      Array.from(root.querySelectorAll('[data-og7="admin-quality-mission-control-contact-log-time"]'));

    workspaceChip.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.missionHudActiveSection()).toBe('workspace');
    expect(
      root.querySelector('[data-og7-id="admin-quality-hud-active-section-label"]')?.textContent,
    ).toContain('Workspace deck');
    expect(workspaceChip.getAttribute('data-og7-active')).toBe('true');
    expect(workspaceChip.getAttribute('data-og7-pulse')).toBe('true');
    expect(workspaceEcho.getAttribute('data-og7-active')).toBe('true');
    expect(workspaceEcho.getAttribute('data-og7-pulse')).toBe('true');
    expect(workspaceTrail?.getAttribute('data-og7-active')).toBe('true');
    expect(workspaceTrail?.getAttribute('data-og7-pulse')).toBe('true');
    expect(workspaceTrail?.getAttribute('data-og7-intensity')).toBe('low');
    expect(contactLock?.textContent).toContain('Acquiring Workspace deck');
    expect(contactLock?.textContent).toContain('1 surface(s)');
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
    expect(missionControlShell?.getAttribute('data-og7-radar-signal')).toBe('manual');
    expect(missionControlRadarSweep?.getAttribute('data-og7-mode')).toBe('lock');
    expect(missionControlCadence?.textContent).toContain('2 events / active cycle');
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
    expect(missionControlCadence?.textContent).toContain('3 events / active cycle');
    expect(missionControlCadenceDetail?.textContent).toContain('3 lock');
    expect(coveragePanel?.getAttribute('data-og7-lock-focus')).toBe('true');
  });

  it('renders a multi-provider comparison deck driven by Ops readiness and proof telemetry', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const rail = root.querySelector('[data-og7="admin-quality-provider-comparison-rail"]') as HTMLElement;
    const cards = root.querySelectorAll('[data-og7="admin-quality-provider-comparison-card"]');
    const codexCard = root.querySelector(
      '[data-og7="admin-quality-provider-comparison-card"][data-og7-id="codex"]',
    ) as HTMLElement;
    const claudeCard = root.querySelector(
      '[data-og7="admin-quality-provider-comparison-card"][data-og7-id="claude"]',
    );

    expect(rail.getAttribute('data-og7-layout')).toBe('responsive-grid');
    expect(rail.getAttribute('data-og7-density')).toBe('compact');
    expect(rail.className).toContain('gap-2');
    expect(rail.className).not.toContain('overflow-x-auto');
    expect(rail.className).not.toContain('min-w-max');
    expect(cards.length).toBe(4);
    expect(codexCard.className).toContain('min-w-0');
    expect(codexCard.className).toContain('gap-2');
    expect(codexCard.getAttribute('data-og7-density')).toBe('compact');
    expect(codexCard?.textContent).toContain('Ops armed');
    expect(codexCard?.textContent).toContain('Proof package ready');
    expect(codexCard?.textContent).toContain('PR #321');
    expect(codexCard?.getAttribute('data-og7-selected')).toBe('true');
    expect(claudeCard?.textContent).toContain('Proof pipeline active');
    expect(claudeCard?.getAttribute('data-og7-proof-state')).toBe('in-progress');
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
    ).find(
      (element) => element.textContent?.trim() === 'Lancer Codex',
    ) as HTMLButtonElement | undefined;
    const quotaStatus = root.querySelector('[data-og7-id="admin-quality-codex-quota-status"]');

    expect(fixture.componentInstance.selectedAiDispatchReady()).toBeFalse();
    expect(quotaStatus?.textContent).toContain('Ops blocked');
    expect(delegateButton?.disabled).toBeFalse();
    expect(delegateButton?.getAttribute('aria-disabled')).toBe('true');

    delegateButton?.click();
    fixture.detectChanges();

    expect(root.textContent).toContain(
      'Dispatch is blocked until Ops reports an enabled workflow and inserted key.',
    );
    expect(notifications.error).toHaveBeenCalledWith(
      jasmine.stringContaining('OPS_CODEX_DISPATCH_ENABLED=true'),
      jasmine.objectContaining({ source: 'admin-quality' }),
    );
    expect(opsService.dispatchCodexWorkflow).not.toHaveBeenCalled();
    expect(fixture.componentInstance.selectedMission()?.status).toBe('proposed');
  });

  it('uses the selected provider Ops module to arm or constrain dispatch', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const providerSelect = root.querySelector(
      '[data-og7-id="admin-quality-ai-provider"]',
    ) as HTMLSelectElement;
    const quotaStatus = root.querySelector('[data-og7-id="admin-quality-codex-quota-status"]');
    const aiBay = root.querySelector('[data-og7="admin-quality-ai-bay"]') as HTMLElement;
    const aiBayLayout = root.querySelector(
      '[data-og7="admin-quality-ai-bay"] [data-og7-layout="compact-flight-deck"]',
    ) as HTMLElement;
    const aiBayStatus = root.querySelector('[data-og7-id="admin-quality-ai-bay-status"]');
    const telemetryStatus = root.querySelector('[data-og7-id="admin-quality-ai-telemetry-status"]');
    const missionControlShell = root.querySelector(
      '[data-og7="admin-quality-mission-control-shell"]',
    );
    const missionControlSignature = root.querySelector(
      '[data-og7="admin-quality-mission-control-signature"]',
    );
    const missionHud = root.querySelector('[data-og7="admin-quality-mission-hud"]');
    const missionControlRadarSweep = root.querySelector(
      '[data-og7="admin-quality-mission-control-radar-sweep"]',
    );

    expect(fixture.componentInstance.selectedAiDispatchReady()).toBeTrue();
    expect(quotaStatus?.textContent).toContain('Ops ready');
    expect(aiBay?.getAttribute('data-og7-state')).toBe('armed');
    expect(aiBay?.getAttribute('data-og7-density')).toBe('compact');
    expect(aiBay.className).toContain('p-3');
    expect(aiBayLayout.className).toContain('lg:grid-cols');
    expect(aiBayStatus?.textContent).toContain('Ops armed');
    expect(telemetryStatus?.getAttribute('data-og7-state')).toBe('live');
    expect(missionControlShell?.getAttribute('data-og7-provider')).toBe('codex');
    expect(missionControlShell?.getAttribute('data-og7-cockpit-tone')).toBe('codex');
    expect(missionHud?.getAttribute('data-og7-cockpit-tone')).toBe('codex');
    expect(missionControlRadarSweep?.getAttribute('data-og7-speed')).toBe('nominal');
    expect(missionControlSignature?.textContent).toContain('Codex spectrum');

    providerSelect.value = 'copilot';
    providerSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedAiProvider()).toBe('copilot');
    expect(fixture.componentInstance.selectedAiDispatchReady()).toBeFalse();
    expect(quotaStatus?.textContent).toContain('Ops blocked');
    expect(aiBay?.textContent).toContain('GitHub Copilot console');
    expect(aiBay?.getAttribute('data-og7-state')).toBe('constrained');
    expect(aiBayStatus?.textContent).toContain('Ops constrained');

    providerSelect.value = 'claude';
    providerSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedAiProvider()).toBe('claude');
    expect(fixture.componentInstance.selectedAiDispatchReady()).toBeTrue();
    expect(quotaStatus?.textContent).toContain('Ops ready');
    expect(missionControlShell?.getAttribute('data-og7-provider')).toBe('claude');
    expect(missionControlShell?.getAttribute('data-og7-ambient')).toBe('syncing');
    expect(missionControlShell?.getAttribute('data-og7-cockpit-tone')).toBe('claude');
    expect(missionHud?.getAttribute('data-og7-cockpit-tone')).toBe('claude');
    expect(missionControlRadarSweep?.getAttribute('data-og7-speed')).toBe('fast');
    expect(missionControlSignature?.textContent).toContain('Claude ember line');
  });

  it('dispatches the selected mission directly from Mission Control when delegation starts', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const consoleMissionActions = root.querySelector(
      '[data-og7="admin-quality-console-mission-actions"]',
    );
    const delegateButton = Array.from(
      consoleMissionActions?.querySelectorAll('[data-og7="action"]') ?? [],
    ).find(
      (element) => element.textContent?.trim() === 'Lancer Codex',
    ) as HTMLButtonElement | undefined;

    delegateButton?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedMission()?.status).toBe('in-progress');
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
      root
        .querySelector('[data-og7="admin-quality-mission-loop-step"][data-og7-id="dispatch"]')
        ?.getAttribute('data-og7-status'),
    ).toBe('done');
    expect(
      root
        .querySelector(
          '[data-og7="admin-quality-mission-energy-lane-segment"][data-og7-id="dispatch-proof"]',
        )
        ?.getAttribute('data-og7-state'),
    ).toBe('flowing');
    expect(
      root
        .querySelector('[data-og7="admin-quality-mission-loop-step"][data-og7-id="proof"]')
        ?.getAttribute('data-og7-status'),
    ).toBe('pending');
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

  it('selects the next mission after closing the current one', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const currentMission = component.selectedMission();

    expect(currentMission?.id).toBe('advanced-discovery::core');

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
    expect(missionDecisions.saveDecision).toHaveBeenCalledWith(
      jasmine.objectContaining({
        recommendationId: 'advanced-discovery::core',
        status: 'done',
      }),
    );
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
    const recommendationButtons = root.querySelectorAll(
      '[data-og7="admin-quality-recommendation"] > button',
    ) as NodeListOf<HTMLButtonElement>;

    page.speaking.set(true);
    openWorkspaceButton.click();
    fixture.detectChanges();

    expect(stopSpy).toHaveBeenCalledWith(false);

    stopSpy.calls.reset();
    page.speaking.set(true);
    recommendationButtons[1]?.click();
    fixture.detectChanges();

    expect(stopSpy).toHaveBeenCalledWith(false);
  });

  it('resets active filters back to the full table', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const bucketFilter = root.querySelector(
      '[data-og7-id="admin-quality-bucket-filter"]',
    ) as HTMLSelectElement;
    const resetButton = root.querySelector(
      '[data-og7-id="admin-quality-reset-filters"]',
    ) as HTMLButtonElement;

    bucketFilter.value = 'product-gap';
    bucketFilter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(root.querySelectorAll('[data-og7="admin-quality-row"]').length).toBe(1);

    resetButton.click();
    fixture.detectChanges();

    expect(root.querySelectorAll('[data-og7="admin-quality-row"]').length).toBe(3);
  });
});
