import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { OpportunityContextAsideComponent } from './opportunity-context-aside.component';

describe('OpportunityContextAsideComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OpportunityContextAsideComponent, TranslateModule.forRoot()],
    });
  });

  it('emits openAlert when clicking a related alert entry', () => {
    const fixture = TestBed.createComponent(OpportunityContextAsideComponent);
    const openAlertSpy = jasmine.createSpy('openAlert');
    fixture.componentInstance.openAlert.subscribe(openAlertSpy);

    fixture.componentRef.setInput('capacityMw', 300);
    fixture.componentRef.setInput('fromLabel', 'Quebec');
    fixture.componentRef.setInput('toLabel', 'Ontario');
    fixture.componentRef.setInput('connected', true);
    fixture.componentRef.setInput('lastUpdatedLabel', '2 min ago');
    fixture.componentRef.setInput('indicators', []);
    fixture.componentRef.setInput('alerts', [
      {
        id: 'alert-001',
        title: 'Ice storm risk on Ontario transmission lines',
        detail: 'Ontario',
        severity: 'warning',
      },
    ]);
    fixture.detectChanges();

    const alertButton: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '[data-og7-id="opportunity-alert-open-0"]',
    );
    expect(alertButton).toBeTruthy();

    alertButton?.click();
    expect(openAlertSpy).toHaveBeenCalledTimes(1);
    expect(openAlertSpy).toHaveBeenCalledWith('alert-001');
  });
});
