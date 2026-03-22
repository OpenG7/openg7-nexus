import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { FeedPublicationMetadata } from '../models/feed.models';
import { AlertSourceEntry, AlertTimelineEntry, AlertUpdateEntry } from './alert-detail.models';
import { Og7PublicationMetadataCardComponent } from './publication-metadata-card.component';

@Component({
  selector: 'og7-alert-detail-body',
  standalone: true,
  imports: [CommonModule, TranslateModule, Og7PublicationMetadataCardComponent],
  templateUrl: './alert-detail-body.component.html',
  styleUrl: './alert-detail-body.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertDetailBodyComponent {
  readonly summaryHeadline = input.required<string>();
  readonly summaryPoints = input<readonly string[]>([]);
  readonly impactPoints = input<readonly string[]>([]);
  readonly zones = input<readonly string[]>([]);
  readonly infrastructures = input<readonly string[]>([]);
  readonly timeline = input<readonly AlertTimelineEntry[]>([]);
  readonly updates = input<readonly AlertUpdateEntry[]>([]);
  readonly recommendations = input<readonly string[]>([]);
  readonly sources = input<readonly AlertSourceEntry[]>([]);
  readonly publicationMetadata = input<FeedPublicationMetadata | null>(null);

  protected trackByValue(_index: number, value: string): string {
    return value;
  }

  protected trackByTimelineEntry(_index: number, entry: AlertTimelineEntry): string {
    return entry.id;
  }

  protected trackByUpdateEntry(_index: number, entry: AlertUpdateEntry): string {
    return entry.id;
  }

  protected trackBySourceEntry(_index: number, entry: AlertSourceEntry): string {
    return entry.id;
  }
}
