import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
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

import { FeedComposerValidationResult } from '../models/feed.models';
import { FeedRealtimeService } from '../services/feed-realtime.service';

import { Og7FeedComposerComponent } from './og7-feed-composer.component';

class FeedRealtimeServiceMock {
  readonly publish = jasmine.createSpy('publish').and.callFake((): FeedComposerValidationResult => ({
    valid: true,
    errors: [],
    warnings: [],
  }));
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

function resetFeedSignals(): void {
  feedTypeSig.set(null);
  sectorIdSig.set(null);
  feedModeSig.set('BOTH');
  fromProvinceIdSig.set(null);
  toProvinceIdSig.set(null);
}

describe('Og7FeedComposerComponent', () => {
  let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let feed: FeedRealtimeServiceMock;

  beforeEach(async () => {
    resetFeedSignals();
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
      })
    );

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
        { provide: FeedRealtimeService, useClass: FeedRealtimeServiceMock },
        { provide: Store, useClass: StoreMock },
      ],
    }).compileComponents();

    feed = TestBed.inject(FeedRealtimeService) as unknown as FeedRealtimeServiceMock;
  });

  it('prefills the linked alert draft and sends the explicit origin to the feed service on submit', async () => {
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

    expect(feed.publish).toHaveBeenCalledWith(
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
      })
    );
  });
});
