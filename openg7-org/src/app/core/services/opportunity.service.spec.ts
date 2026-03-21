import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';

import { API_URL } from '../config/environment.tokens';
import { SUPPRESS_ERROR_TOAST } from '../http/error.interceptor.tokens';
import { OpportunityMatch } from '../models/opportunity';
import { NotificationStore, NotificationStoreApi } from '../observability/notification.store';

import { OpportunityService } from './opportunity.service';

describe('OpportunityService', () => {
  let service: OpportunityService;
  let translate: jasmine.SpyObj<TranslateService>;
  let notifications: jasmine.SpyObj<NotificationStoreApi>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    translate = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translate.instant.and.returnValue('demo-translation');

    notifications = jasmine.createSpyObj<NotificationStoreApi>('NotificationStore', ['info', 'error', 'success']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OpportunityService,
        TransferState,
        { provide: API_URL, useValue: 'https://cms.local' },
        { provide: TranslateService, useValue: translate },
        { provide: NotificationStore, useValue: notifications },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(OpportunityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('hydrates with demo matches, cloning entries and clearing previous state', () => {
    const demoMatches: OpportunityMatch[] = [
      {
        id: 1,
        commodity: 'Hydrogen',
        mode: 'export',
        confidence: 0.82,
        distanceKm: 1250,
        co2Estimate: 18,
        buyer: {
          id: 10,
          name: 'Buyer Corp',
          province: 'QC',
          sector: 'energy',
          capability: 'import',
        },
        seller: {
          id: 11,
          name: 'Seller Inc',
          province: 'AB',
          sector: 'energy',
          capability: 'export',
        },
      },
    ];

    service.hydrateWithDemo(demoMatches);

    const items = service.items();
    expect(items().length).toBe(1);
    expect(items()[0]).not.toBe(demoMatches[0]);
    expect(items()[0].buyer).not.toBe(demoMatches[0].buyer);
    expect(items()[0].seller).not.toBe(demoMatches[0].seller);

    (demoMatches[0].buyer as any).name = 'Mutated Name';
    (demoMatches[0].seller as any).name = 'Other Mutation';

    expect(service.items()()[0].buyer.name).toBe('Buyer Corp');
    expect(service.items()()[0].seller.name).toBe('Seller Inc');
    expect(service.items()()[0].co2Estimate).toBe(18);

    expect(service.error()()).toBeNull();
    expect(service.loading()()).toBeFalse();

    expect(translate.instant).toHaveBeenCalledWith('opportunities.notifications.demo', { count: 1 });
    expect(notifications.info).toHaveBeenCalledWith('demo-translation', {
      source: 'matches',
      metadata: { count: 1, mode: 'demo' },
    });
  });

  it('ignores stale responses from previous requests when a newer one completes', () => {
    service.loadMatches({ q: 'first' });
    const firstRequest = httpMock.expectOne((req) => req.url === 'https://cms.local/api/opportunity-matches' && req.params.get('q') === 'first');

    service.loadMatches({ q: 'second' });
    const secondRequest = httpMock.expectOne((req) => req.url === 'https://cms.local/api/opportunity-matches' && req.params.get('q') === 'second');

    const latestResponse = {
      data: [
        {
          id: 42,
          attributes: {
            commodity: 'Lithium Hydroxide',
            mode: 'export',
            confidence: 0.7,
            distanceKm: 240,
            co2Estimate: 12,
            buyer: {
              data: {
                id: 200,
                attributes: {
                  name: 'Latest Buyer',
                  province: 'QC',
                  sector: 'energy',
                  capability: 'import',
                },
              },
            },
            seller: {
              data: {
                id: 201,
                attributes: {
                  name: 'Latest Seller',
                  province: 'AB',
                  sector: 'energy',
                  capability: 'export',
                },
              },
            },
          },
        },
      ],
    };

    secondRequest.flush(latestResponse);

    expect(service.items()().length).toBe(1);
    expect(service.items()()[0].commodity).toBe('Lithium Hydroxide');
    expect(service.items()()[0].buyer.name).toBe('Latest Buyer');
    expect(service.items()()[0].seller.name).toBe('Latest Seller');
    expect(service.loading()()).toBeFalse();
    expect(service.error()()).toBeNull();
    expect(notifications.info).toHaveBeenCalledWith('demo-translation', {
      source: 'matches',
      metadata: { count: 1 },
    });

    const infoCallCount = notifications.info.calls.count();
    const translateCallCount = translate.instant.calls.count();

    const staleResponse = {
      data: [
        {
          id: 1,
          attributes: {
            commodity: 'Outdated Commodity',
            mode: 'export',
            confidence: 0.4,
            distanceKm: 500,
            buyer: {
              data: {
                id: 101,
                attributes: {
                  name: 'Stale Buyer',
                  province: 'QC',
                  sector: 'energy',
                  capability: 'import',
                },
              },
            },
            seller: {
              data: {
                id: 102,
                attributes: {
                  name: 'Stale Seller',
                  province: 'AB',
                  sector: 'energy',
                  capability: 'export',
                },
              },
            },
          },
        },
      ],
    };

    firstRequest.flush(staleResponse);

    expect(notifications.info.calls.count()).toBe(infoCallCount);
    expect(translate.instant.calls.count()).toBe(translateCallCount);
    expect(service.items()()[0].commodity).toBe('Lithium Hydroxide');
    expect(service.loading()()).toBeFalse();
    expect(service.error()()).toBeNull();
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('loads a specific match by id when it is not already cached', (done) => {
    const response = {
      data: {
        id: 77,
        attributes: {
          commodity: 'Clean Ammonia',
          mode: 'export',
          confidence: 0.91,
          distanceKm: 480,
          co2Estimate: 22,
          buyer: {
            data: {
              id: 301,
              attributes: {
                name: 'Target Buyer',
                province: 'QC',
                sector: 'energy',
                capability: 'import',
              },
            },
          },
          seller: {
            data: {
              id: 302,
              attributes: {
                name: 'Target Seller',
                province: 'AB',
                sector: 'energy',
                capability: 'export',
              },
            },
          },
        },
      },
    };

    service.loadMatchById(77).subscribe((match) => {
      expect(match?.id).toBe(77);
      expect(service.items()().some((item) => item.id === 77)).toBeTrue();
      expect(notifications.error).not.toHaveBeenCalled();
      done();
    });

    const request = httpMock.expectOne(
      (req) => req.url === 'https://cms.local/api/opportunity-matches/77' && req.params.get('populate') === 'buyer,seller'
    );

    request.flush(response);
  });

  it('returns a cached match without issuing a network request when it already exists', () => {
    service.hydrateWithDemo([
      {
        id: 55,
        commodity: 'Hydrogen',
        mode: 'export',
        confidence: 0.6,
        buyer: {
          id: 1000,
          name: 'Cached Buyer',
          province: 'QC',
          sector: 'energy',
          capability: 'import',
        },
        seller: {
          id: 1001,
          name: 'Cached Seller',
          province: 'AB',
          sector: 'energy',
          capability: 'export',
        },
      },
    ]);

    let result: OpportunityMatch | null | undefined;
    service.loadMatchById(55).subscribe((match) => {
      result = match;
    });

    httpMock.expectNone('https://cms.local/api/opportunity-matches/55');
    expect(result?.id).toBe(55);
  });

  it('searches matches without mutating the reactive collection and falls back to cached items on request failure', async () => {
    service.hydrateWithDemo([
      {
        id: 88,
        commodity: 'Hydrogen corridor',
        mode: 'import',
        confidence: 0.8,
        buyer: {
          id: 880,
          name: 'Hydrogen Buyer',
          province: 'QC',
          sector: 'energy',
          capability: 'import',
        },
        seller: {
          id: 881,
          name: 'Hydrogen Seller',
          province: 'ON',
          sector: 'energy',
          capability: 'export',
        },
      },
    ]);

    const pending = service.searchMatches({ sector: 'energy', province: 'QC', q: 'hydrogen' });
    const request = httpMock.expectOne(
      (req) =>
        req.url === 'https://cms.local/api/opportunity-matches' &&
        req.params.get('sector') === 'energy' &&
        req.params.get('province') === 'QC' &&
        req.params.get('q') === 'hydrogen'
    );
    expect(request.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();
    request.flush('downstream failure', { status: 500, statusText: 'Server Error' });

    const result = await pending;

    expect(result.map((entry) => entry.id)).toEqual([88]);
    expect(service.items()().map((entry) => entry.id)).toEqual([88]);
  });

  it('finds one match silently by id and caches it without notifications', async () => {
    const pending = service.findMatchById(91);
    const request = httpMock.expectOne(
      (req) => req.url === 'https://cms.local/api/opportunity-matches/91' && req.params.get('populate') === 'buyer,seller'
    );
    expect(request.request.context.get(SUPPRESS_ERROR_TOAST)).toBeTrue();

    request.flush({
      data: {
        id: 91,
        attributes: {
          commodity: 'Green steel',
          mode: 'export',
          confidence: 0.74,
          buyer: {
            data: {
              id: 910,
              attributes: {
                name: 'Steel Buyer',
                province: 'QC',
                sector: 'manufacturing',
                capability: 'import',
              },
            },
          },
          seller: {
            data: {
              id: 911,
              attributes: {
                name: 'Steel Seller',
                province: 'ON',
                sector: 'manufacturing',
                capability: 'export',
              },
            },
          },
        },
      },
    });

    const match = await pending;

    expect(match?.id).toBe(91);
    expect(service.items()().some((item) => item.id === 91)).toBeTrue();
    expect(notifications.error).not.toHaveBeenCalled();
    expect(notifications.info).not.toHaveBeenCalledWith('demo-translation', jasmine.anything());
  });
});
