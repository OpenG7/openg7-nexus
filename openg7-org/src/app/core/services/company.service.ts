import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { Observable, OperatorFunction } from 'rxjs';
import { map } from 'rxjs/operators';

import { API_TOKEN, API_URL } from '../config/environment.tokens';
import { isCountryCode } from '../models/country';
import type { CountryCode } from '../models/country';

export type CompanyStatus = 'pending' | 'approved' | 'suspended';

export type CompanyVerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'correctionRequested'
  | 'rejected'
  | 'suspended';

export type CompanyVerificationSourceStatus = 'pending' | 'validated' | 'revoked';

export type CompanyVerificationSourceType = 'registry' | 'chamber' | 'audit' | 'other';

export interface CompanyVerificationSource {
  readonly id?: number | null;
  readonly name: string;
  readonly type: CompanyVerificationSourceType;
  readonly status: CompanyVerificationSourceStatus;
  readonly referenceId?: string | null;
  readonly url?: string | null;
  readonly evidenceUrl?: string | null;
  readonly issuedAt?: string | null;
  readonly lastCheckedAt?: string | null;
  readonly notes?: string | null;
}

export type CompanyTrustRecordType = 'transaction' | 'evaluation';

export type CompanyTrustDirection = 'inbound' | 'outbound';

export interface CompanyTrustRecord {
  readonly id?: number | null;
  readonly label: string;
  readonly type: CompanyTrustRecordType;
  readonly direction: CompanyTrustDirection;
  readonly occurredAt: string;
  readonly amount?: number | null;
  readonly score?: number | null;
  readonly notes?: string | null;
}

export interface CompanyCapacity {
  readonly label: string;
  readonly value: number | null;
  readonly unit: string | null;
}

export interface CompanyRelation {
  readonly id: number;
  readonly name: string | null;
}

export interface CompanyRecord {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly website: string | null;
  readonly status: CompanyStatus;
  readonly logoUrl: string | null;
  readonly secondaryLogoUrl: string | null;
  readonly capacities: readonly CompanyCapacity[];
  readonly sector: CompanyRelation | null;
  readonly province: CompanyRelation | null;
  readonly country: CountryCode | null;
  readonly verificationStatus: CompanyVerificationStatus;
  readonly verificationSources: readonly CompanyVerificationSource[];
  readonly trustScore: number;
  readonly trustHistory: readonly CompanyTrustRecord[];
}

export interface CompanyPayload {
  readonly name?: string;
  readonly description?: string | null;
  readonly website?: string | null;
  readonly sectorId?: number | null;
  readonly provinceId?: number | null;
  readonly country?: CountryCode | null;
  readonly capacities?: ReadonlyArray<CompanyCapacity>;
  readonly logoUrl?: string | null;
  readonly secondaryLogoUrl?: string | null;
  readonly status?: CompanyStatus;
}

interface StrapiRelation<T> {
  readonly data: {
    readonly id: number;
    readonly attributes?: T;
  } | null;
}

interface CompanyAttributes {
  readonly name?: string | null;
  readonly description?: string | null;
  readonly website?: string | null;
  readonly status?: CompanyStatus | null;
  readonly logoUrl?: string | null;
  readonly secondaryLogoUrl?: string | null;
  readonly capacities?: unknown;
  readonly sector?: StrapiRelation<{ name?: string | null }>;
  readonly province?: StrapiRelation<{ name?: string | null }>;
  readonly country?: CountryCode | null;
  readonly verificationStatus?: CompanyVerificationStatus | null;
  readonly verificationSources?: unknown;
  readonly trustScore?: number | null;
  readonly trustHistory?: unknown;
}

interface StrapiEntity<T> {
  readonly id: number;
  readonly attributes: T;
}

interface StrapiListResponse<T> {
  readonly data: readonly StrapiEntity<T>[];
  readonly meta?: unknown;
}

interface StrapiSingleResponse<T> {
  readonly data: StrapiEntity<T> | null;
  readonly meta?: unknown;
}

export const COMPANY_STATUSES: readonly CompanyStatus[] = ['pending', 'approved', 'suspended'] as const;

const ENDPOINT_PATH = '/api/companies';
const DEFAULT_POPULATE = 'sector,province,verificationSources,trustHistory';

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « core/services ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Company ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns CompanyService gérée par le framework.
 */
export class CompanyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL, { optional: true }) ?? '';
  private readonly token = inject(API_TOKEN, { optional: true }) ?? null;

  private readonly companiesSignal = signal<readonly CompanyRecord[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  /**
   * Contexte : Consumed by admin dashboards displaying the cached company list.
   * Raison d’être : Exposes the read-only signal tracking the most recently loaded companies.
   * @returns Signal with the current company collection.
   */
  companies(): Signal<readonly CompanyRecord[]> {
    return this.companiesSignal.asReadonly();
  }

  /**
   * Contexte : Used by list components to show loading spinners while companies are fetched.
   * Raison d’être : Provides a reactive flag reflecting the current fetch state.
   * @returns Signal reporting whether a company request is in flight.
   */
  loading(): Signal<boolean> {
    return this.loadingSignal.asReadonly();
  }

  /**
   * Contexte : Read by UI components to surface error banners when the backend request fails.
   * Raison d’être : Supplies the translation key describing the latest load error.
   * @returns Signal containing the error key or null.
   */
  error(): Signal<string | null> {
    return this.errorSignal.asReadonly();
  }

  /**
   * Contexte : Called by admin lists to fetch companies filtered by status.
   * Raison d’être : Performs the HTTP call, updates reactive state and handles failure fallback.
   * @param options Optional status filter (defaults to approved).
   * @returns void
   */
  loadCompanies(options?: { status?: CompanyStatus | 'all' }): void {
    const status = options?.status ?? 'approved';
    const params = this.buildListParams(status);
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.http
      .get<StrapiListResponse<CompanyAttributes>>(this.composeUrl(), {
        params,
        headers: this.buildHeaders() ?? undefined,
      })
      .subscribe({
        next: (response) => {
          const companies = this.mapList(response);
          this.companiesSignal.set(companies);
          this.loadingSignal.set(false);
        },
        error: () => {
          this.loadingSignal.set(false);
          this.errorSignal.set('company.error.load');
        },
      });
  }

  /**
   * Contexte : Used by admin forms to create new companies in Strapi.
   * Raison d’être : Normalises the payload, submits it and updates the in-memory collection.
   * @param payload Company data to persist (name required).
   * @returns Observable emitting the created company record.
   */
  createCompany(payload: CompanyPayload & { name: string }): Observable<CompanyRecord> {
    const body = { data: this.normalizePayload(payload, 'pending') };
    const params = new HttpParams().set('populate', DEFAULT_POPULATE);
    return this.http
      .post<StrapiSingleResponse<CompanyAttributes>>(this.composeUrl(), body, {
        params,
        headers: this.buildHeaders() ?? undefined,
      })
      .pipe(this.mapSingleResponse());
  }

  /**
   * Contexte : Triggered when editing an existing company entry.
   * Raison d’être : Applies the update in Strapi and refreshes the cached entity.
   * @param id Identifier of the company to update.
   * @param payload Fields to update.
   * @returns Observable emitting the updated record.
   */
  updateCompany(id: number, payload: CompanyPayload): Observable<CompanyRecord> {
    const body = { data: this.normalizePayload(payload) };
    const params = new HttpParams().set('populate', DEFAULT_POPULATE);
    return this.http
      .put<StrapiSingleResponse<CompanyAttributes>>(this.composeUrl(id), body, {
        params,
        headers: this.buildHeaders() ?? undefined,
      })
      .pipe(this.mapSingleResponse(id));
  }

  /**
   * Contexte : Called by moderation tools to transition a company between statuses.
   * Raison d’être : Convenience wrapper delegating to {@link updateCompany} with only a status change.
   * @param id Identifier of the company to update.
   * @param status New status to apply.
   * @returns Observable emitting the updated record.
   */
  updateStatus(id: number, status: CompanyStatus): Observable<CompanyRecord> {
    return this.updateCompany(id, { status });
  }

  /**
   * Contexte : Used by trust & safety tooling to adjust verification metadata for a company.
   * Raison d’être : Serialises structured verification payloads and persists them in Strapi.
   * @param id Identifier of the company to update.
   * @param payload Verification-related fields to persist.
   * @returns Observable emitting the updated record.
   */
  updateVerification(
    id: number,
    payload: {
      verificationStatus?: CompanyVerificationStatus;
      verificationSources?: ReadonlyArray<CompanyVerificationSource>;
      trustHistory?: ReadonlyArray<CompanyTrustRecord>;
    }
  ): Observable<CompanyRecord> {
    const data: Record<string, unknown> = {};
    if (payload.verificationStatus) {
      data['verificationStatus'] = payload.verificationStatus;
    }
    if (payload.verificationSources) {
      data['verificationSources'] = payload.verificationSources
        .filter((source) => Boolean(source.name?.trim()))
        .map((source) => this.serializeVerificationSource(source));
    }
    if (payload.trustHistory) {
      data['trustHistory'] = payload.trustHistory
        .filter((record) => Boolean(record.label?.trim()) && Boolean(record.occurredAt?.trim()))
        .map((record) => this.serializeTrustRecord(record));
    }

    const body = { data };
    const params = new HttpParams().set('populate', DEFAULT_POPULATE);
    return this.http
      .put<StrapiSingleResponse<CompanyAttributes>>(this.composeUrl(id), body, {
        params,
        headers: this.buildHeaders() ?? undefined,
      })
      .pipe(this.mapSingleResponse(id));
  }

  private composeUrl(id?: number): string {
    const base = this.apiUrl.replace(/\/$/, '');
    if (typeof id === 'number') {
      return `${base}${ENDPOINT_PATH}/${id}`;
    }
    return `${base}${ENDPOINT_PATH}`;
  }

  private buildHeaders(): HttpHeaders | null {
    if (!this.token) {
      return null;
    }
    return new HttpHeaders({ Authorization: `Bearer ${this.token}` });
  }

  private buildListParams(status: CompanyStatus | 'all'): HttpParams {
    let params = new HttpParams().set('populate', DEFAULT_POPULATE).set('sort', 'name:asc');
    if (status !== 'all') {
      params = params.set('filters[status][$eq]', status);
    }
    return params;
  }

  private mapList(response: StrapiListResponse<CompanyAttributes>): readonly CompanyRecord[] {
    if (!response?.data?.length) {
      return [];
    }
    const list: CompanyRecord[] = [];
    for (const entity of response.data) {
      const company = this.mapCompany(entity);
      if (company) {
        list.push(company);
      }
    }
    return list;
  }

  private mapSingleResponse(targetId?: number): OperatorFunction<StrapiSingleResponse<CompanyAttributes>, CompanyRecord> {
    return map((response) => {
      const company = response?.data ? this.mapCompany(response.data) : null;
      if (!company) {
        throw new Error('company.invalidResponse');
      }
      this.upsertCompany(company, targetId);
      return company;
    });
  }

  private mapCompany(entity: StrapiEntity<CompanyAttributes> | null | undefined): CompanyRecord | null {
    if (!entity?.id) {
      return null;
    }
    const attrs = entity.attributes ?? {};
    const status = this.normalizeStatus(attrs.status);
    const name = typeof attrs.name === 'string' && attrs.name.trim() ? attrs.name : `Company #${entity.id}`;
    return {
      id: entity.id,
      name,
      description: typeof attrs.description === 'string' ? attrs.description : null,
      website: typeof attrs.website === 'string' ? attrs.website : null,
    status,
    logoUrl: typeof attrs.logoUrl === 'string' ? attrs.logoUrl : null,
    secondaryLogoUrl: typeof attrs.secondaryLogoUrl === 'string' ? attrs.secondaryLogoUrl : null,
    capacities: this.normalizeCapacities(attrs.capacities),
    sector: this.normalizeRelation(attrs.sector),
    province: this.normalizeRelation(attrs.province),
    country: this.normalizeCountry(attrs.country),
    verificationStatus: this.normalizeVerificationStatus(attrs.verificationStatus),
    verificationSources: this.normalizeVerificationSources(attrs.verificationSources),
    trustScore: this.normalizeTrustScore(attrs.trustScore),
    trustHistory: this.normalizeTrustHistory(attrs.trustHistory),
  };
}

  private normalizeStatus(input: CompanyAttributes['status']): CompanyStatus {
    if (input === 'approved' || input === 'suspended' || input === 'pending') {
      return input;
    }
    return 'pending';
  }

  private normalizeRelation(relation?: CompanyAttributes['sector'] | CompanyAttributes['province']): CompanyRelation | null {
    const payload = relation?.data;
    if (!payload?.id) {
      return null;
    }
    const name = payload.attributes?.name;
    return {
      id: payload.id,
      name: typeof name === 'string' ? name : null,
    };
  }

  private normalizeCapacities(raw: unknown): readonly CompanyCapacity[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    const items: CompanyCapacity[] = [];
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      const data = entry as Record<string, unknown>;
      const labelRaw = data['label'];
      if (typeof labelRaw !== 'string' || !labelRaw.trim()) {
        continue;
      }
      const valueRaw = data['value'];
      let value: number | null = null;
      if (typeof valueRaw === 'number' && Number.isFinite(valueRaw)) {
        value = valueRaw;
      } else if (typeof valueRaw === 'string' && valueRaw.trim() !== '' && !Number.isNaN(Number(valueRaw))) {
        value = Number(valueRaw);
      }
      const unitRaw = data['unit'];
      const unit = typeof unitRaw === 'string' && unitRaw.trim() ? unitRaw : null;
      items.push({ label: labelRaw.trim(), value, unit });
    }
    return items;
  }

  private normalizeCountry(value: unknown): CountryCode | null {
    if (!isCountryCode(value)) {
      return null;
    }
    const normalized = (value as string).trim().toUpperCase();
    return normalized as CountryCode;
  }

  private normalizeVerificationStatus(value: CompanyAttributes['verificationStatus']): CompanyVerificationStatus {
    if (
      value === 'pending' ||
      value === 'verified' ||
      value === 'correctionRequested' ||
      value === 'rejected' ||
      value === 'suspended'
    ) {
      return value;
    }
    return 'unverified';
  }

  private normalizeVerificationSources(raw: unknown): readonly CompanyVerificationSource[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    const sources: CompanyVerificationSource[] = [];
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      const data = entry as Record<string, unknown>;
      const nameRaw = data['name'];
      if (typeof nameRaw !== 'string' || !nameRaw.trim()) {
        continue;
      }
      const typeRaw = data['type'];
      const statusRaw = data['status'];
      const normalizeString = (value: unknown) =>
        typeof value === 'string' && value.trim() ? value.trim() : null;

      sources.push({
        id: typeof data['id'] === 'number' ? data['id'] : null,
        name: nameRaw.trim(),
        type: typeRaw === 'chamber' || typeRaw === 'audit' || typeRaw === 'other' ? typeRaw : 'registry',
        status: statusRaw === 'validated' || statusRaw === 'revoked' ? statusRaw : 'pending',
        referenceId: normalizeString(data['referenceId']),
        url: normalizeString(data['url']),
        evidenceUrl: normalizeString(data['evidenceUrl']),
        issuedAt: normalizeString(data['issuedAt']),
        lastCheckedAt: normalizeString(data['lastCheckedAt']),
        notes: normalizeString(data['notes']),
      });
    }
    return sources;
  }

  private normalizeTrustHistory(raw: unknown): readonly CompanyTrustRecord[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    const records: CompanyTrustRecord[] = [];
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      const data = entry as Record<string, unknown>;
      const labelRaw = data['label'];
      const occurredAtRaw = data['occurredAt'];
      if (typeof labelRaw !== 'string' || !labelRaw.trim()) {
        continue;
      }
      if (typeof occurredAtRaw !== 'string' || !occurredAtRaw.trim()) {
        continue;
      }
      const amountRaw = data['amount'];
      const scoreRaw = data['score'];

      records.push({
        id: typeof data['id'] === 'number' ? data['id'] : null,
        label: labelRaw.trim(),
        type: data['type'] === 'evaluation' ? 'evaluation' : 'transaction',
        direction: data['direction'] === 'outbound' ? 'outbound' : 'inbound',
        occurredAt: occurredAtRaw.trim(),
        amount: this.parseNumber(amountRaw),
        score: this.parseNumber(scoreRaw),
        notes: typeof data['notes'] === 'string' && data['notes'].trim() ? data['notes'].trim() : null,
      });
    }
    return records;
  }

  private normalizeTrustScore(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return this.clampScore(value);
    }
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return this.clampScore(Number(value));
    }
    return 0;
  }

  private clampScore(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    const bounded = Math.max(0, Math.min(100, value));
    return Math.round(bounded);
  }

  private parseNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    return null;
  }

  private normalizePayload(payload: CompanyPayload, defaultStatus?: CompanyStatus) {
    const data: Record<string, unknown> = {};
    if (payload.name !== undefined) {
      data['name'] = payload.name;
    }
    if (payload.description !== undefined) {
      data['description'] = payload.description ?? null;
    }
    if (payload.website !== undefined) {
      data['website'] = payload.website ?? null;
    }
    if (payload.sectorId !== undefined) {
      data['sector'] = payload.sectorId ?? null;
    }
    if (payload.provinceId !== undefined) {
      data['province'] = payload.provinceId ?? null;
    }
    if (payload.country !== undefined) {
      data['country'] = this.normalizeCountry(payload.country);
    }
    if (payload.capacities !== undefined) {
      data['capacities'] = payload.capacities
        .filter((capacity) => capacity.label.trim())
        .map((capacity) => ({
          label: capacity.label.trim(),
          value: capacity.value ?? null,
          unit: capacity.unit ? capacity.unit.trim() || null : null,
        }));
    }
    if (payload.logoUrl !== undefined) {
      data['logoUrl'] = payload.logoUrl ?? null;
    }
    if (payload.secondaryLogoUrl !== undefined) {
      data['secondaryLogoUrl'] = payload.secondaryLogoUrl ?? null;
    }
    if (payload.status !== undefined) {
      data['status'] = payload.status;
    } else if (defaultStatus) {
      data['status'] = defaultStatus;
    }
    return data;
  }

  private serializeVerificationSource(source: CompanyVerificationSource) {
    const normalize = (value: string | null | undefined) => (value && value.trim() ? value.trim() : null);
    return {
      id: source.id ?? undefined,
      name: source.name.trim(),
      type: source.type,
      status: source.status,
      referenceId: normalize(source.referenceId),
      url: normalize(source.url),
      evidenceUrl: normalize(source.evidenceUrl),
      issuedAt: source.issuedAt ?? null,
      lastCheckedAt: source.lastCheckedAt ?? null,
      notes: normalize(source.notes),
    };
  }

  private serializeTrustRecord(record: CompanyTrustRecord) {
    return {
      id: record.id ?? undefined,
      label: record.label.trim(),
      type: record.type,
      direction: record.direction,
      occurredAt: record.occurredAt,
      amount: record.amount ?? null,
      score: record.score ?? null,
      notes: record.notes ?? null,
    };
  }

  private upsertCompany(company: CompanyRecord, targetId?: number): void {
    const current = this.companiesSignal();
    const id = targetId ?? company.id;
    const index = current.findIndex((item) => item.id === id);
    if (index === -1) {
      this.companiesSignal.set([...current, company].sort((a, b) => a.name.localeCompare(b.name)));
      return;
    }
    const next = current.slice();
    next[index] = company;
    this.companiesSignal.set(next);
  }
}
