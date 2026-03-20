import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClientService } from '@app/core/http/http-client.service';
import { SUPPRESS_ERROR_TOAST } from '@app/core/http/error.interceptor.tokens';
import { FeedItem } from '@app/domains/feed/feature/models/feed.models';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import { CatalogActions } from './catalog.actions';
import { Company, Province, Sector } from './catalog.selectors';

interface CatalogMockPayload {
  sectors: Sector[];
  provinces: Province[];
  companies: Company[];
  feedItems: FeedItem[];
}

@Injectable({ providedIn: 'root' })
export class CatalogMockService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(HttpClientService);
  private readonly store = inject(Store);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly silentCatalogContext = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const loadedFromApi = await this.tryLoadCatalogFromApi();
    if (loadedFromApi) {
      return;
    }
    try {
      const payload = await firstValueFrom(
        this.http.get<CatalogMockPayload>('assets/mocks/catalog.mock.json')
      );
      this.store.dispatch(CatalogActions.catalogMockLoaded(payload));
    } catch (error) {
      console.warn('[catalog] Failed to load mock catalog data', error);
    }
  }

  private async tryLoadCatalogFromApi(): Promise<boolean> {
    try {
      const [sectorsPayload, provincesPayload, companiesPayload] = await Promise.all([
        firstValueFrom(this.api.get<unknown>('/api/sectors', { context: this.silentCatalogContext })),
        firstValueFrom(this.api.get<unknown>('/api/provinces', { context: this.silentCatalogContext })),
        firstValueFrom(this.api.get<unknown>('/api/companies', { context: this.silentCatalogContext })),
      ]);

      const sectors = this.mapNamedCollection<Sector>(sectorsPayload);
      const provinces = this.mapNamedCollection<Province>(provincesPayload);
      const companies = this.mapNamedCollection<Company>(companiesPayload);

      if (sectors.length === 0 && provinces.length === 0 && companies.length === 0) {
        return false;
      }

      this.store.dispatch(
        CatalogActions.catalogHydrated({
          sectors,
          provinces,
          companies,
          source: 'real',
        })
      );
      return true;
    } catch (error) {
      if (!this.isMissingCatalogEndpoint(error)) {
        console.warn('[catalog] Failed to load remote catalog data, falling back to mocks.', error);
      }
      return false;
    }
  }

  private isMissingCatalogEndpoint(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return false;
    }

    if (error.status !== 404) {
      return false;
    }

    return /\/api\/(sectors|provinces|companies)(?:$|[/?#])/i.test(error.url ?? '');
  }

  private mapNamedCollection<T extends { id: string; name: string }>(payload: unknown): T[] {
    const entries = this.extractEntries(payload);
    const items: T[] = [];

    for (const entry of entries) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        continue;
      }
      const record = entry as {
        id?: unknown;
        name?: unknown;
        attributes?: {
          name?: unknown;
        } | null;
      };
      const id = record.id;
      const nameCandidate = record.name ?? record.attributes?.name;
      const name = typeof nameCandidate === 'string' ? nameCandidate.trim() : '';
      if ((typeof id !== 'number' && typeof id !== 'string') || !name) {
        continue;
      }

      items.push({
        id: String(id),
        name,
      } as T);
    }

    return items;
  }

  private extractEntries(payload: unknown): unknown[] {
    if (Array.isArray(payload)) {
      return payload;
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return [];
    }
    const data = (payload as { data?: unknown }).data;
    return Array.isArray(data) ? data : [];
  }
}
