import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '@app/core/auth/auth.service';
import {
  CreateSavedSearchPayload,
  SavedSearchRecord,
  SavedSearchesApiService,
  UpdateSavedSearchPayload,
} from '@app/core/services/saved-searches-api.service';
import { finalize } from 'rxjs';

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecte dans les pages compte qui pilotent les recherches sauvegardees.
 * Raison d'etre : Centralise l'etat signal-first et les appels CRUD vers l'API profile.
 * @param dependencies Dependances injectees automatiquement par Angular.
 * @returns SavedSearchesService geree par le framework.
 */
export class SavedSearchesService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly api = inject(SavedSearchesApiService);

  private readonly entriesSig = signal<SavedSearchRecord[]>([]);
  private readonly loadingSig = signal(false);
  private readonly savingSig = signal(false);
  private readonly errorSig = signal<string | null>(null);
  private readonly pendingByIdSig = signal<Record<string, boolean>>({});

  readonly entries = this.entriesSig.asReadonly();
  readonly loading = this.loadingSig.asReadonly();
  readonly saving = this.savingSig.asReadonly();
  readonly error = this.errorSig.asReadonly();
  readonly pendingById = this.pendingByIdSig.asReadonly();
  readonly hasEntries = computed(() => this.entriesSig().length > 0);

  /**
   * Contexte : Appelee a l'ouverture de la page pour synchroniser l'etat local.
   * Raison d'etre : Charge les recherches du user authentifie.
   * @returns void
   */
  refresh(): void {
    if (!this.auth.isAuthenticated()) {
      this.entriesSig.set([]);
      this.pendingByIdSig.set({});
      this.loadingSig.set(false);
      this.errorSig.set(null);
      return;
    }

    this.loadingSig.set(true);
    this.errorSig.set(null);

    this.api
      .listMine()
      .pipe(
        finalize(() => this.loadingSig.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (entries) => {
          this.entriesSig.set(this.sortEntries(entries));
        },
        error: () => {
          this.errorSig.set('pages.savedSearches.errors.load');
        },
      });
  }

  /**
   * Contexte : Declenchee depuis le formulaire de creation de recherche.
   * Raison d'etre : Cree une recherche et fusionne la reponse dans l'etat.
   * @param payload Champs a persister.
   * @returns void
   */
  create(payload: CreateSavedSearchPayload): void {
    if (!this.auth.isAuthenticated() || this.savingSig()) {
      return;
    }

    const name = payload.name?.trim();
    if (!name) {
      return;
    }

    const sanitizedPayload: CreateSavedSearchPayload = {
      ...payload,
      name,
      filters: payload.filters ?? {},
    };

    this.savingSig.set(true);
    this.errorSig.set(null);

    this.api
      .createMine(sanitizedPayload)
      .pipe(
        finalize(() => this.savingSig.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (created) => {
          this.entriesSig.update((current) => this.sortEntries(this.upsert(current, created)));
        },
        error: () => {
          this.errorSig.set('pages.savedSearches.errors.create');
        },
      });
  }

  /**
   * Contexte : Declenchee par les actions inline de la liste (toggle, frequence, nom).
   * Raison d'etre : Met a jour une entree cote serveur puis localement.
   * @param id Identifiant de la recherche.
   * @param payload Champs a mettre a jour.
   * @returns void
   */
  update(id: string, payload: UpdateSavedSearchPayload): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    const normalizedId = this.normalizeId(id);
    if (!normalizedId) {
      return;
    }

    const sanitizedPayload: UpdateSavedSearchPayload = { ...payload };
    if (typeof sanitizedPayload.name === 'string') {
      const name = sanitizedPayload.name.trim();
      if (!name) {
        return;
      }
      sanitizedPayload.name = name;
    }

    const previousEntry = this.entriesSig().find((entry) => entry.id === normalizedId) ?? null;
    if (previousEntry) {
      const optimisticEntry: SavedSearchRecord = {
        ...previousEntry,
        ...sanitizedPayload,
      };
      this.entriesSig.update((current) => this.sortEntries(this.upsert(current, optimisticEntry)));
    }

    this.setPending(normalizedId, true);
    this.errorSig.set(null);

    this.api
      .updateMine(normalizedId, sanitizedPayload)
      .pipe(
        finalize(() => this.setPending(normalizedId, false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (updated) => {
          this.entriesSig.update((current) => this.sortEntries(this.upsert(current, updated)));
        },
        error: () => {
          if (previousEntry) {
            this.entriesSig.update((current) => this.sortEntries(this.upsert(current, previousEntry)));
          }
          this.errorSig.set('pages.savedSearches.errors.update');
        },
      });
  }

  /**
   * Contexte : Declenchee par le bouton de suppression d'une recherche.
   * Raison d'etre : Supprime la ressource distante puis retire l'entree locale.
   * @param id Identifiant de la recherche.
   * @returns void
   */
  remove(id: string): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    const normalizedId = this.normalizeId(id);
    if (!normalizedId) {
      return;
    }

    this.setPending(normalizedId, true);
    this.errorSig.set(null);

    this.api
      .deleteMine(normalizedId)
      .pipe(
        finalize(() => this.setPending(normalizedId, false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.entriesSig.update((current) => current.filter((entry) => entry.id !== normalizedId));
        },
        error: () => {
          this.errorSig.set('pages.savedSearches.errors.delete');
        },
      });
  }

  private normalizeId(id: string): string | null {
    if (typeof id !== 'string') {
      return null;
    }
    const normalized = id.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private upsert(entries: SavedSearchRecord[], next: SavedSearchRecord): SavedSearchRecord[] {
    const index = entries.findIndex((entry) => entry.id === next.id);
    if (index < 0) {
      return [...entries, next];
    }

    const merged = [...entries];
    merged[index] = next;
    return merged;
  }

  private sortEntries(entries: SavedSearchRecord[]): SavedSearchRecord[] {
    return [...entries].sort((left, right) => this.toTimestamp(right) - this.toTimestamp(left));
  }

  private toTimestamp(entry: SavedSearchRecord): number {
    const candidate = entry.updatedAt ?? entry.createdAt;
    if (!candidate) {
      return 0;
    }
    const parsed = Date.parse(candidate);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private setPending(id: string, pending: boolean): void {
    this.pendingByIdSig.update((current) => {
      const next = { ...current };
      if (pending) {
        next[id] = true;
      } else {
        delete next[id];
      }
      return next;
    });
  }
}
