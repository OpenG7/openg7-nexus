import { isPlatformBrowser } from '@angular/common';
import { Signal, effect, signal } from '@angular/core';

import { AuthService } from '../auth/auth.service';

type UserScopedAuthState = Pick<AuthService, 'isAuthenticated' | 'user'>;

export interface UserScopedPersistentState<TValue> {
  readonly value: Signal<TValue>;
  refresh(): void;
  currentUserId(): string | null;
  requireCurrentUserId(errorMessage: string): string;
  setForCurrentUser(value: TValue, errorMessage: string): void;
  updateForCurrentUser(updater: (current: TValue) => TValue, errorMessage: string): TValue;
}

interface CreateUserScopedPersistentStateOptions<TValue> {
  readonly auth: UserScopedAuthState;
  readonly platformId: object;
  readonly storageKeyPrefix: string;
  readonly createEmptyValue: () => TValue;
  readonly deserialize: (value: unknown) => TValue | null;
}

export function createUserScopedPersistentState<TValue>(
  options: CreateUserScopedPersistentStateOptions<TValue>
): UserScopedPersistentState<TValue> {
  const browser = isPlatformBrowser(options.platformId);
  const valueSig = signal<TValue>(options.createEmptyValue());

  const normalizeId = (value: unknown): string | null => {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  };

  const getStorage = (): Storage | null => {
    if (!browser) {
      return null;
    }

    const storage =
      typeof window !== 'undefined'
        ? window.localStorage
        : (globalThis as { localStorage?: Storage }).localStorage;

    if (!storage) {
      return null;
    }

    try {
      return storage;
    } catch {
      return null;
    }
  };

  const storageKey = (userId: string): string => `${options.storageKeyPrefix}.${userId}`;

  const restore = (userId: string): TValue => {
    const storage = getStorage();
    if (!storage) {
      return options.createEmptyValue();
    }

    const key = storageKey(userId);
    const raw = storage.getItem(key);
    if (!raw) {
      return options.createEmptyValue();
    }

    try {
      const parsed = JSON.parse(raw);
      const restored = options.deserialize(parsed);
      if (restored !== null) {
        return restored;
      }
    } catch {
      // Fall through to removing the corrupted value.
    }

    storage.removeItem(key);
    return options.createEmptyValue();
  };

  const persist = (userId: string, value: TValue): void => {
    const storage = getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.setItem(storageKey(userId), JSON.stringify(value));
    } catch {
      // Keep the in-memory state when storage is unavailable.
    }
  };

  const currentUserId = (): string | null => {
    if (!browser || !options.auth.isAuthenticated()) {
      return null;
    }

    return normalizeId(options.auth.user()?.id ?? null);
  };

  const requireCurrentUserId = (errorMessage: string): string => {
    const userId = currentUserId();
    if (userId) {
      return userId;
    }

    throw new Error(errorMessage);
  };

  effect(() => {
    const userId = currentUserId();
    if (!userId) {
      valueSig.set(options.createEmptyValue());
      return;
    }

    valueSig.set(restore(userId));
  });

  return {
    value: valueSig.asReadonly(),
    refresh(): void {
      const userId = currentUserId();
      valueSig.set(userId ? restore(userId) : options.createEmptyValue());
    },
    currentUserId,
    requireCurrentUserId,
    setForCurrentUser(value: TValue, errorMessage: string): void {
      const userId = requireCurrentUserId(errorMessage);
      valueSig.set(value);
      persist(userId, value);
    },
    updateForCurrentUser(updater: (current: TValue) => TValue, errorMessage: string): TValue {
      const userId = requireCurrentUserId(errorMessage);
      const next = updater(valueSig());
      valueSig.set(next);
      persist(userId, next);
      return next;
    },
  };
}
