import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '@app/core/auth/auth.service';
import {
  CreateUserAlertPayload,
  UserAlertRecord,
  UserAlertsApiService,
} from '@app/core/services/user-alerts-api.service';
import { finalize, firstValueFrom } from 'rxjs';

export const FEED_ALERT_SUBSCRIPTION_SOURCE_TYPE = 'feed-alert-subscription';

export interface CreateUserAlertResult {
  status: 'created' | 'duplicate' | 'pending' | 'unauthenticated' | 'invalid' | 'error';
  entry: UserAlertRecord | null;
  errorKey: string | null;
}

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecte dans les pages compte qui pilotent les alertes utilisateur.
 * Raison d'etre : Centralise l'etat signal-first et les actions inbox (refresh, generate, read, delete).
 * @param dependencies Dependances injectees automatiquement par Angular.
 * @returns UserAlertsService geree par le framework.
 */
export class UserAlertsService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly api = inject(UserAlertsApiService);

  private readonly entriesSig = signal<UserAlertRecord[]>([]);
  private readonly loadingSig = signal(false);
  private readonly generatingSig = signal(false);
  private readonly markAllReadPendingSig = signal(false);
  private readonly clearReadPendingSig = signal(false);
  private readonly errorSig = signal<string | null>(null);
  private readonly pendingByIdSig = signal<Record<string, boolean>>({});
  private readonly pendingBySourceSig = signal<Record<string, boolean>>({});

  readonly entries = this.entriesSig.asReadonly();
  readonly loading = this.loadingSig.asReadonly();
  readonly generating = this.generatingSig.asReadonly();
  readonly markAllReadPending = this.markAllReadPendingSig.asReadonly();
  readonly clearReadPending = this.clearReadPendingSig.asReadonly();
  readonly error = this.errorSig.asReadonly();
  readonly pendingById = this.pendingByIdSig.asReadonly();
  readonly pendingBySource = this.pendingBySourceSig.asReadonly();

  readonly hasEntries = computed(() => this.entriesSig().length > 0);
  readonly unreadCount = computed(() => this.entriesSig().filter((entry) => !entry.isRead).length);

  constructor() {
    effect(() => {
      if (!this.auth.isAuthenticated()) {
        this.resetState();
      }
    });
  }

  /**
   * Contexte : Appelee a l'ouverture de la page pour synchroniser l'inbox utilisateur.
   * Raison d'etre : Charge les alertes de l'utilisateur authentifie.
   * @returns void
   */
  refresh(): void {
    if (!this.auth.isAuthenticated()) {
      this.resetState();
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
          this.errorSig.set('pages.alerts.errors.load');
        },
      });
  }

  /**
   * Contexte : Utilisee par les CTA du feed pour creer une alerte utilisateur persistante.
   * Raison d'etre : Persiste l'abonnement ou l'evenement utilisateur et fusionne la reponse dans l'etat local.
   * @param payload Donnees de l'alerte a creer.
   * @returns Resultat de creation permettant a l'appelant de distinguer succes, doublon ou erreur.
   */
  async create(payload: CreateUserAlertPayload): Promise<CreateUserAlertResult> {
    if (!this.auth.isAuthenticated()) {
      return { status: 'unauthenticated', entry: null, errorKey: null };
    }

    const sanitizedPayload = this.sanitizeCreatePayload(payload);
    if (!sanitizedPayload) {
      return { status: 'invalid', entry: null, errorKey: null };
    }

    const existing = this.findBySource(sanitizedPayload.sourceType ?? null, sanitizedPayload.sourceId ?? null);
    if (existing) {
      return { status: 'duplicate', entry: existing, errorKey: null };
    }

    const sourceKey = this.composeSourceKey(sanitizedPayload.sourceType ?? null, sanitizedPayload.sourceId ?? null);
    if (sourceKey && this.pendingBySourceSig()[sourceKey]) {
      return { status: 'pending', entry: null, errorKey: null };
    }

    this.errorSig.set(null);
    this.setPendingSource(sourceKey, true);

    try {
      const created = await firstValueFrom(this.api.createMine(sanitizedPayload));
      this.entriesSig.update((current) => this.sortEntries(this.upsert(current, created)));
      return { status: 'created', entry: created, errorKey: null };
    } catch {
      const errorKey = 'pages.alerts.errors.create';
      this.errorSig.set(errorKey);
      return { status: 'error', entry: null, errorKey };
    } finally {
      this.setPendingSource(sourceKey, false);
    }
  }

  /**
   * Contexte : Declenchee sur action explicite de l'utilisateur depuis l'inbox.
   * Raison d'etre : Genere des alertes a partir des recherches sauvegardees actives.
   * @returns void
   */
  generateFromSavedSearches(): void {
    if (!this.auth.isAuthenticated() || this.generatingSig()) {
      return;
    }

    this.generatingSig.set(true);
    this.errorSig.set(null);

    this.api
      .generateFromSavedSearches()
      .pipe(
        finalize(() => this.generatingSig.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          const generated = Array.isArray(response.generated) ? response.generated : [];
          if (generated.length === 0) {
            return;
          }

          this.entriesSig.update((current) =>
            this.sortEntries(this.upsertMany(current, generated))
          );
        },
        error: () => {
          this.errorSig.set('pages.alerts.errors.generate');
        },
      });
  }

  /**
   * Contexte : Declenchee pour basculer une alerte en lue/non lue.
   * Raison d'etre : Met a jour l'etat de lecture cote serveur puis localement.
   * @param id Identifiant de l'alerte.
   * @param isRead Etat cible de lecture.
   * @returns void
   */
  markRead(id: string, isRead: boolean): void {
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
      .markRead(normalizedId, isRead)
      .pipe(
        finalize(() => this.setPending(normalizedId, false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (updated) => {
          this.entriesSig.update((current) => this.sortEntries(this.upsert(current, updated)));
        },
        error: () => {
          this.errorSig.set('pages.alerts.errors.update');
        },
      });
  }

  /**
   * Contexte : Declenchee par l'action de suppression dans la liste d'alertes.
   * Raison d'etre : Supprime l'alerte distante et retire l'entree locale.
   * @param id Identifiant de l'alerte.
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
          this.errorSig.set('pages.alerts.errors.delete');
        },
      });
  }

  /**
   * Contexte : Declenchee via l'action globale "tout marquer comme lu".
   * Raison d'etre : Met toutes les alertes non lues en etat lu en un seul appel API.
   * @returns void
   */
  markAllRead(): void {
    if (!this.auth.isAuthenticated() || this.markAllReadPendingSig()) {
      return;
    }

    if (this.unreadCount() === 0) {
      return;
    }

    this.markAllReadPendingSig.set(true);
    this.errorSig.set(null);

    this.api
      .markAllRead()
      .pipe(
        finalize(() => this.markAllReadPendingSig.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ readAt }) => {
          const normalizedReadAt =
            typeof readAt === 'string' && readAt.trim().length > 0
              ? readAt.trim()
              : new Date().toISOString();

          this.entriesSig.update((current) =>
            this.sortEntries(
              current.map((entry) =>
                entry.isRead
                  ? entry
                  : {
                      ...entry,
                      isRead: true,
                      readAt: entry.readAt ?? normalizedReadAt,
                    }
              )
            )
          );
        },
        error: () => {
          this.errorSig.set('pages.alerts.errors.update');
        },
      });
  }

  /**
   * Contexte : Declenchee via l'action globale "supprimer les alertes lues".
   * Raison d'etre : Nettoie rapidement l'historique deja traite.
   * @returns void
   */
  clearRead(): void {
    if (!this.auth.isAuthenticated() || this.clearReadPendingSig()) {
      return;
    }

    if (!this.entriesSig().some((entry) => entry.isRead)) {
      return;
    }

    this.clearReadPendingSig.set(true);
    this.errorSig.set(null);

    this.api
      .deleteRead()
      .pipe(
        finalize(() => this.clearReadPendingSig.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.entriesSig.update((current) => current.filter((entry) => !entry.isRead));
        },
        error: () => {
          this.errorSig.set('pages.alerts.errors.delete');
        },
      });
  }

  hasSource(sourceType: string | null | undefined, sourceId: string | null | undefined): boolean {
    return Boolean(this.findBySource(sourceType, sourceId));
  }

  isSourcePending(sourceType: string | null | undefined, sourceId: string | null | undefined): boolean {
    const sourceKey = this.composeSourceKey(sourceType, sourceId);
    return sourceKey ? Boolean(this.pendingBySourceSig()[sourceKey]) : false;
  }

  findBySource(
    sourceType: string | null | undefined,
    sourceId: string | null | undefined
  ): UserAlertRecord | null {
    const sourceKey = this.composeSourceKey(sourceType, sourceId);
    if (!sourceKey) {
      return null;
    }

    return (
      this.entriesSig().find((entry) =>
        this.composeSourceKey(entry.sourceType, entry.sourceId) === sourceKey
      ) ?? null
    );
  }

  private normalizeId(id: string): string | null {
    if (typeof id !== 'string') {
      return null;
    }
    const normalized = id.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private upsert(entries: UserAlertRecord[], next: UserAlertRecord): UserAlertRecord[] {
    const index = entries.findIndex((entry) => entry.id === next.id);
    if (index < 0) {
      return [...entries, next];
    }

    const merged = [...entries];
    merged[index] = next;
    return merged;
  }

  private upsertMany(entries: UserAlertRecord[], incoming: UserAlertRecord[]): UserAlertRecord[] {
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    for (const entry of incoming) {
      byId.set(entry.id, entry);
    }
    return Array.from(byId.values());
  }

  private sortEntries(entries: UserAlertRecord[]): UserAlertRecord[] {
    return [...entries].sort((left, right) => {
      const unreadOrder = Number(left.isRead) - Number(right.isRead);
      if (unreadOrder !== 0) {
        return unreadOrder;
      }
      return this.toTimestamp(right.createdAt) - this.toTimestamp(left.createdAt);
    });
  }

  private toTimestamp(candidate: string | null): number {
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

  private setPendingSource(sourceKey: string | null, pending: boolean): void {
    if (!sourceKey) {
      return;
    }

    this.pendingBySourceSig.update((current) => {
      const next = { ...current };
      if (pending) {
        next[sourceKey] = true;
      } else {
        delete next[sourceKey];
      }
      return next;
    });
  }

  private composeSourceKey(
    sourceType: string | null | undefined,
    sourceId: string | null | undefined
  ): string | null {
    const normalizedType = this.normalizeSourceType(sourceType);
    const normalizedId = this.normalizeSourceId(sourceId);
    if (!normalizedType || !normalizedId) {
      return null;
    }
    return `${normalizedType}::${normalizedId}`;
  }

  private normalizeSourceType(sourceType: string | null | undefined): string | null {
    if (typeof sourceType !== 'string') {
      return null;
    }
    const normalized = sourceType.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeSourceId(sourceId: string | null | undefined): string | null {
    if (typeof sourceId !== 'string') {
      return null;
    }
    const normalized = sourceId.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private sanitizeCreatePayload(payload: CreateUserAlertPayload): CreateUserAlertPayload | null {
    const title = typeof payload.title === 'string' ? payload.title.trim() : '';
    const message = typeof payload.message === 'string' ? payload.message.trim() : '';
    if (!title || !message) {
      return null;
    }

    return {
      ...payload,
      title: title.slice(0, 140),
      message: message.slice(0, 1000),
      sourceType: this.normalizeSourceType(payload.sourceType ?? null),
      sourceId: this.normalizeSourceId(payload.sourceId ?? null),
    };
  }

  private resetState(): void {
    this.entriesSig.set([]);
    this.pendingByIdSig.set({});
    this.pendingBySourceSig.set({});
    this.loadingSig.set(false);
    this.generatingSig.set(false);
    this.markAllReadPendingSig.set(false);
    this.clearReadPendingSig.set(false);
    this.errorSig.set(null);
  }
}
