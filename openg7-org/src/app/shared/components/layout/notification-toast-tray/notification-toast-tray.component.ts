import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  NotificationEntry,
  NotificationAction,
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
import { TranslateModule } from '@ngx-translate/core';

const MAX_VISIBLE_TOASTS = 4;

interface DismissTimerState {
  readonly timeout: ReturnType<typeof setTimeout> | null;
  readonly startedAt: number;
  readonly remainingMs: number;
  readonly paused: boolean;
}

@Component({
  selector: 'og7-notification-toast-tray',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './notification-toast-tray.component.html',
  styleUrl: './notification-toast-tray.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationToastTrayComponent {
  private readonly notificationsStore = injectNotificationStore();
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly dismissTimers = new Map<string, DismissTimerState>();
  private readonly hiddenToastIds = signal<ReadonlySet<string>>(new Set());
  private adminOpsService: AdminOpsService | null | undefined;
  private githubActionTracker: AdminGithubActionTrackerService | null | undefined;

  readonly notifications = computed(() => {
    const hiddenToastIds = this.hiddenToastIds();
    return this.notificationsStore
      .entries()
      .filter((entry) => !hiddenToastIds.has(entry.id))
      .slice(0, MAX_VISIBLE_TOASTS);
  });

  constructor() {
    effect(() => {
      const currentNotifications = this.notifications();
      const currentIds = new Set(currentNotifications.map((entry) => entry.id));

      for (const entry of currentNotifications) {
        if (this.dismissTimers.has(entry.id)) {
          continue;
        }

        this.startDismissTimer(entry.id, this.durationFor(entry.type));
      }

      for (const entryId of this.dismissTimers.keys()) {
        if (currentIds.has(entryId)) {
          continue;
        }
        this.clearDismissTimer(entryId);
      }
    });

    this.destroyRef.onDestroy(() => {
      for (const entryId of this.dismissTimers.keys()) {
        this.clearDismissTimer(entryId);
      }
      this.dismissTimers.clear();
    });
  }

  trackById(_: number, entry: NotificationEntry): string {
    return entry.id;
  }

  dismiss(entryId: string): void {
    this.clearDismissTimer(entryId);
    this.notificationsStore.dismiss(entryId);
  }

  hideToast(entryId: string): void {
    this.clearDismissTimer(entryId);
    this.hiddenToastIds.update((hiddenToastIds) => {
      const next = new Set(hiddenToastIds);
      next.add(entryId);
      return next;
    });
  }

  pauseDismissTimer(entryId: string): void {
    const state = this.dismissTimers.get(entryId);
    if (!state || state.paused || !state.timeout) {
      return;
    }

    clearTimeout(state.timeout);
    this.dismissTimers.set(entryId, {
      timeout: null,
      startedAt: state.startedAt,
      remainingMs: Math.max(0, state.remainingMs - (Date.now() - state.startedAt)),
      paused: true,
    });
  }

  resumeDismissTimer(entryId: string): void {
    const state = this.dismissTimers.get(entryId);
    if (!state || !state.paused) {
      return;
    }

    if (state.remainingMs <= 0) {
      this.hideToast(entryId);
      return;
    }

    this.startDismissTimer(entryId, state.remainingMs);
  }

  isError(entry: NotificationEntry): boolean {
    return entry.type === 'error';
  }

  githubActionStatus(entry: NotificationEntry): GithubActionNotificationStatus | null {
    return readGithubActionNotificationStatus(entry.metadata);
  }

  githubActionStateClass(status: GithubActionNotificationStatus): string {
    return `notification-toast-tray__github-light--${status.state}`;
  }

  performAction(entry: NotificationEntry, action: NotificationAction): void {
    if (action.kind === 'route' && action.route) {
      void this.router.navigateByUrl(action.route);
      this.hideToast(entry.id);
      return;
    }

    if (action.kind === 'copy' && action.command) {
      void this.copyText(action.command)
        .then(() => {
          this.notificationsStore.success('Commande agent copiee.', {
            source: entry.source ?? 'notification-toast',
            metadata: { parentNotificationId: entry.id, actionId: action.id },
          });
          this.hideToast(entry.id);
        })
        .catch(() => {
          this.notificationsStore.error('Impossible de copier la commande agent.', {
            source: entry.source ?? 'notification-toast',
            metadata: { parentNotificationId: entry.id, actionId: action.id },
          });
        });
      return;
    }

    if (action.kind === 'codex-dispatch') {
      this.dispatchCodexAction(entry, action);
      return;
    }

    if (action.kind === 'snooze') {
      const source = entry.source ?? 'notification-toast';
      const durationMs = action.durationMs ?? 30 * 60 * 1000;
      this.notificationsStore.snoozeSource(source, durationMs);
      this.notificationsStore.info('Notifications agent suspendues temporairement.', {
        source: 'notification-toast',
        metadata: { parentNotificationId: entry.id, actionId: action.id, snoozedSource: source },
      });
      this.hideToast(entry.id);
      return;
    }

    if (action.kind === 'dismiss') {
      this.hideToast(entry.id);
    }
  }

  private dispatchCodexAction(entry: NotificationEntry, action: NotificationAction): void {
    const codexDispatch = action.codexDispatch;
    if (!codexDispatch?.task.trim()) {
      this.notificationsStore.error('Prompt Codex indisponible pour cette tache.', {
        source: entry.source ?? 'notification-toast',
        metadata: { parentNotificationId: entry.id, actionId: action.id },
      });
      return;
    }

    const adminOps = this.resolveAdminOpsService();
    if (!adminOps) {
      this.notificationsStore.error('Console Ops indisponible pour lancer Codex.', {
        source: entry.source ?? 'notification-toast',
        metadata: { parentNotificationId: entry.id, actionId: action.id },
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
              source: entry.source ?? 'notification-toast',
              parentNotificationId: entry.id,
              actionId: action.id,
              ...correlation,
            });
          } else {
            this.notificationsStore.info(
              `${this.providerLabel(codexDispatch.provider)} queued via ${result.workflow} on ${result.ref}.`,
              {
                source: entry.source ?? 'notification-toast',
                metadata: {
                  parentNotificationId: entry.id,
                  actionId: action.id,
                  workflow: result.workflow,
                  ref: result.ref,
                },
              },
            );
          }
          this.notificationsStore.markAsRead(entry.id);
          this.hideToast(entry.id);
        },
        error: (error: unknown) => {
          this.notificationsStore.error(this.resolveDispatchError(error, codexDispatch.provider), {
            source: entry.source ?? 'notification-toast',
            metadata: { parentNotificationId: entry.id, actionId: action.id },
          });
        },
      });
  }

  private durationFor(type: NotificationEntry['type']): number {
    return type === 'error' ? 8000 : 5000;
  }

  private startDismissTimer(entryId: string, durationMs: number): void {
    const timeout = setTimeout(() => {
      this.hideToast(entryId);
    }, durationMs);
    this.dismissTimers.set(entryId, {
      timeout,
      startedAt: Date.now(),
      remainingMs: durationMs,
      paused: false,
    });
  }

  private clearDismissTimer(entryId: string): void {
    const state = this.dismissTimers.get(entryId);
    if (state?.timeout) {
      clearTimeout(state.timeout);
    }
    this.dismissTimers.delete(entryId);
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
