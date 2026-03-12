import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
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
    await router.navigateByUrl('/feed?draftSource=alert&draftTitle=Winter%20peak');
  });

  it('renders a login CTA for anonymous visitors and preserves the current feed URL', () => {
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

  it('renders the composer when the user is authenticated', () => {
    authState.set(true);

    const fixture = TestBed.createComponent(FeedPublishSectionComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="feed-composer-stub"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-og7="feed-composer-auth-gate"]')).toBeNull();
  });

  it('focuses the login CTA for anonymous users when requested', () => {
    const fixture = TestBed.createComponent(FeedPublishSectionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const link = fixture.nativeElement.querySelector('[data-og7-id="feed-login-to-publish"]') as HTMLAnchorElement;
    const focusSpy = spyOn(link, 'focus');

    component.focusPrimaryAction();

    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('delegates focus to the composer when the user is authenticated', () => {
    authState.set(true);

    const fixture = TestBed.createComponent(FeedPublishSectionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const composer = fixture.debugElement.query(By.directive(FeedComposerStubComponent))
      .componentInstance as FeedComposerStubComponent;

    component.focusPrimaryAction();

    expect(composer.focusPrimaryField).toHaveBeenCalledTimes(1);
  });
});
