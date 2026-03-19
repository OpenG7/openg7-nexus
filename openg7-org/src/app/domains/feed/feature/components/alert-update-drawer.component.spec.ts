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

  it('renders the latest pending report in view mode', () => {
    const fixture = TestBed.createComponent(AlertUpdateDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('mode', 'view');
    fixture.componentRef.setInput('existingReport', {
      id: 'alert-update-1',
      alertId: 'alert-001',
      alertTitle: 'Ice storm risk on Ontario transmission lines',
      route: '/feed/alerts/alert-001',
      reason: 'correction',
      summary: 'Environment Canada confirmed the event is now impacting two corridors.',
      sourceUrl: 'https://weather.gc.ca',
      createdAt: '2026-03-11T09:30:00.000Z',
      status: 'pending',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-og7="alert-update-report-view"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7-id="alert-update-submit"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Environment Canada confirmed the event is now impacting two corridors.');
  });

  it('wires dialog accessibility attributes and blocks submit while submitting', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const fixture = TestBed.createComponent(AlertUpdateDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('submitState', 'submitting');
    fixture.detectChanges();
    await fixture.whenStable();

    const dialog: HTMLElement = fixture.nativeElement.querySelector('[role="dialog"]');
    const submitButton: HTMLButtonElement = fixture.nativeElement.querySelector('[data-og7-id="alert-update-submit"]');

    expect(dialog.getAttribute('aria-labelledby')).toBe('og7-alert-update-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('og7-alert-update-description');
    expect(submitButton.disabled).toBeTrue();
    expect(document.activeElement).toBe(dialog);

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('associates field errors and status messages with accessible semantics', () => {
    const fixture = TestBed.createComponent(AlertUpdateDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const summaryInput: HTMLTextAreaElement = fixture.nativeElement.querySelector('[data-og7-id="summary"]');
    const sourceUrlInput: HTMLInputElement = fixture.nativeElement.querySelector('[data-og7-id="source-url"]');
    const submitButton: HTMLButtonElement = fixture.nativeElement.querySelector('[data-og7-id="alert-update-submit"]');

    summaryInput.value = 'short';
    summaryInput.dispatchEvent(new Event('input'));
    sourceUrlInput.value = 'invalid-url';
    sourceUrlInput.dispatchEvent(new Event('input'));
    submitButton.click();
    fixture.detectChanges();

    const summaryError: HTMLElement = fixture.nativeElement.querySelector('#og7-alert-update-summary-error');
    const sourceUrlError: HTMLElement = fixture.nativeElement.querySelector('#og7-alert-update-source-url-error');

    expect(summaryInput.getAttribute('aria-invalid')).toBe('true');
    expect(summaryInput.getAttribute('aria-describedby')).toBe('og7-alert-update-summary-error');
    expect(summaryError.textContent?.trim().length).toBeGreaterThan(0);

    expect(sourceUrlInput.getAttribute('aria-invalid')).toBe('true');
    expect(sourceUrlInput.getAttribute('aria-describedby')).toBe('og7-alert-update-source-url-error');
    expect(sourceUrlError.textContent?.trim().length).toBeGreaterThan(0);

    fixture.componentRef.setInput('submitState', 'error');
    fixture.componentRef.setInput('submitError', 'Request failed');
    fixture.detectChanges();

    const errorStatus: HTMLElement = fixture.nativeElement.querySelector('[data-og7="alert-update-status"][data-og7-id="error"]');
    expect(errorStatus.getAttribute('role')).toBe('alert');
    expect(errorStatus.getAttribute('aria-live')).toBe('assertive');

    fixture.componentRef.setInput('submitState', 'success');
    fixture.detectChanges();

    const successStatus: HTMLElement = fixture.nativeElement.querySelector('[data-og7="alert-update-status"][data-og7-id="success"]');
    expect(successStatus.getAttribute('role')).toBe('status');
    expect(successStatus.getAttribute('aria-live')).toBe('polite');
  });
});
