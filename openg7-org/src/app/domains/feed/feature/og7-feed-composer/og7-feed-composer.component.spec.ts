import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { selectProvinces, selectSectors } from '@app/state/catalog/catalog.selectors';
import {
  feedModeSig,
  feedTypeSig,
  fromProvinceIdSig,
  sectorIdSig,
  toProvinceIdSig,
} from '@app/state/shared-feed-signals';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { FeedItem, FeedPublishOutcome } from '../models/feed.models';
import { FeedConnectionMatchService } from '../services/feed-connection-match.service';
import { FeedRealtimeService } from '../services/feed-realtime.service';

import { Og7FeedComposerComponent } from './og7-feed-composer.component';

class FeedRealtimeServiceMock {
  private readonly connectedSig = signal(true);

  outcome: FeedPublishOutcome = {
    status: 'success',
    validation: {
      valid: true,
      errors: [],
      warnings: [],
    },
    item: createPublishedItem(),
  };

  readonly connectionState = {
    connected: this.connectedSig.asReadonly(),
    reconnecting: signal(false).asReadonly(),
    error: signal<string | null>(null).asReadonly(),
  };

  readonly publishDraft = jasmine.createSpy('publishDraft').and.callFake(async () => this.outcome);

  setConnected(value: boolean): void {
    this.connectedSig.set(value);
  }
}

class StoreMock {
  private readonly provincesSig = signal([
    { id: 'on', name: 'Ontario' },
    { id: 'qc', name: 'Quebec' },
  ]);
  private readonly sectorsSig = signal([
    { id: 'energy', name: 'Energy' },
  ]);

  readonly selectSignal = jasmine.createSpy('selectSignal').and.callFake((selector: unknown) => {
    if (selector === selectProvinces) {
      return this.provincesSig.asReadonly();
    }
    if (selector === selectSectors) {
      return this.sectorsSig.asReadonly();
    }
    throw new Error(`Unexpected selector in StoreMock: ${String(selector)}`);
  });
}

class FeedConnectionMatchServiceMock {
  readonly resolveDraftConnectionMatchId = jasmine
    .createSpy('resolveDraftConnectionMatchId')
    .and.resolveTo(91);
}

function createPublishedItem(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id: 'feed-item-1',
    createdAt: '2026-03-17T10:00:00.000Z',
    updatedAt: '2026-03-17T10:00:00.000Z',
    type: 'REQUEST',
    sectorId: 'energy',
    title: 'Opportunity linked to alert-001',
    summary: 'Cross-border balancing support required after the weather alert.',
    fromProvinceId: 'on',
    toProvinceId: 'qc',
    mode: 'IMPORT',
    tags: ['linked-alert', 'grid'],
    originType: 'alert',
    originId: 'alert-001',
    connectionMatchId: 73,
    source: {
      kind: 'USER',
      label: 'You',
    },
    status: 'confirmed',
    ...overrides,
  };
}

function resetFeedSignals(): void {
  feedTypeSig.set(null);
  sectorIdSig.set(null);
  feedModeSig.set('BOTH');
  fromProvinceIdSig.set(null);
  toProvinceIdSig.set(null);
}

describe('Og7FeedComposerComponent', () => {
  let authState: ReturnType<typeof signal<boolean>>;
  let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let feed: FeedRealtimeServiceMock;
  let connectionMatcher: FeedConnectionMatchServiceMock;
  let router: jasmine.SpyObj<Pick<Router, 'navigate'> & { url: string }>;

  beforeEach(async () => {
    resetFeedSignals();
    authState = signal(true);
    queryParamMap$ = new BehaviorSubject(
      convertToParamMap({
        draftSource: 'alert',
        draftAlertId: 'alert-001',
        draftOriginType: 'alert',
        draftOriginId: 'alert-001',
        draftType: 'REQUEST',
        draftMode: 'IMPORT',
        draftSectorId: 'energy',
        draftFromProvinceId: 'on',
        draftToProvinceId: 'qc',
        draftTitle: 'Opportunity linked to alert-001',
        draftSummary: 'Cross-border balancing support required after the weather alert.',
        draftTags: 'linked-alert,grid',
        draftConnectionMatchId: '73',
      })
    );
    router = jasmine.createSpyObj('Router', ['navigate'], {
      url: '/feed?draftSource=alert&draftTitle=Winter%20peak',
    });
    router.navigate.and.resolveTo(true);

    const routeStub: Pick<ActivatedRoute, 'queryParamMap' | 'snapshot'> = {
      queryParamMap: queryParamMap$.asObservable(),
      get snapshot() {
        return { queryParamMap: queryParamMap$.value } as ActivatedRoute['snapshot'];
      },
    };

    await TestBed.configureTestingModule({
      imports: [Og7FeedComposerComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: AuthService, useValue: { isAuthenticated: authState.asReadonly() } as Pick<AuthService, 'isAuthenticated'> },
        { provide: FeedRealtimeService, useClass: FeedRealtimeServiceMock },
        { provide: FeedConnectionMatchService, useClass: FeedConnectionMatchServiceMock },
        { provide: Router, useValue: router },
        { provide: Store, useClass: StoreMock },
      ],
    }).compileComponents();

    feed = TestBed.inject(FeedRealtimeService) as unknown as FeedRealtimeServiceMock;
    connectionMatcher = TestBed.inject(FeedConnectionMatchService) as unknown as FeedConnectionMatchServiceMock;
  });

  it('prefills the linked alert draft and sends the explicit origin to the async feed service on submit', async () => {
    const fixture = TestBed.createComponent(Og7FeedComposerComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('#composer-title') as HTMLInputElement;
    const summary = fixture.nativeElement.querySelector('#composer-summary') as HTMLTextAreaElement;
    const submit = fixture.nativeElement.querySelector('.feed-composer__submit') as HTMLButtonElement;

    expect(title.value).toBe('Opportunity linked to alert-001');
    expect(summary.value).toBe('Cross-border balancing support required after the weather alert.');
    expect(submit.disabled).toBeFalse();

    submit.click();
    await fixture.whenStable();

    expect(feed.publishDraft).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: 'REQUEST',
        sectorId: 'energy',
        mode: 'IMPORT',
        fromProvinceId: 'on',
        toProvinceId: 'qc',
        title: 'Opportunity linked to alert-001',
        summary: 'Cross-border balancing support required after the weather alert.',
        tags: ['linked-alert', 'grid'],
        originType: 'alert',
        originId: 'alert-001',
        connectionMatchId: 73,
      })
    );
    expect(connectionMatcher.resolveDraftConnectionMatchId).not.toHaveBeenCalled();
  });

  it('resolves a match id from the opportunity service when a request draft has no explicit connection match id', async () => {
    queryParamMap$.next(
      convertToParamMap({
        draftType: 'REQUEST',
        draftMode: 'IMPORT',
        draftSectorId: 'energy',
        draftFromProvinceId: 'on',
        draftToProvinceId: 'qc',
        draftTitle: 'Hydrogen balancing support',
        draftSummary: 'Cross-border support required for a hydrogen corridor.',
        draftTags: 'hydrogen,grid',
      })
    );

    const fixture = TestBed.createComponent(Og7FeedComposerComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const submit = fixture.nativeElement.querySelector('.feed-composer__submit') as HTMLButtonElement;
    submit.click();
    await fixture.whenStable();

    expect(connectionMatcher.resolveDraftConnectionMatchId).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: 'REQUEST',
        sectorId: 'energy',
        fromProvinceId: 'on',
        toProvinceId: 'qc',
        mode: 'IMPORT',
      })
    );
    expect(feed.publishDraft).toHaveBeenCalledWith(
      jasmine.objectContaining({
        connectionMatchId: 91,
      })
    );
  });

  it('clears the draft and emits the published item after a successful publication', async () => {
    const fixture = TestBed.createComponent(Og7FeedComposerComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const publishedItems: FeedItem[] = [];
    fixture.componentInstance.published.subscribe(item => publishedItems.push(item));

    const submit = fixture.nativeElement.querySelector('.feed-composer__submit') as HTMLButtonElement;
    submit.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('#composer-title') as HTMLInputElement;
    const summary = fixture.nativeElement.querySelector('#composer-summary') as HTMLTextAreaElement;

    expect(title.value).toBe('');
    expect(summary.value).toBe('');
    expect(publishedItems).toEqual([createPublishedItem()]);
  });

  it('preserves the draft and renders the request error when publication fails', async () => {
    feed.outcome = {
      status: 'request-error',
      validation: {
        valid: true,
        errors: [],
        warnings: [],
      },
      error: 'feed.error.generic',
    };

    const fixture = TestBed.createComponent(Og7FeedComposerComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const submit = fixture.nativeElement.querySelector('.feed-composer__submit') as HTMLButtonElement;
    submit.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('#composer-title') as HTMLInputElement;
    const status = fixture.nativeElement.querySelector('[data-og7="feed-composer-status"]') as HTMLElement;

    expect(title.value).toBe('Opportunity linked to alert-001');
    expect(status.textContent).toContain('feed.error.generic');
  });

  it('redirects anonymous users to login instead of calling the publication service', async () => {
    authState.set(false);

    const fixture = TestBed.createComponent(Og7FeedComposerComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const submit = fixture.nativeElement.querySelector('.feed-composer__submit') as HTMLButtonElement;
    submit.click();
    await fixture.whenStable();

    expect(feed.publishDraft).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirect: '/feed?draftSource=alert&draftTitle=Winter%20peak' },
    });
  });

  it('blocks publication while offline and surfaces the offline status', async () => {
    feed.setConnected(false);

    const fixture = TestBed.createComponent(Og7FeedComposerComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const submit = fixture.nativeElement.querySelector('.feed-composer__submit') as HTMLButtonElement;
    submit.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('[data-og7="feed-composer-status"]') as HTMLElement;

    expect(feed.publishDraft).not.toHaveBeenCalled();
    expect(status.textContent).toContain('feed.error.offline');
  });
});
