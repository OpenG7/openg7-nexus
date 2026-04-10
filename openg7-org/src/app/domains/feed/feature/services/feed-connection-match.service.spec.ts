import { TestBed } from '@angular/core/testing';
import { OpportunityMatch } from '@app/core/models/opportunity';
import { OpportunityService } from '@app/core/services/opportunity.service';

import { FeedConnectionMatchService } from './feed-connection-match.service';

class OpportunityServiceMock {
  readonly searchMatches = jasmine.createSpy('searchMatches').and.resolveTo([
    createMatch({
      id: 101,
      commodity: 'Hydrogen balancing support corridor',
      buyerProvince: 'QC',
      sellerProvince: 'ON',
      sector: 'energy',
      confidence: 0.92,
      mode: 'import',
    }),
    createMatch({
      id: 102,
      commodity: 'Timber export corridor',
      buyerProvince: 'NB',
      sellerProvince: 'SK',
      sector: 'agri-food',
      confidence: 0.61,
      mode: 'export',
    }),
  ] as readonly OpportunityMatch[]);
}

function createMatch({
  id,
  commodity,
  buyerProvince,
  sellerProvince,
  sector,
  confidence,
  mode,
}: {
  id: number;
  commodity: string;
  buyerProvince: OpportunityMatch['buyer']['province'];
  sellerProvince: OpportunityMatch['seller']['province'];
  sector: OpportunityMatch['buyer']['sector'];
  confidence: number;
  mode: OpportunityMatch['mode'];
}): OpportunityMatch {
  return {
    id,
    commodity,
    mode,
    confidence,
    buyer: {
      id: id * 10,
      name: `Buyer ${id}`,
      province: buyerProvince,
      sector,
      capability: 'import',
    },
    seller: {
      id: id * 10 + 1,
      name: `Seller ${id}`,
      province: sellerProvince,
      sector,
      capability: 'export',
    },
  };
}

describe('FeedConnectionMatchService', () => {
  let service: FeedConnectionMatchService;
  let opportunities: OpportunityServiceMock;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FeedConnectionMatchService,
        { provide: OpportunityService, useClass: OpportunityServiceMock },
      ],
    });

    service = TestBed.inject(FeedConnectionMatchService);
    opportunities = TestBed.inject(OpportunityService) as unknown as OpportunityServiceMock;
  });

  it('returns the explicit connection match id when the draft already carries one', async () => {
    const result = await service.resolveDraftConnectionMatchId({
      type: 'REQUEST',
      title: 'Hydrogen balancing support',
      summary: 'Cross-border support required.',
      mode: 'IMPORT',
      connectionMatchId: 73,
    });

    expect(result).toBe(73);
    expect(opportunities.searchMatches).not.toHaveBeenCalled();
  });

  it('selects the best opportunity match for a request draft', async () => {
    const result = await service.resolveDraftConnectionMatchId({
      type: 'REQUEST',
      title: 'Hydrogen balancing support',
      summary: 'Cross-border support required for the Ontario to Quebec corridor.',
      sectorId: 'energy',
      fromProvinceId: 'on',
      toProvinceId: 'qc',
      mode: 'IMPORT',
    });

    expect(opportunities.searchMatches).toHaveBeenCalled();
    expect(result).toBe(101);
  });

  it('ignores feed types that are not linkup-ready', async () => {
    const result = await service.resolveDraftConnectionMatchId({
      type: 'OFFER',
      title: 'Offer',
      summary: 'Offer summary',
      mode: 'BOTH',
    });

    expect(result).toBeNull();
    expect(opportunities.searchMatches).not.toHaveBeenCalled();
  });
});
