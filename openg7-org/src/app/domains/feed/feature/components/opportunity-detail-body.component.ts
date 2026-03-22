import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { FeedPublicationMetadata } from '../models/feed.models';

import {
  OpportunityDetailSectionItem,
  OpportunityDocumentLink,
  OpportunityQnaMessage,
  OpportunityQnaTab,
} from './opportunity-detail.models';
import { Og7OpportunityHydrocarbonDetailComponent } from './opportunity-hydrocarbon-detail.component';
import { OpportunityQnaComponent } from './opportunity-qna.component';
import { Og7PublicationMetadataCardComponent } from './publication-metadata-card.component';

@Component({
  selector: 'og7-opportunity-detail-body',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    OpportunityQnaComponent,
    Og7PublicationMetadataCardComponent,
    Og7OpportunityHydrocarbonDetailComponent,
  ],
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
