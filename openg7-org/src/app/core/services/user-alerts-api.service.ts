import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  STRAPI_ROUTES,
  strapiAlertById,
  strapiAlertDeleteRead,
  strapiAlertReadById,
  strapiAlertReadAll,
  strapiGenerateAlerts,
} from '@app/core/api/strapi.routes';
import { HttpClientService } from '@app/core/http/http-client.service';
import { SUPPRESS_ERROR_TOAST } from '@app/core/http/error.interceptor.tokens';
import { Observable } from 'rxjs';

export type UserAlertSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface UserAlertRecord {
  id: string;
  title: string;
  message: string;
  severity: UserAlertSeverity;
  sourceType: string | null;
  sourceId: string | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateUserAlertPayload {
  title: string;
  message: string;
  severity?: UserAlertSeverity;
  sourceType?: string | null;
  sourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface GenerateUserAlertsResponse {
  count: number;
  skipped: number;
  generated: UserAlertRecord[];
}

export interface MarkAllAlertsReadResponse {
  updated: number;
  readAt: string | null;
}

export interface DeleteReadAlertsResponse {
  deleted: number;
}

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecte dans les ecrans de compte et services de notification utilisateur.
 * Raison d'etre : Encapsule les appels API `/users/me/alerts` et leur typage.
 * @param dependencies Dependances injectees automatiquement par Angular.
 * @returns UserAlertsApiService geree par le framework.
 */
export class UserAlertsApiService {
  private readonly http = inject(HttpClientService);

  /**
   * Contexte : Utilise au chargement de l'inbox utilisateur.
   * Raison d'etre : Retourne les alertes in-app de l'utilisateur courant.
   * @returns Observable avec la collection des alertes.
   */
  listMine(): Observable<UserAlertRecord[]> {
    return this.http.get<UserAlertRecord[]>(STRAPI_ROUTES.users.meAlerts, {
      context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
    });
  }

  /**
   * Contexte : Utilise pour creer une alerte manuelle cote application.
   * Raison d'etre : Cree une alerte attachee a l'utilisateur courant.
   * @param payload Donnees de l'alerte a persister.
   * @returns Observable avec l'alerte creee.
   */
  createMine(payload: CreateUserAlertPayload): Observable<UserAlertRecord> {
    return this.http.post<UserAlertRecord>(STRAPI_ROUTES.users.meAlerts, payload);
  }

  /**
   * Contexte : Declenche depuis la page d'alertes pour alimenter l'inbox depuis les recherches sauvegardees.
   * Raison d'etre : Demande au backend de generer des alertes intelligentes dedupees.
   * @returns Observable avec les alertes creees et le nombre ignore.
   */
  generateFromSavedSearches(): Observable<GenerateUserAlertsResponse> {
    return this.http.post<GenerateUserAlertsResponse>(strapiGenerateAlerts(), {});
  }

  /**
   * Contexte : Utilise pour basculer l'etat lu/non lu d'une alerte.
   * Raison d'etre : Met a jour l'etat de lecture de l'alerte cote serveur.
   * @param id Identifiant de l'alerte.
   * @param isRead Nouvel etat de lecture.
   * @returns Observable avec l'alerte mise a jour.
   */
  markRead(id: string, isRead = true): Observable<UserAlertRecord> {
    return this.http.patch<UserAlertRecord>(strapiAlertReadById(id), { isRead });
  }

  /**
   * Contexte : Utilise pour marquer en lot toutes les alertes non lues.
   * Raison d'etre : Evite les requetes individuelles lorsque l'utilisateur vide son compteur.
   * @returns Observable avec le nombre d'alertes mises a jour.
   */
  markAllRead(): Observable<MarkAllAlertsReadResponse> {
    return this.http.patch<MarkAllAlertsReadResponse>(strapiAlertReadAll(), {});
  }

  /**
   * Contexte : Utilise depuis l'inbox pour supprimer toutes les alertes deja lues.
   * Raison d'etre : Permet un nettoyage rapide de l'historique.
   * @returns Observable avec le nombre d'alertes supprimees.
   */
  deleteRead(): Observable<DeleteReadAlertsResponse> {
    return this.http.delete<DeleteReadAlertsResponse>(strapiAlertDeleteRead());
  }

  /**
   * Contexte : Declenche quand l'utilisateur supprime une alerte de son inbox.
   * Raison d'etre : Supprime l'alerte distante correspondante.
   * @param id Identifiant serveur de l'alerte.
   * @returns Observable d'acquittement de suppression.
   */
  deleteMine(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.http.delete<{ id: string; deleted: boolean }>(strapiAlertById(id));
  }
}
