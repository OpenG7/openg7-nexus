import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  NotificationEntry,
  NotificationAction,
  injectNotificationStore,
} from '@app/core/observability/notification.store';
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
  private readonly router = inject(Router);
  private readonly dismissTimers = new Map<string, DismissTimerState>();
  private readonly hiddenToastIds = signal<ReadonlySet<string>>(new Set());

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
