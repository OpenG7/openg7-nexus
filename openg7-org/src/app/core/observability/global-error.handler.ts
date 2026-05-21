import { ErrorHandler, Injectable, Injector } from '@angular/core';

import { AnalyticsService } from './analytics.service';

@Injectable()
/**
 * Contexte : Enregistré dans app.config.ts pour remplacer le ErrorHandler par défaut.
 * Raison d’être : Capture les exceptions non gérées et les loggue dans l'Analytics pour monitoring.
 */
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private readonly injector: Injector) {}

  handleError(error: unknown): void {
    const analytics = this.injector.get(AnalyticsService);

    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : null;

    // On loggue l'erreur dans la console pour le dev local
    console.error('[OpenG7 Error]', error);

    // On émet l'événement analytics avec haute priorité pour garantir l'envoi
    analytics.emit(
      'app_error',
      {
        message,
        stack: stack?.slice(0, 500), // On limite la taille du stack
        url: typeof window !== 'undefined' ? window.location.href : 'ssr',
        timestamp: new Date().toISOString(),
      },
      { priority: true },
    );

    // Optionnel : On pourrait ici déclencher une notification utilisateur
    // via injectNotificationStore().error('Une erreur inattendue est survenue.');
  }
}
