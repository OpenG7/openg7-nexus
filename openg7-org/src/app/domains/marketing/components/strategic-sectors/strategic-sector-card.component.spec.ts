import { TestBed } from '@angular/core/testing';
import { SECTOR_CARDS } from '@app/domains/marketing/pages/strategic-sectors.models';
import { TranslateModule } from '@ngx-translate/core';

import { StrategicSectorCardComponent } from './strategic-sector-card.component';

describe('StrategicSectorCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StrategicSectorCardComponent, TranslateModule.forRoot()],
    });
  });

  it('renders sector label and all metrics', () => {
    const fixture = TestBed.createComponent(StrategicSectorCardComponent);
    const card = SECTOR_CARDS[0]!;
    fixture.componentRef.setInput('card', card);
    fixture.detectChanges();

    const title: HTMLElement | null = fixture.nativeElement.querySelector('h3');
    expect(title?.textContent).toContain(card.labelKey);

    const metrics = fixture.nativeElement.querySelectorAll('ul li');
    expect(metrics.length).toBe(card.metrics.length);
  });
});
