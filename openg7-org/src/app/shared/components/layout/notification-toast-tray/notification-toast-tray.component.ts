import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { NotificationEntry, injectNotificationStore } from '@app/core/observability/notification.store';
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
  private readonly dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly notifications = computed(() => this.notificationsStore.entries().slice(0, MAX_VISIBLE_TOASTS));

  constructor() {
    effect(() => {
      const currentNotifications = this.notifications();
      const currentIds = new Set(currentNotifications.map(entry => entry.id));

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

  private durationFor(type: NotificationEntry['type']): number {
    return type === 'error' ? 8000 : 5000;
  }
}
