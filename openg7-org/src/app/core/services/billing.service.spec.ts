import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import * as stripeJs from '@stripe/stripe-js';
import { firstValueFrom } from 'rxjs';

import { StrapiClient } from '../api/strapi-client';
import { API_URL } from '../config/environment.tokens';
import { RuntimeConfigService } from '../config/runtime-config.service';
import { HttpClientService } from '../http/http-client.service';

import { BillingService } from './billing.service';

class RuntimeConfigStub {
  apiUrl(): string {
    return '';
  }

  apiToken(): string | null {
    return null;
  }
}

describe('BillingService', () => {
  let service: BillingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BillingService,
        HttpClientService,
        StrapiClient,
        { provide: API_URL, useValue: '' },
        { provide: RuntimeConfigService, useClass: RuntimeConfigStub },
      ],
    });

    service = TestBed.inject(BillingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('fetches billing plans from the API', async () => {
    const promise = firstValueFrom(service.getPlans());

    const req = http.expectOne('/billing/plans');
    expect(req.request.method).toBe('GET');

    const plan = {
      id: 'free',
      tier: 'free' as const,
      provider: 'internal' as const,
      price: { amount: 0, currency: 'CAD', interval: 'month' as const },
      features: [] as string[],
      capabilities: { premiumVisibility: false, priorityAnalytics: false },
      i18nKey: 'plans.free',
      highlight: false,
      available: true,
    };

    req.flush({ data: [plan] });

    await expectAsync(promise).toBeResolvedTo([plan]);
  });

  it('initiates checkout and redirects with Stripe', async () => {
    const stripeRedirect = jasmine.createSpy('redirectToCheckout').and.resolveTo({ error: null });
    spyOn<any>(service, 'ensureStripe').and.returnValue(Promise.resolve({ redirectToCheckout: stripeRedirect }));

    const promise = service.startCheckout('premium');
    const req = http.expectOne('/billing/checkout');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.planId).toBe('premium');
    req.flush({ provider: 'stripe', sessionId: 'sess_123', publishableKey: 'pk_test_123' });

    await promise;
    expect(stripeRedirect).toHaveBeenCalledWith({ sessionId: 'sess_123' });
  });

  it('throws when redirectToCheckout reports an error', async () => {
    spyOn<any>(service, 'ensureStripe').and.returnValue(
      Promise.resolve({
        redirectToCheckout: () => Promise.resolve({ error: { message: 'stripe.redirect_failed' } }),
      })
    );

    const promise = service.startCheckout('premium');
    const req = http.expectOne('/billing/checkout');
    req.flush({ provider: 'stripe', sessionId: 'sess_456', publishableKey: 'pk_test_123' });

    await expectAsync(promise).toBeRejectedWithError('stripe.redirect_failed');
  });

  it('reloads Stripe when the publishable key changes', async () => {
    const firstRedirect = jasmine.createSpy('firstRedirect').and.resolveTo({ error: null });
    const secondRedirect = jasmine.createSpy('secondRedirect').and.resolveTo({ error: null });

    const loadStripeSpy = spyOn(stripeJs, 'loadStripe').and.callFake((key: string) => {
      if (key === 'pk_first') {
        return Promise.resolve({ redirectToCheckout: firstRedirect } as unknown as stripeJs.Stripe);
      }
      if (key === 'pk_second') {
        return Promise.resolve({ redirectToCheckout: secondRedirect } as unknown as stripeJs.Stripe);
      }
      return Promise.resolve(null);
    });

    const firstCheckout = service.startCheckout('premium');
    const firstReq = http.expectOne('/billing/checkout');
    firstReq.flush({ provider: 'stripe', sessionId: 'sess_first', publishableKey: 'pk_first' });
    await firstCheckout;

    const secondCheckout = service.startCheckout('enterprise');
    const secondReq = http.expectOne('/billing/checkout');
    secondReq.flush({ provider: 'stripe', sessionId: 'sess_second', publishableKey: 'pk_second' });
    await secondCheckout;

    expect(loadStripeSpy.calls.count()).toBe(2);
    expect(loadStripeSpy).toHaveBeenCalledWith('pk_first');
    expect(loadStripeSpy).toHaveBeenCalledWith('pk_second');
    expect(firstRedirect).toHaveBeenCalledWith({ sessionId: 'sess_first' });
    expect(secondRedirect).toHaveBeenCalledWith({ sessionId: 'sess_second' });
    expect(firstRedirect.calls.count()).toBe(1);
    expect(secondRedirect.calls.count()).toBe(1);
  });
});

