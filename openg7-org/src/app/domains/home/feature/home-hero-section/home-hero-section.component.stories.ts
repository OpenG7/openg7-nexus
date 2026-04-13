import { RouterTestingModule } from '@angular/router/testing';
import { provideStorybookEnTranslations } from '@app/core/i18n/storybook-translate.providers';
import { FeedItem } from '@app/domains/feed/feature/models/feed.models';
import {
  CorridorsRealtimeSnapshot,
  HomeCorridorsRealtimeService,
} from '@app/domains/home/services/home-corridors-realtime.service';
import { HomeFeedFilter, HomeFeedScope } from '@app/domains/home/services/home-feed.service';
import { StatMetric } from '@app/shared/components/hero/hero-stats/hero-stats.component';
import { TranslateModule } from '@ngx-translate/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { of } from 'rxjs';

import { HomeHeroSectionComponent } from './home-hero-section.component';

class StoryHomeCorridorsRealtimeService {
  loadSnapshot() {
    return of<CorridorsRealtimeSnapshot>({
      titleKey: 'home.corridorsRealtime.title',
      subtitleKey: 'home.corridorsRealtime.subtitle',
      items: [
        {
          id: 'qc-on-energy',
          label: 'Quebec -> Ontario',
          route: 'Hydro / battery inputs',
          meta: '2 active supply alerts',
        },
        {
          id: 'ab-bc-lumber',
          label: 'Alberta -> British Columbia',
          route: 'Wood products / modular build',
          meta: 'Capacity stable',
        },
      ],
      status: { level: 'ok', labelKey: 'home.corridorsRealtime.status.monitoring' },
      cta: { labelKey: 'home.corridorsRealtime.cta.viewMap' },
      timestamp: '2026-04-10T10:15:00.000Z',
    });
  }
}

const stats: StatMetric[] = [
  {
    id: 'tradeValue',
    labelKey: 'metrics.tradeValue',
    value: 2100000,
    kind: 'money',
  },
  {
    id: 'exchangeQty',
    labelKey: 'metrics.exchangeQty',
    value: 60,
    kind: 'count',
    suffixKey: 'metrics.transactions',
  },
  {
    id: 'sectors',
    labelKey: 'metrics.sectors',
    value: 5,
    kind: 'count',
  },
];

const feedScopes: ReadonlyArray<{ id: HomeFeedScope; label: string }> = [
  { id: 'canada', label: 'home.feed.tabs.canada' },
  { id: 'g7', label: 'home.feed.tabs.g7' },
  { id: 'world', label: 'home.feed.tabs.world' },
];

const feedFilters: ReadonlyArray<{ id: HomeFeedFilter; label: string }> = [
  { id: 'all', label: 'home.feed.filters.all' },
  { id: 'offer', label: 'home.feed.filters.offer' },
  { id: 'request', label: 'home.feed.filters.request' },
  { id: 'labor', label: 'home.feed.filters.labor' },
  { id: 'transport', label: 'home.feed.filters.transport' },
];

const alertItems: readonly FeedItem[] = [
  {
    id: 'story-alert-1',
    createdAt: '2026-04-10T09:10:00.000Z',
    type: 'ALERT',
    sectorId: 'energy',
    title: 'Voltage risk flagged on Ontario intertie',
    summary: 'Grid operators reported a moderate dispatch imbalance.',
    fromProvinceId: 'qc',
    toProvinceId: 'on',
    mode: 'EXPORT',
    source: { kind: 'GOV', label: 'OpenG7 Monitoring' },
    status: 'confirmed',
  },
];

const opportunityItems: readonly FeedItem[] = [
  {
    id: 'story-offer-1',
    createdAt: '2026-04-10T08:20:00.000Z',
    type: 'OFFER',
    sectorId: 'manufacturing',
    title: 'Battery enclosure line available this week',
    summary: 'Idle capacity for short-run fabrication.',
    fromProvinceId: 'qc',
    toProvinceId: 'on',
    mode: 'EXPORT',
    source: { kind: 'COMPANY', label: 'NordFab' },
    status: 'confirmed',
  },
  {
    id: 'story-request-1',
    createdAt: '2026-04-10T07:35:00.000Z',
    type: 'REQUEST',
    sectorId: 'transport-logistics',
    title: 'Cross-dock slot needed near Hamilton',
    summary: 'Cold-chain capable transfer point needed for 72h.',
    fromProvinceId: 'qc',
    toProvinceId: 'on',
    mode: 'EXPORT',
    source: { kind: 'PARTNER', label: 'Corridor Desk' },
    status: 'pending',
  },
];

const indicatorItems: readonly FeedItem[] = [
  {
    id: 'story-indicator-1',
    createdAt: '2026-04-10T06:45:00.000Z',
    type: 'INDICATOR',
    sectorId: 'agri-food',
    title: 'Cold-chain utilization trending upward',
    summary: 'Interprovincial reefer utilization is 12% above baseline.',
    fromProvinceId: 'mb',
    toProvinceId: 'on',
    mode: 'EXPORT',
    source: { kind: 'GOV', label: 'Stats Monitoring' },
    status: 'confirmed',
  },
];

function subtitleForItem(item: FeedItem): string {
  const from = item.fromProvinceId?.toUpperCase();
  const to = item.toProvinceId?.toUpperCase();
  if (from && to) {
    return `${from} -> ${to}`;
  }
  return item.sectorId ?? '';
}

const meta: Meta<HomeHeroSectionComponent> = {
  title: 'Features/Home/HeroSection',
  component: HomeHeroSectionComponent,
  decorators: [
    moduleMetadata({
      imports: [TranslateModule.forRoot(), RouterTestingModule],
      providers: [
        ...provideStorybookEnTranslations(),
        { provide: HomeCorridorsRealtimeService, useClass: StoryHomeCorridorsRealtimeService },
      ],
    }),
  ],
};

export default meta;

export const Default: StoryObj<HomeHeroSectionComponent> = {
  render: () => ({
    props: {
      stats,
      feedScopes,
      activeFeedScope: 'canada',
      feedFilters,
      activeFeedFilter: 'all',
      searchDraft: '',
      homeFeedLoading: false,
      intrantsValue: '$2.1M',
      offersCount: '14',
      activeCount: '28',
      requestsCount: '9',
      corridorsCount: '6',
      lastFeedUpdate: '2026-04-10T10:15:00.000Z',
      systemStatusKey: 'metrics.status.stable',
      systemStatusDotClass: 'bg-emerald-400',
      alertItems,
      opportunityItems,
      indicatorItems,
      alertPanelLimit: 4,
      opportunityPanelLimit: 4,
      indicatorPanelLimit: 4,
      subtitleForItem,
    },
  }),
};

