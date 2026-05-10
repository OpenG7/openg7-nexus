import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, Inject, Optional } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL, API_WITH_CREDENTIALS } from '../config/environment.tokens';
import { RuntimeConfigService } from '../config/runtime-config.service';

/**
 * Simple wrapper around Angular's {@link HttpClient} applying
 * common options (base URL and `withCredentials` by default).
 *
 * Other services should use this client instead of `HttpClient`
 * directly to ensure consistent behaviour across the app.
 */
@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « core/http ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Http Client ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns HttpClientService gérée par le framework.
 */
export class HttpClientService {
  constructor(
    private http: HttpClient,
    private runtimeConfig: RuntimeConfigService,
    @Optional() @Inject(API_URL) private apiUrl?: string,
    @Optional() @Inject(API_WITH_CREDENTIALS) private apiWithCredentials?: boolean,
  ) {}

  private buildUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) {
      return url;
    }
    const base = this.resolveBaseUrl();
    if (!base) {
      return url;
    }
    if (url.startsWith('/')) {
      return `${base}${url}`;
    }
    return `${base}/${url}`;
  }

  private mergeOptions<T extends RequestOptions>(options?: T): T {
    const merged = { ...(options ?? {}) } as T;
    if (typeof merged.withCredentials === 'undefined') {
      merged.withCredentials = this.resolveWithCredentials();
    }
    return merged;
  }

  private resolveBaseUrl(): string {
    const base = this.apiUrl ?? this.runtimeConfig.apiUrl() ?? '';
    return base.replace(/\/$/, '');
  }

  private resolveWithCredentials(): boolean {
    if (typeof this.apiWithCredentials === 'boolean') {
      return this.apiWithCredentials;
    }
    return this.runtimeConfig.apiWithCredentials();
  }

  /**
   * Contexte : Used by feature services as the default entry point for GET requests against the API.
   * Raison d’être : Applies base URL resolution and shared options (withCredentials, headers) consistently.
   * @param url Relative or absolute URL to query.
   * @param options Optional request options determining response type and headers.
   * @returns Observable producing the HTTP response as JSON or Blob depending on overload.
   */
  get(url: string, options: BlobRequestOptions): Observable<Blob>;
  get<T>(url: string, options?: JsonRequestOptions): Observable<T>;
  get<T>(url: string, options?: RequestOptions): Observable<T | Blob> {
    const merged = this.mergeOptions(options);
    if (isBlobRequestOptions(merged)) {
      return this.http.get(this.buildUrl(url), merged);
    }
    return this.http.get<T>(this.buildUrl(url), merged);
  }

  /**
   * Contexte : Invoked by services creating or submitting data to the backend.
   * Raison d’être : Ensures POST requests inherit the same base URL and credential handling as other verbs.
   * @param url Relative or absolute URL to target.
   * @param body Payload to send in the request body.
   * @param options Optional request configuration such as headers or context.
   * @returns Observable emitting the deserialised response body.
   */
  post<T>(url: string, body: unknown, options?: JsonRequestOptions): Observable<T> {
    return this.http.post<T>(this.buildUrl(url), body, this.mergeOptions(options));
  }

  /**
   * Contexte : Used by resource services when updating remote entities.
   * Raison d’être : Provides a consistent PUT wrapper that automatically reuses HTTP defaults.
   * @param url Relative or absolute URL to target.
   * @param body Payload to send in the request body.
   * @param options Optional request configuration such as headers or context.
   * @returns Observable emitting the deserialised response body.
   */
  put<T>(url: string, body: unknown, options?: JsonRequestOptions): Observable<T> {
    return this.http.put<T>(this.buildUrl(url), body, this.mergeOptions(options));
  }

  /**
   * Contexte : Used by feature services for partial updates on existing entities.
   * Raison dâ€™Ãªtre : Keeps PATCH requests aligned with shared URL and credential handling.
   * @param url Relative or absolute URL to target.
   * @param body Partial payload to send in the request body.
   * @param options Optional request configuration such as headers or context.
   * @returns Observable emitting the deserialised response body.
   */
  patch<T>(url: string, body: unknown, options?: JsonRequestOptions): Observable<T> {
    return this.http.patch<T>(this.buildUrl(url), body, this.mergeOptions(options));
  }

  /**
   * Contexte : Leveraged by services removing entities or revoking tokens from the API.
   * Raison d’être : Keeps DELETE calls aligned with the shared configuration strategy.
   * @param url Relative or absolute URL to target.
   * @param options Optional request configuration such as headers or context.
   * @returns Observable emitting the deserialised response body.
   */
  delete<T>(url: string, options?: JsonRequestOptions): Observable<T> {
    return this.http.delete<T>(this.buildUrl(url), this.mergeOptions(options));
  }
}

interface RequestOptionsBase {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?:
    | HttpParams
    | {
        [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean>;
      };
  context?: HttpContext;
  reportProgress?: boolean;
  withCredentials?: boolean;
}

export interface JsonRequestOptions extends RequestOptionsBase {
  responseType?: 'json';
}

export interface BlobRequestOptions extends RequestOptionsBase {
  responseType: 'blob';
}

export type RequestOptions = JsonRequestOptions | BlobRequestOptions;

function isBlobRequestOptions(options?: RequestOptions): options is BlobRequestOptions {
  return options?.responseType === 'blob';
}
