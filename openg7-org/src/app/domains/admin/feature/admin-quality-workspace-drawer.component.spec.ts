import { TestBed } from '@angular/core/testing';
import { NotificationStore, NotificationStoreApi } from '@app/core/observability/notification.store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AdminQualityActionRecord } from '../pages/admin-quality-action-registry';
import { AdminQualityDelegationPlan } from '../pages/admin-quality-delegation';

import { AdminQualityWorkspaceDrawerComponent } from './admin-quality-workspace-drawer.component';

function buildDelegationPlan(
  overrides: Partial<AdminQualityDelegationPlan> = {}
): AdminQualityDelegationPlan {
  return {
    mode: 'product-closure',
    actionLabel: 'Close product surface',
    title: 'Close product surface - Business lifecycle',
    projectStatus: 'Scoping & strategic ideas',
    track: 'Front (Angular)',
    difficulty: 'Hard',
    repos: ['openg7-nexus'],
    primaryRepo: 'openg7-nexus',
    primaryRepoFullName: 'OpenG7/openg7-nexus',
    labels: ['lifecycle', 'trust', 'feed', 'product-gap'],
    targetFiles: [
      'src/app/domains/admin/pages/admin-trust.page.ts',
      'src/app/domains/feed/feature/pages/feed-opportunity-detail.page.ts',
    ],
    acceptanceCriteria: [
      'A durable lifecycle is visible in the product.',
      'The lifecycle keeps a readable trace after reopen and reload.',
    ],
    commands: ['yarn --cwd openg7-org build'],
    issueTitle: 'Product + QA: close the business lifecycle gap',
    issueBody: '## Delegation\n- Close the product surface.',
    codexPrompt: 'Goal: close the product surface.',
    githubIssueUrl: 'https://github.com/OpenG7/openg7-nexus/issues/new?title=test',
    ...overrides,
  };
}

function buildAction(overrides: Partial<AdminQualityActionRecord> = {}): AdminQualityActionRecord {
  return {
    id: 'admin-quality-copy-codex',
    entryId: 'observability',
    label: 'Copy Codex brief',
    route: '/admin/quality',
    component: 'AdminQualityPage',
    sourceFile: 'src/app/domains/admin/feature/admin-quality-workspace-drawer.component.html',
    selector: '[data-og7-id="admin-quality-copy-codex"]',
    trigger: 'button',
    intent: 'workflow',
    hasActionHook: true,
    context: 'Prepare a clean delegation handoff.',
    expectedResult: 'Copy a stable brief.',
    preconditions: ['A delegation plan is available.'],
    proof: ['src/app/domains/admin/feature/admin-quality-workspace-drawer.component.spec.ts'],
    states: { loading: false, success: true, error: true, offline: false, permission: true },
    domain: 'Observability',
    entryNeed: 'Expose a visible audit trail.',
    matrixE2EStatus: 'partiel',
    sourceDetected: true,
    detectedTrigger: 'button',
    detectedActionHook: true,
    detectedSourceFiles: ['src/app/domains/admin/feature/admin-quality-workspace-drawer.component.html:1'],
    detectedSpecFiles: [],
    detectedE2EFiles: [],
    completionScore: 100,
    status: 'needs-completion',
    gaps: ['Add a missing proof hook.'],
    ...overrides,
  };
}

describe('AdminQualityWorkspaceDrawerComponent', () => {
  let notifications: jasmine.SpyObj<NotificationStoreApi>;

  beforeEach(() => {
    notifications = jasmine.createSpyObj<NotificationStoreApi>('NotificationStoreApi', ['success', 'info', 'error']);

    TestBed.configureTestingModule({
      imports: [AdminQualityWorkspaceDrawerComponent, TranslateModule.forRoot()],
      providers: [{ provide: NotificationStore, useValue: notifications }],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      'en',
      {
        admin: {
          quality: {
            workspace: {
              compact: {
                label: 'Workspace',
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
                emptyBody: 'The QA queue will connect to the detailed matrix once structured data is available.',
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
                  brief: 'Codex brief',
                  briefBody: 'Prompt ready to copy, review, or delegate quickly.',
                  issue: 'GitHub issue',
                  issueBody: 'Precomposed issue for delegation or follow-up.',
                },
                buttons: {
                  copyBrief: 'Copy brief',
                  copyIssue: 'Copy issue',
                  openGithub: 'Open on GitHub',
                  confirmDispatch: 'Confirm and launch {{ provider }}',
                  launching: 'Queueing {{ provider }}...',
                },
                acceptanceCount: '{{ count }} item(s)',
                executionCount: '{{ files }} file(s) · {{ commands }} command(s)',
              },
              recalculation: {
                kicker: 'Matrix recalculation',
                current: 'Current state',
                proposed: 'Proposed state',
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
                emptyBody: 'The action registry will appear here once the active domain exposes structured instrumentation.',
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
          },
        },
      },
      true
    );
    translate.use('en');
  });

  it('renders translated workspace chrome and delegation content', () => {
    const fixture = TestBed.createComponent(AdminQualityWorkspaceDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('activeSurface', 'delegation');
    fixture.componentRef.setInput('delegationPlan', buildDelegationPlan());
    fixture.componentRef.setInput('selectedEntry', {
      id: 'business-lifecycle',
      domain: 'Business lifecycle',
      need: 'Track lifecycle changes before proof.',
      summaryStatus: 'partiel',
      businessStatus: 'oui',
      implementationStatus: 'partiel',
      e2eStatus: 'non',
      priority: 'haute',
      managementBucket: 'product-gap',
      needsProductWorkFirst: true,
      observedGap: 'The lifecycle is missing from the product.',
      nextMove: 'Expose a durable lifecycle on company or partner editing.',
      evidence: ['e2e/opportunity-enrichment-lifecycle.spec.ts'],
      reviewedAt: '2026-04-21',
    });
    fixture.componentRef.setInput('delegationCount', 1);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const dialog = root.querySelector('[role="dialog"]');

    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(root.textContent).toContain('Workspace');
    expect(root.textContent).toContain('Delegation');
    expect(root.textContent).toContain('Close product surface - Business lifecycle');
    expect(root.querySelector('[role="tablist"]')).not.toBeNull();
  });

  it('emits closeRequested from backdrop, close button, and Escape', () => {
    const fixture = TestBed.createComponent(AdminQualityWorkspaceDrawerComponent);
    const closeSpy = jasmine.createSpy('closeRequested');
    fixture.componentInstance.closeRequested.subscribe(closeSpy);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const closeButton = root.querySelector('[data-og7-id="admin-quality-workspace-close"]') as HTMLButtonElement;
    const backdropButton = root.querySelector('[data-og7-id="admin-quality-workspace-backdrop"]') as HTMLButtonElement;

    closeButton.click();
    backdropButton.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closeSpy).toHaveBeenCalledTimes(3);
  });

  it('emits surfaceChanged and exposes accessible tabs', () => {
    const fixture = TestBed.createComponent(AdminQualityWorkspaceDrawerComponent);
    const surfaceChangedSpy = jasmine.createSpy('surfaceChanged');
    fixture.componentInstance.surfaceChanged.subscribe(surfaceChangedSpy);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('activeSurface', 'delegation');
    fixture.componentRef.setInput('qaQueueCount', 15);
    fixture.componentRef.setInput('actionsCount', 2);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const actionsTab = root.querySelector('[data-og7-id="admin-quality-workspace-tab-actions"]') as HTMLButtonElement;
    const delegationTab = root.querySelector('[data-og7-id="admin-quality-workspace-tab-delegation"]') as HTMLButtonElement;

    expect(delegationTab.getAttribute('role')).toBe('tab');
    expect(delegationTab.getAttribute('aria-selected')).toBe('true');
    expect(actionsTab.getAttribute('aria-selected')).toBe('false');

    actionsTab.click();

    expect(surfaceChangedSpy).toHaveBeenCalledWith('actions');
  });

  it('copies the brief and issue, then opens the GitHub issue URL', async () => {
    const fixture = TestBed.createComponent(AdminQualityWorkspaceDrawerComponent);
    const plan = buildDelegationPlan();
    const clipboardSpy = jasmine.createSpy('writeText').and.resolveTo();
    const originalClipboard = (navigator as Navigator & { clipboard?: unknown }).clipboard;
    const openSpy = spyOn(window, 'open');

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardSpy },
      configurable: true,
    });

    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('activeSurface', 'delegation');
    fixture.componentRef.setInput('delegationPlan', plan);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const copyBriefButton = root.querySelector('[data-og7-id="admin-quality-copy-codex"]') as HTMLButtonElement;
    const copyIssueButton = root.querySelector('[data-og7-id="admin-quality-copy-issue"]') as HTMLButtonElement;
    const openGithubButton = root.querySelector('[data-og7-id="admin-quality-open-issue"]') as HTMLButtonElement;

    try {
      copyBriefButton.click();
      copyIssueButton.click();
      await fixture.whenStable();

      openGithubButton.click();

      expect(clipboardSpy).toHaveBeenCalledTimes(2);
      expect(openSpy).toHaveBeenCalledWith(plan.githubIssueUrl, '_blank', 'noopener,noreferrer');
      expect(notifications.success).toHaveBeenCalled();
    } finally {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
      });
    }
  });

  it('renders a simple actions list when action data is available', () => {
    const fixture = TestBed.createComponent(AdminQualityWorkspaceDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('activeSurface', 'actions');
    fixture.componentRef.setInput('actionsCount', 2);
    fixture.componentRef.setInput('actionItems', [
      buildAction(),
      buildAction({
        id: 'admin-quality-open-issue',
        label: 'Open GitHub issue',
        selector: '[data-og7-id="admin-quality-open-issue"]',
        expectedResult: 'Open the tracker with a prefilled issue.',
        status: 'proved',
      }),
    ]);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const panel = root.querySelector('[data-og7="admin-quality-workspace-panel"][data-og7-id="actions"]');

    expect(panel).not.toBeNull();
    expect(root.textContent).toContain('Copy Codex brief');
    expect(root.textContent).toContain('Open GitHub issue');
    expect(root.textContent).toContain('Needs completion');
    expect(root.textContent).toContain('Proved');
  });

  it('renders the selected signal context, lets the brief be edited, and emits codexLaunchRequested', () => {
    const fixture = TestBed.createComponent(AdminQualityWorkspaceDrawerComponent);
    const launchSpy = jasmine.createSpy('codexLaunchRequested');
    const promptChangedSpy = jasmine.createSpy('codexPromptChanged');
    fixture.componentInstance.codexLaunchRequested.subscribe(launchSpy);
    fixture.componentInstance.codexPromptChanged.subscribe(promptChangedSpy);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('activeSurface', 'delegation');
    fixture.componentRef.setInput('delegationPlan', buildDelegationPlan());
    fixture.componentRef.setInput('dispatchProviderLabel', 'Codex');
    fixture.componentRef.setInput('dispatchReady', true);
    fixture.componentRef.setInput('editableCodexPrompt', 'Original brief');
    fixture.componentRef.setInput('selectedSignalContext', {
      signalId: 'e2e',
      shortLabel: 'E',
      label: 'End-to-end',
      headline: 'E2E proof is partial.',
      detail: 'Current proof only covers one branch.',
      recommendedAction: 'Request a stronger regression before final review.',
      attention: true,
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const signalContext = root.querySelector(
      '[data-og7="admin-quality-workspace-signal-context"][data-og7-id="e2e"]',
    );
    const promptEditor = root.querySelector(
      '[data-og7-id="admin-quality-codex-prompt-editor"]',
    ) as HTMLTextAreaElement;
    const launchButton = root.querySelector(
      '[data-og7-id="admin-quality-confirm-dispatch"]',
    ) as HTMLButtonElement;

    expect(signalContext?.textContent).toContain('Signal context');
    expect(signalContext?.textContent).toContain('E2E proof is partial.');
    expect(signalContext?.textContent).toContain('Request a stronger regression before final review.');
    expect(promptEditor.value).toBe('Original brief');

    promptEditor.value = 'Adjusted brief';
    promptEditor.dispatchEvent(new Event('input'));

    launchButton.click();

    expect(promptChangedSpy).toHaveBeenCalledWith('Adjusted brief');
    expect(launchSpy).toHaveBeenCalledTimes(1);
  });

  it('renders recalculation evidence and emits applyProposalRequested', () => {
    const fixture = TestBed.createComponent(AdminQualityWorkspaceDrawerComponent);
    const applySpy = jasmine.createSpy('applyProposalRequested');
    fixture.componentInstance.applyProposalRequested.subscribe(applySpy);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('activeSurface', 'delegation');
    fixture.componentRef.setInput('applyProposalReady', true);
    fixture.componentRef.setInput('selectedRecalculationEntry', {
      entryId: 'advanced-discovery',
      domain: 'Deep discovery',
      result: 'proposal-review-required',
      confidence: 'high',
      current: {
        summaryStatus: 'non',
        businessStatus: 'oui',
        implementationStatus: 'partiel',
        e2eStatus: 'partiel',
        managementBucket: 'proof-gap',
        needsProductWorkFirst: false,
      },
      proposed: {
        summaryStatus: 'partiel',
        businessStatus: 'oui',
        implementationStatus: 'oui',
        e2eStatus: 'oui',
        managementBucket: 'covered',
        needsProductWorkFirst: false,
      },
      reasons: ['Latest mission decision is newer than the last review.'],
      evidence: ['e2e/feed-advanced-discovery-roundtrip.spec.ts'],
      factualSignals: {
        reviewedAt: '2026-04-07',
        repoSignalAt: '2026-05-02T12:00:00.000Z',
        repoSignalCommit: 'abc123def456',
        repoSignalSource: 'github-actions',
        latestDecisionAt: '2026-05-02T19:59:00.000Z',
      },
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const recalculationCard = root.querySelector(
      '[data-og7="admin-quality-workspace-recalculation"][data-og7-id="advanced-discovery"]',
    );
    const applyButton = root.querySelector(
      '[data-og7-id="admin-quality-apply-proposal"]',
    ) as HTMLButtonElement;

    expect(recalculationCard?.textContent).toContain('Matrix recalculation');
    expect(recalculationCard?.textContent).toContain('Reasons');
    expect(recalculationCard?.textContent).toContain('Evidence');

    applyButton.click();

    expect(applySpy).toHaveBeenCalledTimes(1);
  });
});
