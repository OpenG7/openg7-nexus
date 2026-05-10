import { Injectable, computed, signal } from '@angular/core';
import { Observable, combineLatest, isObservable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { SearchContext, SearchResult, SearchSection } from '../models/search';

export interface SearchProviderResult {
  readonly sections: SearchSection[];
}

export interface SearchProvider {
  readonly id: string;
  resolve(
    query: string,
    context: SearchContext,
  ): Observable<SearchProviderResult> | SearchProviderResult;
  getDefault?(context: SearchContext): Observable<SearchProviderResult> | SearchProviderResult;
}

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « core/services ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Search Registry ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns SearchRegistryService gérée par le framework.
 */
export class SearchRegistryService {
  private readonly providersSig = signal<SearchProvider[]>([]);

  readonly providers = this.providersSig.asReadonly();
  readonly hasProviders = computed(() => this.providersSig().length > 0);

  /**
   * Contexte : Called by feature modules to contribute search providers at runtime.
   * Raison d’être : Keeps a shared registry of providers, replacing entries when the same id registers twice.
   * @param provider Provider definition implementing the search hooks.
   * @returns void
   */
  register(provider: SearchProvider): void {
    const providers = this.providersSig();
    if (providers.some((p) => p.id === provider.id)) {
      this.providersSig.set(providers.map((p) => (p.id === provider.id ? provider : p)));
      return;
    }
    this.providersSig.set([...providers, provider]);
  }

  /**
   * Contexte : Used by lazy modules to clean up providers when unloaded.
   * Raison d’être : Removes the provider from the registry to avoid stale results.
   * @param id Identifier of the provider to remove.
   * @returns void
   */
  unregister(id: string): void {
    this.providersSig.set(this.providersSig().filter((p) => p.id !== id));
  }

  /**
   * Contexte : Invoked by the omnibox when the user types a query.
   * Raison d’être : Aggregates all provider results into a consolidated search response.
   * @param query Search string entered by the user.
   * @param context Additional context describing the caller environment.
   * @returns Observable emitting the merged search result.
   */
  resolve(query: string, context: SearchContext): Observable<SearchResult> {
    const providers = this.providersSig();
    if (!providers.length) {
      return of({ query, sections: [] });
    }
    const result$ = combineLatest(
      providers.map((provider) =>
        this.toObservable(provider.resolve(query, context)).pipe(
          map((value) => value.sections ?? []),
        ),
      ),
    ).pipe(
      map((sectionsMatrix) => ({
        query,
        sections: sectionsMatrix.flat(),
      })),
    );
    return result$;
  }

  /**
   * Contexte : Used when opening the omnibox without a query to display suggested shortcuts.
   * Raison d’être : Aggregates provider defaults into a single search result payload.
   * @param context Context describing the caller environment.
   * @returns Observable emitting the combined default sections.
   */
  defaults(context: SearchContext): Observable<SearchResult> {
    const providers = this.providersSig();
    if (!providers.length) {
      return of({ query: '', sections: [] });
    }
    return combineLatest(
      providers.map((provider) =>
        this.toObservable(provider.getDefault?.(context) ?? { sections: [] }).pipe(
          map((value) => value.sections ?? []),
        ),
      ),
    ).pipe(
      map((sectionsMatrix) => ({
        query: '',
        sections: sectionsMatrix.flat(),
      })),
    );
  }

  private toObservable(
    result: Observable<SearchProviderResult> | SearchProviderResult,
  ): Observable<SearchProviderResult> {
    if (isObservable(result)) {
      return result;
    }
    return of(result ?? { sections: [] });
  }
}
