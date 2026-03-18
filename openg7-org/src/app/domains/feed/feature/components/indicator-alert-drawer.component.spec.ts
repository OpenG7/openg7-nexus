import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { IndicatorAlertDrawerComponent } from './indicator-alert-drawer.component';

describe('IndicatorAlertDrawerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IndicatorAlertDrawerComponent, TranslateModule.forRoot()],
    });
  });

  it('renders threshold, window, and frequency fields with blueprint hooks', () => {
    const fixture = TestBed.createComponent(IndicatorAlertDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-og7-id="threshold-direction"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7-id="threshold-value"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7-id="window"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7-id="frequency"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7-id="notify-delta"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7-id="note"]')).toBeTruthy();
  });

  it('emits submitted draft from form values when clicking submit', () => {
    const fixture = TestBed.createComponent(IndicatorAlertDrawerComponent);
    const submittedSpy = jasmine.createSpy('submitted');
    fixture.componentInstance.submitted.subscribe(submittedSpy);

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const thresholdDirection: HTMLSelectElement = fixture.nativeElement.querySelector('[data-og7-id="threshold-direction"]');
    const thresholdValue: HTMLInputElement = fixture.nativeElement.querySelector('[data-og7-id="threshold-value"]');
    const windowSelect: HTMLSelectElement = fixture.nativeElement.querySelector('[data-og7-id="window"]');
    const frequencySelect: HTMLSelectElement = fixture.nativeElement.querySelector('[data-og7-id="frequency"]');
    const notifyDelta: HTMLInputElement = fixture.nativeElement.querySelector('[data-og7-id="notify-delta"]');
    const note: HTMLTextAreaElement = fixture.nativeElement.querySelector('[data-og7-id="note"]');
    const submitButton: HTMLButtonElement = fixture.nativeElement.querySelector('[data-og7-id="indicator-alert-submit"]');

    thresholdDirection.value = 'lt';
    thresholdDirection.dispatchEvent(new Event('change'));

    thresholdValue.value = '18';
    thresholdValue.dispatchEvent(new Event('input'));

    windowSelect.value = '24h';
    windowSelect.dispatchEvent(new Event('change'));

    frequencySelect.value = 'daily';
    frequencySelect.dispatchEvent(new Event('change'));

    notifyDelta.checked = false;
    notifyDelta.dispatchEvent(new Event('change'));

    note.value = '  Add evening threshold watch  ';
    note.dispatchEvent(new Event('input'));

    fixture.detectChanges();
    submitButton.click();

    expect(submittedSpy).toHaveBeenCalledTimes(1);
    expect(submittedSpy).toHaveBeenCalledWith({
      thresholdDirection: 'lt',
      thresholdValue: 18,
      window: '24h',
      frequency: 'daily',
      notifyDelta: false,
      note: 'Add evening threshold watch',
    });
  });

  it('prefills the form from an existing offline draft when provided', () => {
    const fixture = TestBed.createComponent(IndicatorAlertDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('initialDraft', {
      thresholdDirection: 'lt',
      thresholdValue: 22,
      window: '24h',
      frequency: 'hourly',
      notifyDelta: false,
      note: 'Restore my previous draft',
    });
    fixture.detectChanges();

    expect(
      (fixture.nativeElement.querySelector('[data-og7-id="threshold-direction"]') as HTMLSelectElement).value
    ).toBe('lt');
    expect(
      (fixture.nativeElement.querySelector('[data-og7-id="threshold-value"]') as HTMLInputElement).value
    ).toBe('22');
    expect(
      (fixture.nativeElement.querySelector('[data-og7-id="window"]') as HTMLSelectElement).value
    ).toBe('24h');
    expect(
      (fixture.nativeElement.querySelector('[data-og7-id="frequency"]') as HTMLSelectElement).value
    ).toBe('hourly');
    expect(
      (fixture.nativeElement.querySelector('[data-og7-id="notify-delta"]') as HTMLInputElement).checked
    ).toBeFalse();
    expect((fixture.nativeElement.querySelector('[data-og7-id="note"]') as HTMLTextAreaElement).value).toBe(
      'Restore my previous draft'
    );
  });

  it('renders the existing active rule in view mode instead of the compose form', () => {
    const fixture = TestBed.createComponent(IndicatorAlertDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('mode', 'view');
    fixture.componentRef.setInput('existingRule', {
      id: 'indicator-rule-1',
      indicatorId: 'indicator-spot-ontario',
      indicatorTitle: 'Spot electricity price up 12 percent',
      thresholdDirection: 'gt',
      thresholdValue: 25,
      window: '24h',
      frequency: 'hourly',
      notifyDelta: true,
      note: 'Watch evening peak',
      route: '/feed/indicators/indicator-spot-ontario',
      active: true,
      createdAt: '2026-01-21T09:05:00.000Z',
      updatedAt: '2026-01-21T09:05:00.000Z',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-og7="indicator-alert-view"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7-id="indicator-alert-submit"]')).toBeFalsy();
    expect(
      (fixture.nativeElement.querySelector('[data-og7="indicator-alert-rule-status"]') as HTMLElement)?.dataset[
        'og7Id'
      ]
    ).toBe('active');
  });
});
