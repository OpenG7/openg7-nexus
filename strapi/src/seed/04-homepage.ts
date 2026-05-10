import { upsertByUID } from '../utils/seed-helpers';

interface HomepageSeed {
  locale: 'en' | 'fr';
  navigation: Record<string, any>;
  sections: any[];
  seo: Record<string, any>;
}

const homepageLocales: HomepageSeed[] = [
  {
    locale: 'en',
    navigation: {
      logo: { alt: 'OpenG7 Platform' },
      links: [
        { label: 'Companies', url: '/companies' },
        { label: 'Exchanges', url: '/exchanges' },
        { label: 'Insights', url: '/insights' },
      ],
      cta: { label: 'Contribute data', url: '/join' },
      announcement: {
        enabled: true,
        message: 'OpenG7 beta data available',
        linkLabel: 'Read the announcement',
        linkUrl: '/news/beta',
      },
      search: {
        placeholder: 'Search companies or provinces',
        suggestions: [
          { title: 'Explore clean energy', url: '/companies?sector=energy' },
          { title: 'View interprovincial exchanges', url: '/exchanges' },
        ],
      },
    },
    sections: [
      {
        __component: 'sections.hero',
        title: 'Canada-wide economic intelligence',
        subtitle:
          'Monitor supply chains, investments, and interprovincial exchanges in near real-time.',
        cta: { label: 'View the dashboard', url: '/dashboard' },
      },
      {
        __component: 'sections.filters',
        title: 'Filter the directory by province, sector, and status.',
      },
      {
        __component: 'sections.directory',
        table: {
          columns: [
            { key: 'name', label: 'Company' },
            { key: 'sector', label: 'Sector' },
            { key: 'province', label: 'Province' },
          ],
        },
        drawer: {
          fields: [
            { key: 'description', label: 'Description' },
            { key: 'website', label: 'Website' },
            { key: 'verificationStatus', label: 'Verification' },
          ],
        },
      },
      {
        __component: 'sections.insights',
        kpis: [
          { label: 'Verified companies', value: 18, unit: '' },
          { label: 'Active exchanges', value: 42, unit: '' },
        ],
      },
      {
        __component: 'sections.onboarding',
        title: 'Getting started',
        steps: [
          { step: 1, title: 'Create an account' },
          { step: 2, title: 'Request contributor access' },
          { step: 3, title: 'Share updates securely' },
        ],
      },
      {
        __component: 'sections.news',
        title: 'Latest updates from the OpenG7 network',
      },
      {
        __component: 'sections.trust',
        logos: [{ alt: 'Government of Canada' }, { alt: 'G7 partners' }],
      },
    ],
    seo: {
      metaTitle: 'OpenG7 Platform',
      metaDescription: 'Discover companies, exchanges, and insights across Canadian provinces.',
    },
  },
  {
    locale: 'fr',
    navigation: {
      logo: { alt: 'Plateforme OpenG7' },
      links: [
        { label: 'Entreprises', url: '/companies' },
        { label: 'Échanges', url: '/exchanges' },
        { label: 'Analyses', url: '/insights' },
      ],
      cta: { label: 'Contribuer des données', url: '/join' },
      announcement: {
        enabled: true,
        message: 'Données bêta disponibles sur OpenG7',
        linkLabel: 'Lire l’annonce',
        linkUrl: '/news/beta',
      },
      search: {
        placeholder: 'Rechercher une entreprise ou province',
        suggestions: [
          { title: 'Explorer les énergies propres', url: '/companies?sector=energy' },
          { title: 'Voir les échanges interprovinciaux', url: '/exchanges' },
        ],
      },
    },
    sections: [
      {
        __component: 'sections.hero',
        title: 'Intelligence économique pancanadienne',
        subtitle:
          'Suivez les chaînes d’approvisionnement, les investissements et les échanges interprovinciaux en quasi temps réel.',
        cta: { label: 'Accéder au tableau de bord', url: '/dashboard' },
      },
      {
        __component: 'sections.filters',
        title: 'Filtrez l’annuaire par province, secteur et statut.',
      },
      {
        __component: 'sections.directory',
        table: {
          columns: [
            { key: 'name', label: 'Entreprise' },
            { key: 'sector', label: 'Secteur' },
            { key: 'province', label: 'Province' },
          ],
        },
        drawer: {
          fields: [
            { key: 'description', label: 'Description' },
            { key: 'website', label: 'Site web' },
            { key: 'verificationStatus', label: 'Vérification' },
          ],
        },
      },
      {
        __component: 'sections.insights',
        kpis: [
          { label: 'Entreprises vérifiées', value: 18, unit: '' },
          { label: 'Échanges actifs', value: 42, unit: '' },
        ],
      },
      {
        __component: 'sections.onboarding',
        title: 'Démarrer avec la plateforme',
        steps: [
          { step: 1, title: 'Créer un compte' },
          { step: 2, title: 'Demander un accès contributeur' },
          { step: 3, title: 'Partager des mises à jour' },
        ],
      },
      {
        __component: 'sections.news',
        title: 'Dernières nouvelles du réseau OpenG7',
      },
      {
        __component: 'sections.trust',
        logos: [{ alt: 'Gouvernement du Canada' }, { alt: 'Partenaires du G7' }],
      },
    ],
    seo: {
      metaTitle: 'Plateforme OpenG7',
      metaDescription:
        'Découvrez les entreprises, échanges et analyses pour toutes les provinces canadiennes.',
    },
  },
];

export default async () => {
  for (const localeSeed of homepageLocales) {
    await upsertByUID(
      'api::homepage.homepage',
      {
        navigation: localeSeed.navigation,
        sections: localeSeed.sections,
        seo: localeSeed.seo,
        locale: localeSeed.locale,
      },
      { unique: { locale: localeSeed.locale } },
    );
  }
};
