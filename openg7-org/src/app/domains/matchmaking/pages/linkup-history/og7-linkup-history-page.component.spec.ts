import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LinkupDataService } from '@app/domains/matchmaking/data-access/linkup-data.service';
import { LinkupRecord } from '@app/domains/matchmaking/data-access/linkup.models';
import { TranslateModule } from '@ngx-translate/core';

import { Og7LinkupHistoryPageComponent } from './og7-linkup-history-page.component';

function buildLinkup(overrides: Partial<LinkupRecord> = {}): LinkupRecord {
  return {
    id: '41',
    reference: 'OG7-LINKUP-000041',
    createdAt: '2030-01-01T00:00:00.000Z',
    updatedAt: '2030-01-02T00:00:00.000Z',
    status: 'inDiscussion',
    tradeMode: 'export',
    companyA: {
      id: '201',
      name: 'Hydro Quebec Transition',
      province: 'provinces.QC',
      sector: 'sectors.energy',
      channel: 'pages.linkups.channels.platform',
    },
    companyB: {
      id: '301',
      name: 'Prairie Electrolyzers Inc.',
      province: 'provinces.AB',
      sector: 'sectors.energy',
      channel: 'pages.linkups.channels.platform',
    },
    primarySector: 'sectors.energy',
    summary: 'We should schedule a formal introduction for this corridor next week.',
    timeline: [],
    notes: [],
    ...overrides,
  };
}

function buildLinkupSet(): LinkupRecord[] {
  return [
    buildLinkup(),
    buildLinkup({
      id: '42',
      reference: 'OG7-LINKUP-000042',
      status: 'pending',
      tradeMode: 'import',
      companyA: {
        id: '202',
        name: 'Atlantic Storage Grid',
        province: 'provinces.NS',
        sector: 'sectors.energy',
        channel: 'pages.linkups.channels.platform',
      },
      companyB: {
        id: '302',
        name: 'Ontario Battery Works',
        province: 'provinces.ON',
        sector: 'sectors.energy',
        channel: 'pages.linkups.channels.platform',
      },
      summary: 'Import corridor discussion for storage balancing.',
    }),
  ];
}

describe('Og7LinkupHistoryPageComponent', () => {
  let linkups: jasmine.SpyObj<LinkupDataService>;

  beforeEach(async () => {
    linkups = jasmine.createSpyObj<LinkupDataService>('LinkupDataService', ['loadHistory']);

    await TestBed.configureTestingModule({
      imports: [Og7LinkupHistoryPageComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: LinkupDataService, useValue: linkups },
      ],
    }).compileComponents();
  });

  it('renders mapped linkups from the backend service', async () => {
    linkups.loadHistory.and.resolveTo([buildLinkup()]);

    const fixture = TestBed.createComponent(Og7LinkupHistoryPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent as string;
    expect(linkups.loadHistory).toHaveBeenCalled();
    expect(content).toContain('Hydro Quebec Transition');
    expect(content).toContain('Prairie Electrolyzers Inc.');
  });

  it('filters the history by status, trade mode and search term, then resets filters', async () => {
    linkups.loadHistory.and.resolveTo(buildLinkupSet());

    const fixture = TestBed.createComponent(Og7LinkupHistoryPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      filteredLinkups(): readonly LinkupRecord[];
      onStatusSelected(status: LinkupRecord['status'] | 'all'): void;
      onTradeModeSelected(mode: LinkupRecord['tradeMode'] | 'all'): void;
      onSearchChanged(term: string): void;
      onResetFilters(): void;
      hasActiveFilters(): boolean;
    };

    expect(component.filteredLinkups().length).toBe(2);

    component.onStatusSelected('pending');
    fixture.detectChanges();
    expect(component.filteredLinkups().map((linkup) => linkup.id)).toEqual(['42']);

    component.onTradeModeSelected('import');
    component.onSearchChanged('atlantic');
    fixture.detectChanges();
    expect(component.hasActiveFilters()).toBeTrue();
    expect(component.filteredLinkups().map((linkup) => linkup.id)).toEqual(['42']);

    component.onResetFilters();
    fixture.detectChanges();
    expect(component.hasActiveFilters()).toBeFalse();
    expect(component.filteredLinkups().length).toBe(2);
  });

  it('shows the error state and retries loading history', async () => {
    linkups.loadHistory.and.rejectWith(new Error('temporary backend failure'));

    const fixture = TestBed.createComponent(Og7LinkupHistoryPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent as string).toContain('pages.linkups.errors.title');

    linkups.loadHistory.and.resolveTo([
      buildLinkup({
        id: '99',
        companyA: {
          id: '299',
          name: 'Northern Storage Hub',
          province: 'provinces.MB',
          sector: 'sectors.energy',
          channel: 'pages.linkups.channels.platform',
        },
      }),
    ]);

    const retryButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find(
      (button: HTMLButtonElement) => (button.textContent as string).includes('pages.linkups.actions.retry')
    ) as HTMLButtonElement;

    retryButton.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(linkups.loadHistory).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent as string).toContain('Northern Storage Hub');
  });
});
