import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LinkupDataService } from '@app/domains/matchmaking/data-access/linkup-data.service';
import { LinkupRecord } from '@app/domains/matchmaking/data-access/linkup.models';
import { TranslateModule } from '@ngx-translate/core';

import { Og7LinkupHistoryPageComponent } from './og7-linkup-history-page.component';

function buildLinkup(): LinkupRecord {
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
  };
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
});
