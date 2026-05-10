# Manuel d'utilisation de la matrice QA admin

Ce manuel explique comment utiliser la page `/admin/quality` comme cockpit de pilotage du développement OpenG7. Il couvre la lecture des voyants, l'obtention des preuves, le bouton `Generer le plan QA`, le backlog pilote par la matrice et les criteres de confiance avant d'utiliser les couleurs.

## Objectif de la matrice

La matrice QA ne sert pas seulement a afficher des statuts. Elle relie quatre informations:

1. le besoin metier suivi par une ligne de matrice;
2. l'etat de couverture actuel (`Synthese`, `Metier`, `Implementation`, `E2E`);
3. les preuves disponibles ou attendues;
4. le prochain mouvement de developpement ou de validation.

Le principe important est volontaire: un signal de merge ne rend pas automatiquement un voyant vert. Le merge signale qu'une ligne doit etre relue; la couleur change seulement apres une proposition QA appliquee par un Owner/Admin.

## Acces et roles

La page est disponible sur `/admin/quality`.

Les actions sensibles demandent un compte API web avec role `owner` ou `admin` cote users-permissions Strapi. Le role Super Admin du panel Strapi ne suffit pas pour les endpoints front.

Actions sensibles:

- charger la matrice: `GET /api/admin/quality/matrix`;
- generer le plan QA: `POST /api/admin/quality/matrix/recalculate`;
- appliquer une proposition: `POST /api/admin/quality/matrix/apply-proposal`.

## Lexique rapide

| Terme             | Sens operationnel                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `oui`             | La couverture est consideree suffisante pour le perimetre courant.                          |
| `partiel`         | Une partie est couverte, mais il reste un manque de preuve ou de profondeur.                |
| `non`             | La ligne ne peut pas etre consideree couverte.                                              |
| `hors MVP`        | Le besoin est connu, mais volontairement hors perimetre actuel.                             |
| `Refresh matrice` | Un signal plus recent que la derniere revue existe; la ligne doit etre relue.               |
| `Preuve`          | Reference exploitable: spec, E2E, artifact, PR, mission `proof-returned` ou mission `done`. |
| `Proposition`     | Changement de statut propose par le recalcul, a appliquer manuellement.                     |
| `Backlog pilote`  | Liste d'actions de developpement ou de preuve, meme si aucun statut ne change.              |

## Quand faire confiance aux voyants

Avant d'utiliser les couleurs pour prendre une decision, verifiez cette checklist:

1. Le badge de source de matrice n'indique pas `stale` ou `fallback`.
2. La ligne n'affiche pas `Refresh matrice`.
3. Le plan QA a ete genere apres les derniers merges ou retours de mission.
4. Les propositions pertinentes ont ete appliquees par un Owner/Admin.
5. Les preuves recentes sont rattachees a la bonne entree de matrice.

Formule pratique:

```txt
Voyant exploitable = source fraiche + aucun refresh ouvert + plan QA recent + proposition appliquee si necessaire.
```

Si une ligne reste `partiel` ou `non`, ce n'est pas forcement une erreur. Cela signifie souvent que la preuve existe peut-etre, mais qu'elle n'est pas encore assez forte, pas assez rattachee, ou pas encore validee par un Owner/Admin.

## D'ou viennent les preuves

### 1. Evidence statique de la matrice

Les preuves initiales sont declarees dans `openg7-org/src/assets/data/admin-quality-matrix.json`, puis chargees dans Strapi par `strapi/src/seed/16-admin-quality-matrix.ts`.

Exemples:

```txt
e2e/feed-opportunity-detail.spec.ts
e2e/opportunity-offer-flow.spec.ts
src/app/domains/account/pages/favorites.page.spec.ts
```

Ces references apparaissent dans les lignes de matrice et dans les details de recalcul.

### 2. Registre des actions admin quality

Le fichier `openg7-org/src/app/domains/admin/pages/admin-quality-action-registry.ts` relie des actions utilisateur a des preuves attendues ou deja presentes.

Exemple d'usage:

- action: `Proposer une offre`;
- entree matrice: `feed-signals`;
- preuves: specs E2E ou specs unitaires liees au geste.

Ce registre permet de distinguer une preuve de domaine d'une preuve d'action concrete.

### 3. Missions de validation

Une mission QA/Codex peut evoluer ainsi:

```txt
proposed -> approved -> in-progress -> proof-returned -> done
```

Deux statuts comptent comme preuves fortes:

- `proof-returned`: une preuve est revenue;
- `done`: la mission est cloturee.

Si la mission est plus recente que `reviewedAt`, la matrice peut proposer une promotion ou au moins mettre la ligne dans le plan QA.

### 4. Proof desk GitHub Actions

La page admin consomme aussi `GET /api/admin/ops/ai/proofs`.

Ce endpoint Strapi lit GitHub Actions et expose:

- le dernier run;
- son statut (`queued`, `in-progress`, `completed`, `failed`);
- les artifacts, par exemple `playwright-report`;
- la PR liee a la branche de preuve;
- les liens vers le run et les artifacts.

Le proof desk indique qu'un workflow a reellement tourne et qu'un paquet de preuve existe.

### 5. Ingestion post-merge

Apres un merge sur `main`, le workflow `.github/workflows/admin-quality-matrix-sync.yml` collecte les fichiers modifies et publie un signal vers Strapi:

```http
POST /api/admin/quality/matrix/ingest
```

Le payload contient notamment:

```json
{
  "mergedAt": "2026-05-07T13:45:00.000Z",
  "commitSha": "abc123def456",
  "source": "github-actions",
  "workflow": "Admin Quality Matrix Sync",
  "branch": "main",
  "summary": "targeted sync after merge to main",
  "changedFiles": ["openg7-org/src/app/domains/feed/feature/feed.page.ts"],
  "impactedEntryIds": ["feed-signals"]
}
```

Strapi enregistre alors:

- `lastRepoSignalAt`;
- `lastRepoSignalCommit`;
- `lastRepoSignalSource`;
- `lastRepoSignalSummary`.

Ces champs ne changent pas les voyants directement. Ils indiquent que la ligne doit etre relue.

Si `impactedEntryIds` est absent, Strapi peut aussi deduire les lignes impactees depuis `changedFiles` et retourne alors les champs `impactMode`, `impactReason`, `derivedEntryIds` et `resolvedEntryIds`.

## Comment les fichiers modifies sont relies a la matrice

Le mapping fichier -> entree matrice est resolu par `scripts/resolve-admin-quality-matrix-impact.mjs`.

Exemple:

```bash
node scripts/resolve-admin-quality-matrix-impact.mjs openg7-org/src/app/domains/feed/feature/feed.page.ts
```

Sortie attendue, simplifiee:

```json
{
  "changedFiles": ["openg7-org/src/app/domains/feed/feature/feed.page.ts"],
  "entryIds": ["feed-signals"],
  "mode": "targeted",
  "reason": "Targeted impact map matched changed files."
}
```

Si un fichier touche l'infrastructure globale de la matrice, les contrats, le tooling ou une zone produit non mappee, le script peut retourner toutes les entrees et passer en mode `global`.

Quand ajouter une regle de mapping:

1. Un nouveau domaine Angular ou Strapi apparait.
2. Une entree de matrice est ajoutee dans `admin-quality-matrix.json`.
3. Une PR modifie des fichiers produit, mais aucune ligne ne passe en `Refresh matrice`.
4. Un changement est trop large et devrait etre mappe precisement au lieu de rafraichir toute la matrice.

## Utiliser le bouton `Generer le plan QA`

Le bouton a trois effets:

1. il analyse les entrees du scope choisi;
2. il produit des propositions de changement de statut quand les preuves sont suffisantes;
3. il produit un backlog de pilotage meme pour les lignes `unchanged` mais encore incompletes.

Scopes disponibles:

| Scope               | Usage recommande                                                       |
| ------------------- | ---------------------------------------------------------------------- |
| `Entrees a piloter` | Relecture rapide des lignes marquees par un signal recent.             |
| `Entree active`     | Diagnostic cible sur la ligne selectionnee.                            |
| `Toute la matrice`  | Revue complete apres release, audit ou doute sur la fraicheur globale. |

Le message de succes doit etre lu ainsi:

```txt
Plan QA genere: 15 entree(s) analysee(s), 6 a piloter, 0 proposition(s), 0 blocage(s).
```

- `entree(s) analysee(s)`: nombre de lignes inspectees;
- `a piloter`: lignes qui meritent une action de backlog;
- `proposition(s)`: promotions ou changements de statut applicables;
- `blocage(s)`: signaux insuffisants ou contradictoires.

Un resultat avec `0 proposition(s)` peut etre correct. Cela signifie seulement qu'aucun changement de couleur ne doit etre applique automatiquement. Le backlog peut quand meme contenir des actions de developpement ou de preuve.

## Lire le backlog pilote par la matrice

Le bloc `Backlog pilote par la matrice` trie les entrees par priorite puis par score.

Priorites:

| Priorite              | Sens                                                    |
| --------------------- | ------------------------------------------------------- |
| `A lancer maintenant` | Action prioritaire; la ligne a un score eleve.          |
| `Prochain lot`        | Action utile, mais moins urgente.                       |
| `Bloque`              | Decision produit ou contrat API requis avant execution. |
| `Plus tard`           | Pas d'action immediate.                                 |

Buckets:

| Bucket              | Sens                                                                  |
| ------------------- | --------------------------------------------------------------------- |
| `Pret a developper` | Le prochain mouvement est une implementation.                         |
| `Preuve requise`    | Il manque une spec, un E2E, un artifact ou une preuve rattachee.      |
| `Decision produit`  | Le scope doit etre arbitre avant de changer la matrice.               |
| `Contrat API`       | Le contrat ou schema doit etre stabilise avant le front ou les tests. |
| `Pret a cloturer`   | Une proposition peut etre appliquee apres verification humaine.       |

Actions possibles:

- `Implementer`;
- `Ajouter une preuve`;
- `Combler la preuve`;
- `Mettre a jour le contrat`;
- `Arbitrer le scope`;
- `Cloturer la ligne`;
- `Valider`.

## Appliquer une proposition

Appliquer une proposition change les statuts de la ligne. A faire seulement si:

1. la preuve est visible ou rattachee;
2. la proposition correspond au perimetre produit;
3. le resultat QA n'est pas bloque;
4. l'Owner/Admin accepte la responsabilite de la promotion.

Apres application, la ligne recoit un nouveau `reviewedAt`. Un recalcul suivant ne devrait plus reproposer la meme promotion si aucun signal plus recent n'existe.

## Procedure recommandee

### Revue quotidienne rapide

1. Ouvrir `/admin/quality`.
2. Verifier le badge de source et les alertes de fraicheur.
3. Lancer `Generer le plan QA` avec `Entrees a piloter`.
4. Lire le backlog pilote.
5. Traiter les lignes `A lancer maintenant` ou `Bloque`.

### Apres un merge important

1. Verifier que le workflow `Admin Quality Matrix Sync` a publie le signal.
2. Ouvrir `/admin/quality`.
3. Chercher les lignes `Refresh matrice`.
4. Lancer `Generer le plan QA`.
5. Consulter les preuves et appliquer seulement les propositions justifiees.

### Avant une release

1. Choisir `Toute la matrice`.
2. Lancer `Generer le plan QA`.
3. Traiter les propositions et les blocages.
4. Lancer les validations ciblees indiquees par le plan.
5. Eviter de communiquer les voyants comme fiables tant que le backlog prioritaire contient des blocages critiques.

## Diagnostic rapide

### `0 proposition(s)` apres `Toute la matrice`

Ce n'est pas forcement un probleme.

Verifier:

1. le nombre `entree(s) analysee(s)`;
2. le nombre `a piloter`;
3. les raisons dans le detail de la ligne;
4. si les missions sont bien `proof-returned` ou `done`, et pas seulement `approved`.

### Une PR a ete mergee mais aucune ligne ne passe en `Refresh matrice`

Verifier:

1. les secrets du workflow d'ingestion;
2. le run `.github/workflows/admin-quality-matrix-sync.yml`;
3. le mapping `scripts/resolve-admin-quality-matrix-impact.mjs`;
4. que les fichiers modifies ne sont pas hors des prefixes connus.

Commande utile:

```bash
node scripts/resolve-admin-quality-matrix-impact.mjs chemin/du/fichier/modifie.ts
```

### Le proof desk est vide

Verifier:

1. la configuration GitHub cote Strapi;
2. le token GitHub utilise par `GET /api/admin/ops/ai/proofs`;
3. l'existence d'un workflow recent;
4. la presence d'artifacts non expires.

### `403 Forbidden` sur `Generer le plan QA`

Verifier que l'utilisateur connecte est un utilisateur web Strapi users-permissions avec role `owner` ou `admin`. Rejouer les seeds peut corriger une base locale avec permissions en retard:

```bash
yarn --cwd strapi seed:dev
```

## Validations utiles

Tests backend de la matrice:

```bash
yarn --cwd strapi test:integration:admin-quality-matrix
```

Tests front cibles:

```bash
yarn --cwd openg7-org ng test --watch=false --browsers=ChromeHeadlessNoSandbox --include=src/app/domains/admin/data-access/admin-quality-matrix.service.spec.ts --include=src/app/domains/admin/pages/admin-quality.page.spec.ts
```

Smoke E2E du bouton:

```bash
yarn --cwd openg7-org playwright test e2e/admin-quality-recalculate-matrix.spec.ts
```

Test du mapping d'impact:

```bash
node scripts/resolve-admin-quality-matrix-impact.mjs openg7-org/src/app/domains/feed/feature/feed.page.ts
```

## Regles de gouvernance

- Ne pas passer un voyant au vert sur simple intuition.
- Ne pas assimiler un merge a une preuve suffisante.
- Ne pas appliquer une proposition sans preuve lisible.
- Garder `partiel` ou `non` si le produit est couvert en partie mais pas prouve de bout en bout.
- Ajouter ou corriger le mapping d'impact des qu'un nouveau module devient pilotable par la matrice.
- Ajouter une preuve E2E ou une decision de mission avant de promouvoir une ligne critique.

## Documents lies

- `docs/strapi/admin-quality-matrix-sync.md` pour la synchronisation post-merge et les secrets d'ingestion.
- `docs/frontend/admin-quality-matrix-automation-tasks.md` pour la feuille de route des automatisations restantes.
- `scripts/resolve-admin-quality-matrix-impact.mjs` pour la cartographie fichiers -> entrees matrice.
- `openg7-org/src/assets/data/admin-quality-matrix.json` pour les lignes de matrice seedees.
- `openg7-org/src/app/domains/admin/pages/admin-quality-action-registry.ts` pour les preuves par action utilisateur.
