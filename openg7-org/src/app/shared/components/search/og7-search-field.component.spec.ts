import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { Og7SearchFieldComponent } from './og7-search-field.component';

@Component({
  standalone: true,
  imports: [Og7SearchFieldComponent],
  templateUrl: './og7-search-field.component.spec.html',
})
class TestHostComponent {
  @ViewChild('sf') sf!: Og7SearchFieldComponent;
  debounce = 50;
  qKey?: string;
}

describe('Og7SearchFieldComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let routeQueryParams = convertToParamMap({});

  beforeEach(async () => {
    routeQueryParams = convertToParamMap({});

    await TestBed.configureTestingModule({
      imports: [TestHostComponent, RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get queryParamMap() {
                return routeQueryParams;
              },
            },
          },
        },
      ],
    }).compileComponents();
  });

  function createHost(options?: { qKey?: string; queryParams?: Record<string, string> }) {
    routeQueryParams = convertToParamMap(options?.queryParams ?? {});
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    host.qKey = options?.qKey;
    fixture.detectChanges();
  }

  function openPalette(): void {
    host.sf.openPalette();
    fixture.detectChanges();
  }

  function getInput(): HTMLInputElement {
    const input = fixture.debugElement.query(By.css('input[type="search"]'));
    expect(input).withContext('search input should be rendered when the palette is open').toBeTruthy();
    return input.nativeElement as HTMLInputElement;
  }

  it('debounces searchChanged', fakeAsync(() => {
    createHost();
    openPalette();

    const spy = jasmine.createSpy('changed');
    host.sf.searchChanged.subscribe(spy);

    const input = getInput();
    input.value = 'foo';
    input.dispatchEvent(new Event('input'));

    tick(40);
    expect(spy).not.toHaveBeenCalled();
    tick(20);
    expect(spy).toHaveBeenCalledWith('foo');
  }));

  it('emits searchCommitted on enter', () => {
    createHost();
    openPalette();

    const spy = jasmine.createSpy('commit');
    host.sf.searchCommitted.subscribe(spy);

    const input = getInput();
    input.value = 'bar';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(spy).toHaveBeenCalledWith('bar');
  });

  it('clears value and emits empty searchChanged', fakeAsync(() => {
    createHost();
    openPalette();

    const changed = jasmine.createSpy('changed');
    host.sf.searchChanged.subscribe(changed);

    const input = getInput();
    input.value = 'baz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button[aria-label="Effacer"]'));
    button.nativeElement.click();
    fixture.detectChanges();
    tick();

    expect(host.sf.value).toBe('');
    expect(changed).toHaveBeenCalledWith('');
    expect(document.activeElement).toBe(input);
  }));

  it('closes the palette on escape key', () => {
    createHost();
    openPalette();

    const input = getInput();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(host.sf.paletteOpen()).toBeFalse();
    expect(fixture.debugElement.query(By.css('input[type="search"]'))).toBeNull();
  });

  it('initializes from query param', () => {
    createHost({ qKey: 'q', queryParams: { q: 'init' } });

    expect(host.sf.value).toBe('init');
  });

  it('updates URL on commit', () => {
    createHost({ qKey: 'q' });
    openPalette();

    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    const input = getInput();
    input.value = 'hello';
    input.dispatchEvent(new Event('input'));

    host.sf.commit('action');

    expect(router.navigate).toHaveBeenCalledWith([], {
      queryParams: { q: 'hello' },
      queryParamsHandling: 'merge',
    });
  });

  it('has role searchbox', () => {
    createHost();
    openPalette();

    const input = getInput();
    expect(input.getAttribute('role')).toBe('searchbox');
  });
});
