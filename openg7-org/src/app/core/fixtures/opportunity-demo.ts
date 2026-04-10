import { OpportunityMatch } from '../models/opportunity';
import { FinancingBanner } from '../models/partner-profile';

export const DEMO_OPPORTUNITY_MATCHES: readonly OpportunityMatch[] = [
  {
    id: 101,
    commodity: 'Hydrogène vert — électrolyseurs modulaires',
    mode: 'export',
    confidence: 0.86,
    distanceKm: 1240,
    co2Estimate: 1200,
    buyer: {
      id: 201,
      name: 'Hydro Québec Transition',
      province: 'QC',
      sector: 'energy',
      capability: 'import',
    },
    seller: {
      id: 301,
      name: 'Prairie Electrolyzers Inc.',
      province: 'AB',
      sector: 'manufacturing',
      capability: 'export',
    },
  },
  {
    id: 102,
    commodity: 'Batteries solides pour véhicules lourds',
    mode: 'import',
    confidence: 0.74,
    distanceKm: 890,
    co2Estimate: 640,
    buyer: {
      id: 202,
      name: 'Pacific Logistics Co-op',
      province: 'BC',
      sector: 'transport-logistics',
      capability: 'import',
    },
    seller: {
      id: 302,
      name: 'Ontario Advanced Storage',
      province: 'ON',
      sector: 'manufacturing',
      capability: 'export',
    },
  },
  {
    id: 103,
    commodity: 'Capteurs LiDAR pour corridors forestiers',
    mode: 'export',
    confidence: 0.58,
    distanceKm: 1650,
    buyer: {
      id: 203,
      name: 'Nordic Timber Analytics',
      province: 'NB',
      sector: 'agri-food',
      capability: 'import',
    },
    seller: {
      id: 303,
      name: 'Prairie Photonics',
      province: 'SK',
      sector: 'digital-services',
      capability: 'export',
    },
  },
  {
    id: 104,
    commodity: 'Modules solaires bifaciaux pour mines nordiques',
    mode: 'export',
    confidence: 0.92,
    distanceKm: 2150,
    buyer: {
      id: 204,
      name: 'Aurora Rare Metals',
      province: 'NU',
      sector: 'mining',
      capability: 'import',
    },
    seller: {
      id: 304,
      name: 'SolarFields Atlantique',
      province: 'NS',
      sector: 'energy',
      capability: 'export',
    },
  },
  {
    id: 105,
    commodity: 'Acier recyclé pour infrastructure modulaire',
    mode: 'import',
    confidence: 0.67,
    distanceKm: 640,
    buyer: {
      id: 205,
      name: 'Constructeurs Urbains Montréal',
      province: 'QC',
      sector: 'construction',
      capability: 'import',
    },
    seller: {
      id: 305,
      name: 'Ontario Circular Steel',
      province: 'ON',
      sector: 'manufacturing',
      capability: 'export',
    },
  },
  {
    id: 106,
    commodity: 'Solutions IA de maintenance ferroviaire',
    mode: 'all',
    confidence: 0.81,
    distanceKm: 510,
    buyer: {
      id: 206,
      name: 'Alliance Transport Québec',
      province: 'QC',
      sector: 'transport-logistics',
      capability: 'import',
    },
    seller: {
      id: 306,
      name: 'RailTech Ontario',
      province: 'ON',
      sector: 'digital-services',
      capability: 'export',
    },
  },
];

export const DEMO_FINANCING_BANNERS: readonly FinancingBanner[] = [
  {
    id: 'qc-energy-transition',
    province: 'QC',
    sector: 'energy',
    title: {
      fr: 'Programme Transition Énergétique — Québec',
      en: 'Quebec Energy Transition Program',
    },
    body: {
      fr: 'Jusqu’à 3 M$ en soutien à l’industrialisation de solutions hydrogène et réseaux intelligents.',
      en: 'Up to $3M to scale hydrogen and smart-grid solutions across Quebec.',
    },
    ctaLabel: {
      fr: 'Découvrir le programme',
      en: 'Explore the program',
    },
    ctaUrl: 'https://transitionenergetique.gouv.qc.ca/programme-hydrogene',
  },
  {
    id: 'bc-cleantech',
    province: 'BC',
    sector: 'transport-logistics',
    title: {
      fr: 'Fonds BC Clean Supply Chain',
      en: 'BC Clean Supply Chain Fund',
    },
    body: {
      fr: 'Financement jusqu’à 1,5 M$ pour l’intégration de solutions logistiques à faible carbone.',
      en: 'Up to $1.5M to pilot low-carbon logistics solutions across British Columbia.',
    },
    ctaLabel: {
      fr: 'Postuler',
      en: 'Apply now',
    },
    ctaUrl: 'https://gov.bc.ca/cleansupplychain',
  },
];

/**
 * Contexte : Used by demo mode to highlight financing programs matching a given opportunity.
 * Raison d’être : Scans the in-memory banner list to find one aligned with the buyer’s province and sector.
 * @param match Opportunity match currently displayed.
 * @returns Matching financing banner or null when none applies.
 */
export function findDemoFinancingBanner(match: OpportunityMatch): FinancingBanner | null {
  for (const banner of DEMO_FINANCING_BANNERS) {
    if (banner.province === match.buyer.province && banner.sector === match.buyer.sector) {
      return banner;
    }
  }
  return null;
}
