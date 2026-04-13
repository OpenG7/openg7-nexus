import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, Signal, TransferState, inject, makeStateKey, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { API_URL } from '../config/environment.tokens';
import { createSilentHttpContext } from '../http/error.interceptor.tokens';
import {
  CompanySummary,
  Mode,
  OpportunityMatch,
  OpportunityMatchQuery,
  isProvinceCode,
  normalizeSectorType,
} from '../models/opportunity';
import { injectNotificationStore } from '../observability/notification.store';

interface StrapiRelation<T> {
  readonly data: StrapiEntity<T> | null;
}

interface StrapiEntity<T> {
  readonly id: number;
  readonly attributes: T;
}

interface OpportunityMatchAttributes {
  readonly commodity: string;
  readonly mode?: Mode | null;
  readonly confidence?: number | null;
  readonly distanceKm?: number | null;
  readonly co2Estimate?: number | null;
  readonly buyer?: StrapiRelation<CompanyAttributes>;
  readonly seller?: StrapiRelation<CompanyAttributes>;
}

interface CompanyAttributes {
  readonly name?: string | null;
  readonly province?: string | null;
  readonly sector?: string | null;
  readonly capability?: Mode | null;
}

interface OpportunityMatchesResponse {
  readonly data: readonly StrapiEntity<OpportunityMatchAttributes>[];
}

interface OpportunityMatchResponse {
  readonly data: StrapiEntity<OpportunityMatchAttributes> | null;
}

const STATE_KEY_PREFIX = 'OPPORTUNITY_MATCHES';
const ENDPOINT_PATH = '/api/opportunity-matches';

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « core/services ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Opportunity ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns OpportunityService gérée par le framework.
 */
export class OpportunityService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL, { optional: true }) ?? '';
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly notifications = injectNotificationStore();
  private readonly translate = inject(TranslateService);

  private readonly itemsSignal = signal<readonly OpportunityMatch[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  private lastQuery?: OpportunityMatchQuery;
  private activeRequestId: number | null = null;
  private requestSequence = 0;

  /**
   * Contexte : Consumed by components rendering the opportunity match list.
   * Raison d’être : Exposes a reactive view of the fetched matches.
   * @returns Signal containing the current match collection.
   */
  items(): Signal<readonly OpportunityMatch[]> {
    return this.itemsSignal.asReadonly();
  }

  /**
   * Contexte : Used by UI to display loading states while fetching matches.
   * Raison d’être : Reflects whether a request is currently in flight.
   * @returns Signal emitting the loading boolean.
   */
  loading(): Signal<boolean> {
    return this.loadingSignal.asReadonly();
  }

  /**
   * Contexte : Read by the UI to show error banners when the initial fetch fails.
   * Raison d’être : Stores a translation key describing the last fatal error.
   * @returns Signal containing the error key or null.
   */
  error(): Signal<string | null> {
    return this.errorSignal.asReadonly();
  }

  /**
   * Contexte : Triggered when the opportunity filters change or during initial load.
   * Raison d’être : Fetches matches from Strapi, updates reactive state and handles notifications.
   * @param query Optional match filters derived from the UI state.
   * @returns void
   */
  loadMatches(query?: OpportunityMatchQuery): void {
    this.lastQuery = query;
    const stateKey = this.buildStateKey(query);
    const cached = this.transferState.get(stateKey, null);
    if (cached) {
      this.itemsSignal.set(this.mapMatches(cached));
      if (this.browser) {
        this.transferState.remove(stateKey);
      }
      return;
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const requestId = this.nextRequestId();
    this.activeRequestId = requestId;

    const url = this.composeUrl();
    const params = this.buildHttpParams(query);

    this.http.get<OpportunityMatchesResponse>(url, { params }).subscribe({
      next: (response) => {
        if (!this.isActiveRequest(requestId)) {
          return;
        }
        this.activeRequestId = null;
        const matches = this.mapMatches(response);
        this.itemsSignal.set(matches);
        if (!this.browser) {
          this.transferState.set(stateKey, response);
        }
        this.loadingSignal.set(false);
        this.notifications.info(
          this.translate.instant('opportunities.notifications.loaded', { count: matches.length }),
          {
            source: 'matches',
            metadata: { count: matches.length },
          }
        );
      },
      error: (error) => {
        if (!this.isActiveRequest(requestId)) {
          return;
        }
        this.activeRequestId = null;
        this.loadingSignal.set(false);
        const hasExistingMatches = (this.itemsSignal() ?? []).length > 0;
        if (!hasExistingMatches) {
          this.errorSignal.set('opportunities.error');
        }
        this.notifications.error(this.translate.instant('opportunities.error'), {
          source: 'matches',
          context: error,
          metadata: { query },
          deliver: { email: true },
        });
      },
    });
  }

  /**
   * Contexte : Used by refresh controls to re-issue the last match query.
   * Raison d’être : Reuses the stored query parameters to fetch a fresh result set.
   * @returns void
   */
  reload(): void {
    this.loadMatches(this.lastQuery);
  }

  /**
   * Contexte : Called by demo mode to seed the service with fixture data without hitting Strapi.
   * Raison d’être : Allows the UI to operate offline while keeping notifications consistent.
   * @param matches Demo matches to inject into state.
   * @returns void
   */
  hydrateWithDemo(matches: readonly OpportunityMatch[]): void {
    this.itemsSignal.set(matches.map((match) => this.cloneMatch(match)));
    this.errorSignal.set(null);
    this.loadingSignal.set(false);
    this.notifications.info(
      this.translate.instant('opportunities.notifications.demo', { count: matches.length }),
      {
        source: 'matches',
        metadata: { count: matches.length, mode: 'demo' },
      }
    );
  }

  /**
   * Contexte : Invoked by detail pages needing a specific match by identifier.
   * Raison d’être : Returns the existing match when cached or fetches it individually.
   * @param id Identifier of the match to load.
   * @returns Observable emitting the match or null when unavailable.
   */
  loadMatchById(id: number): Observable<OpportunityMatch | null> {
    if (!Number.isFinite(id)) {
      return of(null);
    }

    const existing = this.itemsSignal().find((match) => match.id === id);
    if (existing) {
      return of(existing);
    }

    const url = `${this.composeUrl()}/${id}`;
    const params = this.buildHttpParams();

    return this.http.get<OpportunityMatchResponse>(url, { params }).pipe(
      map((response) => (response?.data ? this.mapMatch(response.data) : null)),
      tap((match) => {
        if (!match) {
          return;
        }
        this.cacheMatch(match);
      }),
      catchError((error) => {
        this.notifications.error(this.translate.instant('opportunities.error'), {
          source: 'matches',
          context: error,
          metadata: { id },
          deliver: { email: true },
        });
        return of(null);
      })
    );
  }

  /**
   * Contexte : Used by lightweight business flows that need match candidates without mutating the
   * global opportunities view state.
   * Raison d'etre : Queries the opportunity-matches endpoint silently and falls back to the
   * currently cached collection if the network request fails.
   * @param query Optional filters applied to the candidate lookup.
   * @returns Promise resolving to candidate matches ordered as returned by the API or cache.
   */
  async searchMatches(query?: OpportunityMatchQuery): Promise<readonly OpportunityMatch[]> {
    const url = this.composeUrl();
    const params = this.buildHttpParams(query);

    try {
      const response = await firstValueFrom(
        this.http.get<OpportunityMatchesResponse>(url, {
          params,
          context: createSilentHttpContext(),
        })
      );
      return this.filterMatches(this.mapMatches(response), query);
    } catch {
      return this.cachedMatches(query);
    }
  }

  /**
   * Contexte : Used by secondary read flows that need one match to enrich another screen without
   * surfacing global feed notifications.
   * Raison d'etre : Resolves a single match quietly, reuses cache when available, and stores the
   * result back into the local cache on success.
   * @param id Identifier of the match to resolve.
   * @returns Promise resolving to the match or null when it cannot be fetched.
   */
  async findMatchById(id: number): Promise<OpportunityMatch | null> {
    if (!Number.isFinite(id)) {
      return null;
    }

    const existing = this.itemsSignal().find((match) => match.id === id);
    if (existing) {
      return existing;
    }

    const url = `${this.composeUrl()}/${id}`;
    const params = this.buildHttpParams();

    try {
      const response = await firstValueFrom(
        this.http.get<OpportunityMatchResponse>(url, {
          params,
          context: createSilentHttpContext(),
        })
      );
      const match = response?.data ? this.mapMatch(response.data) : null;
      if (!match) {
        return null;
      }
      this.cacheMatch(match);
      return match;
    } catch {
      return null;
    }
  }

  private cachedMatches(query?: OpportunityMatchQuery): readonly OpportunityMatch[] {
    return this.filterMatches(this.itemsSignal(), query);
  }

  private cacheMatch(match: OpportunityMatch): void {
    const current = this.itemsSignal();
    if (current.some((item) => item.id === match.id)) {
      return;
    }
    this.itemsSignal.set([...current, match]);
  }

  private buildHttpParams(query?: OpportunityMatchQuery): HttpParams {
    let params = new HttpParams().set('populate', 'buyer,seller');
    if (!query) {
      return params;
    }
    if (query.q) {
      params = params.set('q', query.q);
    }
    if (query.province) {
      params = params.set('province', query.province);
    }
    if (query.sector) {
      params = params.set('sector', query.sector);
    }
    if (query.mode) {
      params = params.set('mode', query.mode);
    }
    if (query.page) {
      params = params.set('pagination[page]', String(query.page));
    }
    if (query.pageSize) {
      params = params.set('pagination[pageSize]', String(query.pageSize));
    }
    return params;
  }

  private composeUrl(): string {
    const base = this.apiUrl.replace(/\/$/, '');
    return `${base}${ENDPOINT_PATH}`;
  }

  private mapMatches(response: OpportunityMatchesResponse): readonly OpportunityMatch[] {
    if (!response?.data?.length) {
      return [];
    }
    const matches: OpportunityMatch[] = [];
    for (const entity of response.data) {
      const match = this.mapMatch(entity);
      if (match) {
        matches.push(match);
      }
    }
    return matches;
  }

  private mapMatch(entity: StrapiEntity<OpportunityMatchAttributes>): OpportunityMatch | null {
    const attrs = entity.attributes;
    const buyer = this.mapCompany(attrs.buyer);
    const seller = this.mapCompany(attrs.seller);
    if (!attrs.commodity || !buyer || !seller) {
      return null;
    }
    const confidence = this.normalizeConfidence(attrs.confidence);
    const mode = this.normalizeMode(attrs.mode);
    return {
      id: entity.id,
      commodity: attrs.commodity,
      mode,
      buyer,
      seller,
      confidence,
      distanceKm: attrs.distanceKm ?? null,
      co2Estimate: attrs.co2Estimate ?? null,
    };
  }

  private mapCompany(relation?: StrapiRelation<CompanyAttributes>): CompanySummary | null {
    if (!relation?.data) {
      return null;
    }
    const { id, attributes } = relation.data;
    if (!attributes.name || !attributes.province || !attributes.sector) {
      return null;
    }
    const province = this.normalizeProvince(attributes.province);
    const sector = this.normalizeSector(attributes.sector);
    if (!province || !sector) {
      return null;
    }
    return {
      id,
      name: attributes.name,
      province,
      sector,
      capability: this.normalizeMode(attributes.capability),
    };
  }

  private normalizeConfidence(raw?: number | null): number {
    if (typeof raw !== 'number' || Number.isNaN(raw)) {
      return 0;
    }
    if (raw < 0) {
      return 0;
    }
    if (raw > 1) {
      return 1;
    }
    return raw;
  }

  private normalizeMode(mode?: Mode | null): Mode {
    if (mode === 'import' || mode === 'export') {
      return mode;
    }
    return 'all';
  }

  private normalizeProvince(code?: string | null): CompanySummary['province'] | null {
    if (!code) {
      return null;
    }
    const upper = code.toUpperCase();
    return isProvinceCode(upper) ? upper : null;
  }

  private normalizeSector(value?: string | null): CompanySummary['sector'] | null {
    return normalizeSectorType(value);
  }

  private cloneMatch(match: OpportunityMatch): OpportunityMatch {
    return {
      id: match.id,
      commodity: match.commodity,
      mode: match.mode,
      confidence: match.confidence,
      distanceKm: match.distanceKm ?? null,
      co2Estimate: match.co2Estimate ?? null,
      buyer: { ...match.buyer },
      seller: { ...match.seller },
    };
  }

  private buildStateKey(query?: OpportunityMatchQuery) {
    const serialized = this.serializeQuery(query);
    return makeStateKey<OpportunityMatchesResponse>(`${STATE_KEY_PREFIX}:${serialized}`);
  }

  private nextRequestId(): number {
    this.requestSequence += 1;
    return this.requestSequence;
  }

  private isActiveRequest(requestId: number): boolean {
    return this.activeRequestId === requestId;
  }

  private serializeQuery(query?: OpportunityMatchQuery): string {
    if (!query) {
      return 'default';
    }
    const segments: string[] = [];
    if (query.q) {
      segments.push(`q=${encodeURIComponent(query.q)}`);
    }
    if (query.province) {
      segments.push(`province=${query.province}`);
    }
    if (query.sector) {
      segments.push(`sector=${query.sector}`);
    }
    if (query.mode) {
      segments.push(`mode=${query.mode}`);
    }
    if (query.page) {
      segments.push(`page=${query.page}`);
    }
    if (query.pageSize) {
      segments.push(`pageSize=${query.pageSize}`);
    }
    return segments.join('|') || 'default';
  }

  private filterMatches(
    matches: readonly OpportunityMatch[],
    query?: OpportunityMatchQuery
  ): readonly OpportunityMatch[] {
    if (!query) {
      return [...matches];
    }

    const search = query.q?.trim().toLowerCase() ?? '';
    const filtered = matches.filter((match) => {
      if (query.mode && match.mode !== 'all' && match.mode !== query.mode) {
        return false;
      }

      if (
        query.province &&
        match.buyer.province !== query.province &&
        match.seller.province !== query.province
      ) {
        return false;
      }

      if (
        query.sector &&
        match.buyer.sector !== query.sector &&
        match.seller.sector !== query.sector
      ) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = `${match.commodity} ${match.buyer.name} ${match.seller.name}`.toLowerCase();
      return haystack.includes(search);
    });

    if (!query.pageSize || query.pageSize < 1) {
      return filtered;
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const start = (page - 1) * query.pageSize;
    return filtered.slice(start, start + query.pageSize);
  }
}
