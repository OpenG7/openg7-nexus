import { HttpHeaders } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import type {
  StrapiList,
  StrapiSingle,
  Province,
  Sector,
  Company,
  Exchange,
  BillingPlan,
  StatisticsResponse,
  HydrocarbonSignal,
} from '@openg7/contracts';
import { endpoints } from '@openg7/contracts';
import { firstValueFrom } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { RuntimeConfigService } from '../config/runtime-config.service';
import { HttpClientService, JsonRequestOptions } from '../http/http-client.service';

type QueryParamValue = string | number | boolean | ReadonlyArray<string | number | boolean> | null | undefined;
type QueryParamsInput = Record<string, QueryParamValue>;

interface StatisticsRequestParams extends QueryParamsInput {
  scope?: 'interprovincial' | 'international' | 'all';
  intrant?: 'all' | 'energy' | 'agriculture' | 'manufacturing' | 'services';
  period?: string | null;
  province?: string | null;
}

interface HydrocarbonSignalsRequestParams extends QueryParamsInput {
  publicationType?: string | null;
  storagePressureLevel?: string | null;
  originProvinceId?: string | null;
  targetProvinceId?: string | null;
  limit?: number | string | null;
}

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Instancié via Angular DI pour appeler les APIs référencées dans « core/api ».
 * Raison d’être : Encapsule la construction des requêtes HTTP autour de « Strapi ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns StrapiClient gérée par le framework.
 */
export class StrapiClient {
  private readonly http = inject(HttpClientService);
  private readonly runtimeConfig = inject(RuntimeConfigService);
  readonly loading = signal(false);

  private buildHeaders(): HttpHeaders | null {
    const token = this.runtimeConfig.apiToken();
    if (!token) {
      return null;
    }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /**
   * Contexte : Invoked by domain services whenever they need to reach Strapi through the shared HTTP client.
   * Raison d’être : Provides a central entry point that automatically applies runtime headers and loading signals for Strapi calls.
   * @param path Absolute or relative Strapi path resolved by the backend contracts.
   * @param options Optional HTTP options merged with the runtime defaults.
   * @returns Promise resolving with the parsed JSON payload returned by Strapi.
   */
  async get<T>(path: string, options?: JsonRequestOptions): Promise<T> {
    this.loading.set(true);
    const headers = this.buildHeaders();
    const merged: JsonRequestOptions = { ...(options ?? {}) };
    if (headers) {
      merged.headers = this.mergeHeaders(headers, options?.headers);
    }
    return firstValueFrom(
      this.http.get<T>(path, merged).pipe(finalize(() => this.loading.set(false)))
    );
  }

  /**
   * Contexte : Used by catalog screens to populate the sector filter options on initial load.
   * Raison d’être : Wraps the Strapi `/sectors` endpoint so feature modules do not repeat endpoint literals.
   * @returns Promise resolving with the list of sectors defined in Strapi.
   */
  sectors()   { return this.get<StrapiList<Sector>>(endpoints.sectors); }

  /**
   * Contexte : Called when building province selectors and geographic filters within opportunity flows.
   * Raison d’être : Centralises retrieval of provinces from Strapi to keep HTTP wiring in one client.
   * @returns Promise resolving with the Strapi province collection payload.
   */
  provinces() { return this.get<StrapiList<Province>>(endpoints.provinces); }

  /**
   * Contexte : Triggered by admin and analytics views that need the catalogue of companies from Strapi.
   * Raison d’être : Offers a typed access point to the `/companies` endpoint for reuse across services.
   * @returns Promise resolving with the paginated company list response.
   */
  companies() { return this.get<StrapiList<Company>>(endpoints.companies); }

  /**
   * Contexte : Consumed by opportunity dashboards that chart commodity exchanges between provinces.
   * Raison d’être : Exposes the `/exchanges` endpoint through the shared client to reuse HTTP handling.
   * @returns Promise resolving with the exchange dataset returned by Strapi.
   */
  exchanges() { return this.get<StrapiList<Exchange>>(endpoints.exchanges); }

  /**
   * Contexte : Requested by CMS-driven homepage components during SSR and browser hydration.
   * Raison d’être : Fetches the localized homepage content once, keeping the fetch logic in this client.
   * @returns Promise resolving with the single homepage entity (or null when unpublished).
   */
  homepage<T = Record<string, unknown> | null>() {
    return this.single<T>(endpoints.homepage);
  }

  /**
   * Contexte : Triggered by the statistics feature when users filter the insight dashboards.
   * Raison d’être : Normalises filter parameters and performs the `/statistics` call through the shared HTTP layer.
   * @param params Optional filters matching the statistics API contract.
   * @returns Promise resolving with the typed statistics payload from Strapi.
   */
  statistics(params?: StatisticsRequestParams) {
    return this.get<StatisticsResponse>(endpoints.statistics, {
      params: this.normalizeParams(params),
    });
  }

  /**
   * Contexte : Used by the billing settings page to display purchasable plans fetched from Strapi.
   * Raison d’être : Provides a single method encapsulating the `/billing-plans` endpoint access.
   * @returns Promise resolving with the available billing plans.
   */
  billingPlans() {
    return this.get<StrapiList<BillingPlan>>(endpoints.billingPlans);
  }

  /**
   * Contexte : Used by specialized hydrocarbon experiences to fetch barrel surplus and slowdown signals.
   * Raison d’être : Exposes the dedicated `hydrocarbon-signals` endpoint through the shared typed client.
   * @param params Optional query filters for publication type, pressure level, provinces, and result cap.
   * @returns Promise resolving with the hydrocarbon signal collection payload.
   */
  hydrocarbonSignals(params?: HydrocarbonSignalsRequestParams) {
    return this.get<StrapiList<HydrocarbonSignal>>(endpoints.hydrocarbonSignals, {
      params: this.normalizeParams(params),
    });
  }

  private single<T>(path: string, options?: JsonRequestOptions) {
    return this.get<StrapiSingle<T>>(path, options);
  }

  private mergeHeaders(
    authHeaders: HttpHeaders,
    existing?: JsonRequestOptions['headers']
  ): JsonRequestOptions['headers'] {
    if (!existing) {
      return authHeaders;
    }

    if (existing instanceof HttpHeaders) {
      const authorization = authHeaders.get('Authorization');
      return authorization ? existing.set('Authorization', authorization) : existing;
    }

    const authorization = authHeaders.get('Authorization');
    if (!authorization) {
      return existing;
    }

    return { ...existing, Authorization: authorization };
  }

  private normalizeParams(params?: QueryParamsInput): JsonRequestOptions['params'] {
    if (!params) {
      return undefined;
    }

    const entries = Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value === undefined || value === null) {
        return acc;
      }
      const stringValue = String(value).trim();
      if (stringValue.length === 0) {
        return acc;
      }
      acc[key] = stringValue;
      return acc;
    }, {});

    return Object.keys(entries).length > 0 ? entries : undefined;
  }
}
