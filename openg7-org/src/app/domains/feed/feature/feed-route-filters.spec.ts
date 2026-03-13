import { convertToParamMap } from '@angular/router';

import { parseFeedFilters } from './feed-route-filters';

describe('parseFeedFilters', () => {
  it('hydrates corridor province filters from corridorId when they are absent', () => {
    const filters = parseFeedFilters(convertToParamMap({ source: 'corridors-realtime', corridorId: 'essential-services' }));

    expect(filters.fromProvinceId).toBe('QC');
    expect(filters.toProvinceId).toBe('ON');
    expect(filters.mode).toBe('BOTH');
    expect(filters.sort).toBe('NEWEST');
  });

  it('keeps explicit province filters over corridor defaults', () => {
    const filters = parseFeedFilters(
      convertToParamMap({
        source: 'corridors-realtime',
        corridorId: 'essential-services',
        fromProvinceId: 'MB',
      })
    );

    expect(filters.fromProvinceId).toBe('MB');
    expect(filters.toProvinceId).toBe('ON');
  });
});
