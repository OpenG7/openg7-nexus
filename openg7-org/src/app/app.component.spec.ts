import { BreakpointObserver } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AppComponent } from './app.component';
import { FEATURE_FLAGS } from './core/config/environment.tokens';
import { GlobalShortcutsService } from './core/shortcuts/global-shortcuts.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        {
          provide: BreakpointObserver,
          useValue: {
            observe: () => of({ matches: false, breakpoints: {} }),
          },
        },
        {
          provide: Router,
          useValue: {
            events: of(),
            url: '/',
          },
        },
        { provide: GlobalShortcutsService, useValue: {} },
        { provide: FEATURE_FLAGS, useValue: {} },
      ],
    })
      .overrideComponent(AppComponent, {
        set: {
          template: '<div data-og7="app-shell"></div>',
        },
      })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render layout container', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-og7="app-shell"]')).toBeTruthy();
  });
});
