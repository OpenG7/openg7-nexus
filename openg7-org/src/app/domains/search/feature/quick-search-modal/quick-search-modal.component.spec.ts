import { PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from '@app/core/auth/auth.service';
import { RecentSearch, SearchContext, SearchResult, SearchSection } from '@app/core/models/search';
import { AnalyticsService } from '@app/core/observability/analytics.service';
import { RbacFacadeService } from '@app/core/security/rbac.facade';
import { SavedSearchesApiService } from '@app/core/services/saved-searches-api.service';
import { OG7_MODAL_DATA, OG7_MODAL_REF } from '@app/core/ui/modal/og7-modal.tokens';
import { Og7ModalRef } from '@app/core/ui/modal/og7-modal.types';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, of, throwError } from 'rxjs';

import { SearchHistoryStore } from '../search-history.store';
import { SearchService } from '../search.service';

import { QuickSearchModalComponent, QuickSearchModalData } from './quick-search-modal.component';

class MockSearchService {
  readonly searchCalls: Array<{ query: string; context: SearchContext; subject: Subject<SearchResult> }> = [];

  search$(query: string, context: SearchContext) {
    const subject = new Subject<SearchResult>();
    this.searchCalls.push({ query, context, subject });
    return subject.asObservable();
  }
}

class MockSearchHistoryStore {
  private readonly entriesSig = signal<RecentSearch[]>([]);
  readonly entries = this.entriesSig.asReadonly();

  readonly add = jasmine.createSpy('add');
  readonly clear = jasmine.createSpy('clear');

  setEntries(entries: RecentSearch[]) {
    this.entriesSig.set(entries);
  }
}

class MockAnalyticsService {
  readonly emit = jasmine.createSpy('emit');
}

class MockModalRef implements Og7ModalRef<void> {
  readonly id = 1;
  readonly closed = signal(false);
  readonly result = Promise.resolve(undefined);
  readonly close = jasmine.createSpy('close');
  readonly dismiss = jasmine.createSpy('dismiss');
}

class MockRbacFacadeService {
  readonly currentRole = jasmine.createSpy('currentRole').and.returnValue('editor');
  readonly isPremium = jasmine.createSpy('isPremium').and.returnValue(true);
}

class MockAuthService {
  private readonly isAuthenticatedSig = signal(true);
  readonly isAuthenticated = this.isAuthenticatedSig.asReadonly();

  setAuthenticated(value: boolean) {
    this.isAuthenticatedSig.set(value);
  }
}

class MockSavedSearchesApiService {
  readonly createMine = jasmine.createSpy('createMine').and.returnValue(
    of({
      id: 'saved-1',
      name: 'Initial',
      scope: 'all' as const,
      filters: { query: 'Initial' },
      notifyEnabled: false,
      frequency: 'daily' as const,
      lastRunAt: null,
      createdAt: null,
      updatedAt: null,
    }),
  );
}

describe('QuickSearchModalComponent', () => {
  let fixture: ComponentFixture<QuickSearchModalComponent>;
  let component: QuickSearchModalComponent;
  let searchService: MockSearchService;
  let history: MockSearchHistoryStore;
  let analytics: MockAnalyticsService;
  let modalRef: MockModalRef;
  let rbac: MockRbacFacadeService;
  let auth: MockAuthService;
  let savedSearchesApi: MockSavedSearchesApiService;
  let modalData: QuickSearchModalData;
  let router: Router;
  let host: HTMLElement;

  beforeEach(async () => {
    searchService = new MockSearchService();
    history = new MockSearchHistoryStore();
    analytics = new MockAnalyticsService();
    modalRef = new MockModalRef();
    rbac = new MockRbacFacadeService();
    auth = new MockAuthService();
    savedSearchesApi = new MockSavedSearchesApiService();
    modalData = { initialQuery: 'enbridge', context: { sectorId: 'energy' }, source: 'unit-test' };

    await TestBed.configureTestingModule({
      imports: [QuickSearchModalComponent, RouterTestingModule, TranslateModule.forRoot()],
      providers: [
        { provide: SearchService, useValue: searchService },
        { provide: SearchHistoryStore, useValue: history },
        { provide: AnalyticsService, useValue: analytics },
        { provide: RbacFacadeService, useValue: rbac },
        { provide: AuthService, useValue: auth },
        { provide: SavedSearchesApiService, useValue: savedSearchesApi },
        { provide: OG7_MODAL_REF, useValue: modalRef },
        { provide: OG7_MODAL_DATA, useValue: modalData },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setDefaultLang('en');
    translate.use('en');

    fixture = TestBed.createComponent(QuickSearchModalComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('requests search results with computed context and handles success', () => {
    expect(searchService.searchCalls.length).toBe(1);
    const request = searchService.searchCalls[0];

    expect(request.query).toBe('enbridge');
    expect(request.context).toEqual({
      role: 'editor',
      locale: 'en',
      sectorId: 'energy',
      isPremium: true,
    });
    expect(component.loading()).withContext('should be loading until results arrive').toBeTrue();
    expect(component.errored()).toBeFalse();

    const sections: SearchSection[] = [
      {
        id: 'companies',
        title: 'Companies',
        items: [{ id: 'item-1', title: 'Acme Inc.' }],
      },
    ];

    request.subject.next({ query: 'enbridge', sections });

    expect(component.loading()).toBeFalse();
    expect(component.errored()).toBeFalse();
    expect(component.sections()).toEqual(sections);
    expect(analytics.emit).toHaveBeenCalledWith(
      'result_impression',
      jasmine.objectContaining({ query: 'enbridge', resultCount: 1 }),
    );
    expect(analytics.emit).toHaveBeenCalledWith(
      'search_time_to_first_result',
      jasmine.objectContaining({ query: 'enbridge' }),
    );
  });

  it('sets errored state when search fails', () => {
    const request = searchService.searchCalls[0];
    request.subject.error(new Error('network error'));

    expect(component.loading()).toBeFalse();
    expect(component.errored()).toBeTrue();
  });

  it('selectActive emits analytics, stores history and performs navigation', () => {
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    const sections: SearchSection[] = [
      {
        id: 'actions',
        title: 'Actions',
        items: [
          {
            id: 'item-1',
            title: 'Go to feed',
            action: { type: 'route', commands: ['/feed'] },
          },
        ],
      },
    ];

    component.query.set('feed');
    component.sections.set(sections);
    component.activeIndex.set(0);

    const initialAnalyticsCalls = analytics.emit.calls.count();

    component.selectActive();

    expect(analytics.emit.calls.count()).toBe(initialAnalyticsCalls + 1);
    expect(analytics.emit).toHaveBeenCalledWith(
      'result_selected',
      jasmine.objectContaining({ id: 'item-1', query: 'feed', actionType: 'route' }),
    );
    expect(history.add).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: 'item-1', label: 'Go to feed' }),
    );
    expect(navigate).toHaveBeenCalledWith(['/feed'], undefined);
    expect(modalRef.close).toHaveBeenCalled();
  });

  it('retry triggers a fresh search request', async () => {
    expect(searchService.searchCalls.length).toBe(1);
    component.retry();
    await fixture.whenStable();
    expect(searchService.searchCalls.length).toBe(2);
  });

  it('saveCurrentQuery stores the active query when authenticated', () => {
    auth.setAuthenticated(true);
    analytics.emit.calls.reset();
    savedSearchesApi.createMine.calls.reset();
    component.query.set('critical minerals');

    component.saveCurrentQuery();

    expect(savedSearchesApi.createMine).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name: 'critical minerals',
        scope: 'map',
        frequency: 'daily',
        notifyEnabled: false,
        filters: jasmine.objectContaining({ query: 'critical minerals', sectorId: 'energy' }),
      }),
    );
    expect(component.saveStatus()).toBe('success');
    expect(analytics.emit).toHaveBeenCalledWith(
      'search_saved',
      jasmine.objectContaining({ query: 'critical minerals', savedSearchId: 'saved-1' }),
    );
  });

  it('saveCurrentQuery reports authRequired when user is anonymous', () => {
    auth.setAuthenticated(false);
    analytics.emit.calls.reset();
    savedSearchesApi.createMine.calls.reset();
    component.query.set('aluminium');

    component.saveCurrentQuery();

    expect(savedSearchesApi.createMine).not.toHaveBeenCalled();
    expect(component.saveStatus()).toBe('authRequired');
    expect(analytics.emit).toHaveBeenCalledWith(
      'search_save_denied',
      jasmine.objectContaining({ reason: 'unauthenticated', query: 'aluminium' }),
    );
  });

  it('saveCurrentQuery reports error when API creation fails', () => {
    auth.setAuthenticated(true);
    analytics.emit.calls.reset();
    savedSearchesApi.createMine.and.returnValue(throwError(() => new Error('boom')));
    component.query.set('battery');

    component.saveCurrentQuery();

    expect(component.saveStatus()).toBe('error');
    expect(analytics.emit).toHaveBeenCalledWith(
      'search_save_failed',
      jasmine.objectContaining({ query: 'battery' }),
    );
  });

  it('allows typing text in the query input', () => {
    const input = host.querySelector<HTMLInputElement>('#quick-search-input');
    expect(input).withContext('input element should be rendered').not.toBeNull();
    if (!input) {
      return;
    }

    const keyboardEvent = new KeyboardEvent('keydown', { key: 'P', cancelable: true });
    input.dispatchEvent(keyboardEvent);

    expect(keyboardEvent.defaultPrevented)
      .withContext('printable keys should not be prevented so typing works')
      .toBeFalse();

    input.value = 'PATATE';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.query()).toBe('PATATE');
    expect(component.queryControl.value).toBe('PATATE');
    const lastRequest = searchService.searchCalls.at(-1);
    expect(lastRequest?.query).toBe('PATATE');
  });

  it('exposes autocomplete suggestions from history and result items', () => {
    history.setEntries([
      {
        id: 'history-energy',
        label: 'Energy corridor',
        visitedAt: new Date().toISOString(),
      },
      {
        id: 'history-enbridge',
        label: 'Enbridge pipeline',
        visitedAt: new Date().toISOString(),
      },
    ]);
    component.sections.set([
      {
        id: 'companies',
        title: 'Companies',
        items: [
          { id: 'company-1', title: 'Enbridge Inc.' },
          { id: 'company-2', title: 'Magna International' },
        ],
      },
    ]);
    component.queryControl.setValue('en');
    fixture.detectChanges();

    expect(component.autocompleteSuggestions()).toEqual([
      'Energy corridor',
      'Enbridge pipeline',
      'Enbridge Inc.',
    ]);
  });

  it('applies an autocomplete suggestion from the quick-search input', () => {
    history.setEntries([
      {
        id: 'history-enbridge',
        label: 'Enbridge Inc.',
        visitedAt: new Date().toISOString(),
      },
    ]);
    component.queryControl.setValue('en');
    fixture.detectChanges();
    analytics.emit.calls.reset();

    const suggestionButton = host.querySelector<HTMLButtonElement>('[data-og7-id="quick-search-autocomplete-option-0"]');
    expect(suggestionButton).withContext('autocomplete suggestion should be rendered').not.toBeNull();

    suggestionButton?.click();
    fixture.detectChanges();

    expect(component.query()).toBe('Enbridge Inc.');
    expect(component.queryControl.value).toBe('Enbridge Inc.');
    expect(searchService.searchCalls.at(-1)?.query).toBe('Enbridge Inc.');
    expect(analytics.emit).toHaveBeenCalledWith(
      'search_autocomplete_selected',
      jasmine.objectContaining({ query: 'en', suggestion: 'Enbridge Inc.' }),
    );
  });

  it('closes the modal when the close button is clicked', () => {
    modalRef.close.calls.reset();
    const button = host.querySelector<HTMLButtonElement>('[data-og7-id="quick-search-close"]');
    expect(button).withContext('close button should be present').not.toBeNull();
    button?.click();
    expect(modalRef.close).toHaveBeenCalledTimes(1);
  });

  it('prevents bubbling when close button is clicked', () => {
    modalRef.close.calls.reset();
    const event = jasmine.createSpyObj<Event>('Event', ['preventDefault', 'stopPropagation']);

    component.onCloseClick(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(modalRef.close).toHaveBeenCalled();
  });

  it('onHistorySelect replays saved action and closes the modal', () => {
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    analytics.emit.calls.reset();
    history.add.calls.reset();
    modalRef.close.calls.reset();

    component.query.set('history query');

    const entry: RecentSearch = {
      id: 'history-1',
      label: 'Go back to feed',
      action: { type: 'route', commands: ['/feed'] },
      visitedAt: new Date().toISOString(),
    };

    component.onHistorySelect(entry);

    expect(history.add).toHaveBeenCalled();
    expect(analytics.emit).toHaveBeenCalledWith(
      'result_selected',
      jasmine.objectContaining({ id: 'history-1', source: 'history', actionType: 'route' }),
    );
    expect(navigate).toHaveBeenCalledWith(['/feed'], undefined);
    expect(modalRef.close).toHaveBeenCalled();
  });

  it('clearHistory delegates to the history store', () => {
    component.clearHistory();
    expect(history.clear).toHaveBeenCalled();
  });
});
