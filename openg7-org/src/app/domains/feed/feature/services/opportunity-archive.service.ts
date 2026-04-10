import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

import { FeedItem } from '../models/feed.models';

const STORAGE_KEY = 'og7.opportunity-archive.ids';
const MAX_ARCHIVED_IDS = 100;

@Injectable({ providedIn: 'root' })
export class OpportunityArchiveService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);

  private readonly archivedIdsSig = signal<readonly string[]>(this.restore());
  readonly archivedIds = computed(() => this.archivedIdsSig());

  isArchived(itemId: string | null | undefined): boolean {
    const normalizedItemId = this.normalizeId(itemId);
    return normalizedItemId ? this.archivedIdsSig().includes(normalizedItemId) : false;
  }

  archive(itemId: string | null | undefined): boolean {
    const normalizedItemId = this.normalizeId(itemId);
    if (!normalizedItemId || this.isArchived(normalizedItemId)) {
      return false;
    }

    const next = [normalizedItemId, ...this.archivedIdsSig()].slice(0, MAX_ARCHIVED_IDS);
    this.archivedIdsSig.set(next);
    this.persist(next);
    return true;
  }

  apply(item: FeedItem): FeedItem {
    if (!this.isArchived(item.id)) {
      return item;
    }

    return {
      ...item,
      status: 'archived',
    };
  }

  private restore(): readonly string[] {
    if (!this.browser) {
      return [];
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        .map(entry => entry.trim())
        .slice(0, MAX_ARCHIVED_IDS);
    } catch {
      return [];
    }
  }

  private persist(value: readonly string[]): void {
    if (!this.browser) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }

  private normalizeId(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();
    return normalized.length ? normalized : null;
  }
}