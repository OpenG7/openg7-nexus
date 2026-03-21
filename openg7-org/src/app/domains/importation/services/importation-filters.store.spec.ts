import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RbacFacadeService } from '@app/core/security/rbac.facade';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { ImportationApiClient } from '../data-access/importation-api.client';
import { ImportationViewModelMapper } from '../data-access/importation.viewmodel.mapper';

import { ImportationAnalyticsService } from './importation-analytics.service';
import { ImportationFiltersStore } from './importation-filters.store';
import { ImportationPermissionsService } from './importation-permissions.service';

describe('ImportationFiltersStore', () => {
  let store: ImportationFiltersStore;
  let api: jasmine.SpyObj<ImportationApiClient>;
  let permissions: jasmine.SpyObj<ImportationPermissionsService>;
  let analytics: jasmine.SpyObj<ImportationAnalyticsService>;
  let router: jasmine.SpyObj<Router>;
  let translate: TranslateService;

  const destroyRefStub = {
    onDestroy: (_callback: () => void) => () => void 0,
  } as DestroyRef;

  const roleSignal = signal<'editor'>('editor');

  beforeEach(() => {
    api = jasmine.createSpyObj<ImportationApiClient>('ImportationApiClient', [
      'getFlows',
      'getCommodities',
      'getRiskFlags',
      'getSuppliers',
      'getAnnotations',
      'getWatchlists',
      'getKnowledgeBase',
      'createWatchlist',
      'scheduleReport',
    ]);

    api.getFlows.and.returnValue(
      of({
        timeline: [{ period: '2024-01', label: 'Jan 2024', totalValue: 1000, yoyDelta: 1.2 }],
        flows: [],
        coverage: 0.8,
        lastUpdated: '2024-01-15',
        dataProvider: 'StatCan',
      })
    );
    api.getCommodities.and.returnValue(
      of({ top: [], emerging: [], risk: [] })
    );
    api.getRiskFlags.and.returnValue(of([]));
    api.getSuppliers.and.returnValue(of({ suppliers: [] }));
    api.getAnnotations.and.returnValue(of({ annotations: [] }));
    api.getWatchlists.and.returnValue(of({ watchlists: [] }));
    api.getKnowledgeBase.and.returnValue(of({ articles: [], cta: null }));
    api.createWatchlist.and.returnValue(of({ id: '1', name: 'Test', owner: 'me', updatedAt: '2024-01-01', filters: {
      periodGranularity: 'month',
      periodValue: null,
      originScope: 'global',
      originCodes: [],
      hsSections: [],
      compareMode: false,
      compareWith: null,
    } }));
    api.scheduleReport.and.returnValue(of(void 0));

    permissions = jasmine.createSpyObj<ImportationPermissionsService>('ImportationPermissionsService', [
      'canViewCollaboration',
      'canManageWatchlists',
      'canScheduleReports',
      'canExportData',
    ]);
    permissions.canViewCollaboration.and.returnValue(true);
    permissions.canManageWatchlists.and.returnValue(true);
    permissions.canScheduleReports.and.returnValue(true);
    permissions.canExportData.and.returnValue(true);

    analytics = jasmine.createSpyObj<ImportationAnalyticsService>('ImportationAnalyticsService', [
      'trackPageViewed',
      'trackFilterChange',
      'trackMapDrilldown',
      'trackTimelinePlayback',
      'trackWatchlistCreated',
      'trackExportRequested',
    ]);

    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    translate = {
      currentLang: 'fr',
      defaultLang: 'fr',
    } as TranslateService;

    TestBed.configureTestingModule({
      providers: [
        ImportationFiltersStore,
        ImportationViewModelMapper,
        { provide: ImportationApiClient, useValue: api },
        { provide: ImportationPermissionsService, useValue: permissions },
        { provide: ImportationAnalyticsService, useValue: analytics },
        { provide: TranslateService, useValue: translate },
        { provide: DestroyRef, useValue: destroyRefStub },
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: RbacFacadeService,
          useValue: {
            role: roleSignal,
            currentRole: () => 'editor',
            hasPermission: () => true,
            isPremium: () => true,
          },
        },
      ],
    });

    store = TestBed.inject(ImportationFiltersStore);
  });

  function initializeStore(): void {
    const route = {
      snapshot: { queryParamMap: convertToParamMap({}) },
    } as ActivatedRoute;
    store.initialize(route, router);
    store.setPeriodValue('2024-01');
  }

  it('initializes filters and exposes the default view models', () => {
    initializeStore();

    expect(store.flowMapVm().loading).toBeFalse();
    expect(store.overviewVm().kpis.length).toBe(4);
    expect(analytics.trackPageViewed).toHaveBeenCalled();
  });

  it('toggles timeline playback and emits analytics', () => {
    initializeStore();

    analytics.trackTimelinePlayback.calls.reset();

    store.toggleTimelinePlayback();

    expect(store.flowMapVm().playing).toBeTrue();
    expect(analytics.trackTimelinePlayback).toHaveBeenCalledWith(true, jasmine.objectContaining({ periodGranularity: 'month' }));
  });

  it('gracefully falls back when optional importation endpoints return 404', () => {
    api.getSuppliers.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }))
    );
    api.getAnnotations.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }))
    );
    api.getWatchlists.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }))
    );
    api.getKnowledgeBase.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }))
    );

    initializeStore();

    expect(store.supplierVm().loading).toBeFalse();
    expect(store.supplierVm().error).toBeNull();
    expect(store.supplierVm().suppliers).toEqual([]);

    expect(store.collaborationVm().loading).toBeFalse();
    expect(store.collaborationVm().error).toBeNull();
    expect(store.collaborationVm().annotations).toEqual([]);
    expect(store.collaborationVm().watchlists).toEqual([]);

    expect(store.knowledgeVm().loading).toBeFalse();
    expect(store.knowledgeVm().error).toBeNull();
    expect(store.knowledgeVm().articles).toEqual([]);
    expect(store.knowledgeVm().cta).toBeNull();
  });

  it('keeps collaboration state consistent when a non-404 collaboration request fails', () => {
    api.getAnnotations.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error', error: { message: 'boom' } }))
    );
    api.getWatchlists.and.returnValue(of({ watchlists: [{
      id: 'watch-1',
      name: 'Safe',
      owner: 'Local workspace',
      updatedAt: '2024-01-01',
      filters: {
        periodGranularity: 'month',
        periodValue: null,
        originScope: 'global',
        originCodes: [],
        hsSections: [],
        compareMode: false,
        compareWith: null,
      },
    }] }));

    initializeStore();

    expect(store.collaborationVm().loading).toBeFalse();
    expect(store.collaborationVm().error).toBe('Http failure response for (unknown url): 500 Server Error');
  });
});

