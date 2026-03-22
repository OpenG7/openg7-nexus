import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import {
  OpportunityDetailSectionItem,
  OpportunityDocumentLink,
  OpportunityQnaMessage,
  OpportunityQnaTab,
} from './opportunity-detail.models';
import { Og7PublicationMetadataCardComponent } from './publication-metadata-card.component';
import { OpportunityQnaComponent } from './opportunity-qna.component';
import { FeedPublicationMetadata } from '../models/feed.models';

@Component({
  selector: 'og7-opportunity-detail-body',
  standalone: true,
  imports: [CommonModule, TranslateModule, OpportunityQnaComponent, Og7PublicationMetadataCardComponent],
  templateUrl: './opportunity-detail-body.component.html',
  styleUrl: './opportunity-detail-body.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpportunityDetailBodyComponent {
  readonly summaryHeadline = input.required<string>();
  readonly periodLabel = input.required<string>();
  readonly deliveryPoint = input.required<string>();
  readonly pricingType = input.required<string>();
  readonly publicationMetadata = input<FeedPublicationMetadata | null>(null);

  readonly specs = input<readonly OpportunityDetailSectionItem[]>([]);
  readonly terms = input<readonly OpportunityDetailSectionItem[]>([]);
  readonly documents = input<readonly OpportunityDocumentLink[]>([]);

  readonly qnaMessages = input<readonly OpportunityQnaMessage[]>([]);
  readonly qnaTab = input<OpportunityQnaTab>('questions');

  readonly qnaTabChange = output<OpportunityQnaTab>();
  readonly qnaSubmitReply = output<string>();
}
