import { inject, Injectable } from '@angular/core';
import { AnalyticsService } from '@app/core/observability/analytics.service';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import {
  ConnectionsService,
  mapStrapiConnectionResponse,
} from '@app/core/services/connections.service';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { TranslateService } from '@ngx-translate/core';
import { catchError, exhaustMap, map, of, tap } from 'rxjs';

import { ConnectionsActions } from './connections.actions';

@Injectable()
/**
 * Contexte : Enregistrée dans NgRx afin de réagir aux actions gérées au sein de « store/connections ».
 * Raison d’être : Orchestre les flux asynchrones et la synchronisation du domaine « Connections ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns ConnectionsEffects gérée par le framework.
 */
export class ConnectionsEffects {
  private readonly actions$ = inject(Actions);
  private readonly service = inject(ConnectionsService);
  private readonly notifications = injectNotificationStore();
  private readonly analytics = inject(AnalyticsService);
  private readonly translate = inject(TranslateService);

  createConnection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ConnectionsActions.createConnection),
      exhaustMap(({ draft }) =>
        this.service.createConnection(draft).pipe(
          map((response) => mapStrapiConnectionResponse(response)),
          map((connection) => ConnectionsActions.createConnectionSuccess({ connection })),
          catchError((error) =>
            of(
              ConnectionsActions.createConnectionFailure({
                error: this.extractMessage(error),
              }),
            ),
          ),
        ),
      ),
    ),
  );

  connectionSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ConnectionsActions.createConnectionSuccess),
        tap(({ connection }) => {
          this.notifications.success(this.translate.instant('introBillboard.connectionSuccess'), {
            source: 'matches',
            metadata: { connectionId: connection.id },
          });
          this.analytics.emit(
            'connection_created_success',
            { id: connection.id },
            { priority: true },
          );
        }),
      ),
    { dispatch: false },
  );

  connectionFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ConnectionsActions.createConnectionFailure),
        tap(({ error }) => {
          const message = this.translateMessage(error);
          this.notifications.error(message, {
            source: 'matches',
            metadata: { reason: error },
            deliver: { email: true },
          });
          this.analytics.emit('connection_create_failed', { message: error }, { priority: true });
        }),
      ),
    { dispatch: false },
  );

  attachmentsUpdated$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ConnectionsActions.attachmentsUpdated),
        tap(({ attachments }) => {
          this.analytics.emit(
            'attachment_toggled',
            { attachments: [...attachments] },
            { priority: true },
          );
        }),
      ),
    { dispatch: false },
  );

  meetingSlotsUpdated$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ConnectionsActions.meetingSlotsUpdated),
        tap(({ slots }) => {
          this.analytics.emit(
            'meeting_slots_proposed',
            { count: slots.length },
            { priority: true },
          );
        }),
      ),
    { dispatch: false },
  );

  private extractMessage(error: unknown): string {
    if (!error) {
      return 'introBillboard.connectionError';
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    if (error instanceof Error && typeof error.message === 'string') {
      return error.message;
    }
    if (typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string') {
        return message;
      }
    }
    return 'introBillboard.connectionError';
  }

  private translateMessage(message: string): string {
    if (!message) {
      return this.translate.instant('introBillboard.connectionError');
    }
    const translated = this.translate.instant(message);
    return translated === message ? message : translated;
  }
}
