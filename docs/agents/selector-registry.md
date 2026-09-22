# Registre des sélecteurs Nexus

Lire seulement les entrées du composant/hook modifié. Les chemins du tableau
sont relatifs à la racine du dépôt. Ce registre est consommé par
[validate-selectors.mjs](../../packages/tooling/bin/validate-selectors.mjs).
Mettre à jour code, entrées et tests ensemble. Les noms historiques ne sont pas
un ordre de générer toutes les surfaces; vérifier l’état dans le code.

Tous les composants sont **standalone**, **signal-first**, prêts i18n (`@ngx-translate`) et Tailwind.

## Quality Reactor — explications du diagnostic

<!-- prettier-ignore -->
| Type | Selector / hook | Fichier | Usage |
| --- | --- | --- | --- |
| Composant standalone | `og7-admin-quality-reactor` | `packages/admin-quality/src/lib/pages/admin-quality-reactor.component.ts` | Synthèse et explication du diagnostic qualité. |
| Panneau | `[data-og7="admin-quality-reactor-explanations"]` | `packages/admin-quality/src/lib/pages/admin-quality-reactor.component.html` | Disclosure natif « Pourquoi cet état ? ». |
| Cause | `[data-og7="admin-quality-reactor-reason"][data-og7-id]` | `packages/admin-quality/src/lib/pages/admin-quality-reactor.component.html` | IDs : `priority-gaps`, `unresolved`, `not-evaluated`, `review-required`. |
| Action | `[data-og7="action"][data-og7-id="admin-quality-reactor-view-<reason-id>"]` | `packages/admin-quality/src/lib/pages/admin-quality-reactor.component.html` | Ouvre les lignes exactes de la cause dans la matrice. |
| Filtre visible | `[data-og7="admin-quality-reactor-filter"]` | `packages/admin-quality/src/lib/pages/admin-quality.page.html` | Cause active, traduite et réinitialisable. |
| Action | `[data-og7="action"][data-og7-id="admin-quality-reactor-clear-reason"]` | `packages/admin-quality/src/lib/pages/admin-quality.page.html` | Retire le filtre de cause et rend le focus à la matrice. |

## Registry des composants Angular (selectors officiels)

<!-- prettier-ignore -->
| Catégorie | Canonical selector | Current selector in code | Component class | File path | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Layout / nav / a11y | og7-shell-root | og7-shell-root | AppComponent | openg7-org/src/app/app.component.ts | ok | Bootstrap Angular sur le selector og7- prefixed. |
| Layout / nav / a11y | og7-site-header | og7-site-header | SiteHeaderComponent | openg7-org/src/app/shared/components/layout/site-header.component.ts | ok |  |
| Layout / nav / a11y | og7-notification-panel | og7-notification-panel | NotificationPanelComponent | openg7-org/src/app/shared/components/layout/notification-panel.component.ts | ok |  |
| Layout / nav / a11y | og7-under-construction-banner | og7-under-construction-banner | UnderConstructionBannerComponent | openg7-org/src/app/shared/components/layout/under-construction-banner.component.ts | ok |  |
| Layout / nav / a11y | og7-onboarding-flow | og7-onboarding-flow | Og7OnboardingFlowComponent | openg7-org/src/app/shared/components/layout/og7-onboarding-flow.component.ts | ok |  |
| Layout / nav / a11y | og7-modal-container | og7-modal-container | Og7ModalContainerComponent | openg7-org/src/app/core/ui/modal/og7-modal-container.component.ts | ok |  |
| Conformité & i18n / Auth | og7-i18n-language-switch | og7-i18n-language-switch | LanguageSwitchComponent | openg7-org/src/app/shared/components/i18n/language-switch.component.ts | ok | Aligné sur le préfixe og7- (kebab-case). |
| Conformité & i18n / Auth | og7-compliance-checklist | og7-compliance-checklist | Og7ComplianceChecklistComponent | openg7-org/src/app/shared/components/connection/og7-compliance-checklist.component.ts | ok |  |
| Conformité & i18n / Auth | og7-social-auth-buttons | og7-social-auth-buttons | SocialAuthButtonsComponent | openg7-org/src/app/shared/components/auth/social-auth-buttons.component.ts | ok |  |
| Conformité & i18n / Auth | og7-subscription-plans | og7-subscription-plans | SubscriptionPlansComponent | openg7-org/src/app/shared/components/billing/subscription-plans.component.ts | ok |  |
| Commerce & entreprises | og7-company-registration-form | og7-company-registration-form | CompanyRegistrationFormComponent | openg7-org/src/app/company-registration-form/components/company-registration-form/company-registration-form.component.ts | ok |  |
| Commerce & entreprises | og7-companies-import-page | og7-companies-import-page | CompaniesImportPageComponent | openg7-org/src/app/import/companies-import-page/companies-import-page.component.ts | ok |  |
| Commerce & entreprises | og7-entreprise | og7-entreprise | Og7EntrepriseComponent | openg7-org/src/app/domains/enterprise/entreprise/og7-entreprise.component.ts | ok |  |
| Hero & marketing | og7-hero-section | og7-hero-section | HeroSectionComponent | openg7-org/src/app/shared/components/hero/hero-section/hero-section.component.ts | ok | Selector Angular aligné (og7-hero-section). |
| Hero & marketing | og7-hero-copy | og7-hero-copy | HeroCopyComponent | openg7-org/src/app/shared/components/hero/hero-copy/hero-copy.component.ts | ok | Selector Angular aligné (og7-hero-copy). |
| Hero & marketing | og7-hero-ctas | og7-hero-ctas | HeroCtasComponent | openg7-org/src/app/shared/components/hero/hero-ctas/hero-ctas.component.ts | ok | Selector Angular aligné (og7-hero-ctas). |
| Hero & marketing | og7-hero-stats | og7-hero-stats | HeroStatsComponent | openg7-org/src/app/shared/components/hero/hero-stats/hero-stats.component.ts | ok |  |
| Hero & marketing | og7-home-hero-section | og7-home-hero-section | HomeHeroSectionComponent | openg7-org/src/app/domains/home/feature/home-hero-section/home-hero-section.component.ts | ok |  |
| Hero & marketing | og7-home-hero-galaxy | og7-home-hero-galaxy | HomeHeroGalaxyClientComponent | openg7-org/src/app/domains/home/feature/home-hero-section/home-hero-galaxy.client.component.ts | ok | Backdrop client-only (galaxy + globe). |
| Hero & marketing | og7-financing-banner | og7-financing-banner | Og7FinancingBannerComponent | openg7-org/src/app/shared/components/financing/og7-financing-banner.component.ts | ok |  |
| Hero & marketing | og7-cta-rail | og7-cta-rail | Og7CtaRailComponent | openg7-org/src/app/shared/components/cta/og7-cta-rail.component.ts | ok |  |
| Hero & marketing | og7-dual-qr-panel | og7-dual-qr-panel | Og7DualQrPanelComponent | openg7-org/src/app/shared/components/qr/og7-dual-qr-panel.component.ts | ok |  |
| Hero & marketing | og7-intro-billboard-content | og7-intro-billboard-content | Og7IntroBillboardContentComponent | openg7-org/src/app/domains/matchmaking/sections/og7-intro-billboard-content.component.ts | ok |  |
| Hero & marketing | og7-home-page | og7-home-page | Og7HomePageComponent | openg7-org/src/app/domains/home/pages/home/og7-home-page.component.ts | ok |  |
| Carte & data viz | og7-map-basemap-toggle | og7-map-basemap-toggle | BasemapToggleComponent | openg7-org/src/app/shared/components/map/controls/basemap-toggle.component.ts | ok | Selector Angular aligné (og7-map-basemap-toggle). |
| Carte & data viz | og7-map-zoom-control | og7-map-zoom-control | ZoomControlComponent | openg7-org/src/app/shared/components/map/controls/zoom-control.component.ts | ok | Selector Angular aligné (og7-map-zoom-control). |
| Carte & data viz | og7-map-legend | og7-map-legend | MapLegendComponent | openg7-org/src/app/shared/components/map/legend/map-legend.component.ts | ok | Selector Angular aligné (og7-map-legend). |
| Carte & data viz | og7-map-kpi-badges | og7-map-kpi-badges | MapKpiBadgesComponent | openg7-org/src/app/shared/components/map/kpi/map-kpi-badges.component.ts | ok | Selector Angular aligné (og7-map-kpi-badges). |
| Carte & data viz | og7-map-sector-chips | og7-map-sector-chips | MapSectorChipsComponent | openg7-org/src/app/shared/components/map/filters/map-sector-chips.component.ts | ok | Selector Angular aligné (og7-map-sector-chips). |
| Carte & data viz | og7-openlayers-demo-page | og7-openlayers-demo-page | OpenlayersDemoPage | openg7-org/src/app/domains/developer/pages/openlayers-demo.page.ts | ok | Page de demonstration OL avec donnees mock et interactions corridor-first. |
| Carte & data viz | og7-map-frame | og7-map-frame | Og7MapFrameComponent | openg7-org/src/app/shared/components/map-frame/og7-map-frame.component.ts | ok |  |
| Carte & data viz | og7-home-map-section | og7-home-map-section | HomeMapSectionComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-map-section.component.ts | ok |  |
| Carte & data viz | og7-home-openlayers-map | og7-home-openlayers-map | HomeOpenlayersMapComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-openlayers-map.component.ts | ok | Carte OpenLayers embarquee dans la section home map, exportee via le barrel du module home-map-section. |
| Carte & data viz | og7-home-corridors-realtime | og7-home-corridors-realtime | HomeCorridorsRealtimeComponent | openg7-org/src/app/domains/home/feature/home-corridors-realtime/home-corridors-realtime.component.ts | ok |  |
| Carte & data viz | og7-importation-flow-map-panel | og7-importation-flow-map-panel | ImportationFlowMapPanelComponent | openg7-org/src/app/domains/importation/components/flow-map-panel/importation-flow-map-panel.component.ts | ok |  |
| Carte & data viz | og7-opportunity-mini-map | og7-opportunity-mini-map | OpportunityMiniMapComponent | openg7-org/src/app/domains/opportunities/opportunities/ui/opportunity-mini-map/opportunity-mini-map.component.ts | ok |  |
| Carte & data viz | og7-opportunity-radar | og7-opportunity-radar | OpportunityRadarComponent | openg7-org/src/app/domains/opportunities/opportunities/ui/opportunity-radar/opportunity-radar.component.ts | ok |  |
| Carte & data viz | og7-opportunity-subway | og7-opportunity-subway | OpportunitySubwayComponent | openg7-org/src/app/domains/opportunities/opportunities/ui/opportunity-subway/opportunity-subway.component.ts | ok |  |
| Recherche & filtres | og7-filters-toolbar | [data-og7="filters"] | GlobalFiltersComponent | openg7-org/src/app/shared/components/filters/global-filters.component.ts | ok | Livré via l’attribut `[data-og7="filters"]`; pas de rename Angular supplémentaire prévu. |
| Recherche & filtres | og7-company-table | [data-og7="company-table"] | CompanyTableComponent | openg7-org/src/app/shared/components/company/company-table.component.ts | ok | Selector data-og7 déjà exposé en production. |
| Recherche & filtres | og7-company-detail | [data-og7="company-detail"] | CompanyDetailComponent | openg7-org/src/app/shared/components/company/company-detail.component.ts | ok | Selector data-og7 déjà exposé en production. |
| Recherche & filtres | og7-home-filters-section | og7-home-filters-section | HomeFiltersSectionComponent | openg7-org/src/app/domains/home/feature/home-filters-section/home-filters-section.component.ts | ok |  |
| Recherche & filtres | og7-search-field | og7-search-field | Og7SearchFieldComponent | openg7-org/src/app/shared/components/search/og7-search-field.component.ts | ok |  |
| Recherche & filtres | og7-quick-search-modal | og7-quick-search-modal | QuickSearchModalComponent | openg7-org/src/app/domains/search/feature/quick-search-modal/quick-search-modal.component.ts | ok |  |
| Recherche & filtres | og7-quick-search-result-item | og7-quick-search-result-item | QuickSearchResultItemComponent | openg7-org/src/app/domains/search/feature/quick-search-modal/quick-search-result-item.component.ts | ok |  |
| Recherche & filtres | og7-quick-search-section-skeleton | og7-quick-search-section-skeleton | QuickSearchSectionSkeletonComponent | openg7-org/src/app/domains/search/feature/quick-search-modal/quick-search-section-skeleton.component.ts | ok |  |
| Recherche & filtres | og7-scoreboard-pipeline | og7-scoreboard-pipeline | Og7ScoreboardPipelineComponent | openg7-org/src/app/shared/components/pipeline/og7-scoreboard-pipeline.component.ts | ok |  |
| Recherche & filtres | og7-filters-sector-carousel | og7-filters-sector-carousel | SectorCarouselComponent | openg7-org/src/app/shared/components/filters/sector-carousel.component.ts | ok | Selector Angular aligné (og7-filters-sector-carousel). |
| Matchmaking & réseau | og7-matchmaking-introduction-message-editor | og7-matchmaking-introduction-message-editor | IntroductionMessageEditorComponent | openg7-org/src/app/domains/matchmaking/og7-mise-en-relation/components/introduction-message-editor.component.ts | ok | Selector Angular aligné (og7- prefixed, kebab-case). |
| Matchmaking & réseau | og7-intro-stepper | og7-intro-stepper | Og7IntroStepperComponent | openg7-org/src/app/domains/matchmaking/og7-mise-en-relation/og7-intro-stepper.component.ts | ok |  |
| Matchmaking & réseau | og7-linkup-detail-page | og7-linkup-detail-page | Og7LinkupDetailPageComponent | openg7-org/src/app/domains/matchmaking/pages/linkup-detail/og7-linkup-detail-page.component.ts | ok |  |
| Matchmaking & réseau | og7-linkup-history-page | og7-linkup-history-page | Og7LinkupHistoryPageComponent | openg7-org/src/app/domains/matchmaking/pages/linkup-history/og7-linkup-history-page.component.ts | ok |  |
| Matchmaking & réseau | og7-linkup-page | og7-linkup-page | Og7LinkupPageComponent | openg7-org/src/app/domains/matchmaking/pages/linkup/og7-linkup-page.component.ts | ok |  |
| Matchmaking & réseau | og7-meeting-scheduler | og7-meeting-scheduler | Og7MeetingSchedulerComponent | openg7-org/src/app/shared/components/connection/og7-meeting-scheduler.component.ts | ok |  |
| Matchmaking & réseau | og7-partner-details-card | og7-partner-details-card | Og7PartnerDetailsCardComponent | openg7-org/src/app/shared/components/partner/og7-partner-details-card.component.ts | ok |  |
| Matchmaking & réseau | og7-partner-details-panel | og7-partner-details-panel | PartnerDetailsPanelComponent | openg7-org/src/app/shared/components/partner/partner-details-panel.component.ts | ok |  |
| Matchmaking & réseau | og7-partner-quick-actions | og7-partner-quick-actions | PartnerQuickActionsComponent | openg7-org/src/app/domains/partners/partners/ui/partner-quick-actions.component.ts | ok |  |
| Flux & social | og7-feed-card | og7-feed-card | Og7FeedCardComponent | openg7-org/src/app/domains/feed/feature/og7-feed-card/og7-feed-card.component.ts | ok |  |
| Flux & social | og7-feed-composer | og7-feed-composer | Og7FeedComposerComponent | openg7-org/src/app/domains/feed/feature/og7-feed-composer/og7-feed-composer.component.ts | ok |  |
| Flux & social | og7-feed-post-drawer | og7-feed-post-drawer | Og7FeedPostDrawerComponent | openg7-org/src/app/domains/feed/feature/og7-feed-post-drawer/og7-feed-post-drawer.component.ts | ok |  |
| Flux & social | og7-feed-replies | og7-feed-replies | Og7FeedRepliesComponent | openg7-org/src/app/domains/feed/feature/og7-feed-replies/og7-feed-replies.component.ts | ok |  |
| Flux & social | og7-feed-stream | og7-feed-stream | Og7FeedStreamComponent | openg7-org/src/app/domains/feed/feature/og7-feed-stream/og7-feed-stream.component.ts | ok |  |
| Flux & social | og7-feed-opportunity-detail-page | og7-feed-opportunity-detail-page | FeedOpportunityDetailPage | openg7-org/src/app/domains/feed/feature/pages/feed-opportunity-detail.page.ts | ok | Page detail opportunite post-clic feed. |
| Flux & social | og7-opportunity-detail-header | og7-opportunity-detail-header | OpportunityDetailHeaderComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-detail-header.component.ts | ok | Header sticky + actions + badges. |
| Flux & social | og7-opportunity-detail-body | og7-opportunity-detail-body | OpportunityDetailBodyComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-detail-body.component.ts | ok | Cartes resume/specs/modalites/docs. |
| Flux & social | og7-opportunity-qna | og7-opportunity-qna | OpportunityQnaComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-qna.component.ts | ok | Onglets Questions/Offres/Historique + composeur. |
| Flux & social | og7-opportunity-context-aside | og7-opportunity-context-aside | OpportunityContextAsideComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-context-aside.component.ts | ok | Contexte temps reel (apercu/indicateurs/alertes). |
| Flux & social | og7-feed-opportunity-mini-map | og7-feed-opportunity-mini-map | OpportunityMiniMapComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-mini-map.component.ts | ok | Mini-map corridor Quebec -> Ontario. |
| Flux & social | og7-opportunity-offer-drawer | og7-opportunity-offer-drawer | OpportunityOfferDrawerComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-offer-drawer.component.ts | ok | Drawer formulaire proposer une offre. |
| Flux & social | og7-feed-alert-detail-page | og7-feed-alert-detail-page | FeedAlertDetailPage | openg7-org/src/app/domains/feed/feature/pages/feed-alert-detail.page.ts | ok | Page detail alerte post-clic feed. |
| Flux & social | og7-alert-detail-header | og7-alert-detail-header | AlertDetailHeaderComponent | openg7-org/src/app/domains/feed/feature/components/alert-detail-header.component.ts | ok | Header sticky severite + confiance + fenetre + CTA alertes. |
| Flux & social | og7-alert-detail-body | og7-alert-detail-body | AlertDetailBodyComponent | openg7-org/src/app/domains/feed/feature/components/alert-detail-body.component.ts | ok | Resume impact, zones, chronologie, recommandations, sources. |
| Flux & social | og7-alert-context-aside | og7-alert-context-aside | AlertContextAsideComponent | openg7-org/src/app/domains/feed/feature/components/alert-context-aside.component.ts | ok | Indicateurs, alertes liees, opportunites associees. |
| Flux & social | og7-feed-indicator-detail-page | og7-feed-indicator-detail-page | FeedIndicatorDetailPage | openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.ts | ok | Page detail indicateur post-clic feed. |
| Flux & social | og7-indicator-hero | og7-indicator-hero | IndicatorHeroComponent | openg7-org/src/app/domains/feed/feature/components/indicator-hero.component.ts | ok | Header sticky indicateur (breadcrumb, actions, chips). |
| Flux & social | og7-indicator-chart | og7-indicator-chart | IndicatorChartComponent | openg7-org/src/app/domains/feed/feature/components/indicator-chart.component.ts | ok | Courbe principale avec tooltip + mode tableau. |
| Flux & social | og7-indicator-stats-aside | og7-indicator-stats-aside | IndicatorStatsAsideComponent | openg7-org/src/app/domains/feed/feature/components/indicator-stats-aside.component.ts | ok | Colonne contexte stats temps reel. |
| Flux & social | og7-indicator-key-data | og7-indicator-key-data | IndicatorKeyDataComponent | openg7-org/src/app/domains/feed/feature/components/indicator-key-data.component.ts | ok | Carte donnees cles + facteurs d'augmentation. |
| Flux & social | og7-indicator-related-list | og7-indicator-related-list | IndicatorRelatedListComponent | openg7-org/src/app/domains/feed/feature/components/indicator-related-list.component.ts | ok | Listes liees alertes/opportunites avec sparklines. |
| Flux & social | og7-indicator-alert-drawer | og7-indicator-alert-drawer | IndicatorAlertDrawerComponent | openg7-org/src/app/domains/feed/feature/components/indicator-alert-drawer.component.ts | ok | Drawer creation alerte depuis un indicateur. |
| Importation & supply chain | og7-importation-collaboration-hub | og7-importation-collaboration-hub | ImportationCollaborationHubComponent | openg7-org/src/app/domains/importation/components/collaboration-hub/importation-collaboration-hub.component.ts | ok |  |
| Importation & supply chain | og7-importation-commodity-section | og7-importation-commodity-section | ImportationCommoditySectionComponent | openg7-org/src/app/domains/importation/components/commodity-section/importation-commodity-section.component.ts | ok |  |
| Importation & supply chain | og7-importation-knowledge-section | og7-importation-knowledge-section | ImportationKnowledgeSectionComponent | openg7-org/src/app/domains/importation/components/knowledge-section/importation-knowledge-section.component.ts | ok |  |
| Importation & supply chain | og7-importation-overview-header | og7-importation-overview-header | ImportationOverviewHeaderComponent | openg7-org/src/app/domains/importation/components/overview-header/importation-overview-header.component.ts | ok |  |
| Importation & supply chain | og7-importation-supplier-intel | og7-importation-supplier-intel | ImportationSupplierIntelComponent | openg7-org/src/app/domains/importation/components/supplier-intel/importation-supplier-intel.component.ts | ok |  |
| Importation & supply chain | og7-incoterms-ribbon | og7-incoterms-ribbon | Og7IncotermsRibbonComponent | openg7-org/src/app/shared/components/logistics/og7-incoterms-ribbon.component.ts | ok |  |
| Opportunités & analytics | og7-opportunity-compact-kpi-list | og7-opportunity-compact-kpi-list | OpportunityCompactKpiListComponent | openg7-org/src/app/domains/opportunities/opportunities/ui/opportunity-compact-kpi-list/opportunity-compact-kpi-list.component.ts | ok |  |
| Opportunités & analytics | og7-opportunity-impact-banner | og7-opportunity-impact-banner | OpportunityImpactBannerComponent | openg7-org/src/app/domains/opportunities/opportunities/ui/opportunity-impact-banner/opportunity-impact-banner.component.ts | ok |  |
| Opportunités & analytics | og7-home-statistics-section | og7-home-statistics-section | HomeStatisticsSectionComponent | openg7-org/src/app/domains/home/feature/home-statistics-section/home-statistics-section.component.ts | ok |  |
| Opportunités & analytics | og7-home-inputs-section | og7-home-inputs-section | HomeInputsSectionComponent | openg7-org/src/app/domains/home/feature/home-inputs-section/home-inputs-section.component.ts | ok |  |
| Opportunités & analytics | og7-admin-quality-agent-panel | og7-admin-quality-agent-panel | AdminQualityAgentPanelComponent | packages/admin-quality/src/lib/pages/admin-quality-agent-panel.component.ts | ok | Panneau vivant de pilotage visuel de l'agent admin-quality. |
| Conformité & i18n / Auth | og7-alerts-page | og7-alerts-page | AlertsPage | openg7-org/src/app/domains/account/pages/alerts.page.ts | ok | Inbox des alertes utilisateur connecté. |

## Registry des sélecteurs [data-og7*] (hooks UI & tests)

<!-- prettier-ignore -->
| Catégorie | data-og7 / data-og7-id | Used in component | File path | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hooks génériques | [data-og7="*"] | — | — | planned | Backlog (garde-fou global à ajouter lors du prochain cycle E2E). |
| Hooks génériques | [data-og7="action"] | HeroCtasComponent | openg7-org/src/app/shared/components/hero/hero-ctas.component.html | ok | Utilisé pour tracer les CTA (data-og7="action"). |
| Layout / nav / a11y | [data-og7="app"] | AppComponent | openg7-org/src/app/app.component.ts | planned | À ajouter dans le template racine (actuel : data-og7="app-shell"). |
| Layout / nav / a11y | [data-og7="site-header"] | SiteHeaderComponent | openg7-org/src/app/shared/components/layout/site-header.component.html | ok | Hook déjà appliqué sur l’en-tête. |
| Layout / nav / a11y | [data-og7="announcement-bar"] | — | — | planned | Barre d’annonce optionnelle (non implémentée). |
| Conformité & i18n / Auth | [data-og7="language-switch"] | LanguageSwitchComponent | openg7-org/src/app/shared/components/i18n/language-switch.component.html | ok | Livré via data-og7-id="language-switch" sur le composant. |
| Conformité & i18n / Auth | [data-og7="auth-login"] | LoginPage | openg7-org/src/app/domains/auth/pages/login.page.html | ok | Présent sur la page de connexion. |
| Conformité & i18n / Auth | [data-og7="auth-register"] | RegisterPage | openg7-org/src/app/domains/auth/pages/register.page.html | ok | Présent sur la page d’inscription. |
| Conformité & i18n / Auth | [data-og7="access-denied"] | AccessDeniedPage | openg7-org/src/app/domains/auth/pages/access-denied.page.html | ok | Présent sur la page d’accès refusé. |
| Conformité & i18n / Auth | [data-og7="user-profile"] | ProfilePage | openg7-org/src/app/domains/account/pages/profile.page.html | ok | Présent sur la page profil. |
| Conformité & i18n / Auth | [data-og7="user-profile-export-data"] | ProfilePage | openg7-org/src/app/domains/account/pages/profile.page.html | ok | Carte d'export des données du compte (JSON). |
| Conformité & i18n / Auth | [data-og7="user-profile-sessions"] | ProfilePage | openg7-org/src/app/domains/account/pages/profile.page.html | ok | Carte des sessions connectées et action “déconnecter les autres appareils”. |
| Conformité & i18n / Auth | [data-og7="user-alerts"] | AlertsPage | openg7-org/src/app/domains/account/pages/alerts.page.html | ok | Inbox des alertes utilisateur connecte. |
| Opportunités & analytics | [data-og7="admin-quality-agent-panel"] | AdminQualityAgentPanelComponent | packages/admin-quality/src/lib/pages/admin-quality-agent-panel.component.html | ok | Panneau vivant de pilotage visuel de l'agent admin-quality. |
| Hero & marketing | [data-og7="hero"] | HeroSectionComponent | openg7-org/src/app/shared/components/hero/hero-section/hero-section.component.ts | ok | Selector actuel du composant. |
| Hero & marketing | [data-og7="hero-copy"] | HeroCopyComponent | openg7-org/src/app/shared/components/hero/hero-copy/hero-copy.component.ts | ok |  |
| Hero & marketing | [data-og7="hero-ctas"] | HeroCtasComponent | openg7-org/src/app/shared/components/hero/hero-ctas/hero-ctas.component.ts | ok |  |
| Hero & marketing | [data-og7="home-inputs"] | HomeInputsSectionComponent | openg7-org/src/app/domains/home/feature/home-inputs-section/home-inputs-section.component.ts | ok |  |
| Hero & marketing | [data-og7="announcement-bar"] | — | — | planned | Doublon volontaire pour l’UI marketing (pas encore utilisé). |
| Carte & data viz | [data-og7="trade-map"] | HomeOpenlayersMapComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-openlayers-map.component.ts | ok | Surface OpenLayers home qui remplace l'ancien composant shared. |
| Carte & data viz | [data-og7="ol-demo-page"] | OpenlayersDemoPage | openg7-org/src/app/domains/developer/pages/openlayers-demo.page.ts | ok | Racine de la page de demonstration OpenLayers. |
| Carte & data viz | [data-og7="ol-demo-map"] | OpenlayersDemoPage | openg7-org/src/app/domains/developer/pages/openlayers-demo.page.ts | ok | Surface cartographique OL alimentee par donnees mock. |
| Carte & data viz | [data-og7="map-basemap-toggle"] | BasemapToggleComponent | openg7-org/src/app/shared/components/map/controls/basemap-toggle.component.ts | ok |  |
| Carte & data viz | [data-og7="map-zoom-control"] | ZoomControlComponent | openg7-org/src/app/shared/components/map/controls/zoom-control.component.ts | ok |  |
| Carte & data viz | [data-og7="map-legend"] | MapLegendComponent | openg7-org/src/app/shared/components/map/legend/map-legend.component.ts | ok |  |
| Carte & data viz | [data-og7="map-kpi-badges"] | MapKpiBadgesComponent | openg7-org/src/app/shared/components/map/kpi/map-kpi-badges.component.ts | ok |  |
| Carte & data viz | [data-og7="map-sector-chips"] | MapSectorChipsComponent | openg7-org/src/app/shared/components/map/filters/map-sector-chips.component.ts | ok |  |
| Carte & data viz | [data-og7="home-map"] | HomeMapSectionComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-map-section.component.html | ok | Racine de la section carte de la page d'accueil. |
| Carte & data viz | [data-og7="map-mobile-picks"] | HomeMapSectionComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-map-section.component.html | ok | Rail mobile des drilldowns par secteur. |
| Carte & data viz | [data-og7="map-decision-panel"] | HomeMapSectionComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-map-section.component.html | ok | Panneau desktop de decision downstream vers le feed. |
| Carte & data viz | [data-og7="map-overlay"] | HomeOpenlayersMapComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-openlayers-map.component.ts | ok | Overlay fonctionnel de la carte OpenLayers home. |
| Carte & data viz | [data-og7="map-sector-rail"] | HomeOpenlayersMapComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-openlayers-map.component.ts | ok | Controle des secteurs affiches sur la carte OpenLayers home. |
| Carte & data viz | [data-og7="map-pulse-panel"] | HomeOpenlayersMapComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-openlayers-map.component.ts | ok | Indicateurs corridors/hubs visibles. |
| Carte & data viz | [data-og7="action"][data-og7-id="map-toggle-stats"] | HomeOpenlayersMapComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-openlayers-map.component.ts | ok | Toggle pour masquer ou retablir les statistiques de surcouche de la carte home. |
| Carte & data viz | [data-og7="map-corridor-card"] | HomeOpenlayersMapComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-openlayers-map.component.ts | ok | Carte resume du corridor courant. |
| Carte & data viz | [data-og7="map-cinematic-status"] | HomeOpenlayersMapComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-openlayers-map.component.ts | ok | Etat du mode idle/cadrage automatique de la carte home. |
| Carte & data viz | [data-og7="map-corridor-beat"] | HomeOpenlayersMapComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-openlayers-map.component.ts | ok | Etapes narratives cliquables du corridor courant. |
| Carte & data viz | [data-og7="map-corridor-downstream"] | HomeOpenlayersMapComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-openlayers-map.component.ts | ok | Pont decisionnel du corridor courant vers le feed prefiltre. |
| Carte & data viz | [data-og7="action"][data-og7-id="map-open-corridor-feed"] | HomeOpenlayersMapComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-openlayers-map.component.ts | ok | CTA clavier/souris pour ouvrir le feed focalise sur le corridor courant. |
| Carte & data viz | [data-og7="map-hub-card"] | HomeOpenlayersMapComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-openlayers-map.component.ts | ok | Mini-fiche ouverte apres clic sur un hub de la carte. |
| Carte & data viz | [data-og7="map-hub-prompt"] | HomeOpenlayersMapComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-openlayers-map.component.ts | ok | Indication de decouverte pour l'ouverture des mini-fiches hub. |
| Carte & data viz | [data-og7="corridors-realtime"] | HomeCorridorsRealtimeComponent | openg7-org/src/app/domains/home/feature/home-corridors-realtime/home-corridors-realtime.component.html | ok |  |
| Carte & data viz | [data-og7="corridors-realtime"] [data-og7-id="fullscreen"] | HomeCorridorsRealtimeComponent | openg7-org/src/app/domains/home/feature/home-corridors-realtime/home-corridors-realtime.component.html | ok |  |
| Carte & data viz | [data-og7="corridors-realtime"] [data-og7-id="view-map"] | HomeCorridorsRealtimeComponent | openg7-org/src/app/domains/home/feature/home-corridors-realtime/home-corridors-realtime.component.html | ok | CTA voir sur la carte (inactif pour l'instant). |
| Recherche & filtres | [data-og7="filters"][data-og7-id="filters-group"] | GlobalFiltersComponent | openg7-org/src/app/shared/components/filters/global-filters.component.ts | ok |  |
| Recherche & filtres | [data-og7="filters"][data-og7-id="sector-carousel"] | SectorCarouselComponent | openg7-org/src/app/shared/components/filters/sector-carousel.component.ts | ok |  |
| Recherche & filtres | [data-og7="search-box"] | SiteHeaderComponent | openg7-org/src/app/shared/components/layout/site-header.component.ts | planned | Nom en kebab-case aligné sur la convention data-og7 ; sera branché avec l’omnibox. |
| Layout / nav / a11y | [data-og7-id="alerts"] | SiteHeaderComponent | openg7-org/src/app/shared/components/layout/site-header/site-header.component.html | ok | Lien menu profil vers /alerts (desktop + mobile). |
| Commerce & entreprises | [data-og7="company-table"] | CompanyTableComponent | openg7-org/src/app/shared/components/company/company-table.component.ts | ok |  |
| Commerce & entreprises | [data-og7="company-detail"] | CompanyDetailComponent | openg7-org/src/app/shared/components/company/company-detail.component.ts | ok |  |
| Flux & social | [data-og7="feed-page"] | FeedPage | openg7-org/src/app/domains/feed/feature/feed.page.html | ok | Conteneur principal du feed. |
| Flux & social | [data-og7="feed-source-context"] | FeedPage | openg7-org/src/app/domains/feed/feature/feed.page.html | ok | Bandeau de contexte source/corridor preserve depuis la carte ou les surfaces amont. |
| Flux & social | [data-og7="feed-source-chips"] | FeedPage | openg7-org/src/app/domains/feed/feature/feed.page.html | ok | Groupe de chips du contexte corridor (secteur, route, mode, priorite). |
| Flux & social | [data-og7="feed-source-chip"][data-og7-id="sector"] | FeedPage | openg7-org/src/app/domains/feed/feature/feed.page.html | ok | Chip secteur du contexte corridor feed. |
| Flux & social | [data-og7="feed-source-chip"][data-og7-id="route"] | FeedPage | openg7-org/src/app/domains/feed/feature/feed.page.html | ok | Chip route du contexte corridor feed. |
| Flux & social | [data-og7="feed-source-chip"][data-og7-id="mode"] | FeedPage | openg7-org/src/app/domains/feed/feature/feed.page.html | ok | Chip mode import/export du contexte corridor feed. |
| Flux & social | [data-og7="feed-source-chip"][data-og7-id="priority"] | FeedPage | openg7-org/src/app/domains/feed/feature/feed.page.html | ok | Chip priorite du contexte corridor feed. |
| Flux & social | [data-og7="action"][data-og7-id="feed-context-return-map"] | FeedPage | openg7-org/src/app/domains/feed/feature/feed.page.html | ok | Retour clavier/souris vers la carte d'origine du contexte feed. |
| Flux & social | [data-og7="action"][data-og7-id="feed-context-reset"] | FeedPage | openg7-org/src/app/domains/feed/feature/feed.page.html | ok | Reinitialisation du contexte source/corridor du feed. |
| Flux & social | [data-og7="opportunity-detail-page"] | FeedOpportunityDetailPage | openg7-org/src/app/domains/feed/feature/pages/feed-opportunity-detail.page.html | ok | Conteneur detail opportunite. |
| Flux & social | [data-og7="opportunity-detail-header"] | OpportunityDetailHeaderComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-detail-header.component.html | ok | Header sticky + actions detail. |
| Flux & social | [data-og7="opportunity-detail-body"] | OpportunityDetailBodyComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-detail-body.component.html | ok | Resume/specs/modalites/documents. |
| Flux & social | [data-og7="opportunity-qna"] | OpportunityQnaComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-qna.component.html | ok | Onglets Q/R + composeur. |
| Flux & social | [data-og7="opportunity-context-aside"] | OpportunityContextAsideComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-context-aside.component.html | ok | Contexte temps reel. |
| Flux & social | [data-og7="opportunity-mini-map"] | OpportunityMiniMapComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-mini-map.component.html | ok | Mini-carte corridor. |
| Flux & social | [data-og7="opportunity-offer-drawer"] | OpportunityOfferDrawerComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-offer-drawer.component.html | ok | Drawer proposer une offre. |
| Flux & social | [data-og7="action"][data-og7-id="opportunity-make-offer"] | OpportunityDetailHeaderComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-detail-header.component.html | ok | CTA principal proposer une offre. |
| Flux & social | [data-og7="action"][data-og7-id="opportunity-offer-submit"] | OpportunityOfferDrawerComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-offer-drawer.component.html | ok | Soumission offre rapide. |
| Flux & social | [data-og7="opportunity-offer-field"]data-og7-id="capacity | start-date | end-date | pricing-model | comment | attachment"] | OpportunityOfferDrawerComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-offer-drawer.component.html | ok | Hooks de champs pour BLUEPRINT-OP-04 (proposer une offre). |
| Flux & social | [data-og7="action"][data-og7-id="opportunity-alert-open-*"] | OpportunityContextAsideComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-context-aside.component.html | ok | Ouverture d'une alerte liee depuis l'aside opportunite (BLUEPRINT-OP-08). |
| Flux & social | [data-og7="alert-detail-page"] | FeedAlertDetailPage | openg7-org/src/app/domains/feed/feature/pages/feed-alert-detail.page.html | ok | Conteneur detail alerte. |
| Flux & social | [data-og7="alert-detail-header"] | AlertDetailHeaderComponent | openg7-org/src/app/domains/feed/feature/components/alert-detail-header.component.html | ok | Header alerte sticky. |
| Flux & social | [data-og7="alert-detail-body"] | AlertDetailBodyComponent | openg7-org/src/app/domains/feed/feature/components/alert-detail-body.component.html | ok | Corps detail alerte (impact/zones/timeline/sources). |
| Flux & social | [data-og7="alert-context-aside"] | AlertContextAsideComponent | openg7-org/src/app/domains/feed/feature/components/alert-context-aside.component.html | ok | Aside alertes (indicateurs/lies/opportunites). |
| Flux & social | [data-og7="alert-indicators"] | AlertContextAsideComponent | openg7-org/src/app/domains/feed/feature/components/alert-context-aside.component.html | ok | Carte indicateurs pertinents cote alerte. |
| Flux & social | [data-og7="alert-related-alerts"] | AlertContextAsideComponent | openg7-org/src/app/domains/feed/feature/components/alert-context-aside.component.html | ok | Liste alertes liees. |
| Flux & social | [data-og7="alert-related-opportunities"] | AlertContextAsideComponent | openg7-org/src/app/domains/feed/feature/components/alert-context-aside.component.html | ok | Opportunites associees creees/suggerees. |
| Flux & social | [data-og7="action"][data-og7-id="alert-subscribe"] | AlertDetailHeaderComponent | openg7-org/src/app/domains/feed/feature/components/alert-detail-header.component.html | ok | CTA principal alertes: abonnement notifications. |
| Flux & social | [data-og7="action"][data-og7-id="alert-share"] | AlertDetailHeaderComponent | openg7-org/src/app/domains/feed/feature/components/alert-detail-header.component.html | ok | CTA partage alerte. |
| Flux & social | [data-og7="action"][data-og7-id="alert-report-update"] | AlertDetailHeaderComponent | openg7-org/src/app/domains/feed/feature/components/alert-detail-header.component.html | ok | CTA contribution utilisateur: signaler mise a jour. |
| Flux & social | [data-og7="action"][data-og7-id="alert-create-opportunity"] | AlertDetailHeaderComponent | openg7-org/src/app/domains/feed/feature/components/alert-detail-header.component.html | ok | CTA optionnel creation opportunite liee. |
| Flux & social | [data-og7="indicator-detail-page"] | FeedIndicatorDetailPage | openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.html | ok | Conteneur detail indicateur. |
| Flux & social | [data-og7="indicator-detail-header"] | IndicatorHeroComponent | openg7-org/src/app/domains/feed/feature/components/indicator-hero.component.html | ok | Header sticky indicateur avec breadcrumbs/actions/chips. |
| Flux & social | [data-og7="indicator-chart"] | IndicatorChartComponent | openg7-org/src/app/domains/feed/feature/components/indicator-chart.component.html | ok | Courbe principale (tooltip + resume a11y + vue tableau). |
| Flux & social | [data-og7="indicator-key-data"] | IndicatorKeyDataComponent | openg7-org/src/app/domains/feed/feature/components/indicator-key-data.component.html | ok | Carte prix actuel + facteurs d'augmentation. |
| Flux & social | [data-og7="indicator-stats-aside"] | IndicatorStatsAsideComponent | openg7-org/src/app/domains/feed/feature/components/indicator-stats-aside.component.html | ok | Bloc statistiques pertinents avec sparklines. |
| Flux & social | [data-og7="indicator-related-alerts"] | FeedIndicatorDetailPage | openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.html | ok | Liste alertes liees a l'indicateur. |
| Flux & social | [data-og7="indicator-related-opportunities"] | FeedIndicatorDetailPage | openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.html | ok | Liste opportunites associees a l'indicateur. |
| Flux & social | [data-og7="indicator-alert-drawer"] | IndicatorAlertDrawerComponent | openg7-org/src/app/domains/feed/feature/components/indicator-alert-drawer.component.html | ok | Drawer creation d'alerte depuis un indicateur. |
| Flux & social | [data-og7="action"][data-og7-id="indicator-subscribe"] | IndicatorHeroComponent | openg7-org/src/app/domains/feed/feature/components/indicator-hero.component.html | ok | CTA abonnement indicateur (toggle optimistic). |
| Flux & social | [data-og7="action"][data-og7-id="indicator-create-alert"] | IndicatorHeroComponent | openg7-org/src/app/domains/feed/feature/components/indicator-hero.component.html | ok | CTA ouverture drawer de creation d'alerte. |
| Flux & social | [data-og7="action"][data-og7-id="indicator-alert-submit"] | IndicatorAlertDrawerComponent | openg7-org/src/app/domains/feed/feature/components/indicator-alert-drawer.component.html | ok | Soumission rapide d'alerte sur seuil indicateur. |
| Flux & social | [data-og7="indicator-alert-field"]data-og7-id="threshold-direction | threshold-value | window | frequency | notify-delta | note"] | IndicatorAlertDrawerComponent | openg7-org/src/app/domains/feed/feature/components/indicator-alert-drawer.component.html | ok | Hooks de champs pour BLUEPRINT-OP-19 (creation d'alerte indicateur). |

### Convention de nommage (vérifiée)

- **Prefixes** : `data-og7="…"` pour les hooks de test, `data-og7-id` ou `data-og7-layer` pour les sous-éléments ; les selectors Angular restent préfixés `og7-` côté `@Component`.
- **Forme** : toujours en **kebab-case**, sans camelCase ni espaces. Les entrées récemment clôturées (`map-layer`, `map-tooltip`, `map-aria-live`, `search-box`) respectent cette règle et alignent leurs sous-clés (`flows|markers|highlight`) ou futures implémentations (omnibox) sur le même schéma.

## 1) Sélecteurs **HTML** (registre officiel)

> Liste **exhaustive** des sélecteurs stables à implémenter. Chaque entrée précise : le sélecteur, le composant Angular, le fichier, le rôle UX et les events.

### 1.1 — Layout & global

### Étape AGENTS

- ID: **AG-1.1**
- Portée: `front (Angular)`

### Description

Implémenter les composants et sélecteurs listés (app, site-header, announcement-bar, language-switch, search-box). Architecture signal-first, formulaires typés, i18n ngx-translate et Tailwind 4. Ajoutez les events déclarés et des tests E2E ciblant `[data-og7*]`.

- **App container**
  - Selector : `[data-og7="app"]`
  - Composant : `AppComponent`
  - Fichier : `openg7-org/src/app/app.component.ts`
  - Rôle : conteneur racine, shell SSR
- **En-tête (site-header)**
  - Selector : `[data-og7="site-header"]`
  - Composant : `SiteHeaderComponent` (standalone)
  - Fichier : `openg7-org/src/app/components/layout/site-header.component.ts`
  - Rôle : repères, langue, recherche, CTA “S’inscrire”
- **Barre d’annonce (announcement-bar)**
  - Selector : `[data-og7="announcement-bar"]`
  - Composant : `AnnouncementBarComponent`
  - Fichier : `openg7-org/src/app/components/layout/announcement-bar.component.ts`
- **Sélecteur de langue**
  - Selector : `[data-og7="language-switch"]`
  - Composant : `LanguageSwitchComponent`
  - Fichier : `openg7-org/src/app/components/i18n/language-switch.component.ts`
- **Boîte de recherche (omnibox)**
  - Selector : `[data-og7="search-box"]`
  - Composant : `SearchBoxComponent`
  - Fichier : `openg7-org/src/app/components/search/search-box.component.ts`
  - Events : `submit`, `input`

### 1.2 — Section Héros (Mission + Carte animée)

### Étape AGENTS

- ID: **AG-1.2**
- Portée: `front (Angular)`

### Description

Construire la section héros (hero, hero-copy, hero-ctas) avec les CTAs `[data-og7-id]` (view-sectors, pro-mode, register-company, preview). Respect SSR-safe et i18n.

- **Section héros**
  - Selector : `[data-og7="hero"]`
  - Composant : `HeroSectionComponent`
  - Fichier : `openg7-org/src/app/components/hero/hero-section.component.ts`
- **Copie héros**
  - Selector : `[data-og7="hero-copy"]`
  - Composant : `HeroCopyComponent`
  - Fichier : `openg7-org/src/app/components/hero/hero-copy.component.ts`
- **CTAs héros**
  - Selector : `[data-og7="hero-ctas"]`
  - Composant : `HeroCtasComponent`
  - Fichier : `openg7-org/src/app/components/hero/hero-ctas.component.ts`
  - Sous-actions (boutons) :
    - Voir secteurs : `[data-og7="action"] [data-og7-id="view-sectors"]`
    - Mode pro : `[data-og7="action"] [data-og7-id="pro-mode"]`
    - Prévisualiser : `[data-og7="action"] [data-og7-id="preview"]`

### 1.3 — Carte (Leaflet / jsVectorMap bridge)

### Étape AGENTS

- ID: **AG-1.3**
- Portée: `front (Angular)`

### Description

Intégrer la carte (Leaflet) et ses contrôles (basemap-toggle, zoom-control, legend, kpi-badges, sector-chips, layers, tooltip, aria-live). Handlers clavier et performance de rendu visées.

- **Carte de commerce**
  - Selector : `[data-og7="trade-map"]`
  - Composant : `HomeOpenlayersMapComponent`
  - Fichier : `openg7-org/src/app/domains/home/feature/home-map-section/home-openlayers-map.component.ts`
- **Basemap toggle**
  - Selector : `[data-og7="map-basemap-toggle"]`
  - Composant : `BasemapToggleComponent`
  - Fichier : `openg7-org/src/app/components/map/controls/basemap-toggle.component.ts`
- **Zoom control**
  - Selector : `[data-og7="map-zoom-control"]`
  - Composant : `ZoomControlComponent`
  - Fichier : `openg7-org/src/app/components/map/controls/zoom-control.component.ts`
- **Légende**
  - Selector : `[data-og7="map-legend"]`
  - Composant : `MapLegendComponent`
  - Fichier : `openg7-org/src/app/components/map/legend/map-legend.component.ts`
- **KPI badges**
  - Selector : `[data-og7="map-kpi-badges"]`
  - Composant : `MapKpiBadgesComponent`
  - Fichier : `openg7-org/src/app/components/map/kpi/map-kpi-badges.component.ts`
- **Chips secteurs**
  - Selector : `[data-og7="map-sector-chips"]`
  - Composant : `MapSectorChipsComponent`
  - Fichier : `openg7-org/src/app/components/map/filters/map-sector-chips.component.ts`
- **Bouton “plus” (chips)**
  - Selector : `[data-og7="map-sector-chips"] [data-og7-id="more"]`
- **Carte decisionnelle home**
  - Overlay : `[data-og7="map-overlay"]`
  - Rail secteurs : `[data-og7="map-sector-rail"]`
  - Pulse panel : `[data-og7="map-pulse-panel"]`
  - Toggle stats : `[data-og7="action"] [data-og7-id="map-toggle-stats"]`
  - Fiche corridor : `[data-og7="map-corridor-card"]`
  - Etat cinematic : `[data-og7="map-cinematic-status"]`
  - Etapes corridor : `[data-og7="map-corridor-beat"]`
  - Pont corridor vers feed : `[data-og7="map-corridor-downstream"]`
  - CTA feed corridor : `[data-og7="action"] [data-og7-id="map-open-corridor-feed"]`
  - Fiche hub : `[data-og7="map-hub-card"]`

### 1.4 — Filtres & résultats

### Étape AGENTS

- ID: **AG-1.4**
- Portée: `front (Angular)`

### Description

Implémenter la barre de filtres globaux, le mode Import/Export, le carousel de secteurs, la Mat-Table des entreprises et le drawer de détails. Synchroniser avec la carte et la recherche.

- **Filtres globaux**
  - Selector : `[data-og7="filters"]`
  - Composant : `GlobalFiltersComponent`
  - Fichier : `openg7-org/src/app/components/filters/global-filters.component.ts`
- **Filtre Import/Export**
  - Selector : `[data-og7="filters"] [data-og7-id="trade-mode"]`
- **Carousel secteurs**
  - Selector : `[data-og7="sector-carousel"]`
- **Tableau entreprises (Mat-Table)**
  - Selector : `[data-og7="company-table"]`
  - Composant : `CompanyTableComponent`
  - Fichier : `openg7-org/src/app/components/company/company-table.component.ts`
- **Détail entreprise (drawer)**
  - Selector : `[data-og7="company-detail"]`
  - Composant : `CompanyDetailComponent`
  - Fichier : `openg7-org/src/app/components/company/company-detail.component.ts`

### 1.5 — Comptes & accès

### Étape AGENTS

- ID: **AG-1.5**
- Portée: `front (Angular)`

### Description

Prototyper login/register/profile/access-denied avec formulaires réactifs typés, i18n et sélecteurs `[data-og7]`.

- **Login** : `[data-og7="auth-login"]` (formulaire)
- **Register** : `[data-og7="auth-register"]` (formulaire)
- **Profil utilisateur** : `[data-og7="user-profile"]`
- **Access denied** : `[data-og7="access-denied"]`

> ✅ **Règle** : Tout **nouveau widget/composant** doit ajouter son entrée au **registre des sélecteurs** ci‑dessus.

---

## Hooks complémentaires conservés

Ces hooks figuraient aussi dans les exemples de l’ancien guide; ils restent
dans le périmètre du validateur. Les exceptions historiques du script demeurent.

- `[data-og7-id="connections"]`
- `[data-og7-id="flows"]`
