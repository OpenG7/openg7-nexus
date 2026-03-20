import {
  FEED_LABOR_TAGS,
  FEED_TRANSPORT_TAGS,
  compareFeedItems,
  matchesFeedItemQuery,
  queryFeedItems,
  toFeedItemsQuery,
} from './feed-item-query';
import { FeedFilterState, FeedItem } from './models/feed.models';


function createFeedItem(id: string, overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id,
    createdAt: '2026-03-01T00:00:00.000Z',
    type: 'REQUEST',
    sectorId: 'energy',
    title: `Item ${id}`,
    summary: 'Shared feed item',
    mode: 'IMPORT',
    source: {
      kind: 'COMPANY',
      label: 'OpenG7',
    },
    ...overrides,
  };
}

describe('feed-item-query', () => {
  it('maps feed filter state into a shared query object', () => {
    const filters: FeedFilterState = {
      fromProvinceId: 'qc',
      toProvinceId: 'on',
      sectorId: 'energy',
      category: null,
      type: 'REQUEST',
      mode: 'IMPORT',
      sort: 'URGENCY',
      search: 'hydrogen',
    };

    expect(toFeedItemsQuery(filters)).toEqual({
      fromProvinceId: 'qc',
      toProvinceId: 'on',
      sectorId: 'energy',
      category: null,
      type: 'REQUEST',
      mode: 'IMPORT',
      sort: 'URGENCY',
      search: 'hydrogen',
    });
  });

  it('applies the shared filters used by the feed stream', () => {
    const items = [
      createFeedItem('request-on', {
        summary: 'Hydrogen corridor',
        fromProvinceId: 'qc',
        toProvinceId: 'on',
        urgency: 3,
      }),
      createFeedItem('request-bc', {
        summary: 'Hydrogen corridor',
        fromProvinceId: 'bc',
        toProvinceId: 'ab',
        urgency: 1,
      }),
      createFeedItem('offer-on', {
        type: 'OFFER',
        summary: 'Hydrogen corridor',
        fromProvinceId: 'qc',
        toProvinceId: 'on',
      }),
    ];

    const filtered = queryFeedItems(items, {
      ...toFeedItemsQuery({
        fromProvinceId: 'qc',
        toProvinceId: 'on',
        sectorId: 'energy',
        category: null,
        type: 'REQUEST',
        mode: 'IMPORT',
        sort: 'URGENCY',
        search: 'hydrogen',
      }),
    });

    expect(filtered.map((item) => item.id)).toEqual(['request-on']);
  });

  it('supports the home feed scope and tag filters', () => {
    const govItem = createFeedItem('gov-item', {
      source: { kind: 'GOV', label: 'Government' },
      tags: ['labor'],
    });
    const partnerItem = createFeedItem('partner-item', {
      source: { kind: 'PARTNER', label: 'Partner' },
      tags: ['transport'],
    });
    const companyItem = createFeedItem('company-item', {
      source: { kind: 'COMPANY', label: 'Company' },
      tags: ['labor'],
    });

    expect(
      queryFeedItems([govItem, partnerItem, companyItem], {
        sourceKinds: ['GOV', 'PARTNER'],
        sort: 'NEWEST',
      }).map((item) => item.id)
    ).toEqual(['partner-item', 'gov-item']);

    expect(
      queryFeedItems([govItem, partnerItem, companyItem], {
        excludedSourceKinds: ['GOV'],
        tagSet: FEED_LABOR_TAGS,
        sort: 'NEWEST',
      }).map((item) => item.id)
    ).toEqual(['company-item']);

    expect(matchesFeedItemQuery(partnerItem, { tagSet: FEED_TRANSPORT_TAGS })).toBeTrue();
  });

  it('supports grouped opportunity categories across multiple feed types', () => {
    const items = [
      createFeedItem('offer-item', { type: 'OFFER' }),
      createFeedItem('request-item', { type: 'REQUEST' }),
      createFeedItem('capacity-item', { type: 'CAPACITY' }),
      createFeedItem('tender-item', { type: 'TENDER' }),
      createFeedItem('alert-item', { type: 'ALERT' }),
    ];

    const filtered = queryFeedItems(items, {
      category: 'OPPORTUNITY',
      sort: 'NEWEST',
    });

    expect(filtered.map((item) => item.id)).toEqual([
      'tender-item',
      'request-item',
      'offer-item',
      'capacity-item',
    ]);
  });

  it('shares the same sort fallback rules across consumers', () => {
    const lowUrgency = createFeedItem('low', {
      urgency: 1,
      createdAt: '2026-03-01T00:00:00.000Z',
    });
    const highUrgencyOlder = createFeedItem('high-old', {
      urgency: 3,
      createdAt: '2026-02-01T00:00:00.000Z',
    });
    const highUrgencyNewer = createFeedItem('high-new', {
      urgency: 3,
      createdAt: '2026-03-05T00:00:00.000Z',
    });

    const ordered = [lowUrgency, highUrgencyOlder, highUrgencyNewer].sort((left, right) =>
      compareFeedItems(left, right, 'URGENCY')
    );

    expect(ordered.map((item) => item.id)).toEqual(['high-new', 'high-old', 'low']);
  });
});
