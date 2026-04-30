import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  NotificationStore,
  NotificationStoreApi,
} from '@app/core/observability/notification.store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { AdminOpsService } from '../data-access/admin-ops.service';
import {
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
        },
      ],
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
            url: 'https://github.com/OpenG7/openg7-platform/actions/runs/501',
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
              url: 'https://github.com/OpenG7/openg7-platform/actions/runs/501#artifacts',
            },
            {
              id: 9002,
              name: 'logs',
              sizeBytes: 1024,
              expired: false,
              url: 'https://github.com/OpenG7/openg7-platform/actions/runs/501#artifacts',
            },
          ],
          pullRequest: {
            number: 321,
            title: 'Codex QA proof package',
            url: 'https://github.com/OpenG7/openg7-platform/pull/321',
            state: 'open',
            merged: false,
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
            url: 'https://github.com/OpenG7/openg7-platform/actions/runs/701',
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
            url: 'https://github.com/OpenG7/openg7-platform/actions/runs/601',
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
              url: 'https://github.com/OpenG7/openg7-platform/actions/runs/601#artifacts',
            },
          ],
          pullRequest: {
            number: 322,
            title: 'Claude draft improvements',
            url: 'https://github.com/OpenG7/openg7-platform/pull/322',
            state: 'open',
            merged: false,
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
        repo: 'openg7-platform',
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

  it('renders a compact workspace bar and opens the drawer on demand', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const workspaceBar = root.querySelector('[data-og7="admin-quality-workspace-bar"]');
    const openWorkspaceButton = root.querySelector(
      '[data-og7-id="admin-quality-open-workspace"]',
    ) as HTMLButtonElement;
    const secondaryQueue = root.querySelector(
      '[data-og7="admin-quality-secondary-queue"]',
    ) as HTMLDetailsElement;

    expect(workspaceBar).not.toBeNull();
    expect(secondaryQueue).not.toBeNull();
    expect(secondaryQueue.open).toBeFalse();
    expect(root.querySelector('[data-og7="admin-quality-workspace-drawer"]')).toBeNull();

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
    const domainFilter = root.querySelector(
      '[data-og7-id="admin-quality-domain-filter"]',
    ) as HTMLSelectElement;

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
    const missionControl = root.querySelector('[data-og7="admin-quality-mission-control"]');
    const missionHero = root.querySelector('[data-og7="admin-quality-mission-hero"]');
    const missionWorkflow = root.querySelector('[data-og7="admin-quality-mission-workflow"]');
    const missionControlShell = root.querySelector(
      '[data-og7="admin-quality-mission-control-shell"]',
    );
    const recommendations = root.querySelectorAll('[data-og7="admin-quality-recommendation"]');
    let recommendationButtons = root.querySelectorAll(
      '[data-og7="admin-quality-recommendation"] > button',
    ) as NodeListOf<HTMLButtonElement>;

    expect(missionControl).not.toBeNull();
    expect(missionHero).not.toBeNull();
    expect(missionWorkflow).not.toBeNull();
    expect(root.querySelector('[data-og7="admin-quality-local-state"]')).toBeNull();
    expect(missionControl?.textContent).toContain('Mission Control');
    expect(missionControl?.textContent).toContain('Gap constate');
    expect(missionControl?.textContent).toContain('Mission suggeree');
    expect(missionControl?.textContent).toContain('Valider mission');
    expect(missionControl?.textContent).toContain('Lancer Codex');
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

    const updatedApproveButton = root.querySelector(
      '[data-og7-id="admin-quality-approve-mission"]',
    ) as HTMLButtonElement;
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
    const runway = root.querySelector('[data-og7="admin-quality-codex-runway"]');
    const quotaStatus = root.querySelector('[data-og7-id="admin-quality-codex-quota-status"]');
    const generatedTasks = root.querySelectorAll('[data-og7="admin-quality-generated-task"]');
    const generatedTaskCount = root.querySelector(
      '[data-og7-id="admin-quality-generated-task-count"]',
    );
    const telemetryStatus = root.querySelector('[data-og7-id="admin-quality-ai-telemetry-status"]');
    const telemetryDetail = root.querySelector('[data-og7-id="admin-quality-ai-telemetry-detail"]');
    const missionLoop = root.querySelector('[data-og7="admin-quality-mission-loop"]');
    const missionLoopSteps = root.querySelectorAll('[data-og7="admin-quality-mission-loop-step"]');
    const missionEnergyLane = root.querySelector('[data-og7="admin-quality-mission-energy-lane"]');
    const missionEnergySegments = root.querySelectorAll(
      '[data-og7="admin-quality-mission-energy-lane-segment"]',
    );
    const missionHud = root.querySelector('[data-og7="admin-quality-mission-hud"]');
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
    const contactLogEntries = root.querySelectorAll(
      '[data-og7="admin-quality-mission-control-contact-log-entry"]',
    );
    const coveragePanel = root.querySelector(
      '[data-og7="admin-quality-panel-shell"][data-og7-id="coverage"]',
    );
    const workspacePanel = root.querySelector('[data-og7="admin-quality-workspace-bar"]');
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
    const proofTelemetry = root.querySelector('[data-og7="admin-quality-proof-telemetry"]');

    expect(runway).not.toBeNull();
    expect(missionHud).not.toBeNull();
    expect(missionHud?.getAttribute('data-og7-expanded')).toBe('true');
    expect(missionHud?.getAttribute('data-og7-ambient')).toBe('nominal');
    expect(missionHud?.getAttribute('data-og7-cockpit-tone')).toBe('codex');
    expect(missionHudAmbientLayer).not.toBeNull();
    expect(missionControlShell?.getAttribute('data-og7-ambient')).toBe('nominal');
    expect(missionControlShell?.getAttribute('data-og7-provider')).toBe('codex');
    expect(missionControlShell?.getAttribute('data-og7-cockpit-tone')).toBe('codex');
    expect(missionControlShell?.getAttribute('data-og7-proof-stream')).toBe('high');
    expect(missionControlShell?.getAttribute('data-og7-radar-signal')).toBe('pulse');
    expect(missionControlRadar).not.toBeNull();
    expect(missionControlRadarSweep).not.toBeNull();
    expect(missionControlRadarSweep?.getAttribute('data-og7-speed')).toBe('nominal');
    expect(missionControlRadarSweep?.getAttribute('data-og7-mode')).toBe('lock');
    expect(missionControlCadence?.textContent).toContain('1 event / active cycle');
    expect(missionControlCadenceDetail?.textContent).toContain('1 lock');
    expect(missionControlCadenceDetail?.textContent).toContain('0 action');
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
    expect(cockpitSyncBands.length).toBe(2);
    expect(missionHud?.textContent).toContain('Etendre la preuve QA');
    expect(missionHud?.textContent).toContain('Recherche et decouverte profonde');
    expect(missionHudMiniLane).not.toBeNull();
    expect(missionHudMiniSegments.length).toBe(3);
    expect(missionHudMiniSegments[0]?.getAttribute('data-og7-state')).toBe('flowing');
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
    expect(missionLoopSteps.length).toBe(4);
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

  it('opens the workspace directly from the sticky mission HUD actions', () => {
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

  it('updates the sticky mission HUD active section when a section chip is selected', () => {
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
    const cards = root.querySelectorAll('[data-og7="admin-quality-provider-comparison-card"]');
    const codexCard = root.querySelector(
      '[data-og7="admin-quality-provider-comparison-card"][data-og7-id="codex"]',
    );
    const claudeCard = root.querySelector(
      '[data-og7="admin-quality-provider-comparison-card"][data-og7-id="claude"]',
    );

    expect(cards.length).toBe(4);
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
    const delegateButton = Array.from(root.querySelectorAll('[data-og7="action"]')).find(
      (element) => element.textContent?.trim() === 'Lancer Codex',
    ) as HTMLButtonElement | undefined;
    const quotaStatus = root.querySelector('[data-og7-id="admin-quality-codex-quota-status"]');

    expect(fixture.componentInstance.selectedAiDispatchReady()).toBeFalse();
    expect(quotaStatus?.textContent).toContain('Ops blocked');
    expect(delegateButton?.disabled).toBeTrue();

    delegateButton?.click();
    fixture.detectChanges();

    expect(root.textContent).toContain(
      'Dispatch is blocked until Ops reports an enabled workflow and inserted key.',
    );
    expect(notifications.error).not.toHaveBeenCalled();
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
    const aiBay = root.querySelector('[data-og7="admin-quality-ai-bay"]');
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
    const delegateButton = Array.from(root.querySelectorAll('[data-og7="action"]')).find(
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
