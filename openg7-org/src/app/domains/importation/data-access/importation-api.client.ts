import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { FEATURE_FLAGS } from '@app/core/config/environment.tokens';
import { createSilentHttpContext } from '@app/core/http/error.interceptor.tokens';
import { HttpClientService } from '@app/core/http/http-client.service';
import { Observable, of } from 'rxjs';

import {
  ImportationFilters,
  ImportationOriginScope,
  ImportationPeriodGranularity,
  ImportationRiskFlag,
} from '../models/importation.models';

import {
  createMockImportationWatchlist,
  getMockImportationAnnotations,
  getMockImportationCommodityCollections,
  getMockImportationFlows,
  getMockImportationKnowledge,
  getMockImportationRiskFlags,
  getMockImportationSuppliers,
  getMockImportationWatchlists,
} from './importation-api.mocks';

export interface ImportationFlowPointDto {
  readonly period: string;
  readonly label: string;
  readonly totalValue: number;
  readonly yoyDelta: number | null;
  readonly isProjected?: boolean;
}

export interface ImportationFlowCorridorDto {
  readonly target: string;
  readonly value: number;
  readonly delta: number | null;
}

export interface ImportationFlowDto {
  readonly originCode: string;
  readonly originName: string;
  readonly value: number;
  readonly yoyDelta: number | null;
  readonly share: number | null;
  readonly coordinate?: readonly [number, number];
  readonly corridors?: readonly ImportationFlowCorridorDto[];
}

export interface ImportationFlowsResponseDto {
  readonly timeline: readonly ImportationFlowPointDto[];
  readonly flows: readonly ImportationFlowDto[];
  readonly coverage: number | null;
  readonly lastUpdated: string | null;
  readonly dataProvider: string | null;
}

export interface ImportationCommodityDto {
  readonly id: string;
  readonly hsCode: string;
  readonly label: string;
  readonly value: number;
  readonly yoyDelta: number | null;
  readonly riskScore: number | null;
  readonly sparkline: readonly number[];
  readonly flags: readonly string[];
}

export interface ImportationCommodityCollectionsDto {
  readonly top: readonly ImportationCommodityDto[];
  readonly emerging: readonly ImportationCommodityDto[];
  readonly risk: readonly ImportationCommodityDto[];
}

export type ImportationRiskFlagDto = ImportationRiskFlag;

export interface ImportationSuppliersResponseDto {
  readonly suppliers: readonly ImportationSupplierDto[];
}

export interface ImportationSupplierDto {
  readonly id: string;
  readonly name: string;
  readonly dependencyScore: number | null;
  readonly diversificationScore: number | null;
  readonly reliability: number | null;
  readonly country: string;
  readonly lastReviewed: string | null;
  readonly recommendation: string | null;
}

export interface ImportationAnnotationsResponseDto {
  readonly annotations: readonly ImportationAnnotationDto[];
}

export interface ImportationAnnotationDto {
  readonly id: string;
  readonly author: string;
  readonly authorAvatarUrl?: string;
  readonly excerpt: string;
  readonly createdAt: string;
  readonly relatedCommodityId?: string;
  readonly relatedOriginCode?: string;
}

export interface ImportationWatchlistsResponseDto {
  readonly watchlists: readonly ImportationWatchlistDto[];
}

export interface ImportationWatchlistDto {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly updatedAt: string;
  readonly filters: ImportationFilters;
}

export interface ImportationKnowledgeResponseDto {
  readonly articles: readonly ImportationKnowledgeArticleDto[];
  readonly cta: ImportationKnowledgeCtaDto | null;
}

export interface ImportationKnowledgeArticleDto {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly publishedAt: string;
  readonly link: string;
  readonly tag: string;
  readonly thumbnailUrl?: string;
}

export interface ImportationKnowledgeCtaDto {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly actionLabel: string;
  readonly actionLink: string;
}

export interface ImportationWatchlistPayload {
  readonly name: string;
  readonly filters: ImportationFilters;
}

export interface ImportationWatchlistUpdatePayload {
  readonly name?: string;
  readonly filters?: ImportationFilters;
}

export interface ImportationReportSchedulePayload {
  readonly period: ImportationPeriodGranularity;
  readonly recipients: readonly string[];
  readonly format: 'csv' | 'json' | 'look';
  readonly frequency: 'weekly' | 'monthly' | 'quarterly';
  readonly notes?: string;
}

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « domains/importation/data-access ».
 * Raison d’être : Centralise les appels HTTP nécessaires à la page Importation.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns ImportationApiClient géré par le framework.
 */
export class ImportationApiClient {
  private readonly featureFlags = inject(FEATURE_FLAGS, { optional: true });
  private readonly useMocks = this.featureFlags?.['importationMocks'] ?? false;

  constructor(private readonly http: HttpClientService) {}

  getFlows(filters: ImportationFilters): Observable<ImportationFlowsResponseDto> {
    if (this.useMocks) {
      return of(getMockImportationFlows());
    }
    const params = this.buildParams(filters);
    return this.http.get<ImportationFlowsResponseDto>('/api/import-flows', { params });
  }

  getCommodities(filters: ImportationFilters): Observable<ImportationCommodityCollectionsDto> {
    if (this.useMocks) {
      return of(getMockImportationCommodityCollections());
    }
    const params = this.buildParams(filters);
    return this.http.get<ImportationCommodityCollectionsDto>('/api/import-commodities', { params });
  }

  getRiskFlags(filters: ImportationFilters): Observable<readonly ImportationRiskFlagDto[]> {
    if (this.useMocks) {
      return of(getMockImportationRiskFlags());
    }
    const params = this.buildParams(filters);
    return this.http.get<readonly ImportationRiskFlagDto[]>('/api/import-risk-flags', {
      params,
      context: createSilentHttpContext(),
    });
  }

  getSuppliers(filters: ImportationFilters): Observable<ImportationSuppliersResponseDto> {
    if (this.useMocks) {
      return of(getMockImportationSuppliers());
    }
    const params = this.buildParams(filters);
    return this.http.get<ImportationSuppliersResponseDto>('/api/import-suppliers', {
      params,
      context: createSilentHttpContext(),
    });
  }

  getAnnotations(): Observable<ImportationAnnotationsResponseDto> {
    if (this.useMocks) {
      return of(getMockImportationAnnotations());
    }
    return this.http.get<ImportationAnnotationsResponseDto>('/api/import-annotations', {
      context: createSilentHttpContext(),
    });
  }

  getWatchlists(): Observable<ImportationWatchlistsResponseDto> {
    if (this.useMocks) {
      return of(getMockImportationWatchlists());
    }
    return this.http.get<ImportationWatchlistsResponseDto>('/api/import-watchlists', {
      context: createSilentHttpContext(),
    });
  }

  createWatchlist(payload: ImportationWatchlistPayload): Observable<ImportationWatchlistDto> {
    if (this.useMocks) {
      return of(createMockImportationWatchlist(payload));
    }
    return this.http.post<ImportationWatchlistDto>('/api/import-watchlists', payload);
  }

  updateWatchlist(id: string, payload: ImportationWatchlistUpdatePayload): Observable<ImportationWatchlistDto> {
    return this.http.put<ImportationWatchlistDto>(`/api/import-watchlists/${encodeURIComponent(id)}`, payload);
  }

  getKnowledgeBase(lang: string): Observable<ImportationKnowledgeResponseDto> {
    if (this.useMocks) {
      return of(getMockImportationKnowledge(lang));
    }
    const params = new HttpParams().set('lang', lang).set('tag', 'importation-insights');
    return this.http.get<ImportationKnowledgeResponseDto>('/api/import-knowledge', {
      params,
      context: createSilentHttpContext(),
    });
  }

  scheduleReport(payload: ImportationReportSchedulePayload): Observable<void> {
    if (this.useMocks) {
      return of(void 0);
    }
    return this.http.post<void>('/api/import-reports/schedule', payload);
  }

  private buildParams(filters: ImportationFilters): HttpParams {
    let params = new HttpParams()
      .set('period', filters.periodGranularity)
      .set('compareMode', String(filters.compareMode));

    if (filters.periodValue) {
      params = params.set('periodValue', filters.periodValue);
    }

    params = params.set('originScope', filters.originScope);

    if (filters.originScope === 'custom' && filters.originCodes.length) {
      filters.originCodes.forEach((code) => {
        params = params.append('originCodes', code);
      });
    }

    if (filters.hsSections.length) {
      filters.hsSections.forEach((section) => {
        params = params.append('hsSections', section);
      });
    }

    if (filters.compareWith) {
      params = params.set('compareWith', filters.compareWith);
    }

    return params;
  }
}

export function toOriginScope(value: string | null | undefined): ImportationOriginScope {
  if (value === 'g7' || value === 'usmca' || value === 'european_union' || value === 'indo_pacific' || value === 'custom') {
    return value;
  }
  return 'global';
}

export function toGranularity(value: string | null | undefined): ImportationPeriodGranularity {
  if (value === 'quarter' || value === 'year') {
    return value;
  }
  return 'month';
}
