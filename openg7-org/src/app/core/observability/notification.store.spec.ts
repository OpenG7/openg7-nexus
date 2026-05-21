import { TestBed } from '@angular/core/testing';

import { NotificationAction, NotificationStore, NotificationStoreApi } from './notification.store';

const STORAGE_KEY = 'og7.notifications.v1';

describe('NotificationStore', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.removeItem(STORAGE_KEY);
  });

  it('restores notification action status after a browser restart', () => {
    const store = createStore();
    const notificationId = store.info('Agent admin-quality actif.', {
      source: 'admin-quality-agent',
      metadata: {
        kind: 'home-agent-activation',
        dedupeKey: 'admin-quality-agent:user-1',
      },
      actions: [createCodexDispatchAction()],
    });

    expect(notificationId).toBeTruthy();

    store.updateEntry(notificationId as string, {
      type: 'success',
      message: 'Workflow #42 completed with 1 artifact.',
      metadata: {
        kind: 'home-agent-activation',
        dedupeKey: 'admin-quality-agent:user-1',
        githubActionStatus: {
          state: 'completed',
          label: 'GitHub Actions - termine',
          detail: 'Workflow #42 completed with 1 artifact.',
          workflow: 'codex.yml',
          runUrl: 'https://github.test/actions/runs/42',
          runNumber: 42,
          correlationId: 'og7-test-correlation',
          updatedAt: '2026-05-13T00:01:00.000Z',
        },
      },
      actions: [
        {
          id: 'admin-quality-agent-task-proof',
          label: 'Codex Preuve: Qualite admin - termine #42',
          kind: 'route',
          route: '/admin/ops',
          codexDispatch: null,
        },
      ],
    });

    const persisted = readPersistedPayload();
    expect(persisted.items[0].actions[0]).toEqual(
      jasmine.objectContaining({
        label: 'Codex Preuve: Qualite admin - termine #42',
        kind: 'route',
        route: '/admin/ops',
      }),
    );

    TestBed.resetTestingModule();
    const restoredStore = createStore();
    const restored = restoredStore.entries()[0];

    expect(restored.message).toBe('Workflow #42 completed with 1 artifact.');
    expect(restored.actions?.[0]).toEqual(
      jasmine.objectContaining({
        label: 'Codex Preuve: Qualite admin - termine #42',
        kind: 'route',
        route: '/admin/ops',
      }),
    );
  });

  it('keeps a persisted action status when a deduped notification is announced again', () => {
    const store = createStore();
    const firstNotificationId = store.info('Agent admin-quality actif.', {
      source: 'admin-quality-agent',
      metadata: {
        kind: 'home-agent-activation',
        dedupeKey: 'admin-quality-agent:user-1',
      },
      actions: [
        {
          id: 'admin-quality-agent-task-proof',
          label: 'Voir resultat #12',
          kind: 'route',
          route: '/admin/quality?entryId=observability',
          codexDispatch: null,
        },
      ],
    });

    const secondNotificationId = store.info('Agent admin-quality rafraichi.', {
      source: 'admin-quality-agent',
      metadata: {
        kind: 'home-agent-activation',
        dedupeKey: 'admin-quality-agent:user-1',
        openCount: 1,
      },
      actions: [createCodexDispatchAction()],
    });

    expect(secondNotificationId).toBe(firstNotificationId);
    expect(store.entries().length).toBe(1);
    expect(store.entries()[0].message).toBe('Agent admin-quality rafraichi.');
    expect(store.entries()[0].actions?.[0]).toEqual(
      jasmine.objectContaining({
        label: 'Voir resultat #12',
        kind: 'route',
        route: '/admin/quality?entryId=observability',
      }),
    );
  });

  it('dedupes the legacy home agent notification with the admin-quality workload notification', () => {
    const store = createStore();
    const homeNotificationId = store.info('Agent de developpement actif pour contact@openg7.org.', {
      source: 'admin-quality-agent',
      metadata: {
        kind: 'home-agent-activation',
        userEmail: 'contact@openg7.org',
      },
      actions: [
        {
          id: 'admin-quality-agent-task-proof',
          label: 'Codex Preuve: Qualite admin - en file',
          kind: 'route',
          route: '/admin/ops',
          codexDispatch: null,
        },
      ],
    });

    const workloadNotificationId = store.info('Agent admin-quality: 10 chantier(s) ouvert(s).', {
      source: 'admin-quality-agent',
      metadata: {
        kind: 'agent-workload',
        dedupeKey: 'admin-quality-agent:workload',
      },
      actions: [createCodexDispatchAction()],
    });

    expect(workloadNotificationId).toBe(homeNotificationId);
    expect(store.entries().length).toBe(1);
    expect(store.entries()[0].message).toBe('Agent admin-quality: 10 chantier(s) ouvert(s).');
    expect(store.entries()[0].actions?.[0]).toEqual(
      jasmine.objectContaining({
        label: 'Codex Preuve: Qualite admin - en file',
        kind: 'route',
        route: '/admin/ops',
      }),
    );
  });

  it('dedupes already persisted admin-quality agent notifications during initialization', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        snoozedSources: {},
        items: [
          {
            id: 'workload-1',
            type: 'info',
            title: 'Agent admin-quality',
            message: 'Agent admin-quality: 10 chantier(s) ouvert(s).',
            source: 'admin-quality-agent',
            metadata: {
              kind: 'agent-workload',
              dedupeKey: 'admin-quality-agent:workload',
            },
            actions: [createCodexDispatchAction()],
            createdAt: 2,
            read: false,
          },
          {
            id: 'home-1',
            type: 'info',
            title: 'Agent admin-quality',
            message: 'Agent de developpement actif pour contact@openg7.org.',
            source: 'admin-quality-agent',
            metadata: {
              kind: 'home-agent-activation',
              userEmail: 'contact@openg7.org',
            },
            actions: [
              {
                id: 'admin-quality-agent-task-proof',
                label: 'Codex Preuve: Qualite admin - en file',
                kind: 'route',
                route: '/admin/ops',
                codexDispatch: null,
              },
            ],
            createdAt: 1,
            read: true,
          },
        ],
      }),
    );

    const store = createStore();

    expect(store.entries().length).toBe(1);
    expect(store.entries()[0].id).toBe('workload-1');
    expect(store.entries()[0].message).toBe('Agent admin-quality: 10 chantier(s) ouvert(s).');
    expect(store.entries()[0].actions?.[0]).toEqual(
      jasmine.objectContaining({
        label: 'Codex Preuve: Qualite admin - en file',
        kind: 'route',
        route: '/admin/ops',
      }),
    );
  });

  it('dedupes admin-quality next-work propositions per entry', () => {
    const store = createStore();
    const firstNotificationId = store.info('Je peux preparer "Preuve" pour Qualite admin.', {
      title: 'Proposition agent',
      source: 'admin-quality-agent',
      metadata: {
        kind: 'agent-next-work',
        entryId: 'observability',
        tone: 'proof',
        score: 80,
      },
      actions: [createCodexDispatchAction()],
    });

    const secondNotificationId = store.info(
      'Je peux preparer "Preuve" pour Qualite admin. Suite.',
      {
        title: 'Proposition agent',
        source: 'admin-quality-agent',
        metadata: {
          kind: 'agent-next-work',
          dedupeKey: 'admin-quality-agent:next-work:observability',
          entryId: 'observability',
          tone: 'proof',
          score: 90,
        },
        actions: [
          {
            id: 'admin-quality-agent-task-proof',
            label: 'Codex Preuve: Qualite admin - en cours #12',
            kind: 'route',
            route: '/admin/ops',
            codexDispatch: null,
          },
        ],
      },
    );

    expect(secondNotificationId).toBe(firstNotificationId);
    expect(store.entries().length).toBe(1);
    expect(store.entries()[0].message).toBe('Je peux preparer "Preuve" pour Qualite admin. Suite.');
    expect(store.entries()[0].actions?.[0]).toEqual(
      jasmine.objectContaining({
        label: 'Codex Preuve: Qualite admin - en cours #12',
        kind: 'route',
        route: '/admin/ops',
      }),
    );
  });

  it('removes corrupted persisted notifications during initialization', () => {
    localStorage.setItem(STORAGE_KEY, '{broken-json');

    const store = createStore();

    expect(store.entries()).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

function createStore(): NotificationStoreApi {
  TestBed.configureTestingModule({
    providers: [NotificationStore],
  });
  return TestBed.inject(NotificationStore) as NotificationStoreApi;
}

function createCodexDispatchAction(): NotificationAction {
  return {
    id: 'admin-quality-agent-task-proof',
    label: 'Codex Preuve: Qualite admin',
    kind: 'codex-dispatch',
    codexDispatch: {
      provider: 'codex',
      task: 'Objectif: ajouter une preuve.',
      scope: 'openg7-org',
      baseBranch: 'main',
      draftPr: true,
      model: 'gpt-5.4',
      effort: null,
    },
  };
}

function readPersistedPayload(): { items: Array<{ actions: NotificationAction[] }> } {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{"items":[]}') as {
    items: Array<{ actions: NotificationAction[] }>;
  };
}
