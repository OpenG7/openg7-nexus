# OpenG7 needs gap analysis

## Purpose

This document separates three different layers that should not be conflated:

1. `Business needs`: what the product is supposed to cover.
2. `Implemented needs`: what is currently exposed in routes, components, services, or backend contracts.
3. `E2E-proved needs`: what Playwright currently demonstrates end-to-end.

It also absorbs the review feedback on the earlier E2E-only summary, which was valid as an inventory of proved needs, but not as a complete functional map of OpenG7 Nexus.

## Scope and evidence

- `Audit pair`: `e2e/use-case-audit.spec.ts` and `e2e/use-case-audit-gap-coverage.spec.ts`, green on `2026-03-31` with `9 passed`.
- `Additional targeted E2E`: `rbac-access.spec.ts`, `search.spec.ts`, `corridors-realtime.spec.ts`, `resilience.spec.ts`, `map.spec.ts`, `alerts.spec.ts`, `saved-searches.spec.ts`, `feed-notifications.spec.ts`, `feed-opportunity-detail.spec.ts`, `feed-alert-detail.spec.ts`, `feed-indicator-detail.spec.ts`, `feed-publish-panel.spec.ts`, `opportunity-offer-flow.spec.ts`, `opportunity-engagement.spec.ts`, `full-human-journey.spec.ts`, `hydrocarbon-feed-navigation.spec.ts`, `auth.spec.ts`.
- `Business sources`: [`../../docs/cas-d-usage-en-langage-courant.md`](../../docs/cas-d-usage-en-langage-courant.md), [`../../docs/frontend/importation-page.md`](../../docs/frontend/importation-page.md), [`../../docs/frontend/linkup-functional-analysis.md`](../../docs/frontend/linkup-functional-analysis.md), [`../../docs/frontend/hydrocarbures-surplus-baril-use-case.md`](../../docs/frontend/hydrocarbures-surplus-baril-use-case.md), [`../../docs/frontend/quick-search-modal.md`](../../docs/frontend/quick-search-modal.md), [`../../docs/roadmap.md`](../../docs/roadmap.md), [`../../docs/strapi/realtime-apis.md`](../../docs/strapi/realtime-apis.md), [`../../docs/strapi/hydrocarbon-signal-api-contract.md`](../../docs/strapi/hydrocarbon-signal-api-contract.md).
- `Implementation anchors`: [`../src/app/app.routes.ts`](../src/app/app.routes.ts), [`../src/app/domains/search/feature/search.service.ts`](../src/app/domains/search/feature/search.service.ts), [`../src/app/domains/importation/services/importation-filters.store.ts`](../src/app/domains/importation/services/importation-filters.store.ts), [`../src/app/core/security/rbac.policy.ts`](../src/app/core/security/rbac.policy.ts), [`../src/app/core/config/corridor-context.ts`](../src/app/core/config/corridor-context.ts).

## Legend

- `oui`: solid evidence exists at that layer
- `partiel`: present, but only on part of the workflow or persona set
- `non`: no reliable evidence found at that layer
- `hors MVP`: explicitly outside the current documented MVP

## Matrix

| Domaine | Besoin | Dans la synthese E2E transmise | Metier | Impl | E2E | Manque observe | Priorite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Decouverte publique | Comprendre la proposition de valeur, les secteurs, le pricing et les statistiques | oui | oui | oui | oui | Pas de manque critique dans le perimetre actuel de decouverte | basse |
| Recherche et decouverte profonde | Rechercher, filtrer, trier, naviguer par province, secteur, intrant ou corridor, puis comparer | non | oui | partiel | partiel | La recherche rapide prouve `requete -> selection clavier -> navigation -> sauvegarde -> /saved-searches`, et la navigation corridor prouve maintenant `widget home -> /feed -> filtres derives QC/ON -> feed filtre`; restent non prouves les filtres avances, le tri, la comparaison et une exploration geospatiale plus profonde | haute |
| Cartes et geopatial | Explorer la carte, les corridors, les couches, les drilldowns et les vues geospatiales utiles a la decision | non | oui | oui | partiel | Les E2E prouvent maintenant un vrai chemin corridor-oriente `home-corridors-realtime -> /feed -> contexte corridor -> filtres derives -> items filtres`, mais pas encore les interactions riches directement sur la carte, les couches, les drilldowns ni les vues geospatiales de decision | haute |
| Onboarding entreprise et imports | S'inscrire, soumettre l'entreprise, lancer des imports manuels et bulk | oui | oui | oui | oui | Couverture solide dans l'audit courant | moyenne |
| Importation analytique et collaboration | Lire les KPIs, la map importation, les commodites, les fournisseurs, les watchlists et la planification de rapports | oui | oui | oui | partiel | Watchlists et rapports sont prouves, mais pas tout le volet annotations, assignations et enrichissement analytique avance | moyenne |
| Feed et signaux metier | Ouvrir des opportunites, alertes et indicateurs, publier depuis le feed, proposer une offre, suivre son statut | non | oui | oui | oui | La publication, les offres, les alertes et les indicateurs sont bien prouves hors audit, mais pas encore resumes dans la note d'audit courte | moyenne |
| Cycle de vie des objets metier | Creer, editer, enrichir, fermer ou archiver une opportunite, une entreprise ou un partenaire | partiel | oui | partiel | partiel | La consultation est bien couverte; l'edition, l'archivage et l'enrichissement durable ne le sont pas encore de facon explicite | haute |
| Mise en relation | Initier un linkup, consulter l'historique, ouvrir le detail, suivre le statut, tracer la relation | partiel | oui | partiel | partiel | Historique, detail et ouverture existent; creation directe, acceptation/refus, messagerie, pieces jointes et journal formel restent non prouves ou hors MVP | haute |
| Alertes et notifications | Generer des alertes utilisateur, s'abonner, gerer les signaux, recevoir du feedback in-app et suivre ses preferences | partiel | oui | oui | partiel | Les pages alertes, les subscriptions et certains toasts sont prouves; les preferences email/in-app et la matrice de notification complete ne le sont pas | haute |
| Compte et donnees personnelles | Gerer profil, mot de passe, email, sessions, favoris, export et persistance de session | oui | oui | oui | oui | Couverture E2E forte sur les gestes critiques du compte | basse |
| Gouvernance, roles et permissions | Appliquer une vraie matrice RBAC sur les pages, ressources et actions sensibles | partiel | oui | oui | oui | La matrice `visitor -> login`, `editor -> access-denied admin`, `editor -> /pro`, `admin -> surfaces admin`, ainsi que les etats `emailNotConfirmed` et `disabled`, est maintenant prouvee. Resteraient seulement d'eventuelles restrictions plus fines par ressource si elles emergent produit | moyenne |
| Trust et validation | Moderer, verifier, historiser les decisions de confiance et rendre le statut lisible | oui | oui | partiel | partiel | `admin/trust` est prouve, mais pas encore une file de verification complete, un rejet/correction et une visibilite publique formalisee | moyenne |
| Robustesse et qualite de service | Gerer erreurs, etats vides, offline, reload, expiration, accessibilite, responsive et performance percue | non | oui | partiel | partiel | `resilience.spec.ts` prouve maintenant `401 -> /login?reason=session-expired`, une erreur reseau sur `/saved-searches`, un empty state critique sur `/alerts` et une navigation mobile critique. Restent non prouves une passe systematique sur l'a11y, l'offline riche, le responsive large et la performance percue | moyenne |
| Observabilite et tracabilite | Tracer les actions sensibles, les imports, la provenance, les evenements d'usage et les changements importants | non | oui | partiel | non | Les services et contrats existent, mais il n'y a pas encore de preuve E2E ciblee pour les logs, audit trails et preuves de provenance | moyenne |
| Valeur OpenG7 specifique | Cartographier les corridors, capacites, dependances interprovinciales, tensions d'approvisionnement et signaux sectoriels | non | oui | partiel | partiel | Les surfaces energie, hydrocarbures, importation et corridors existent; le corridor `essential-services` est maintenant prouve jusqu'au feed filtre, mais la lecture croisee complete et la priorisation explicite des services essentiels restent partielles | haute |

## Reading the matrix

- The earlier summary of "needs proved by E2E" remains valid, but only for the rows that were explicitly listed there.
- Several gaps identified by the external review are real product-map gaps.
- Several others are not product gaps, but summary gaps: the repo already has targeted E2E coverage outside the audit pair, especially around feed actions, alerts, indicator subscriptions, saved searches, notifications, and hydrocarbon navigation.

## Immediate priorities

1. Extend E2E around importation analytics and collaboration beyond watchlists and report scheduling, especially compare mode, annotations, and collaboration gestures with visible persistence.
2. Extend E2E around advanced discovery beyond the corridor path already proved, especially sorting, drilldowns, richer geospatial interactions, and comparison.
3. Decide whether linkup creation, accept/reject, messaging, and attachments are intended for the current MVP or should stay marked `hors MVP`, then align docs and E2E accordingly.
4. Add explicit proof for observability and provenance only if these behaviors are meant to be user-visible or operationally auditable in the frontend product surface.

The executable follow-up backlog for those priorities is tracked in `e2e/use-case-needs-backlog.md`.
