import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { OpportunityReportDrawerComponent } from './opportunity-report-drawer.component';

describe('OpportunityReportDrawerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OpportunityReportDrawerComponent, TranslateModule.forRoot()],
    });
  });

  it('renders report fields with blueprint hooks', () => {
    const fixture = TestBed.createComponent(OpportunityReportDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-og7-id="reason"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7-id="comment"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7-id="opportunity-report-submit"]')).toBeTruthy();
  });

  it('emits a normalized report payload on submit', () => {
    const fixture = TestBed.createComponent(OpportunityReportDrawerComponent);
    const submittedSpy = jasmine.createSpy('submitted');
    fixture.componentInstance.submitted.subscribe(submittedSpy);

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const reasonSelect: HTMLSelectElement = fixture.nativeElement.querySelector('[data-og7-id="reason"]');
    const commentInput: HTMLTextAreaElement = fixture.nativeElement.querySelector('[data-og7-id="comment"]');
    const submitButton: HTMLButtonElement = fixture.nativeElement.querySelector('[data-og7-id="opportunity-report-submit"]');

    reasonSelect.value = 'abuse';
    reasonSelect.dispatchEvent(new Event('change'));

    commentInput.value = '  Suspicious pricing and unverifiable capacity details.  ';
    commentInput.dispatchEvent(new Event('input'));

    fixture.detectChanges();
    submitButton.click();

    expect(submittedSpy).toHaveBeenCalledTimes(1);
    expect(submittedSpy).toHaveBeenCalledWith({
      reason: 'abuse',
      comment: 'Suspicious pricing and unverifiable capacity details.',
    });
  });
});
