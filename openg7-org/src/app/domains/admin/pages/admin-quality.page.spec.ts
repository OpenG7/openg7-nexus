import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  NotificationStore,
  NotificationStoreApi,
} from '@app/core/observability/notification.store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import {
  AdminQualityMatrixService,
  AdminQualityMatrixSnapshot,
} from '../data-access/admin-quality-matrix.service';

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

describe('AdminQualityPage', () => {
  let service: AdminQualityMatrixServiceMock;
  let notifications: jasmine.SpyObj<NotificationStoreApi>;

  beforeEach(async () => {
    localStorage.removeItem('og7.admin-quality.mission-control.v1');
    localStorage.removeItem('og7.admin-quality.view-state.v1');
    service = new AdminQualityMatrixServiceMock();
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
                label: 'Codex runway',
                title: 'Generated task runway',
                subtitle: 'Estimate the task volume before starting the selected mission.',
                status: {
                  sufficient: 'Quota sufficient',
                  insufficient: 'Quota insufficient',
                },
                metrics: {
                  tasks: 'Tasks',
                  tasksBody: 'Generated from the active mission.',
                  required: 'Required quota',
                  requiredBody: 'Estimated units for the current plan.',
                  available: 'Available quota',
                  availableBody: 'Local operator estimate until Codex usage is connected.',
                  remaining: 'Runway left',
                  remainingBody: 'Units left after this mission.',
                  missing: 'Units missing',
                  missingBody: 'Increase the quota before launching the task.',
                },
                ready: 'The mission can be delegated without exceeding the current quota estimate.',
                blocked: 'Increase the available quota before launching the generated task set.',
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
                insufficientQuota:
                  'Quota too low: {{ required }} unit(s) required, {{ available }} available, {{ missing }} missing.',
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
    expect(root.querySelector('[data-og7-id="proved-domains"]')?.textContent).toContain('1');
    expect(root.querySelector('[data-og7-id="proof-gap-domains"]')?.textContent).toContain('1');
    expect(root.querySelector('[data-og7-id="product-work-domains"]')?.textContent).toContain('1');
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
    expect(missionControl?.textContent).toContain('Deleguer');
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
    updatedApproveButton.click();
    fixture.detectChanges();

    expect(root.textContent).toContain('Pret a lancer');
    expect(notifications.success).toHaveBeenCalledWith('Mission approuvee par un humain.', {
      source: 'admin-quality',
    });
  });

  it('generates mission tasks and shows a sufficient quota runway for the active mission', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const runway = root.querySelector('[data-og7="admin-quality-codex-runway"]');
    const quotaStatus = root.querySelector('[data-og7-id="admin-quality-codex-quota-status"]');
    const generatedTasks = root.querySelectorAll('[data-og7="admin-quality-generated-task"]');
    const generatedTaskCount = root.querySelector(
      '[data-og7-id="admin-quality-generated-task-count"]',
    );

    expect(runway).not.toBeNull();
    expect(quotaStatus?.textContent).toContain('Quota sufficient');
    expect(generatedTasks.length).toBe(8);
    expect(generatedTaskCount?.textContent).toContain('8');
    expect(runway?.textContent).toContain(
      'The mission can be delegated without exceeding the current quota estimate.',
    );
  });

  it('blocks delegation when the available quota is below the generated task estimate', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const quotaInput = root.querySelector(
      '[data-og7-id="admin-quality-codex-quota-input"]',
    ) as HTMLInputElement;

    quotaInput.value = '40';
    quotaInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const delegateButton = Array.from(root.querySelectorAll('[data-og7="action"]')).find(
      (element) => element.textContent?.trim() === 'Deleguer',
    ) as HTMLButtonElement | undefined;
    const quotaStatus = root.querySelector('[data-og7-id="admin-quality-codex-quota-status"]');

    expect(fixture.componentInstance.availableCodexQuotaUnits()).toBe(40);
    expect(quotaStatus?.textContent).toContain('Quota insufficient');
    expect(delegateButton?.disabled).toBeTrue();

    delegateButton?.click();
    fixture.detectChanges();

    expect(root.textContent).toContain(
      'Increase the available quota before launching the generated task set.',
    );
    expect(notifications.error).not.toHaveBeenCalled();
    expect(fixture.componentInstance.selectedMission()?.status).toBe('proposed');
  });

  it('opens admin ops with a prefilled Codex dispatch when delegation starts', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const delegateButton = Array.from(root.querySelectorAll('[data-og7="action"]')).find(
      (element) => element.textContent?.trim() === 'Deleguer'
    ) as HTMLButtonElement | undefined;

    delegateButton?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedMission()?.status).toBe('in-progress');
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/ops'], {
      queryParams: jasmine.objectContaining({
        codexScope: 'openg7-org',
        codexBaseBranch: 'main',
        codexDraftPr: 'true',
        codexSource: 'admin-quality',
        codexMissionId: 'advanced-discovery::core',
      }),
    });
    const queryParams = navigateSpy.calls.mostRecent().args[1]?.queryParams as Record<string, string>;
    expect(queryParams['codexTask']).toContain('Recherche et decouverte profonde');
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
