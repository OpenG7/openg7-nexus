import { HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { STRAPI_ROUTES } from '@app/core/api/strapi.routes';
import { SUPPRESS_ERROR_TOAST } from '@app/core/http/error.interceptor.tokens';
import { HttpClientService } from '@app/core/http/http-client.service';
import { Observable, map } from 'rxjs';

export type FeedActionTargetType = 'opportunity' | 'alert' | 'indicator' | 'feed-item';
export type FeedActionType =
  | 'save'
  | 'unsave'
  | 'subscribe'
  | 'report-update'
  | 'report-opportunity'
  | 'archive'
  | 'duplicate'
  | 'share'
  | 'create-indicator-alert';
export type FeedActionStatus = 'completed' | 'queued' | 'failed';

export interface FeedActionRecord {
  id: string;
  targetType: FeedActionTargetType;
  targetId: string;
  action: FeedActionType;
  status: FeedActionStatus;
  sourceRoute: string | null;
  targetRoute: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  createdAt: string | null;
  updatedAt: string | null;
  correlationId: string | null;
  idempotencyKey: string | null;
}

export interface CreateFeedActionPayload {
  targetType: FeedActionTargetType;
  targetId: string;
  action: FeedActionType;
  status?: FeedActionStatus;
  sourceRoute?: string | null;
  targetRoute?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt?: string;
  correlationId?: string | null;
}

export interface ListFeedActionsOptions {
  targetType?: FeedActionTargetType;
  targetId?: string;
  action?: FeedActionType;
}

export interface PersistFeedActionOptions {
  idempotencyKey?: string;
  suppressErrorToast?: boolean;
}

interface FeedActionResponse {
  data: FeedActionRecord;
}

interface FeedActionCollectionResponse {
  data: FeedActionRecord[];
}

@Injectable({ providedIn: 'root' })
export class FeedActionsApiService {
  private readonly http = inject(HttpClientService);

  listMine(options: ListFeedActionsOptions = {}): Observable<FeedActionRecord[]> {
    let params = new HttpParams();
    if (options.targetType) {
      params = params.set('targetType', options.targetType);
    }
    if (options.targetId) {
      params = params.set('targetId', options.targetId);
    }
    if (options.action) {
      params = params.set('action', options.action);
    }

    return this.http
      .get<FeedActionCollectionResponse>(STRAPI_ROUTES.users.meFeedActions, {
        params,
        context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
      })
      .pipe(map((response) => response.data));
  }

  createMine(
    payload: CreateFeedActionPayload,
    options: PersistFeedActionOptions = {},
  ): Observable<FeedActionRecord> {
    let headers = new HttpHeaders();
    if (options.idempotencyKey) {
      headers = headers.set('Idempotency-Key', options.idempotencyKey);
    }

    return this.http
      .post<FeedActionResponse>(STRAPI_ROUTES.users.meFeedActions, payload, {
        headers,
        context: new HttpContext().set(SUPPRESS_ERROR_TOAST, options.suppressErrorToast ?? true),
      })
      .pipe(map((response) => response.data));
  }
}
