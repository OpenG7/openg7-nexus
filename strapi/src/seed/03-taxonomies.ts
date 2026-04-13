import { ensureLocale, upsertByUID } from '../utils/seed-helpers';

interface LocalizedTermSeed {
  slug: string;
  name: {
    en: string;
    fr: string;
  };
}

const provinces: LocalizedTermSeed[] = [
  { slug: 'ab', name: { en: 'Alberta', fr: 'Alberta' } },
  { slug: 'bc', name: { en: 'British Columbia', fr: 'Colombie-Britannique' } },
  { slug: 'mb', name: { en: 'Manitoba', fr: 'Manitoba' } },
  { slug: 'nb', name: { en: 'New Brunswick', fr: 'Nouveau-Brunswick' } },
  { slug: 'nl', name: { en: 'Newfoundland and Labrador', fr: 'Terre-Neuve-et-Labrador' } },
  { slug: 'ns', name: { en: 'Nova Scotia', fr: 'Nouvelle-Ecosse' } },
  { slug: 'nt', name: { en: 'Northwest Territories', fr: 'Territoires du Nord-Ouest' } },
  { slug: 'nu', name: { en: 'Nunavut', fr: 'Nunavut' } },
  { slug: 'on', name: { en: 'Ontario', fr: 'Ontario' } },
  { slug: 'pe', name: { en: 'Prince Edward Island', fr: 'Ile-du-Prince-Edouard' } },
  { slug: 'qc', name: { en: 'Quebec', fr: 'Quebec' } },
  { slug: 'sk', name: { en: 'Saskatchewan', fr: 'Saskatchewan' } },
  { slug: 'yt', name: { en: 'Yukon', fr: 'Yukon' } },
];

const sectors: LocalizedTermSeed[] = [
  { slug: 'energy', name: { en: 'Energy', fr: 'Energie' } },
  { slug: 'agri-food', name: { en: 'Agri-food', fr: 'Agroalimentaire' } },
  { slug: 'digital-services', name: { en: 'Digital services', fr: 'Services numeriques' } },
  { slug: 'transport-logistics', name: { en: 'Transport & logistics', fr: 'Transport et logistique' } },
  { slug: 'life-sciences', name: { en: 'Life sciences', fr: 'Sciences de la vie' } },
  { slug: 'manufacturing', name: { en: 'Manufacturing', fr: 'Manufacturier' } },
  { slug: 'construction', name: { en: 'Construction & materials', fr: 'Construction et materiaux' } },
  { slug: 'mining', name: { en: 'Mining & minerals', fr: 'Mines et mineraux' } },
];

export default async () => {
  await ensureLocale('fr');
  await ensureLocale('en');

  for (const province of provinces) {
    await upsertByUID(
      'api::province.province',
      {
        slug: province.slug,
        code: province.slug.toUpperCase(),
        name: province.name.en,
        locale: 'en',
      },
      {
        unique: {
          slug: province.slug,
        },
      }
    );
  }

  for (const sector of sectors) {
    await upsertByUID(
      'api::sector.sector',
      {
        slug: sector.slug,
        name: sector.name.en,
        locale: 'en',
      },
      {
        unique: {
          slug: sector.slug,
        },
      }
    );
  }
};
