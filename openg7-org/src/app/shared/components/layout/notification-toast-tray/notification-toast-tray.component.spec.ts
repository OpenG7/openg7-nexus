import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { NotificationEntry, NotificationStore } from '@app/core/observability/notification.store';
import { AdminGithubActionTrackerService } from '@app/domains/admin/data-access/admin-github-action-tracker.service';
import { AdminOpsService } from '@app/domains/admin/data-access/admin-ops.service';
import { TranslateService } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';

import { NotificationToastTrayComponent } from './notification-toast-tray.component';

class MockTranslateService {
  currentLang = 'fr';
  fallbackLang = 'fr';
  onLangChange = new Subject<{ lang: string; translations?: Record<string, string> }>();
  onTranslationChange = new Subject<{ lang: string; translations?: Record<string, string> }>();
  onFallbackLangChange = new Subject<{ lang: string; translations?: Record<string, string> }>();

  get(key: string | string[]) {
    if (Array.isArray(key)) {
      return of(Object.fromEntries(key.map((entry) => [entry, entry])));
    }
    return of(key);
  }

  getParsedResult(_translations: unknown, key: string | string[]) {
    if (Array.isArray(key)) {
      return Object.fromEntries(key.map((entry) => [entry, entry]));
    }
    return key;
  }
}

class MockNotificationStore {
  entries = signal<NotificationEntry[]>([]);
  dismiss = jasmine.createSpy('dismiss').and.callFake((entryId: string) => {
    this.entries.update((entries) => entries.filter((entry) => entry.id !== entryId));
  });
  success = jasmine.createSpy('success');
  error = jasmine.createSpy('error');
  info = jasmine.createSpy('info');
  markAsRead = jasmine.createSpy('markAsRead');
  snoozeSource = jasmine.createSpy('snoozeSource');
}

class MockRouter {
  navigateByUrl = jasmine.createSpy('navigateByUrl').and.resolveTo(true);
}

class MockAdminOpsService {
  dispatchCodexWorkflow = jasmine.createSpy('dispatchCodexWorkflow').and.returnValue(
    of({
      queued: true,
      provider: 'github-actions',
      selectedProvider: 'codex',
      owner: 'openg7',
      repo: 'platform',
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
        taskLength: 24,
      },
    }),
  );
}

class MockGithubActionTrackerService {
  createDispatchCorrelation = jasmine.createSpy('createDispatchCorrelation').and.returnValue({
    correlationId: 'og7-test-correlation',
    idempotencyKey: 'og7-test-correlation-dispatch-codex',
  });
  startTracking = jasmine.createSpy('startTracking');
}

function createNotification(overrides: Partial<NotificationEntry> = {}): NotificationEntry {
  return {
    id: 'toast-1',
    type: 'info',
    title: 'Agent admin-quality',
    message: 'Agent de developpement actif.',
    source: 'admin-quality-agent',
    context: null,
    metadata: null,
    actions: [],
    createdAt: Date.now(),
    read: false,
    ...overrides,
  };
}

describe('NotificationToastTrayComponent', () => {
  let fixture: ComponentFixture<NotificationToastTrayComponent>;
  let notifications: MockNotificationStore;
  let router: MockRouter;
  let adminOps: MockAdminOpsService;
  let tracker: MockGithubActionTrackerService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationToastTrayComponent],
      providers: [
        { provide: NotificationStore, useClass: MockNotificationStore },
        { provide: Router, useClass: MockRouter },
        { provide: AdminOpsService, useClass: MockAdminOpsService },
        { provide: AdminGithubActionTrackerService, useClass: MockGithubActionTrackerService },
        { provide: TranslateService, useClass: MockTranslateService },
      ],
    }).compileComponents();

    notifications = TestBed.inject(NotificationStore) as unknown as MockNotificationStore;
    router = TestBed.inject(Router) as unknown as MockRouter;
    adminOps = TestBed.inject(AdminOpsService) as unknown as MockAdminOpsService;
    tracker = TestBed.inject(
      AdminGithubActionTrackerService,
    ) as unknown as MockGithubActionTrackerService;
    fixture = TestBed.createComponent(NotificationToastTrayComponent);
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('hides info toasts after the default duration without removing them from the bell history', fakeAsync(() => {
    notifications.entries.set([createNotification()]);
    fixture.detectChanges();

    tick(4999);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-og7="notification-toast"]'))).toBeTruthy();

    tick(1);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-og7="notification-toast"]'))).toBeNull();
    expect(notifications.dismiss).not.toHaveBeenCalled();
    expect(notifications.entries()).toEqual([jasmine.objectContaining({ id: 'toast-1' })]);
  }));

  it('does not replay old persisted notifications as active toasts', () => {
    notifications.entries.set([
      createNotification({
        createdAt: Date.now() - 60_000,
      }),
    ]);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-og7="notification-toast"]'))).toBeNull();
    expect(notifications.dismiss).not.toHaveBeenCalled();
    expect(notifications.entries()).toEqual([jasmine.objectContaining({ id: 'toast-1' })]);
  });

  it('pauses auto-dismiss while the mouse is over the toast and resumes on leave', fakeAsync(() => {
    notifications.entries.set([createNotification()]);
    fixture.detectChanges();

    const toast = fixture.debugElement.query(By.css('[data-og7="notification-toast"]'));
    expect(toast).withContext('notification toast should be rendered').toBeTruthy();

    tick(3000);
    toast.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));

    tick(5000);
    expect(notifications.dismiss).not.toHaveBeenCalled();

    toast.nativeElement.dispatchEvent(new MouseEvent('mouseleave'));
    tick(1999);
    fixture.detectChanges();
    expect(notifications.dismiss).not.toHaveBeenCalled();
    expect(fixture.debugElement.query(By.css('[data-og7="notification-toast"]'))).toBeTruthy();

    tick(1);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-og7="notification-toast"]'))).toBeNull();
    expect(notifications.dismiss).not.toHaveBeenCalled();
    expect(notifications.entries()).toEqual([jasmine.objectContaining({ id: 'toast-1' })]);
  }));

  it('keeps the notification in bell history when an action hides the toast', () => {
    notifications.entries.set([
      createNotification({
        actions: [
          {
            id: 'open-cockpit',
            label: 'Codex Preuve: Qualite admin',
            kind: 'route',
            route: '/admin/quality',
          },
        ],
      }),
    ]);
    fixture.detectChanges();

    const action = fixture.debugElement.query(By.css('[data-og7="action"]'));
    expect(action).withContext('notification action should be rendered').toBeTruthy();

    action.nativeElement.click();
    fixture.detectChanges();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/quality');
    expect(fixture.debugElement.query(By.css('[data-og7="notification-toast"]'))).toBeNull();
    expect(notifications.dismiss).not.toHaveBeenCalled();
    expect(notifications.entries()).toEqual([jasmine.objectContaining({ id: 'toast-1' })]);
  });

  it('dispatches Codex actions without deleting the bell history', () => {
    const payload = {
      provider: 'codex' as const,
      task: 'Build the admin-quality proof.',
      scope: 'openg7-org' as const,
      baseBranch: 'main',
      draftPr: true,
      model: 'gpt-5.4',
      effort: null,
    };
    notifications.entries.set([
      createNotification({
        actions: [
          {
            id: 'dispatch-codex',
            label: 'Lancer Codex',
            kind: 'codex-dispatch',
            codexDispatch: payload,
          },
        ],
      }),
    ]);
    fixture.detectChanges();

    const action = fixture.debugElement.query(By.css('[data-og7="action"]'));
    action.nativeElement.click();
    fixture.detectChanges();

    expect(adminOps.dispatchCodexWorkflow).toHaveBeenCalledWith(
      jasmine.objectContaining({
        ...payload,
        correlationId: 'og7-test-correlation',
        idempotencyKey: 'og7-test-correlation-dispatch-codex',
      }),
      {
        correlationId: 'og7-test-correlation',
        idempotencyKey: 'og7-test-correlation-dispatch-codex',
      },
    );
    expect(tracker.startTracking).toHaveBeenCalledWith(
      jasmine.objectContaining({ workflow: 'codex.yml', ref: 'main' }),
      jasmine.objectContaining({
        source: 'admin-quality-agent',
        parentNotificationId: 'toast-1',
        actionId: 'dispatch-codex',
        correlationId: 'og7-test-correlation',
        idempotencyKey: 'og7-test-correlation-dispatch-codex',
        timelineRunId: jasmine.any(String),
      }),
    );
    expect(notifications.markAsRead).toHaveBeenCalledWith('toast-1');
    expect(fixture.debugElement.query(By.css('[data-og7="notification-toast"]'))).toBeNull();
    expect(notifications.dismiss).not.toHaveBeenCalled();
    expect(notifications.entries()).toEqual([jasmine.objectContaining({ id: 'toast-1' })]);
  });

  it('renders a GitHub Action status light when status metadata is present', () => {
    notifications.entries.set([
      createNotification({
        metadata: {
          githubActionStatus: {
            state: 'in-progress',
            label: 'GitHub Actions - en traitement',
            detail: 'Workflow #42 is executing.',
            workflow: 'codex.yml',
            runUrl: 'https://github.test/run/42',
            runNumber: 42,
            correlationId: 'og7-test-correlation',
            updatedAt: '2026-05-13T00:00:00.000Z',
          },
        },
      }),
    ]);
    fixture.detectChanges();

    const status = fixture.debugElement.query(By.css('[data-github-action-state="in-progress"]'));
    expect(status).withContext('GitHub Action status should be rendered').toBeTruthy();
    expect(status.nativeElement.textContent).toContain('GitHub Actions - en traitement');
    expect(status.nativeElement.textContent).toContain('#42');
  });
});
