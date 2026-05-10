import { Injectable, inject } from '@angular/core';
import { STRAPI_ROUTES, strapiSavedSearchById } from '@app/core/api/strapi.routes';
import { HttpClientService } from '@app/core/http/http-client.service';
import { Observable } from 'rxjs';

export type SavedSearchScope = 'all' | 'companies' | 'partners' | 'feed' | 'map' | 'opportunities';

export type SavedSearchFrequency = 'realtime' | 'daily' | 'weekly';

export interface SavedSearchRecord {
  id: string;
  name: string;
  scope: SavedSearchScope;
  filters: Record<string, unknown>;
  notifyEnabled: boolean;
  frequency: SavedSearchFrequency;
  lastRunAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateSavedSearchPayload {
  name: string;
  scope?: SavedSearchScope;
  filters?: Record<string, unknown>;
  notifyEnabled?: boolean;
  frequency?: SavedSearchFrequency;
}

export type UpdateSavedSearchPayload = Partial<CreateSavedSearchPayload> & {
  lastRunAt?: string | null;
};

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecte dans les ecrans compte/filtres pour sauvegarder les recherches utilisateur.
 * Raison d'etre : Encapsule les appels API `/users/me/saved-searches` et leur typage.
 * @param dependencies Dependances injectees automatiquement par Angular.
 * @returns SavedSearchesApiService geree par le framework.
 */
export class SavedSearchesApiService {
  private readonly http = inject(HttpClientService);

  /**
   * Contexte : Utilise au chargement d'un espace personnalise pour recuperer les recherches enregistrees.
   * Raison d'etre : Retourne la liste distante associee a l'utilisateur courant.
   * @returns Observable de la collection de recherches sauvegardees.
   */
  listMine(): Observable<SavedSearchRecord[]> {
    return this.http.get<SavedSearchRecord[]>(STRAPI_ROUTES.users.meSavedSearches);
  }

  /**
   * Contexte : Declenche depuis les actions "sauvegarder cette recherche".
   * Raison d'etre : Cree une nouvelle recherche sauvegardee cote serveur.
   * @param payload Donnees de la recherche a stocker.
   * @returns Observable avec l'entree creee.
   */
  createMine(payload: CreateSavedSearchPayload): Observable<SavedSearchRecord> {
    return this.http.post<SavedSearchRecord>(STRAPI_ROUTES.users.meSavedSearches, payload);
  }

  /**
   * Contexte : Utilise pour modifier un nom, des filtres ou une frequence de notification.
   * Raison d'etre : Met a jour une recherche sauvegardee existante.
   * @param id Identifiant serveur de la recherche.
   * @param payload Champs a modifier.
   * @returns Observable avec la recherche mise a jour.
   */
  updateMine(id: string, payload: UpdateSavedSearchPayload): Observable<SavedSearchRecord> {
    return this.http.patch<SavedSearchRecord>(strapiSavedSearchById(id), payload);
  }

  /**
   * Contexte : Declenche quand l'utilisateur supprime une recherche sauvegardee.
   * Raison d'etre : Supprime la ressource distante correspondante.
   * @param id Identifiant serveur de la recherche a supprimer.
   * @returns Observable d'acquittement de suppression.
   */
  deleteMine(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.http.delete<{ id: string; deleted: boolean }>(strapiSavedSearchById(id));
  }
}
