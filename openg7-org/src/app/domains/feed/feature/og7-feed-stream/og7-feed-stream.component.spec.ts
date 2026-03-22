import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { selectProvinces, selectSectors } from '@app/state/catalog/catalog.selectors';
import {
  feedFormKeySig,
  feedModeSig,
  feedSearchSig,
  feedSortSig,
  feedTypeSig,
  fromProvinceIdSig,
  sectorIdSig,
  toProvinceIdSig,
} from '@app/state/shared-feed-signals';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { FeedRealtimeConnectionState } from '../models/feed.models';
import { FeedRealtimeService } from '../services/feed-realtime.service';

import { Og7FeedStreamComponent } from './og7-feed-stream.component';

class FeedRealtimeServiceMock {
  readonly onboardingSeen = signal(true).asReadonly();
}

class StoreMock {
  private readonly provincesSig = signal<{ id: string; name: string }[]>([]);
  private readonly sectorsSig = signal<{ id: string; name: string }[]>([]);

  readonly selectSignal = jasmine.createSpy('selectSignal').and.callFake((selector: unknown) => {
    if (selector === selectProvinces) {
      return this.provincesSig.asReadonly();
    }
    if (selector === selectSectors) {
      return this.sectorsSig.asReadonly();
    }
    throw new Error(`Unexpected selector in StoreMock: ${String(selector)}`);
  });

  setProvinces(provinces: { id: string; name: string }[]): void {
    this.provincesSig.set(provinces);
  }
}

function createConnectionState({
  connected,
  reconnecting = false,
  error = null,
}: {
  connected: boolean;
  reconnecting?: boolean;
  error?: string | null;
}): FeedRealtimeConnectionState {
  return {
    connected: signal(connected).asReadonly(),
    reconnecting: signal(reconnecting).asReadonly(),
    error: signal<string | null>(error).asReadonly(),
  };
}

function resetFeedFilters(): void {
  fromProvinceIdSig.set(null);
  toProvinceIdSig.set(null);
  sectorIdSig.set(null);
  feedFormKeySig.set(null);
  feedTypeSig.set(null);
  feedModeSig.set('BOTH');
  feedSearchSig.set('');
  feedSortSig.set('NEWEST');
}

describe('Og7FeedStreamComponent', () => {
  beforeEach(async () => {
    resetFeedFilters();

    await TestBed.configureTestingModule({
      imports: [Og7FeedStreamComponent, TranslateModule.forRoot()],
      providers: [
        { provide: FeedRealtimeService, useClass: FeedRealtimeServiceMock },
        { provide: Store, useClass: StoreMock },
      ],
    })
      .overrideComponent(Og7FeedStreamComponent, {
        set: {
          imports: [CommonModule, FormsModule, TranslateModule],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(
      'fr',
      {
        feed: {
          filters: {
            allProvinces: 'Toutes les provinces',
            allTemplates: 'Tous les gabarits',
            allTypes: 'Tous les types',
            template: 'Gabarit',
            unknownTemplate: 'Gabarit personnalise',
          },
          status: {
            online: 'Mises a jour en direct actives',
            degraded: 'Mises a jour degradees',
            offline: 'Hors connexion',
            reconnecting: 'Reconnexion...',
          },
          stream: {
            refresh: 'Reessayer la connexion',
          },
          type: {
            ALERT: 'Alerte',
          },
          publishBar: {
            templates: {
              energySurplusOffer: {},
              industrialLoadFlexRequest: {},
              coldChainCapacityOffer: {},
            },
          },
        },
        forms: {
          energySurplus: {
            title: 'Surplus d energie',
          },
          industrialLoadFlex: {
            title: 'Flexibilite industrielle',
          },
          coldChainCapacity: {
            title: 'Capacite chaine du froid',
          },
        },
      },
      true
    );
    translate.use('fr');
  });

  afterEach(() => {
    resetFeedFilters();
  });

  it('hides the retry button when the realtime connection is healthy', () => {
    const fixture = TestBed.createComponent(Og7FeedStreamComponent);
    fixture.componentRef.setInput('connectionState', createConnectionState({ connected: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.feed-stream__status button')).toBeNull();
  });

  it('shows the retry button when the realtime connection is degraded', () => {
    const fixture = TestBed.createComponent(Og7FeedStreamComponent);
    fixture.componentRef.setInput('connectionState', createConnectionState({ connected: true, error: 'Lag detected' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.feed-stream__status button')).not.toBeNull();
  });

  it('shows the retry button when the realtime connection is offline', () => {
    const fixture = TestBed.createComponent(Og7FeedStreamComponent);
    fixture.componentRef.setInput('connectionState', createConnectionState({ connected: false }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.feed-stream__status button')).not.toBeNull();
  });

  it('renders the translated retry label instead of the raw i18n key', () => {
    const fixture = TestBed.createComponent(Og7FeedStreamComponent);
    fixture.componentRef.setInput('connectionState', createConnectionState({ connected: false }));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.feed-stream__status button') as HTMLButtonElement;

    expect(button.textContent?.trim()).toBe('Reessayer la connexion');
  });

  it('keeps the filter selects in sync with active filters when province options load later', async () => {
    const fixture = TestBed.createComponent(Og7FeedStreamComponent);
    const store = TestBed.inject(Store) as unknown as StoreMock;

    fixture.componentRef.setInput('connectionState', createConnectionState({ connected: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    feedTypeSig.set('ALERT');
    fromProvinceIdSig.set('QC');
    toProvinceIdSig.set('ON');
    fixture.detectChanges();
    await fixture.whenStable();

    store.setProvinces([
      { id: 'QC', name: 'Quebec' },
      { id: 'ON', name: 'Ontario' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const typeSelect = host.querySelector('#feed-type') as HTMLSelectElement;
    const fromSelect = host.querySelector('#feed-from') as HTMLSelectElement;
    const toSelect = host.querySelector('#feed-to') as HTMLSelectElement;

    expect(selectedOptionLabel(typeSelect)).toBe('Alerte');
    expect(selectedOptionLabel(fromSelect)).toBe('Quebec');
    expect(selectedOptionLabel(toSelect)).toBe('Ontario');
  });

  it('renders publication template filters and keeps the selection in sync', async () => {
    const fixture = TestBed.createComponent(Og7FeedStreamComponent);

    fixture.componentRef.setInput('connectionState', createConnectionState({ connected: true }));
    feedFormKeySig.set('energy-surplus-offer');
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const templateSelect = host.querySelector('#feed-form-key') as HTMLSelectElement;

    expect(selectedOptionLabel(templateSelect)).toBe('Surplus d energie');
    expect(host.textContent).toContain('Gabarit');
  });
});

function selectedOptionLabel(select: HTMLSelectElement): string {
  return select.selectedOptions[0]?.textContent?.trim() ?? '';
}
