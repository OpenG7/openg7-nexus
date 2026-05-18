import { HttpClient } from '@angular/common/http';
import { computed, DestroyRef, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { retry, timer, catchError, of } from 'rxjs';

import { API_URL, NOTIFICATION_WEBHOOK_URL } from '../config/environment.tokens';

type NotificationKind = 'success' | 'info' | 'error';
export type NotificationActionKind = 'copy' | 'route' | 'snooze' | 'dismiss' | 'codex-dispatch';

export type NotificationCodexProvider = 'codex' | 'copilot' | 'claude' | 'gemini';

export type NotificationCodexScope =
  | 'openg7-org'
  | 'strapi'
  | 'packages-contracts'
  | 'packages-tooling'
  | 'repository-root';

export interface NotificationCodexDispatch {
  readonly provider: NotificationCodexProvider;
  readonly task: string;
  readonly scope: NotificationCodexScope;
  readonly baseBranch?: string | null;
  readonly draftPr?: boolean | null;
  readonly model?: string | null;
  readonly effort?: string | null;
}

export interface NotificationAction {
  readonly id: string;
  readonly label: string;
  readonly kind: NotificationActionKind;
  readonly command?: string | null;
  readonly route?: string | null;
  readonly durationMs?: number | null;
  readonly codexDispatch?: NotificationCodexDispatch | null;
}

export interface NotificationEntry {
  readonly id: string;
  readonly type: NotificationKind;
  readonly message: string;
  readonly title?: string | null;
  readonly source?: string | null;
  readonly context?: unknown;
  readonly metadata?: Record<string, unknown> | null;
  readonly actions?: readonly NotificationAction[];
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
  readonly actions?: readonly NotificationAction[];
  readonly deliver?: NotificationDeliveryOptions;
}

export interface NotificationEntryUpdate {
  readonly type?: NotificationEntry['type'];
  readonly message?: string;
  readonly title?: string | null;
  readonly source?: string | null;
  readonly context?: unknown;
  readonly metadata?: Record<string, unknown> | null;
  readonly actions?: readonly NotificationAction[];
  readonly read?: boolean;
}

export interface NotificationPreferences {
  readonly emailOptIn: boolean;
  readonly emailAddress: string | null;
  readonly webhookUrl: string | null;
}

interface NotificationState {
  readonly items: readonly NotificationEntry[];
  readonly preferences: NotificationPreferences;
  readonly snoozedSources: Record<string, number>;
  readonly lastDeliveryError: string | null;
}

const MAX_HISTORY = 100;
const STORAGE_KEY = 'og7.notifications.v1';
const ADMIN_QUALITY_AGENT_SOURCE = 'admin-quality-agent';
const ADMIN_QUALITY_AGENT_WORKLOAD_DEDUPE_KEY = `${ADMIN_QUALITY_AGENT_SOURCE}:workload`;
const ADMIN_QUALITY_AGENT_NEXT_WORK_DEDUPE_PREFIX = `${ADMIN_QUALITY_AGENT_SOURCE}:next-work`;
const DEFAULT_STATE: NotificationState = {
  items: [],
  preferences: {
    emailOptIn: false,
    emailAddress: null,
    webhookUrl: null,
  },
  snoozedSources: {},
  lastDeliveryError: null,
};

interface PersistedNotificationState {
  readonly items: readonly NotificationEntry[];
  readonly snoozedSources: Record<string, number>;
}

interface PersistedNotificationPayload {
  readonly version: 1;
  readonly items: readonly PersistedNotificationEntry[];
  readonly snoozedSources: Record<string, number>;
}

interface PersistedNotificationEntry {
  readonly id: string;
  readonly type: NotificationKind;
  readonly message: string;
  readonly title: string | null;
  readonly source: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly actions: readonly NotificationAction[];
  readonly createdAt: number;
  readonly read: boolean;
}

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

function normalizeActions(
  actions: readonly NotificationAction[] | undefined,
): readonly NotificationAction[] {
  return (actions ?? [])
    .map((action) => ({
      ...action,
      label: action.label.trim(),
      command: action.command?.trim() || null,
      route: action.route?.trim() || null,
      codexDispatch: normalizeCodexDispatch(action.codexDispatch),
    }))
    .filter((action) => {
      if (!action.id || !action.label) {
        return false;
      }
      switch (action.kind) {
        case 'copy':
          return Boolean(action.command);
        case 'route':
          return Boolean(action.route);
        case 'codex-dispatch':
          return Boolean(action.codexDispatch?.task);
        default:
          return true;
      }
    })
    .slice(0, 4);
}

function getNotificationStorage(): Storage | null {
  try {
    const storage =
      typeof window !== 'undefined'
        ? window.localStorage
        : (globalThis as { localStorage?: Storage }).localStorage;
    if (!storage) {
      return null;
    }
    const probeKey = `${STORAGE_KEY}.probe`;
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

function readPersistedNotificationState(): PersistedNotificationState | null {
  const storage = getNotificationStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const payload = normalizePersistedPayload(parsed);
    if (!payload) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }
    return payload;
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writePersistedNotificationState(state: PersistedNotificationState): void {
  const storage = getNotificationStorage();
  if (!storage) {
    return;
  }

  const payload: PersistedNotificationPayload = {
    version: 1,
    items: state.items.slice(0, MAX_HISTORY).map(toPersistedNotificationEntry),
    snoozedSources: normalizeSnoozedSources(state.snoozedSources),
  };

  try {
    const serialized = JSON.stringify(payload);
    try {
      storage.setItem(STORAGE_KEY, serialized);
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        // En cas de saturation, on vide les anciennes notifications pour faire de la place
        storage.setItem(STORAGE_KEY, JSON.stringify({ ...payload, items: payload.items.slice(0, 10) }));
      }
    }
  } catch {
    // Storage is best-effort; keep the in-memory notification state.
  }
}

function normalizePersistedPayload(candidate: unknown): PersistedNotificationState | null {
  if (!isRecord(candidate) || candidate['version'] !== 1) {
    return null;
  }

  const itemsCandidate = candidate['items'];
  const items = Array.isArray(itemsCandidate)
    ? itemsCandidate.map(normalizePersistedNotificationEntry).filter(isNotificationEntry)
    : [];

  return {
    items: dedupeNotificationEntries(items).slice(0, MAX_HISTORY),
    snoozedSources: normalizeSnoozedSources(candidate['snoozedSources']),
  };
}

function normalizePersistedNotificationEntry(candidate: unknown): NotificationEntry | null {
  if (!isRecord(candidate)) {
    return null;
  }

  const id = normalizeText(candidate['id']);
  const message = normalizeText(candidate['message']);
  const type = normalizeNotificationKind(candidate['type']);
  const createdAt = normalizeTimestamp(candidate['createdAt']);
  if (!id || !message || !type || createdAt == null) {
    return null;
  }

  return {
    id,
    type,
    message,
    title: normalizeOptionalText(candidate['title']),
    source: normalizeOptionalText(candidate['source']),
    context: undefined,
    metadata: normalizeMetadata(candidate['metadata']),
    actions: normalizeActions(
      Array.isArray(candidate['actions'])
        ? candidate['actions']
            .map(normalizePersistedNotificationAction)
            .filter(isNotificationAction)
        : [],
    ),
    createdAt,
    read: candidate['read'] === true,
  };
}

function normalizePersistedNotificationAction(candidate: unknown): NotificationAction | null {
  if (!isRecord(candidate)) {
    return null;
  }

  const id = normalizeText(candidate['id']);
  const label = normalizeText(candidate['label']);
  const kind = normalizeNotificationActionKind(candidate['kind']);
  if (!id || !label || !kind) {
    return null;
  }

  return {
    id,
    label,
    kind,
    command: normalizeOptionalText(candidate['command']),
    route: normalizeOptionalText(candidate['route']),
    durationMs: normalizeDuration(candidate['durationMs']),
    codexDispatch: normalizeCodexDispatch(candidate['codexDispatch']),
  };
}

function normalizeSnoozedSources(candidate: unknown): Record<string, number> {
  if (!isRecord(candidate)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(candidate).filter(
      (entry): entry is [string, number] =>
        Boolean(entry[0].trim()) && typeof entry[1] === 'number' && Number.isFinite(entry[1]),
    ),
  );
}

function toPersistedNotificationEntry(entry: NotificationEntry): PersistedNotificationEntry {
  return {
    id: entry.id,
    type: entry.type,
    message: entry.message,
    title: entry.title ?? null,
    source: entry.source ?? null,
    metadata: normalizeMetadata(entry.metadata),
    actions: entry.actions ?? [],
    createdAt: entry.createdAt,
    read: entry.read,
  };
}

function notificationDedupeKey(entry: NotificationEntry): string | null {
  const source = normalizeOptionalText(entry.source);
  const kind = normalizeText(entry.metadata?.['kind']);
  if (
    source === ADMIN_QUALITY_AGENT_SOURCE &&
    (kind === 'home-agent-activation' || kind === 'agent-workload')
  ) {
    return ADMIN_QUALITY_AGENT_WORKLOAD_DEDUPE_KEY;
  }

  if (source === ADMIN_QUALITY_AGENT_SOURCE && kind === 'agent-next-work') {
    const entryId = normalizeText(entry.metadata?.['entryId']);
    return entryId ? `${ADMIN_QUALITY_AGENT_NEXT_WORK_DEDUPE_PREFIX}:${entryId}` : null;
  }

  return normalizeText(entry.metadata?.['dedupeKey']);
}

function mergeDedupedNotificationEntry(
  existing: NotificationEntry,
  incoming: NotificationEntry,
): NotificationEntry {
  return {
    ...incoming,
    id: existing.id,
    metadata: mergeNotificationMetadata(existing.metadata, incoming.metadata),
    actions: mergeNotificationActions(existing.actions ?? [], incoming.actions ?? []),
  };
}

function mergeNotificationMetadata(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  const merged = {
    ...(existing ?? {}),
    ...(incoming ?? {}),
  };
  return Object.keys(merged).length ? merged : null;
}

function mergeNotificationActions(
  existing: readonly NotificationAction[],
  incoming: readonly NotificationAction[],
): readonly NotificationAction[] {
  const existingById = new Map(existing.map((action) => [action.id, action]));
  return incoming.map((action) => {
    const existingAction = existingById.get(action.id);
    if (existingAction && shouldPreserveExistingAction(existingAction, action)) {
      return existingAction;
    }
    return action;
  });
}

function shouldPreserveExistingAction(
  existing: NotificationAction,
  incoming: NotificationAction,
): boolean {
  return (
    incoming.kind === 'codex-dispatch' &&
    existing.kind === 'route' &&
    Boolean(existing.route) &&
    !existing.codexDispatch
  );
}

function dedupeNotificationEntries(
  entries: readonly NotificationEntry[],
): readonly NotificationEntry[] {
  const deduped: NotificationEntry[] = [];

  for (const entry of entries) {
    const dedupeKey = notificationDedupeKey(entry);
    if (!dedupeKey) {
      deduped.push(entry);
      continue;
    }

    const existingIndex = deduped.findIndex(
      (candidate) => notificationDedupeKey(candidate) === dedupeKey,
    );
    if (existingIndex === -1) {
      deduped.push(entry);
      continue;
    }

    const newestEntry = deduped[existingIndex];
    deduped[existingIndex] = {
      ...mergeDedupedNotificationEntry(entry, newestEntry),
      id: newestEntry.id,
      createdAt: newestEntry.createdAt,
      read: newestEntry.read,
    };
  }

  return deduped;
}

function normalizeNotificationKind(value: unknown): NotificationKind | null {
  return value === 'success' || value === 'info' || value === 'error' ? value : null;
}

function normalizeNotificationActionKind(value: unknown): NotificationActionKind | null {
  switch (value) {
    case 'copy':
    case 'route':
    case 'snooze':
    case 'dismiss':
    case 'codex-dispatch':
      return value;
    default:
      return null;
  }
}

function normalizeMetadata(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function normalizeText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeOptionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeTimestamp(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeDuration(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isNotificationEntry(value: NotificationEntry | null): value is NotificationEntry {
  return value !== null;
}

function isNotificationAction(value: NotificationAction | null): value is NotificationAction {
  return value !== null;
}

function normalizeCodexDispatch(dispatch: unknown): NotificationCodexDispatch | null {
  if (!isRecord(dispatch)) {
    return null;
  }

  const provider = normalizeCodexProvider(dispatch['provider']);
  const scope = normalizeCodexScope(dispatch['scope']);
  const task = normalizeText(dispatch['task']);
  if (!provider || !scope || !task) {
    return null;
  }

  return {
    provider,
    task,
    scope,
    baseBranch: normalizeOptionalText(dispatch['baseBranch']) ?? 'main',
    draftPr: typeof dispatch['draftPr'] === 'boolean' ? dispatch['draftPr'] : true,
    model: normalizeOptionalText(dispatch['model']),
    effort: normalizeOptionalText(dispatch['effort']),
  };
}

function normalizeCodexProvider(value: unknown): NotificationCodexProvider | null {
  switch (value) {
    case 'codex':
    case 'copilot':
    case 'claude':
    case 'gemini':
      return value;
    default:
      return null;
  }
}

function normalizeCodexScope(value: unknown): NotificationCodexScope | null {
  switch (value) {
    case 'openg7-org':
    case 'strapi':
    case 'packages-contracts':
    case 'packages-tooling':
    case 'repository-root':
      return value;
    default:
      return null;
  }
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
    const destroyRef = inject(DestroyRef);
    const persisted = readPersistedNotificationState();

    if (persisted) {
      patchState(store, {
        items: persisted.items,
        snoozedSources: persisted.snoozedSources,
      });
    }

    // Synchronisation multi-onglets
    if (typeof window !== 'undefined') {
      const onStorage = (event: StorageEvent): void => {
        if (event.key !== STORAGE_KEY || !event.newValue) {
          return;
        }
        const newState = readPersistedNotificationState();
        if (newState) {
          patchState(store, {
            items: newState.items,
            snoozedSources: newState.snoozedSources,
          });
        }
      };
      window.addEventListener('storage', onStorage);
      destroyRef.onDestroy(() => window.removeEventListener('storage', onStorage));
    }

    const persistCurrentState = () => {
      writePersistedNotificationState({
        items: store.items(),
        snoozedSources: store.snoozedSources(),
      });
    };

    const patchAndPersist = (
      update: Partial<Pick<NotificationState, 'items' | 'snoozedSources'>>,
    ) => {
      patchState(store, update);
      persistCurrentState();
    };

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

    const appendNotification = (entry: NotificationEntry): NotificationEntry => {
      const dedupeKey = notificationDedupeKey(entry);
      const existing = dedupeKey
        ? store.items().find((item) => notificationDedupeKey(item) === dedupeKey)
        : null;
      const nextEntry = existing ? mergeDedupedNotificationEntry(existing, entry) : entry;
      const existingItems = existing
        ? store.items().filter((item) => item.id !== existing.id)
        : store.items();
      const next = [nextEntry, ...existingItems].slice(0, MAX_HISTORY);
      patchAndPersist({
        items: next,
      });
      return nextEntry;
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
        .pipe(
          retry({ 
            count: 2, 
            delay: (error) => {
              console.warn('Notification delivery retry...', error);
              return timer(3000);
            }
          }),
          catchError((err) => {
            console.error('Notification delivery permanently failed', err);
            return of(null);
          })
        )
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

    const isSourceSnoozed = (source: string | null | undefined, now = Date.now()) => {
      if (!source) {
        return false;
      }
      const until = store.snoozedSources()[source] ?? 0;
      return until > now;
    };

    const push = (type: NotificationKind, message: string, options?: NotificationOptions) => {
      if (type !== 'error' && isSourceSnoozed(options?.source)) {
        return undefined;
      }

      const entry: NotificationEntry = {
        id: generateNotificationId(),
        type,
        message,
        title: options?.title ?? null,
        source: options?.source ?? null,
        context: options?.context,
        metadata: options?.metadata ?? null,
        actions: normalizeActions(options?.actions),
        createdAt: Date.now(),
        read: false,
      };
      const persistedEntry = appendNotification(entry);

      if (options?.deliver?.email ?? type === 'error') {
        deliverByEmail(persistedEntry);
      }
      return persistedEntry.id;
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
        patchAndPersist({ items: next });
      },
      markAllRead() {
        const next = store.items().map((item) => ({ ...item, read: true }));
        patchAndPersist({ items: next });
      },
      updateEntry(id: string, update: NotificationEntryUpdate) {
        const next = store.items().map((item) => {
          if (item.id !== id) {
            return item;
          }

          return {
            ...item,
            type: update.type ?? item.type,
            message: update.message ?? item.message,
            title: typeof update.title === 'undefined' ? item.title : update.title,
            source: typeof update.source === 'undefined' ? item.source : update.source,
            context: typeof update.context === 'undefined' ? item.context : update.context,
            metadata: typeof update.metadata === 'undefined' ? item.metadata : update.metadata,
            actions: update.actions ? normalizeActions(update.actions) : item.actions,
            read: update.read ?? item.read,
          };
        });
        patchAndPersist({ items: next });
      },
      dismiss(id: string) {
        const next = store.items().filter((item) => item.id !== id);
        patchAndPersist({ items: next });
      },
      clearHistory() {
        patchAndPersist({ items: [] });
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
      snoozeSource(source: string, durationMs: number) {
        const trimmed = source.trim();
        if (!trimmed || durationMs <= 0) {
          return;
        }
        patchAndPersist({
          snoozedSources: {
            ...store.snoozedSources(),
            [trimmed]: Date.now() + durationMs,
          },
        });
      },
      clearSourceSnooze(source: string) {
        const trimmed = source.trim();
        const { [trimmed]: _, ...rest } = store.snoozedSources();
        patchAndPersist({ snoozedSources: rest });
      },
      isSourceSnoozed,
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
