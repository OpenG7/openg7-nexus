import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FeedItem } from '@app/domains/feed/feature/models/feed.models';
import { HomeFeedFilter, HomeFeedScope } from '@app/domains/home/services/home-feed.service';
import { StatMetric } from '@app/shared/components/hero/hero-stats/hero-stats.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { HomeHeroSectionComponent } from './home-hero-section.component';

describe('HomeHeroSectionComponent', () => {
  const stats: StatMetric[] = [
    { id: 'tradeValue', labelKey: 'metrics.tradeValue', value: 2100000, kind: 'money' },
    {
      id: 'exchangeQty',
      labelKey: 'metrics.exchangeQty',
      value: 60,
      kind: 'count',
      suffixKey: 'metrics.transactions',
    },
    { id: 'sectors', labelKey: 'metrics.sectors', value: 5, kind: 'count' },
  ];

  const feedScopes: ReadonlyArray<{ id: HomeFeedScope; label: string }> = [
    { id: 'canada', label: 'Canada' },
  ];
  const feedFilters: ReadonlyArray<{ id: HomeFeedFilter; label: string }> = [
    { id: 'all', label: 'All' },
  ];
  const emptyItems: readonly FeedItem[] = [];

  function setRequiredInputs(fixture: ComponentFixture<HomeHeroSectionComponent>): void {
    fixture.componentRef.setInput('stats', stats);
    fixture.componentRef.setInput('feedScopes', feedScopes);
    fixture.componentRef.setInput('activeFeedScope', 'canada');
    fixture.componentRef.setInput('feedFilters', feedFilters);
    fixture.componentRef.setInput('activeFeedFilter', 'all');
    fixture.componentRef.setInput('searchDraft', '');
    fixture.componentRef.setInput('homeFeedLoading', false);
    fixture.componentRef.setInput('intrantsValue', '0');
    fixture.componentRef.setInput('offersCount', '0');
    fixture.componentRef.setInput('activeCount', '0');
    fixture.componentRef.setInput('requestsCount', '0');
    fixture.componentRef.setInput('corridorsCount', '0');
    fixture.componentRef.setInput('lastFeedUpdate', null);
    fixture.componentRef.setInput('systemStatusKey', 'map.status');
    fixture.componentRef.setInput('systemStatusDotClass', 'bg-emerald-400');
    fixture.componentRef.setInput('alertItems', emptyItems);
    fixture.componentRef.setInput('opportunityItems', emptyItems);
    fixture.componentRef.setInput('indicatorItems', emptyItems);
    fixture.componentRef.setInput('alertPanelLimit', 4);
    fixture.componentRef.setInput('opportunityPanelLimit', 4);
    fixture.componentRef.setInput('indicatorPanelLimit', 4);
    fixture.componentRef.setInput('subtitleForItem', () => '');
  }

  function createFixture(): ComponentFixture<HomeHeroSectionComponent> {
    const fixture = TestBed.createComponent(HomeHeroSectionComponent);
    setRequiredInputs(fixture);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomeHeroSectionComponent, TranslateModule.forRoot(), RouterTestingModule],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      'en',
      {
        hero: {
          title: "Mapping Canada's Interprovincial Trade.",
          subtitle: 'Where supply meets demand, from coast to coast',
          quote: { text: 'Quote', author: 'Author' },
          actions: {
            viewSectors: 'View sectors',
            proMode: 'Pro mode',
            registerCompany: 'Register company',
            preview: 'Preview',
          },
        },
        metrics: {
          tradeValue: 'Trade value',
          exchangeQty: 'Exchange quantity',
          sectors: 'Sectors',
          transactions: 'transactions',
        },
        map: {
          badges: { units: { transactions: 'transactions' } },
        },
      },
      true,
    );
    translate.use('en');
  });

  it('renders hero copy and CTA container', () => {
    const fixture = createFixture();

    const section: HTMLElement = fixture.nativeElement.querySelector('og7-hero-section');
    expect(section).toBeTruthy();
    const heading: HTMLElement | null = section.querySelector('#home-hero-heading');
    expect(heading?.textContent).toContain("Mapping Canada's Interprovincial Trade.");
    expect(section.querySelector('[data-og7="hero"][data-og7-id="ctas"]')).toBeTruthy();
  });

  it('renders feed and corridor modules inside hero section', () => {
    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('og7-home-feed-section')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('og7-home-corridors-realtime')).toBeTruthy();
  });
});
