import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { AuthService } from '@app/core/auth/auth.service';
import {
  UserFavoriteRecord,
  UserFavoritesApiService,
} from '@app/core/services/user-favorites-api.service';
import { finalize } from 'rxjs';

const STORAGE_KEY = 'og7.favorites';
const DEFAULT_ENTITY_TYPE = 'generic';

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecte via Angular DI par les autres briques du dossier `core`.
 * Raison d'etre : Centralise la gestion des favoris avec synchronisation serveur et fallback local.
 * @param dependencies Dependances injectees automatiquement par Angular.
 * @returns FavoritesService geree par le framework.
 */
export class FavoritesService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly favoritesApi = inject(UserFavoritesApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private syncRequestInFlight = false;

  private readonly items = signal<string[]>(this.restore());
  private readonly loadingSig = signal(false);
  private readonly errorSig = signal<string | null>(null);
  private readonly remoteIdByKeySig = signal<Record<string, string>>({});

  readonly list = this.items.asReadonly();
  readonly loading = this.loadingSig.asReadonly();
  readonly error = this.errorSig.asReadonly();
  readonly count = computed(() => this.items().length);
  readonly count$ = toObservable(this.count);

  /**
   * Contexte : Called by UI components when a user stars an entity.
   * Raison d'etre : Persists the selection locally and pushes it to API when authenticated.
   * @param item Identifier to keep in favourites.
   * @returns void
   */
  add(item: string) {
    const normalized = this.normalizeItem(item);
    if (!normalized) {
      return;
    }

    const changed = this.applyChange((current) =>
      current.includes(normalized) ? current : [...current, normalized],
    );
    if (!changed || !this.auth.isAuthenticated()) {
      return;
    }

    this.createRemoteFavorite(normalized);
  }

  /**
   * Contexte : Triggered when user unstars a previously saved item.
   * Raison d'etre : Updates local cache and removes remote resource when available.
   * @param item Identifier to remove.
   * @returns void
   */
  remove(item: string) {
    const normalized = this.normalizeItem(item);
    if (!normalized) {
      return;
    }

    const changed = this.applyChange((current) =>
      current.includes(normalized) ? current.filter((i) => i !== normalized) : current,
    );
    if (!changed || !this.auth.isAuthenticated()) {
      return;
    }

    this.deleteRemoteFavorite(normalized);
  }

  /**
   * Contexte : Used by account screens providing "clear favourites" action.
   * Raison d'etre : Clears local cache then best-effort clears known remote entries.
   * @returns void
   */
  clear() {
    const previousRemoteIndex = this.remoteIdByKeySig();
    const changed = this.applyChange((current) => (current.length ? [] : current));
    if (!changed) {
      return;
    }

    this.remoteIdByKeySig.set({});
    if (!this.auth.isAuthenticated()) {
      return;
    }

    for (const remoteId of Object.values(previousRemoteIndex)) {
      this.favoritesApi
        .deleteMine(remoteId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          error: () => this.errorSig.set('favorites.sync.failed'),
        });
    }
  }

  /**
   * Contexte : Called by account pages to force a refresh.
   * Raison d'etre : Reloads current user's favourites from API.
   * @returns void
   */
  refresh() {
    if (!this.auth.isAuthenticated()) {
      this.remoteIdByKeySig.set({});
      this.loadingSig.set(false);
      this.errorSig.set(null);
      this.syncRequestInFlight = false;
      return;
    }

    this.syncFromServer();
  }

  private applyChange(mutator: (current: string[]) => string[]): boolean {
    const current = this.items();
    const next = mutator(current);
    if (this.areListsEqual(current, next)) {
      return false;
    }
    this.items.set(next);
    this.persist(next);
    return true;
  }

  private syncFromServer() {
    if (!this.auth.isAuthenticated() || this.syncRequestInFlight) {
      return;
    }

    this.syncRequestInFlight = true;
    this.loadingSig.set(true);
    this.errorSig.set(null);

    this.favoritesApi
      .listMine()
      .pipe(
        finalize(() => {
          this.syncRequestInFlight = false;
          this.loadingSig.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (favorites) => this.handleRemoteFavorites(favorites),
        error: () => this.errorSig.set('favorites.sync.failed'),
      });
  }

  private handleRemoteFavorites(favorites: UserFavoriteRecord[]) {
    const remoteIndex: Record<string, string> = {};
    const remoteItems: string[] = [];

    for (const favorite of favorites) {
      const key = this.composeStorageKey(favorite.entityType, favorite.entityId);
      if (!key) {
        continue;
      }
      remoteItems.push(key);
      remoteIndex[key] = favorite.id;
    }

    const merged = this.dedupe([...remoteItems, ...this.items()]);
    this.remoteIdByKeySig.set(remoteIndex);
    this.items.set(merged);
    this.persist(merged);

    for (const item of merged) {
      if (!remoteIndex[item]) {
        this.createRemoteFavorite(item);
      }
    }
  }

  private createRemoteFavorite(item: string) {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    const parsed = this.parseStorageKey(item);
    this.favoritesApi
      .createMine({
        entityType: parsed.entityType,
        entityId: parsed.entityId,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (favorite) => {
          const key = this.composeStorageKey(favorite.entityType, favorite.entityId);
          if (!key) {
            return;
          }
          this.remoteIdByKeySig.update((current) => ({
            ...current,
            [key]: favorite.id,
          }));
        },
        error: () => this.errorSig.set('favorites.sync.failed'),
      });
  }

  private deleteRemoteFavorite(item: string) {
    const remoteId = this.remoteIdByKeySig()[item];
    if (!remoteId || !this.auth.isAuthenticated()) {
      return;
    }

    this.favoritesApi
      .deleteMine(remoteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.remoteIdByKeySig.update((current) => {
            const next = { ...current };
            delete next[item];
            return next;
          });
        },
        error: () => this.errorSig.set('favorites.sync.failed'),
      });
  }

  private normalizeItem(item: string): string | null {
    if (typeof item !== 'string') {
      return null;
    }

    const normalized = item.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private parseStorageKey(item: string): { entityType: string; entityId: string } {
    const normalized = this.normalizeItem(item) ?? '';
    const separatorIndex = normalized.indexOf(':');
    if (separatorIndex <= 0) {
      return { entityType: DEFAULT_ENTITY_TYPE, entityId: normalized };
    }

    const entityType = normalized.slice(0, separatorIndex).trim().toLowerCase();
    const entityId = normalized.slice(separatorIndex + 1).trim();
    if (!entityType || !entityId) {
      return { entityType: DEFAULT_ENTITY_TYPE, entityId: normalized };
    }

    return { entityType, entityId };
  }

  private composeStorageKey(entityType: unknown, entityId: unknown): string | null {
    const normalizedId = this.normalizeItem(typeof entityId === 'string' ? entityId : '');
    if (!normalizedId) {
      return null;
    }

    const normalizedType = this.normalizeItem(typeof entityType === 'string' ? entityType : '');
    if (!normalizedType || normalizedType.toLowerCase() === DEFAULT_ENTITY_TYPE) {
      return normalizedId;
    }

    return `${normalizedType.toLowerCase()}:${normalizedId}`;
  }

  private areListsEqual(left: string[], right: string[]): boolean {
    if (left === right) {
      return true;
    }
    if (left.length !== right.length) {
      return false;
    }

    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) {
        return false;
      }
    }

    return true;
  }

  private dedupe(items: string[]): string[] {
    const unique = new Set<string>();
    for (const item of items) {
      const normalized = this.normalizeItem(item);
      if (normalized) {
        unique.add(normalized);
      }
    }
    return Array.from(unique);
  }

  private restore(): string[] {
    if (!this.browser) {
      return [];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      const filtered = parsed.filter((item): item is string => typeof item === 'string');
      return this.dedupe(filtered);
    } catch {
      return [];
    }
  }

  private persist(next: string[]) {
    if (!this.browser) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }
}
