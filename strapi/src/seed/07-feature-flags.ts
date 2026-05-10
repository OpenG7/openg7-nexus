import { hasContentType, upsertByUID } from '../utils/seed-helpers';

interface FeatureFlagSeed {
  slug: string;
  name: { en: string; fr: string };
  description: { en: string; fr: string };
  enabled: boolean;
  audience: 'public' | 'authenticated' | 'admin';
}

const flags: FeatureFlagSeed[] = [
  {
    slug: 'pro-mode',
    name: { en: 'Professional workspace', fr: 'Espace professionnel' },
    description: {
      en: 'Unlock enhanced analytics, saved filters, and export tools for partner organisations.',
      fr: 'Déverrouille des analyses avancées, des filtres enregistrés et des outils d’export pour les organisations partenaires.',
    },
    enabled: false,
    audience: 'authenticated',
  },
  {
    slug: 'live-exchanges-map',
    name: { en: 'Live exchanges map', fr: 'Carte des échanges en direct' },
    description: {
      en: 'Displays real-time interprovincial exchange data on the national map.',
      fr: 'Affiche en temps réel les données d’échanges interprovinciaux sur la carte nationale.',
    },
    enabled: true,
    audience: 'public',
  },
  {
    slug: 'beta-insights',
    name: { en: 'Beta insights module', fr: 'Module d’analyses bêta' },
    description: {
      en: 'Experimental insights dashboards for pilot partners.',
      fr: 'Tableaux de bord expérimentaux pour les partenaires pilotes.',
    },
    enabled: true,
    audience: 'authenticated',
  },
];

export default async () => {
  if (!hasContentType('api::feature-flag.feature-flag')) return;

  for (const flag of flags) {
    await upsertByUID(
      'api::feature-flag.feature-flag',
      {
        slug: flag.slug,
        name: flag.name,
        description: flag.description,
        enabled: flag.enabled,
        audience: flag.audience,
      },
      { unique: { slug: flag.slug } },
    );
  }
};
