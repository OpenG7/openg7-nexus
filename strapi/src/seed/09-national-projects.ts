import { ensureLocale, ensureRole, setRolePermissions, upsertByUID } from '../utils/seed-helpers';

interface NationalProjectSeed {
  slug: string;
  title: {
    en: string;
    fr: string;
  };
  country: 'CA' | 'US' | 'FR';
  description: {
    en: string;
    fr: string;
  };
  impactOnShipping: Record<string, any>;
  highlight: boolean;
}

const projects: NationalProjectSeed[] = [
  {
    slug: 'canal-expansion',
    title: { en: 'Canal Expansion', fr: 'Expansion du canal' },
    country: 'CA',
    description: { en: 'Expansion of canal in Canada', fr: 'Expansion du canal au Canada' },
    impactOnShipping: { increase: 10, unit: '%' },
    highlight: true,
  },
  {
    slug: 'high-speed-rail',
    title: { en: 'High-Speed Rail', fr: 'Train a grande vitesse' },
    country: 'US',
    description: {
      en: 'Rail project in the United States',
      fr: 'Projet ferroviaire aux Etats-Unis',
    },
    impactOnShipping: { decrease: 5, unit: '%' },
    highlight: false,
  },
  {
    slug: 'port-modernization',
    title: { en: 'Port Modernization', fr: 'Modernisation du port' },
    country: 'FR',
    description: {
      en: 'Modernization of major port in France',
      fr: "Modernisation d'un port majeur en France",
    },
    impactOnShipping: { increase: 7, unit: '%' },
    highlight: true,
  },
];

export default async () => {
  await ensureLocale('en');
  await ensureLocale('fr');

  for (const project of projects) {
    await upsertByUID(
      'api::national-project.national-project',
      {
        slug: project.slug,
        title: project.title.en,
        country: project.country,
        description: project.description.en,
        impactOnShipping: project.impactOnShipping,
        highlight: project.highlight,
        locale: 'en',
      },
      {
        unique: {
          slug: project.slug,
        },
      },
    );
  }

  const publicRole = await ensureRole('Public');
  await setRolePermissions(publicRole.id, {
    'api::national-project.national-project': {
      find: true,
      findOne: true,
    },
  });
};
