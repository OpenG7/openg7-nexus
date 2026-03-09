import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { ReplaySubject } from 'rxjs';

import { StrategicSectorsPage } from './strategic-sectors.page';

describe('StrategicSectorsPage', () => {
  let queryParamMap$: ReplaySubject<ParamMap>;
  let activatedRoute: ActivatedRoute;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    queryParamMap$ = new ReplaySubject<ParamMap>(1);
    activatedRoute = {
      queryParamMap: queryParamMap$.asObservable(),
    } as ActivatedRoute;
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    TestBed.configureTestingModule({
      imports: [StrategicSectorsPage],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: Router, useValue: router },
      ],
    });
    TestBed.overrideComponent(StrategicSectorsPage, {
      set: {
        imports: [],
        template: '',
      },
    });
  });

  it('hydrates tab, search and filters from query params', () => {
    queryParamMap$.next(
      convertToParamMap({
        sector: 'energy',
        q: '  gas naturel  ',
        source: 'QC',
        target: 'ON',
        input: 'gas',
        availability: 'tight',
        criticality: 'medium',
        horizon: '30d',
      }),
    );

    const fixture = TestBed.createComponent(StrategicSectorsPage);
    fixture.detectChanges();
    const component = fixture.componentInstance as StrategicSectorsPage & {
      activeTab: () => string;
      searchQuery: () => string;
      filterValues: () => Record<string, string>;
      visibleCards: () => Array<{ sectorId: string }>;
    };

    expect(component.activeTab()).toBe('energy');
    expect(component.searchQuery()).toBe('gas naturel');
    expect(component.filterValues()).toEqual({
      source: 'QC',
      target: 'ON',
      input: 'gas',
      availability: 'tight',
      criticality: 'medium',
      horizon: '30d',
    });
    expect(component.visibleCards().every((card) => card.sectorId === 'energy')).toBeTrue();
  });

  it('accepts province filters sourced from shared taxonomy options', () => {
    queryParamMap$.next(
      convertToParamMap({
        source: 'MB',
        input: 'grain',
      }),
    );

    const fixture = TestBed.createComponent(StrategicSectorsPage);
    fixture.detectChanges();
    const component = fixture.componentInstance as StrategicSectorsPage & {
      filterValues: () => Record<string, string>;
      visibleCards: () => Array<{ id: string }>;
    };

    expect(component.filterValues()['source']).toBe('MB');
    expect(component.visibleCards().map((card) => card.id)).toContain('agri-food');
  });

  it('syncs query params when tab and search are updated', () => {
    queryParamMap$.next(convertToParamMap({}));

    const fixture = TestBed.createComponent(StrategicSectorsPage);
    fixture.detectChanges();
    const component = fixture.componentInstance as StrategicSectorsPage & {
      setActiveTab: (tab: string) => void;
      onSearchInput: (value: string) => void;
    };

    component.setActiveTab('energy');
    component.onSearchInput('  petro ');

    const [commands, extras] = router.navigate.calls.mostRecent().args as [
      string[],
      { queryParams: Record<string, string | null>; relativeTo: unknown; queryParamsHandling: string; replaceUrl: boolean },
    ];

    expect(commands).toEqual([]);
    expect(extras.relativeTo).toBe(activatedRoute);
    expect(extras.queryParamsHandling).toBe('merge');
    expect(extras.replaceUrl).toBeTrue();
    expect(extras.queryParams).toEqual(
      jasmine.objectContaining({
        sector: 'energy',
        q: 'petro',
      }),
    );
  });

  it('computes active filter count and chips when filters change', () => {
    queryParamMap$.next(convertToParamMap({}));

    const fixture = TestBed.createComponent(StrategicSectorsPage);
    fixture.detectChanges();
    const component = fixture.componentInstance as StrategicSectorsPage & {
      onFilterChange: (event: { key: string; value: string }) => void;
      activeFiltersCount: () => number;
      activeFilterChips: () => Array<{ key: string; value: string }>;
    };

    component.onFilterChange({ key: 'source', value: 'QC' });
    component.onFilterChange({ key: 'availability', value: 'tight' });

    expect(component.activeFiltersCount()).toBe(2);
    expect(component.activeFilterChips()).toEqual(
      jasmine.arrayContaining([
        jasmine.objectContaining({ key: 'source', value: 'QC' }),
        jasmine.objectContaining({ key: 'availability', value: 'tight' }),
      ]),
    );
  });

  it('computes workspace KPI cards from current visible sectors', () => {
    queryParamMap$.next(convertToParamMap({ sector: 'energy' }));

    const fixture = TestBed.createComponent(StrategicSectorsPage);
    fixture.detectChanges();
    const component = fixture.componentInstance as StrategicSectorsPage & {
      workspaceKpis: () => Array<{ labelKey: string; value: string }>;
    };

    expect(component.workspaceKpis()).toEqual(
      jasmine.arrayContaining([
        jasmine.objectContaining({ labelKey: 'pages.strategicSectors.workspace.kpi.corridors' }),
        jasmine.objectContaining({ labelKey: 'pages.strategicSectors.workspace.kpi.provinces' }),
        jasmine.objectContaining({ labelKey: 'pages.strategicSectors.workspace.kpi.critical' }),
      ]),
    );
  });

  it('clears a single filter and removes it from query params', () => {
    queryParamMap$.next(convertToParamMap({ source: 'QC' }));

    const fixture = TestBed.createComponent(StrategicSectorsPage);
    fixture.detectChanges();
    const component = fixture.componentInstance as StrategicSectorsPage & {
      clearFilter: (key: string) => void;
      filterValues: () => Record<string, string>;
    };

    component.clearFilter('source');

    expect(component.filterValues()['source']).toBe('all');
    const [, extras] = router.navigate.calls.mostRecent().args as [
      string[],
      { queryParams: Record<string, string | null> },
    ];
    expect(extras.queryParams['source']).toBeNull();
  });

  it('closes mobile filters when escape is pressed', () => {
    queryParamMap$.next(convertToParamMap({}));

    const fixture = TestBed.createComponent(StrategicSectorsPage);
    fixture.detectChanges();
    const component = fixture.componentInstance as StrategicSectorsPage & {
      openMobileFilters: () => void;
      mobileFiltersOpen: () => boolean;
      onEscape: () => void;
    };

    component.openMobileFilters();
    expect(component.mobileFiltersOpen()).toBeTrue();

    component.onEscape();

    expect(component.mobileFiltersOpen()).toBeFalse();
  });

  it('clears search and removes q from query params', () => {
    queryParamMap$.next(convertToParamMap({ q: 'energy' }));

    const fixture = TestBed.createComponent(StrategicSectorsPage);
    fixture.detectChanges();
    const component = fixture.componentInstance as StrategicSectorsPage & {
      searchQuery: () => string;
      onClearSearch: () => void;
    };

    expect(component.searchQuery()).toBe('energy');
    component.onClearSearch();
    expect(component.searchQuery()).toBe('');

    const [, extras] = router.navigate.calls.mostRecent().args as [
      string[],
      { queryParams: Record<string, string | null> },
    ];
    expect(extras.queryParams['q']).toBeNull();
  });

  it('handles Ctrl+K shortcut by preventing default behavior', () => {
    queryParamMap$.next(convertToParamMap({}));

    const fixture = TestBed.createComponent(StrategicSectorsPage);
    fixture.detectChanges();
    const component = fixture.componentInstance as StrategicSectorsPage & {
      onGlobalKeydown: (event: KeyboardEvent) => void;
    };

    const preventDefault = jasmine.createSpy('preventDefault');
    const event = {
      key: 'k',
      ctrlKey: true,
      metaKey: false,
      preventDefault,
    } as unknown as KeyboardEvent;

    component.onGlobalKeydown(event);

    expect(preventDefault).toHaveBeenCalled();
  });
});
