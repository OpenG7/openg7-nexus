import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  Input,
  Output,
  EventEmitter,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthConfigService } from '@app/core/auth/auth-config.service';
import { AuthService } from '@app/core/auth/auth.service';
import { FavoritesService } from '@app/core/favorites.service';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import type { Og7ModalRef } from '@app/core/ui/modal/og7-modal.types';
import { UserAlertsService } from '@app/core/user-alerts.service';
import { QuickSearchLauncherService } from '@app/domains/search/feature/quick-search-modal/quick-search-launcher.service';
import { TranslateModule, TranslateService, LangChangeEvent } from '@ngx-translate/core';

type LangCode = 'en' | 'fr';
interface HeaderNotificationItem {
  id: string;
  title: string | null;
  message: string;
  read: boolean;
  severity: 'info' | 'success' | 'warning' | 'critical' | 'error';
}

@Component({
  selector: 'og7-site-header',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/layout » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Site Header ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns SiteHeaderComponent gérée par le framework.
 */
export class SiteHeaderComponent {
  @Input({ required: false }) handset = false;
  @Output() menuToggle = new EventEmitter<void>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);
  private readonly auth = inject(AuthService);
  private readonly favorites = inject(FavoritesService);
  private readonly authConfig = inject(AuthConfigService);
  private readonly notifications = injectNotificationStore();
  private readonly userAlerts = inject(UserAlertsService);
  private readonly quickSearchLauncher = inject(QuickSearchLauncherService);
  private activeQuickSearchRef: Og7ModalRef<void> | null = null;
  private lastNotifTrigger: HTMLElement | null = null;

  readonly isMobileMenuOpen = signal(false);
  readonly isLangOpen = signal(false);
  readonly isMoreOpen = signal(false);
  readonly isNotifOpen = signal(false);
  readonly isProfileOpen = signal(false);
  readonly isSearchOpen = signal(false);

  readonly currentLang = signal<LangCode>((this.translate.currentLang as LangCode) || 'fr');
  readonly languages: readonly LangCode[] = ['fr', 'en'];

  readonly authMode = this.authConfig.authMode;
  readonly loginLabelKey = computed(() => (this.authMode() === 'sso-only' ? 'header.signin' : 'header.login'));

  readonly userSig = this.auth.user;
  readonly isAuthSig = this.auth.isAuthenticated;
  readonly avatarUrlSig = computed(() => this.userSig()?.avatarUrl ?? null);
  readonly displayNameSig = computed(() => {
    const user = this.userSig();
    if (!user) {
      return '';
    }
    const first = user.firstName?.trim() ?? '';
    const last = user.lastName?.trim() ?? '';
    const full = `${first} ${last}`.trim();
    return full || user.email;
  });
  readonly initialsSig = computed(() => {
    const user = this.userSig();
    if (!user) {
      return '';
    }
    const first = user.firstName?.trim().charAt(0) ?? '';
    const last = user.lastName?.trim().charAt(0) ?? '';
    const initials = `${first}${last}`.trim();
    return initials ? initials.toUpperCase() : (user.email?.charAt(0) ?? '?').toUpperCase();
  });

  readonly favoritesCountSig = this.favorites.count;
  readonly hasFavoritesSig = computed(() => this.favoritesCountSig() > 0);

  readonly unreadCount = computed(() =>
    this.isAuthSig() ? this.userAlerts.unreadCount() : this.notifications.unreadCount()
  );
  readonly hasUnread = computed(() => this.unreadCount() > 0);
  readonly notificationEntries = computed<ReadonlyArray<HeaderNotificationItem>>(() => {
    if (this.isAuthSig()) {
      return this.userAlerts
        .entries()
        .slice(0, 5)
        .map((entry) => ({
          id: entry.id,
          title: entry.title || null,
          message: entry.message,
          read: entry.isRead,
          severity: entry.severity,
        }));
    }

    return this.notifications
      .entries()
      .slice(0, 5)
      .map((entry) => ({
        id: entry.id,
        title: entry.title ?? null,
        message: entry.message,
        read: entry.read,
        severity: entry.type,
      }));
  });

  constructor() {
    const langSub = this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.currentLang.set(event.lang as LangCode);
    });
    this.destroyRef.onDestroy(() => langSub.unsubscribe());

    effect(() => {
      const lang = this.currentLang();
      this.translate.use(lang);
    });

    effect(() => {
      if (this.isAuthSig()) {
        this.userAlerts.refresh();
      }
    });
  }

  setLang(lang: LangCode) {
    this.currentLang.set(lang);
    this.translate.use(lang);
    this.isLangOpen.set(false);
    this.isMobileMenuOpen.set(false);
  }

  toggleSearch(force?: boolean) {
    if (force === false) {
      this.activeQuickSearchRef?.close();
      this.activeQuickSearchRef = null;
      this.isSearchOpen.set(false);
      return;
    }
    const ref = this.quickSearchLauncher.open({ source: 'site-header' });
    this.activeQuickSearchRef = ref;
    this.isSearchOpen.set(true);
    ref.result.then(() => {
      if (this.activeQuickSearchRef === ref) {
        this.activeQuickSearchRef = null;
        this.isSearchOpen.set(false);
      }
    });
    this.isMoreOpen.set(false);
    this.isNotifOpen.set(false);
    this.isProfileOpen.set(false);
    this.isMobileMenuOpen.set(false);
  }

  toggleMobileMenu() {
    const next = !this.isMobileMenuOpen();
    this.isMobileMenuOpen.set(next);
    if (!next) {
      this.isNotifOpen.set(false);
    }
  }

  toggleLang() {
    this.isLangOpen.update((value) => !value);
  }

  toggleMore() {
    this.isMoreOpen.update((value) => !value);
  }

  toggleNotif(event?: Event) {
    const trigger = event?.currentTarget;
    if (trigger instanceof HTMLElement) {
      this.lastNotifTrigger = trigger;
    }

    this.isNotifOpen.update((value) => !value);
    if (!this.isNotifOpen()) {
      return;
    }

    if (this.isAuthSig()) {
      this.userAlerts.refresh();
    } else {
      this.notifications.markAllRead();
    }
  }

  toggleProfile() {
    this.isProfileOpen.update((value) => !value);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
    this.isNotifOpen.set(false);
  }

  logout() {
    this.auth.logout();
    this.isProfileOpen.set(false);
    this.isMobileMenuOpen.set(false);
  }

  trackNotification = (_: number, item: { id: string }) => item.id;

  markNotificationAsRead(notificationId: string): void {
    if (!this.isAuthSig()) {
      return;
    }

    this.userAlerts.markRead(notificationId, true);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const closeIfOutside = (selector: string, close: () => void) => {
      if (!target.closest(selector)) {
        close();
      }
    };

    closeIfOutside('[data-og7="lang"]', () => this.isLangOpen.set(false));
    closeIfOutside('[data-og7="more"]', () => this.isMoreOpen.set(false));
    closeIfOutside('[data-og7="notif"]', () => this.isNotifOpen.set(false));
    closeIfOutside('[data-og7="profile"]', () => this.isProfileOpen.set(false));
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggleSearch(true);
      return;
    }

    if (event.key === 'Escape') {
      if (this.isSearchOpen()) {
        event.preventDefault();
        this.toggleSearch(false);
        return;
      }

      const restoreNotificationFocus = this.isNotifOpen();
      this.closeFlyouts();
      if (restoreNotificationFocus) {
        queueMicrotask(() => {
          this.lastNotifTrigger?.focus();
        });
      }
    }
  }

  private closeFlyouts() {
    this.isLangOpen.set(false);
    this.isMoreOpen.set(false);
    this.isNotifOpen.set(false);
    this.isProfileOpen.set(false);
  }
}
