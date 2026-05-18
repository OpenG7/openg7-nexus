import { signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationEntry, NotificationStore } from '@app/core/observability/notification.store';
import { of } from 'rxjs';

import { AdminGithubActionTrackerService } from './admin-github-action-tracker.service';
import { AdminOpsCodexDispatchResponse, AdminOpsService } from './admin-ops.service';

class MockNotificationStore {
  info = jasmine.createSpy('info').and.returnValue('track-1');
  entries = signal<NotificationEntry[]>([
    {
      id: 'agent-1',
      type: 'info',
      title: 'Agent admin-quality',
      message: 'Agent de developpement actif.',
      source: 'admin-quality-agent',
      metadata: { missionId: 'quality-surface', entryId: 'observability' },
      actions: [
        {
          id: 'dispatch-codex',
          label: 'Codex Surface: Cycle de vie des...',
          kind: 'codex-dispatch',
          codexDispatch: {
            provider: 'codex',
            task: 'Cycle de vie des documents.',
            scope: 'openg7-org',
            baseBranch: 'main',
            draftPr: true,
            model: 'gpt-5.4',
            effort: null,
          },
        },
      ],
      createdAt: Date.now(),
      read: false,
    },
  ]);
  updateEntry = jasmine.createSpy('updateEntry').and.callFake(
    (id: string, update: Partial<NotificationEntry>) => {
      this.entries.update((entries) =>
        entries.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                ...update,
              }
            : entry,
        ),
      );
    },
  );
}

class MockAdminOpsService {
  getAiProofs = jasmine.createSpy('getAiProofs').and.returnValue(
    of({
      generatedAt: '2026-05-13T00:01:00.000Z',
      providers: [
        {
          provider: 'codex',
          label: 'Codex',
          workflow: 'codex.yml',
          state: 'completed',
          summary: 'Workflow #42 completed with 1 artifact.',
          run: {
            id: 420,
            number: 42,
            url: 'https://github.test/actions/runs/420',
            displayTitle: 'Codex og7-test-correlation / openg7-org',
            correlationId: 'og7-test-correlation',
            status: 'completed',
            conclusion: 'success',
            branch: 'main',
            createdAt: '2026-05-13T00:00:01.000Z',
            updatedAt: '2026-05-13T00:01:00.000Z',
          },
          artifacts: [],
          pullRequest: null,
        },
      ],
    }),
  );
}

describe('AdminGithubActionTrackerService', () => {
  let service: AdminGithubActionTrackerService;
  let notifications: MockNotificationStore;
  let ops: MockAdminOpsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminGithubActionTrackerService,
        { provide: NotificationStore, useClass: MockNotificationStore },
        { provide: AdminOpsService, useClass: MockAdminOpsService },
      ],
    });

    service = TestBed.inject(AdminGithubActionTrackerService);
    notifications = TestBed.inject(NotificationStore) as unknown as MockNotificationStore;
    ops = TestBed.inject(AdminOpsService) as unknown as MockAdminOpsService;
  });

  it('updates the source notification action with the correlated GitHub run state', fakeAsync(() => {
    service.startTracking(createDispatch(), {
      source: 'admin-quality-agent',
      parentNotificationId: 'agent-1',
      actionId: 'dispatch-codex',
      correlationId: 'og7-test-correlation',
      idempotencyKey: 'og7-test-correlation-dispatch-codex',
    });

    tick(0);

    expect(notifications.info).not.toHaveBeenCalled();
    expect(ops.getAiProofs).toHaveBeenCalledWith('og7-test-correlation');
    expect(notifications.updateEntry).toHaveBeenCalledWith(
      'agent-1',
      jasmine.objectContaining({
        type: 'success',
        message: 'Workflow #42 completed with 1 artifact.',
        metadata: jasmine.objectContaining({
          missionId: 'quality-surface',
          entryId: 'observability',
          githubActionStatus: jasmine.objectContaining({
            state: 'completed',
            runNumber: 42,
            runUrl: 'https://github.test/actions/runs/420',
          }),
        }),
        actions: [
          jasmine.objectContaining({
            id: 'dispatch-codex',
            label: 'Voir resultat #42',
            kind: 'route',
            route: '/admin/quality?entryId=observability',
            codexDispatch: null,
          }),
          jasmine.objectContaining({
            id: 'dispatch-codex-open-ops',
            label: 'Voir Ops',
            kind: 'route',
            route: '/admin/ops',
          }),
        ],
      }),
    );
  }));
});

function createDispatch(): AdminOpsCodexDispatchResponse {
  return {
    queued: true,
    provider: 'github-actions',
    selectedProvider: 'codex',
    owner: 'OpenG7',
    repo: 'openg7-platform',
    workflow: 'codex.yml',
    ref: 'main',
    requestedAt: '2026-05-13T00:00:00.000Z',
    request: {
      selectedProvider: 'codex',
      scope: 'openg7-org',
      baseBranch: 'main',
      draftPr: true,
      model: 'gpt-5.4',
      effort: null,
      correlationId: 'og7-test-correlation',
      idempotencyKey: 'og7-test-correlation-dispatch-codex',
      taskLength: 32,
    },
  };
}
