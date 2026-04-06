import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ConnectionDetails } from '@app/core/models/connection';
import { OpportunityMatch } from '@app/core/models/opportunity';
import { ConnectionsService } from '@app/core/services/connections.service';
import { OpportunityService } from '@app/core/services/opportunity.service';
import { of, throwError } from 'rxjs';

import { LinkupDataService } from './linkup-data.service';

function buildConnection(overrides: Partial<ConnectionDetails> = {}): ConnectionDetails {
  return {
    id: 41,
    matchId: 77,
    buyerProfileId: 201,
    supplierProfileId: 301,
    buyerOrganization: 'Hydro Quebec Transition',
    supplierOrganization: 'Prairie Electrolyzers Inc.',
    introMessage: 'We should schedule a formal introduction for this corridor next week.',
    locale: 'fr',
    attachments: ['nda'],
    logistics: {
      incoterm: 'DAP',
      transports: ['road', 'rail'],
    },
    meetingProposal: ['2030-01-15T13:30:00.000Z'],
    stage: 'meeting',
    status: 'inDiscussion',
    stageHistory: [
      { stage: 'intro', timestamp: '2030-01-01T00:00:00.000Z', source: 'submitted' },
      { stage: 'meeting', timestamp: '2030-01-02T00:00:00.000Z' },
    ],
    statusHistory: [
      {
        status: 'pending',
        timestamp: '2030-01-01T00:00:00.000Z',
        note: 'Connection created',
      },
    ],
    lastStatusAt: '2030-01-02T00:00:00.000Z',
    createdAt: '2030-01-01T00:00:00.000Z',
    updatedAt: '2030-01-02T00:00:00.000Z',
    ...overrides,
  };
}

function buildMatch(overrides: Partial<OpportunityMatch> = {}): OpportunityMatch {
  return {
    id: 77,
    commodity: 'Hydrogen corridor',
    mode: 'export',
    confidence: 0.88,
    buyer: {
      id: 201,
      name: 'Hydro Quebec Transition',
      province: 'QC',
      sector: 'energy',
      capability: 'import',
    },
    seller: {
      id: 301,
      name: 'Prairie Electrolyzers Inc.',
      province: 'AB',
      sector: 'energy',
      capability: 'export',
    },
    ...overrides,
  };
}

describe('LinkupDataService', () => {
  let service: LinkupDataService;
  let connections: jasmine.SpyObj<ConnectionsService>;
  let opportunities: jasmine.SpyObj<OpportunityService>;

  beforeEach(() => {
    connections = jasmine.createSpyObj<ConnectionsService>('ConnectionsService', [
      'getConnectionHistoryPage',
      'getConnectionById',
      'updateConnectionStatus',
    ]);
    opportunities = jasmine.createSpyObj<OpportunityService>('OpportunityService', ['findMatchById']);

    TestBed.configureTestingModule({
      providers: [
        LinkupDataService,
        { provide: ConnectionsService, useValue: connections },
        { provide: OpportunityService, useValue: opportunities },
      ],
    });

    service = TestBed.inject(LinkupDataService);
  });

  it('loads and maps paginated connection history into linkup records', async () => {
    connections.getConnectionHistoryPage.and.returnValues(
      of({
        items: [buildConnection()],
        meta: { count: 1, limit: 100, offset: 0, hasMore: false },
      }),
    );
    opportunities.findMatchById.and.resolveTo(buildMatch());

    const result = await service.loadHistory();

    expect(result).toHaveSize(1);
    expect(result[0]).toEqual(
      jasmine.objectContaining({
        id: '41',
        reference: 'OG7-LINKUP-000041',
        status: 'inDiscussion',
        tradeMode: 'export',
        companyA: jasmine.objectContaining({
          name: 'Hydro Quebec Transition',
          province: 'provinces.QC',
          sector: 'sectors.energy',
        }),
        companyB: jasmine.objectContaining({
          name: 'Prairie Electrolyzers Inc.',
          province: 'provinces.AB',
          sector: 'sectors.energy',
        }),
      }),
    );
    expect(result[0].timeline.length).toBeGreaterThan(0);
    expect(result[0].notes[0]).toEqual(
      jasmine.objectContaining({
        author: 'pages.linkups.detail.systemAuthor',
        content: 'Connection created',
      }),
    );
  });

  it('returns null for the detail screen when the backend returns 404', async () => {
    connections.getConnectionById.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }))
    );

    const result = await service.loadById('41');

    expect(result).toBeNull();
  });

  it('updates a linkup status and remaps the refreshed connection', async () => {
    connections.updateConnectionStatus.and.returnValue(
      of(
        buildConnection({
          status: 'completed',
          updatedAt: '2030-01-03T00:00:00.000Z',
          statusHistory: [
            {
              status: 'pending',
              timestamp: '2030-01-01T00:00:00.000Z',
              note: 'Connection created',
            },
            {
              status: 'completed',
              timestamp: '2030-01-03T00:00:00.000Z',
            },
          ],
        })
      )
    );
    opportunities.findMatchById.and.resolveTo(buildMatch());

    const result = await service.updateStatus('41', 'completed');

    expect(connections.updateConnectionStatus).toHaveBeenCalledWith('41', 'completed');
    expect(result).toEqual(
      jasmine.objectContaining({
        id: '41',
        status: 'completed',
        updatedAt: '2030-01-03T00:00:00.000Z',
      })
    );
  });

  it('saves an internal note via the status endpoint using the current status', async () => {
    connections.updateConnectionStatus.and.returnValue(
      of(
        buildConnection({
          statusHistory: [
            {
              status: 'pending',
              timestamp: '2030-01-01T00:00:00.000Z',
              note: 'Connection created',
            },
            {
              status: 'inDiscussion',
              timestamp: '2030-01-03T00:00:00.000Z',
              note: 'Partner requested a follow-up briefing.',
            },
          ],
          updatedAt: '2030-01-03T00:00:00.000Z',
        })
      )
    );
    opportunities.findMatchById.and.resolveTo(buildMatch());

    const result = await service.saveNote(
      '41',
      'inDiscussion',
      '  Partner requested a follow-up briefing.  '
    );

    expect(connections.updateConnectionStatus).toHaveBeenCalledWith(
      '41',
      'inDiscussion',
      'Partner requested a follow-up briefing.'
    );
    expect(result?.notes[0]).toEqual(
      jasmine.objectContaining({
        content: 'Partner requested a follow-up briefing.',
      })
    );
  });
});
