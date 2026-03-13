import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

import { OpportunityQnaMessage } from '../components/opportunity-detail.models';

const STORAGE_KEY = 'og7.opportunity-conversation-drafts';
const MAX_ITEMS_PER_OPPORTUNITY = 25;

type DraftMap = Readonly<Record<string, readonly OpportunityQnaMessage[]>>;

@Injectable({ providedIn: 'root' })
export class OpportunityConversationDraftsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);

  private readonly draftsSig = signal<DraftMap>(this.restore());

  messagesFor(itemId: string | null | undefined): readonly OpportunityQnaMessage[] {
    if (!itemId) {
      return [];
    }

    return this.draftsSig()[itemId] ?? [];
  }

  append(itemId: string, message: OpportunityQnaMessage): void {
    const normalizedItemId = itemId.trim();
    if (!normalizedItemId) {
      return;
    }

    const current = this.draftsSig();
    const existing = current[normalizedItemId] ?? [];
    const next: DraftMap = {
      ...current,
      [normalizedItemId]: [message, ...existing].slice(0, MAX_ITEMS_PER_OPPORTUNITY),
    };

    this.draftsSig.set(next);
    this.persist(next);
  }

  private restore(): DraftMap {
    if (!this.browser) {
      return {};
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }

      const entries = Object.entries(parsed as Record<string, unknown>);
      const restored: Record<string, readonly OpportunityQnaMessage[]> = {};
      for (const [itemId, messages] of entries) {
        if (!Array.isArray(messages) || !itemId.trim()) {
          continue;
        }

        const validMessages = messages.filter((entry): entry is OpportunityQnaMessage => this.isQnaMessage(entry));
        if (validMessages.length) {
          restored[itemId] = validMessages.slice(0, MAX_ITEMS_PER_OPPORTUNITY);
        }
      }

      return restored;
    } catch {
      return {};
    }
  }

  private persist(value: DraftMap): void {
    if (!this.browser) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }

  private isQnaMessage(value: unknown): value is OpportunityQnaMessage {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const entry = value as Partial<OpportunityQnaMessage>;
    return (
      typeof entry.id === 'string' &&
      typeof entry.author === 'string' &&
      typeof entry.content === 'string' &&
      typeof entry.createdAt === 'string' &&
      ['questions', 'offers', 'history'].includes(entry.tab ?? '')
    );
  }
}
