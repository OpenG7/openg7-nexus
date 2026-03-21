# OpenG7 â€” Selectors Map (composants Angular)

Tous les composants sont **standalone**, **signal-first**, prÃªts i18n (`@ngx-translate`) et Tailwind.

## Registry des composants Angular (selectors officiels)

| CatÃ©gorie | Canonical selector | Current selector in code | Component class | File path | Status | Notes |
|-----------|--------------------|--------------------------|-----------------|-----------|--------|-------|
| Layout / nav / a11y | og7-shell-root | og7-shell-root | AppComponent | openg7-org/src/app/app.component.ts | ok | Bootstrap Angular sur le selector og7- prefixed. |
| Layout / nav / a11y | og7-site-header | og7-site-header | SiteHeaderComponent | openg7-org/src/app/shared/components/layout/site-header.component.ts | ok |  |
| Layout / nav / a11y | og7-notification-panel | og7-notification-panel | NotificationPanelComponent | openg7-org/src/app/shared/components/layout/notification-panel.component.ts | ok |  |
| Layout / nav / a11y | og7-under-construction-banner | og7-under-construction-banner | UnderConstructionBannerComponent | openg7-org/src/app/shared/components/layout/under-construction-banner.component.ts | ok |  |
| Layout / nav / a11y | og7-onboarding-flow | og7-onboarding-flow | Og7OnboardingFlowComponent | openg7-org/src/app/shared/components/layout/og7-onboarding-flow.component.ts | ok |  |
| Layout / nav / a11y | og7-modal-container | og7-modal-container | Og7ModalContainerComponent | openg7-org/src/app/core/ui/modal/og7-modal-container.component.ts | ok |  |
| ConformitÃ© & i18n / Auth | og7-i18n-language-switch | og7-i18n-language-switch | LanguageSwitchComponent | openg7-org/src/app/shared/components/i18n/language-switch.component.ts | ok | AlignÃ© sur le prÃ©fixe og7- (kebab-case). |
| ConformitÃ© & i18n / Auth | og7-compliance-checklist | og7-compliance-checklist | Og7ComplianceChecklistComponent | openg7-org/src/app/shared/components/connection/og7-compliance-checklist.component.ts | ok |  |
| ConformitÃ© & i18n / Auth | og7-social-auth-buttons | og7-social-auth-buttons | SocialAuthButtonsComponent | openg7-org/src/app/shared/components/auth/social-auth-buttons.component.ts | ok |  |
| ConformitÃ© & i18n / Auth | og7-subscription-plans | og7-subscription-plans | SubscriptionPlansComponent | openg7-org/src/app/shared/components/billing/subscription-plans.component.ts | ok |  |
| Commerce & entreprises | og7-company-registration-form | og7-company-registration-form | CompanyRegistrationFormComponent | openg7-org/src/app/company-registration-form/components/company-registration-form/company-registration-form.component.ts | ok |  |
| Commerce & entreprises | og7-companies-import-page | og7-companies-import-page | CompaniesImportPageComponent | openg7-org/src/app/import/companies-import-page/companies-import-page.component.ts | ok |  |
| Commerce & entreprises | og7-entreprise | og7-entreprise | Og7EntrepriseComponent | openg7-org/src/app/domains/enterprise/entreprise/og7-entreprise.component.ts | ok |  |
| Hero & marketing | og7-hero-section | og7-hero-section | HeroSectionComponent | openg7-org/src/app/shared/components/hero/hero-section/hero-section.component.ts | ok | Selector Angular alignÃ© (og7-hero-section). |
| Hero & marketing | og7-hero-copy | og7-hero-copy | HeroCopyComponent | openg7-org/src/app/shared/components/hero/hero-copy/hero-copy.component.ts | ok | Selector Angular alignÃ© (og7-hero-copy). |
| Hero & marketing | og7-hero-ctas | og7-hero-ctas | HeroCtasComponent | openg7-org/src/app/shared/components/hero/hero-ctas/hero-ctas.component.ts | ok | Selector Angular alignÃ© (og7-hero-ctas). |
| Hero & marketing | og7-hero-stats | og7-hero-stats | HeroStatsComponent | openg7-org/src/app/shared/components/hero/hero-stats/hero-stats.component.ts | ok |  |
| Hero & marketing | og7-home-hero-section | og7-home-hero-section | HomeHeroSectionComponent | openg7-org/src/app/domains/home/feature/home-hero-section/home-hero-section.component.ts | ok |  |
| Hero & marketing | og7-home-hero-galaxy | og7-home-hero-galaxy | HomeHeroGalaxyClientComponent | openg7-org/src/app/domains/home/feature/home-hero-section/home-hero-galaxy.client.component.ts | ok | Backdrop client-only (galaxy + globe). |
| Hero & marketing | og7-financing-banner | og7-financing-banner | Og7FinancingBannerComponent | openg7-org/src/app/shared/components/financing/og7-financing-banner.component.ts | ok |  |
| Hero & marketing | og7-cta-rail | og7-cta-rail | Og7CtaRailComponent | openg7-org/src/app/shared/components/cta/og7-cta-rail.component.ts | ok |  |
| Hero & marketing | og7-dual-qr-panel | og7-dual-qr-panel | Og7DualQrPanelComponent | openg7-org/src/app/shared/components/qr/og7-dual-qr-panel.component.ts | ok |  |
| Hero & marketing | og7-intro-billboard-content | og7-intro-billboard-content | Og7IntroBillboardContentComponent | openg7-org/src/app/domains/matchmaking/sections/og7-intro-billboard-content.component.ts | ok |  |
| Hero & marketing | og7-home-page | og7-home-page | Og7HomePageComponent | openg7-org/src/app/domains/home/pages/home/og7-home-page.component.ts | ok |  |
| Carte & data viz | og7-map-trade | og7-map-trade | TradeMapComponent | openg7-org/src/app/shared/components/map/trade-map.component.ts | ok | Selector Angular alignÃ© (og7-map-trade). |
| Carte & data viz | og7-map-basemap-toggle | og7-map-basemap-toggle | BasemapToggleComponent | openg7-org/src/app/shared/components/map/controls/basemap-toggle.component.ts | ok | Selector Angular alignÃ© (og7-map-basemap-toggle). |
| Carte & data viz | og7-map-zoom-control | og7-map-zoom-control | ZoomControlComponent | openg7-org/src/app/shared/components/map/controls/zoom-control.component.ts | ok | Selector Angular alignÃ© (og7-map-zoom-control). |
| Carte & data viz | og7-map-legend | og7-map-legend | MapLegendComponent | openg7-org/src/app/shared/components/map/legend/map-legend.component.ts | ok | Selector Angular alignÃ© (og7-map-legend). |
| Carte & data viz | og7-map-kpi-badges | og7-map-kpi-badges | MapKpiBadgesComponent | openg7-org/src/app/shared/components/map/kpi/map-kpi-badges.component.ts | ok | Selector Angular alignÃ© (og7-map-kpi-badges). |
| Carte & data viz | og7-map-sector-chips | og7-map-sector-chips | MapSectorChipsComponent | openg7-org/src/app/shared/components/map/filters/map-sector-chips.component.ts | ok | Selector Angular alignÃ© (og7-map-sector-chips). |
| Carte & data viz | og7-map-frame | og7-map-frame | Og7MapFrameComponent | openg7-org/src/app/shared/components/map-frame/og7-map-frame.component.ts | ok |  |
| Carte & data viz | og7-home-map-section | og7-home-map-section | HomeMapSectionComponent | openg7-org/src/app/domains/home/feature/home-map-section/home-map-section.component.ts | ok |  |
| Carte & data viz | og7-home-corridors-realtime | og7-home-corridors-realtime | HomeCorridorsRealtimeComponent | openg7-org/src/app/domains/home/feature/home-corridors-realtime/home-corridors-realtime.component.ts | ok |  |
| Carte & data viz | og7-importation-flow-map-panel | og7-importation-flow-map-panel | ImportationFlowMapPanelComponent | openg7-org/src/app/domains/importation/components/flow-map-panel/importation-flow-map-panel.component.ts | ok |  |
| Carte & data viz | og7-opportunity-mini-map | og7-opportunity-mini-map | OpportunityMiniMapComponent | openg7-org/src/app/domains/opportunities/opportunities/ui/opportunity-mini-map/opportunity-mini-map.component.ts | ok |  |
| Carte & data viz | og7-opportunity-radar | og7-opportunity-radar | OpportunityRadarComponent | openg7-org/src/app/domains/opportunities/opportunities/ui/opportunity-radar/opportunity-radar.component.ts | ok |  |
| Carte & data viz | og7-opportunity-subway | og7-opportunity-subway | OpportunitySubwayComponent | openg7-org/src/app/domains/opportunities/opportunities/ui/opportunity-subway/opportunity-subway.component.ts | ok |  |
| Recherche & filtres | og7-filters-toolbar | [data-og7="filters"] | GlobalFiltersComponent | openg7-org/src/app/shared/components/filters/global-filters.component.ts | ok | LivrÃ© via lâ€™attribut `[data-og7="filters"]`; pas de rename Angular supplÃ©mentaire prÃ©vu. |
| Recherche & filtres | og7-company-table | [data-og7="company-table"] | CompanyTableComponent | openg7-org/src/app/shared/components/company/company-table.component.ts | ok | Selector data-og7 dÃ©jÃ  exposÃ© en production. |
| Recherche & filtres | og7-company-detail | [data-og7="company-detail"] | CompanyDetailComponent | openg7-org/src/app/shared/components/company/company-detail.component.ts | ok | Selector data-og7 dÃ©jÃ  exposÃ© en production. |
| Recherche & filtres | og7-home-filters-section | og7-home-filters-section | HomeFiltersSectionComponent | openg7-org/src/app/domains/home/feature/home-filters-section/home-filters-section.component.ts | ok |  |
| Recherche & filtres | og7-search-field | og7-search-field | Og7SearchFieldComponent | openg7-org/src/app/shared/components/search/og7-search-field.component.ts | ok |  |
| Recherche & filtres | og7-quick-search-modal | og7-quick-search-modal | QuickSearchModalComponent | openg7-org/src/app/domains/search/feature/quick-search-modal/quick-search-modal.component.ts | ok |  |
| Recherche & filtres | og7-quick-search-result-item | og7-quick-search-result-item | QuickSearchResultItemComponent | openg7-org/src/app/domains/search/feature/quick-search-modal/quick-search-result-item.component.ts | ok |  |
| Recherche & filtres | og7-quick-search-section-skeleton | og7-quick-search-section-skeleton | QuickSearchSectionSkeletonComponent | openg7-org/src/app/domains/search/feature/quick-search-modal/quick-search-section-skeleton.component.ts | ok |  |
| Recherche & filtres | og7-scoreboard-pipeline | og7-scoreboard-pipeline | Og7ScoreboardPipelineComponent | openg7-org/src/app/shared/components/pipeline/og7-scoreboard-pipeline.component.ts | ok |  |
| Recherche & filtres | og7-filters-sector-carousel | og7-filters-sector-carousel | SectorCarouselComponent | openg7-org/src/app/shared/components/filters/sector-carousel.component.ts | ok | Selector Angular alignÃ© (og7-filters-sector-carousel). |
| Matchmaking & rÃ©seau | og7-matchmaking-introduction-message-editor | og7-matchmaking-introduction-message-editor | IntroductionMessageEditorComponent | openg7-org/src/app/domains/matchmaking/og7-mise-en-relation/components/introduction-message-editor.component.ts | ok | Selector Angular alignÃ© (og7- prefixed, kebab-case). |
| Matchmaking & rÃ©seau | og7-intro-stepper | og7-intro-stepper | Og7IntroStepperComponent | openg7-org/src/app/domains/matchmaking/og7-mise-en-relation/og7-intro-stepper.component.ts | ok |  |
| Matchmaking & rÃ©seau | og7-linkup-detail-page | og7-linkup-detail-page | Og7LinkupDetailPageComponent | openg7-org/src/app/domains/matchmaking/pages/linkup-detail/og7-linkup-detail-page.component.ts | ok |  |
| Matchmaking & rÃ©seau | og7-linkup-history-page | og7-linkup-history-page | Og7LinkupHistoryPageComponent | openg7-org/src/app/domains/matchmaking/pages/linkup-history/og7-linkup-history-page.component.ts | ok |  |
| Matchmaking & rÃ©seau | og7-linkup-page | og7-linkup-page | Og7LinkupPageComponent | openg7-org/src/app/domains/matchmaking/pages/linkup/og7-linkup-page.component.ts | ok |  |
| Matchmaking & rÃ©seau | og7-meeting-scheduler | og7-meeting-scheduler | Og7MeetingSchedulerComponent | openg7-org/src/app/shared/components/connection/og7-meeting-scheduler.component.ts | ok |  |
| Matchmaking & rÃ©seau | og7-partner-details-card | og7-partner-details-card | Og7PartnerDetailsCardComponent | openg7-org/src/app/shared/components/partner/og7-partner-details-card.component.ts | ok |  |
| Matchmaking & rÃ©seau | og7-partner-details-panel | og7-partner-details-panel | PartnerDetailsPanelComponent | openg7-org/src/app/shared/components/partner/partner-details-panel.component.ts | ok |  |
| Matchmaking & rÃ©seau | og7-partner-quick-actions | og7-partner-quick-actions | PartnerQuickActionsComponent | openg7-org/src/app/domains/partners/partners/ui/partner-quick-actions.component.ts | ok |  |
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
| OpportunitÃ©s & analytics | og7-opportunity-compact-kpi-list | og7-opportunity-compact-kpi-list | OpportunityCompactKpiListComponent | openg7-org/src/app/domains/opportunities/opportunities/ui/opportunity-compact-kpi-list/opportunity-compact-kpi-list.component.ts | ok |  |
| OpportunitÃ©s & analytics | og7-opportunity-impact-banner | og7-opportunity-impact-banner | OpportunityImpactBannerComponent | openg7-org/src/app/domains/opportunities/opportunities/ui/opportunity-impact-banner/opportunity-impact-banner.component.ts | ok |  |
| OpportunitÃ©s & analytics | og7-home-statistics-section | og7-home-statistics-section | HomeStatisticsSectionComponent | openg7-org/src/app/domains/home/feature/home-statistics-section/home-statistics-section.component.ts | ok |  |
| OpportunitÃ©s & analytics | og7-home-inputs-section | og7-home-inputs-section | HomeInputsSectionComponent | openg7-org/src/app/domains/home/feature/home-inputs-section/home-inputs-section.component.ts | ok |  |
| ConformitÃ© & i18n / Auth | og7-alerts-page | og7-alerts-page | AlertsPage | openg7-org/src/app/domains/account/pages/alerts.page.ts | ok | Inbox des alertes utilisateur connectÃ©. |

## Registry des sÃ©lecteurs [data-og7*] (hooks UI & tests)

| CatÃ©gorie | data-og7 / data-og7-id | Used in component | File path | Status | Notes |
|-----------|------------------------|-------------------|----------|--------|-------|
| Hooks gÃ©nÃ©riques | [data-og7="*"] | â€” | â€” | planned | Backlog (garde-fou global Ã  ajouter lors du prochain cycle E2E). |
| Hooks gÃ©nÃ©riques | [data-og7="action"] | HeroCtasComponent | openg7-org/src/app/shared/components/hero/hero-ctas.component.html | ok | UtilisÃ© pour tracer les CTA (data-og7="action"). |
| Layout / nav / a11y | [data-og7="app"] | AppComponent | openg7-org/src/app/app.component.ts | planned | Ã€ ajouter dans le template racine (actuel : data-og7="app-shell"). |
| Layout / nav / a11y | [data-og7="site-header"] | SiteHeaderComponent | openg7-org/src/app/shared/components/layout/site-header.component.html | ok | Hook dÃ©jÃ  appliquÃ© sur lâ€™en-tÃªte. |
| Layout / nav / a11y | [data-og7="announcement-bar"] | â€” | â€” | planned | Barre dâ€™annonce optionnelle (non implÃ©mentÃ©e). |
| ConformitÃ© & i18n / Auth | [data-og7="language-switch"] | LanguageSwitchComponent | openg7-org/src/app/shared/components/i18n/language-switch.component.html | ok | LivrÃ© via data-og7-id="language-switch" sur le composant. |
| ConformitÃ© & i18n / Auth | [data-og7="auth-login"] | LoginPage | openg7-org/src/app/domains/auth/pages/login.page.html | ok | PrÃ©sent sur la page de connexion. |
| ConformitÃ© & i18n / Auth | [data-og7="auth-register"] | RegisterPage | openg7-org/src/app/domains/auth/pages/register.page.html | ok | PrÃ©sent sur la page dâ€™inscription. |
| ConformitÃ© & i18n / Auth | [data-og7="access-denied"] | AccessDeniedPage | openg7-org/src/app/domains/auth/pages/access-denied.page.html | ok | PrÃ©sent sur la page dâ€™accÃ¨s refusÃ©. |
| ConformitÃ© & i18n / Auth | [data-og7="user-profile"] | ProfilePage | openg7-org/src/app/domains/account/pages/profile.page.html | ok | PrÃ©sent sur la page profil. |
| ConformitÃ© & i18n / Auth | [data-og7="user-profile-export-data"] | ProfilePage | openg7-org/src/app/domains/account/pages/profile.page.html | ok | Carte d'export des donnÃ©es du compte (JSON). |
| ConformitÃ© & i18n / Auth | [data-og7="user-profile-sessions"] | ProfilePage | openg7-org/src/app/domains/account/pages/profile.page.html | ok | Carte des sessions connectÃ©es et action â€œdÃ©connecter les autres appareilsâ€. |
| ConformitÃ© & i18n / Auth | [data-og7="user-alerts"] | AlertsPage | openg7-org/src/app/domains/account/pages/alerts.page.html | ok | Inbox des alertes utilisateur connecte. |
| Hero & marketing | [data-og7="hero"] | HeroSectionComponent | openg7-org/src/app/shared/components/hero/hero-section/hero-section.component.ts | ok | Selector actuel du composant. |
| Hero & marketing | [data-og7="hero-copy"] | HeroCopyComponent | openg7-org/src/app/shared/components/hero/hero-copy/hero-copy.component.ts | ok |  |
| Hero & marketing | [data-og7="hero-ctas"] | HeroCtasComponent | openg7-org/src/app/shared/components/hero/hero-ctas/hero-ctas.component.ts | ok |  |
| Hero & marketing | [data-og7="home-inputs"] | HomeInputsSectionComponent | openg7-org/src/app/domains/home/feature/home-inputs-section/home-inputs-section.component.ts | ok |  |
| Hero & marketing | [data-og7="announcement-bar"] | â€” | â€” | planned | Doublon volontaire pour lâ€™UI marketing (pas encore utilisÃ©). |
| Carte & data viz | [data-og7="trade-map"] | TradeMapComponent | openg7-org/src/app/shared/components/map/trade-map.component.ts | ok |  |
| Carte & data viz | [data-og7="map-basemap-toggle"] | BasemapToggleComponent | openg7-org/src/app/shared/components/map/controls/basemap-toggle.component.ts | ok |  |
| Carte & data viz | [data-og7="map-zoom-control"] | ZoomControlComponent | openg7-org/src/app/shared/components/map/controls/zoom-control.component.ts | ok |  |
| Carte & data viz | [data-og7="map-legend"] | MapLegendComponent | openg7-org/src/app/shared/components/map/legend/map-legend.component.ts | ok |  |
| Carte & data viz | [data-og7="map-kpi-badges"] | MapKpiBadgesComponent | openg7-org/src/app/shared/components/map/kpi/map-kpi-badges.component.ts | ok |  |
| Carte & data viz | [data-og7="map-sector-chips"] | MapSectorChipsComponent | openg7-org/src/app/shared/components/map/filters/map-sector-chips.component.ts | ok |  |
| Carte & data viz | [data-og7="map-layer"] | TradeMapComponent | openg7-org/src/app/shared/components/map/trade-map.component.html | ok | Kebab-case + suffixe explicite, couplÃ© Ã  `data-og7-layer="flows|markers|highlight"`. |
| Carte & data viz | [data-og7="map-tooltip"] | TradeMapComponent | openg7-org/src/app/shared/components/map/trade-map.component.html | ok | Kebab-case, alignÃ© sur le hook dâ€™instrumentation prÃ©vu pour la carte. |
| Carte & data viz | [data-og7="map-aria-live"] | TradeMapComponent | openg7-org/src/app/shared/components/map/trade-map.component.html | ok | Kebab-case + rÃ´le ARIA, conforme Ã  la convention. |
| Carte & data viz | [data-og7="corridors-realtime"] | HomeCorridorsRealtimeComponent | openg7-org/src/app/domains/home/feature/home-corridors-realtime/home-corridors-realtime.component.html | ok |  |
| Carte & data viz | [data-og7="corridors-realtime"] [data-og7-id="fullscreen"] | HomeCorridorsRealtimeComponent | openg7-org/src/app/domains/home/feature/home-corridors-realtime/home-corridors-realtime.component.html | ok |  |
| Carte & data viz | [data-og7="corridors-realtime"] [data-og7-id="view-map"] | HomeCorridorsRealtimeComponent | openg7-org/src/app/domains/home/feature/home-corridors-realtime/home-corridors-realtime.component.html | ok | CTA voir sur la carte (inactif pour l'instant). |
| Recherche & filtres | [data-og7="filters"][data-og7-id="filters-group"] | GlobalFiltersComponent | openg7-org/src/app/shared/components/filters/global-filters.component.ts | ok |  |
| Recherche & filtres | [data-og7="filters"][data-og7-id="sector-carousel"] | SectorCarouselComponent | openg7-org/src/app/shared/components/filters/sector-carousel.component.ts | ok |  |
| Recherche & filtres | [data-og7="search-box"] | SiteHeaderComponent | openg7-org/src/app/shared/components/layout/site-header.component.ts | planned | Nom en kebab-case alignÃ© sur la convention data-og7 ; sera branchÃ© avec lâ€™omnibox. |
| Layout / nav / a11y | [data-og7-id="alerts"] | SiteHeaderComponent | openg7-org/src/app/shared/components/layout/site-header/site-header.component.html | ok | Lien menu profil vers /alerts (desktop + mobile). |
| Commerce & entreprises | [data-og7="company-table"] | CompanyTableComponent | openg7-org/src/app/shared/components/company/company-table.component.ts | ok |  |
| Commerce & entreprises | [data-og7="company-detail"] | CompanyDetailComponent | openg7-org/src/app/shared/components/company/company-detail.component.ts | ok |  |
| Flux & social | [data-og7="opportunity-detail-page"] | FeedOpportunityDetailPage | openg7-org/src/app/domains/feed/feature/pages/feed-opportunity-detail.page.html | ok | Conteneur detail opportunite. |
| Flux & social | [data-og7="opportunity-detail-header"] | OpportunityDetailHeaderComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-detail-header.component.html | ok | Header sticky + actions detail. |
| Flux & social | [data-og7="opportunity-detail-body"] | OpportunityDetailBodyComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-detail-body.component.html | ok | Resume/specs/modalites/documents. |
| Flux & social | [data-og7="opportunity-qna"] | OpportunityQnaComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-qna.component.html | ok | Onglets Q/R + composeur. |
| Flux & social | [data-og7="opportunity-context-aside"] | OpportunityContextAsideComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-context-aside.component.html | ok | Contexte temps reel. |
| Flux & social | [data-og7="opportunity-mini-map"] | OpportunityMiniMapComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-mini-map.component.html | ok | Mini-carte corridor. |
| Flux & social | [data-og7="opportunity-offer-drawer"] | OpportunityOfferDrawerComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-offer-drawer.component.html | ok | Drawer proposer une offre. |
| Flux & social | [data-og7="action"][data-og7-id="opportunity-make-offer"] | OpportunityDetailHeaderComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-detail-header.component.html | ok | CTA principal proposer une offre. |
| Flux & social | [data-og7="action"][data-og7-id="opportunity-offer-submit"] | OpportunityOfferDrawerComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-offer-drawer.component.html | ok | Soumission offre rapide. |
| Flux & social | [data-og7="opportunity-offer-field"][data-og7-id="capacity|start-date|end-date|pricing-model|comment|attachment"] | OpportunityOfferDrawerComponent | openg7-org/src/app/domains/feed/feature/components/opportunity-offer-drawer.component.html | ok | Hooks de champs pour BLUEPRINT-OP-04 (proposer une offre). |
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
| Flux & social | [data-og7="indicator-alert-field"][data-og7-id="threshold-direction|threshold-value|window|frequency|notify-delta|note"] | IndicatorAlertDrawerComponent | openg7-org/src/app/domains/feed/feature/components/indicator-alert-drawer.component.html | ok | Hooks de champs pour BLUEPRINT-OP-19 (creation d'alerte indicateur). |

### Convention de nommage (vÃ©rifiÃ©e)

- **Prefixes** : `data-og7="â€¦"` pour les hooks de test, `data-og7-id` ou `data-og7-layer` pour les sous-Ã©lÃ©ments ; les selectors Angular restent prÃ©fixÃ©s `og7-` cÃ´tÃ© `@Component`.
- **Forme** : toujours en **kebab-case**, sans camelCase ni espaces. Les entrÃ©es rÃ©cemment clÃ´turÃ©es (`map-layer`, `map-tooltip`, `map-aria-live`, `search-box`) respectent cette rÃ¨gle et alignent leurs sous-clÃ©s (`flows|markers|highlight`) ou futures implÃ©mentations (omnibox) sur le mÃªme schÃ©ma.
## 1) SÃ©lecteurs **HTML** (registre officiel)
> Liste **exhaustive** des sÃ©lecteurs stables Ã  implÃ©menter. Chaque entrÃ©e prÃ©cise : le sÃ©lecteur, le composant Angular, le fichier, le rÃ´le UX et les events.

### 1.1 â€” Layout & global

### Ã‰tape AGENTS
- ID: **AG-1.1**
- PortÃ©e: `front (Angular)`

### Description
ImplÃ©menter les composants et sÃ©lecteurs listÃ©s (app, site-header, announcement-bar, language-switch, search-box). Architecture signal-first, formulaires typÃ©s, i18n ngx-translate et Tailwind 4. Ajoutez les events dÃ©clarÃ©s et des tests E2E ciblant `[data-og7*]`.

- **App container**  
  - Selector : `[data-og7="app"]`  
  - Composant : `AppComponent`  
  - Fichier : `openg7-org/src/app/app.component.ts`  
  - RÃ´le : conteneur racine, shell SSR
- **En-tÃªte (site-header)**  
  - Selector : `[data-og7="site-header"]`  
  - Composant : `SiteHeaderComponent` (standalone)  
  - Fichier : `openg7-org/src/app/components/layout/site-header.component.ts`  
  - RÃ´le : repÃ¨res, langue, recherche, CTA â€œSâ€™inscrireâ€
- **Barre dâ€™annonce (announcement-bar)**  
  - Selector : `[data-og7="announcement-bar"]`  
  - Composant : `AnnouncementBarComponent`  
  - Fichier : `openg7-org/src/app/components/layout/announcement-bar.component.ts`
- **SÃ©lecteur de langue**  
  - Selector : `[data-og7="language-switch"]`  
  - Composant : `LanguageSwitchComponent`  
  - Fichier : `openg7-org/src/app/components/i18n/language-switch.component.ts`
- **BoÃ®te de recherche (omnibox)**  
  - Selector : `[data-og7="search-box"]`  
  - Composant : `SearchBoxComponent`  
  - Fichier : `openg7-org/src/app/components/search/search-box.component.ts`  
  - Events : `submit`, `input`

### 1.2 â€” Section HÃ©ros (Mission + Carte animÃ©e)

### Ã‰tape AGENTS
- ID: **AG-1.2**
- PortÃ©e: `front (Angular)`

### Description
Construire la section hÃ©ros (hero, hero-copy, hero-ctas) avec les CTAs `[data-og7-id]` (view-sectors, pro-mode, register-company, preview). Respect SSR-safe et i18n.

- **Section hÃ©ros**  
  - Selector : `[data-og7="hero"]`  
  - Composant : `HeroSectionComponent`  
  - Fichier : `openg7-org/src/app/components/hero/hero-section.component.ts`
- **Copie hÃ©ros**  
  - Selector : `[data-og7="hero-copy"]`  
  - Composant : `HeroCopyComponent`  
  - Fichier : `openg7-org/src/app/components/hero/hero-copy.component.ts`
- **CTAs hÃ©ros**  
  - Selector : `[data-og7="hero-ctas"]`  
  - Composant : `HeroCtasComponent`  
  - Fichier : `openg7-org/src/app/components/hero/hero-ctas.component.ts`  
  - Sous-actions (boutons) :  
    - Voir secteurs : `[data-og7="action"] [data-og7-id="view-sectors"]`  
    - Mode pro : `[data-og7="action"] [data-og7-id="pro-mode"]`  
    - PrÃ©visualiser : `[data-og7="action"] [data-og7-id="preview"]`

### 1.3 â€” Carte (Leaflet / jsVectorMap bridge)

### Ã‰tape AGENTS
- ID: **AG-1.3**
- PortÃ©e: `front (Angular)`

### Description
IntÃ©grer la carte (Leaflet) et ses contrÃ´les (basemap-toggle, zoom-control, legend, kpi-badges, sector-chips, layers, tooltip, aria-live). Handlers clavier et performance de rendu visÃ©es.

- **Carte de commerce**  
  - Selector : `[data-og7="trade-map"]`  
  - Composant : `TradeMapComponent`  
  - Fichier : `openg7-org/src/app/components/map/trade-map.component.ts`
- **Basemap toggle**  
  - Selector : `[data-og7="map-basemap-toggle"]`  
  - Composant : `BasemapToggleComponent`  
  - Fichier : `openg7-org/src/app/components/map/controls/basemap-toggle.component.ts`
- **Zoom control**  
  - Selector : `[data-og7="map-zoom-control"]`  
  - Composant : `ZoomControlComponent`  
  - Fichier : `openg7-org/src/app/components/map/controls/zoom-control.component.ts`
- **LÃ©gende**  
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
- **Bouton â€œplusâ€ (chips)**  
  - Selector : `[data-og7="map-sector-chips"] [data-og7-id="more"]`
- **Couches / Layers**  
  - Ã‰changes : `[data-og7="map-layer"] [data-og7-id="flows"]`  
  - Marqueurs : `[data-og7="map-layer"] [data-og7-id="markers"]`  
  - Mise en Ã©vidence : `[data-og7="map-layer"] [data-og7-id="highlight"]`
- **Tooltip dynamique**  
  - Selector : `[data-og7="map-tooltip"]`
- **Zone ARIA live (a11y)**  
  - Selector : `[data-og7="map-aria-live"]`

### 1.4 â€” Filtres & rÃ©sultats

### Ã‰tape AGENTS
- ID: **AG-1.4**
- PortÃ©e: `front (Angular)`

### Description
ImplÃ©menter la barre de filtres globaux, le mode Import/Export, le carousel de secteurs, la Mat-Table des entreprises et le drawer de dÃ©tails. Synchroniser avec la carte et la recherche.

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
- **DÃ©tail entreprise (drawer)**  
  - Selector : `[data-og7="company-detail"]`  
  - Composant : `CompanyDetailComponent`  
  - Fichier : `openg7-org/src/app/components/company/company-detail.component.ts`

### 1.5 â€” Comptes & accÃ¨s

### Ã‰tape AGENTS
- ID: **AG-1.5**
- PortÃ©e: `front (Angular)`

### Description
Prototyper login/register/profile/access-denied avec formulaires rÃ©actifs typÃ©s, i18n et sÃ©lecteurs `[data-og7]`.

- **Login** : `[data-og7="auth-login"]` (formulaire)  
- **Register** : `[data-og7="auth-register"]` (formulaire)  
- **Profil utilisateur** : `[data-og7="user-profile"]`  
- **Access denied** : `[data-og7="access-denied"]`

> âœ… **RÃ¨gle** : Tout **nouveau widget/composant** doit ajouter son entrÃ©e au **registre des sÃ©lecteurs** ciâ€‘dessus.

---

## 2) SÃ©lecteurs **NgRx** (store selectors) â€” nomenclature

### Ã‰tape AGENTS
- ID: **AG-2**
- PortÃ©e: `front (Angular)`

### Description
Exposer les sÃ©lecteurs NgRx globaux (auth, user, catalog, map) dans `openg7-org/src/app/state/**`. Typage strict, tests unitaires basiques.

> Ã€ exposer via `selectXxx` dans des fichiers `*.selectors.ts`. Ã€ utiliser seulement pour lâ€™Ã©tat **global** (auth, user, catalogue, carte).

- **Auth** (`openg7-org/src/app/state/auth/`)
  - `selectAuthState`, `selectIsAuthenticated`, `selectUser`, `selectUserRoles`, `selectJwtExp`
- **User** (`openg7-org/src/app/state/user/`)
  - `selectUserProfile`, `selectUserPermissions`
- **Catalogue** (`openg7-org/src/app/state/catalog/`)
  - `selectSectors`, `selectProvinces`, `selectCompanies`, `selectCompanyById(id)`
- **Carte** (`openg7-org/src/app/state/map/`)
  - `selectMapReady`, `selectFilteredFlows`, `selectActiveSector`, `selectMapKpis`

---

## 3) Arborescence **accÃ¨s & sÃ©curitÃ©** (front Angular)

### Ã‰tape AGENTS
- ID: **AG-3**
- PortÃ©e: `front (Angular)`

### Description
CrÃ©er lâ€™arborescence `openg7-org/src/app/core/*` (auth, http, security, config). Fournir services et types partagÃ©s nÃ©cessaires aux Guards/Interceptors/Policies.

> CrÃ©er les fichiers et implÃ©menter la logique de sÃ©curitÃ© cÃ´tÃ© client.

```
openg7-org/src/app/
â”œâ”€ app.config.ts
â”œâ”€ app.routes.ts
â”œâ”€ core/
â”‚  â”œâ”€ auth/
â”‚  â”‚  â”œâ”€ auth.guard.ts
â”‚  â”‚  â”œâ”€ role.guard.ts
â”‚  â”‚  â”œâ”€ permissions.guard.ts
â”‚  â”‚  â”œâ”€ auth.service.ts
â”‚  â”‚  â”œâ”€ token-storage.service.ts
â”‚  â”‚  â”œâ”€ rbac.policy.ts
â”‚  â”‚  â””â”€ auth.types.ts
â”‚  â”œâ”€ http/
â”‚  â”‚  â”œâ”€ auth.interceptor.ts
â”‚  â”‚  â”œâ”€ csrf.interceptor.ts
â”‚  â”‚  â”œâ”€ error.interceptor.ts
â”‚  â”‚  â””â”€ http-options.ts
â”‚  â”œâ”€ security/
â”‚  â”‚  â”œâ”€ dom-sanitizer.service.ts
â”‚  â”‚  â”œâ”€ crypto.service.ts
â”‚  â”‚  â””â”€ anti-xss.util.ts
â”‚  â””â”€ config/
â”‚     â”œâ”€ environment.tokens.ts
â”‚     â””â”€ app.config.provider.ts
â”œâ”€ components/
â”‚  â”œâ”€ layout/
â”‚  â”‚  â”œâ”€ site-header.component.ts
â”‚  â”‚  â””â”€ announcement-bar.component.ts
â”‚  â”œâ”€ i18n/
â”‚  â”‚  â””â”€ language-switch.component.ts
â”‚  â”œâ”€ search/
â”‚  â”‚  â””â”€ search-box.component.ts
â”‚  â”œâ”€ hero/
â”‚  â”‚  â”œâ”€ hero-section.component.ts
â”‚  â”‚  â”œâ”€ hero-copy.component.ts
â”‚  â”‚  â””â”€ hero-ctas.component.ts
â”‚  â”œâ”€ map/
â”‚  â”‚  â”œâ”€ trade-map.component.ts
â”‚  â”‚  â”œâ”€ legend/map-legend.component.ts
â”‚  â”‚  â”œâ”€ kpi/map-kpi-badges.component.ts
â”‚  â”‚  â”œâ”€ filters/map-sector-chips.component.ts
â”‚  â”‚  â””â”€ controls/
â”‚  â”‚     â”œâ”€ basemap-toggle.component.ts
â”‚  â”‚     â””â”€ zoom-control.component.ts
â”‚  â””â”€ company/
â”‚     â”œâ”€ company-table.component.ts
â”‚     â””â”€ company-detail.component.ts
â”œâ”€ pages/
â”‚  â”œâ”€ home.page.ts
â”‚  â”œâ”€ login.page.ts
â”‚  â”œâ”€ register.page.ts
â”‚  â”œâ”€ profile.page.ts
â”‚  â””â”€ access-denied.page.ts
â”œâ”€ state/
â”‚  â”œâ”€ auth/
â”‚  â”‚  â”œâ”€ auth.actions.ts
â”‚  â”‚  â”œâ”€ auth.reducer.ts
â”‚  â”‚  â”œâ”€ auth.selectors.ts
â”‚  â”‚  â””â”€ auth.effects.ts
â”‚  â”œâ”€ user/
â”‚  â”‚  â”œâ”€ user.reducer.ts
â”‚  â”‚  â”œâ”€ user.selectors.ts
â”‚  â”‚  â””â”€ user.effects.ts
â”‚  â”œâ”€ catalog/
â”‚  â”‚  â”œâ”€ catalog.reducer.ts
â”‚  â”‚  â”œâ”€ catalog.selectors.ts
â”‚  â”‚  â””â”€ catalog.effects.ts
â”‚  â””â”€ map/
â”‚     â”œâ”€ map.reducer.ts
â”‚     â”œâ”€ map.selectors.ts
â”‚     â””â”€ map.effects.ts
â””â”€ assets/
   â””â”€ i18n/
      â”œâ”€ fr.json
      â””â”€ en.json
```

### 3.1 â€” Guards (exigences)

### Ã‰tape AGENTS
- ID: **AG-3.1**
- PortÃ©e: `front (Angular)`

### Description
ImplÃ©menter `auth.guard.ts`, `role.guard.ts`, `permissions.guard.ts` en `canMatch` + signals `isAllowedSig`/`reasonSig`. DÃ©mo route `/pro` protÃ©gÃ©e + tests.

- `auth.guard.ts` (**canMatch**) : bloque routes si non authentifiÃ©.
- `role.guard.ts` (**canMatch**) : exige un rÃ´le (`Admin`, `Pro`, `Basic`).
- `permissions.guard.ts` (**canMatch**) : exige des permissions (`catalog:write`, etc.).
- Tous les guards exposent des **signals** `isAllowedSig`, `reasonSig` pour lâ€™UI.

### 3.2 â€” Interceptors

### Ã‰tape AGENTS
- ID: **AG-3.2**
- PortÃ©e: `front (Angular)`

### Description
Ajouter `auth.interceptor.ts`, `csrf.interceptor.ts`, `error.interceptor.ts`. SSR-safe; logs dâ€™erreurs vers toast/observabilitÃ©.

- `auth.interceptor.ts` : ajoute `Authorization: Bearer <jwt>` si prÃ©sent (SSR-safe).  
- `csrf.interceptor.ts` : gÃ¨re le header CSRF (lecture cookie, `XSRF-TOKEN`).
- `error.interceptor.ts` : normalise erreurs, dÃ©clenche toasts/i18n.

### 3.3 â€” Services sÃ©curitÃ©

### Ã‰tape AGENTS
- ID: **AG-3.3**
- PortÃ©e: `front (Angular)`

### Description
Ajouter `token-storage.service.ts`, `rbac.policy.ts`, `crypto.service.ts`, `dom-sanitizer.service.ts`, `anti-xss.util.ts` (si requis). Codifier rÃ¨gles RBAC UI.

- `token-storage.service.ts` : stockage JWT (Web Crypto + `sessionStorage` par dÃ©faut, fallback `Memory`).  
- `rbac.policy.ts` : mappe rÃ´les â†’ permissions â†’ composants (feature flags UI).  
- `crypto.service.ts` : `SubtleCrypto` (encrypt/decrypt clÃ© dÃ©rivÃ©e).

---

## 4) Routage & SSR

### Ã‰tape AGENTS
- ID: **AG-4**
- PortÃ©e: `front (Angular)`

### Description
Configurer `app.routes.ts` (lazy routes + canMatch) et `app.config.ts` (HTTP_INTERCEPTORS, TranslateLoader, TransferState). Garantir lâ€™absence dâ€™accÃ¨s DOM au module-load.

- `openg7-org/src/app/app.routes.ts` : routes lazy, `canMatch` sur segments protÃ©gÃ©s.  
- `openg7-org/src/app/app.config.ts` : providers globaux (HTTP_INTERCEPTORS, TranslateLoader, TransferState).  
- SSR : **aucune** API `window` au module load ; tester `isPlatformBrowser` dans les effets/constructeurs si besoin.

---

## 5) Strapi â€” Seeds (fichiers & rÃ´les)

### Ã‰tape AGENTS
- ID: **AG-5**
- PortÃ©e: `cms (Strapi)`

### Description
Mettre en place les seeds idempotents (locales, rÃ´les/permissions, taxonomies, contenus de dÃ©mo, API tokens). `strapi/src/bootstrap.ts` appelle `runSeeds()` en dev.

> CÃ´tÃ© Strapi (v5+), on fournit une arbo et des scripts pour initialiser : **locales, rÃ´les/permissions, taxonomies, contenus initiaux, comptes**, tokens API.

```
strapi/
â”œâ”€ src/
â”‚  â”œâ”€ bootstrap.ts                # appelle runSeeds() en dev/intÃ©gration
â”‚  â”œâ”€ seed/
â”‚  â”‚  â”œâ”€ 00-locales.ts            # fr, en
â”‚  â”‚  â”œâ”€ 01-roles-permissions.ts  # Public, Authenticated, Pro, Admin (rules)
â”‚  â”‚  â”œâ”€ 02-admin-user.ts         # crÃ©ation admin initial (env guarded)
â”‚  â”‚  â”œâ”€ 03-taxonomies.ts         # provinces, territoires, secteurs
â”‚  â”‚  â”œâ”€ 04-homepage.ts           # mission, banniÃ¨res, CTAs (FR/EN)
â”‚  â”‚  â”œâ”€ 05-companies.ts          # entreprises de dÃ©mo (liens secteurs/provinces)
â”‚  â”‚  â”œâ”€ 06-exchanges.ts        # Ã©changes interprovinciaux (graph)
â”‚  â”‚  â”œâ”€ 07-feature-flags.ts      # flags UI (pro-mode etc.)
â”‚  â”‚  â”œâ”€ 08-api-tokens.ts         # tokens lecture seule (front)
â”‚  â”‚  â”œâ”€ 09-national-projects.ts  # projets nationaux de dÃ©mo
â”‚  â”‚  â”œâ”€ 10-company-permissions.ts # droits entreprise / import
â”‚  â”‚  â”œâ”€ 11-statistic-insights.ts # statistiques et insights
â”‚  â”‚  â”œâ”€ 12-company-countries.ts  # normalisation pays entreprise
â”‚  â”‚  â”œâ”€ 13-auth-settings.ts      # paramÃ¨tres users-permissions
â”‚  â”‚  â””â”€ 14-importation.ts        # watchlists, annotations, report schedules importation
â”‚  â””â”€ utils/seed-helpers.ts       # helpers: upsert, ensureRole, ensureLocale, etc.
â”œâ”€ config/
â”‚  â”œâ”€ plugins.ts                  # i18n, users-permissions, graphql (optionnel)
â”‚  â””â”€ env/development/...
â””â”€ package.json
```

### 5.1 â€” Principes de seed

### Ã‰tape AGENTS
- ID: **AG-5.1**
- PortÃ©e: `cms (Strapi)`

### Description
Sâ€™assurer de lâ€™idempotence (upsert par clÃ©), de la sÃ©curitÃ© en prod (gated via env), et de la localisation FR/EN pour tout contenu.

- **Idempotent** : rÃ©-exÃ©cuter sans doublons (utiliser `upsert` par clÃ©).  
- **SÃ©curisÃ©** : lâ€™admin initial et les tokens ne sâ€™Ã©crivent **jamais** en prod sans variables dâ€™environnement explicites (`SEED_ADMIN_ALLOWED="true"`).  
- **Localisable** : tout contenu textuel possÃ¨de `fr` & `en`.

### 5.2 â€” Variables dâ€™environnement Strapi (exigÃ©es)

### Ã‰tape AGENTS
- ID: **AG-5.2**
- PortÃ©e: `cms (Strapi)`

### Description
DÃ©finir `STRAPI_ADMIN_EMAIL/PASSWORD`, `STRAPI_SEED_ADMIN_ALLOWED`, `STRAPI_API_READONLY_TOKEN`. Ne jamais semer des secrets en prod par dÃ©faut.

```
STRAPI_ADMIN_EMAIL=contact@openg7.org
STRAPI_ADMIN_PASSWORD=<strong-password>
STRAPI_SEED_ADMIN_ALLOWED=true
STRAPI_API_READONLY_TOKEN=<generated-token>
```

### 5.3 â€” Commandes

### Ã‰tape AGENTS
- ID: **AG-5.3**
- PortÃ©e: `cms (Strapi)`

### Description
Documenter `yarn strapi develop` et `yarn seed:dev`. PrÃ©parer scripts node facultatifs pour relancer les seeds.

```
# depuis ./strapi
yarn strapi develop           # lance Strapi (bootstrap appelle les seeds)
yarn seed:dev                 # optionnel: script node pour forcer les seeds
```

---

## 6) Environnements Front

### Ã‰tape AGENTS
- ID: **AG-6**
- PortÃ©e: `front (Angular)`

### Description
Fournir `environment.tokens.ts` et `app.config.provider.ts` (lecture `window.__OG7_CONFIG__` cÃ´tÃ© browser, `process.env` cÃ´tÃ© SSR). Exposer `API_URL`, `I18N_PREFIX`, `FEATURE_FLAGS`.

`openg7-org/src/app/core/config/environment.tokens.ts` expose des **InjectionTokens** :  
- `API_URL` : URL de Strapi (ex.: `https://api.openg7.org`)  
- `I18N_PREFIX` : `/assets/i18n/`  
- `FEATURE_FLAGS` : dictionnaire typÃ© (pro-mode, experimental-map, etc.)

`app.config.provider.ts` lit `window.__OG7_CONFIG__` quand en **browser**, et `process.env.*` cÃ´tÃ© **SSR**.

---

## 7) Checklist pour Codex (exÃ©cuter dans cet ordre)

### Ã‰tape AGENTS
- ID: **AG-7**
- PortÃ©e: `front (Angular)`

### Description
Standardiser lâ€™ordre dâ€™exÃ©cution (arbo sÃ©curitÃ© â†’ composants â†’ signals â†’ NgRx â†’ i18n â†’ interceptors â†’ guards â†’ SSR â†’ seeds â†’ tests). Ã€ cocher avant merge.

1. **CrÃ©er** lâ€™arborescence dâ€™accÃ¨s & sÃ©curitÃ© (section 3) sous `openg7-org/src/app/...`.
2. **GÃ©nÃ©rer** les composants listÃ©s en 1) avec leurs **selectors HTML** respectifs.
3. **ImplÃ©menter** les **signals** locaux & formulaires typÃ©s dans chaque composant.
4. **Brancher** NgRx uniquement pour `auth`, `user`, `catalog`, `map` (selectors section 2).
5. **Configurer** i18n (loader HTTP, fichiers `fr.json` / `en.json`).
6. **Activer** les interceptors `auth`, `csrf`, `error`.
7. **ProtÃ©ger** les routes (`canMatch` + RBAC UI).
8. **Configurer** SSR (TransferState, aucun accÃ¨s direct Ã  `window`).
9. **CÃ´tÃ© Strapi** : crÃ©er les fichiers de **seed** (section 5), rendre les scripts **idempotents**.
10. **Valider l'artefact contrat** : commiter `packages/contracts/spec/openapi.json` aprÃ¨s tout changement de schÃ©ma (obligatoire avant la revue).
11. **PrÃ©parer les dÃ©ploiements** : exÃ©cuter `yarn predeploy:cms-cache` et `yarn prebuild:web` avec les variables d'environnement de la cible (prÃ©prod/prod) pour vÃ©rifier les caches CMS, les tokens read-only et les flags runtime.
12. **Ã‰crire** des tests rapides (E2E/ciblage via `data-og7*`).

---

## 8) Exemples (snippets) â€” *indicatifs*

### 8.1 â€” Route protÃ©gÃ©e (canMatch)
```ts
// openg7-org/src/app/app.routes.ts
import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { AuthGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home.page').then(m => m.HomePage),
  },
  {
    path: 'pro',
    canMatch: [() => inject(AuthGuard).canMatchRole('Pro')],
    loadComponent: () => import('./pages/pro.page').then(m => m.ProPage),
  },
];
```

### 8.2 â€” SÃ©lecteur HTML dans un composant
```ts
// openg7-org/src/app/components/map/controls/zoom-control.component.ts
@Component({
  selector: 'og7-map-zoom-control',
  standalone: true,
  template: `
    <div data-og7="map-zoom-control">
      <button type="button" data-og7="action" data-og7-id="zoom-in" (click)="zoomIn()">+</button>
      <button type="button" data-og7="action" data-og7-id="zoom-out" (click)="zoomOut()">-</button>
    </div>
  `
})
export class ZoomControlComponent {
  zoomLevelSig = signal(1);
  zoomIn = () => this.zoomLevelSig.update(v => Math.min(10, v + 1));
  zoomOut = () => this.zoomLevelSig.update(v => Math.max(1, v - 1));
}
```

### 8.3 â€” NgRx selector
```ts
// openg7-org/src/app/state/map/map.selectors.ts
export const selectMapState = createFeatureSelector<MapState>('map');
export const selectFilteredFlows = createSelector(
  selectMapState,
  s => s.filteredFlows
);
```

---

## 9) Foire aux dÃ©cisions (rappels Codex)
- **Signal-first** : pas dâ€™over-engineering NgRx ; prioriser des `signal()` locaux.
- **Selectors stables** : **pas** de classes Tailwind pour cibler ; toujours `data-og7*`.
- **SÃ©curitÃ©** : jamais stocker JWT en `localStorage` non chiffrÃ© ; prÃ©fÃ©rer `sessionStorage` + Web Crypto.
- **i18n** : aucun texte en dur ; tout passe par `TranslateService`.
- **SSR** : toute dÃ©pendance navigateur doit Ãªtre lazy/importÃ©e uniquement en browser.

---

> **Fin du gabarit** â€” Ã€ complÃ©ter au fil des features : toute nouvelle zone UI **ajoute** ses selectors & fichiers au prÃ©sent document.



---

# ðŸ”€ SÃ©paration Front (Angular) vs CMS (Strapi) â€” Contrat & responsabilitÃ©s

### Ã‰tape AGENTS
- ID: **AG-9**
- PortÃ©e: `front/cms`

### Description
Formaliser le contrat Front/CMS (endpoints, CORS, tokens RO). Toute PR qui change un schÃ©ma ou un endpoint doit mettre Ã  jour AGENTS.md et `@openg7/contracts`.


> **Pourquoi** : Ã©viter toute ambiguÃ¯tÃ© entre le **front Angular** (`openg7-org`) et le workspace Strapi officiel (`strapi`).
> **RÃ¨gle dâ€™or** : AGENTS.md est la **spec vivante** des deux projets ; un commit qui touche lâ€™un doit respecter le **contrat** ci-dessous.

## 1) Monorepo & chemins
```
/openG7/
  â”œâ”€ openg7-org/   # Front Angular 19 (openg7-org/src/app/...)
  â””â”€ strapi/       # Strapi v5+ contenu mÃ©tier (voir docs/strapi-workspaces.md)
```
- Chemins **front** documentÃ©s ici commencent par `openg7-org/src/app/...` (Angular).
- Chemins **CMS** documentÃ©s ici commencent par `strapi/...` (Strapi).

## 2) Contrat dâ€™API (read-only par dÃ©faut)
**Base URL** (dev) : `http://localhost:1337`
**Auth** : *API Token* (Strapi **Read-Only**) â†’ `Authorization: Bearer <token>`
Le contrat OpenAPI est versionnÃ© dans `packages/contracts/spec/openapi.json`.

| Ressource        | Endpoint (GET)                 | Query params conseillÃ©s           | Notes                               |
|------------------|--------------------------------|-----------------------------------|-------------------------------------|
| Secteurs         | `/api/sectors`                 | `?pagination[page]=1&pagination[pageSize]=100` | tri cÃ´tÃ© front si nÃ©cessaire         |
| Provinces        | `/api/provinces`               | idem                              |                                     |
| Entreprises      | `/api/companies`               | `?filters[sector][id][$in]=...`   | filtrage cÃ´tÃ© Strapi                 |
| Ã‰changes       | `/api/exchanges`             | `?filters[sourceProvince][id]=...`| graph dâ€™Ã©changes                     |
| Homepage         | `/api/homepage`                | `?populate=deep`                  | *SingleType*                         |
| Import flows     | `/api/import-flows`            | `?period=month&originScope=usmca&originCodes=US&hsSections=85` | agrÃ©gats de flux importation |
| Import commodities | `/api/import-commodities`    | `?period=month&originScope=g7&hsSections=85` | top, Ã©mergents et lignes Ã  risque |
| Import risk flags | `/api/import-risk-flags`      | `?originScope=g7&hsSections=85`   | flags produits calculÃ©s Ã  partir des commoditÃ©s |
| Import suppliers | `/api/import-suppliers`        | `?originScope=indo_pacific`       | fournisseurs filtrÃ©s par scope/origine |
| Import knowledge | `/api/import-knowledge`        | `?lang=fr`                        | contenus knowledge / playbooks importation |
| Import annotations | `/api/import-annotations`    | â€”                                | annotations collaboratives persistÃ©es |
| Import watchlists | `/api/import-watchlists`      | GET / POST / PUT JSON             | watchlists importation persistÃ©es |
| Import report schedule | `/api/import-reports/schedule` | POST JSON (`period`, `recipients`, `format`, `frequency`, `notes`) | planification de rapports importation |

**Shape de rÃ©ponse (par dÃ©faut Strapi v4/v5)** :  
```json
{ "data": [ /* ou objet */ ], "meta": { "pagination": { /* ... */ } } }
```

## 3) Variables dâ€™environnement (mapping)
**Front (Angular)** â€” `openg7-org/src/app/core/config/environment.tokens.ts` :  
- `API_URL` â†’ ex. `http://localhost:1337`
- `API_TOKEN` â†’ *Read-Only Token* (dev uniquement)

**CMS (Strapi)** â€” `strapi/.env` :
- `HOST=0.0.0.0`, `PORT=1337`
- `STRAPI_API_READONLY_TOKEN=<token>`
- `CORS_ORIGIN=http://localhost:4200`
- (auto-gÃ©nÃ©rÃ©es au 1er boot) `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `JWT_SECRET`
- En prod : configurez la base de donnÃ©es, Redis et les CORS.

## 4) CORS & sÃ©curitÃ©
- **Strapi** `config/middlewares.ts` autorise les origines via `CORS_ORIGIN` (`http://localhost:4200` en dev).
- **Front** : ne **stocke pas** de JWT long terme ; privilÃ©gier **API Token RO** ou endpoints *Public*.
- **RBAC** : rÃ¨gles UI (masquage) cÃ´tÃ© Angular **â‰ ** permissions Strapi (serveur). Toujours restreindre cÃ´tÃ© Strapi.

## 5) ResponsabilitÃ©s (Do / Donâ€™t)
| Sujet | Front (Angular) | CMS (Strapi) |
|---|---|---|
| i18n | Affichage & clÃ©s `fr/en` (`src/assets/i18n/*.json`) | Contenus Ã©ditoriaux multilingues |
| Filtrage simple | OK (client) | RecommandÃ© si volumÃ©trie (via `filters[...]`) |
| Auth UI (guards) | **canMatch**, masquage RBAC UI | **RÃ´les/permissions** & sÃ©curitÃ© API |
| Graph / KPI | Calcul lÃ©ger client | AgrÃ©gations lourdes (future extension) |
| Seeds | Mocks front pour dev offline | **`strapi/src/seed/*.ts`** (idempotents) |

## 6) Processus dev (local)
- **CMS Strapi** : `yarn dev:cms` (ou `cd strapi && yarn strapi develop`) â†’ admin `:1337/admin`
- **Front** : `cd openg7-org && yarn start` â†’ app `:4200`  
- Docker : voir `docker-compose.dev.yml` Ã  la racine.

## 7) DÃ©finition de prÃªt (Ready) / fini (Done)
- **Ready** : endpoints Strapi et schÃ©mas `schema.json` listÃ©s dans AGENTS.md **existent**, CORS OK, token RO gÃ©nÃ©rÃ©.  
- **Done** (front) : composants signal-first + sÃ©lecteurs `[data-og7*]` prÃ©sents, clÃ©s i18n crÃ©Ã©es, tests Playwright verts.  
- **Done** (CMS) : seeds rejouables, permissions dÃ©finies, collections renseignÃ©es (au moins 3 enregistrements dÃ©mo).

## 8) Check de cohÃ©rence (script)
Ajouter `packages/tooling/bin/validate-api.mjs` pour vÃ©rifier la reachability des endpoints dÃ©clarÃ©s :
```js
// packages/tooling/bin/validate-api.mjs
import fetch from 'node-fetch';
const base = process.env.OG7_API_URL || 'http://localhost:1337';
const token = process.env.OG7_API_TOKEN || '';
const headers = token ? { Authorization: `Bearer ${token}` } : {};
const endpoints = ['/api/sectors','/api/provinces','/api/companies','/api/exchanges','/api/homepage','/api/import-flows','/api/import-commodities','/api/import-risk-flags','/api/import-suppliers','/api/import-knowledge','/api/import-annotations','/api/import-watchlists'];
const errs = [];
for (const e of endpoints) { const r = await fetch(base+e, { headers }); if (!r.ok) errs.push(`${e} -> HTTP ${r.status}`); }
if (errs.length) { console.error('API KO:\n'+errs.join('\n')); process.exit(1); }
console.log('API OK');
```
`package.json` : `"validate:api": "node packages/tooling/bin/validate-api.mjs"` (Ã  brancher en CI) ou `"validate:api": "yarn workspace @openg7/tooling validate:api"` si le script est ajoutÃ© dans ce workspace.

---
_MAJ : 2025-09-12 15:35:46Z_


---

## ðŸ“š Glossaire â€” Termes clÃ©s

### CSRF (Crossâ€‘Site Request Forgery)
Attaque oÃ¹ un site tiers tente de **forcer** une requÃªte authentifiÃ©e Ã  votre insu.
- **Pertinent surtout si lâ€™auth passe par cookies**. Avec **API Token** (Bearer) en front, le risque est fortement rÃ©duit.
- **Front (Angular)** : un `csrf.interceptor.ts` ajoute un header de jeton uniquement pour les mÃ©thodes **POST/PUT/PATCH/DELETE** et **mÃªmeâ€‘origine**.
  ```ts
  // openg7-org/src/app/core/http/csrf.interceptor.ts
  import {{ HttpInterceptorFn }} from '@angular/common/http';
  import {{ inject }} from '@angular/core';
  const READ = new Set(['GET','HEAD','OPTIONS']);
  function readCookie(name: string): string | null {{
    return document.cookie.split('; ').find(c => c.startsWith(name+'='))?.split('=')[1] ?? null;
  }}
  export const csrfInterceptor: HttpInterceptorFn = (req, next) => {{
    if (typeof window !== 'undefined' && !READ.has(req.method.toUpperCase()) && req.url.startsWith(location.origin)) {{
      const token = readCookie('XSRF-TOKEN');
      if (token) req = req.clone({{ setHeaders: {{ 'X-XSRF-TOKEN': token }} }});
    }}
    return next(req);
  }};
  ```
- **CMS (Strapi)** : API **stateless** (CORS + tokens). Si vous servez le **panel admin** sur le mÃªme domaine et utilisez des cookies,
  activez une protection CSRF au niveau reverse proxy (ou middleware dÃ©diÃ©).

### RBAC (Roleâ€‘Based Access Control)
ContrÃ´le dâ€™accÃ¨s basÃ© sur les **rÃ´les**.
- **Front (Angular)** : `rbac.policy.ts` mappe **rÃ´les â†’ permissions â†’ composants/routes**.  
  Les **guards** `canMatch` bloquent les routes ; lâ€™UI masque les CTA non autorisÃ©s (feature flags).
- **CMS (Strapi)** : dÃ©finir les **rÃ´les** et **permissions** (plugin *users-permissions*) et limiter les **API tokens** (readâ€‘only par dÃ©faut).
- **Rappel** : le RBAC **UI** ne remplace **jamais** la restriction cÃ´tÃ© **API**.

---

## ðŸ” Notes de migration â€œconnexions â†’ (UI) Ã‰changes / (code) flowsâ€
- **Composant** : `<og7-map-connection-layer>` â†’ `<og7-map-flows-layer>` ; fichier `openg7-org/src/app/components/map/map-flows-layer.component.ts`.
- **SÃ©lecteurs HTML** : `[data-og7-id="connections"]` â†’ `[data-og7-id="flows"]`.
- **NgRx** : `selectFilteredConnections` â†’ `selectFilteredFlows` ; `filteredConnections` â†’ `filteredFlows`.
- **Seeds Strapi** : `06-exchanges.ts` (remplace lâ€™ancien `06-connections.ts`).
- **API** : `/api/exchanges` devient la route de rÃ©fÃ©rence (alias `/api/connections` tolÃ©rÃ© le temps de migrer).

_MAJ automatique : 2025-09-10 13:45:21Z_

---

## Strapi â€” Fichiers JSON chargÃ©s (schÃ©mas & composants)

### Ã‰tape AGENTS
- ID: **AG-10**
- PortÃ©e: `cms (Strapi)`

### Description
CrÃ©er/valider les schÃ©mas `schema.json` (province, sector, company, exchange, homepage) et composants JSON. Commiter la structure source.


```txt
strapi/
â””â”€ src/
   â”œâ”€ api/
   â”‚  â”œâ”€ province/
   â”‚  â”‚  â””â”€ content-types/province/schema.json
   â”‚  â”œâ”€ sector/
   â”‚  â”‚  â””â”€ content-types/sector/schema.json
   â”‚  â”œâ”€ company/
   â”‚  â”‚  â””â”€ content-types/company/schema.json
   â”‚  â”œâ”€ exchange/
   â”‚  â”‚  â””â”€ content-types/exchange/schema.json
   â”‚  â””â”€ homepage/
   â”‚     â””â”€ content-types/homepage/schema.json   # SingleType
   â””â”€ components/
      â”œâ”€ navigation/
      â”‚  â”œâ”€ header.json
      â”‚  â”œâ”€ menu-link.json
      â”‚  â”œâ”€ cta-button.json
      â”‚  â”œâ”€ announcement-bar.json
      â”‚  â”œâ”€ search-config.json
      â”‚  â””â”€ search-suggestion.json
      â”œâ”€ i18n/
      â”‚  â””â”€ language.json
      â”œâ”€ sections/
      â”‚  â”œâ”€ hero.json
      â”‚  â”œâ”€ filters.json
      â”‚  â”œâ”€ directory.json
      â”‚  â”œâ”€ insights.json
      â”‚  â”œâ”€ onboarding.json
      â”‚  â”œâ”€ news.json
      â”‚  â””â”€ trust.json
      â”œâ”€ map/
      â”‚  â”œâ”€ map-theme.json
      â”‚  â””â”€ legend-item.json
      â”œâ”€ insights/
      â”‚  â””â”€ kpi-config.json
      â”œâ”€ directory/
      â”‚  â”œâ”€ table-config.json
      â”‚  â””â”€ drawer-config.json
      â”œâ”€ branding/
      â”‚  â””â”€ logo.json
      â””â”€ seo/
         â””â”€ seo.json
```

---

## SÃ©curitÃ© front â€” CSP & Trusted Types (prod)

### Ã‰tape AGENTS
- ID: **AG-11**
- PortÃ©e: `front (Angular)`

### Description
DÃ©finir CSP minimale et activer Trusted Types en prod. VÃ©rifier SSR-safe et `DomSanitizer` pour HTML dynamique.


**Objectif :** Mitiger les XSS/CSRF cÃ´tÃ© front, formaliser une politique **CSP** minimale et activer **Trusted Types**.

**CSP (exemple minimal Ã  adapter par environnement)** :
```
default-src 'self';
script-src 'self' 'report-sample';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://api.openg7.org http://localhost:1337;
base-uri 'self';
frame-ancestors 'none';
report-uri /csp-report;
```

**Trusted Types** (idÃ©alement via en-tÃªte HTTP) :
```
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types angular angular#bundler;
```

**Rappels Angular** :
- Aucune API DOM au module-load (SSR-safe) ; utiliser `isPlatformBrowser`.
- Pour lâ€™HTML dynamique : `DomSanitizer` + pipes/`[innerHTML]` strictement encadrÃ©s.
- Ne pas utiliser les classes Tailwind comme hooks de test (uniquement `[data-og7*]`).

---

## Validation automatique des sÃ©lecteurs `[data-og7*]`

### Ã‰tape AGENTS
- ID: **AG-12**
- PortÃ©e: `front (Angular)`

### Description
Ajouter le script `@openg7/tooling:validate-selectors` et workflow CI pour vÃ©rifier la prÃ©sence de tous les sÃ©lecteurs `[data-og7*]` dÃ©clarÃ©s dans AGENTS.md.


Ajoutez le script suivant et branchez-le en CI pour garantir que **tous** les sÃ©lecteurs dÃ©clarÃ©s dans `AGENTS.md` existent rÃ©ellement dans le code.

**Fichier** : `packages/tooling/bin/validate-selectors.mjs`
```js
// packages/tooling/bin/validate-selectors.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..', '..');
const agentsPath = resolve(repoRoot, 'AGENTS.md');
const appDir = resolve(repoRoot, 'openg7-org', 'src', 'app');

function readAll(dir) {
  const items = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      items.push(...readAll(fullPath));
    } else if (['.ts', '.html', '.json'].includes(extname(fullPath))) {
      items.push([fullPath, readFileSync(fullPath, 'utf8')]);
    }
  }
  return items;
}

function loadSelectors(markdown) {
  const og7Matches = [...markdown.matchAll(/\[data-og7="([\w-]+)"\]/g)].map(match => match[1]);
  const og7IdMatches = [...markdown.matchAll(/\[data-og7-id="([\w-]+)"\]/g)].map(match => match[1]);

  const uniqueOg7 = new Set(og7Matches);
  const uniqueOg7Ids = new Set(og7IdMatches.filter(id => !['connections', 'more'].includes(id)));

  return {
    og7: Array.from(uniqueOg7),
    og7Ids: Array.from(uniqueOg7Ids),
  };
}

function attributeExists(files, attribute, value) {
  const needle = `${attribute}="${value}"`;
  return files.some(([, contents]) => contents.includes(needle));
}

const markdown = readFileSync(agentsPath, 'utf8');
const { og7, og7Ids } = loadSelectors(markdown);
const files = readAll(appDir);
const missing = [];

for (const selector of og7) {
  if (!attributeExists(files, 'data-og7', selector)) {
    missing.push(`data-og7="${selector}"`);
  }
}

for (const selector of og7Ids) {
  if (!attributeExists(files, 'data-og7-id', selector) && !attributeExists(files, 'data-og7-layer', selector)) {
    missing.push(`data-og7-id="${selector}"`);
  }
}

if (missing.length) {
  console.error('SÃ©lecteurs manquants dans openg7-org/src/app:\n- ' + missing.join('\n- '));
  process.exit(1);
}

console.log('OK: tous les sÃ©lecteurs dâ€™AGENTS.md existent dans le code.');
```

**CI GitHub** : `.github/workflows/ci-validate.yml`
```yaml
name: Validate Agents

on:
  pull_request:
  push:
    branches: [ main ]

jobs:
  validate-selectors:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci || yarn install --frozen-lockfile
      - run: yarn workspace @openg7/tooling validate:selectors

  validate-api:
    runs-on: ubuntu-latest
    if: ${{ github.event_name == 'pull_request' }} # facultatif
    env:
      OG7_API_URL: http://localhost:1337
      OG7_API_TOKEN: ${{ secrets.OG7_API_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci || yarn install --frozen-lockfile
      - run: node tools/validate-api.mjs
```

---

## ðŸ“¦ Paquet partagÃ© â€” `@openg7/contracts` (workspaces)

### Ã‰tape AGENTS
- ID: **AG-13**
- PortÃ©e: `shared (workspaces)`

### Description
Initialiser `packages/contracts` avec gÃ©nÃ©ration de types via OpenAPI. Publier localement en workspace et consommer cÃ´tÃ© Angular/Strapi.


> Objectif : centraliser **les types TypeScript** Strapi (et Ã©ventuellement un petit **catalogue dâ€™endpoints**) dans un **package workspace** partagÃ© entre `strapi` et `openg7-org`.

### Arbo monorepo (workspaces)
```
/openG7/
  â”œâ”€ openg7-org/            # Front Angular 19 (openg7-org/src/app/...)
  â”œâ”€ strapi/                # Strapi v5 officiel (strapi/src/...)
  â””â”€ packages/
     â””â”€ contracts/          # <= @openg7/contracts
```

### `package.json` (racine)
```json
{
  "name": "openg7",
  "private": true,
  "workspaces": ["openg7-org", "strapi", "packages/*"],
  "scripts": {
    "dev:web": "yarn --cwd openg7-org start",
    "dev:cms": "yarn workspace @openg7/strapi dev",
    "dev:all": "concurrently \"yarn dev:cms\" \"yarn dev:web\"",
    "codegen": "yarn --cwd packages/contracts run codegen"
  }
}
```

### `packages/contracts/package.json`
```json
{
  "name": "@openg7/contracts",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "clean": "rimraf dist",
    "build": "tsc -p tsconfig.json",
    "codegen:rest": "openapi-typescript spec/openapi.json -o src/strapi.rest.d.ts",
    "codegen": "yarn codegen:rest",
    "prepublishOnly": "yarn clean && yarn codegen && yarn build"
  },
  "devDependencies": {
    "typescript": "^5.6.2",
    "rimraf": "^6.0.1",
    "openapi-typescript": "^7.0.0"
  }
}
```

### `packages/contracts/tsconfig.json`
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "declaration": true,
    "emitDeclarationOnly": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

### `packages/contracts/src/index.ts`
```ts
// Types gÃ©nÃ©rÃ©s par openapi-typescript
import type { paths, components } from './strapi.rest';

// Types de haut niveau (facultatif)
export type Province = components['schemas']['Province'];
export type Sector   = components['schemas']['Sector'];
export type Company  = components['schemas']['Company'];
export type Exchange = components['schemas']['Exchange'];

// RÃ©ponses Strapi usuelles
export type StrapiList<T>   = { data: T[]; meta: { pagination?: unknown } };
export type StrapiSingle<T> = { data: T;  meta?: unknown };

// Endpoints documentÃ©s
export const endpoints = {
  sectors:   '/api/sectors',
  provinces: '/api/provinces',
  companies: '/api/companies',
  exchanges: '/api/exchanges',
  homepage:  '/api/homepage'
} as const;
```

### GÃ©nÃ©ration des types
1. Exporter le **OpenAPI JSON** de Strapi (plugin docs) âžœ `packages/contracts/spec/openapi.json`  
2. Lancer : `yarn workspace @openg7/contracts codegen && yarn workspace @openg7/contracts build`

### Consommation cÃ´tÃ© Angular (`openg7-org`)
**openg7-org/package.json**
```json
{
  "dependencies": {
    "@openg7/contracts": "workspace:*"
  }
}
```

**openg7-org/src/app/core/api/strapi-client.ts**
```ts
import { inject, Injectable, signal } from '@angular/core';
import { API_URL, API_TOKEN } from 'openg7-org/src/app/core/config/environment.tokens';
import type { StrapiList, Province, Sector, Company, Exchange } from '@openg7/contracts';
import { endpoints } from '@openg7/contracts';

@Injectable({ providedIn: 'root' })
export class StrapiClient {
  private readonly api = inject(API_URL);
  private readonly token = inject(API_TOKEN);
  readonly loading = signal(false);

  private headers(): HeadersInit {
    const h: HeadersInit = {};
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  async get<T>(path: string): Promise<T> {
    this.loading.set(true);
    try {
      const res = await fetch(`${this.api}${path}`, { headers: this.headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<T>;
    } finally { this.loading.set(false); }
  }

  sectors()   { return this.get<StrapiList<Sector>>(endpoints.sectors); }
  provinces() { return this.get<StrapiList<Province>>(endpoints.provinces); }
  companies() { return this.get<StrapiList<Company>>(endpoints.companies); }
  exchanges() { return this.get<StrapiList<Exchange>>(endpoints.exchanges); }
}
```

> **CI** : ajouter une Ã©tape â€œcontractsâ€ avant le build front :  
> `yarn workspace @openg7/contracts codegen && yarn workspace @openg7/contracts build`

_MAJ (sections workspaces & contracts) : 2025-09-10 20:26:33Z_


---

# âœ… NFR â€” Budgets & critÃ¨res dâ€™acceptation (OpenG7)

| Domaine | Cible / RÃ¨gle | Comment vÃ©rifier |
|---|---|---|
| **Perf (Web Vitals)** | LCP â‰¤ **2.5s**, CLS â‰¤ **0.1**, INP â‰¤ **200ms** | Lighthouse CI, Web Vitals (`openg7-org/src/app/core/observability/metrics.service.ts`) |
| **Carte (flows)** | â‰¥ **40 fps** desktop, filtrage local â‰¤ **200ms**, rendu initial â‰¤ **1.5s** | Profiler navigateur, logs perf personnalisÃ©s |
| **AccessibilitÃ©** | WCAG 2.1 AA : focus visible, aria-live carte, **focus trap** drawer | Playwright + axe (tests E2E) |
| **SÃ©curitÃ©** | **CSP** + **Trusted Types** activÃ©s en prod ; **CSRF** cÃ´tÃ© mÃªme-origine ; **RBAC** API strict | En-tÃªtes HTTP, tests dâ€™intÃ©gration API |
| **QualitÃ© donnÃ©es** | Slugs **uniques**, enums validÃ©s, relations cardinalitÃ© dÃ©finie | Validation Strapi + scripts seed |
| **ObservabilitÃ©** | Sentry front+cms, Web Vitals Ã©chantillonnÃ©s | Dashboards Sentry + logs |

---

# SSR & accÃ¨s DOM (Angular â€” `openg7-org`)

- **RÃ¨gle** : *Aucun accÃ¨s DOM* (window/document) **au module-load**. Toujours vÃ©rifier lâ€™environnement.

**openg7-org/src/app/core/utils/is-browser.ts**
```ts
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}
```

Utiliser `isBrowser()` dans les services/composants qui manipulent le DOM ou `localStorage`.

---

# StrapiClient â€” cache TTL + retry/backoff (signal-first)

**openg7-org/src/app/core/api/strapi-client.ts** (ajouts proposÃ©s)
```ts
// ...imports existants
@Injectable({ providedIn: 'root' })
export class StrapiClient {
  // ...propriÃ©tÃ©s existantes
  private cache = new Map<string, { t: number; v: unknown }>();
  private ttlMs = 60_000; // 60s

  async get<T>(path: string): Promise<T> {
    const key = path;
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && now - hit.t < this.ttlMs) return hit.v as T;

    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${this.api}${path}`, { headers: this.headers() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as T;
        this.cache.set(key, { t: now, v: json });
        return json;
      } catch (e) {
        lastErr = e;
        await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Network error');
  }
}
```

---

# Feature Flags front (cache local + invalidation)

**openg7-org/src/app/core/feature-flags/feature-flags.service.ts**
```ts
import { inject, Injectable, signal } from '@angular/core';
import { API_URL } from 'openg7-org/src/app/core/config/environment.tokens';
import { isBrowser } from 'openg7-org/src/app/core/utils/is-browser';

type Flags = Record<string, boolean>;
const KEY = 'og7:flags:v1'; // bump version pour invalider

@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  private readonly api = inject(API_URL);
  readonly flags = signal<Flags>({});

  async load(): Promise<void> {
    if (isBrowser()) {
      const cached = localStorage.getItem(KEY);
      if (cached) { this.flags.set(JSON.parse(cached)); return; }
    }
    const res = await fetch(`${this.api}/api/feature-flags`);
    if (!res.ok) return;
    const data = await res.json() as { data: { key: string; enabled: boolean }[] };
    const f = Object.fromEntries(data.data.map(d => [d.key, d.enabled]));
    this.flags.set(f);
    if (isBrowser()) localStorage.setItem(KEY, JSON.stringify(f));
  }

  isOn(k: string): boolean { return !!this.flags()[k]; }
}
```

---

# A11y â€” Carte & Drawer (clavier, aria-live, focus)

- **Carte** : les contrÃ´les doivent Ãªtres focusables (tabindex), **flÃ¨ches** = zoom, `Enter` = activer.  
- **Drawer** : trap focus + retour focus Ã  lâ€™Ã©lÃ©ment dÃ©clencheur.

**openg7-org/src/app/components/company/company-detail.component.ts** (extrait focus)
```ts
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';

@Component({ standalone: true, selector: 'og7-company-detail', templateUrl: './company-detail.component.html' })
export class CompanyDetailComponent implements AfterViewInit, OnDestroy {
  @ViewChild('closeBtn', { static: true }) closeBtn!: ElementRef<HTMLButtonElement>;
  private opener: HTMLElement | null = null;

  openFrom(el: HTMLElement) { this.opener = el; /* ...ouvrir... */ }

  ngAfterViewInit() { queueMicrotask(() => this.closeBtn.nativeElement.focus()); }
  ngOnDestroy() { this.opener?.focus(); }
}
```

**openg7-org/src/app/components/map/controls/zoom-control.component.ts** (handlers clavier)
```ts
onKey(e: KeyboardEvent, dir: 'in'|'out') {
  if (e.key === 'Enter' || e.key === ' ') this.zoom(dir);
  if (e.key === 'ArrowUp') this.zoom('in');
  if (e.key === 'ArrowDown') this.zoom('out');
}
```

---

# Strapi â€” SchÃ©mas : contraintes & index

**strapi/src/api/exchange/content-types/exchange/schema.json** (exemple)
```json
{
  "kind": "collectionType",
  "collectionName": "exchanges",
  "info": { "singularName": "exchange", "pluralName": "exchanges", "displayName": "Exchange" },
  "options": { "draftAndPublish": true },
  "attributes": {
    "slug": { "type": "uid", "targetField": "title", "required": true, "unique": true },
    "title": { "type": "string", "minLength": 3, "required": true },
    "sourceProvince": { "type": "relation", "relation": "oneToOne", "target": "api::province.province" },
    "targetProvince": { "type": "relation", "relation": "oneToOne", "target": "api::province.province" },
    "sector": { "type": "relation", "relation": "manyToOne", "target": "api::sector.sector" },
    "value": { "type": "decimal", "min": 0 },
    "unit": { "type": "enumeration", "enum": ["bbl", "MWh", "CAD", "people"], "default": "CAD" },
    "privateNote": { "type": "text", "private": true }
  }
}
```

---

# Seeds Strapi â€” helpers idempotents & locales

**strapi/src/utils/seed-helpers.ts**
```ts
export async function upsertByUID<T extends { slug?: string }>(uid: string, data: T): Promise<void> {
  const svc = strapi.entityService;
  const where = data.slug ? { slug: data.slug } : { title: (data as any)['title'] };
  const existing = await svc.findMany(uid, { filters: where });
  if (existing?.length) await svc.update(uid, existing[0].id, { data });
  else await svc.create(uid, { data });
}

export async function ensureLocale(code: 'fr'|'en') {
  const list = await strapi.plugin('i18n').service('locales').list();
  if (!list.find((l: any) => l.code === code)) {
    await strapi.plugin('i18n').service('locales').create({ code, name: code.toUpperCase() });
  }
}
```

**strapi/src/seed/06-exchanges.ts** (usage)
```ts
import { upsertByUID, ensureLocale } from '../utils/seed-helpers';
export default async () => {
  await ensureLocale('fr');
  await upsertByUID('api::exchange.exchange', { slug: 'ab-to-bc-oil', title: 'AB â†’ BC Oil', value: 100, unit: 'bbl' });
};
```

---

# Preview drafts (Strapi â†’ Angular)

**Route custom**  
- **CMS** : `GET /api/homepage/preview?secret=<token>` (Settings â†’ API Tokens â€œPreviewâ€).  
- **Front** : page `/preview/homepage` qui appelle lâ€™endpoint avec le token.

**strapi/src/api/homepage/routes/homepage.ts**
```ts
export default {
  routes: [
    { method: 'GET', path: '/homepage/preview', handler: 'homepage.preview', config: { auth: false } }
  ]
};
```

**strapi/src/api/homepage/controllers/homepage.ts**
```ts
export default ({ strapi }) => ({
  async preview(ctx) {
    const secret = ctx.request.query.secret;
    if (secret !== process.env.PREVIEW_TOKEN) return ctx.unauthorized();
    const data = await strapi.entityService.findMany('api::homepage.homepage', { publicationState: 'preview', populate: 'deep' });
    ctx.body = { data };
  }
});
```

**openg7-org/src/app/pages/preview.page.ts** (front)
```ts
// Appel fetch sur /api/homepage/preview avec token (via API_URL), affichage sections sans cache
```

---

# Recherche (option Meilisearch/OpenSearch)

- Ajouter un index **companies** et **exchanges**, synchro via **lifecycles**.

**strapi/src/api/company/content-types/company/lifecycles.ts**
```ts
export default {
  async afterCreate(event) { await indexCompany(event.result); },
  async afterUpdate(event) { await indexCompany(event.result); },
  async afterDelete(event) { await deleteCompany(event.result); }
};
```

---

# Contrat versionnÃ© â€” `@openg7/contracts`

- **Snapshot** : commiter `packages/contracts/spec/openapi.json` Ã  chaque changement de schÃ©ma.  
- **CI** : Ã©tape `codegen && build` avant le build front.  
- **Semver** : bump mineur en ajout, majeur si breaking (champs supprimÃ©s/renommÃ©s).

---

# Tests de contrat (front)

**openg7-org/src/app/core/api/strapi-client.spec.ts**
```ts
import { StrapiClient } from './strapi-client';

it('exchanges shape minimal', async () => {
  const api = new StrapiClient();
  const res = await api.exchanges();
  const item = res.data[0];
  expect(item).toHaveProperty('sourceProvince');
  expect(item).toHaveProperty('targetProvince');
  expect(item).toHaveProperty('value');
});
```

---

# RBAC â€” mapping UI / API

| RÃ´le (UI) | Permissions Strapi (API) | VisibilitÃ© UI (exemples) |
|---|---|---|
| **Visiteur** | Public: GET `/api/sectors`, `/api/provinces`, `/api/companies`, `/api/exchanges`, `/api/homepage`, `/api/import-flows`, `/api/import-commodities`, `/api/import-risk-flags`, `/api/import-suppliers`, `/api/import-knowledge`, `/api/import-annotations`, `/api/import-watchlists` ; POST `/api/import-watchlists`, `/api/import-reports/schedule` | Voir la carte, filtres, table et hub importation (read-only + collaboration locale/persistÃ©e) |
| **Ã‰diteur** | Authenticated: POST/PUT/PATCH sur `company`, `homepage` | Boutons â€œÃ‰diterâ€ visibles ; gardÃ©s par `canMatchRole('editor')` |
| **Admin** | Tous droits + settings | AccÃ¨s admin-only (flags, seeds manuels) |

**Rappel** : le **RBAC UI** ne remplace pas les **permissions Strapi**. Toujours restreindre cÃ´tÃ© CMS.

---

# CSP report (prod)

- Activer `report-uri /csp-report` cÃ´tÃ© reverse-proxy.  
- En dev, *mock* possible : endpoint SSR qui logge les rapports.

---

# Carte â€” lignes directrices performance (flows)

- â‰¤ **10k** arÃªtes : rendu Canvas/GL direct OK ; > **10k** : tuiles **MVT** (vector tiles).
- Simplifier les gÃ©omÃ©tries au-delÃ  dâ€™un zoom donnÃ© ; paginer les â€œcompaniesâ€ visibles.
- AC : 40 fps desktop, 30 fps laptop milieu de gamme ; filtrage â‰¤ 200 ms.

---

## 8) Tests & validations locales (Angular + Strapi)

### Ã‰tape AGENTS
- ID: **AG-8**
- PortÃ©e: `repo complet`

### Description
ExÃ©cuter systÃ©matiquement les scripts de validation **avant** dâ€™ouvrir une PR. Ils verrouillent les selectors, la gÃ©nÃ©ration des contrats et lâ€™Ã©tat des seeds Strapi. Utiliser les commandes suivantes depuis la racine :

1. `yarn lint` â€” lint global (`eslint.config.mjs`, TS strict).
2. `yarn format:check` â€” vÃ©rifier que Prettier nâ€™a rien Ã  reformater (Ã©vite les diffs inutiles).
3. `yarn validate:selectors` â€” sâ€™assure que les sÃ©lecteurs `[data-og7="*"]` dÃ©clarÃ©s ci-dessus sont synchronisÃ©s avec le tooling.
4. `yarn codegen && yarn test` â€” met Ã  jour `packages/contracts` puis exÃ©cute les tests gÃ©nÃ©rÃ©s.
5. `yarn predeploy:cms-cache` â€” rejoue les seeds Strapi localement pour garantir lâ€™idempotence.
6. `yarn prebuild:web` â€” build SSR + tests front (prÃ©requis Ã  `build:web`).


7. `yarn test:e2e:smoke` - valider le parcours critique E2E quand la PR touche une surface utilisateur ou un flux de navigation principal.

Pour les validations de release ou avant un push preprod :

8. `yarn predeploy:preprod` - execute les checks de preproduction puis le garde-fou E2E smoke.
9. `yarn predeploy:preprod:full` - execute les memes checks puis toute la suite E2E Playwright.

> Tout echec doit etre corrige **avant commit**. Documentez les ecarts (ex.: seeds conditionnels) directement dans la PR.

_MAJ (enhanced) : 2026-03-14 00:00:00Z_

### Recommandation shell (builds)

- Pour lancer les commandes de build (`yarn build`, `npm run build`, `ng build`), privilegier **Bash** (Git Bash / WSL) plutot que PowerShell.
- Raison : sur certains postes Windows, `npm.ps1` peut etre bloque par `ExecutionPolicy`, ce qui casse les builds en PowerShell.
- Si vous restez en PowerShell, utilisez un contournement explicite (`cmd /c npm ...`) ou ajustez la policy localement selon vos regles de securite.

## BLUEPRINT - Operations UI Feed (tuile -> page detail)

- `BLUEPRINT-OP-01` Ouvrir le flux Feed : clic gauche sur le menu principal `Feed` -> verifier la route `/feed` et le stream des tuiles.
- `BLUEPRINT-OP-02` Ouvrir un detail Opportunite depuis une tuile : clic gauche sur une tuile de type opportunite (ex. `Short-term import of 300 MW`) -> verifier la route `/feed/opportunities/:id`.
- `BLUEPRINT-OP-03` Revenir de la page detail Opportunite vers la liste Feed : clic gauche sur le breadcrumb `Feed` dans le header sticky -> verifier retour `/feed`.
- `BLUEPRINT-OP-04` Proposer une offre depuis une Opportunite : clic gauche sur `Proposer une offre` -> dans le drawer, clic gauche dans chaque champ (`capacite`, `periode`, `prix/modalite`, `commentaire`, `piece jointe`) -> clic gauche sur `Envoyer`.
- `BLUEPRINT-OP-05` Enregistrer une Opportunite : clic gauche sur `Enregistrer` dans le header detail -> verifier changement d etat visuel (saved/sync).
- `BLUEPRINT-OP-06` Partager une Opportunite : clic gauche sur `Partager` dans le header detail -> verifier ouverture du share natif ou copie lien.
- `BLUEPRINT-OP-07` Changer d onglet Q/R sur Opportunite : clic gauche sur `Questions` ou `Offres recues` ou `Historique` -> verifier le contenu associe.
- `BLUEPRINT-OP-08` Ouvrir une alerte liee depuis l aside Opportunite : clic gauche sur une entree `Alerte` de la colonne droite -> verifier la route `/feed/alerts/:id`.
- `BLUEPRINT-OP-09` Ouvrir un detail Alerte depuis une tuile : clic gauche sur une tuile de type alerte (ex. `Ice storm risk on Ontario transmission lines`) -> verifier la route `/feed/alerts/:id`.
- `BLUEPRINT-OP-10` S abonner a une Alerte : clic gauche sur `S abonner` dans le header detail alerte -> verifier etat subscribed.
- `BLUEPRINT-OP-11` Partager une Alerte : clic gauche sur `Partager` -> verifier ouverture du share natif ou copie lien.
- `BLUEPRINT-OP-12` Signaler une mise a jour sur Alerte : clic gauche sur `Signaler une mise a jour` -> verifier retour d etat utilisateur.
- `BLUEPRINT-OP-13` Creer une opportunite liee depuis une Alerte : clic gauche sur `Creer une opportunite liee` (si visible) -> verifier navigation vers `/feed` avec query params pre-remplis.
- `BLUEPRINT-OP-14` Ouvrir une opportunite associee depuis l aside Alerte : clic gauche sur une entree de la carte `Opportunites associees` -> verifier `/feed/opportunities/:id`.
- `BLUEPRINT-OP-15` Ouvrir un detail Indicateur depuis une tuile : clic gauche sur une tuile de type indicateur (ex. `Spot electricity price up 12 percent`) -> verifier `/feed/indicators/:id`.
- `BLUEPRINT-OP-16` Changer la fenetre temporelle d un indicateur : clic gauche sur une chip `24h`, `72h` ou `7d` -> verifier rerender du chart.
- `BLUEPRINT-OP-17` Changer la granularite d un indicateur : clic gauche sur la chip/controle de granularite (`hour`, `15m`, `day`) -> verifier rerender serie.
- `BLUEPRINT-OP-18` S abonner a un indicateur : clic gauche sur `S abonner` dans le hero indicateur -> verifier etat subscribed.
- `BLUEPRINT-OP-19` Creer une alerte depuis un indicateur : clic gauche sur `Creer une alerte` -> dans le drawer, clic gauche sur les champs (`seuil`, `fenetre`, `frequence`) -> clic gauche sur `Creer/Envoyer`.
- `BLUEPRINT-OP-20` Ouvrir une alerte liee depuis la liste associee indicateur : clic gauche sur une entree `Alertes liees` -> verifier `/feed/alerts/:id`.
- `BLUEPRINT-OP-21` Ouvrir une opportunite liee depuis la liste associee indicateur : clic gauche sur une entree `Opportunites associees` -> verifier `/feed/opportunities/:id`.
- `BLUEPRINT-OP-22` Utiliser le fallback detail par id si la collection feed est indisponible : saisir directement une URL detail (`/feed/alerts/:id`, `/feed/opportunities/:id`, `/feed/indicators/:id`) dans la barre d adresse + Entrer -> verifier chargement du detail sans passer par la liste.

## BLUEPRINT Traceability Matrix (Tests)

| BLUEPRINT | Coverage | Specs |
|-----------|----------|-------|
| `BLUEPRINT-OP-01` | Feed open + stream hydration | `openg7-org/src/app/domains/feed/feature/feed.page.spec.ts` |
| `BLUEPRINT-OP-02` | Tile -> opportunity detail route | `openg7-org/src/app/domains/feed/feature/feed.page.spec.ts` |
| `BLUEPRINT-OP-03` | Opportunity breadcrumb -> `/feed` | `openg7-org/src/app/domains/feed/feature/components/opportunity-detail-header.component.spec.ts` |
| `BLUEPRINT-OP-04` | Offer drawer fields + submit flow | `openg7-org/src/app/domains/feed/feature/components/opportunity-offer-drawer.component.spec.ts`, `openg7-org/src/app/domains/feed/feature/pages/feed-opportunity-detail.page.spec.ts` |
| `BLUEPRINT-OP-05` | Opportunity save state toggle | `openg7-org/src/app/domains/feed/feature/pages/feed-opportunity-detail.page.spec.ts` |
| `BLUEPRINT-OP-06` | Opportunity share action | `openg7-org/src/app/domains/feed/feature/pages/feed-opportunity-detail.page.spec.ts` |
| `BLUEPRINT-OP-07` | Q/R tabs + reply submit | `openg7-org/src/app/domains/feed/feature/components/opportunity-qna.component.spec.ts`, `openg7-org/src/app/domains/feed/feature/pages/feed-opportunity-detail.page.spec.ts` |
| `BLUEPRINT-OP-08` | Opportunity aside alert -> alert detail | `openg7-org/src/app/domains/feed/feature/components/opportunity-context-aside.component.spec.ts`, `openg7-org/src/app/domains/feed/feature/pages/feed-opportunity-detail.page.spec.ts` |
| `BLUEPRINT-OP-09` | Tile -> alert detail route | `openg7-org/src/app/domains/feed/feature/feed.page.spec.ts` |
| `BLUEPRINT-OP-10` | Alert subscribe toggle | `openg7-org/src/app/domains/feed/feature/pages/feed-alert-detail.page.spec.ts` |
| `BLUEPRINT-OP-11` | Alert share action | `openg7-org/src/app/domains/feed/feature/pages/feed-alert-detail.page.spec.ts` |
| `BLUEPRINT-OP-12` | Alert report update action | `openg7-org/src/app/domains/feed/feature/pages/feed-alert-detail.page.spec.ts` |
| `BLUEPRINT-OP-13` | Create linked opportunity query params | `openg7-org/src/app/domains/feed/feature/pages/feed-alert-detail.page.spec.ts` |
| `BLUEPRINT-OP-14` | Alert aside opportunity -> detail | `openg7-org/src/app/domains/feed/feature/pages/feed-alert-detail.page.spec.ts` |
| `BLUEPRINT-OP-15` | Tile -> indicator detail route | `openg7-org/src/app/domains/feed/feature/feed.page.spec.ts` |
| `BLUEPRINT-OP-16` | Indicator timeframe change -> rerender | `openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.spec.ts` |
| `BLUEPRINT-OP-17` | Indicator granularity change -> rerender | `openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.spec.ts` |
| `BLUEPRINT-OP-18` | Indicator subscribe action/state | `openg7-org/src/app/domains/feed/feature/components/indicator-hero.component.spec.ts`, `openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.spec.ts` |
| `BLUEPRINT-OP-19` | Indicator create alert drawer + mapped publish + retry | `openg7-org/src/app/domains/feed/feature/components/indicator-alert-drawer.component.spec.ts`, `openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.spec.ts`, `openg7-org/src/app/domains/feed/feature/components/indicator-hero.component.spec.ts` |
| `BLUEPRINT-OP-20` | Indicator related alert -> detail | `openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.spec.ts` |
| `BLUEPRINT-OP-21` | Indicator related opportunity -> detail | `openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.spec.ts` |
| `BLUEPRINT-OP-22` | Direct URL fallback by id (opportunity/alert/indicator) | `openg7-org/src/app/domains/feed/feature/pages/feed-opportunity-detail.page.spec.ts`, `openg7-org/src/app/domains/feed/feature/pages/feed-alert-detail.page.spec.ts`, `openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.spec.ts` |

## BLUEPRINT Data Outputs (mission-aligned)

### AS-IS - Proprietes expediÃ©es aujourd hui

- `GET /api/feed/:id` : `id` (path param).
- `GET /api/feed` : `cursor`, `fromProvince`, `toProvince`, `sector`, `type`, `mode`, `sort`, `q`.
- `POST /api/feed` : `type`, `title`, `summary`, `sectorId`, `fromProvinceId`, `toProvinceId`, `mode`, `quantity.value`, `quantity.unit`, `tags`.
- `BLUEPRINT-OP-19` (creer une alerte depuis un indicateur) publie via `POST /api/feed` avec mapping : `type=ALERT`, `title`, `summary`, `sectorId`, `fromProvinceId`, `toProvinceId`, `mode`, `tags`.
- Header HTTP : `Idempotency-Key` (publication feed).
- Navigation router (query params) : `type`, `mode`, `sector`, `fromProvince`, `toProvince`, `q`.
- `BLUEPRINT-OP-13` (creer opportunite liee depuis alerte) : `draftSource`, `draftAlertId`, `draftType`, `draftMode`, `draftSectorId`, `draftFromProvinceId`, `draftToProvinceId`, `draftTitle`, `draftSummary`, `draftTags`.
- Share Web API : `title`, `text`, `url`.
- Clipboard fallback : `url`.
- Analytics feed (dataLayer/custom event) : `event`, `itemId`, `type`, `source`, `reason`, `count`, `cursor`.
- Analytics endpoint (si configure) : `event`, `detail`, `priority`, `timestamp`.
- Notification webhook/email (si active) : `notification.id`, `notification.type`, `notification.title`, `notification.message`, `notification.source`, `notification.createdAt`, `notification.metadata`, `recipient`.
- Events UI locaux (non persistes backend) :
- `OpportunityOfferPayload` : `capacityMw`, `startDate`, `endDate`, `pricingModel`, `comment`, `attachmentName`.
- `IndicatorAlertDraft` : `thresholdDirection`, `thresholdValue`, `window`, `frequency`, `notifyDelta`, `note`.
- Q/R opportunite : `content` (soumis localement).

### TO-BE - Proprietes a ajouter pour couvrir totalement mission + blueprints

- Persister la soumission d offre opportunite :
- `opportunityId`, `capacityMw`, `startDate`, `endDate`, `pricingModel`, `comment`, `attachmentId`, `attachmentName`, `submittedAt`.
- Durcir la persistance de creation d alerte indicateur (au-dela du mapping `POST /api/feed`) :
- `indicatorId`, `thresholdDirection`, `thresholdValue`, `window`, `frequency`, `notifyDelta`, `note`, `createdAt`, `deliveryChannels`.
- Persister les actions header/detail aujourd hui locales :
- `targetType`, `targetId`, `action`, `status`, `timestamp`, `actorId`.
- Couvre : `save`, `subscribe`, `reportUpdate`, `archive`, `duplicate`.
- Persister le flux Q/R opportunite :
- `opportunityId`, `tab`, `content`, `authorId`, `authorLabel`, `createdAt`, `replyToMessageId`.
- Telemetrie blueprint explicite (trace operationnelle) :
- `blueprintOpId`, `sourceRoute`, `targetRoute`, `targetType`, `targetId`, `result`, `latencyMs`, `errorCode`, `connectionState`, `occurredAt`.
- Etat reseau/synchro utilisateur sur actions critiques :
- `syncState`, `retryCount`, `queuedOffline`, `lastSyncAt`.
- Correlation transversale UI/API :
- `correlationId`, `idempotencyKey`, `sessionId`.
- Conformite minimale (audit fonctionnel) :
- `consentVersion`, `policyVersion`, `locale`, `timezone`.

### Regle d evolution

- Toute nouvelle action BLUEPRINT qui envoie des donnees doit declarer explicitement ses proprietes de sortie dans cette section avant merge.
