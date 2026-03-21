import { HttpBackend } from '@angular/common/http';
import { HTTP_INTERCEPTORS, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TransferState, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuthRedirectService } from '../auth/auth-redirect.service';
import { AuthService } from '../auth/auth.service';
import { errorInterceptor } from '../http/error.interceptor';
import { NotificationStore } from '../observability/notification.store';

import { AppTranslateLoader } from './translate-loader';

describe('AppTranslateLoader', () => {
  let translate: TranslateService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: AppTranslateLoader, deps: [HttpBackend, TransferState, PLATFORM_ID] },
        }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useValue: errorInterceptor, multi: true },
        {
          provide: Router,
          useValue: {
            url: '/',
            navigate: () => Promise.resolve(true),
            getCurrentNavigation: () => null,
          },
        },
        {
          provide: AuthRedirectService,
          useValue: {
            setRedirectUrl: () => undefined,
          },
        },
        {
          provide: AuthService,
          useValue: {
            handleUnauthorizedSession: () => false,
          },
        },
        NotificationStore,
        TransferState,
      ],
    });
    translate = TestBed.inject(TranslateService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads translations without interceptor loop', () => {
    let resolved: unknown;

    translate.use('en').subscribe((value) => {
      resolved = value;
    });

    http.expectOne('/assets/i18n/en.json').flush('{}');

    expect(resolved).toEqual({});
  });

  it('parses translation files that start with a UTF-8 BOM', () => {
    let resolved: unknown;

    translate.use('en').subscribe((value) => {
      resolved = value;
    });

    http.expectOne('/assets/i18n/en.json').flush('\uFEFF{"hero":{"title":"Hello"}}');

    expect(resolved).toEqual({
      hero: { title: 'Hello' },
    });
    expect(translate.instant('hero.title')).toBe('Hello');
  });
});
