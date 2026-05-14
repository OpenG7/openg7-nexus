import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { AuthUser } from '@app/core/auth/auth.types';
import {
  NotificationStore,
  NotificationStoreApi,
} from '@app/core/observability/notification.store';
import { Observable, Subject, of } from 'rxjs';

import { AdminQualityHomeAgentService } from './admin-quality-home-agent.service';
import {
  AdminQualityMatrixEntry,
  AdminQualityMatrixService,
  AdminQualityMatrixSnapshot,
} from './admin-quality-matrix.service';

describe('AdminQualityHomeAgentService', () => {
  let userSig: ReturnType<typeof signal<AuthUser | null>>;
  let matrix: jasmine.SpyObj<AdminQualityMatrixService>;
  let notifications: jasmine.SpyObj<NotificationStoreApi>;
  let routerEvents: Subject<NavigationEnd>;
  let routerMock: { url: string; events: Observable<NavigationEnd> };

  beforeEach(() => {
    userSig = signal<AuthUser | null>(null);
    matrix = jasmine.createSpyObj<AdminQualityMatrixService>('AdminQualityMatrixService', [
      'loadMatrix',
    ]);
    notifications = jasmine.createSpyObj<NotificationStoreApi>('NotificationStore', [
      'success',
      'info',
      'error',
    ]);
    routerEvents = new Subject<NavigationEnd>();
    routerMock = { url: '/', events: routerEvents.asObservable() };
    matrix.loadMatrix.and.returnValue(of(createSnapshot([createEntry()])));

    TestBed.configureTestingModule({
      providers: [
        AdminQualityHomeAgentService,
        {
          provide: AuthService,
          useValue: {
            user: userSig.asReadonly(),
            isAuthenticated: computed(() => Boolean(userSig())),
          } as Pick<AuthService, 'user' | 'isAuthenticated'>,
        },
        { provide: AdminQualityMatrixService, useValue: matrix },
        { provide: NotificationStore, useValue: notifications },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('does not activate for a non-admin user on the home page', () => {
    TestBed.inject(AdminQualityHomeAgentService);
    userSig.set(createUser({ roles: ['user'] }));

    flushSignalEffects();

    expect(matrix.loadMatrix).not.toHaveBeenCalled();
    expect(notifications.info).not.toHaveBeenCalled();
    expect(notifications.success).not.toHaveBeenCalled();
  });

  it('announces the development agent on the home page for a system admin', () => {
    userSig.set(createUser({ email: 'contact@openg7.org', roles: ['admin'] }));

    TestBed.inject(AdminQualityHomeAgentService);
    flushSignalEffects();

    expect(matrix.loadMatrix).toHaveBeenCalledTimes(1);
    expect(notifications.info).toHaveBeenCalledWith(
      jasmine.stringMatching(/contact@openg7\.org/),
      jasmine.objectContaining({
        source: 'admin-quality-agent',
        actions: jasmine.arrayContaining([
          jasmine.objectContaining({
            label: 'Codex Preuve: Qualite admin',
            kind: 'copy',
            command: 'yarn admin:quality:agent -- --entry-id AG-1',
          }),
        ]),
        metadata: jasmine.objectContaining({
          roleGate: 'system-admin',
          openCount: 1,
          taskActionCount: 1,
        }),
      }),
    );

    const [, options] = notifications.info.calls.mostRecent().args;
    expect(options?.actions?.some((action) => action.label === 'Copier diagnostic')).toBeFalse();
    expect(options?.actions?.some((action) => action.label === 'Copier apply')).toBeFalse();
  });

  it('waits until the system admin reaches the home page before activating', () => {
    routerMock.url = '/feed';
    userSig.set(createUser({ roles: ['owner'] }));

    TestBed.inject(AdminQualityHomeAgentService);
    flushSignalEffects();
    expect(matrix.loadMatrix).not.toHaveBeenCalled();

    routerEvents.next(new NavigationEnd(1, '/feed', '/'));
    flushSignalEffects();

    expect(matrix.loadMatrix).toHaveBeenCalledTimes(1);
  });
});

function createUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'u-admin',
    email: 'admin@example.test',
    roles: ['admin'],
    ...overrides,
  };
}

function createSnapshot(entries: readonly AdminQualityMatrixEntry[]): AdminQualityMatrixSnapshot {
  return {
    generatedAt: '2026-05-13T00:00:00.000Z',
    sourceStatus: 'fresh',
    sourceMessage: null,
    entries,
  };
}

function createEntry(overrides: Partial<AdminQualityMatrixEntry> = {}): AdminQualityMatrixEntry {
  return {
    id: 'AG-1',
    domain: 'Qualite admin',
    need: 'Preuve agent',
    summaryStatus: 'partiel',
    businessStatus: 'oui',
    implementationStatus: 'partiel',
    e2eStatus: 'non',
    priority: 'haute',
    managementBucket: 'proof-gap',
    needsProductWorkFirst: false,
    observedGap: 'Preuve manquante.',
    nextMove: 'Ajouter une preuve executable.',
    evidence: [],
    reviewedAt: '2026-05-13T00:00:00.000Z',
    repoSignalAt: null,
    repoSignalCommit: null,
    repoSignalSource: null,
    repoSignalSummary: null,
    signalDispatch: {},
    ...overrides,
  };
}

function flushSignalEffects(): void {
  const testBed = TestBed as unknown as { tick?: () => void; flushEffects?: () => void };
  if (typeof testBed.tick === 'function') {
    testBed.tick();
    return;
  }
  testBed.flushEffects?.();
}
