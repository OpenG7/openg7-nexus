import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@app/core/auth/auth.service';
import {
  CreateUserAlertPayload,
  UserAlertRecord,
  UserAlertsApiService,
} from '@app/core/services/user-alerts-api.service';
import { of } from 'rxjs';

import {
  FEED_ALERT_SUBSCRIPTION_SOURCE_TYPE,
  UserAlertsService,
} from './user-alerts.service';

function buildRecord(id: string, patch: Partial<UserAlertRecord> = {}): UserAlertRecord {
  return {
    id,
    title: `Alert ${id}`,
    message: `Message ${id}`,
    severity: 'info',
    sourceType: 'saved-search',
    sourceId: id,
    metadata: null,
    isRead: false,
    readAt: null,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    ...patch,
  };
}

describe('UserAlertsService', () => {
  let authState: ReturnType<typeof signal<boolean>>;
  let api: jasmine.SpyObj<UserAlertsApiService>;

  const createService = () => TestBed.inject(UserAlertsService);

  beforeEach(() => {
    authState = signal(false);

    api = jasmine.createSpyObj<UserAlertsApiService>('UserAlertsApiService', [
      'createMine',
      'listMine',
      'generateFromSavedSearches',
      'markRead',
      'markAllRead',
      'deleteRead',
      'deleteMine',
    ]);

    api.listMine.and.returnValue(of([]));
    api.createMine.and.callFake((payload: CreateUserAlertPayload) =>
      of(
        buildRecord('created-1', {
          title: payload.title,
          message: payload.message,
          severity: payload.severity ?? 'info',
          sourceType: payload.sourceType ?? null,
          sourceId: payload.sourceId ?? null,
          metadata: payload.metadata ?? null,
        })
      )
    );
    api.generateFromSavedSearches.and.returnValue(of({ count: 0, skipped: 0, generated: [] }));
    api.markRead.and.returnValue(of(buildRecord('1', { isRead: true, readAt: '2026-02-10T09:00:00.000Z' })));
    api.markAllRead.and.returnValue(of({ updated: 0, readAt: null }));
    api.deleteRead.and.returnValue(of({ deleted: 0 }));
    api.deleteMine.and.returnValue(of({ id: '1', deleted: true }));

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: computed(() => authState()),
          } as Pick<AuthService, 'isAuthenticated'>,
        },
        { provide: UserAlertsApiService, useValue: api },
      ],
    });
  });

  it('loads alerts from API when authenticated', () => {
    authState.set(true);
    api.listMine.and.returnValue(
      of([
        buildRecord('read-old', {
          isRead: true,
          readAt: '2026-02-10T09:00:00.000Z',
          createdAt: '2026-02-09T09:00:00.000Z',
        }),
        buildRecord('unread-new', {
          isRead: false,
          createdAt: '2026-02-10T10:00:00.000Z',
        }),
      ])
    );

    const service = createService();
    service.refresh();

    expect(api.listMine).toHaveBeenCalled();
    expect(service.entries().map((entry) => entry.id)).toEqual(['unread-new', 'read-old']);
    expect(service.unreadCount()).toBe(1);
  });

  it('clears alerts without calling API when unauthenticated', () => {
    authState.set(true);
    api.listMine.and.returnValue(of([buildRecord('1')]));

    const service = createService();
    service.refresh();
    expect(service.entries().length).toBe(1);

    api.listMine.calls.reset();
    authState.set(false);
    service.refresh();

    expect(api.listMine).not.toHaveBeenCalled();
    expect(service.entries()).toEqual([]);
  });

  it('merges generated alerts into current list', () => {
    authState.set(true);
    const service = createService();

    api.generateFromSavedSearches.and.returnValue(
      of({
        count: 1,
        skipped: 0,
        generated: [buildRecord('generated-1', { createdAt: '2026-02-10T11:00:00.000Z' })],
      })
    );

    service.generateFromSavedSearches();

    expect(api.generateFromSavedSearches).toHaveBeenCalled();
    expect(service.entries().map((entry) => entry.id)).toEqual(['generated-1']);
  });

  it('creates a persisted alert and tracks pending state by source', async () => {
    authState.set(true);
    const service = createService();

    const result = await service.create({
      title: 'Alert subscription: Ice storm risk on Ontario transmission lines',
      message: 'You subscribed to updates for Ice storm risk on Ontario transmission lines.',
      sourceType: FEED_ALERT_SUBSCRIPTION_SOURCE_TYPE,
      sourceId: 'alert-001',
      metadata: {
        route: '/feed/alerts/alert-001',
      },
    });

    expect(api.createMine).toHaveBeenCalledWith(
      jasmine.objectContaining({
        sourceType: FEED_ALERT_SUBSCRIPTION_SOURCE_TYPE,
        sourceId: 'alert-001',
      })
    );
    expect(result.status).toBe('created');
    expect(service.hasSource(FEED_ALERT_SUBSCRIPTION_SOURCE_TYPE, 'alert-001')).toBeTrue();
    expect(service.isSourcePending(FEED_ALERT_SUBSCRIPTION_SOURCE_TYPE, 'alert-001')).toBeFalse();
  });

  it('does not create a duplicate alert for the same source', async () => {
    authState.set(true);
    api.listMine.and.returnValue(
      of([
        buildRecord('existing-subscription', {
          sourceType: FEED_ALERT_SUBSCRIPTION_SOURCE_TYPE,
          sourceId: 'alert-001',
        }),
      ])
    );

    const service = createService();
    service.refresh();
    api.createMine.calls.reset();

    const result = await service.create({
      title: 'Alert subscription: Ice storm risk on Ontario transmission lines',
      message: 'You subscribed to updates for Ice storm risk on Ontario transmission lines.',
      sourceType: FEED_ALERT_SUBSCRIPTION_SOURCE_TYPE,
      sourceId: 'alert-001',
    });

    expect(result.status).toBe('duplicate');
    expect(api.createMine).not.toHaveBeenCalled();
  });

  it('marks an alert as read', () => {
    authState.set(true);
    api.listMine.and.returnValue(of([buildRecord('1')]));

    const service = createService();
    service.refresh();

    service.markRead('1', true);

    expect(api.markRead).toHaveBeenCalledWith('1', true);
    expect(service.entries()[0].isRead).toBeTrue();
    expect(service.pendingById()['1']).toBeUndefined();
  });

  it('removes an alert', () => {
    authState.set(true);
    api.listMine.and.returnValue(of([buildRecord('1')]));

    const service = createService();
    service.refresh();

    service.remove('1');

    expect(api.deleteMine).toHaveBeenCalledWith('1');
    expect(service.entries()).toEqual([]);
  });

  it('marks all unread alerts as read in one action', () => {
    authState.set(true);
    api.listMine.and.returnValue(
      of([
        buildRecord('unread-1', { isRead: false, readAt: null }),
        buildRecord('read-1', { isRead: true, readAt: '2026-02-10T08:00:00.000Z' }),
      ])
    );
    api.markAllRead.and.returnValue(of({ updated: 1, readAt: '2026-02-10T10:00:00.000Z' }));

    const service = createService();
    service.refresh();

    service.markAllRead();

    expect(api.markAllRead).toHaveBeenCalled();
    expect(service.unreadCount()).toBe(0);
    expect(service.entries().every((entry) => entry.isRead)).toBeTrue();
  });

  it('removes all read alerts in one action', () => {
    authState.set(true);
    api.listMine.and.returnValue(
      of([
        buildRecord('read-1', { isRead: true, readAt: '2026-02-10T08:00:00.000Z' }),
        buildRecord('unread-1', { isRead: false, readAt: null }),
      ])
    );
    api.deleteRead.and.returnValue(of({ deleted: 1 }));

    const service = createService();
    service.refresh();

    service.clearRead();

    expect(api.deleteRead).toHaveBeenCalled();
    expect(service.entries().map((entry) => entry.id)).toEqual(['unread-1']);
  });
});
