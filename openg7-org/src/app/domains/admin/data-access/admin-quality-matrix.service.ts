import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export type AdminQualityMatrixStatus = 'oui' | 'partiel' | 'non' | 'hors MVP';
export type AdminQualityMatrixPriority = 'basse' | 'moyenne' | 'haute';
export type AdminQualityMatrixBucket = 'covered' | 'proof-gap' | 'product-gap' | 'scope-limit';
export type AdminQualityMatrixSourceStatus = 'fresh' | 'stale' | 'fallback';

export interface AdminQualityMatrixEntry {
  readonly id: string;
  readonly domain: string;
  readonly need: string;
  readonly summaryStatus: AdminQualityMatrixStatus;
  readonly businessStatus: AdminQualityMatrixStatus;
  readonly implementationStatus: AdminQualityMatrixStatus;
  readonly e2eStatus: AdminQualityMatrixStatus;
  readonly priority: AdminQualityMatrixPriority;
  readonly managementBucket: AdminQualityMatrixBucket;
  readonly needsProductWorkFirst: boolean;
  readonly observedGap: string;
  readonly nextMove: string;
  readonly evidence: readonly string[];
  readonly reviewedAt: string;
}

export interface AdminQualityMatrixSnapshot {
  readonly generatedAt: string;
  readonly sourceStatus: AdminQualityMatrixSourceStatus;
  readonly sourceMessage: string | null;
  readonly entries: readonly AdminQualityMatrixEntry[];
}

interface AdminQualityMatrixResponse {
  readonly generatedAt?: string | null;
  readonly entries?: readonly Partial<AdminQualityMatrixEntry>[] | null;
}

const EMPTY_SNAPSHOT: AdminQualityMatrixSnapshot = {
  generatedAt: '2026-04-11T00:00:00.000Z',
  sourceStatus: 'fallback',
  sourceMessage: 'La matrice QA embarquee est indisponible; affichage du fallback vide.',
  entries: [],
};

const STALE_AFTER_DAYS = 7;
const MS_PER_DAY = 86_400_000;

@Injectable({ providedIn: 'root' })
export class AdminQualityMatrixService {
  private readonly http = inject(HttpClient);

  loadMatrix(): Observable<AdminQualityMatrixSnapshot> {
    return this.http.get<AdminQualityMatrixResponse>('assets/data/admin-quality-matrix.json').pipe(
      map((response) => this.normalizeSnapshot(response)),
      catchError(() => of(EMPTY_SNAPSHOT)),
    );
  }

  private normalizeSnapshot(
    response: AdminQualityMatrixResponse | null | undefined,
  ): AdminQualityMatrixSnapshot {
    const generatedAt =
      typeof response?.generatedAt === 'string' && response.generatedAt.trim()
        ? response.generatedAt
        : EMPTY_SNAPSHOT.generatedAt;

    const entries = Array.isArray(response?.entries)
      ? response.entries
          .map((entry) => this.normalizeEntry(entry))
          .filter((entry): entry is AdminQualityMatrixEntry => entry !== null)
      : [];

    return {
      generatedAt,
      sourceStatus: this.resolveSourceStatus(generatedAt),
      sourceMessage: this.resolveSourceMessage(generatedAt),
      entries,
    };
  }

  private normalizeEntry(
    entry: Partial<AdminQualityMatrixEntry> | null | undefined,
  ): AdminQualityMatrixEntry | null {
    if (
      !entry ||
      typeof entry.id !== 'string' ||
      typeof entry.domain !== 'string' ||
      typeof entry.need !== 'string'
    ) {
      return null;
    }

    return {
      id: entry.id,
      domain: entry.domain,
      need: entry.need,
      summaryStatus: this.normalizeStatus(entry.summaryStatus),
      businessStatus: this.normalizeStatus(entry.businessStatus),
      implementationStatus: this.normalizeStatus(entry.implementationStatus),
      e2eStatus: this.normalizeStatus(entry.e2eStatus),
      priority: this.normalizePriority(entry.priority),
      managementBucket: this.normalizeBucket(entry.managementBucket),
      needsProductWorkFirst: Boolean(entry.needsProductWorkFirst),
      observedGap: typeof entry.observedGap === 'string' ? entry.observedGap : '',
      nextMove: typeof entry.nextMove === 'string' ? entry.nextMove : '',
      evidence: Array.isArray(entry.evidence)
        ? entry.evidence.filter((item): item is string => typeof item === 'string')
        : [],
      reviewedAt:
        typeof entry.reviewedAt === 'string' && entry.reviewedAt.trim()
          ? entry.reviewedAt
          : EMPTY_SNAPSHOT.generatedAt.slice(0, 10),
    };
  }

  private normalizeStatus(
    status: AdminQualityMatrixEntry['e2eStatus'] | undefined,
  ): AdminQualityMatrixStatus {
    return status === 'oui' || status === 'partiel' || status === 'non' || status === 'hors MVP'
      ? status
      : 'non';
  }

  private normalizePriority(
    priority: AdminQualityMatrixEntry['priority'] | undefined,
  ): AdminQualityMatrixPriority {
    return priority === 'haute' || priority === 'moyenne' || priority === 'basse'
      ? priority
      : 'moyenne';
  }

  private normalizeBucket(
    bucket: AdminQualityMatrixEntry['managementBucket'] | undefined,
  ): AdminQualityMatrixBucket {
    return bucket === 'covered' ||
      bucket === 'proof-gap' ||
      bucket === 'product-gap' ||
      bucket === 'scope-limit'
      ? bucket
      : 'proof-gap';
  }

  private resolveSourceStatus(generatedAt: string): AdminQualityMatrixSourceStatus {
    const generatedTime = new Date(generatedAt).getTime();
    if (!Number.isFinite(generatedTime)) {
      return 'fallback';
    }

    const ageDays = (Date.now() - generatedTime) / MS_PER_DAY;
    return ageDays > STALE_AFTER_DAYS ? 'stale' : 'fresh';
  }

  private resolveSourceMessage(generatedAt: string): string | null {
    const generatedTime = new Date(generatedAt).getTime();
    if (!Number.isFinite(generatedTime)) {
      return 'La date de generation de la matrice QA est invalide.';
    }

    const ageDays = Math.floor((Date.now() - generatedTime) / MS_PER_DAY);
    if (ageDays <= STALE_AFTER_DAYS) {
      return null;
    }

    return `La matrice QA date de ${ageDays} jours; relancer l'audit ou la generation avant arbitrage final.`;
  }
}
