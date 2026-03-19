import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { STRAPI_ROUTES, strapiFavoriteById } from '@app/core/api/strapi.routes';
import { HttpClientService } from '@app/core/http/http-client.service';
import { SUPPRESS_ERROR_TOAST } from '@app/core/http/error.interceptor.tokens';
import { Observable } from 'rxjs';

export interface UserFavoriteRecord {
  id: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateUserFavoritePayload {
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
}

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecte dans les facades de compte pour manipuler les favoris de l'utilisateur courant.
 * Raison d'etre : Encapsule les appels API `/users/me/favorites` et les types associes.
 * @param dependencies Dependances injectees automatiquement par Angular.
 * @returns UserFavoritesApiService geree par le framework.
 */
export class UserFavoritesApiService {
  private readonly http = inject(HttpClientService);

  /**
   * Contexte : Utilise au chargement des ecrans compte pour restaurer les favoris synchronises.
   * Raison d'etre : Retourne la collection courante de favoris de l'utilisateur authentifie.
   * @returns Observable avec la liste des favoris serveur.
   */
  listMine(): Observable<UserFavoriteRecord[]> {
    return this.http.get<UserFavoriteRecord[]>(STRAPI_ROUTES.users.meFavorites, {
      context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
    });
  }

  /**
   * Contexte : Declenche lorsqu'un utilisateur ajoute un favori depuis l'interface.
   * Raison d'etre : Cree (ou met a jour) l'entree distante associee a l'utilisateur courant.
   * @param payload Donnees du favori a persister.
   * @returns Observable avec l'entree retournee par l'API.
   */
  createMine(payload: CreateUserFavoritePayload): Observable<UserFavoriteRecord> {
    return this.http.post<UserFavoriteRecord>(STRAPI_ROUTES.users.meFavorites, payload);
  }

  /**
   * Contexte : Utilise quand un favori est supprime depuis les ecrans authentifies.
   * Raison d'etre : Supprime la ressource distante afin de garder la synchronisation inter-appareils.
   * @param id Identifiant serveur du favori.
   * @returns Observable d'acquittement de suppression.
   */
  deleteMine(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.http.delete<{ id: string; deleted: boolean }>(strapiFavoriteById(id));
  }
}
