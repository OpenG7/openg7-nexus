import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { OpportunitySyncState } from './opportunity-detail.models';

@Component({
  selector: 'og7-opportunity-detail-header',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './opportunity-detail-header.component.html',
  styleUrl: './opportunity-detail-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpportunityDetailHeaderComponent {
  readonly title = input.required<string>();
  readonly breadcrumbType = input<string | null>(null);
  readonly routeLabel = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly tags = input<readonly string[]>([]);
  readonly statusLabel = input.required<string>();
  readonly urgencyLabel = input<string | null>(null);
  readonly visibilityLabel = input.required<string>();
  readonly compact = input(false);
  readonly saved = input(false);
  readonly syncState = input<OpportunitySyncState>('synced');
  readonly ownerMode = input(false);
  readonly hasExistingOffer = input(false);

  readonly makeOffer = output<void>();
  readonly toggleSave = output<void>();
  readonly share = output<void>();
  readonly tagClick = output<string>();
  readonly duplicate = output<void>();
  readonly report = output<void>();
  readonly archive = output<void>();

  protected readonly breadcrumbQueryParams = computed(() => {
    const type = this.breadcrumbType();
    return type ? { type } : {};
  });

  protected readonly makeOfferLabelKey = computed(() =>
    this.hasExistingOffer()
      ? 'feed.opportunity.detail.cta.openExistingOffer'
      : 'feed.opportunity.detail.cta.makeOffer'
  );

  protected trackTag(index: number, tag: string): string {
    return `${tag}-${index}`;
  }
}
