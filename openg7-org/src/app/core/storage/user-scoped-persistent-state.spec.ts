import { PLATFORM_ID, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../auth/auth.service';

import { createUserScopedPersistentState } from './user-scoped-persistent-state';

const STORAGE_KEY_PREFIX = 'og7.test.user-scoped-state';
const AUTH_REQUIRED_ERROR = 'Authenticated user required.';

describe('createUserScopedPersistentState', () => {
  let authState: ReturnType<typeof signal<boolean>>;
  let userState: ReturnType<typeof signal<{ id: string } | null>>;

  beforeEach(() => {
    authState = signal(false);
    userState = signal<{ id: string } | null>(null);

    clearStorage();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
  });

  afterEach(() => {
    clearStorage();
  });

  it('restores the same user state after logout and relogin', () => {
    authState.set(true);
    userState.set({ id: 'user-1' });

    const state = createState();
    state.setForCurrentUser({ saved: 42 }, AUTH_REQUIRED_ERROR);
    expect(state.value()).toEqual({ saved: 42 });

    authState.set(false);
    userState.set(null);
    state.refresh();
    expect(state.value()).toEqual({});

    authState.set(true);
    userState.set({ id: 'user-1' });
    state.refresh();
    expect(state.value()).toEqual({ saved: 42 });
  });

  it('removes corrupted storage values during refresh', () => {
    authState.set(true);
    userState.set({ id: 'user-1' });
    localStorage.setItem(storageKey('user-1'), '{broken-json');

    const state = createState();
    state.refresh();

    expect(state.value()).toEqual({});
    expect(localStorage.getItem(storageKey('user-1'))).toBeNull();
  });

  it('throws when writes are attempted without an authenticated user', () => {
    const state = createState();

    expect(() => state.setForCurrentUser({ saved: 1 }, AUTH_REQUIRED_ERROR)).toThrowError(
      AUTH_REQUIRED_ERROR
    );
    expect(() =>
      state.updateForCurrentUser((current) => ({ ...current, saved: 2 }), AUTH_REQUIRED_ERROR)
    ).toThrowError(AUTH_REQUIRED_ERROR);
  });

  function createState() {
    return TestBed.runInInjectionContext(() =>
      createUserScopedPersistentState<Record<string, number>>({
        auth: {
          isAuthenticated: computed(() => authState()),
          user: userState.asReadonly(),
        } as Pick<AuthService, 'isAuthenticated' | 'user'>,
        platformId: TestBed.inject(PLATFORM_ID),
        storageKeyPrefix: STORAGE_KEY_PREFIX,
        createEmptyValue: () => ({}),
        deserialize: deserializeNumberMap,
      })
    );
  }
});

function deserializeNumberMap(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const restored: Record<string, number> = {};
  for (const [key, candidate] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.trim();
    const normalizedValue = Number(candidate);
    if (!normalizedKey || !Number.isFinite(normalizedValue)) {
      return null;
    }
    restored[normalizedKey] = normalizedValue;
  }

  return restored;
}

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}.${userId}`;
}

function clearStorage(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(STORAGE_KEY_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}
