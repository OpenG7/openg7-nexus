import { TestBed } from '@angular/core/testing';
import { FiltersService } from '@app/core/filters.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { HomeFiltersSectionComponent } from './home-filters-section.component';

describe('HomeFiltersSectionComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomeFiltersSectionComponent, TranslateModule.forRoot()],
      providers: [FiltersService],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      'en',
      {
        home: {
          filters: {
            kicker: 'Refine the view',
            title: 'Filter exchanges',
            description: 'Adjust filters',
            tradeModeLabel: 'Trade mode',
            tradeModeDescription: 'Choose mode',
            sectorLabel: 'Sectors',
            sectorDescription: 'Select a sector',
          },
        },
        map: {
          filters: {
            tradeMode: {
              all: 'All',
              export: 'Export',
              import: 'Import',
            },
          },
        },
        sectors: {
          energy: 'Energy',
          mining: 'Mining',
          manufacturing: 'Manufacturing',
          construction: 'Construction',
          'agri-food': 'Agri-food',
          'digital-services': 'Digital services',
          'transport-logistics': 'Transport & logistics',
          'life-sciences': 'Life sciences',
        },
      },
      true,
    );
    translate.use('en');
  });

  it('shows filters heading and renders filter component', () => {
    const fixture = TestBed.createComponent(HomeFiltersSectionComponent);
    fixture.detectChanges();

    const heading: HTMLElement | null = fixture.nativeElement.querySelector('#home-filters-heading');
    expect(heading?.textContent).toContain('Filter exchanges');
    const filtersHost = fixture.nativeElement.querySelector('[data-og7="filters"]');
    expect(filtersHost).toBeTruthy();
  });
});
