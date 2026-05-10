import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { HttpClientService } from '@app/core/http/http-client.service';
import { SearchContext } from '@app/core/models/search';
import { Observable } from 'rxjs';

export interface SearchEngineInfo {
  readonly enabled: boolean;
  readonly driver: string | null;
  readonly indices: {
    readonly companies: string;
    readonly exchanges: string;
  };
}

export interface SearchProvinceSummary {
  readonly id: string | number | null;
  readonly name: string | null;
  readonly slug: string | null;
  readonly code: string | null;
}

export interface SearchSectorSummary {
  readonly id: string | number | null;
  readonly name: string | null;
  readonly slug: string | null;
}

export interface SearchCompanyHit {
  readonly id: string | number;
  readonly slug: string | null;
  readonly name: string | null;
  readonly description: string | null;
  readonly website: string | null;
  readonly country: string | null;
  readonly status: string | null;
  readonly verificationStatus: string | null;
  readonly trustScore: number | null;
  readonly capacities: Record<string, unknown> | null;
  readonly locale: string | null;
  readonly publishedAt: string | null;
  readonly updatedAt: string | null;
  readonly province: SearchProvinceSummary | null;
  readonly sector: SearchSectorSummary | null;
  readonly searchText: string;
  readonly highlights?: Record<string, string>;
}

export interface SearchExchangeHit {
  readonly id: string | number;
  readonly unit: string | null;
  readonly value: number | null;
  readonly sourceProvince: SearchProvinceSummary | null;
  readonly targetProvince: SearchProvinceSummary | null;
  readonly searchText: string;
  readonly highlights?: Record<string, string>;
}

export interface SearchApiResponse {
  readonly query: string;
  readonly took: number;
  readonly total: number;
  readonly companies: SearchCompanyHit[];
  readonly exchanges: SearchExchangeHit[];
  readonly engine: SearchEngineInfo;
}

export interface SearchRequestOptions {
  readonly limit?: number;
  readonly type?: 'companies' | 'exchanges' | 'all';
}

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « domains/search/feature ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Search Api ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns SearchApiService gérée par le framework.
 */
export class SearchApiService {
  private readonly http = inject(HttpClientService);

  search(
    query: string,
    context: SearchContext,
    options: SearchRequestOptions = {},
  ): Observable<SearchApiResponse> {
    const params: Record<string, string> = {};

    params['q'] = query;

    if (context.locale) {
      params['locale'] = context.locale;
    }

    if (context.role) {
      params['role'] = context.role;
    }

    if (context.sectorId) {
      params['sectorId'] = String(context.sectorId);
    }

    if (context.isPremium !== undefined) {
      params['isPremium'] = context.isPremium ? '1' : '0';
    }

    if (options.limit !== undefined) {
      params['limit'] = String(options.limit);
    }

    if (options.type && options.type !== 'all') {
      params['type'] = options.type;
    }

    const httpParams = new HttpParams({ fromObject: params });

    return this.http.get<SearchApiResponse>('/api/search', { params: httpParams });
  }
}
