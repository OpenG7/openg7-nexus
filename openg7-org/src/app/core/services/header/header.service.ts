import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, signal, inject, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';

import { createSilentHttpContext } from '../../http/error.interceptor.tokens';

export interface Og7HeaderPayload {
  announcement: {
    enabled: boolean;
    text?: string;
  };
  search: {
    placeholder: string;
  };
  locales: string[];
}

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « core/services/header ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Header ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns HeaderService gérée par le framework.
 */
export class HeaderService {
  private http = inject(HttpClient);
  private transferState = inject(TransferState);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  /**
   * Contexte : Used by the layout shell during SSR and browser boot to fetch header configuration.
   * Raison d’être : Retrieves the localized header payload, caching it in TransferState for SSR efficiency.
   * @param locale Locale identifier requested by the frontend.
   * @returns Signal resolving to the header payload or null while loading.
   */
  getHeader(locale: string): Signal<Og7HeaderPayload | null> {
    const key = makeStateKey<Og7HeaderPayload>('HEADER_STATE_' + locale);
    const cached = this.transferState.get(key, null);
    const headerSig = signal<Og7HeaderPayload | null>(cached);

    if (cached) {
      if (this.isBrowser) {
        // window is only available on the browser
        this.transferState.remove(key);
      }
      return headerSig;
    }

    this.http
      .get<Og7HeaderPayload>(`/api/header?populate=deep&locale=${locale}`, {
        context: createSilentHttpContext(),
      })
      .subscribe({
        next: (payload) => {
          if (!this.isBrowser) {
            this.transferState.set(key, payload);
          }
          headerSig.set(payload);
        },
        error: () => {
          const fallback = this.fallbackPayload();
          if (!this.isBrowser) {
            this.transferState.set(key, fallback);
          }
          headerSig.set(fallback);
        },
      });

    return headerSig;
  }
  private fallbackPayload(): Og7HeaderPayload {
    return {
      announcement: { enabled: false },
      search: { placeholder: 'Search' },
      locales: ['fr', 'en'],
    };
  }
}

