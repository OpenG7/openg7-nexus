/**
 * Représente les coordonnées géographiques minimales attendues pour localiser une entreprise importée
 * sur la carte OpenG7.
 */
export interface Og7ImportedCompanyLocation {
  lat: number;
  lng: number;
  province?: string;
  country?: string;
}

/**
 * Données de contact transmises par les gouvernements partenaires pour faciliter la mise en relation.
 */
export interface Og7ImportedCompanyContacts {
  website?: string;
  email?: string;
  phone?: string;
  contactName?: string;
}

/**
 * Structure minimale d’une entreprise importée dans l’écosystème OpenG7.
 */
export interface Og7ImportedCompany {
  businessId: string;
  name: string;
  sectors: string[];
  location: Og7ImportedCompanyLocation;
  contacts: Og7ImportedCompanyContacts;
}

/**
 * Résultat produit par la validation locale d’un fichier JSON avant import.
 */
export interface Og7CompaniesValidationResult {
  validCompanies: Og7ImportedCompany[];
  errors: string[];
}

/**
 * Exemple de structure JSON compatible avec la page d’importation des entreprises.
 */
export const OG7_COMPANIES_IMPORT_SAMPLE: Og7ImportedCompany[] = [
  {
    businessId: 'QUE-TECH-001',
    name: 'Québec Technologies',
    sectors: ['digital-services'],
    location: { lat: 46.8139, lng: -71.2082, province: 'QC', country: 'Canada' },
    contacts: {
      website: 'https://quebectech.example',
      email: 'info@quebectech.example',
      phone: '+1-418-555-0101',
      contactName: 'Amélie Dupont',
    },
  },
  {
    businessId: 'BC-CLEAN-ENERGY-778',
    name: 'Pacific Clean Energy',
    sectors: ['energy'],
    location: { lat: 49.2827, lng: -123.1207, province: 'BC', country: 'Canada' },
    contacts: {
      website: 'https://pacificclean.example',
      email: 'partnerships@pacificclean.example',
    },
  },
];
