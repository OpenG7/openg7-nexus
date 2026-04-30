/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import {
  NotificationStore,
  NotificationStoreApi,
} from '@app/core/observability/notification.store';
import { of, throwError } from 'rxjs';

import {
  AdminOpsCodexDispatchRequest,
  AdminOpsCodexDispatchResponse,
  AdminOpsService,
  AdminOpsSnapshot,
} from '../data-access/admin-ops.service';

import { AdminOpsPage } from './admin-ops.page';

class AdminOpsServiceMock {
  readonly getSnapshot = jasmine.createSpy('getSnapshot').and.returnValue(
    of<AdminOpsSnapshot>({
      health: {
        generatedAt: '2026-04-26T00:00:00.000Z',
        status: 'ok',
        runtime: {
          env: 'test',
          nodeVersion: 'v22.0.0',
          uptimeSeconds: 120,
        },
        memory: {
          rssBytes: 1024,
          heapUsedBytes: 512,
          heapTotalBytes: 2048,
        },
        database: {
          status: 'ok',
          users: 10,
          companies: 20,
          feedItems: 30,
        },
      },
      backups: {
        generatedAt: '2026-04-26T00:00:00.000Z',
        status: 'ok',
        enabled: true,
        directory: '/tmp/backups',
        retentionDays: 30,
        schedule: '0 2 * * *',
        totalFiles: 2,
        totalSizeBytes: 4096,
        lastBackupAt: '2026-04-25T23:00:00.000Z',
        files: [],
      },
      imports: {
        generatedAt: '2026-04-26T00:00:00.000Z',
        totalCompanies: 20,
        scannedCompanies: 20,
        truncated: false,
        importedCompanies: 5,
        importsLast24h: 1,
        lastImportAt: '2026-04-25T22:00:00.000Z',
        sources: [],
        recent: [],
      },
      security: {
        generatedAt: '2026-04-26T00:00:00.000Z',
        users: {
          total: 10,
          blocked: 1,
          registrationsLast7d: 2,
        },
        sessions: {
          scannedUsers: 10,
          truncated: false,
          active: 3,
          revoked: 1,
          usersWithActiveSessions: 2,
        },
        uploads: {
          safetyEnabled: true,
          maxFileSizeBytes: 1024,
          allowedMimeTypes: ['image/png'],
        },
        auth: {
          sessionIdleTimeoutMs: 3600000,
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
            provider: 'claude',
            label: 'Claude',
            workflow: 'claude-pr.yml',
            secretName: 'ANTHROPIC_API_KEY',
            dispatchEnabled: true,
            keyInserted: false,
            state: 'offline',
            note: 'Insert ANTHROPIC_API_KEY into GitHub Actions secrets to power this module.',
          },
          {
            provider: 'gemini',
            label: 'Gemini',
            workflow: 'gemini-pr.yml',
            secretName: 'GEMINI_API_KEY',
            dispatchEnabled: false,
            keyInserted: false,
            state: 'scan-unavailable',
            note: 'The control plane could not verify GitHub Actions secrets for this module.',
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
        ],
        moderation: {
          pendingCompanies: 1,
          suspendedCompanies: 0,
        },
      },
    }),
  );

  readonly dispatchCodexWorkflow = jasmine
    .createSpy('dispatchCodexWorkflow')
    .and.callFake((payload: AdminOpsCodexDispatchRequest) =>
      of<AdminOpsCodexDispatchResponse>({
        queued: true,
        provider: 'github-actions',
        selectedProvider: payload.provider,
        owner: 'OpenG7',
        repo: 'openg7-platform',
        workflow: 'codex-pr.yml',
        ref: 'main',
        requestedAt: '2026-04-26T00:00:00.000Z',
        request: {
          selectedProvider: payload.provider,
          scope: payload.scope,
          baseBranch: payload.baseBranch,
          draftPr: payload.draftPr,
          model: payload.model,
          effort: payload.effort,
          taskLength: payload.task.length,
        },
      }),
    );
}

describe('AdminOpsPage', () => {
  let service: AdminOpsServiceMock;
  let notifications: jasmine.SpyObj<NotificationStoreApi>;
  let activatedRouteMock: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };

  beforeEach(async () => {
    service = new AdminOpsServiceMock();
    notifications = jasmine.createSpyObj<NotificationStoreApi>('NotificationStoreApi', [
      'success',
      'info',
      'error',
    ]);
    activatedRouteMock = {
      snapshot: {
        queryParamMap: convertToParamMap({}),
      },
    };

    await TestBed.configureTestingModule({
      imports: [AdminOpsPage],
      providers: [
        { provide: AdminOpsService, useValue: service },
        { provide: NotificationStore, useValue: notifications },
        {
          provide: ActivatedRoute,
          useValue: activatedRouteMock,
        },
      ],
    }).compileComponents();
  });

  it('dispatches the Codex workflow from the admin ops control plane', () => {
    const fixture = TestBed.createComponent(AdminOpsPage);
    fixture.detectChanges();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const taskField = root.querySelector('[data-og7-id="task"]') as HTMLTextAreaElement;
    const submitButton = root.querySelector(
      '[data-og7-id="admin-ops-codex-dispatch"]',
    ) as HTMLButtonElement;

    taskField.value = 'Fix the login empty state and add a focused test.';
    taskField.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    submitButton.click();
    fixture.detectChanges();

    expect(service.dispatchCodexWorkflow).toHaveBeenCalledWith({
      provider: 'codex',
      task: 'Fix the login empty state and add a focused test.',
      scope: 'openg7-org',
      baseBranch: 'main',
      draftPr: true,
      model: null,
      effort: null,
    });
    expect(root.querySelector('[data-og7-id="admin-ops-codex-success"]')).not.toBeNull();
    expect(notifications.success).toHaveBeenCalled();
  });

  it('prefills Codex dispatch fields from admin quality query params', () => {
    activatedRouteMock.snapshot.queryParamMap = convertToParamMap({
      aiProvider: 'copilot',
      provider: 'copilot',
      codexProvider: 'copilot',
      codexTask: 'Objectif: renforcer la preuve qualite.',
      codexScope: 'openg7-org',
      codexBaseBranch: 'release/quality',
      codexDraftPr: 'false',
      codexModel: 'gpt-5.4',
      codexEffort: 'high',
      codexSource: 'admin-quality',
    });

    const fixture = TestBed.createComponent(AdminOpsPage);
    fixture.detectChanges();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.codexEffort()).toBe('high');
    expect((root.querySelector('[data-og7-id="task"]') as HTMLTextAreaElement).value).toBe(
      'Objectif: renforcer la preuve qualite.',
    );
    expect((root.querySelector('[data-og7-id="base-branch"]') as HTMLInputElement).value).toBe(
      'release/quality',
    );
    expect((root.querySelector('[data-og7-id="model"]') as HTMLInputElement).value).toBe('gpt-5.4');
    expect((root.querySelector('[data-og7-id="effort"]') as HTMLSelectElement).value).toBe('high');
    expect(
      (root.querySelector('[data-og7-id="draft-pr"]') as HTMLInputElement).checked,
    ).toBeFalse();
    expect(notifications.info).toHaveBeenCalled();
  });

  it('switches AI provider from the admin ops form and updates the helper state', () => {
    const fixture = TestBed.createComponent(AdminOpsPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const providerField = root.querySelector('[data-og7-id="provider"]') as HTMLSelectElement;
    const modelField = root.querySelector('[data-og7-id="model"]') as HTMLInputElement;

    providerField.value = 'claude';
    providerField.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.dispatchProvider()).toBe('claude');
    expect(modelField.value).toBe('claude-sonnet-4-5');
    expect(root.querySelector('[data-og7-id="admin-ops-provider-routing-note"]')).not.toBeNull();
  });

  it('renders the ignition console with green and dark key bays from the security snapshot', () => {
    const fixture = TestBed.createComponent(AdminOpsPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const codexBay = root.querySelector('[data-og7-id="admin-ops-ai-key-codex"]');
    const claudeBay = root.querySelector('[data-og7-id="admin-ops-ai-key-claude"]');
    const geminiBay = root.querySelector('[data-og7-id="admin-ops-ai-key-gemini"]');
    const readyIndicator = codexBay?.querySelector('[data-og7="admin-ops-ai-key-indicator"]');
    const liveStatus = root.querySelector('[data-og7-id="admin-ops-live-status"]');
    const liveDetail = root.querySelector('[data-og7-id="admin-ops-live-detail"]');

    expect(root.querySelector('[data-og7="admin-ops-ai-key-console"]')).not.toBeNull();
    expect(codexBay?.getAttribute('data-og7-state')).toBe('ready');
    expect(claudeBay?.getAttribute('data-og7-state')).toBe('offline');
    expect(geminiBay?.getAttribute('data-og7-state')).toBe('scan-unavailable');
    expect(codexBay?.className).toContain('og7-ignition-module');
    expect(codexBay?.getAttribute('style')).toContain('animation-delay');
    expect(readyIndicator?.className).toContain('og7-ignition-indicator--ready');
    expect(liveStatus?.textContent).toContain('Live pulse nominal');
    expect(liveStatus?.getAttribute('data-og7-state')).toBe('live');
    expect(liveDetail?.textContent).toContain('Next sweep in');
    expect(root.textContent).toContain('ANTHROPIC_API_KEY');
  });

  it('shows provider diagnostics and updates the panel when another bay is inspected', () => {
    const fixture = TestBed.createComponent(AdminOpsPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const claudeInspect = root.querySelector(
      '[data-og7-id="admin-ops-ai-key-inspect-claude"]',
    ) as HTMLButtonElement;

    expect(root.querySelector('[data-og7="admin-ops-ai-diagnostics"]')?.textContent).toContain(
      'Codex engine bay',
    );
    expect(
      root.querySelector('[data-og7-id="admin-ops-ai-diagnostic-action"]')?.textContent,
    ).toContain('Run a dispatch');

    claudeInspect.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.dispatchProvider()).toBe('claude');
    expect(root.querySelector('[data-og7="admin-ops-ai-diagnostics"]')?.textContent).toContain(
      'Claude engine bay',
    );
    expect(
      root.querySelector('[data-og7="admin-ops-ai-diagnostic-item"][data-og7-id="socket"]')
        ?.textContent,
    ).toContain('ANTHROPIC_API_KEY');
    expect(
      root.querySelector('[data-og7-id="admin-ops-ai-diagnostic-action"]')?.textContent,
    ).toContain('Insert ANTHROPIC_API_KEY');
  });

  it('shows the dispatch error inline when the backend rejects the request', () => {
    service.dispatchCodexWorkflow.and.returnValue(
      throwError(() => ({ error: { message: 'owner.ops.codex.scope.invalid' } })),
    );

    const fixture = TestBed.createComponent(AdminOpsPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const taskField = root.querySelector('[data-og7-id="task"]') as HTMLTextAreaElement;
    const submitButton = root.querySelector(
      '[data-og7-id="admin-ops-codex-dispatch"]',
    ) as HTMLButtonElement;

    taskField.value = 'Fix the login empty state and add a focused test.';
    taskField.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    submitButton.click();
    fixture.detectChanges();

    const error = root.querySelector('[data-og7-id="admin-ops-codex-error"]');
    expect(error?.textContent).toContain('owner.ops.codex.scope.invalid');
    expect(notifications.error).toHaveBeenCalled();
  });
});
