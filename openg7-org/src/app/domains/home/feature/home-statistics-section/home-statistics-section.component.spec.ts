import { TestBed } from '@angular/core/testing';
import { StatMetric } from '@app/shared/components/hero/hero-stats/hero-stats.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { HomeStatisticsSectionComponent } from './home-statistics-section.component';

describe('HomeStatisticsSectionComponent', () => {
  const stats: StatMetric[] = [
    {
      id: 'tradeValue',
      labelKey: 'metrics.tradeValue',
      value: 1400000,
      kind: 'money',
    },
    {
      id: 'exchangeQty',
      labelKey: 'metrics.exchangeQty',
      value: 37,
      kind: 'count',
      suffixKey: 'metrics.transactions',
    },
    {
      id: 'sectors',
      labelKey: 'metrics.sectors',
      value: 4,
      kind: 'count',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomeStatisticsSectionComponent, TranslateModule.forRoot()],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      'en',
      {
        home: {
          statistics: {
            kicker: 'Key indicators',
            title: 'Snapshot',
            description: 'Description',
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

  it('displays heading and description', () => {
    const fixture = TestBed.createComponent(HomeStatisticsSectionComponent);
    fixture.componentRef.setInput('stats', stats);
    fixture.detectChanges();

    const heading: HTMLElement | null = fixture.nativeElement.querySelector(
      '#home-statistics-heading',
    );
    expect(heading?.textContent).toContain('Snapshot');
    const description: HTMLElement | null = fixture.nativeElement.querySelector(
      '#home-statistics-description',
    );
    expect(description?.textContent).toContain('Description');
  });

  it('renders stats list with three entries', () => {
    const fixture = TestBed.createComponent(HomeStatisticsSectionComponent);
    fixture.componentRef.setInput('stats', stats);
    fixture.detectChanges();

    const entries = fixture.nativeElement.querySelectorAll('og7-hero-stats li');
    expect(entries.length).toBe(3);
  });
});
