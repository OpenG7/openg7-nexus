import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { FEATURE_FLAGS } from '@app/core/config/environment.tokens';
import { createSilentHttpContext } from '@app/core/http/error.interceptor.tokens';
import { HttpClientService } from '@app/core/http/http-client.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export type CorridorsRealtimeStatusLevel = 'ok' | 'warning' | 'critical' | 'info';

export interface CorridorsRealtimeStatus {
  readonly level: CorridorsRealtimeStatusLevel;
  readonly label?: string;
  readonly labelKey?: string;
}

export interface CorridorsRealtimeItem {
  readonly id: string;
  readonly label?: string;
  readonly labelKey?: string;
  readonly route?: string;
  readonly routeKey?: string;
  readonly meta?: string;
  readonly metaKey?: string;
}

export interface CorridorsRealtimeCta {
  readonly label?: string;
  readonly labelKey?: string;
}

export interface CorridorsRealtimeSnapshot {
  readonly title?: string;
  readonly titleKey?: string;
  readonly subtitle?: string;
  readonly subtitleKey?: string;
  readonly items: CorridorsRealtimeItem[];
  readonly status: CorridorsRealtimeStatus;
  readonly cta?: CorridorsRealtimeCta;
  readonly timestamp?: string;
}

@Injectable({ providedIn: 'root' })
export class HomeCorridorsRealtimeService {
  private readonly http = inject(HttpClientService);
  private readonly assetHttp = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly featureFlags = inject(FEATURE_FLAGS, { optional: true });
  private readonly useMocks = this.featureFlags?.['homeCorridorsRealtimeMocks'] ?? true;

  loadSnapshot(): Observable<CorridorsRealtimeSnapshot> {
    if (this.useMocks) {
      if (!isPlatformBrowser(this.platformId)) {
        return this.snapshotFallback();
      }
      return this.assetHttp
        .get<CorridorsRealtimeSnapshot>('assets/mocks/corridors-realtime.mock.json')
        .pipe(
          map((payload) => this.normalizeSnapshot(payload)),
          catchError(() => this.snapshotFallback())
        );
    }

    return this.http
      .get<CorridorsRealtimeSnapshot>('/api/corridors/realtime', {
        context: createSilentHttpContext(),
      })
      .pipe(
        map((payload) => this.normalizeSnapshot(payload)),
        catchError(() => this.snapshotFallback())
      );
  }

  private normalizeSnapshot(payload: CorridorsRealtimeSnapshot | null | undefined): CorridorsRealtimeSnapshot {
    const base = payload ?? this.emptySnapshot();
    return {
      ...base,
      items: Array.isArray(base.items) ? base.items : [],
      status: base.status ?? { level: 'info' },
    };
  }

  private snapshotFallback(): Observable<CorridorsRealtimeSnapshot> {
    return of(this.emptySnapshot());
  }

  private emptySnapshot(): CorridorsRealtimeSnapshot {
    return {
      items: [],
      status: { level: 'info' },
    };
  }
}
