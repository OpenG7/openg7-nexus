import { TestBed } from '@angular/core/testing';

import coldChainCapacityOfferConfigJson from './forms/cold-chain-capacity-offer.json';
import energySurplusOfferConfigJson from './forms/energy-surplus-offer.json';
import industrialLoadFlexRequestConfigJson from './forms/industrial-load-flex-request.json';
import { PublicationFormConfig } from './publication-form-config.models';
import { PublicationFormMapperService } from './publication-form-mapper.service';

describe('PublicationFormMapperService', () => {
  let service: PublicationFormMapperService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [PublicationFormMapperService] });
    service = TestBed.inject(PublicationFormMapperService);
  });

  it('maps the energy surplus config into a capacity draft and structured extensions', () => {
    const config = energySurplusOfferConfigJson as PublicationFormConfig;

    const result = service.map(config, {
      title: 'Short-term hydro surplus available',
      summary: '300 MW available to support an Ontario peak event next week.',
      fromProvinceId: 'qc',
      toProvinceId: 'on',
      capacityMw: 300,
      tags: 'winter-peak, hydro',
      energyType: 'hydroelectric',
      urgencyLevel: 'high',
      pricingMode: 'indexed',
      availabilityStart: '2026-03-22',
      availabilityEnd: '2026-03-29',
      contactChannel: 'Trading desk',
    });

    expect(result.draft).toEqual(
      jasmine.objectContaining({
        type: 'CAPACITY',
        sectorId: 'energy',
        mode: 'EXPORT',
        fromProvinceId: 'qc',
        toProvinceId: 'on',
        title: 'Short-term hydro surplus available',
        summary: '300 MW available to support an Ontario peak event next week.',
        quantity: { value: 300, unit: 'MW' },
        tags: ['winter-peak', 'hydro'],
      })
    );
    expect(result.extensions).toEqual(
      jasmine.objectContaining({
        energyType: 'hydroelectric',
        urgencyLevel: 'high',
        pricingMode: 'indexed',
        availabilityStart: '2026-03-22',
        availabilityEnd: '2026-03-29',
        contactChannel: 'Trading desk',
      })
    );
  });

  it('maps the industrial load flexibility config into a request draft', () => {
    const config = industrialLoadFlexRequestConfigJson as PublicationFormConfig;

    const result = service.map(config, {
      title: 'Flexible backup power needed during maintenance',
      summary: 'The plant needs temporary power flexibility while one line is offline.',
      fromProvinceId: 'on',
      toProvinceId: 'qc',
      requiredCapacityMw: 45,
      tags: 'maintenance, critical-load',
      requestReason: 'planned-maintenance',
      flexibilityWindow: '8h',
      preferredPricingMode: 'negotiable',
    });

    expect(result.draft).toEqual(
      jasmine.objectContaining({
        type: 'REQUEST',
        sectorId: 'energy',
        mode: 'IMPORT',
        quantity: { value: 45, unit: 'MW' },
        tags: ['maintenance', 'critical-load'],
      })
    );
    expect(result.extensions).toEqual(
      jasmine.objectContaining({
        requestReason: 'planned-maintenance',
        flexibilityWindow: '8h',
        preferredPricingMode: 'negotiable',
      })
    );
  });

  it('maps the cold-chain template into an offer draft with boolean and array extensions', () => {
    const config = coldChainCapacityOfferConfigJson as PublicationFormConfig;

    const result = service.map(config, {
      title: 'Cold-chain overflow capacity',
      summary: 'Temporary refrigerated pallet positions available.',
      fromProvinceId: 'qc',
      toProvinceId: 'on',
      availablePallets: 180,
      certifications: ['haccp', 'gfsi'],
      tags: 'overflow, certified',
      crossDockAvailable: true,
      availableFrom: '2026-03-21T08:00',
      availableUntil: '2026-03-28T18:00',
    });

    expect(result.draft).toEqual(
      jasmine.objectContaining({
        type: 'OFFER',
        sectorId: 'agriculture',
        mode: 'EXPORT',
        quantity: { value: 180, unit: 'kg' },
        tags: ['overflow', 'certified', 'haccp', 'gfsi'],
      })
    );
    expect(result.extensions).toEqual(
      jasmine.objectContaining({
        certifications: ['haccp', 'gfsi'],
        crossDockAvailable: true,
        availableFrom: '2026-03-21T08:00',
        availableUntil: '2026-03-28T18:00',
      })
    );
  });
});