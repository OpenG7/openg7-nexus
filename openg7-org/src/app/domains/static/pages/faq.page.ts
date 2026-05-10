import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

const FAQ_ITEM_KEYS = ['platform', 'data', 'pricing', 'support', 'partners'] as const;
type FaqItemKey = (typeof FAQ_ITEM_KEYS)[number];
type FaqCategory = 'all' | FaqItemKey;
type FaqFeedbackValue = 'yes' | 'no';

interface FaqEntry {
  key: FaqItemKey;
  question: string;
  answers: string[];
  bullets: string[];
  searchText: string;
}

interface HighlightPart {
  text: string;
  matched: boolean;
}

@Component({
  standalone: true,
  selector: 'og7-faq-page',
  imports: [CommonModule, TranslateModule],
  templateUrl: './faq.page.html',
})
export class FaqPage {
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly translationVersion = signal(0);
  private queryDebounceHandle: ReturnType<typeof setTimeout> | null = null;

  protected readonly supportEmail = 'support@openg7.org';
  protected readonly supportPhone = '+1 (613) 555-0187';
  protected readonly supportPhoneHref = '+16135550187';
  protected readonly searchFieldId = 'faq-search';
  protected readonly categories: readonly FaqCategory[] = ['all', ...FAQ_ITEM_KEYS];
  protected readonly featuredCount = 5;

  protected readonly queryDraft = signal('');
  protected readonly debouncedQuery = signal('');
  protected readonly activeCategory = signal<FaqCategory>('all');
  protected readonly expandedItems = signal<ReadonlySet<FaqItemKey>>(new Set(FAQ_ITEM_KEYS));
  protected readonly feedbackByItem = signal<Partial<Record<FaqItemKey, FaqFeedbackValue>>>({});

  protected readonly entries = computed<FaqEntry[]>(() => {
    this.translationVersion();

    return FAQ_ITEM_KEYS.map((key) => {
      const question = this.translateText(`pages.faq.items.${key}.question`);
      const answers = this.translateList(`pages.faq.items.${key}.answers`);
      const bullets = this.translateList(`pages.faq.items.${key}.bullets`);
      const searchText = this.normalizeForSearch([question, ...answers, ...bullets].join(' '));

      return {
        key,
        question,
        answers,
        bullets,
        searchText,
      };
    });
  });

  protected readonly topEntries = computed(() => this.entries().slice(0, this.featuredCount));
  protected readonly normalizedQuery = computed(() =>
    this.normalizeForSearch(this.debouncedQuery()),
  );
  protected readonly hasQuery = computed(() => this.normalizedQuery().length > 0);

  protected readonly filteredEntries = computed(() => {
    const category = this.activeCategory();
    const query = this.normalizedQuery();

    return this.entries().filter((entry) => {
      if (category !== 'all' && entry.key !== category) {
        return false;
      }
      if (!query.length) {
        return true;
      }
      return entry.searchText.includes(query);
    });
  });

  protected readonly allVisibleExpanded = computed(() => {
    const visible = this.filteredEntries();
    if (!visible.length) {
      return false;
    }

    const expanded = this.expandedItems();
    return visible.every((entry) => expanded.has(entry.key));
  });

  constructor() {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.translationVersion.update((version) => version + 1));

    this.destroyRef.onDestroy(() => {
      if (this.queryDebounceHandle !== null) {
        clearTimeout(this.queryDebounceHandle);
        this.queryDebounceHandle = null;
      }
    });
  }

  protected onQueryInput(value: string): void {
    const nextValue = value ?? '';
    this.queryDraft.set(nextValue);

    if (this.queryDebounceHandle !== null) {
      clearTimeout(this.queryDebounceHandle);
      this.queryDebounceHandle = null;
    }

    this.queryDebounceHandle = setTimeout(() => {
      this.debouncedQuery.set(nextValue);
      if (this.normalizeForSearch(nextValue).length) {
        this.expandVisible();
      }
      this.queryDebounceHandle = null;
    }, 150);
  }

  protected clearQuery(): void {
    if (this.queryDebounceHandle !== null) {
      clearTimeout(this.queryDebounceHandle);
      this.queryDebounceHandle = null;
    }

    this.queryDraft.set('');
    this.debouncedQuery.set('');
  }

  protected setCategory(category: FaqCategory): void {
    this.activeCategory.set(category);
    this.expandVisible();
  }

  protected isCategoryActive(category: FaqCategory): boolean {
    return this.activeCategory() === category;
  }

  protected toggleVisibleItems(): void {
    if (this.allVisibleExpanded()) {
      this.collapseVisible();
      return;
    }
    this.expandVisible();
  }

  protected toggleItem(key: FaqItemKey): void {
    const next = new Set(this.expandedItems());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.expandedItems.set(next);
  }

  protected isItemExpanded(key: FaqItemKey): boolean {
    return this.expandedItems().has(key);
  }

  protected selectTopQuestion(key: FaqItemKey): void {
    this.activeCategory.set('all');
    const next = new Set(this.expandedItems());
    next.add(key);
    this.expandedItems.set(next);
  }

  protected setFeedback(item: FaqItemKey, value: FaqFeedbackValue): void {
    this.feedbackByItem.update((current) => ({
      ...current,
      [item]: value,
    }));
  }

  protected feedback(item: FaqItemKey): FaqFeedbackValue | null {
    return this.feedbackByItem()[item] ?? null;
  }

  protected highlightParts(value: string): HighlightPart[] {
    const query = this.queryDraft().trim();
    if (!query.length) {
      return [{ text: value, matched: false }];
    }

    const expression = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
    const segments = value.split(expression).filter((segment) => segment.length > 0);
    if (!segments.length) {
      return [{ text: value, matched: false }];
    }

    const loweredQuery = query.toLocaleLowerCase();
    return segments.map((segment) => ({
      text: segment,
      matched: segment.toLocaleLowerCase() === loweredQuery,
    }));
  }

  private expandVisible(): void {
    const next = new Set(this.expandedItems());
    for (const entry of this.filteredEntries()) {
      next.add(entry.key);
    }
    this.expandedItems.set(next);
  }

  private collapseVisible(): void {
    const next = new Set(this.expandedItems());
    for (const entry of this.filteredEntries()) {
      next.delete(entry.key);
    }
    this.expandedItems.set(next);
  }

  private translateText(key: string): string {
    const value = this.translate.instant(key);
    if (typeof value !== 'string' || value === key) {
      return '';
    }
    return value;
  }

  private translateList(key: string): string[] {
    const value = this.translate.instant(key);
    if (!value || value === key) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
    return typeof value === 'string' ? [value] : [];
  }

  private normalizeForSearch(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }

    const stringValue = value.toString();
    if (!stringValue.trim().length) {
      return '';
    }

    return stringValue
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
