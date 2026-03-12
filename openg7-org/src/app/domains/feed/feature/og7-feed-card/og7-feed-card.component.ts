import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  HostListener,
  computed,
  input,
  output,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { FeedItem } from '../models/feed.models';
import { JsonDateAgoPipe } from '../pipes/json-date-ago.pipe';

@Component({
  selector: 'og7-feed-card',
  standalone: true,
  imports: [CommonModule, TranslateModule, JsonDateAgoPipe],
  templateUrl: './og7-feed-card.component.html',
  styleUrls: ['./og7-feed-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Og7FeedCardComponent {
  readonly item = input.required<FeedItem>();
  readonly highlight = input(false);
  readonly disabled = input(false);
  readonly saved = input(false);
  readonly fromLabel = input<string | null>(null);
  readonly toLabel = input<string | null>(null);
  readonly sectorLabel = input<string | null>(null);

  readonly open = output<FeedItem>();
  readonly save = output<FeedItem>();
  readonly contact = output<FeedItem>();

  protected readonly urgencyBadgeClass = computed(() => {
    const urgency = this.item().urgency ?? 0;
    if (urgency >= 3) {
      return 'feed-card__badge--urgent';
    }
    if (urgency === 2) {
      return 'feed-card__badge--warning';
    }
    return '';
  });

  protected readonly statusBadgeClass = computed(() => {
    const status = this.item().status;
    if (status === 'pending') {
      return 'feed-card__badge--pending';
    }
    if (status === 'failed') {
      return 'feed-card__badge--error';
    }
    return '';
  });

  @HostBinding('attr.tabindex')
  readonly tabIndex = 0;

  @HostBinding('attr.role')
  readonly role = 'article';

  @HostBinding('class.is-highlighted')
  get isHighlighted(): boolean {
    return this.highlight();
  }

  protected handleOpen(): void {
    if (this.disabled()) {
      return;
    }
    this.open.emit(this.item());
  }

  protected handleSave(): void {
    if (this.disabled()) {
      return;
    }
    this.save.emit(this.item());
  }

  protected handleContact(): void {
    if (this.disabled()) {
      return;
    }
    this.contact.emit(this.item());
  }

  @HostListener('keydown.enter', ['$event'])
  @HostListener('keydown.space', ['$event'])
  protected onActivate(event: Event): void {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }
    event.preventDefault();
    this.handleOpen();
  }
}
