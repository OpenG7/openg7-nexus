import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  NotificationEntry,
  NotificationAction,
  injectNotificationStore,
} from '@app/core/observability/notification.store';
import { TranslateModule } from '@ngx-translate/core';

const MAX_VISIBLE_TOASTS = 4;

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
  private readonly dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly notifications = computed(() =>
    this.notificationsStore.entries().slice(0, MAX_VISIBLE_TOASTS),
  );

  constructor() {
    effect(() => {
      const currentNotifications = this.notifications();
      const currentIds = new Set(currentNotifications.map((entry) => entry.id));

      for (const entry of currentNotifications) {
        if (this.dismissTimers.has(entry.id)) {
          continue;
        }

        const timer = setTimeout(() => {
          this.dismiss(entry.id);
        }, this.durationFor(entry.type));
        this.dismissTimers.set(entry.id, timer);
      }

      for (const [entryId, timer] of this.dismissTimers.entries()) {
        if (currentIds.has(entryId)) {
          continue;
        }
        clearTimeout(timer);
        this.dismissTimers.delete(entryId);
      }
    });

    this.destroyRef.onDestroy(() => {
      for (const timer of this.dismissTimers.values()) {
        clearTimeout(timer);
      }
      this.dismissTimers.clear();
    });
  }

  trackById(_: number, entry: NotificationEntry): string {
    return entry.id;
  }

  dismiss(entryId: string): void {
    const timer = this.dismissTimers.get(entryId);
    if (timer) {
      clearTimeout(timer);
      this.dismissTimers.delete(entryId);
    }
    this.notificationsStore.dismiss(entryId);
  }

  isError(entry: NotificationEntry): boolean {
    return entry.type === 'error';
  }

  performAction(entry: NotificationEntry, action: NotificationAction): void {
    if (action.kind === 'route' && action.route) {
      void this.router.navigateByUrl(action.route);
      this.dismiss(entry.id);
      return;
    }

    if (action.kind === 'copy' && action.command) {
      void this.copyText(action.command)
        .then(() => {
          this.notificationsStore.success('Commande agent copiee.', {
            source: entry.source ?? 'notification-toast',
            metadata: { parentNotificationId: entry.id, actionId: action.id },
          });
          this.dismiss(entry.id);
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
      this.dismiss(entry.id);
      return;
    }

    if (action.kind === 'dismiss') {
      this.dismiss(entry.id);
    }
  }

  private durationFor(type: NotificationEntry['type']): number {
    return type === 'error' ? 8000 : 5000;
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
