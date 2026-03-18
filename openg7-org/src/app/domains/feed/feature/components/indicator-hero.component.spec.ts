import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { IndicatorHeroComponent } from './indicator-hero.component';

describe('IndicatorHeroComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IndicatorHeroComponent, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      'en',
      {
        feed: {
          title: 'Feed',
          indicator: {
            detail: {
              breadcrumbIndicators: 'Indicators',
              breadcrumbCurrent: 'Ontario electricity',
              actions: {
                subscribe: 'Subscribe',
                subscribing: 'Subscribing...',
                subscribed: 'Subscribed',
                viewMyAlert: 'View my alert',
                share: 'Share',
                createAlert: 'Create alert',
                createAnotherAlert: 'Create another alert',
              },
              connection: {
                online: 'Connected',
              },
              chips: {
                windowHours: '{{ value }}h',
              },
              granularity: {
                hour: 'Spot / hourly',
                '15m': '15 min',
                day: 'Daily',
              },
            },
          },
        },
      },
      true
    );
    translate.use('en');
  });

  it('emits subscribe when clicking the subscribe action', () => {
    const fixture = TestBed.createComponent(IndicatorHeroComponent);
    const subscribeSpy = jasmine.createSpy('subscribe');
    fixture.componentInstance.subscribe.subscribe(subscribeSpy);

    setRequiredInputs(fixture, { subscribed: false });
    fixture.detectChanges();

    const subscribeButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('[data-og7-id="indicator-subscribe"]');
    expect(subscribeButton).toBeTruthy();

    subscribeButton?.click();
    expect(subscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('renders view and create-another labels when an active alert already exists', () => {
    const fixture = TestBed.createComponent(IndicatorHeroComponent);

    setRequiredInputs(fixture, { subscribed: false });
    fixture.detectChanges();

    const subscribeButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('[data-og7-id="indicator-subscribe"]');
    const createAlertButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('[data-og7-id="indicator-create-alert"]');
    expect(subscribeButton?.textContent).toContain('Subscribe');
    expect(createAlertButton?.textContent).toContain('Create alert');

    setRequiredInputs(fixture, { subscribed: true });
    fixture.detectChanges();
    expect(subscribeButton?.textContent).toContain('View my alert');
    expect(createAlertButton?.textContent).toContain('Create another alert');
    expect(createAlertButton?.dataset['og7State']).toBe('active');
    expect(createAlertButton?.classList.contains('indicator-hero__action--active')).toBeTrue();
  });

  it('renders pending label and disables subscribe action while pending', () => {
    const fixture = TestBed.createComponent(IndicatorHeroComponent);

    setRequiredInputs(fixture, { subscribed: false, subscribePending: true, subscribeDisabled: true });
    fixture.detectChanges();

    const subscribeButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('[data-og7-id="indicator-subscribe"]');
    expect(subscribeButton?.disabled).toBeTrue();
    expect(subscribeButton?.textContent).toContain('Subscribing...');
    expect(subscribeButton?.getAttribute('aria-busy')).toBe('true');
  });

  it('emits createAlert when clicking the create alert action', () => {
    const fixture = TestBed.createComponent(IndicatorHeroComponent);
    const createAlertSpy = jasmine.createSpy('createAlert');
    fixture.componentInstance.createAlert.subscribe(createAlertSpy);

    setRequiredInputs(fixture, { subscribed: false });
    fixture.detectChanges();

    const createAlertButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('[data-og7-id="indicator-create-alert"]');
    expect(createAlertButton).toBeTruthy();

    createAlertButton?.click();
    expect(createAlertSpy).toHaveBeenCalledTimes(1);
  });
});

function setRequiredInputs(
  fixture: ReturnType<typeof TestBed.createComponent<IndicatorHeroComponent>>,
  options: {
    subscribed: boolean;
    subscribePending?: boolean;
    subscribeDisabled?: boolean;
  }
): void {
  fixture.componentRef.setInput('title', 'Spot electricity price up 12 percent');
  fixture.componentRef.setInput('subtitle', 'Ontario - Electricity - Spot');
  fixture.componentRef.setInput('deltaPctLabel', '+12%');
  fixture.componentRef.setInput('deltaAbsLabel', '+1.13 c/kWh');
  fixture.componentRef.setInput('windowHours', 72);
  fixture.componentRef.setInput('granularityLabel', 'Spot / hourly');
  fixture.componentRef.setInput('lastUpdatedLabel', '2 min ago');
  fixture.componentRef.setInput('subscribed', options.subscribed);
  fixture.componentRef.setInput('subscribePending', options.subscribePending ?? false);
  fixture.componentRef.setInput('subscribeDisabled', options.subscribeDisabled ?? false);
}
