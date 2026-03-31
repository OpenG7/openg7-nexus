import { TestBed } from '@angular/core/testing';

import coldChainCapacityOfferConfigJson from './forms/cold-chain-capacity-offer.json';
import energySurplusOfferConfigJson from './forms/energy-surplus-offer.json';
import hydrocarbonSurplusOfferConfigJson from './forms/hydrocarbon-surplus-offer.json';
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

  it('maps the hydrocarbon surplus template into an offer draft with barrel quantities and market extensions', () => {
    const config = hydrocarbonSurplusOfferConfigJson as PublicationFormConfig;

    const result = service.map(config, {
      title: 'Alberta crude surplus following corridor slowdown',
      summary: '48,000 barrels are temporarily available after a slowdown on the primary outbound corridor.',
      companyName: 'Northern Prairie Energy',
      publicationType: 'slowdown',
      productType: 'crude-oil',
      businessReason: 'transport-disruption',
      volumeBarrels: 48000,
      minimumLotBarrels: 12000,
      availableFrom: '2026-03-25',
      availableUntil: '2026-04-04',
      estimatedDelayDays: 10,
      storagePressureLevel: 'high',
      fromProvinceId: 'ab',
      toProvinceId: 'on',
      originSite: 'Edmonton terminal cluster',
      qualityGrade: 'wcs',
      logisticsMode: ['rail', 'storage-transfer'],
      targetScope: ['sk', 'mb', 'refining-network'],
      priceReference: 'WCS less transport differential',
      responseDeadline: '2026-03-30',
      contactChannel: 'Crude desk',
      tags: 'alberta, surplus-window',
      notes: 'Priority routing required before storage reaches critical threshold.',
    });

    expect(result.draft).toEqual(
      jasmine.objectContaining({
        type: 'OFFER',
        sectorId: 'energy',
        mode: 'EXPORT',
        fromProvinceId: 'ab',
        toProvinceId: 'on',
        title: 'Alberta crude surplus following corridor slowdown',
        quantity: { value: 48000, unit: 'bbl' },
        tags: ['alberta', 'surplus-window', 'slowdown', 'crude-oil'],
      })
    );
    expect(result.extensions).toEqual(
      jasmine.objectContaining({
        companyName: 'Northern Prairie Energy',
        publicationType: 'slowdown',
        productType: 'crude-oil',
        businessReason: 'transport-disruption',
        logisticsMode: ['rail', 'storage-transfer'],
        targetScope: ['sk', 'mb', 'refining-network'],
        estimatedDelayDays: 10,
        storagePressureLevel: 'high',
      })
    );
  });
});