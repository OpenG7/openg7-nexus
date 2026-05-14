import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  Input,
  Injector,
  Output,
  EventEmitter,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AuthConfigService } from '@app/core/auth/auth-config.service';
import { AuthService } from '@app/core/auth/auth.service';
import { FavoritesService } from '@app/core/favorites.service';
import {
  NotificationAction,
  NotificationEntry,
  NotificationCodexDispatch,
  injectNotificationStore,
} from '@app/core/observability/notification.store';
import {
  GithubActionNotificationStatus,
  readGithubActionNotificationStatus,
} from '@app/core/observability/github-action-notification-status';
import { AdminGithubActionTrackerService } from '@app/domains/admin/data-access/admin-github-action-tracker.service';
import {
  AdminOpsCodexDispatchRequest,
  AdminOpsService,
} from '@app/domains/admin/data-access/admin-ops.service';
import { RbacFacadeService } from '@app/core/security/rbac.facade';
import type { Og7ModalRef } from '@app/core/ui/modal/og7-modal.types';
import { UserAlertsService } from '@app/core/user-alerts.service';
import { QuickSearchLauncherService } from '@app/domains/search/feature/quick-search-modal/quick-search-launcher.service';
import { TranslateModule, TranslateService, LangChangeEvent } from '@ngx-translate/core';

type LangCode = 'en' | 'fr';
interface HeaderNotificationItem {
  id: string;
  channel: 'local' | 'user-alert';
  title: string | null;
  message: string;
  read: boolean;
  severity: 'info' | 'success' | 'warning' | 'critical' | 'error';
  source: string | null;
  actions: readonly NotificationAction[];
  metadata: Record<string, unknown> | null;
  createdAt: number;
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
  private readonly injector = inject(Injector);
  private readonly translate = inject(TranslateService);
  private readonly auth = inject(AuthService);
  private readonly favorites = inject(FavoritesService);
  private readonly authConfig = inject(AuthConfigService);
  private readonly notifications = injectNotificationStore();
  private readonly router = inject(Router);
  private readonly rbac = inject(RbacFacadeService);
  private readonly userAlerts = inject(UserAlertsService);
  private readonly quickSearchLauncher = inject(QuickSearchLauncherService);
  private activeQuickSearchRef: Og7ModalRef<void> | null = null;
  private lastNotifTrigger: HTMLElement | null = null;
  private adminOpsService: AdminOpsService | null | undefined;
  private githubActionTracker: AdminGithubActionTrackerService | null | undefined;

  readonly isMobileMenuOpen = signal(false);
  readonly isLangOpen = signal(false);
  readonly isMoreOpen = signal(false);
  readonly isNotifOpen = signal(false);
  readonly isProfileOpen = signal(false);
  readonly isSearchOpen = signal(false);

  readonly currentLang = signal<LangCode>((this.translate.currentLang as LangCode) || 'fr');
  readonly languages: readonly LangCode[] = ['fr', 'en'];

  readonly authMode = this.authConfig.authMode;
  readonly loginLabelKey = computed(() =>
    this.authMode() === 'sso-only' ? 'header.signin' : 'header.login',
  );
  readonly canAccessAdminQuality = computed(
    () => this.isAuthSig() && this.rbac.hasPermission('admin:settings'),
  );

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

  readonly unreadCount = computed(() => {
    const localUnreadCount = this.notifications.unreadCount();
    return this.isAuthSig() ? this.userAlerts.unreadCount() + localUnreadCount : localUnreadCount;
  });
  readonly hasUnread = computed(() => this.unreadCount() > 0);
  readonly notificationEntries = computed<ReadonlyArray<HeaderNotificationItem>>(() => {
    const localEntries = this.notifications
      .entries()
      .map((entry) => this.mapLocalNotification(entry));

    if (this.isAuthSig()) {
      const userAlertEntries = this.userAlerts.entries().map((entry) => ({
        id: entry.id,
        channel: 'user-alert' as const,
        title: entry.title || null,
        message: entry.message,
        read: entry.isRead,
        severity: entry.severity,
        source: 'user-alerts',
        actions: [],
        metadata: null,
        createdAt: this.toTimestamp(entry.createdAt),
      }));

      return this.sortHeaderNotifications([...localEntries, ...userAlertEntries]).slice(0, 5);
    }

    return this.sortHeaderNotifications(localEntries).slice(0, 5);
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

  closeProfileMenu() {
    this.isProfileOpen.set(false);
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

  trackNotification = (_: number, item: { id: string; channel?: string }) =>
    `${item.channel ?? 'notification'}:${item.id}`;

  markNotificationAsRead(notification: HeaderNotificationItem): void {
    if (notification.channel === 'local') {
      this.notifications.markAsRead(notification.id);
      return;
    }

    if (this.isAuthSig()) {
      this.userAlerts.markRead(notification.id, true);
    }
  }

  performNotificationAction(
    notification: HeaderNotificationItem,
    action: NotificationAction,
    event?: Event,
  ): void {
    event?.stopPropagation();

    if (action.kind === 'route' && action.route) {
      void this.router.navigateByUrl(action.route);
      this.isNotifOpen.set(false);
      this.notifications.markAsRead(notification.id);
      return;
    }

    if (action.kind === 'copy' && action.command) {
      void this.copyText(action.command)
        .then(() => {
          this.notifications.success('Commande agent copiee.', {
            source: notification.source ?? 'site-header',
            metadata: { parentNotificationId: notification.id, actionId: action.id },
          });
          this.notifications.markAsRead(notification.id);
        })
        .catch(() => {
          this.notifications.error('Impossible de copier la commande agent.', {
            source: notification.source ?? 'site-header',
            metadata: { parentNotificationId: notification.id, actionId: action.id },
          });
        });
      return;
    }

    if (action.kind === 'codex-dispatch') {
      this.dispatchCodexAction(notification, action);
      return;
    }

    if (action.kind === 'snooze') {
      const source = notification.source ?? 'site-header';
      this.notifications.snoozeSource(source, action.durationMs ?? 30 * 60 * 1000);
      this.notifications.info('Notifications agent suspendues temporairement.', {
        source: 'site-header',
        metadata: {
          parentNotificationId: notification.id,
          actionId: action.id,
          snoozedSource: source,
        },
      });
      this.notifications.markAsRead(notification.id);
      return;
    }

    if (action.kind === 'dismiss') {
      this.notifications.dismiss(notification.id);
    }
  }

  githubActionStatus(notification: HeaderNotificationItem): GithubActionNotificationStatus | null {
    return readGithubActionNotificationStatus(notification.metadata);
  }

  githubActionStateClass(status: GithubActionNotificationStatus): string {
    return `site-header__github-light--${status.state}`;
  }

  private dispatchCodexAction(
    notification: HeaderNotificationItem,
    action: NotificationAction,
  ): void {
    const codexDispatch = action.codexDispatch;
    if (!codexDispatch?.task.trim()) {
      this.notifications.error('Prompt Codex indisponible pour cette tache.', {
        source: notification.source ?? 'site-header',
        metadata: { parentNotificationId: notification.id, actionId: action.id },
      });
      return;
    }

    const adminOps = this.resolveAdminOpsService();
    if (!adminOps) {
      this.notifications.error('Console Ops indisponible pour lancer Codex.', {
        source: notification.source ?? 'site-header',
        metadata: { parentNotificationId: notification.id, actionId: action.id },
      });
      return;
    }

    const tracker = this.resolveGithubActionTracker();
    const correlation = tracker?.createDispatchCorrelation(action.id) ?? null;
    const request = {
      ...this.toCodexDispatchRequest(codexDispatch),
      correlationId: correlation?.correlationId ?? null,
      idempotencyKey: correlation?.idempotencyKey ?? null,
    };

    adminOps
      .dispatchCodexWorkflow(request, correlation ?? undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (tracker && correlation) {
            tracker.startTracking(result, {
              source: notification.source ?? 'site-header',
              parentNotificationId: notification.id,
              actionId: action.id,
              ...correlation,
            });
          } else {
            this.notifications.info(
              `${this.providerLabel(codexDispatch.provider)} queued via ${result.workflow} on ${result.ref}.`,
              {
                source: notification.source ?? 'site-header',
                metadata: {
                  parentNotificationId: notification.id,
                  actionId: action.id,
                  workflow: result.workflow,
                  ref: result.ref,
                },
              },
            );
          }
          this.notifications.markAsRead(notification.id);
          this.isNotifOpen.set(false);
        },
        error: (error: unknown) => {
          this.notifications.error(this.resolveDispatchError(error, codexDispatch.provider), {
            source: notification.source ?? 'site-header',
            metadata: { parentNotificationId: notification.id, actionId: action.id },
          });
        },
      });
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

  private mapLocalNotification(entry: NotificationEntry): HeaderNotificationItem {
    return {
      id: entry.id,
      channel: 'local',
      title: entry.title ?? null,
      message: entry.message,
      read: entry.read,
      severity: entry.type,
      source: entry.source ?? null,
      actions: entry.actions ?? [],
      metadata: entry.metadata ?? null,
      createdAt: entry.createdAt,
    };
  }

  private resolveGithubActionTracker(): AdminGithubActionTrackerService | null {
    if (this.githubActionTracker !== undefined) {
      return this.githubActionTracker;
    }

    try {
      this.githubActionTracker = this.injector.get(AdminGithubActionTrackerService, null);
    } catch {
      this.githubActionTracker = null;
    }

    return this.githubActionTracker;
  }

  private resolveAdminOpsService(): AdminOpsService | null {
    if (this.adminOpsService !== undefined) {
      return this.adminOpsService;
    }

    try {
      this.adminOpsService = this.injector.get(AdminOpsService, null);
    } catch {
      this.adminOpsService = null;
    }

    return this.adminOpsService;
  }

  private toCodexDispatchRequest(
    dispatch: NotificationCodexDispatch,
  ): AdminOpsCodexDispatchRequest {
    return {
      provider: dispatch.provider,
      task: dispatch.task,
      scope: dispatch.scope,
      baseBranch: dispatch.baseBranch ?? 'main',
      draftPr: dispatch.draftPr ?? true,
      model: dispatch.model ?? null,
      effort: dispatch.effort ?? null,
    };
  }

  private providerLabel(provider: NotificationCodexDispatch['provider']): string {
    return provider === 'codex' ? 'Codex' : provider;
  }

  private resolveDispatchError(error: unknown, provider: NotificationCodexDispatch['provider']) {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return `${this.providerLabel(provider)} dispatch failed. Verifiez Ops avant de reessayer.`;
  }

  private sortHeaderNotifications(
    entries: readonly HeaderNotificationItem[],
  ): readonly HeaderNotificationItem[] {
    return [...entries].sort((left, right) => {
      const unreadOrder = Number(left.read) - Number(right.read);
      if (unreadOrder !== 0) {
        return unreadOrder;
      }
      return right.createdAt - left.createdAt;
    });
  }

  private toTimestamp(candidate: string | null | undefined): number {
    if (!candidate) {
      return 0;
    }

    const timestamp = Date.parse(candidate);
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  private async copyText(value: string): Promise<void> {
    const clipboard = globalThis.navigator?.clipboard;
    if (clipboard?.writeText) {
      await clipboard.writeText(value);
      return;
    }

    if (typeof globalThis.document === 'undefined') {
      throw new Error('copy_unavailable');
    }

    const documentRef = globalThis.document;
    const textarea = documentRef.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    documentRef.body.appendChild(textarea);
    textarea.select();
    const copied = documentRef.execCommand('copy');
    documentRef.body.removeChild(textarea);

    if (!copied) {
      throw new Error('copy_failed');
    }
  }
}
