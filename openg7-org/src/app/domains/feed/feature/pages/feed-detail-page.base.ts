import { HttpErrorResponse } from '@angular/common/http';
import { Directive, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { selectProvinces, selectSectors } from '@app/state/catalog/catalog.selectors';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';

import { FeedItem } from '../models/feed.models';
import { FeedRealtimeService } from '../services/feed-realtime.service';

@Directive()
export abstract class FeedDetailPageBase<TItem extends FeedItem = FeedItem> {
  protected readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  protected readonly feed = inject(FeedRealtimeService);
  protected readonly store = inject(Store);
  protected readonly translate = inject(TranslateService);
  protected readonly destroyRef = inject(DestroyRef);
  private readonly collectionFallbackAllowed = signal(true);

  protected readonly itemId = toSignal(this.route.paramMap.pipe(map(params => params.get('itemId'))), {
    initialValue: this.route.snapshot.paramMap.get('itemId'),
  });
  protected readonly reloadVersion = signal(0);

  protected readonly detailItem = signal<TItem | null>(null);
  protected readonly detailLoading = signal(false);
  protected readonly detailError = signal<string | null>(null);
  protected readonly headerCompact = signal(false);

  protected readonly provinces = this.store.selectSignal(selectProvinces);
  protected readonly sectors = this.store.selectSignal(selectSectors);

  protected readonly provinceNameMap = computed(() => {
    const map = new Map<string, string>();
    for (const province of this.provinces()) {
      map.set(province.id, province.name);
    }
    return map;
  });

  protected readonly sectorNameMap = computed(() => {
    const map = new Map<string, string>();
    for (const sector of this.sectors()) {
      map.set(sector.id, sector.name);
    }
    return map;
  });

  protected readonly selectedItem = computed<TItem | null>(() => {
    const id = this.itemId();
    if (!id) {
      return null;
    }

    const resolved = this.detailItem();
    if (resolved?.id === id) {
      return resolved;
    }

    if (!this.collectionFallbackAllowed()) {
      return null;
    }

    const item = this.feed.items().find(entry => entry.id === id) ?? null;
    return this.isExpectedItem(item) ? item : null;
  });

  constructor() {
    effect(onCleanup => {
      const itemId = this.itemId();
      this.reloadVersion();
      this.beforeItemLoad();
      this.collectionFallbackAllowed.set(true);
      this.detailItem.set(null);
      this.detailError.set(null);

      if (!itemId) {
        this.collectionFallbackAllowed.set(false);
        this.onMissingItemId();
        this.detailLoading.set(false);
        return;
      }

      let cancelled = false;
      this.detailLoading.set(true);

      void this.feed
        .findItemById(itemId)
        .then(item => {
          if (cancelled) {
            return;
          }

          if (!this.isExpectedItem(item)) {
            this.collectionFallbackAllowed.set(false);
            this.onUnexpectedItem(item);
            return;
          }

          this.detailItem.set(item);
        })
        .catch(error => {
          if (cancelled) {
            return;
          }

          this.collectionFallbackAllowed.set(false);
          this.onLoadError(error);
        })
        .finally(() => {
          if (!cancelled) {
            this.detailLoading.set(false);
          }
        });

      onCleanup(() => {
        cancelled = true;
      });
    });
  }

  protected beforeItemLoad(): void {
    // Optional hook for subclasses.
  }

  protected onMissingItemId(): void {
    // Optional hook for subclasses.
  }

  protected onUnexpectedItem(_item: FeedItem | null): void {
    // Optional hook for subclasses.
  }

  protected onLoadError(error: unknown): void {
    this.detailError.set(this.resolveLoadError(error));
  }

  protected triggerDetailReload(): void {
    this.reloadVersion.update(version => version + 1);
  }

  protected updateHeaderCompactFromScroll(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.headerCompact.set(window.scrollY > 56);
  }

  protected isExpectedItem(item: FeedItem | null): item is TItem {
    return item !== null;
  }

  protected resolveLoadError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim().length) {
        return error.error;
      }
      if (typeof error.error?.message === 'string' && error.error.message.length) {
        return error.error.message;
      }
      if (typeof error.message === 'string' && error.message.length) {
        return error.message;
      }
    }

    if (error instanceof Error && error.message.length) {
      return error.message;
    }

    return this.translate.instant('feed.error.generic');
  }
}
