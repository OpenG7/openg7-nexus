import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { AlertUpdateDrawerComponent } from './alert-update-drawer.component';

describe('AlertUpdateDrawerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AlertUpdateDrawerComponent, TranslateModule.forRoot()],
    });
  });

  it('renders alert update fields with blueprint hooks', () => {
    const fixture = TestBed.createComponent(AlertUpdateDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-og7-id="reason"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7-id="summary"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7-id="source-url"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7-id="alert-update-submit"]')).toBeTruthy();
  });

  it('emits a normalized alert update payload on submit', () => {
    const fixture = TestBed.createComponent(AlertUpdateDrawerComponent);
    const submittedSpy = jasmine.createSpy('submitted');
    fixture.componentInstance.submitted.subscribe(submittedSpy);

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const reasonSelect: HTMLSelectElement = fixture.nativeElement.querySelector('[data-og7-id="reason"]');
    const summaryInput: HTMLTextAreaElement = fixture.nativeElement.querySelector('[data-og7-id="summary"]');
    const sourceUrlInput: HTMLInputElement = fixture.nativeElement.querySelector('[data-og7-id="source-url"]');
    const submitButton: HTMLButtonElement = fixture.nativeElement.querySelector('[data-og7-id="alert-update-submit"]');

    reasonSelect.value = 'newSource';
    reasonSelect.dispatchEvent(new Event('change'));

    summaryInput.value = '  Utility bulletin confirms the repair window moved to 18:00 local time.  ';
    summaryInput.dispatchEvent(new Event('input'));

    sourceUrlInput.value = '  https://example.org/grid-bulletin  ';
    sourceUrlInput.dispatchEvent(new Event('input'));

    fixture.detectChanges();
    submitButton.click();

    expect(submittedSpy).toHaveBeenCalledTimes(1);
    expect(submittedSpy).toHaveBeenCalledWith({
      reason: 'newSource',
      summary: 'Utility bulletin confirms the repair window moved to 18:00 local time.',
      sourceUrl: 'https://example.org/grid-bulletin',
    });
  });
});
