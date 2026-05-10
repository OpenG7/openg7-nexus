import { HttpContext, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { STRAPI_ROUTES } from '@app/core/api/strapi.routes';
import { SUPPRESS_ERROR_TOAST } from '@app/core/http/error.interceptor.tokens';
import { HttpClientService } from '@app/core/http/http-client.service';
import { map, Observable } from 'rxjs';

import type {
  CreateOpportunityOfferPayload,
  OpportunityOfferAttachmentRecord,
  OpportunityOfferRecord,
} from '../opportunity-offers.service';

export interface PersistOpportunityOfferPayload extends CreateOpportunityOfferPayload {
  feedItemId?: string | null;
  attachmentId?: string | null;
  correlationId?: string | null;
}

export interface PersistOpportunityOfferOptions {
  idempotencyKey?: string | null;
  suppressErrorToast?: boolean;
}

interface OpportunityOfferRecordResponse {
  data: OpportunityOfferRecord;
}

interface OpportunityOfferCollectionResponse {
  data: OpportunityOfferRecord[];
}

interface OpportunityOfferAttachmentResponse {
  data: OpportunityOfferAttachmentRecord;
}

@Injectable({ providedIn: 'root' })
export class OpportunityOffersApiService {
  private readonly http = inject(HttpClientService);

  listMine(opportunityId?: string | null): Observable<OpportunityOfferRecord[]> {
    const params = opportunityId ? { opportunityId } : undefined;
    return this.http
      .get<OpportunityOfferCollectionResponse>(STRAPI_ROUTES.users.meOpportunityOffers, {
        params,
        context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
      })
      .pipe(map((response) => response.data));
  }

  createMine(
    payload: PersistOpportunityOfferPayload,
    options: PersistOpportunityOfferOptions = {},
  ): Observable<OpportunityOfferRecord> {
    return this.http
      .post<OpportunityOfferRecordResponse>(STRAPI_ROUTES.users.meOpportunityOffers, payload, {
        headers: this.createHeaders(options),
        context: options.suppressErrorToast
          ? new HttpContext().set(SUPPRESS_ERROR_TOAST, true)
          : undefined,
      })
      .pipe(map((response) => response.data));
  }

  uploadAttachment(
    file: File,
    options: PersistOpportunityOfferOptions = {},
  ): Observable<OpportunityOfferAttachmentRecord> {
    const payload = new FormData();
    payload.append('files', file, file.name);

    return this.http
      .post<OpportunityOfferAttachmentResponse>(
        STRAPI_ROUTES.users.meOpportunityOfferAttachments,
        payload,
        {
          headers: this.createHeaders(options),
          context: options.suppressErrorToast
            ? new HttpContext().set(SUPPRESS_ERROR_TOAST, true)
            : undefined,
        },
      )
      .pipe(map((response) => response.data));
  }

  private createHeaders(options: PersistOpportunityOfferOptions): HttpHeaders | undefined {
    const idempotencyKey = options.idempotencyKey?.trim();
    return idempotencyKey ? new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) : undefined;
  }
}
