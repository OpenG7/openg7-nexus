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

  it('parses an explicit publication form filter from the route', () => {
    const filters = parseFeedFilters(convertToParamMap({ formKey: 'energy-surplus-offer' }));

    expect(filters.formKey).toBe('energy-surplus-offer');
  });

  it('normalizes legacy sector aliases from the route into canonical sector ids', () => {
    const agriFilters = parseFeedFilters(convertToParamMap({ sector: 'agri' }));
    const technologyFilters = parseFeedFilters(convertToParamMap({ sectorId: 'technology' }));

    expect(agriFilters.sectorId).toBe('agri-food');
    expect(technologyFilters.sectorId).toBe('digital-services');
  });
});
