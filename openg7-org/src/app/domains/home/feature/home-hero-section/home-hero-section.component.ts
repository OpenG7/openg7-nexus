import { NgComponentOutlet, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, PLATFORM_ID, Type, inject, input, output, signal } from '@angular/core';
import { FeedItem } from '@app/domains/feed/feature/models/feed.models';
import { HomeFeedPanelKind } from '@app/domains/home/feature/home-feed-panels/home-feed-panels.component';
import { HomeCorridorsRealtimeComponent } from '@app/domains/home/feature/home-corridors-realtime/home-corridors-realtime.component';
import { HomeCtaRowComponent } from '@app/domains/home/feature/home-cta-row/home-cta-row.component';
import { HomeFeedPanelsComponent } from '@app/domains/home/feature/home-feed-panels/home-feed-panels.component';
import { HomeFeedSectionComponent } from '@app/domains/home/feature/home-feed-section/home-feed-section.component';
import { HomeMetricsStripComponent } from '@app/domains/home/feature/home-metrics-strip/home-metrics-strip.component';
import { HomeFeedFilter, HomeFeedScope } from '@app/domains/home/services/home-feed.service';
import { HeroSectionComponent } from '@app/shared/components/hero/hero-section/hero-section.component';
import { StatMetric } from '@app/shared/components/hero/hero-stats/hero-stats.component';

@Component({
  selector: 'og7-home-hero-section',
  standalone: true,
  imports: [
    HeroSectionComponent,
    NgComponentOutlet,
    HomeFeedSectionComponent,
    HomeCtaRowComponent,
    HomeMetricsStripComponent,
    HomeFeedPanelsComponent,
    HomeCorridorsRealtimeComponent,
  ],
  templateUrl: './home-hero-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « domains/home/feature » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Home Hero Section ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns HomeHeroSectionComponent gérée par le framework.
 */
export class HomeHeroSectionComponent {
  private readonly platformId = inject(PLATFORM_ID);
  readonly stats = input.required<StatMetric[]>();
  readonly feedScopes = input.required<ReadonlyArray<{ id: HomeFeedScope; label: string }>>();
  readonly activeFeedScope = input.required<HomeFeedScope>();
  readonly feedFilters = input.required<ReadonlyArray<{ id: HomeFeedFilter; label: string }>>();
  readonly activeFeedFilter = input.required<HomeFeedFilter>();
  readonly searchDraft = input.required<string>();
  readonly homeFeedLoading = input.required<boolean>();
  readonly intrantsValue = input.required<string>();
  readonly offersCount = input.required<string>();
  readonly activeCount = input.required<string>();
  readonly requestsCount = input.required<string>();
  readonly corridorsCount = input.required<string>();
  readonly lastFeedUpdate = input.required<string | null>();
  readonly systemStatusKey = input.required<string>();
  readonly systemStatusDotClass = input.required<string>();
  readonly alertItems = input.required<ReadonlyArray<FeedItem>>();
  readonly opportunityItems = input.required<ReadonlyArray<FeedItem>>();
  readonly indicatorItems = input.required<ReadonlyArray<FeedItem>>();
  readonly alertPanelLimit = input.required<number>();
  readonly opportunityPanelLimit = input.required<number>();
  readonly indicatorPanelLimit = input.required<number>();
  readonly subtitleForItem = input.required<(item: FeedItem) => string>();

  @Output() readonly scopeChanged = new EventEmitter<HomeFeedScope>();
  @Output() readonly filterChanged = new EventEmitter<HomeFeedFilter>();
  @Output() readonly searchChanged = new EventEmitter<string>();
  readonly panelItemOpened = output<FeedItem>();
  readonly panelConnectRequested = output<FeedItem>();
  readonly panelViewAllRequested = output<HomeFeedPanelKind>();
  readonly isBrowser = isPlatformBrowser(this.platformId);
  readonly backdropComponent = signal<Type<unknown> | null>(null);

  constructor() {
    if (this.isBrowser) {
      void this.loadBackdrop();
    }
  }

  private async loadBackdrop(): Promise<void> {
    const module = await import('./home-hero-galaxy/home-hero-galaxy.client.component');
    this.backdropComponent.set(module.HomeHeroGalaxyClientComponent);
  }
}

