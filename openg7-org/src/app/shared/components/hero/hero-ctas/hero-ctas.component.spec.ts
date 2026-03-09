import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';

import { HeroCta, HeroCtaClickEvent, HeroCtasComponent } from './hero-ctas.component';

@Component({ templateUrl: './hero-ctas.component.spec.html' })
class DummyComponent {}

describe('HeroCtasComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HeroCtasComponent,
        RouterTestingModule.withRoutes([
          { path: 'sectors', component: DummyComponent },
          { path: 'companies/register', component: DummyComponent },
        ]),
        TranslateModule.forRoot(),
      ],
    });
  });

  it('emits analytics event when CTA is clicked', () => {
    const fixture = TestBed.createComponent(HeroCtasComponent);
    const primary: HeroCta = {
      label: 'hero.actions.viewSectors',
      href: '#map-section',
      trackingType: 'view-sectors-cta',
    };
    fixture.componentInstance.primaryCta = primary;
    const spy = jasmine.createSpy('ctaClicked');
    fixture.componentInstance.ctaClicked.subscribe(spy);

    fixture.detectChanges();

    const ctas = fixture.nativeElement.querySelectorAll('a');
    ctas[0].click();

    expect(spy).toHaveBeenCalled();
    const event: HeroCtaClickEvent = spy.calls.mostRecent().args[0];
    expect(event.cta).toEqual(primary);
    expect(event.trackingType).toBe('view-sectors-cta');
    expect(event.event instanceof MouseEvent).toBeTrue();
  });

  it('navigates using routerLink when CTA is clicked', fakeAsync(() => {
    const fixture = TestBed.createComponent(HeroCtasComponent);
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);
    fixture.componentInstance.primaryCta = {
      label: 'hero.actions.registerCompany',
      routerLink: '/companies/register',
      trackingType: 'register-company-cta',
    };

    fixture.detectChanges();

    fixture.ngZone?.run(() => router.initialNavigation());
    tick();

    const cta: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    fixture.ngZone?.run(() => cta.click());
    tick();

    expect(location.path()).toBe('/companies/register');
  }));

  it('uses /sectors as default primary CTA route', fakeAsync(() => {
    const fixture = TestBed.createComponent(HeroCtasComponent);
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);
    fixture.detectChanges();

    fixture.ngZone?.run(() => router.initialNavigation());
    tick();

    const cta: HTMLAnchorElement | null = fixture.nativeElement.querySelector('a');
    expect(cta?.getAttribute('data-og7-id')).toBe('view-sectors');

    fixture.ngZone?.run(() => cta?.click());
    tick();

    expect(location.path()).toBe('/sectors');
  }));
});
