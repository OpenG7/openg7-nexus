import {
  AdminQualityMatrixEntry,
  AdminQualityMatrixStatus,
} from '../data-access/admin-quality-matrix.service';

import {
  GENERATED_ADMIN_QUALITY_ACTION_DISCOVERY,
  GeneratedAdminQualityActionDiscovery,
} from './admin-quality-action-discovery.generated';

export type AdminQualityActionIntent =
  | 'navigation'
  | 'workflow'
  | 'mutation'
  | 'sharing'
  | 'export'
  | 'moderation';
export type AdminQualityActionTrigger = 'button' | 'link' | 'submit' | 'menu';
export type AdminQualityActionStatus = 'proved' | 'documented' | 'needs-completion';

export interface AdminQualityActionStateCoverage {
  readonly loading: boolean;
  readonly success: boolean;
  readonly error: boolean;
  readonly offline: boolean;
  readonly permission: boolean;
}

export interface AdminQualityActionRegistryItem {
  readonly id: string;
  readonly entryId: string;
  readonly label: string;
  readonly route: string;
  readonly component: string;
  readonly sourceFile: string;
  readonly selector: string;
  readonly trigger: AdminQualityActionTrigger;
  readonly intent: AdminQualityActionIntent;
  readonly hasActionHook: boolean;
  readonly context: string;
  readonly expectedResult: string;
  readonly preconditions: readonly string[];
  readonly proof: readonly string[];
  readonly states: AdminQualityActionStateCoverage;
}

export interface AdminQualityActionRecord extends AdminQualityActionRegistryItem {
  readonly domain: string;
  readonly entryNeed: string;
  readonly matrixE2EStatus: AdminQualityMatrixStatus;
  readonly sourceDetected: boolean;
  readonly detectedTrigger: AdminQualityActionTrigger;
  readonly detectedActionHook: boolean;
  readonly detectedSourceFiles: readonly string[];
  readonly detectedSpecFiles: readonly string[];
  readonly detectedE2EFiles: readonly string[];
  readonly completionScore: number;
  readonly status: AdminQualityActionStatus;
  readonly gaps: readonly string[];
}

export interface AdminQualityUndocumentedActionRecord {
  readonly id: string;
  readonly entryId: string | null;
  readonly domain: string;
  readonly trigger: AdminQualityActionTrigger;
  readonly hasActionHook: boolean;
  readonly detectedSourceFiles: readonly string[];
  readonly detectedSpecFiles: readonly string[];
  readonly detectedE2EFiles: readonly string[];
}

const ACTION_REGISTRY: readonly AdminQualityActionRegistryItem[] = [
  {
    id: 'feed-open-item',
    entryId: 'advanced-discovery',
    label: 'Ouvrir un item du feed',
    route: '/feed',
    component: 'Og7FeedCardComponent',
    sourceFile: 'src/app/domains/feed/feature/og7-feed-card/og7-feed-card.component.html',
    selector: '[data-og7-id="feed-open-item"]',
    trigger: 'button',
    intent: 'navigation',
    hasActionHook: true,
    context: 'Le feed sert de point d entree vers les details opportunite, alerte et indicateur.',
    expectedResult: 'Ouvrir le detail cible sans perdre le contexte de recherche ou de filtre.',
    preconditions: ['Un item du feed est visible dans la liste.'],
    proof: ['e2e/feed-detail-navigation.spec.ts', 'e2e/feed-advanced-discovery-roundtrip.spec.ts'],
    states: { loading: false, success: false, error: false, offline: false, permission: false },
  },
  {
    id: 'feed-save-item',
    entryId: 'advanced-discovery',
    label: 'Sauvegarder un item du feed',
    route: '/feed',
    component: 'Og7FeedCardComponent',
    sourceFile: 'src/app/domains/feed/feature/og7-feed-card/og7-feed-card.component.html',
    selector: '[data-og7-id="feed-save-item"]',
    trigger: 'button',
    intent: 'mutation',
    hasActionHook: true,
    context: 'L utilisateur doit pouvoir marquer un signal pour le retrouver plus tard.',
    expectedResult: 'Basculer l etat sauvegarde et rendre le geste visible dans les favoris.',
    preconditions: ['Utilisateur connecte.', 'Un item du feed est visible.'],
    proof: [],
    states: { loading: false, success: true, error: false, offline: false, permission: true },
  },
  {
    id: 'favorites-open',
    entryId: 'advanced-discovery',
    label: 'Ouvrir un favori',
    route: '/favorites',
    component: 'FavoritesPage',
    sourceFile: 'src/app/domains/account/pages/favorites.page.html',
    selector: '[data-og7-id="favorites-open"]',
    trigger: 'link',
    intent: 'navigation',
    hasActionHook: false,
    context: 'Les favoris permettent de retrouver rapidement un objet deja qualifie.',
    expectedResult: 'Naviguer vers la ressource cible avec son contexte minimal.',
    preconditions: ['Au moins un favori est disponible.'],
    proof: ['src/app/domains/account/pages/favorites.page.spec.ts'],
    states: { loading: false, success: false, error: false, offline: false, permission: true },
  },
  {
    id: 'corridor-item',
    entryId: 'geospatial',
    label: 'Ouvrir un corridor temps reel',
    route: '/',
    component: 'HomeCorridorsRealtimeComponent',
    sourceFile:
      'src/app/domains/home/feature/home-corridors-realtime/home-corridors-realtime.component.html',
    selector: '[data-og7="corridors-realtime"] [data-og7-id="corridor-item"]',
    trigger: 'button',
    intent: 'navigation',
    hasActionHook: false,
    context: 'Le widget corridor doit pousser le contexte vers une exploration plus profonde.',
    expectedResult: 'Ouvrir la vue cible avec le corridor selectionne comme contexte actif.',
    preconditions: ['Un corridor est visible dans la liste temps reel.'],
    proof: ['e2e/corridors-realtime.spec.ts'],
    states: { loading: false, success: false, error: false, offline: false, permission: false },
  },
  {
    id: 'view-map',
    entryId: 'geospatial',
    label: 'Voir sur la carte',
    route: '/',
    component: 'HomeCorridorsRealtimeComponent',
    sourceFile:
      'src/app/domains/home/feature/home-corridors-realtime/home-corridors-realtime.component.html',
    selector: '[data-og7="corridors-realtime"] [data-og7-id="view-map"]',
    trigger: 'button',
    intent: 'navigation',
    hasActionHook: false,
    context: 'Le corridor resume doit pouvoir renvoyer vers une lecture cartographique plus riche.',
    expectedResult:
      'Basculer vers la vue carte avec la couche ou le corridor cible preselectionne.',
    preconditions: ['Le widget corridors est visible.'],
    proof: ['e2e/corridors-realtime.spec.ts', 'e2e/map.spec.ts'],
    states: { loading: false, success: false, error: false, offline: false, permission: false },
  },
  {
    id: 'feed-open-publish-drawer',
    entryId: 'feed-signals',
    label: 'Ouvrir le drawer de publication',
    route: '/feed',
    component: 'FeedPublishSectionComponent',
    sourceFile:
      'src/app/domains/feed/feature/feed-publish-section/feed-publish-section.component.html',
    selector: '[data-og7-id="feed-open-publish-drawer"]',
    trigger: 'button',
    intent: 'workflow',
    hasActionHook: true,
    context: 'Le feed doit permettre de publier sans quitter le contexte de veille.',
    expectedResult: 'Ouvrir un drawer de publication et restaurer le focus a la fermeture.',
    preconditions: ['Page feed visible.'],
    proof: [
      'e2e/feed-publish-panel.spec.ts',
      'src/app/domains/feed/feature/feed-publish-section/feed-publish-section.component.spec.ts',
    ],
    states: { loading: false, success: false, error: false, offline: false, permission: true },
  },
  {
    id: 'opportunity-make-offer',
    entryId: 'feed-signals',
    label: 'Proposer une offre',
    route: '/feed/opportunity/:id',
    component: 'OpportunityDetailHeaderComponent',
    sourceFile: 'src/app/domains/feed/feature/components/opportunity-detail-header.component.html',
    selector: '[data-og7-id="opportunity-make-offer"]',
    trigger: 'button',
    intent: 'workflow',
    hasActionHook: true,
    context: 'Depuis le detail opportunite, l utilisateur doit entrer dans le workflow d offre.',
    expectedResult: 'Ouvrir le drawer de proposition avec le bon contexte opportunite.',
    preconditions: ['Une opportunite est ouverte.', 'Utilisateur autorise a repondre.'],
    proof: ['e2e/feed-opportunity-detail.spec.ts', 'e2e/opportunity-offer-flow.spec.ts'],
    states: { loading: false, success: false, error: false, offline: false, permission: true },
  },
  {
    id: 'opportunity-offer-submit',
    entryId: 'feed-signals',
    label: 'Soumettre une offre opportunite',
    route: '/feed/opportunity/:id',
    component: 'OpportunityOfferDrawerComponent',
    sourceFile: 'src/app/domains/feed/feature/components/opportunity-offer-drawer.component.html',
    selector: '[data-og7-id="opportunity-offer-submit"]',
    trigger: 'submit',
    intent: 'mutation',
    hasActionHook: true,
    context: 'Le drawer d offre collecte capacite, dates, pricing et piece jointe.',
    expectedResult:
      'Soumettre, afficher succes ou erreur et gerer la reprise offline quand necessaire.',
    preconditions: ['Le drawer de proposition est ouvert.', 'Le formulaire est valide.'],
    proof: [
      'e2e/opportunity-offer-flow.spec.ts',
      'e2e/quality-breadth-form-error-recovery.spec.ts',
      'e2e/quality-breadth-drawer-focus-return.spec.ts',
    ],
    states: { loading: true, success: true, error: true, offline: true, permission: true },
  },
  {
    id: 'opportunity-offer-retry',
    entryId: 'quality-breadth',
    label: 'Relancer une soumission d offre',
    route: '/feed/opportunity/:id',
    component: 'OpportunityOfferDrawerComponent',
    sourceFile: 'src/app/domains/feed/feature/components/opportunity-offer-drawer.component.html',
    selector: '[data-og7-id="opportunity-offer-retry"]',
    trigger: 'button',
    intent: 'mutation',
    hasActionHook: true,
    context: 'Le workflow d offre doit etre resilent apres une erreur ou une file offline.',
    expectedResult:
      'Relancer la soumission a partir de l etat courant sans perdre les donnees saisies.',
    preconditions: ['Une erreur ou une attente offline est affichee dans le drawer.'],
    proof: ['e2e/quality-breadth-form-error-recovery.spec.ts'],
    states: { loading: true, success: true, error: true, offline: true, permission: true },
  },
  {
    id: 'alert-subscribe',
    entryId: 'feed-signals',
    label: 'S abonner a une alerte',
    route: '/feed/alert/:id',
    component: 'AlertDetailHeaderComponent',
    sourceFile: 'src/app/domains/feed/feature/components/alert-detail-header.component.html',
    selector: '[data-og7-id="alert-subscribe"]',
    trigger: 'button',
    intent: 'mutation',
    hasActionHook: true,
    context: 'Une alerte detaillee doit pouvoir devenir une veille suivie par l utilisateur.',
    expectedResult: 'Creer ou reveleer l abonnement avec un retour visuel immediat.',
    preconditions: ['Une alerte est ouverte.', 'Utilisateur connecte.'],
    proof: ['e2e/feed-alert-detail.spec.ts', 'e2e/app-complete-smoke.spec.ts'],
    states: { loading: true, success: true, error: false, offline: false, permission: true },
  },
  {
    id: 'alert-report-update',
    entryId: 'feed-signals',
    label: 'Signaler une mise a jour d alerte',
    route: '/feed/alert/:id',
    component: 'AlertDetailHeaderComponent',
    sourceFile: 'src/app/domains/feed/feature/components/alert-detail-header.component.html',
    selector: '[data-og7-id="alert-report-update"]',
    trigger: 'button',
    intent: 'workflow',
    hasActionHook: true,
    context: 'Le detail alerte doit accepter une contribution utilisateur contextualisee.',
    expectedResult: 'Ouvrir le drawer de signalement avec le bon contexte de l alerte.',
    preconditions: ['Une alerte est ouverte.'],
    proof: ['e2e/feed-alert-detail.spec.ts', 'e2e/quality-breadth-announcement-continuity.spec.ts'],
    states: { loading: false, success: false, error: false, offline: false, permission: true },
  },
  {
    id: 'alert-update-submit',
    entryId: 'feed-signals',
    label: 'Soumettre une mise a jour d alerte',
    route: '/feed/alert/:id',
    component: 'AlertUpdateDrawerComponent',
    sourceFile: 'src/app/domains/feed/feature/components/alert-update-drawer.component.html',
    selector: '[data-og7-id="alert-update-submit"]',
    trigger: 'submit',
    intent: 'mutation',
    hasActionHook: true,
    context: 'Le drawer de mise a jour transforme une contribution en preuve exploitable.',
    expectedResult:
      'Valider le formulaire, afficher succes ou erreur et permettre de revoir son rapport.',
    preconditions: ['Le drawer de mise a jour est ouvert.', 'Le formulaire est valide.'],
    proof: ['e2e/feed-alert-detail.spec.ts', 'e2e/quality-breadth-announcement-continuity.spec.ts'],
    states: { loading: true, success: true, error: true, offline: false, permission: true },
  },
  {
    id: 'indicator-subscribe',
    entryId: 'feed-signals',
    label: 'S abonner a un indicateur',
    route: '/feed/indicator/:id',
    component: 'IndicatorHeroComponent',
    sourceFile: 'src/app/domains/feed/feature/components/indicator-hero.component.html',
    selector: '[data-og7-id="indicator-subscribe"]',
    trigger: 'button',
    intent: 'mutation',
    hasActionHook: true,
    context: 'Le detail indicateur doit pouvoir creer une surveillance durable.',
    expectedResult: 'Creer l abonnement ou basculer vers la consultation de l alerte existante.',
    preconditions: ['Un indicateur est ouvert.', 'Utilisateur connecte.'],
    proof: ['e2e/feed-indicator-detail.spec.ts', 'e2e/quality-breadth-offline-queueing.spec.ts'],
    states: { loading: true, success: true, error: false, offline: true, permission: true },
  },
  {
    id: 'indicator-create-alert',
    entryId: 'feed-signals',
    label: 'Ouvrir le create alert sur indicateur',
    route: '/feed/indicator/:id',
    component: 'IndicatorHeroComponent',
    sourceFile: 'src/app/domains/feed/feature/components/indicator-hero.component.html',
    selector: '[data-og7-id="indicator-create-alert"]',
    trigger: 'button',
    intent: 'workflow',
    hasActionHook: true,
    context:
      'Le detail indicateur doit ouvrir un workflow de creation d alerte sans rompre le contexte.',
    expectedResult: 'Afficher le drawer de regle avec les valeurs pre-remplies pertinentes.',
    preconditions: ['Un indicateur est ouvert.'],
    proof: ['e2e/feed-indicator-detail.spec.ts'],
    states: { loading: false, success: false, error: false, offline: false, permission: true },
  },
  {
    id: 'indicator-alert-submit',
    entryId: 'feed-signals',
    label: 'Soumettre une alerte indicateur',
    route: '/feed/indicator/:id',
    component: 'IndicatorAlertDrawerComponent',
    sourceFile: 'src/app/domains/feed/feature/components/indicator-alert-drawer.component.html',
    selector: '[data-og7-id="indicator-alert-submit"]',
    trigger: 'submit',
    intent: 'mutation',
    hasActionHook: true,
    context:
      'La regle d alerte indicateur doit etre enregistrable avec seuil, fenetre et frequence.',
    expectedResult: 'Creer la regle, afficher succes ou erreur et supporter la file offline.',
    preconditions: ['Le drawer indicateur est ouvert.', 'Le formulaire est valide.'],
    proof: ['e2e/feed-indicator-detail.spec.ts', 'e2e/quality-breadth-offline-queueing.spec.ts'],
    states: { loading: true, success: true, error: true, offline: true, permission: true },
  },
  {
    id: 'indicator-alert-retry',
    entryId: 'quality-breadth',
    label: 'Relancer une alerte indicateur',
    route: '/feed/indicator/:id',
    component: 'IndicatorAlertDrawerComponent',
    sourceFile: 'src/app/domains/feed/feature/components/indicator-alert-drawer.component.html',
    selector: '[data-og7-id="indicator-alert-retry"]',
    trigger: 'button',
    intent: 'mutation',
    hasActionHook: true,
    context:
      'Les regles indicateur doivent survivre aux erreurs de soumission et aux reprises offline.',
    expectedResult: 'Relancer la soumission sans perdre la configuration deja saisie.',
    preconditions: ['Un etat erreur ou offline est affiche dans le drawer.'],
    proof: ['e2e/quality-breadth-offline-queueing.spec.ts'],
    states: { loading: true, success: true, error: true, offline: true, permission: true },
  },
  {
    id: 'opportunity-archive',
    entryId: 'business-lifecycle',
    label: 'Archiver une opportunite',
    route: '/feed/opportunity/:id',
    component: 'OpportunityDetailHeaderComponent',
    sourceFile: 'src/app/domains/feed/feature/components/opportunity-detail-header.component.html',
    selector: '[data-og7-id="opportunity-archive"]',
    trigger: 'button',
    intent: 'mutation',
    hasActionHook: true,
    context: 'Le proprietaire doit pouvoir faire evoluer le cycle de vie d une opportunite.',
    expectedResult:
      'Archiver la ressource et la rendre visible comme archivee dans les parcours en aval.',
    preconditions: ['Utilisateur proprietaire.', 'Une opportunite editable est ouverte.'],
    proof: ['e2e/opportunity-archive-lifecycle.spec.ts'],
    states: { loading: false, success: true, error: false, offline: false, permission: true },
  },
  {
    id: 'opportunity-report-submit',
    entryId: 'business-lifecycle',
    label: 'Soumettre un rapport opportunite',
    route: '/feed/opportunity/:id',
    component: 'OpportunityReportDrawerComponent',
    sourceFile: 'src/app/domains/feed/feature/components/opportunity-report-drawer.component.html',
    selector: '[data-og7-id="opportunity-report-submit"]',
    trigger: 'submit',
    intent: 'mutation',
    hasActionHook: true,
    context: 'Le reporting opportunite nourrit le cycle d enrichissement et de moderation.',
    expectedResult:
      'Valider le rapport puis afficher la consultation ou la reprise d un autre rapport.',
    preconditions: ['Le drawer de rapport est ouvert.', 'Le formulaire est valide.'],
    proof: ['e2e/opportunity-enrichment-lifecycle.spec.ts'],
    states: { loading: true, success: true, error: false, offline: false, permission: true },
  },
  {
    id: 'alerts-mark-all-read',
    entryId: 'alerts-notifications',
    label: 'Tout marquer comme lu',
    route: '/alerts',
    component: 'AlertsPage',
    sourceFile: 'src/app/domains/account/pages/alerts.page.html',
    selector: '[data-og7-id="alerts-mark-all-read"]',
    trigger: 'button',
    intent: 'mutation',
    hasActionHook: false,
    context: 'L inbox doit permettre de resynchroniser rapidement l etat de lecture.',
    expectedResult: 'Marquer toutes les alertes comme lues et rafraichir les compteurs.',
    preconditions: ['Au moins une alerte non lue est presente.'],
    proof: [],
    states: { loading: true, success: true, error: false, offline: false, permission: true },
  },
  {
    id: 'indicator-alert-rule-toggle',
    entryId: 'alerts-notifications',
    label: 'Activer ou desactiver une regle d alerte',
    route: '/alerts',
    component: 'AlertsPage',
    sourceFile: 'src/app/domains/account/pages/alerts.page.html',
    selector: '[data-og7-id="indicator-alert-rule-toggle"]',
    trigger: 'button',
    intent: 'mutation',
    hasActionHook: false,
    context: 'L utilisateur doit pouvoir gerer ses regles sans repasser par le detail indicateur.',
    expectedResult: 'Basculer l etat actif de la regle dans l inbox des alertes.',
    preconditions: ['Au moins une regle indicateur existe.'],
    proof: [],
    states: { loading: false, success: true, error: false, offline: false, permission: true },
  },
  {
    id: 'export-account-data',
    entryId: 'account-data',
    label: 'Exporter les donnees du compte',
    route: '/profile',
    component: 'ProfilePage',
    sourceFile: 'src/app/domains/account/pages/profile.page.html',
    selector: '[data-og7-id="export-account-data"]',
    trigger: 'button',
    intent: 'export',
    hasActionHook: false,
    context: 'Le profil doit offrir un export explicite des donnees personnelles.',
    expectedResult: 'Declencher l export et fournir un retour d avancement a l utilisateur.',
    preconditions: ['Utilisateur connecte.', 'La page profil est chargee.'],
    proof: ['e2e/use-case-audit.spec.ts'],
    states: { loading: true, success: true, error: false, offline: false, permission: true },
  },
  {
    id: 'logout-other-sessions',
    entryId: 'account-data',
    label: 'Deconnecter les autres sessions',
    route: '/profile',
    component: 'ProfilePage',
    sourceFile: 'src/app/domains/account/pages/profile.page.html',
    selector: '[data-og7-id="logout-other-sessions"]',
    trigger: 'button',
    intent: 'mutation',
    hasActionHook: false,
    context: 'La surface securite doit permettre un revoke global des autres appareils.',
    expectedResult: 'Revoker les sessions secondaires et mettre la liste a jour.',
    preconditions: ['Au moins une autre session active existe.'],
    proof: [],
    states: { loading: true, success: true, error: false, offline: false, permission: true },
  },
  {
    id: 'saved-search-create',
    entryId: 'account-data',
    label: 'Creer une recherche sauvegardee',
    route: '/saved-searches',
    component: 'SavedSearchesPage',
    sourceFile: 'src/app/domains/account/pages/saved-searches.page.html',
    selector: '[data-og7-id="saved-search-create"]',
    trigger: 'submit',
    intent: 'mutation',
    hasActionHook: false,
    context: 'Les recherches sauvegardees prolongent la decouverte et la veille personnelle.',
    expectedResult: 'Enregistrer la requete, la frequence et les notifications dans le compte.',
    preconditions: ['Le formulaire de recherche sauvegardee est valide.'],
    proof: ['e2e/saved-searches.spec.ts'],
    states: { loading: false, success: true, error: true, offline: false, permission: true },
  },
  {
    id: 'admin-trust-quick-verify',
    entryId: 'trust-validation',
    label: 'Verifier rapidement un partenaire',
    route: '/admin/trust',
    component: 'AdminTrustPage',
    sourceFile: 'src/app/domains/admin/pages/admin-trust.page.html',
    selector: '[data-og7-id="admin-trust-quick-verify"]',
    trigger: 'button',
    intent: 'moderation',
    hasActionHook: false,
    context: 'Le moderateur doit pouvoir appliquer une decision formelle de verification.',
    expectedResult: 'Pre-remplir une decision verify et preparer la note de revue.',
    preconditions: ['Utilisateur admin.', 'Une entreprise est selectionnee.'],
    proof: ['e2e/admin-trust-visibility.spec.ts'],
    states: { loading: false, success: true, error: true, offline: false, permission: true },
  },
  {
    id: 'admin-trust-save',
    entryId: 'trust-validation',
    label: 'Enregistrer une decision trust',
    route: '/admin/trust',
    component: 'AdminTrustPage',
    sourceFile: 'src/app/domains/admin/pages/admin-trust.page.html',
    selector: '[data-og7-id="admin-trust-save"]',
    trigger: 'submit',
    intent: 'moderation',
    hasActionHook: false,
    context: 'La moderation trust doit produire une decision historisee et visible publiquement.',
    expectedResult: 'Sauvegarder la decision, la note et les preuves associees.',
    preconditions: [
      'Utilisateur admin.',
      'Une entreprise est selectionnee.',
      'Le formulaire est valide.',
    ],
    proof: ['e2e/admin-trust-visibility.spec.ts'],
    states: { loading: true, success: true, error: true, offline: false, permission: true },
  },
  {
    id: 'admin-quality-approve-mission',
    entryId: 'observability',
    label: 'Approuver une mission AI',
    route: '/admin/quality',
    component: 'AdminQualityPage',
    sourceFile: 'packages/admin-quality/src/lib/pages/admin-quality.page.html',
    selector: '[data-og7-id="admin-quality-approve-mission"]',
    trigger: 'button',
    intent: 'workflow',
    hasActionHook: false,
    context: 'Le cockpit doit garder un go humain avant execution d une mission.',
    expectedResult:
      'Basculer la recommandation vers un etat pret a lancer et journaliser la decision.',
    preconditions: ['Une recommandation est proposee.'],
    proof: ['src/app/domains/admin/pages/admin-quality.page.spec.ts'],
    states: { loading: false, success: true, error: false, offline: false, permission: true },
  },
  {
    id: 'admin-quality-copy-codex',
    entryId: 'observability',
    label: 'Copier le brief Codex',
    route: '/admin/quality',
    component: 'AdminQualityPage',
    sourceFile:
      'packages/admin-quality/src/lib/feature/admin-quality-workspace-drawer.component.html',
    selector: '[data-og7-id="admin-quality-copy-codex"]',
    trigger: 'button',
    intent: 'workflow',
    hasActionHook: false,
    context: 'Le cockpit doit permettre de deleguer proprement une action de dev a un agent.',
    expectedResult: 'Copier un brief complet et exploitable pour un agent de developpement.',
    preconditions: ['Un plan de delegation est disponible.'],
    proof: [],
    states: { loading: false, success: true, error: true, offline: false, permission: true },
  },
  {
    id: 'admin-quality-open-issue',
    entryId: 'observability',
    label: 'Ouvrir une issue GitHub pre-remplie',
    route: '/admin/quality',
    component: 'AdminQualityPage',
    sourceFile:
      'packages/admin-quality/src/lib/feature/admin-quality-workspace-drawer.component.html',
    selector: '[data-og7-id="admin-quality-open-issue"]',
    trigger: 'button',
    intent: 'workflow',
    hasActionHook: false,
    context: 'Le cockpit doit materialiser une mission dans le tracker sans re-saisie manuelle.',
    expectedResult: 'Ouvrir GitHub avec le titre et le corps de mission deja prepares.',
    preconditions: ['Un plan de delegation est disponible.'],
    proof: ['src/app/domains/admin/pages/admin-quality.page.spec.ts'],
    states: { loading: false, success: false, error: false, offline: false, permission: true },
  },
];

export function buildActionRegistry(
  entries: readonly AdminQualityMatrixEntry[],
): readonly AdminQualityActionRecord[] {
  const entryMap = new Map(entries.map((entry) => [entry.id, entry]));
  const discoveryMap = buildDiscoveryMap();

  return ACTION_REGISTRY.map((item) => {
    const matrixEntry = entryMap.get(item.entryId);
    const discovery = discoveryMap.get(item.id);
    const matrixE2EStatus = matrixEntry?.e2eStatus ?? 'non';
    const detectedTrigger = discovery
      ? normalizeDiscoveredTrigger(discovery.trigger)
      : item.trigger;
    const detectedActionHook = discovery?.hasActionHook ?? item.hasActionHook;
    const detectedSpecFiles = discovery?.specFiles ?? [];
    const detectedE2EFiles = discovery?.e2eFiles ?? [];
    const proofFiles = uniqueStrings([...item.proof, ...detectedE2EFiles]);
    const gaps = deriveGaps(item, discovery, detectedTrigger, detectedActionHook, proofFiles);

    return {
      ...item,
      domain: matrixEntry?.domain ?? item.entryId,
      entryNeed: matrixEntry?.need ?? '',
      matrixE2EStatus,
      sourceDetected: Boolean(discovery),
      detectedTrigger,
      detectedActionHook,
      detectedSourceFiles:
        discovery?.sourceFiles.map((source) => `${source.file}:${source.line}`) ?? [],
      detectedSpecFiles,
      detectedE2EFiles,
      completionScore: computeCompletionScore(
        item,
        discovery,
        detectedTrigger,
        detectedActionHook,
        proofFiles,
      ),
      status: deriveStatus(gaps, matrixE2EStatus, proofFiles),
      gaps,
    };
  }).sort((left, right) => {
    return (
      statusRank(left.status) - statusRank(right.status) ||
      left.domain.localeCompare(right.domain, 'fr-CA') ||
      left.label.localeCompare(right.label, 'fr-CA')
    );
  });
}

export function buildUndocumentedDiscoveredActions(
  entries: readonly AdminQualityMatrixEntry[],
): readonly AdminQualityUndocumentedActionRecord[] {
  const entryMap = new Map(entries.map((entry) => [entry.id, entry]));
  const documentedIds = new Set(ACTION_REGISTRY.map((item) => item.id));

  return GENERATED_ADMIN_QUALITY_ACTION_DISCOVERY.filter((item) => !documentedIds.has(item.id))
    .map((item) => {
      const entryId = guessEntryIdFromDiscovery(item);
      const matrixEntry = entryId ? entryMap.get(entryId) : null;

      return {
        id: item.id,
        entryId,
        domain: matrixEntry?.domain ?? (entryId ? entryId : 'Non rattache'),
        trigger: normalizeDiscoveredTrigger(item.trigger),
        hasActionHook: item.hasActionHook,
        detectedSourceFiles: item.sourceFiles.map((source) => `${source.file}:${source.line}`),
        detectedSpecFiles: item.specFiles,
        detectedE2EFiles: item.e2eFiles,
      };
    })
    .sort((left, right) => {
      return (
        left.domain.localeCompare(right.domain, 'fr-CA') || left.id.localeCompare(right.id, 'fr-CA')
      );
    });
}

function deriveGaps(
  item: AdminQualityActionRegistryItem,
  discovery: GeneratedAdminQualityActionDiscovery | undefined,
  trigger: AdminQualityActionTrigger,
  hasActionHook: boolean,
  proofFiles: readonly string[],
): readonly string[] {
  const gaps: string[] = [];

  if (!discovery) {
    gaps.push('Le selector documente n a pas ete detecte automatiquement dans les templates.');
  }
  if (!hasActionHook) {
    gaps.push('Ajouter ou standardiser data-og7="action" sur ce bouton.');
  }
  if (!item.selector.trim()) {
    gaps.push('Ajouter un data-og7-id stable et documente.');
  }
  if (!item.context.trim()) {
    gaps.push('Documenter le contexte metier de l action.');
  }
  if (!item.expectedResult.trim()) {
    gaps.push('Documenter le resultat attendu apres execution.');
  }
  if (!proofFiles.length) {
    gaps.push('Ajouter une preuve executable reliee a cette action.');
  }
  if ((item.intent === 'mutation' || item.intent === 'moderation') && !item.states.success) {
    gaps.push('Documenter un etat de succes visible pour l utilisateur.');
  }
  if ((item.intent === 'mutation' || item.intent === 'moderation') && !item.states.error) {
    gaps.push('Documenter un etat d erreur visible pour l utilisateur.');
  }
  if (trigger === 'submit' && !item.states.loading) {
    gaps.push('Documenter un etat de soumission ou loading.');
  }
  if (item.entryId === 'quality-breadth' && !item.states.offline) {
    gaps.push('Documenter le comportement offline ou la reprise apres interruption.');
  }
  if (item.intent === 'moderation' && !item.states.permission) {
    gaps.push('Documenter le role ou la permission necessaire a cette action.');
  }

  return gaps;
}

function computeCompletionScore(
  item: AdminQualityActionRegistryItem,
  discovery: GeneratedAdminQualityActionDiscovery | undefined,
  trigger: AdminQualityActionTrigger,
  hasActionHook: boolean,
  proofFiles: readonly string[],
): number {
  const checks = [
    Boolean(item.selector.trim()) && Boolean(discovery),
    hasActionHook,
    Boolean(item.context.trim() && item.expectedResult.trim()),
    proofFiles.length > 0,
    hasRequiredStateCoverage(item, trigger),
  ];

  const passedChecks = checks.filter(Boolean).length;
  return Math.round((passedChecks / checks.length) * 100);
}

function hasRequiredStateCoverage(
  item: AdminQualityActionRegistryItem,
  trigger: AdminQualityActionTrigger,
): boolean {
  if (trigger === 'submit') {
    return item.states.loading && item.states.success && item.states.error;
  }

  if (item.intent === 'mutation' || item.intent === 'moderation') {
    return item.states.success && item.states.error;
  }

  return true;
}

function deriveStatus(
  gaps: readonly string[],
  matrixE2EStatus: AdminQualityMatrixStatus,
  proofFiles: readonly string[],
): AdminQualityActionStatus {
  if (gaps.length) {
    return 'needs-completion';
  }

  if (proofFiles.length > 0 && matrixE2EStatus === 'oui') {
    return 'proved';
  }

  return 'documented';
}

function statusRank(status: AdminQualityActionStatus): number {
  switch (status) {
    case 'needs-completion':
      return 0;
    case 'documented':
      return 1;
    default:
      return 2;
  }
}

function buildDiscoveryMap(): ReadonlyMap<string, GeneratedAdminQualityActionDiscovery> {
  return new Map(GENERATED_ADMIN_QUALITY_ACTION_DISCOVERY.map((item) => [item.id, item]));
}

function normalizeDiscoveredTrigger(
  trigger: GeneratedAdminQualityActionDiscovery['trigger'],
): AdminQualityActionTrigger {
  return trigger === 'link' || trigger === 'submit' ? trigger : 'button';
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right, 'fr-CA'));
}

function guessEntryIdFromDiscovery(item: GeneratedAdminQualityActionDiscovery): string | null {
  const source = item.sourceFiles[0]?.file ?? '';
  const id = item.id;

  if (source.includes('/domains/admin/pages/admin-quality')) {
    return 'observability';
  }
  if (source.includes('/domains/admin/pages/admin-trust')) {
    return 'trust-validation';
  }
  if (
    source.includes('/domains/account/pages/profile') ||
    source.includes('/domains/account/pages/saved-searches')
  ) {
    return 'account-data';
  }
  if (source.includes('/domains/account/pages/alerts')) {
    return 'alerts-notifications';
  }
  if (source.includes('/domains/account/pages/favorites')) {
    return 'advanced-discovery';
  }
  if (
    source.includes('/domains/home/feature/home-corridors-realtime') ||
    source.includes('/shared/components/map') ||
    id === 'view-map' ||
    id === 'corridor-item'
  ) {
    return 'geospatial';
  }
  if (source.includes('/domains/feed/feature/feed-publish-section')) {
    return 'feed-signals';
  }
  if (
    source.includes('/domains/feed/feature/components/opportunity-offer-drawer') ||
    source.includes('/domains/feed/feature/components/indicator-alert-drawer') ||
    id.includes('retry')
  ) {
    return 'quality-breadth';
  }
  if (
    source.includes('/domains/feed/feature/components/opportunity-report-drawer') ||
    id === 'opportunity-archive'
  ) {
    return 'business-lifecycle';
  }
  if (
    source.includes('/domains/feed/feature') ||
    source.includes('/domains/feed/feature/og7-feed-card')
  ) {
    return 'feed-signals';
  }
  if (source.includes('/shared/components/layout/site-header')) {
    return 'advanced-discovery';
  }

  return null;
}
