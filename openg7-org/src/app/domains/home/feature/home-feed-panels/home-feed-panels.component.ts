import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FeedItem } from '@app/domains/feed/feature/models/feed.models';
import { TranslateModule } from '@ngx-translate/core';

export type HomeFeedPanelKind = 'alerts' | 'opportunities' | 'indicators';

@Component({
  selector: 'og7-home-feed-panels',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './home-feed-panels.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeFeedPanelsComponent {
  readonly alertItems = input.required<ReadonlyArray<FeedItem>>();
  readonly opportunityItems = input.required<ReadonlyArray<FeedItem>>();
  readonly indicatorItems = input.required<ReadonlyArray<FeedItem>>();
  readonly subtitleForItem = input.required<(item: FeedItem) => string>();
  readonly itemOpened = output<FeedItem>();
  readonly connectRequested = output<FeedItem>();
  readonly viewAllRequested = output<HomeFeedPanelKind>();

  protected trackFeedItem(index: number, item: FeedItem): string {
    return item.id ?? `feed-${index}`;
  }

  protected subtitle(item: FeedItem): string {
    return this.subtitleForItem()(item);
  }

  protected openItem(item: FeedItem): void {
    this.itemOpened.emit(item);
  }

  protected requestConnection(item: FeedItem): void {
    this.connectRequested.emit(item);
  }

  protected viewAll(panel: HomeFeedPanelKind): void {
    this.viewAllRequested.emit(panel);
  }
}
