import { TestBed } from '@angular/core/testing';
import {
  DEFAULT_FILTER_VALUES,
  FILTER_KEYS,
  FILTER_OPTIONS_BY_KEY,
} from '@app/domains/marketing/pages/strategic-sectors.models';
import { TranslateModule } from '@ngx-translate/core';

import { StrategicSectorsFilterRailComponent } from './strategic-sectors-filter-rail.component';

describe('StrategicSectorsFilterRailComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StrategicSectorsFilterRailComponent, TranslateModule.forRoot()],
    });
  });

  it('renders one select per filter key', () => {
    const fixture = TestBed.createComponent(StrategicSectorsFilterRailComponent);
    fixture.componentRef.setInput('filterKeys', FILTER_KEYS);
    fixture.componentRef.setInput('values', DEFAULT_FILTER_VALUES);
    fixture.componentRef.setInput('optionsByKey', FILTER_OPTIONS_BY_KEY);
    fixture.detectChanges();

    const selects = fixture.nativeElement.querySelectorAll('select');
    expect(selects.length).toBe(FILTER_KEYS.length);
  });

  it('emits filterChange when a select value changes', () => {
    const fixture = TestBed.createComponent(StrategicSectorsFilterRailComponent);
    fixture.componentRef.setInput('filterKeys', FILTER_KEYS);
    fixture.componentRef.setInput('values', DEFAULT_FILTER_VALUES);
    fixture.componentRef.setInput('optionsByKey', FILTER_OPTIONS_BY_KEY);
    const spy = jasmine.createSpy('filterChange');
    fixture.componentInstance.filterChange.subscribe(spy);
    fixture.detectChanges();

    const firstSelect = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    firstSelect.value = 'QC';
    firstSelect.dispatchEvent(new Event('change'));

    expect(spy).toHaveBeenCalledWith({ key: 'source', value: 'QC' });
  });

  it('emits reset and apply events from action buttons', () => {
    const fixture = TestBed.createComponent(StrategicSectorsFilterRailComponent);
    fixture.componentRef.setInput('filterKeys', FILTER_KEYS);
    fixture.componentRef.setInput('values', DEFAULT_FILTER_VALUES);
    fixture.componentRef.setInput('optionsByKey', FILTER_OPTIONS_BY_KEY);
    const resetSpy = jasmine.createSpy('resetFilters');
    const applySpy = jasmine.createSpy('applyFilters');
    fixture.componentInstance.resetFilters.subscribe(resetSpy);
    fixture.componentInstance.applyFilters.subscribe(applySpy);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons[0]?.click();
    buttons[1]?.click();

    expect(resetSpy).toHaveBeenCalled();
    expect(applySpy).toHaveBeenCalled();
  });
});
