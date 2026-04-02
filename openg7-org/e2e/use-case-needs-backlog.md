# Backlog executable de preuve E2E des besoins

## Objectif

Transformer la gap analysis en une liste de travaux directement jouables dans le repo, sans repasser par une phase de reformulation.

Chaque item ci-dessous vise l'un des trois cas suivants :

- un besoin metier deja implemente mais encore mal prouve par E2E
- un besoin deja partiellement prouve qu'il faut fermer proprement
- un besoin a clarifier avant d'investir dans une preuve E2E

## Regles d'execution

- `P0` : besoin critique deja present dans le produit, avec un trou de preuve E2E qui peut fausser l'evaluation de portee.
- `P1` : besoin important mais partiellement bloque par une decision produit, un scope MVP ambigu ou une surface encore trop incomplete.
- `P2` : besoin utile, mais qui gagnerait davantage a etre couvert plus tard ou par un autre niveau de test.

## Ordre recommande

1. Aucun ticket restant dans le backlog executable courant sans nouveau scope produit.

## Execution update

- `2026-04-01`: `E2E-OBS-01` est termine via `e2e/admin-ops-observability.spec.ts`, avec verification ciblee verte (`2 passed`) couvrant `admin -> /admin/ops -> snapshot visible -> refresh visible -> erreur explicite sans perdre le dernier snapshot valide`.
- `2026-04-01`: `E2E-VALUE-01` est termine via `e2e/hydrocarbon-business-journey.spec.ts`, avec controle croise de `e2e/hydrocarbon-feed-navigation.spec.ts` et verification ciblee verte (`2 passed`) couvrant `vue /feed/hydrocarbons -> signal structure -> feed filtre -> ouverture detail -> carte hydrocarbon detail`.
- `2026-04-01`: `E2E-TRUST-01` est termine via `e2e/admin-trust-visibility.spec.ts`, avec verification ciblee verte (`1 passed`) couvrant `decision admin/trust -> sauvegarde -> page partenaire /partners/:id -> badge visible -> source visible -> historique visible`.
- `2026-04-01`: `E2E-NOTIF-01` est termine via `e2e/notification-panel.spec.ts`, avec verification ciblee verte (`1 passed`) couvrant `cloche header -> marquer lu -> compteur unread -> navigation inbox /alerts -> mark all read -> clear read`.
- `2026-04-01`: `E2E-IMPORT-01` est termine via `e2e/importation-analytics.spec.ts`, avec verification ciblee verte (`1 passed`) couvrant `compare mode -> selection de periode de comparaison -> drilldown origine -> annotations -> creation watchlist -> planification rapport`.
- `2026-03-31`: `E2E-RBAC-01` est termine via `e2e/rbac-access.spec.ts`, avec verification ciblee verte (`6 passed`).
- `2026-03-31`: `E2E-SEARCH-01` est termine via `e2e/search.spec.ts`, avec verification ciblee verte (`2 passed`) et controle croise de `e2e/saved-searches.spec.ts`.
- `2026-03-31`: `E2E-MAP-01` est termine via `e2e/corridors-realtime.spec.ts`, avec verification ciblee verte (`1 passed`) et controle croise du socle carte `e2e/map.spec.ts` (`1 skipped`, section non montee dans la composition home courante).
- `2026-03-31`: `E2E-QUALITY-01` est termine via `e2e/resilience.spec.ts`, avec verification ciblee verte (`3 passed`) et controle croise de `e2e/auth.spec.ts`, `e2e/alerts.spec.ts`, `e2e/saved-searches.spec.ts` et `site-header.component.spec.ts`.

## Backlog

| ID | Priorite | Besoin a prouver | Parcours E2E cible | Fichiers de tests recommandes | Ancrages repo | Blocage / decision |
| --- | --- | --- | --- | --- | --- | --- |
| `E2E-RBAC-01` | `P0` | Matrice d'acces par role, permission et etat de compte | Verifier qu'un `visitor` est redirige vers `/login` sur `/pro` et `/admin`; qu'un `editor` non admin est refuse sur `/admin`; qu'un `admin` passe; qu'un compte `emailNotConfirmed` ou `disabled` ne recupere pas le meme parcours qu'un compte `active` | Nouveau `e2e/rbac-access.spec.ts` | `src/app/app.routes.ts`, `src/app/core/auth/role.guard.ts`, `src/app/core/auth/permissions.guard.ts`, `e2e/helpers/auth-session.ts`, `e2e/helpers/domain-mocks.ts` | Termine le `2026-03-31`. Verification ciblee verte; plus de blocage ouvert sur ce ticket |
| `E2E-SEARCH-01` | `P0` | Recherche metier utile, pas seulement ouverture du modal | Ouvrir `Ctrl+K`, taper une requete, naviguer au clavier, selectionner un resultat, confirmer la navigation, sauvegarder la recherche, puis verifier la presence dans `/saved-searches` | Etendre `e2e/search.spec.ts`; eventuellement factoriser avec `e2e/saved-searches.spec.ts` | `src/app/domains/search/feature/quick-search-modal/quick-search-modal.component.ts`, `src/app/domains/search/feature/search.service.ts`, `src/app/domains/account/pages/saved-searches.page.ts` | Termine le `2026-03-31`. La preuve couvre la palette, la selection clavier, la navigation et la persistance dans `/saved-searches` |
| `E2E-MAP-01` | `P0` | Navigation geospatiale et lecture corridor-orientee | Depuis `home-corridors-realtime`, cliquer un corridor, verifier l'arrivee sur `/feed` avec `corridorId`, la copie contextuelle, puis la presence de filtres derives; completer avec une verification de filtrage visible sur la carte ou le feed | Nouveau `e2e/corridors-realtime.spec.ts`; etendre `e2e/map.spec.ts` | `src/app/domains/home/feature/home-corridors-realtime/home-corridors-realtime.component.ts`, `src/app/domains/feed/feature/feed.page.ts`, `src/app/domains/feed/feature/feed-route-filters.ts`, `src/app/shared/components/map/trade-map.component.ts` | Termine le `2026-03-31`. La preuve couvre `widget corridor -> /feed?source=corridors-realtime&corridorId=essential-services -> contexte corridor -> filtres derives QC/ON -> feed filtre sur 2 items attendus` |
| `E2E-QUALITY-01` | `P0` | Robustesse critique: erreurs, session expiree, offline, etats vides | Forcer des `401` et verifier le comportement du `error.interceptor`; tester une erreur reseau sur une page protegee; verifier au moins un empty state critique et un parcours mobile critique | Nouveau `e2e/resilience.spec.ts`; etendre `e2e/feed-notifications.spec.ts` et `e2e/auth.spec.ts` | `src/app/core/http/error.interceptor.ts`, `src/app/shared/components/layout/site-header/site-header.component.html`, `src/app/shared/components/layout/notification-panel/notification-panel.component.html` | Termine le `2026-03-31`. La preuve couvre `401 -> /login?reason=session-expired&redirect=/profile`, erreur reseau sur `/saved-searches`, empty state `/alerts` et navigation mobile critique |
| `E2E-IMPORT-01` | `P0` | Importation analytique plus profonde | Prouver le `compare mode`, la selection d'un point de comparaison, l'affichage du flow compare, la presence des annotations et la persistance d'un geste de collaboration utile en plus des watchlists et rapports deja couverts | `e2e/importation-analytics.spec.ts` | `src/app/domains/importation/pages/importation.page.ts`, `src/app/domains/importation/components/overview-header/importation-overview-header.component.html`, `src/app/domains/importation/components/flow-map-panel/importation-flow-map-panel.component.html`, `src/app/domains/importation/components/collaboration-hub/importation-collaboration-hub.component.html`, `e2e/helpers/domain-mocks.ts` | Termine le `2026-04-01`. La preuve couvre `compare mode -> compare target -> annotations -> drilldown origine -> watchlist persistee avec filtres derives -> report schedule` |
| `E2E-LINKUP-01` | `P1` | Workflow complet de mise en relation | Depuis une opportunite avec `connectionMatchId`, ouvrir `/linkup/:id`, completer le stepper, soumettre la connexion, puis retrouver la trace dans `/linkups` et `/linkups/:id` | Nouveau `e2e/linkup-creation.spec.ts` | `src/app/domains/matchmaking/pages/linkup/og7-linkup-page.component.ts`, `src/app/domains/matchmaking/sections/og7-intro-billboard-content.component.ts`, `src/app/core/services/connections.service.ts`, `e2e/helpers/domain-mocks.ts` | Bloque par le scope: `docs/frontend/linkup-functional-analysis.md` place la creation directe hors MVP. Ne pas implementer cette preuve tant que le besoin produit n'evolue pas |
| `E2E-NOTIF-01` | `P1` | Centre de notifications et suivi in-app | Ouvrir la cloche du header, marquer un item comme lu, verifier le compteur unread, naviguer vers l'inbox `/alerts`, puis vider ou nettoyer l'historique utile | Nouveau `e2e/notification-panel.spec.ts`; completer `e2e/alerts.spec.ts` | `src/app/shared/components/layout/site-header/site-header.component.html`, `src/app/shared/components/layout/notification-panel/notification-panel.component.html`, `src/app/core/observability/notification.store.ts` | Termine le `2026-04-01`. La preuve couvre `header unread -> mark read -> inbox /alerts -> mark all read -> clear read`; les preferences email/webhook restent hors surface UI visible |
| `E2E-VALUE-01` | `P1` | Valeur OpenG7 specifique sur corridors, hydrocarbures et signaux sectoriels | Ouvrir la vue `/feed/hydrocarbons`, verifier les signaux structures, naviguer ensuite vers une opportunite pertinente ou un contexte corridor, et prouver une lecture croisee metier plutot qu'une simple navigation de menu | `e2e/hydrocarbon-business-journey.spec.ts`; `e2e/hydrocarbon-feed-navigation.spec.ts` | `src/app/domains/feed/feature/feed.routes.ts`, `src/app/domains/feed/feature/feed.page.ts`, `src/app/domains/feed/feature/components/hydrocarbon-signals-panel.component.ts`, `docs/frontend/hydrocarbures-surplus-baril-use-case.md` | Termine le `2026-04-01`. La preuve couvre `vue hydrocarbures -> signal structure lie a feedItemId -> carte feed filtree -> detail hydrocarbon`, et a aussi ferme un bug reel de navigation depuis la route enfant `/feed/hydrocarbons` |
| `E2E-TRUST-01` | `P1` | Validation et decision trust plus formelles | Completer `admin/trust` avec au moins un cycle `ajout -> sauvegarde -> relecture`, puis si la surface existe, couvrir un rejet ou une demande de correction | `e2e/admin-trust-visibility.spec.ts` et `e2e/use-case-audit-gap-coverage.spec.ts` | `src/app/domains/admin/pages/admin-trust.page.html`, `src/app/shared/components/partner/partner-details-panel.component.html`, `e2e/helpers/domain-mocks.ts` | Termine le `2026-04-01`. La preuve couvre `admin/trust -> save -> visibilite sur /partners/:id`; il ne reste pas de rejet/correction formel a prouver tant que la UI ne l'expose pas |
| `E2E-OBS-01` | `P2` | Observabilite, provenance et audit trail visibles | Prouver la surface operateur visible `/admin/ops`: snapshot coherent, refresh explicite, erreur visible et conservation du dernier etat valide | `e2e/admin-ops-observability.spec.ts` | `src/app/domains/admin/pages/admin-ops.page.ts`, `src/app/domains/admin/pages/admin-ops.page.html`, `src/app/domains/admin/data-access/admin-ops.service.ts`, `e2e/helpers/domain-mocks.ts` | Termine le `2026-04-01`. La preuve couvre la surface frontend visible `/admin/ops`; la provenance metier detaillee et les audit trails d'actions sensibles restent hors UI actuelle |

## Tickets prets a lancer sans nouvelle decision produit

- Aucun `P0` restant sans arbitrage produit.

## Tickets qui demandent un arbitrage produit avant implementation

- `E2E-LINKUP-01`: la creation directe est documentee hors MVP; ne reouvrir ce ticket que si le scope produit change.

## Definition of done minimale

- le besoin est rattache a au moins une source metier ou produit du repo
- le parcours cible se termine sur une preuve visible par l'utilisateur
- la spec Playwright est isolee, nommee par besoin et stable sans dependance fragile a des donnees externes
- la gap analysis peut etre mise a jour de `partiel/non` vers `oui` sans ambiguite
