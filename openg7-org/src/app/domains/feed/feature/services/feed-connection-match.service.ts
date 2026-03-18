import { Injectable, inject } from '@angular/core';
import {
  OpportunityMatch,
  OpportunityMatchQuery,
  ProvinceCode,
  SectorType,
  isProvinceCode,
  isSectorType,
} from '@app/core/models/opportunity';
import { OpportunityService } from '@app/core/services/opportunity.service';

import { FeedComposerDraft, FeedItemType, FlowMode } from '../models/feed.models';

interface MatchResolutionDraft {
  readonly type: FeedItemType | null;
  readonly mode: FlowMode;
  readonly sectorId?: string | null;
  readonly fromProvinceId?: string | null;
  readonly toProvinceId?: string | null;
  readonly title?: string | null;
  readonly summary?: string | null;
  readonly connectionMatchId?: number | null;
}

const MATCH_READY_TYPES = new Set<FeedItemType>(['REQUEST', 'TENDER']);
const TITLE_TOKEN_PATTERN = /[a-z0-9]{3,}/g;

@Injectable({ providedIn: 'root' })
export class FeedConnectionMatchService {
  private readonly opportunities = inject(OpportunityService);

  async resolveDraftConnectionMatchId(
    draft: MatchResolutionDraft | FeedComposerDraft
  ): Promise<number | null> {
    const explicitMatchId = this.normalizePositiveInteger(draft.connectionMatchId);
    if (explicitMatchId != null) {
      return explicitMatchId;
    }

    if (!draft.type || !MATCH_READY_TYPES.has(draft.type)) {
      return null;
    }

    const query = this.buildQuery(draft);
    const candidates = await this.opportunities.searchMatches(query);
    if (!candidates.length) {
      return null;
    }

    const best = this.selectBestCandidate(candidates, draft);
    return best ? best.id : null;
  }

  private buildQuery(draft: MatchResolutionDraft): OpportunityMatchQuery | undefined {
    const sector = this.normalizeSector(draft.sectorId);
    const province = this.normalizeProvince(draft.toProvinceId) ?? this.normalizeProvince(draft.fromProvinceId);
    const mode = this.normalizeMode(draft.mode);
    const q = this.extractSearchQuery(draft.title, draft.summary);

    const query: OpportunityMatchQuery = {
      ...(q ? { q } : {}),
      ...(province ? { province } : {}),
      ...(sector ? { sector } : {}),
      ...(mode ? { mode } : {}),
      pageSize: 25,
    };

    return Object.keys(query).length > 0 ? query : undefined;
  }

  private selectBestCandidate(
    matches: readonly OpportunityMatch[],
    draft: MatchResolutionDraft
  ): OpportunityMatch | null {
    const fromProvince = this.normalizeProvince(draft.fromProvinceId);
    const toProvince = this.normalizeProvince(draft.toProvinceId);
    const sector = this.normalizeSector(draft.sectorId);
    const commodityTokens = this.extractTokens(draft.title, draft.summary);

    let bestMatch: OpportunityMatch | null = null;
    let bestScore = 0;

    for (const match of matches) {
      let score = 0;

      if (sector && (match.buyer.sector === sector || match.seller.sector === sector)) {
        score += 4;
      }

      if (fromProvince) {
        if (match.seller.province === fromProvince) {
          score += 4;
        } else if (match.buyer.province === fromProvince) {
          score += 1;
        }
      }

      if (toProvince) {
        if (match.buyer.province === toProvince) {
          score += 4;
        } else if (match.seller.province === toProvince) {
          score += 1;
        }
      }

      if (match.mode === 'all' || match.mode === this.normalizeMode(draft.mode)) {
        score += 2;
      }

      if (commodityTokens.size > 0) {
        const matchTokens = this.extractTokens(match.commodity, match.buyer.name, match.seller.name);
        let overlap = 0;
        for (const token of commodityTokens) {
          if (matchTokens.has(token)) {
            overlap += 1;
          }
        }
        score += Math.min(overlap, 3);
      }

      if (!bestMatch || score > bestScore || (score === bestScore && match.confidence > bestMatch.confidence)) {
        bestMatch = match;
        bestScore = score;
      }
    }

    return bestScore >= 5 ? bestMatch : null;
  }

  private extractSearchQuery(...values: Array<string | null | undefined>): string | undefined {
    const tokens = Array.from(this.extractTokens(...values)).slice(0, 5);
    if (!tokens.length) {
      return undefined;
    }
    return tokens.join(' ');
  }

  private extractTokens(...values: Array<string | null | undefined>): Set<string> {
    const tokens = new Set<string>();
    for (const value of values) {
      const normalized = value?.trim().toLowerCase();
      if (!normalized) {
        continue;
      }
      const matches = normalized.match(TITLE_TOKEN_PATTERN) ?? [];
      for (const token of matches) {
        tokens.add(token);
      }
    }
    return tokens;
  }

  private normalizeMode(
    mode: FlowMode | null | undefined
  ): OpportunityMatchQuery['mode'] | undefined {
    if (mode === 'EXPORT') {
      return 'export';
    }
    if (mode === 'IMPORT') {
      return 'import';
    }
    return undefined;
  }

  private normalizeProvince(value: string | null | undefined): ProvinceCode | undefined {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim().toUpperCase();
    return isProvinceCode(normalized) ? normalized : undefined;
  }

  private normalizeSector(value: string | null | undefined): SectorType | undefined {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim().toLowerCase();
    return isSectorType(normalized) ? normalized : undefined;
  }

  private normalizePositiveInteger(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.trunc(value);
    }
    if (typeof value !== 'string') {
      return null;
    }
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
}
