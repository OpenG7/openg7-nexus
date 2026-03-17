import { CommonModule } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterLink } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { TranslateModule } from '@ngx-translate/core';

import { FeedPublishSectionComponent } from './feed-publish-section.component';

@Component({
  standalone: true,
  template: '',
})
class DummyPageComponent {}

@Component({
  selector: 'og7-feed-composer',
  standalone: true,
  template: '<div data-testid="feed-composer-stub"></div>',
})
class FeedComposerStubComponent {
  readonly showHeader = input(true);
  readonly focusPrimaryField = jasmine.createSpy('focusPrimaryField');
}

describe('FeedPublishSectionComponent', () => {
  const authState = signal(false);

  beforeEach(async () => {
    authState.set(false);

    await TestBed.configureTestingModule({
      imports: [FeedPublishSectionComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([
          { path: 'feed', component: DummyPageComponent },
          { path: 'login', component: DummyPageComponent },
        ]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: authState.asReadonly(),
          } as Pick<AuthService, 'isAuthenticated'>,
        },
      ],
    })
      .overrideComponent(FeedPublishSectionComponent, {
        set: {
          imports: [CommonModule, RouterLink, TranslateModule, FeedComposerStubComponent],
        },
      })
      .compileComponents();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/feed');
  });

  it('renders the compact publish bar and keeps the drawer closed by default', () => {
    const fixture = TestBed.createComponent(FeedPublishSectionComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.feed-publish__bar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7="feed-publish-drawer"]')).toBeNull();
  });

  it('auto-opens the auth gate for anonymous visitors when arriving with an alert draft and preserves the current feed URL', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/feed?draftSource=alert&draftTitle=Winter%20peak');

    const fixture = TestBed.createComponent(FeedPublishSectionComponent);
    fixture.detectChanges();

    const gate = fixture.nativeElement.querySelector('[data-og7="feed-composer-auth-gate"]');
    const linkDebug = fixture.debugElement.query(By.directive(RouterLink));
    const component = fixture.componentInstance as unknown as {
      redirectTarget: () => string;
    };

    expect(gate).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="feed-composer-stub"]')).toBeNull();
    expect(component.redirectTarget()).toBe('/feed?draftSource=alert&draftTitle=Winter%20peak');
    expect(linkDebug.injector.get(RouterLink).queryParams).toEqual({
      redirect: '/feed?draftSource=alert&draftTitle=Winter%20peak',
    });
  });

  it('opens the composer drawer when the user is authenticated', () => {
    authState.set(true);

    const fixture = TestBed.createComponent(FeedPublishSectionComponent);
    fixture.detectChanges();

    const openButton = fixture.nativeElement.querySelector('[data-og7-id="feed-open-publish-drawer"]') as HTMLButtonElement;
    openButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="feed-composer-stub"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7="feed-composer-auth-gate"]')).toBeNull();
  });

  it('auto-opens the composer drawer when the user is authenticated and an alert draft is present', async () => {
    authState.set(true);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/feed?draftSource=alert&draftTitle=Winter%20peak&draftAlertId=alert-001');

    const fixture = TestBed.createComponent(FeedPublishSectionComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-og7="feed-publish-drawer"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="feed-composer-stub"]')).toBeTruthy();
  });

  it('auto-opens the composer drawer when the user is authenticated and an explicit origin draft is present', async () => {
    authState.set(true);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/feed?draftOriginType=alert&draftOriginId=alert-001&draftTitle=Winter%20peak');

    const fixture = TestBed.createComponent(FeedPublishSectionComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-og7="feed-publish-drawer"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="feed-composer-stub"]')).toBeTruthy();
  });

  it('opens the drawer and focuses the login CTA for anonymous users when requested', async () => {
    const fixture = TestBed.createComponent(FeedPublishSectionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as FeedPublishSectionComponent;
    component.focusPrimaryAction();
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('[data-og7-id="feed-login-to-publish"]') as HTMLAnchorElement;
    const focusSpy = spyOn(link, 'focus');

    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[data-og7="feed-publish-drawer"]')).toBeTruthy();
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('opens the drawer and delegates focus to the composer when the user is authenticated', async () => {
    authState.set(true);

    const fixture = TestBed.createComponent(FeedPublishSectionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as FeedPublishSectionComponent;
    component.focusPrimaryAction();
    fixture.detectChanges();

    const composer = fixture.debugElement.query(By.directive(FeedComposerStubComponent))
      .componentInstance as FeedComposerStubComponent;

    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[data-og7="feed-publish-drawer"]')).toBeTruthy();
    expect(composer.focusPrimaryField).toHaveBeenCalledTimes(1);
  });

  it('closes the drawer when the backdrop is clicked', () => {
    const fixture = TestBed.createComponent(FeedPublishSectionComponent);
    fixture.detectChanges();

    const openButton = fixture.nativeElement.querySelector('[data-og7-id="feed-open-publish-drawer"]') as HTMLButtonElement;
    openButton.click();
    fixture.detectChanges();

    const backdrop = fixture.nativeElement.querySelector('.feed-publish__backdrop') as HTMLButtonElement;
    backdrop.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-og7="feed-publish-drawer"]')).toBeNull();
  });
});
