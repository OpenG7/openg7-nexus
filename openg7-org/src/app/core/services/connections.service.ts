import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_URL } from '../config/environment.tokens';
import {
  ConnectionAttachment,
  ConnectionDetails,
  ConnectionDraft,
  ConnectionHistoryPage,
  ConnectionResponse,
  ConnectionStage,
  ConnectionStageHistoryEntry,
  ConnectionStatus,
  ConnectionStatusHistoryEntry,
  IncotermCode,
  TransportMode,
} from '../models/connection';

interface StrapiCreateConnectionRequest {
  readonly data: {
    readonly match: number;
    readonly intro_message: string;
    readonly buyer_profile: number;
    readonly buyer_organization: string;
    readonly supplier_profile: number;
    readonly supplier_organization: string;
    readonly locale: 'fr' | 'en';
    readonly attachments: readonly string[];
    readonly logistics_plan: {
      readonly incoterm?: string | null;
      readonly transports?: readonly string[];
    };
    readonly meeting_proposal: readonly string[];
  };
}

interface StrapiConnectionStageHistoryEntry {
  readonly stage?: string | null;
  readonly timestamp?: string | null;
  readonly source?: string | null;
}

interface StrapiConnectionStatusHistoryEntry {
  readonly status?: string | null;
  readonly timestamp?: string | null;
  readonly note?: string | null;
}

interface StrapiConnectionAttributes {
  readonly match?: number | null;
  readonly buyer_profile?: number | null;
  readonly supplier_profile?: number | null;
  readonly buyer_organization?: string | null;
  readonly supplier_organization?: string | null;
  readonly intro_message?: string | null;
  readonly locale?: string | null;
  readonly attachments?: readonly string[] | null;
  readonly logistics_plan?: {
    readonly incoterm?: string | null;
    readonly transports?: readonly string[] | null;
  } | null;
  readonly meeting_proposal?: readonly string[] | null;
  readonly stage?: string | null;
  readonly status?: string | null;
  readonly stageHistory?: readonly StrapiConnectionStageHistoryEntry[] | null;
  readonly statusHistory?: readonly StrapiConnectionStatusHistoryEntry[] | null;
  readonly lastStatusAt?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

interface StrapiConnectionEntity {
  readonly id: number;
  readonly attributes?: StrapiConnectionAttributes;
}

interface StrapiConnectionEntityResponse {
  readonly data: StrapiConnectionEntity | null;
}

interface StrapiConnectionCollectionResponse {
  readonly data: readonly StrapiConnectionEntity[];
  readonly meta?: {
    readonly count?: number | null;
    readonly limit?: number | null;
    readonly offset?: number | null;
    readonly hasMore?: boolean | null;
  } | null;
}

interface StrapiUpdateConnectionStatusRequest {
  readonly data: {
    readonly status: ConnectionStatus;
    readonly note?: string;
  };
}

export interface ConnectionHistoryQuery {
  readonly limit?: number;
  readonly offset?: number;
  readonly status?: ConnectionStatus;
}

@Injectable({ providedIn: 'root' })
export class ConnectionsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL, { optional: true }) ?? '';

  createConnection(draft: ConnectionDraft): Observable<StrapiConnectionEntityResponse> {
    const url = this.composeUrl('/api/connections');
    const payload = this.mapDraftToRequest(draft);
    return this.http.post<StrapiConnectionEntityResponse>(url, payload);
  }

  getConnectionHistoryPage(query?: ConnectionHistoryQuery): Observable<ConnectionHistoryPage> {
    const url = this.composeUrl('/api/connections');
    const params = this.buildHistoryParams(query);
    return this.http
      .get<StrapiConnectionCollectionResponse>(url, { params })
      .pipe(map((response) => mapStrapiConnectionHistoryPage(response)));
  }

  getConnectionById(id: number | string): Observable<ConnectionDetails | null> {
    const url = this.composeUrl(`/api/connections/${id}`);
    return this.http
      .get<StrapiConnectionEntityResponse>(url)
      .pipe(map((response) => (response?.data ? mapStrapiConnectionDetails(response.data) : null)));
  }

  updateConnectionStatus(
    id: number | string,
    status: ConnectionStatus,
    note?: string | null,
  ): Observable<ConnectionDetails | null> {
    const url = this.composeUrl(`/api/connections/${id}/status`);
    const payload: StrapiUpdateConnectionStatusRequest = {
      data: {
        status,
        ...(note?.trim() ? { note: note.trim() } : {}),
      },
    };
    return this.http
      .patch<StrapiConnectionEntityResponse>(url, payload)
      .pipe(map((response) => (response?.data ? mapStrapiConnectionDetails(response.data) : null)));
  }

  private mapDraftToRequest(draft: ConnectionDraft): StrapiCreateConnectionRequest {
    const transports = draft.logistics.transports?.map((mode) => mode.toUpperCase()) ?? [];
    return {
      data: {
        match: draft.matchId,
        intro_message: draft.introMessage,
        buyer_profile: draft.buyerProfile.id,
        buyer_organization: draft.buyerProfile.legalName ?? draft.buyerProfile.displayName ?? '',
        supplier_profile: draft.supplierProfile.id,
        supplier_organization: draft.supplierProfile.legalName ?? draft.supplierProfile.displayName ?? '',
        locale: draft.locale,
        attachments: draft.attachments,
        logistics_plan: {
          incoterm: draft.logistics.incoterm ?? null,
          transports,
        },
        meeting_proposal: draft.meetingSlots,
      },
    };
  }

  private buildHistoryParams(query?: ConnectionHistoryQuery): HttpParams {
    let params = new HttpParams();
    if (query?.limit != null) {
      params = params.set('limit', String(query.limit));
    }
    if (query?.offset != null) {
      params = params.set('offset', String(query.offset));
    }
    if (query?.status) {
      params = params.set('status', query.status);
    }
    return params;
  }

  private composeUrl(path: string): string {
    const base = this.apiUrl.replace(/\/$/, '');
    return `${base}${path}`;
  }
}

export function mapStrapiConnectionResponse(response: StrapiConnectionEntityResponse): ConnectionResponse {
  const data = response?.data;
  if (!data) {
    throw new Error('Invalid response payload');
  }
  const details = mapStrapiConnectionDetails(data);
  return {
    id: details.id,
    stage: details.stage,
    createdAt: details.createdAt,
    updatedAt: details.updatedAt ?? undefined,
  };
}

export function mapStrapiConnectionHistoryPage(
  response: StrapiConnectionCollectionResponse
): ConnectionHistoryPage {
  const items = Array.isArray(response?.data)
    ? response.data.map((entry) => mapStrapiConnectionDetails(entry))
    : [];
  return {
    items,
    meta: {
      count: normalizeNonNegativeInteger(response?.meta?.count, items.length),
      limit: normalizeNonNegativeInteger(response?.meta?.limit, items.length),
      offset: normalizeNonNegativeInteger(response?.meta?.offset, 0),
      hasMore: Boolean(response?.meta?.hasMore),
    },
  };
}

export function mapStrapiConnectionDetails(entity: StrapiConnectionEntity): ConnectionDetails {
  const attrs = entity?.attributes ?? {};
  return {
    id: entity.id,
    matchId: normalizePositiveInteger(attrs.match),
    buyerProfileId: normalizePositiveInteger(attrs.buyer_profile),
    supplierProfileId: normalizePositiveInteger(attrs.supplier_profile),
    buyerOrganization: normalizeString(attrs.buyer_organization),
    supplierOrganization: normalizeString(attrs.supplier_organization),
    introMessage: normalizeString(attrs.intro_message) ?? '',
    locale: mapLocale(attrs.locale),
    attachments: mapAttachments(attrs.attachments),
    logistics: {
      incoterm: mapIncoterm(attrs.logistics_plan?.incoterm),
      transports: mapTransports(attrs.logistics_plan?.transports),
    },
    meetingProposal: mapIsoList(attrs.meeting_proposal),
    stage: mapStage(attrs.stage),
    status: mapStatus(attrs.status),
    stageHistory: mapStageHistory(attrs.stageHistory),
    statusHistory: mapStatusHistory(attrs.statusHistory),
    lastStatusAt: normalizeIso(attrs.lastStatusAt),
    createdAt: normalizeIso(attrs.createdAt) ?? new Date().toISOString(),
    updatedAt: normalizeIso(attrs.updatedAt),
  };
}

function mapStage(value?: string | null): ConnectionStage {
  switch (value?.toLowerCase()) {
    case 'intro':
    case 'reply':
    case 'meeting':
    case 'review':
    case 'deal':
      return value.toLowerCase() as ConnectionStage;
    default:
      return 'reply';
  }
}

function mapStatus(value?: string | null): ConnectionStatus {
  switch (value) {
    case 'inDiscussion':
    case 'completed':
    case 'closed':
      return value as ConnectionStatus;
    case 'pending':
    default:
      return 'pending';
  }
}

function mapLocale(value?: string | null): 'fr' | 'en' {
  return value?.toLowerCase() === 'en' ? 'en' : 'fr';
}

function mapAttachments(value?: readonly string[] | null): readonly ConnectionAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isConnectionAttachment);
}

function mapTransports(value?: readonly string[] | null): readonly TransportMode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const transports: TransportMode[] = [];
  for (const entry of value) {
    const normalized = entry?.toLowerCase();
    if (isTransportMode(normalized) && !transports.includes(normalized)) {
      transports.push(normalized);
    }
  }
  return transports;
}

function mapIncoterm(value?: string | null): IncotermCode | null {
  if (!value) {
    return null;
  }
  return isIncotermCode(value) ? value : null;
}

function mapIsoList(value?: readonly string[] | null): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items: string[] = [];
  for (const entry of value) {
    const normalized = normalizeIso(entry);
    if (normalized && !items.includes(normalized)) {
      items.push(normalized);
    }
  }
  return items;
}

function mapStageHistory(
  value?: readonly StrapiConnectionStageHistoryEntry[] | null
): readonly ConnectionStageHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const source = normalizeString(entry?.source) ?? undefined;
      return {
        stage: mapStage(entry?.stage),
        timestamp: normalizeIso(entry?.timestamp) ?? new Date().toISOString(),
        ...(source ? { source } : {}),
      };
    })
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

function mapStatusHistory(
  value?: readonly StrapiConnectionStatusHistoryEntry[] | null
): readonly ConnectionStatusHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const note = normalizeString(entry?.note) ?? undefined;
      return {
        status: mapStatus(entry?.status),
        timestamp: normalizeIso(entry?.timestamp) ?? new Date().toISOString(),
        ...(note ? { note } : {}),
      };
    })
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizePositiveInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeNonNegativeInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return fallback;
}

function normalizeIso(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function isConnectionAttachment(value: string): value is ConnectionAttachment {
  return value === 'nda' || value === 'rfq';
}

function isTransportMode(value: string | undefined): value is TransportMode {
  return value === 'road' || value === 'air' || value === 'rail' || value === 'sea';
}

function isIncotermCode(value: string): value is IncotermCode {
  return value === 'FCA'
    || value === 'FOB'
    || value === 'DDP'
    || value === 'CPT'
    || value === 'DAP'
    || value === 'EXW'
    || value === 'CIF'
    || value === 'CIP';
}
