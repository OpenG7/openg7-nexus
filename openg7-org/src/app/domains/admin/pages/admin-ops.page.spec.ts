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
        owner: 'OpenG7',
        repo: 'openg7-platform',
        workflow: 'codex-pr.yml',
        ref: 'main',
        requestedAt: '2026-04-26T00:00:00.000Z',
        request: {
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
  let routeQueryParams: Record<string, string>;

  beforeEach(async () => {
    routeQueryParams = {};
    service = new AdminOpsServiceMock();
    notifications = jasmine.createSpyObj<NotificationStoreApi>('NotificationStoreApi', [
      'success',
      'info',
      'error',
    ]);

    await TestBed.configureTestingModule({
      imports: [AdminOpsPage],
      providers: [
        { provide: AdminOpsService, useValue: service },
        { provide: NotificationStore, useValue: notifications },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get queryParamMap() {
                return convertToParamMap(routeQueryParams);
              },
            },
          },
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
    Object.assign(routeQueryParams, {
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
    expect(notifications.info).toHaveBeenCalledWith(
      'Codex dispatch prefilled from the quality cockpit.',
      {
        source: 'admin-ops',
      },
    );
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
