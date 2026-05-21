import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { ANALYTICS_ENDPOINT, API_URL } from '../config/environment.tokens';
import { SUPPRESS_ERROR_TOAST } from '../http/error.interceptor.tokens';
import { RbacFacadeService } from '../security/rbac.facade';

import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let http: HttpTestingController;
  let rbac: jasmine.SpyObj<RbacFacadeService>;
  let consoleErrorSpy: jasmine.Spy;

  beforeEach(() => {
    rbac = jasmine.createSpyObj<RbacFacadeService>('RbacFacadeService', ['hasPermission']);
    rbac.hasPermission.and.returnValue(true);
    consoleErrorSpy = spyOn(console, 'error');
    delete (globalThis as { dataLayer?: unknown }).dataLayer;

    configureTestingModule('/analytics/events');
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('batches standard events on the flush interval with silent HTTP context', fakeAsync(() => {
    const service = TestBed.inject(AnalyticsService);

    service.emit('search_opened', { source: 'unit-test' });
    http.expectNone('/analytics/events');

    tick(2000);

    const request = http.expectOne('/analytics/events');
    expect(request.request.method).toBe('POST');
    expect(request.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();
    expect(request.request.headers.get('X-OG7-Batch')).toBe('true');
    expect(request.request.body).toEqual([
      jasmine.objectContaining({
        event: 'search_opened',
        detail: { source: 'unit-test' },
        priority: false,
      }),
    ]);
    request.flush({ accepted: 1 });
  }));

  it('flushes immediately when the batch size is reached', () => {
    const service = TestBed.inject(AnalyticsService);

    for (let index = 0; index < 10; index += 1) {
      service.emit('search_typed', { index });
    }

    const request = http.expectOne('/analytics/events');
    expect(request.request.body.length).toBe(10);
    request.flush({ accepted: 10 });
  });

  it('flushes priority events immediately when premium analytics is allowed', () => {
    const service = TestBed.inject(AnalyticsService);

    service.emit('connection_created_success', { id: 'connection-1' }, { priority: true });

    expect(rbac.hasPermission).toHaveBeenCalledWith('premium:analytics');
    const request = http.expectOne('/analytics/events');
    expect(request.request.body).toEqual([
      jasmine.objectContaining({
        event: 'connection_created_success',
        priority: true,
      }),
    ]);
    request.flush({ accepted: 1 });
  });

  it('does not buffer endpoint calls when analytics endpoint resolution is disabled', fakeAsync(() => {
    TestBed.resetTestingModule();
    configureTestingModule(null, '');
    const service = TestBed.inject(AnalyticsService);

    service.emit('search_opened', { source: 'unit-test' });
    tick(2000);

    http.expectNone(() => true);
    expect((globalThis as { dataLayer?: unknown[] }).dataLayer?.length).toBe(1);
  }));

  it('falls back when sendBeacon rejects a page-exit batch', () => {
    const sendBeacon = installSendBeacon(false);
    const service = TestBed.inject(AnalyticsService);

    service.emit('search_opened', { source: 'pagehide' });
    window.dispatchEvent(new Event('pagehide'));

    expect(sendBeacon).toHaveBeenCalled();
    const request = http.expectOne('/analytics/events');
    expect(request.request.body).toEqual([
      jasmine.objectContaining({
        event: 'search_opened',
        detail: { source: 'pagehide' },
      }),
    ]);
    request.flush({ accepted: 1 });
  });

  it('requeues a failed batch for the next interval', fakeAsync(() => {
    const service = TestBed.inject(AnalyticsService);

    service.emit('search_opened', { source: 'retry' });
    tick(2000);

    const failed = http.expectOne('/analytics/events');
    failed.flush({ error: 'unavailable' }, { status: 503, statusText: 'Service Unavailable' });
    expect(consoleErrorSpy).toHaveBeenCalled();

    tick(2000);

    const retried = http.expectOne('/analytics/events');
    expect(retried.request.body).toEqual([
      jasmine.objectContaining({
        event: 'search_opened',
        detail: { source: 'retry' },
      }),
    ]);
    retried.flush({ accepted: 1 });
  }));

  function configureTestingModule(endpoint: string | null, apiUrl = 'https://cms.local'): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AnalyticsService,
        { provide: ANALYTICS_ENDPOINT, useValue: endpoint },
        { provide: API_URL, useValue: apiUrl },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: RbacFacadeService, useValue: rbac },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  }

  function installSendBeacon(returnValue: boolean): jasmine.Spy {
    const navigatorRef = navigator as Navigator & {
      sendBeacon?: (url: string | URL, data?: BodyInit | null) => boolean;
    };
    if (typeof navigatorRef.sendBeacon !== 'function') {
      Object.defineProperty(navigatorRef, 'sendBeacon', {
        configurable: true,
        value: () => true,
      });
    }
    return spyOn(navigatorRef, 'sendBeacon').and.returnValue(returnValue);
  }
});
