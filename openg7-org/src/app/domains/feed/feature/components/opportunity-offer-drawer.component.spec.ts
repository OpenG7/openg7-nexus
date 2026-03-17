import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { OpportunityOfferDrawerComponent } from './opportunity-offer-drawer.component';

describe('OpportunityOfferDrawerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OpportunityOfferDrawerComponent, TranslateModule.forRoot()],
    });
  });

  it('renders offer fields with blueprint hooks', () => {
    const fixture = TestBed.createComponent(OpportunityOfferDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-og7-id="capacity"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7-id="start-date"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7-id="end-date"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7-id="pricing-model"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7-id="comment"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7-id="attachment"]')).toBeTruthy();
  });

  it('emits submitted payload after filling fields and submitting form', () => {
    const fixture = TestBed.createComponent(OpportunityOfferDrawerComponent);
    const submittedSpy = jasmine.createSpy('submitted');
    fixture.componentInstance.submitted.subscribe(submittedSpy);

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const capacityInput: HTMLInputElement = fixture.nativeElement.querySelector('[data-og7-id="capacity"]');
    const startDateInput: HTMLInputElement = fixture.nativeElement.querySelector('[data-og7-id="start-date"]');
    const endDateInput: HTMLInputElement = fixture.nativeElement.querySelector('[data-og7-id="end-date"]');
    const pricingSelect: HTMLSelectElement = fixture.nativeElement.querySelector('[data-og7-id="pricing-model"]');
    const commentInput: HTMLTextAreaElement = fixture.nativeElement.querySelector('[data-og7-id="comment"]');
    const attachmentInput: HTMLInputElement = fixture.nativeElement.querySelector('[data-og7-id="attachment"]');
    const submitButton: HTMLButtonElement = fixture.nativeElement.querySelector('[data-og7-id="opportunity-offer-submit"]');

    capacityInput.value = '320';
    capacityInput.dispatchEvent(new Event('input'));

    startDateInput.value = '2026-01-15';
    startDateInput.dispatchEvent(new Event('input'));

    endDateInput.value = '2026-02-15';
    endDateInput.dispatchEvent(new Event('input'));

    pricingSelect.value = 'indexed';
    pricingSelect.dispatchEvent(new Event('change'));

    commentInput.value = '  Indexed offer for winter balancing support.  ';
    commentInput.dispatchEvent(new Event('input'));

    const file = new File(['term sheet'], 'term-sheet.pdf', { type: 'application/pdf' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    Object.defineProperty(attachmentInput, 'files', {
      value: transfer.files,
      configurable: true,
    });
    attachmentInput.dispatchEvent(new Event('change'));

    fixture.detectChanges();
    submitButton.click();

    expect(submittedSpy).toHaveBeenCalledTimes(1);
    expect(submittedSpy).toHaveBeenCalledWith({
      capacityMw: 320,
      startDate: '2026-01-15',
      endDate: '2026-02-15',
      pricingModel: 'indexed',
      comment: 'Indexed offer for winter balancing support.',
      attachmentName: 'term-sheet.pdf',
    });
  });

  it('shows inline validation errors when submit is attempted with an invalid form', () => {
    const fixture = TestBed.createComponent(OpportunityOfferDrawerComponent);
    const submittedSpy = jasmine.createSpy('submitted');
    fixture.componentInstance.submitted.subscribe(submittedSpy);

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const submitButton: HTMLButtonElement = fixture.nativeElement.querySelector('[data-og7-id="opportunity-offer-submit"]');

    submitButton.click();
    fixture.detectChanges();

    expect(submittedSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-og7="opportunity-offer-validation"][data-og7-id="summary"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.opportunity-offer-drawer__field-error').length).toBeGreaterThan(0);
    expect((fixture.nativeElement.querySelector('[data-og7-id="start-date"]') as HTMLInputElement).getAttribute('aria-invalid')).toBe('true');
    expect((fixture.nativeElement.querySelector('[data-og7-id="comment"]') as HTMLTextAreaElement).getAttribute('aria-invalid')).toBe('true');
  });
});
