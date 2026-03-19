import { OpportunityEngagementService } from './opportunity-engagement.service';

describe('OpportunityEngagementService', () => {
  let service: OpportunityEngagementService;

  beforeEach(() => {
    service = new OpportunityEngagementService();
  });

  it('redirects anonymous feed users to login with a normalized internal redirect', () => {
    const decision = service.plan({
      item: {
        id: 'request-001',
        type: 'REQUEST',
        connectionMatchId: null,
      },
      source: 'feed',
      fallback: 'drawer',
      requiresAuthentication: true,
      isAuthenticated: false,
      currentUrl: 'feed?source=home-feed-panels&feedItemId=request-001',
    });

    expect(decision).toEqual({
      kind: 'redirect-login',
      navigation: {
        commands: ['/login'],
        extras: {
          queryParams: {
            redirect: '/feed?source=home-feed-panels&feedItemId=request-001',
          },
        },
        route: '/login',
      },
    });
  });

  it('prefers existing offer tracking over linkup or drawer fallback', () => {
    const decision = service.plan({
      item: {
        id: 'request-001',
        type: 'REQUEST',
        connectionMatchId: 73,
      },
      source: 'feed',
      fallback: 'drawer',
      requiresAuthentication: true,
      isAuthenticated: true,
      existingOfferId: 'offer-record-1',
    });

    expect(decision).toEqual({
      kind: 'open-existing-offer',
      navigation: {
        commands: ['/alerts'],
        extras: {
          queryParams: {
            section: 'offers',
            offerId: 'offer-record-1',
          },
        },
        route: '/alerts',
      },
    });
  });

  it('routes opportunity engagement to linkup when a connection match exists', () => {
    const decision = service.plan({
      item: {
        id: 'request-001',
        type: 'REQUEST',
        connectionMatchId: 73,
      },
      source: 'feed',
      fallback: 'drawer',
      requiresAuthentication: true,
      isAuthenticated: true,
    });

    expect(decision).toEqual({
      kind: 'open-linkup',
      matchId: 73,
      navigation: {
        commands: ['/linkup', 73],
        extras: {
          queryParams: {
            source: 'feed',
            feedItemId: 'request-001',
          },
        },
        route: '/linkup/73',
      },
    });
  });

  it('routes home feed panel engagement to opportunity detail when no linkup exists', () => {
    const decision = service.plan({
      item: {
        id: 'request-001',
        type: 'REQUEST',
        connectionMatchId: null,
      },
      source: 'home-feed-panels',
      fallback: 'detail',
    });

    expect(decision).toEqual({
      kind: 'open-detail',
      navigation: {
        commands: ['/feed', 'opportunities', 'request-001'],
        extras: {
          queryParams: {
            source: 'home-feed-panels',
            feedItemId: 'request-001',
          },
        },
        route: '/feed/opportunities/request-001',
      },
    });
  });

  it('falls back to opening the in-place drawer when no other orchestration path applies', () => {
    const decision = service.plan({
      item: {
        id: 'request-001',
        type: 'REQUEST',
        connectionMatchId: null,
      },
      source: 'feed',
      fallback: 'drawer',
      requiresAuthentication: true,
      isAuthenticated: true,
    });

    expect(decision).toEqual({ kind: 'open-drawer' });
  });

  it('rejects external redirect URLs when normalizing login destinations', () => {
    expect(service.normalizeInternalUrl('https://example.com/phishing', '/feed')).toBe('/feed');
    expect(service.normalizeInternalUrl('//example.com/phishing', '/feed')).toBe('/feed');
  });
});
