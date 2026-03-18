import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../config/environment.tokens';
import { ConnectionDraft } from '../models/connection';

import { ConnectionsService } from './connections.service';

function buildDraft(): ConnectionDraft {
  return {
    matchId: 73,
    buyerProfile: {
      id: 201,
      role: 'buyer',
      legalName: 'Hydro Quebec Transition',
    },
    supplierProfile: {
      id: 301,
      role: 'supplier',
      legalName: 'Prairie Electrolyzers Inc.',
    },
    introMessage: 'We should schedule a formal introduction for this corridor next week.',
    attachments: ['nda'],
    meetingSlots: ['2030-01-15T13:30:00.000Z'],
    logistics: {
      transports: ['road', 'rail'],
      incoterm: 'DAP',
    },
    locale: 'fr',
  };
}

describe('ConnectionsService', () => {
  let service: ConnectionsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ConnectionsService,
        { provide: API_URL, useValue: 'https://cms.local' },
      ],
    });

    service = TestBed.inject(ConnectionsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('includes participant organizations when creating a connection', () => {
    let responseBody: unknown;

    service.createConnection(buildDraft()).subscribe((response) => {
      responseBody = response;
    });

    const request = httpMock.expectOne('https://cms.local/api/connections');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      data: {
        match: 73,
        intro_message: 'We should schedule a formal introduction for this corridor next week.',
        buyer_profile: 201,
        buyer_organization: 'Hydro Quebec Transition',
        supplier_profile: 301,
        supplier_organization: 'Prairie Electrolyzers Inc.',
        locale: 'fr',
        attachments: ['nda'],
        logistics_plan: {
          incoterm: 'DAP',
          transports: ['ROAD', 'RAIL'],
        },
        meeting_proposal: ['2030-01-15T13:30:00.000Z'],
      },
    });

    request.flush({
      data: {
        id: 55,
        attributes: {
          stage: 'reply',
          createdAt: '2030-01-01T00:00:00.000Z',
          updatedAt: '2030-01-01T00:00:00.000Z',
        },
      },
    });

    expect(responseBody).toEqual(
      jasmine.objectContaining({
        data: jasmine.objectContaining({ id: 55 }),
      })
    );
  });

  it('maps connection history pages returned by the backend', () => {
    let historyPage: unknown;

    service.getConnectionHistoryPage({ limit: 2, offset: 10, status: 'pending' }).subscribe((response) => {
      historyPage = response as never;
    });

    const request = httpMock.expectOne('https://cms.local/api/connections?limit=2&offset=10&status=pending');
    expect(request.request.method).toBe('GET');

    request.flush({
      data: [
        {
          id: 12,
          attributes: {
            match: 73,
            buyer_profile: 201,
            supplier_profile: 301,
            buyer_organization: 'Hydro Quebec Transition',
            supplier_organization: 'Prairie Electrolyzers Inc.',
            intro_message: 'We should schedule a formal introduction for this corridor next week.',
            locale: 'fr',
            attachments: ['nda'],
            logistics_plan: {
              incoterm: 'DAP',
              transports: ['ROAD', 'RAIL'],
            },
            meeting_proposal: ['2030-01-15T13:30:00.000Z'],
            stage: 'meeting',
            status: 'inDiscussion',
            stageHistory: [
              { stage: 'intro', timestamp: '2030-01-01T00:00:00.000Z' },
              { stage: 'meeting', timestamp: '2030-01-02T00:00:00.000Z', source: 'status-update' },
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
          },
        },
      ],
      meta: {
        count: 1,
        limit: 2,
        offset: 10,
        hasMore: true,
      },
    });

    expect(historyPage).toEqual({
      items: [
        jasmine.objectContaining({
          id: 12,
          matchId: 73,
          buyerOrganization: 'Hydro Quebec Transition',
          supplierOrganization: 'Prairie Electrolyzers Inc.',
          stage: 'meeting',
          status: 'inDiscussion',
          logistics: {
            incoterm: 'DAP',
            transports: ['road', 'rail'],
          },
        }),
      ],
      meta: {
        count: 1,
        limit: 2,
        offset: 10,
        hasMore: true,
      },
    });
  });

  it('maps one connection by id for detail screens', () => {
    let connection: unknown;

    service.getConnectionById(12).subscribe((response) => {
      connection = response;
    });

    const request = httpMock.expectOne('https://cms.local/api/connections/12');
    expect(request.request.method).toBe('GET');

    request.flush({
      data: {
        id: 12,
        attributes: {
          match: 73,
          buyer_profile: 201,
          supplier_profile: 301,
          buyer_organization: 'Hydro Quebec Transition',
          supplier_organization: 'Prairie Electrolyzers Inc.',
          intro_message: 'We should schedule a formal introduction for this corridor next week.',
          locale: 'fr',
          attachments: ['nda'],
          logistics_plan: {
            incoterm: 'DAP',
            transports: ['ROAD', 'RAIL'],
          },
          meeting_proposal: ['2030-01-15T13:30:00.000Z'],
          stage: 'reply',
          status: 'pending',
          stageHistory: [{ stage: 'intro', timestamp: '2030-01-01T00:00:00.000Z' }],
          statusHistory: [{ status: 'pending', timestamp: '2030-01-01T00:00:00.000Z' }],
          lastStatusAt: '2030-01-01T00:00:00.000Z',
          createdAt: '2030-01-01T00:00:00.000Z',
          updatedAt: '2030-01-01T01:00:00.000Z',
        },
      },
    });

    expect(connection).toEqual(
      jasmine.objectContaining({
        id: 12,
        matchId: 73,
        stage: 'reply',
        status: 'pending',
      })
    );
  });
});
