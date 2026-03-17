import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { LinkupDataService } from '@app/domains/matchmaking/data-access/linkup-data.service';
import { LinkupRecord } from '@app/domains/matchmaking/data-access/linkup.models';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { Og7LinkupDetailPageComponent } from './og7-linkup-detail-page.component';

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
    timeline: [
      {
        id: 'timeline-1',
        date: '2030-01-01T00:00:00.000Z',
        summary: 'pages.linkups.timeline.stage.intro',
        channel: 'pages.linkups.channels.platform',
        author: 'Hydro Quebec Transition',
      },
    ],
    notes: [],
  };
}

describe('Og7LinkupDetailPageComponent', () => {
  let linkups: jasmine.SpyObj<LinkupDataService>;

  beforeEach(async () => {
    linkups = jasmine.createSpyObj<LinkupDataService>('LinkupDataService', ['loadById']);

    await TestBed.configureTestingModule({
      imports: [Og7LinkupDetailPageComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '41' }),
            },
            paramMap: of(convertToParamMap({ id: '41' })),
          },
        },
        { provide: LinkupDataService, useValue: linkups },
      ],
    }).compileComponents();
  });

  it('renders the bilateral linkup detail returned by the service', async () => {
    linkups.loadById.and.resolveTo(buildLinkup());

    const fixture = TestBed.createComponent(Og7LinkupDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent as string;
    expect(linkups.loadById).toHaveBeenCalledWith('41');
    expect(content).toContain('Hydro Quebec Transition');
    expect(content).toContain('Prairie Electrolyzers Inc.');
  });

  it('shows the not found state when the service returns null', async () => {
    linkups.loadById.and.resolveTo(null);

    const fixture = TestBed.createComponent(Og7LinkupDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('pages.linkups.detail.notFound.title');
  });
});
