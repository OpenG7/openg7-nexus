import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { AlertContextAsideComponent } from './alert-context-aside.component';

describe('AlertContextAsideComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AlertContextAsideComponent, TranslateModule.forRoot()],
    });
  });

  it('renders empty states when related collections are unavailable', () => {
    const fixture = TestBed.createComponent(AlertContextAsideComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.alert-context-aside__empty').length).toBe(3);
    expect(fixture.nativeElement.querySelector('[data-og7-id="alert-open-all"]')).toBeTruthy();
  });

  it('emits navigation events for related entries and collection browse action', () => {
    const fixture = TestBed.createComponent(AlertContextAsideComponent);
    const openRelatedAlert = jasmine.createSpy('openRelatedAlert');
    const openRelatedOpportunity = jasmine.createSpy('openRelatedOpportunity');
    const openAllAlerts = jasmine.createSpy('openAllAlerts');

    fixture.componentInstance.openRelatedAlert.subscribe(openRelatedAlert);
    fixture.componentInstance.openRelatedOpportunity.subscribe(openRelatedOpportunity);
    fixture.componentInstance.openAllAlerts.subscribe(openAllAlerts);

    fixture.componentRef.setInput('relatedAlerts', [
      { id: 'alert-002', title: 'Wind advisory', region: 'Ontario', severity: 'High' },
    ]);
    fixture.componentRef.setInput('relatedOpportunities', [
      { id: 'opportunity-002', title: 'Spare transformer capacity', routeLabel: 'Quebec -> Ontario' },
    ]);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    (buttons[0] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();
    (buttons[2] as HTMLButtonElement).click();

    expect(openRelatedAlert).toHaveBeenCalledWith('alert-002');
    expect(openRelatedOpportunity).toHaveBeenCalledWith('opportunity-002');
    expect(openAllAlerts).toHaveBeenCalled();
  });
});
