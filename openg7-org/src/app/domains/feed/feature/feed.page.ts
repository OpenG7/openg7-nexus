import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { FeedPublishSectionComponent } from './feed-publish-section/feed-publish-section.component';
import { Og7FeedStreamComponent } from './og7-feed-stream/og7-feed-stream.component';
import { FeedRealtimeService } from './services/feed-realtime.service';

@Component({
  selector: 'og7-feed-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, FeedPublishSectionComponent, Og7FeedStreamComponent],
  templateUrl: './feed.page.html',
  styleUrls: ['./feed.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedPage {
  private readonly feed = inject(FeedRealtimeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly items = this.feed.items;
  readonly loading = this.feed.loading;
  readonly error = this.feed.error;
  readonly unreadCount = computed(() => this.feed.unreadCount());
  readonly connectionState = this.feed.connectionState;
  protected readonly shortcutsHeadingId = 'feed-shortcuts-heading';

  constructor() {
    effect(() => {
      if (!this.feed.hasHydrated()) {
        this.feed.loadInitial();
      }
    });
  }

  @HostListener('window:focus')
  refreshOnFocus(): void {
    this.feed.refreshConnection();
  }

  @HostListener('document:keydown', ['$event'])
  handleShortcuts(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    const target = event.target;
    if (target instanceof HTMLElement) {
      const tagName = target.tagName;
      if (
        target.isContentEditable ||
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT'
      ) {
        return;
      }
    }
    const key = event.key.toLowerCase();
    if (key === 'r') {
      event.preventDefault();
      this.handleRefresh();
    }
    if (key === 'l') {
      event.preventDefault();
      this.handleLoadMore();
    }
  }

  handleLoadMore(): void {
    this.feed.loadMore();
  }

  handleRefresh(): void {
    this.feed.reload();
  }

  openItem(itemId: string): void {
    const item = this.items().find(entry => entry.id === itemId);
    const routeSegment =
      item?.type === 'ALERT'
        ? 'alerts'
        : item?.type === 'INDICATOR'
          ? 'indicators'
          : 'opportunities';
    void this.router.navigate([routeSegment, itemId], {
      relativeTo: this.route,
      queryParamsHandling: 'preserve',
    });
  }

  closeItem(): void {
    this.feed.openDrawer(null);
    void this.router.navigate(['./'], {
      relativeTo: this.route,
      queryParamsHandling: 'preserve',
    });
  }
}
