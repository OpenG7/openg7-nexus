import { HttpClient } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import { API_URL, NOTIFICATION_WEBHOOK_URL } from '../config/environment.tokens';

type NotificationKind = 'success' | 'info' | 'error';

export interface NotificationEntry {
  readonly id: string;
  readonly type: NotificationKind;
  readonly message: string;
  readonly title?: string | null;
  readonly source?: string | null;
  readonly context?: unknown;
  readonly metadata?: Record<string, unknown> | null;
  readonly createdAt: number;
  readonly read: boolean;
}

export interface NotificationDeliveryOptions {
  readonly email?: boolean;
}

export interface NotificationOptions {
  readonly title?: string | null;
  readonly source?: string | null;
  readonly context?: unknown;
  readonly metadata?: Record<string, unknown> | null;
  readonly deliver?: NotificationDeliveryOptions;
}

export interface NotificationPreferences {
  readonly emailOptIn: boolean;
  readonly emailAddress: string | null;
  readonly webhookUrl: string | null;
}

interface NotificationState {
  readonly items: readonly NotificationEntry[];
  readonly preferences: NotificationPreferences;
  readonly lastDeliveryError: string | null;
}

const MAX_HISTORY = 100;
const DEFAULT_STATE: NotificationState = {
  items: [],
  preferences: {
    emailOptIn: false,
    emailAddress: null,
    webhookUrl: null,
  },
  lastDeliveryError: null,
};

function generateNotificationId(): string {
  const cryptoApi: Crypto | undefined = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  return `notif-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      parsed.hash = '';
      const href = parsed.toString();
      return href.endsWith('/') ? href.slice(0, -1) : href;
    }
  } catch {
    return null;
  }
  return null;
}

export const NotificationStore = signalStore(
  { providedIn: 'root' },
  withState(DEFAULT_STATE),
  withComputed(({ items, preferences }) => ({
    entries: computed(() => items()),
    unreadCount: computed(() => items().filter((item) => !item.read).length),
    hasUnread: computed(() => items().some((item) => !item.read)),
    emailOptIn: computed(() => preferences().emailOptIn),
  })),
  withMethods((store) => {
    const http = inject(HttpClient, { optional: true });
    const apiUrl = sanitizeUrl(inject(API_URL, { optional: true }) ?? '') ?? '';
    const explicitWebhook = sanitizeUrl(
      inject(NOTIFICATION_WEBHOOK_URL, { optional: true }) ?? null,
    );

    const resolveWebhookUrl = (): string | null => {
      const pref = store.preferences();
      const preferenceWebhook = sanitizeUrl(pref.webhookUrl);
      if (preferenceWebhook) {
        return preferenceWebhook;
      }
      if (explicitWebhook) {
        return explicitWebhook;
      }
      if (!apiUrl || apiUrl.startsWith('/')) {
        return null;
      }
      return `${apiUrl.replace(/\/$/, '')}/api/notifications/email`;
    };

    const appendNotification = (entry: NotificationEntry) => {
      const next = [entry, ...store.items()].slice(0, MAX_HISTORY);
      patchState(store, {
        items: next,
      });
    };

    const deliverByEmail = (entry: NotificationEntry) => {
      if (!http) {
        return;
      }
      const preferences = store.preferences();
      if (!preferences.emailOptIn) {
        return;
      }
      const webhook = resolveWebhookUrl();
      if (!webhook) {
        return;
      }

      http
        .post(webhook, {
          notification: {
            id: entry.id,
            type: entry.type,
            title: entry.title ?? null,
            message: entry.message,
            source: entry.source ?? null,
            createdAt: new Date(entry.createdAt).toISOString(),
            metadata: entry.metadata ?? null,
          },
          recipient: preferences.emailAddress,
        })
        .subscribe({
          next: () => {
            patchState(store, { lastDeliveryError: null });
          },
          error: (error: unknown) => {
            const message =
              typeof error === 'object' && error && 'message' in error
                ? String((error as { message?: unknown }).message ?? 'delivery_failed')
                : 'delivery_failed';
            patchState(store, { lastDeliveryError: message });
          },
        });
    };

    const push = (type: NotificationKind, message: string, options?: NotificationOptions) => {
      const entry: NotificationEntry = {
        id: generateNotificationId(),
        type,
        message,
        title: options?.title ?? null,
        source: options?.source ?? null,
        context: options?.context,
        metadata: options?.metadata ?? null,
        createdAt: Date.now(),
        read: false,
      };
      appendNotification(entry);

      if (options?.deliver?.email ?? type === 'error') {
        deliverByEmail(entry);
      }
      return entry.id;
    };

    return {
      push,
      success(message: string, options?: NotificationOptions) {
        return push('success', message, options);
      },
      info(message: string, options?: NotificationOptions) {
        return push('info', message, options);
      },
      error(message: string, options?: NotificationOptions) {
        return push('error', message, options);
      },
      markAsRead(id: string) {
        const next = store.items().map((item) =>
          item.id === id
            ? {
                ...item,
                read: true,
              }
            : item,
        );
        patchState(store, { items: next });
      },
      markAllRead() {
        const next = store.items().map((item) => ({ ...item, read: true }));
        patchState(store, { items: next });
      },
      dismiss(id: string) {
        const next = store.items().filter((item) => item.id !== id);
        patchState(store, { items: next });
      },
      clearHistory() {
        patchState(store, { items: [] });
      },
      updatePreferences(preferences: Partial<NotificationPreferences>) {
        const next: NotificationPreferences = {
          ...store.preferences(),
          ...preferences,
          webhookUrl: sanitizeUrl(preferences.webhookUrl ?? store.preferences().webhookUrl),
          emailAddress: preferences.emailAddress ?? store.preferences().emailAddress,
        };
        patchState(store, {
          preferences: next,
        });
      },
      resetDeliveryError() {
        patchState(store, { lastDeliveryError: null });
      },
    };
  }),
);

export type NotificationStoreApi = InstanceType<typeof NotificationStore>;

/**
 * Contexte : Called by services and interceptors needing to emit notifications without directly importing the store class.
 * Raison d’être : Encapsulates the injection pattern so consumers receive the typed store API.
 * @returns The singleton notification store instance provided in root.
 */
export function injectNotificationStore(): NotificationStoreApi {
  return inject(NotificationStore) as NotificationStoreApi;
}
