import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { StrapiList, Sector, BillingPlan, StatisticsResponse, HydrocarbonSignal } from '@openg7/contracts';

import { API_URL } from '../config/environment.tokens';
import { RuntimeConfigService } from '../config/runtime-config.service';
import { HttpClientService } from '../http/http-client.service';

import { StrapiClient } from './strapi-client';

class RuntimeConfigStub {
  apiUrl(): string {
    return 'https://cms.test';
  }

  apiToken(): string | null {
    return 'runtime-token';
  }

  apiWithCredentials(): boolean {
    return false;
  }
}

describe('StrapiClient', () => {
  let client: StrapiClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        StrapiClient,
        HttpClientService,
        { provide: API_URL, useValue: 'https://cms.test' },
        { provide: RuntimeConfigService, useClass: RuntimeConfigStub },
      ],
    });

    client = TestBed.inject(StrapiClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('performs requests through HttpClient and propagates runtime headers', async () => {
    const response: StrapiList<Sector> = { data: [], meta: {} };

    const promise = client.sectors();

    expect(client.loading()).toBe(true);

    const req = httpMock.expectOne('https://cms.test/api/sectors');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer runtime-token');

    req.flush(response);

    await expectAsync(promise).toBeResolvedTo(response);
    expect(client.loading()).toBe(false);
  });

  it('fetches statistics with sanitized query parameters', async () => {
    const response: StatisticsResponse = {
      data: {
        summaries: [],
        insights: [],
        availablePeriods: [],
        availableProvinces: [],
      },
    };

    const promise = client.statistics({ scope: 'all', intrant: 'energy', period: '2024-Q2', province: null });

    const req = httpMock.expectOne(request => request.url === 'https://cms.test/api/statistics');
    expect(req.request.params.get('scope')).toBe('all');
    expect(req.request.params.get('intrant')).toBe('energy');
    expect(req.request.params.get('period')).toBe('2024-Q2');
    expect(req.request.params.has('province')).toBeFalse();

    req.flush(response);

    await expectAsync(promise).toBeResolvedTo(response);
  });

  it('exposes billing plans via Strapi', async () => {
    const plan: BillingPlan = {
      id: 'free',
      tier: 'free',
      provider: 'internal',
      price: { amount: 0, currency: 'CAD', interval: 'month' },
      features: [],
      capabilities: { premiumVisibility: false, priorityAnalytics: false },
      i18nKey: 'plans.free',
      highlight: false,
      available: true,
    };
    const response: StrapiList<BillingPlan> = { data: [plan], meta: {} };

    const promise = client.billingPlans();

    const req = httpMock.expectOne('https://cms.test/billing/plans');
    expect(req.request.method).toBe('GET');

    req.flush(response);

    await expectAsync(promise).toBeResolvedTo(response);
  });

  it('fetches hydrocarbon signals with normalized query parameters', async () => {
    const signal: HydrocarbonSignal = {
      id: 'signal-1',
      feedItemId: 'feed-1',
      title: '48,000 barrels available',
      summary: 'Short surplus window from Alberta.',
      companyName: 'Northern Prairie Energy',
      publicationType: 'surplus',
      productType: 'crudeOil',
      businessReason: 'surplusStock',
      volumeBarrels: 48000,
      quantityUnit: 'bbl',
      minimumLotBarrels: 12000,
      availableFrom: '2026-02-01',
      availableUntil: '2026-02-12',
      estimatedDelayDays: null,
      originProvinceId: 'ab',
      targetProvinceId: 'bc',
      originSite: 'Edmonton terminal cluster',
      qualityGrade: 'wcs',
      logisticsMode: ['rail'],
      targetScope: ['bc'],
      storagePressureLevel: 'high',
      priceReference: 'WCS less rail differential',
      responseDeadline: null,
      contactChannel: 'Crude desk',
      notes: null,
      tags: ['hydrocarbon'],
      sourceKind: 'COMPANY',
      sourceLabel: 'Northern Prairie Energy',
      status: 'active',
    };
    const response: StrapiList<HydrocarbonSignal> = { data: [signal], meta: {} };

    const promise = client.hydrocarbonSignals({
      publicationType: 'surplus',
      storagePressureLevel: 'high',
      originProvinceId: 'ab',
      targetProvinceId: null,
      limit: 12,
    });

    const req = httpMock.expectOne(request => request.url === 'https://cms.test/api/hydrocarbon-signals');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('publicationType')).toBe('surplus');
    expect(req.request.params.get('storagePressureLevel')).toBe('high');
    expect(req.request.params.get('originProvinceId')).toBe('ab');
    expect(req.request.params.has('targetProvinceId')).toBeFalse();
    expect(req.request.params.get('limit')).toBe('12');

    req.flush(response);

    await expectAsync(promise).toBeResolvedTo(response);
  });
});
