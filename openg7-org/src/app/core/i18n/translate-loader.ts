import { isPlatformServer } from '@angular/common';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Observable, catchError, from, map, of, tap } from 'rxjs';

import { I18N_PREFIX } from '../config/environment.tokens';

const ABSOLUTE_HTTP_URL = /^https?:\/\//i;

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté par Angular pour alimenter la configuration i18n/DI du dossier « core/i18n ».
 * Raison d’être : Prépare les ressources liées à « App Translate » avant leur consommation par les vues.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns AppTranslateLoader gérée par le framework.
 */
export class AppTranslateLoader implements TranslateLoader {
  private http: HttpClient;
  private readonly httpBase: string;
  private readonly absoluteHttpBase: string | null;
  private readonly relativeSegments: string[];

  constructor(
    httpBackend: HttpBackend,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(I18N_PREFIX) prefix: string
  ) {
    this.http = new HttpClient(httpBackend);
    const normalized = typeof prefix === 'string' ? prefix.trim() : '';

    if (!normalized) {
      this.httpBase = '/assets/i18n/';
      this.absoluteHttpBase = null;
      this.relativeSegments = ['assets', 'i18n'];
      return;
    }

    if (ABSOLUTE_HTTP_URL.test(normalized)) {
      this.absoluteHttpBase = normalized.endsWith('/') ? normalized : `${normalized}/`;
      this.httpBase = this.absoluteHttpBase;
      this.relativeSegments = ['assets', 'i18n'];
      return;
    }

    const segments = this.toSegments(normalized);
    this.relativeSegments = segments.length > 0 ? segments : ['assets', 'i18n'];
    this.absoluteHttpBase = null;
    this.httpBase = `/${this.relativeSegments.join('/')}/`;
  }

  /**
   * Contexte : Called by ngx-translate whenever a locale needs to be loaded.
   * Raison d’être : Supports SSR transfer state, filesystem fallbacks and HTTP fetching for translation files.
   * @param lang Locale code requested by the translate service.
   * @returns Observable emitting the translation dictionary for the given locale.
   */
  getTranslation(lang: string): Observable<TranslationObject> {
    const KEY = makeStateKey<TranslationObject>('i18n-' + lang);
    const cached = this.transferState.get<TranslationObject | null>(KEY, null);
    if (cached) {
      return of(cached);
    }

    if (isPlatformServer(this.platformId) || typeof window === 'undefined') {
      return from(
        (async () => {
          try {
            const dynamicImport = new Function(
              'specifier',
              'return import(specifier);'
            ) as <TModule>(specifier: string) => Promise<TModule>;

            const [fsPromises, pathModule, urlModule] = await Promise.all([
              dynamicImport<typeof import('node:fs/promises')>('node:fs/promises'),
              dynamicImport<typeof import('node:path')>('node:path'),
              dynamicImport<typeof import('node:url')>('node:url')
            ]);

            const { readFile } = fsPromises;
            const { dirname, join } = pathModule;
            const { fileURLToPath } = urlModule;
            const __dirname = dirname(fileURLToPath(import.meta.url));
            const readData = async (lng: string) => {
              const paths = [
                join(__dirname, '../../../../browser', ...this.relativeSegments, `${lng}.json`),
                join(__dirname, '../../../../', ...this.relativeSegments, `${lng}.json`)
              ];
              for (const p of paths) {
                try {
                  const content = await readFile(p, 'utf-8');
                  const data = this.parseTranslationText(content);
                  this.transferState.set(KEY, data);
                  return data;
                } catch {
                  // continue to next path
                }
              }
              return null;
            };

            const data = (await readData(lang)) ?? (lang !== 'en' ? await readData('en') : null);
            return data ?? {};
          } catch {
            return {};
          }
        })()
      );
    }

    return this.http.get(this.composeHttpUrl(lang), { responseType: 'text' }).pipe(
      map((content) => this.parseTranslationText(content)),
      tap((data) => this.transferState.set(KEY, data)),
      catchError((err) => {
        console.error('Translation load error', err?.message, err?.status);
        return of({});
      })
    );
  }

  private composeHttpUrl(lang: string): string {
    if (this.absoluteHttpBase) {
      return new URL(`${lang}.json`, this.absoluteHttpBase).toString();
    }
    return `${this.httpBase}${lang}.json`;
  }

  private toSegments(prefix: string): string[] {
    return prefix
      .split('/')
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);
  }

  private parseTranslationText(content: string): TranslationObject {
    const sanitized = content.replace(/^\uFEFF/, '').trim();
    if (!sanitized) {
      return {};
    }

    const parsed = JSON.parse(sanitized);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return parsed as TranslationObject;
  }
}
