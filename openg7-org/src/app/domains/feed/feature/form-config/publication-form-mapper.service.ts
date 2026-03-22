import { Injectable } from '@angular/core';

import { FeedComposerDraft } from '../models/feed.models';
import {
  PublicationBinding,
  PublicationFormConfig,
} from './publication-form-config.models';

export interface PublicationFormSubmission {
  readonly draft: FeedComposerDraft;
  readonly extensions: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class PublicationFormMapperService {
  map(config: PublicationFormConfig, rawValue: Record<string, unknown>): PublicationFormSubmission {
    const draft: {
      type: FeedComposerDraft['type'];
      title: FeedComposerDraft['title'];
      summary: FeedComposerDraft['summary'];
      sectorId: FeedComposerDraft['sectorId'];
      fromProvinceId: FeedComposerDraft['fromProvinceId'];
      toProvinceId: FeedComposerDraft['toProvinceId'];
      mode: FeedComposerDraft['mode'];
      quantity: FeedComposerDraft['quantity'];
      tags: FeedComposerDraft['tags'];
      originType: FeedComposerDraft['originType'];
      originId: FeedComposerDraft['originId'];
      connectionMatchId: FeedComposerDraft['connectionMatchId'];
    } = {
      type: config.draftMapping.defaults?.type ?? null,
      title: '',
      summary: '',
      sectorId: config.draftMapping.defaults?.sectorId ?? config.sectorId,
      fromProvinceId: config.draftMapping.defaults?.fromProvinceId ?? null,
      toProvinceId: config.draftMapping.defaults?.toProvinceId ?? null,
      mode: config.draftMapping.defaults?.mode ?? 'BOTH',
      quantity: config.draftMapping.defaults?.quantity ?? null,
      tags: config.draftMapping.defaults?.tags,
      originType: config.draftMapping.defaults?.originType ?? null,
      originId: config.draftMapping.defaults?.originId ?? null,
      connectionMatchId: config.draftMapping.defaults?.connectionMatchId ?? null,
    };

    for (const [target, binding] of Object.entries(config.draftMapping.bindings)) {
      const resolved = this.resolveBinding(binding, rawValue);
      if (resolved === undefined) {
        continue;
      }

      if (target === 'quantity.value') {
        const current = draft.quantity ?? { value: 0, unit: 'MW' };
        draft.quantity = {
          ...current,
          value: Number(resolved),
        };
        continue;
      }

      if (target === 'quantity.unit') {
        const current = draft.quantity ?? { value: 0, unit: 'MW' };
        draft.quantity = {
          ...current,
          unit: String(resolved) as typeof current.unit,
        };
        continue;
      }

      draft[target as keyof typeof draft] = resolved as never;
    }

    if (draft.quantity && (!Number.isFinite(draft.quantity.value) || draft.quantity.value <= 0)) {
      draft.quantity = null;
    }

    if (Array.isArray(draft.tags) && draft.tags.length === 0) {
      draft.tags = undefined;
    }

    const extensions: Record<string, unknown> = {};
    for (const [key, binding] of Object.entries(config.draftMapping.extensions ?? {})) {
      const resolved = this.resolveBinding(binding, rawValue);
      if (resolved !== undefined) {
        extensions[key] = resolved;
      }
    }

    return { draft: draft as FeedComposerDraft, extensions };
  }

  private resolveBinding(binding: PublicationBinding, rawValue: Record<string, unknown>): unknown {
    switch (binding.kind) {
      case 'constant':
        return binding.value;
      case 'field':
        return rawValue[binding.field];
      case 'array': {
        const values = binding.fields.flatMap((field) => this.normalizeArrayValue(rawValue[field]));
        return values.length > 0 ? values : undefined;
      }
      default:
        return undefined;
    }
  }

  private normalizeArrayValue(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry).trim()))
        .filter(Boolean);
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    }

    if (value === null || value === undefined || value === '') {
      return [];
    }

    return [String(value).trim()].filter(Boolean);
  }
}