import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { routes as appRoutes } from '@app/app.routes';
import { AuthConfigService } from '@app/core/auth/auth-config.service';
import { AuthService } from '@app/core/auth/auth.service';
import { AuthMode } from '@app/core/config/environment.tokens';
import { FavoritesService } from '@app/core/favorites.service';
import { NotificationStore } from '@app/core/observability/notification.store';
import { RbacFacadeService } from '@app/core/security/rbac.facade';
import { UserAlertsService } from '@app/core/user-alerts.service';
import { QuickSearchLauncherService } from '@app/domains/search/feature/quick-search-modal/quick-search-launcher.service';
import { TranslateService } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';

import { SiteHeaderComponent } from './site-header.component';

class MockTranslateService {
  currentLang = 'en';
  fallbackLang = 'en';
  onLangChange = new Subject<{ lang: string; translations?: Record<string, string> }>();
  onTranslationChange = new Subject<{ lang: string; translations?: Record<string, string> }>();
  onFallbackLangChange = new Subject<{ lang: string; translations?: Record<string, string> }>();

  use(lang: string) {
    this.currentLang = lang;
    this.onLangChange.next({ lang, translations: {} });
  }

  getCurrentLang() {
    return this.currentLang;
  }

  getFallbackLang() {
    return this.fallbackLang;
  }

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

class MockAuthService {
  isAuthenticatedSig = signal(false);
  user = signal<{
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    avatarUrl?: string | null;
  } | null>(null);
  isAuthenticated = () => this.isAuthenticatedSig();
  logout = jasmine.createSpy('logout');
}

class MockFavoritesService {
  count = signal(0);
}

class MockAuthConfigService {
  authMode = signal<AuthMode>('local-only');
}

class MockRbacFacadeService {
  hasPermission = jasmine.createSpy('hasPermission').and.returnValue(true);
  setContext = jasmine.createSpy('setContext');
}

class MockNotificationStore {
  entries = signal<any[]>([]);
  unreadCount = signal(0);
  markAllRead = jasmine.createSpy('markAllRead');
  clearHistory = jasmine.createSpy('clearHistory');
}

class MockQuickSearchLauncherService {
  private id = 0;
  lastRef: {
    id: number;
    closed: ReturnType<typeof signal<boolean>>;
    result: Promise<void | undefined>;
    close: jasmine.Spy<(result?: void) => void>;
    dismiss: jasmine.Spy<() => void>;
    resolve: (value?: void) => void;
  } | null = null;

  open = jasmine.createSpy('open').and.callFake(() => {
    let resolveRef!: (value?: void) => void;
    const result = new Promise<void | undefined>((resolve) => {
      resolveRef = resolve;
    });
    const ref = {
      id: ++this.id,
      closed: signal(false),
      result,
      close: jasmine.createSpy<(result?: void) => void>('close').and.callFake((value?: void) => {
        resolveRef(value);
      }),
      dismiss: jasmine.createSpy<() => void>('dismiss').and.callFake(() => {
        resolveRef(undefined);
      }),
      resolve: resolveRef,
    };
    this.lastRef = ref;
    return ref as any;
  });
}

class MockUserAlertsService {
  entries = signal<
    Array<{
      id: string;
      title: string;
      message: string;
      severity: 'info' | 'success' | 'warning' | 'critical';
      isRead: boolean;
    }>
  >([]);
  unreadCount = signal(0);
  refresh = jasmine.createSpy('refresh');
  markRead = jasmine.createSpy('markRead');
}

describe('SiteHeaderComponent', () => {
  let fixture: ComponentFixture<SiteHeaderComponent>;
  let component: SiteHeaderComponent;
  let router: Router;
  let auth: MockAuthService;
  let favorites: MockFavoritesService;
  let translate: MockTranslateService;
  let notifications: MockNotificationStore;
  let userAlerts: MockUserAlertsService;
  let quickSearch: MockQuickSearchLauncherService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteHeaderComponent, RouterTestingModule.withRoutes(appRoutes)],
      providers: [
        { provide: TranslateService, useClass: MockTranslateService },
        { provide: AuthService, useClass: MockAuthService },
        { provide: FavoritesService, useClass: MockFavoritesService },
        { provide: AuthConfigService, useClass: MockAuthConfigService },
        { provide: RbacFacadeService, useClass: MockRbacFacadeService },
        { provide: NotificationStore, useClass: MockNotificationStore },
        { provide: UserAlertsService, useClass: MockUserAlertsService },
        { provide: QuickSearchLauncherService, useClass: MockQuickSearchLauncherService },
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    auth = TestBed.inject(AuthService) as unknown as MockAuthService;
    favorites = TestBed.inject(FavoritesService) as unknown as MockFavoritesService;
    translate = TestBed.inject(TranslateService) as unknown as MockTranslateService;
    notifications = TestBed.inject(NotificationStore) as unknown as MockNotificationStore;
    userAlerts = TestBed.inject(UserAlertsService) as unknown as MockUserAlertsService;
    quickSearch = TestBed.inject(QuickSearchLauncherService) as unknown as MockQuickSearchLauncherService;

    fixture = TestBed.createComponent(SiteHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('switchLang updates TranslateService', () => {
    component.setLang('fr');
    expect(translate.currentLang).toBe('fr');
  });

  it('opens quick search and closes when the modal resolves', fakeAsync(() => {
    component.toggleSearch(true);

    expect(quickSearch.open).toHaveBeenCalledWith({ source: 'site-header' });
    expect(component.isSearchOpen()).toBeTrue();

    quickSearch.lastRef?.resolve();
    flushMicrotasks();

    expect(component.isSearchOpen()).toBeFalse();
  }));

  it('opens quick search when pressing Enter on the desktop search box', () => {
    const desktopSearchButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('#desktop-search');
    quickSearch.open.calls.reset();

    desktopSearchButton?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(quickSearch.open).toHaveBeenCalledWith({ source: 'site-header' });
    expect(component.isSearchOpen()).toBeTrue();
  });

  it('opens quick search when pressing Enter on the mobile search box', () => {
    component.toggleMobileMenu();
    fixture.detectChanges();
    const mobileSearchButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('#mobile-search');
    quickSearch.open.calls.reset();

    mobileSearchButton?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(quickSearch.open).toHaveBeenCalledWith({ source: 'site-header' });
    expect(component.isSearchOpen()).toBeTrue();
  });

  it('closes active quick search when explicitly requested', () => {
    component.toggleSearch(true);
    const activeRef = quickSearch.lastRef;

    component.toggleSearch(false);

    expect(activeRef?.close).toHaveBeenCalled();
    expect(component.isSearchOpen()).toBeFalse();
  });

  it('shows notification badge only when unread count is > 0', () => {
    const notifButton: HTMLElement | null = fixture.nativeElement.querySelector('button[data-og7="notif"]');
    expect(notifButton?.querySelector('span.absolute')).toBeNull();

    notifications.unreadCount.set(3);
    fixture.detectChanges();

    const badge = notifButton?.querySelector('span.absolute');
    expect(badge?.textContent?.trim()).toBe('3');
  });

  it('surfaces a favorites reminder when saved items exist', () => {
    auth.isAuthenticatedSig.set(true);
    favorites.count.set(2);
    component.toggleProfile();
    fixture.detectChanges();

    const profileButton: HTMLElement | null = fixture.nativeElement.querySelector('[data-og7="profile"] > button');
    const reminder: HTMLElement | null = fixture.nativeElement.querySelector('.site-header__favorites-reminder');
    const favoritesBadge: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-og7="profile"] [data-og7-id="favorites"] .site-header__favorites-count'
    );

    expect(profileButton?.classList.contains('site-header__profile-button--favorites')).toBeTrue();
    expect(reminder).not.toBeNull();
    expect(favoritesBadge?.textContent?.trim()).toBe('2');
  });

  it('uses persisted user alerts count when authenticated', () => {
    auth.isAuthenticatedSig.set(true);
    notifications.unreadCount.set(7);
    userAlerts.unreadCount.set(2);

    fixture.detectChanges();

    const notifButton: HTMLElement | null = fixture.nativeElement.querySelector('button[data-og7="notif"]');
    const badge = notifButton?.querySelector('span.absolute');
    expect(badge?.textContent?.trim()).toBe('2');
  });

  it('refreshes user alerts when notification panel opens for authenticated users', () => {
    auth.isAuthenticatedSig.set(true);
    fixture.detectChanges();
    userAlerts.refresh.calls.reset();
    notifications.markAllRead.calls.reset();

    component.toggleNotif();

    expect(userAlerts.refresh).toHaveBeenCalled();
    expect(notifications.markAllRead).not.toHaveBeenCalled();
  });

  it('marks in-memory notifications as read when notification panel opens for guests', () => {
    auth.isAuthenticatedSig.set(false);
    fixture.detectChanges();
    notifications.markAllRead.calls.reset();

    component.toggleNotif();

    expect(notifications.markAllRead).toHaveBeenCalled();
  });

  it('renders persisted alerts inside the mobile menu notification panel', () => {
    auth.isAuthenticatedSig.set(true);
    userAlerts.entries.set([
      {
        id: 'alert-1',
        title: 'Saved search update',
        message: 'New activity detected in map.',
        severity: 'info',
        isRead: false,
      },
    ]);
    userAlerts.unreadCount.set(1);

    component.toggleMobileMenu();
    component.toggleNotif();
    fixture.detectChanges();

    const mobileAlertItem = fixture.nativeElement.querySelector('[data-og7-id="header-alert-item-mobile"]');
    expect(mobileAlertItem?.textContent).toContain('Saved search update');
    expect(mobileAlertItem?.textContent).toContain('New activity detected in map.');
  });

  it('renders the login link for guests with the /login target and computed label', () => {
    const authConfig = TestBed.inject(AuthConfigService) as unknown as MockAuthConfigService;
    const loginLinks = fixture.debugElement
      .queryAll(By.directive(RouterLink))
      .filter(debugEl => debugEl.injector.get(RouterLink).urlTree?.toString() === '/login');

    expect(loginLinks.length).toBeGreaterThan(0);
    const accountLink: HTMLElement = loginLinks[0].nativeElement;

    expect(accountLink.textContent?.trim()).toBe('header.login');

    authConfig.authMode.set('sso-only');
    fixture.detectChanges();

    expect(accountLink.textContent?.trim()).toBe('header.signin');
  });

  it('binds router links to configured routes', () => {
    const configuredPaths = new Set(appRoutes.map(route => (route.path ? `/${route.path}` : '/')));
    configuredPaths.add('/docs');
    const routerLinks = fixture.debugElement
      .queryAll(By.directive(RouterLink))
      .map(debugEl => debugEl.injector.get(RouterLink));

    const linkTargets = routerLinks.map(link => link.urlTree?.toString() ?? '');
    linkTargets.forEach(target => {
      expect(configuredPaths.has(target)).withContext(`Missing route for ${target}`).toBeTrue();
    });
  });

  it('hides the register link from the more menu for authenticated users', () => {
    component.isMoreOpen.set(true);
    fixture.detectChanges();

    const registerLinksForGuests = fixture.debugElement
      .queryAll(By.directive(RouterLink))
      .filter(debugEl => debugEl.injector.get(RouterLink).urlTree?.toString() === '/register');

    expect(registerLinksForGuests.length).toBe(1);

    auth.isAuthenticatedSig.set(true);
    fixture.detectChanges();

    const registerLinksForAuthenticatedUsers = fixture.debugElement
      .queryAll(By.directive(RouterLink))
      .filter(debugEl => debugEl.injector.get(RouterLink).urlTree?.toString() === '/register');

    expect(registerLinksForAuthenticatedUsers.length).toBe(0);
  });
});

