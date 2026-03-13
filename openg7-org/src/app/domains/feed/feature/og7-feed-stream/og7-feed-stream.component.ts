import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { selectProvinces, selectSectors } from '@app/state/catalog/catalog.selectors';
import {
  feedModeSig,
  feedSearchSig,
  feedSortSig,
  feedTypeSig,
  focusItemIdSig,
  fromProvinceIdSig,
  hasActiveFiltersSig,
  sectorIdSig,
  toProvinceIdSig,
} from '@app/state/shared-feed-signals';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

import { buildFeedFavoriteKey } from '../feed-item.helpers';
import { FeedItem, FeedItemType, FeedRealtimeConnectionState, FeedSort, FlowMode } from '../models/feed.models';
import { Og7FeedCardComponent } from '../og7-feed-card/og7-feed-card.component';
import { Og7FeedPostDrawerComponent } from '../og7-feed-post-drawer/og7-feed-post-drawer.component';
import { FeedRealtimeService } from '../services/feed-realtime.service';

@Component({
  selector: 'og7-feed-stream',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    Og7FeedCardComponent,
    Og7FeedPostDrawerComponent,
  ],
  templateUrl: './og7-feed-stream.component.html',
  styleUrls: ['./og7-feed-stream.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Og7FeedStreamComponent {
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly feed = inject(FeedRealtimeService);
  private readonly store = inject(Store);

  readonly items = input<readonly FeedItem[]>([]);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly unreadCount = input(0);
  readonly highlightedItemId = input<string | null>(null);
  readonly savedKeys = input<ReadonlySet<string>>(new Set<string>());
  readonly connectionState = input.required<FeedRealtimeConnectionState>();

  readonly loadMore = output<void>();
  readonly refresh = output<void>();
  readonly openItem = output<string>();
  readonly closeItem = output<void>();
  readonly saveItem = output<FeedItem>();
  readonly contactItem = output<FeedItem>();
  readonly composeRequested = output<void>();

  private readonly sentinelRef = viewChild<ElementRef<HTMLElement>>('sentinel');
  private lastFocusedElement: HTMLElement | null = null;
  private lastScrolledHighlightedId: string | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly fromProvinceId = fromProvinceIdSig;
  protected readonly toProvinceId = toProvinceIdSig;
  protected readonly sectorId = sectorIdSig;
  protected readonly selectedType = feedTypeSig;
  protected readonly selectedMode = feedModeSig;
  protected readonly searchTerm = feedSearchSig;
  protected readonly sortOrder = feedSortSig;
  protected readonly hasFilters = hasActiveFiltersSig;

  protected readonly provinces = this.store.selectSignal(selectProvinces);
  protected readonly sectors = this.store.selectSignal(selectSectors);

  protected readonly provinceLabelMap = computed(() => {
    const map = new Map<string, string>();
    for (const province of this.provinces()) {
      map.set(province.id, province.name);
    }
    return map;
  });

  protected readonly sectorLabelMap = computed(() => {
    const map = new Map<string, string>();
    for (const sector of this.sectors()) {
      map.set(sector.id, sector.name);
    }
    return map;
  });

  protected readonly onboardingVisible = computed(() => !this.feed.onboardingSeen());
  protected readonly bannerVisible = computed(() => this.unreadCount() > 0);
  protected readonly connectionLabel = computed(() => {
    const state = this.connectionState();
    if (state.reconnecting()) {
      return 'feed.status.reconnecting';
    }
    if (!state.connected()) {
      return 'feed.status.offline';
    }
    return state.error() ? 'feed.status.degraded' : 'feed.status.online';
  });
  protected readonly showConnectionRetry = computed(() => {
    const state = this.connectionState();
    return !state.connected() || Boolean(state.error());
  });

  protected readonly selectedItem = computed(() => {
    const id = focusItemIdSig();
    if (!id) {
      return null;
    }
    return this.items().find(item => item.id === id) ?? null;
  });

  protected readonly typeOptions: FeedItemType[] = [
    'OFFER',
    'REQUEST',
    'ALERT',
    'TENDER',
    'CAPACITY',
    'INDICATOR',
  ];

  protected readonly modeOptions: FlowMode[] = ['BOTH', 'EXPORT', 'IMPORT'];

  protected readonly sortOptions: FeedSort[] = ['NEWEST', 'URGENCY', 'VOLUME', 'CREDIBILITY'];

  private observer?: IntersectionObserver;

  constructor() {
    effect(() => {
      const sentinel = this.sentinelRef();
      if (!sentinel) {
        return;
      }
      this.setupObserver(sentinel.nativeElement);
    });
    effect(() => {
      const highlightedItemId = this.highlightedItemId();
      if (!highlightedItemId) {
        this.lastScrolledHighlightedId = null;
        return;
      }
      if (this.lastScrolledHighlightedId === highlightedItemId) {
        return;
      }
      if (!this.items().some(item => item.id === highlightedItemId)) {
        return;
      }

      this.lastScrolledHighlightedId = highlightedItemId;
      this.zone.runOutsideAngular(() => {
        const focusTarget = () => this.scrollHighlightedCardIntoView(highlightedItemId);
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(focusTarget);
        } else {
          setTimeout(focusTarget, 0);
        }
      });
    });
    this.destroyRef.onDestroy(() => {
      if (this.searchTimer) {
        clearTimeout(this.searchTimer);
        this.searchTimer = null;
      }
    });
  }

  protected handleRefresh(): void {
    this.refresh.emit();
  }

  protected handleViewItem(item: FeedItem): void {
    if (typeof document !== 'undefined') {
      const active = document.activeElement;
      this.lastFocusedElement = active instanceof HTMLElement ? active : null;
    }
    this.openItem.emit(item.id);
  }

  protected handleSaveItem(item: FeedItem): void {
    this.saveItem.emit(item);
  }

  protected handleContactItem(item: FeedItem): void {
    this.contactItem.emit(item);
  }

  protected handleComposeRequested(): void {
    this.composeRequested.emit();
  }

  protected handleCloseDrawer(): void {
    focusItemIdSig.set(null);
    this.closeItem.emit();
    this.restoreFocus();
  }

  protected clearFilters(): void {
    fromProvinceIdSig.set(null);
    toProvinceIdSig.set(null);
    sectorIdSig.set(null);
    feedTypeSig.set(null);
    feedModeSig.set('BOTH');
    feedSearchSig.set('');
    feedSortSig.set('NEWEST');
  }

  protected updateSearch(value: string): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => feedSearchSig.set(value), 300);
  }

  protected updateType(value: string): void {
    feedTypeSig.set(value ? (value as FeedItemType) : null);
  }

  protected updateSector(value: string): void {
    sectorIdSig.set(value || null);
  }

  protected updateFromProvince(value: string): void {
    fromProvinceIdSig.set(value || null);
  }

  protected updateToProvince(value: string): void {
    toProvinceIdSig.set(value || null);
  }

  protected updateMode(value: string): void {
    feedModeSig.set((value as FlowMode) || 'BOTH');
  }

  protected updateSort(value: string): void {
    feedSortSig.set((value as FeedSort) || 'NEWEST');
  }

  protected resolveProvinceLabel(id: string | null | undefined): string | null {
    if (!id) {
      return null;
    }
    return this.provinceLabelMap().get(id) ?? id;
  }

  protected resolveSectorLabel(id: string | null | undefined): string | null {
    if (!id) {
      return null;
    }
    return this.sectorLabelMap().get(id) ?? id;
  }

  protected isSaved(item: FeedItem): boolean {
    const favoriteKey = buildFeedFavoriteKey(item);
    return favoriteKey ? this.savedKeys().has(favoriteKey) : false;
  }

  protected trackItem(index: number, item: FeedItem): string {
    return item.id ?? `item-${index}`;
  }

  private setupObserver(element: HTMLElement): void {
    this.destroyObserver();
    if (!element) {
      return;
    }
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(entries => {
        const [entry] = entries;
        if (!entry?.isIntersecting) {
          return;
        }
        if (this.loading()) {
          return;
        }
        this.zone.run(() => this.loadMore.emit());
      });
      this.observer.observe(element);
    });

    this.destroyRef.onDestroy(() => this.destroyObserver());
  }

  private destroyObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }
  }

  private restoreFocus(): void {
    if (typeof document === 'undefined') {
      return;
    }
    const target = this.lastFocusedElement;
    if (!target || typeof target.focus !== 'function') {
      return;
    }
    const invoke = () => target.focus();
    this.zone.runOutsideAngular(() => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(invoke);
      } else {
        setTimeout(invoke, 0);
      }
    });
  }

  private scrollHighlightedCardIntoView(itemId: string): void {
    const cards = this.hostRef.nativeElement.querySelectorAll('[data-feed-item-id]');
    const target = Array.from(cards).find(
      (card): card is HTMLElement => card instanceof HTMLElement && card.dataset['feedItemId'] === itemId
    );
    if (!target) {
      return;
    }

    if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (typeof target.focus === 'function') {
      target.focus();
    }
  }
}
