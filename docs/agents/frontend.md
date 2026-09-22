# Frontend Nexus

À lire pour UI, routage, état, SSR, accessibilité et sécurité navigateur, y
compris dans les packages Angular. Complète [AGENTS.md](../../AGENTS.md).

## Composition et placement

Composants standalone, signal-first, TypeScript strict, i18n @ngx-translate,
styles Tailwind existants. Classer responsabilité et portée avant création :
atome/molecule neutre → shared/ui; organisme métier → domaine; template sans
chargement métier; page mince pour route, données et orchestration. Atomic Design
ne prescrit pas de migration générale : les composants shared/components restent valides.

Dépendances : pages → feature/templates → UI domaine → patterns/composites
partagés → primitives/tokens. Aucun import privé entre domaines; core et shared
n’importent pas un domaine. Atomes/molécules sans routeur, HTTP, stockage ou store global.
Une extraction partagée exige neutralité ou réutilisation réelle.

Signals pour l’état local; NgRx pour les slices globales réellement partagées
(auth, user, catalog, map, companyImportBulk, connections, feed, statistics).
Conserver nomenclature des sélecteurs du store et flux existants.

## Contrats UI et états

Sélecteurs Angular og7- en kebab-case; hooks data-og7, data-og7-id/data-og7-layer.
Aucune classe CSS/Tailwind comme contrat de test. Pour un hook/composant ajouté ou
renommé, chercher et modifier ses entrées dans le [registre](selector-registry.md),
avec métadonnées niveau UI/portée et consommateurs/tests.

Couvrir loading, empty, error, disabled, access-denied si pertinents; inputs/outputs
typés, chaînes FR/EN, noms accessibles, clavier, focus visible et annonces dynamiques.
Drawer : focus piégé/restauré; carte : contrôles focusables, zoom au clavier,
activation par Entrée, aria-live et alternative accessible.

## SSR, API et sécurité

Aucun window/document/stockage navigateur au chargement d’un module. Isoler les
bibliothèques navigateur via garde de plateforme/import dynamique; rendre les
routes lazy et préserver hydratation/TransferState sans fuite de données privées.
Lire la configuration runtime via les providers, pas par accès navigateur dans
le code partagé. Flags et cache ont TTL/invalidation; retries bornés et erreurs visibles.

canMatch/RBAC UI facilitent la navigation; Strapi vérifie toujours les droits.
Aucun JWT durable ni secret fournisseur dans le bundle. Les tokens de lecture
et origines autorisées suivent la configuration du serveur. Mutations par cookie :
CSRF même origine; CORS explicite. CSP/Trusted Types en production; ne pas contourner
la sanitisation d’un HTML dynamique. Rapports CSP sans données sensibles.

## Qualité et validation

Budgets conservés : LCP ≤ 2,5 s, CLS ≤ 0,1, INP ≤ 200 ms; carte ≥ 40 fps desktop
et 30 fps laptop moyen, filtre ≤ 200 ms, rendu initial ≤ 1,5 s. Au-delà de 10 000
arêtes, prévoir MVT; simplifier géométrie et paginer les entreprises visibles.
Accessibilité WCAG 2.1 AA. Une mesure locale ne vaut pas preuve de production.

Tester rendu/états des primitives, interactions des assemblages, données/erreurs
et autorisations des pages, parcours E2E critiques. Appliquer la
[validation](validation.md). Pour le feed, conserver les [blueprints](feed-blueprints.md).
