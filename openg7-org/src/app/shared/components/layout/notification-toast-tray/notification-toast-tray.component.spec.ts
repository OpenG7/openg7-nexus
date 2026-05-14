import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { NotificationEntry, NotificationStore } from '@app/core/observability/notification.store';
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
  snoozeSource = jasmine.createSpy('snoozeSource');
}

class MockRouter {
  navigateByUrl = jasmine.createSpy('navigateByUrl').and.resolveTo(true);
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationToastTrayComponent],
      providers: [
        { provide: NotificationStore, useClass: MockNotificationStore },
        { provide: Router, useClass: MockRouter },
        { provide: TranslateService, useClass: MockTranslateService },
      ],
    }).compileComponents();

    notifications = TestBed.inject(NotificationStore) as unknown as MockNotificationStore;
    router = TestBed.inject(Router) as unknown as MockRouter;
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
});