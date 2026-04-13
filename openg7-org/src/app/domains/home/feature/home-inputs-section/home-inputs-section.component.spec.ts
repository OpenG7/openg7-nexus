import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { HomeInputsSectionComponent } from './home-inputs-section.component';

describe('HomeInputsSectionComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomeInputsSectionComponent, TranslateModule.forRoot()],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      'en',
      {
        home: {
          inputs: {
            title: 'Inputs & capacities',
            description: 'Resource overview',
            cards: {
              electricity: { title: 'Electricity', description: 'Grid' },
              oil: { title: 'Oil', description: 'Logistics' },
              'operations-support': { title: 'Operations support', description: 'Execution' },
              workforce: { title: 'Workforce', description: 'Talent' },
              materials: { title: 'Materials', description: 'Supply' },
            },
          },
        },
      },
      true,
    );
    translate.use('en');
  });

  it('renders heading and cards', () => {
    const fixture = TestBed.createComponent(HomeInputsSectionComponent);
    fixture.detectChanges();

    const section: HTMLElement | null = fixture.nativeElement.querySelector('[data-og7="home-inputs"]');
    expect(section).toBeTruthy();
    const heading: HTMLElement | null = fixture.nativeElement.querySelector('#home-inputs-heading');
    expect(heading?.textContent).toContain('Inputs & capacities');
    const cards = fixture.nativeElement.querySelectorAll('[data-og7="home-inputs"] article');
    expect(cards.length).toBe(5);
    const operationsSupportCard: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-og7="home-inputs"] [data-og7-id="operations-support"]'
    );
    expect(operationsSupportCard?.textContent).toContain('Operations support');
  });
});
