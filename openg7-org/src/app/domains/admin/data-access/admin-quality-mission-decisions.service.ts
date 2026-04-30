import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { STRAPI_ROUTES, strapiAdminQualityMissionDecisionById } from '@app/core/api/strapi.routes';
import { SUPPRESS_ERROR_TOAST } from '@app/core/http/error.interceptor.tokens';
import { HttpClientService } from '@app/core/http/http-client.service';
import { Observable, map } from 'rxjs';

import type {
  AdminQualityMissionKind,
  AdminQualityMissionStatus,
} from '../pages/admin-quality-mission-control';

export interface AdminQualityMissionDecisionRecord {
  readonly recommendationId: string;
  readonly entryId: string;
  readonly kind: AdminQualityMissionKind;
  readonly status: AdminQualityMissionStatus;
  readonly title: string | null;
  readonly message: string | null;
  readonly operatorPrompt: string | null;
  readonly metadata: Record<string, unknown>;
  readonly decidedByUserId: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface AdminQualityMissionDecisionSnapshot {
  readonly generatedAt: string;
  readonly decisions: readonly AdminQualityMissionDecisionRecord[];
}

export interface AdminQualityMissionDecisionSaveInput {
  readonly recommendationId: string;
  readonly entryId: string;
  readonly kind: AdminQualityMissionKind;
  readonly status: AdminQualityMissionStatus;
  readonly title: string;
  readonly message: string;
  readonly operatorPrompt: string;
  readonly metadata: Record<string, unknown>;
}

interface StrapiDataResponse<T> {
  readonly data: T;
}

@Injectable({ providedIn: 'root' })
export class AdminQualityMissionDecisionsService {
  private readonly http = inject(HttpClientService);
  private readonly silentOptions = {
    context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
  };

  loadDecisions(): Observable<AdminQualityMissionDecisionSnapshot> {
    return this.http
      .get<
        StrapiDataResponse<AdminQualityMissionDecisionSnapshot>
      >(STRAPI_ROUTES.admin.qualityMissionDecisions, this.silentOptions)
      .pipe(map((response) => response.data));
  }

  saveDecision(
    input: AdminQualityMissionDecisionSaveInput,
  ): Observable<AdminQualityMissionDecisionRecord> {
    return this.http
      .put<
        StrapiDataResponse<AdminQualityMissionDecisionRecord>
      >(strapiAdminQualityMissionDecisionById(input.recommendationId), input, this.silentOptions)
      .pipe(map((response) => response.data));
  }

  deleteDecision(
    recommendationId: string,
  ): Observable<{ recommendationId: string; deleted: boolean }> {
    return this.http
      .delete<
        StrapiDataResponse<{ recommendationId: string; deleted: boolean }>
      >(strapiAdminQualityMissionDecisionById(recommendationId), this.silentOptions)
      .pipe(map((response) => response.data));
  }
}
