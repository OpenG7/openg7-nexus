# Admin Quality — Gouvernance et règles d'auto-application

Ce document décrit les règles de gouvernance pour le processus de découverte automatique des besoins dans la matrice admin quality, les critères d'auto-application, et les responsabilités de l'opérateur.

## Principe fondamental

> L'algorithme peut rapatrier des signaux, pas inventer seul le besoin métier.

La réconciliation automatique ne **crée pas** de besoins dans la matrice. Elle **propose** des ajustements basés sur ce qu'elle observe dans le dépôt (sélecteurs, specs E2E, routes Strapi, fichiers i18n). Toute proposition `create-entry` ou `mark-stale` doit passer par une revue opérateur avant d'être acceptée.

---

## Types de propositions

| Type | Description | Auto-applicable |
|------|-------------|-----------------|
| `add-source-ref` | Attache une référence de source (E2E, sélecteur, route) à une entrée existante | Oui, si confiance `high` |
| `create-entry` | Propose une nouvelle entrée candidate basée sur une source non mappée | Non — revue produit requise |
| `mark-stale` | Signale qu'aucune source active n'a été trouvée pour une entrée | Non — investigation requise |

---

## Règles d'auto-application (`add-source-ref`)

Une proposition `add-source-ref` peut être acceptée automatiquement si **toutes** ces conditions sont réunies :

1. **Confiance `high`** — la source a été trouvée via une règle `path-prefix` exacte dans `impactRules`
2. **L'entrée cible est `active`** — les entrées `deprecated` ou `draft` sont exclues
3. **La source n'est pas déjà présente** dans `sourceRefs` de l'entrée (pas de doublon)
4. **Le type de source est vérifiable** : `e2e`, `selector`, `strapi-api`, ou `route`

Les propositions avec confiance `medium` ou `low` nécessitent une revue manuelle dans l'interface `/admin/quality → Propositions`.

---

## Règles de non-application (`create-entry`, `mark-stale`)

Ces propositions ne sont **jamais** auto-appliquées car elles impliquent :

- **`create-entry`** : Un arbitrage produit sur si la source représente un vrai besoin métier distinct. L'opérateur doit confirmer l'`id`, le `domain`, le `need` et les `acceptanceCriteria` avant d'insérer l'entrée dans la matrice.

  > **Important** : Cliquer **Accepter** dans l'interface enregistre uniquement la décision dans Strapi — cela **n'écrit rien** dans `admin-quality-matrix.json`. Après avoir accepté, l'opérateur doit ajouter manuellement l'entrée dans le fichier JSON, puis exécuter `yarn generate:admin-quality-impact-map` et `yarn validate:admin-quality-impact-map`.

- **`mark-stale`** : Potentiellement une entrée légitime dont les sources ont été renommées, supprimées pour maintenance, ou déplacées. L'opérateur doit vérifier l'historique git avant de modifier `status`.

  > **Important** : Accepter une proposition `mark-stale` n'archive pas l'entrée — c'est uniquement un signal de pilotage. La décision de changer le champ `status` de l'entrée dans `admin-quality-matrix.json` reste manuelle.

---

## Cycle de vie d'une proposition

```
proposed → accepted  (opérateur ou auto-application si règles respectées)
         → rejected  (opérateur, avec note optionnelle)
         → superseded (une nouvelle proposition remplace celle-ci)
```

Une proposition `accepted` ou `rejected` est **verrouillée** — elle ne peut plus être modifiée via l'API. Pour corriger une erreur, créez une nouvelle proposition via une nouvelle exécution de réconciliation.

---

## Workflow CI/PR

Sur chaque PR, le workflow `.github/workflows/pr-admin-quality-review.yml` :

1. Détecte les fichiers modifiés et résout les entrées de matrice impactées (`resolve-admin-quality-matrix-impact.mjs`)
2. Lance la découverte + réconciliation (`reconcile-admin-quality-matrix.mjs`)
3. Formate et poste (ou met à jour) un commentaire sur la PR avec :
   - Le mode d'impact (global / ciblé / fourni)
   - Les entrées touchées
   - Un aperçu des propositions générées

Le commentaire est identifié par le marqueur `<!-- og7-admin-quality-review -->` pour être mis à jour plutôt que dupliqué.

Si le mode est `none` (aucune entrée impactée), le commentaire n'est pas posté.

---

## Interface opérateur `/admin/quality → Propositions`

L'onglet **Propositions** de la console admin quality permet de :

- Filtrer par statut : `A traiter`, `Acceptées`, `Rejetées`, `Toutes`
- Voir le diff de chaque proposition (payload structuré)
- Accepter ou rejeter avec confirmation

L'opérateur doit traiter les propositions dans l'ordre de priorité suivant :
1. `add-source-ref` avec confiance `high` — validation rapide des signaux les plus sûrs
2. `mark-stale` — identifier les entrées sans couverture active
3. `create-entry` avec confiance `medium` — valider si la source représente un besoin réel
4. `create-entry` avec confiance `low` — déprioriser, potentiellement rejeter en bloc

---

## Ajout d'une nouvelle entrée dans la matrice

Pour ajouter manuellement une entrée dans `openg7-org/src/assets/data/admin-quality-matrix.json` :

```json
{
  "id": "mon-besoin-metier",
  "domain": "NomDomaine",
  "need": "Description courte du besoin en langage naturel",
  "acceptanceCriteria": [
    "Critère vérifiable 1",
    "Critère vérifiable 2"
  ],
  "sourceRefs": [],
  "impactRules": [
    { "type": "path-prefix", "prefixes": ["packages/mon-domaine/"] }
  ],
  "evidence": [],
  "owner": "nom-equipe",
  "status": "active",
  "confidence": "medium",
  "lastDiscoveredAt": null
}
```

Après modification du fichier :
```bash
yarn generate:admin-quality-impact-map
yarn validate:admin-quality-impact-map
```

---

## Commandes opérateur

| Commande | Description |
|----------|-------------|
| `yarn discover:admin-quality-needs` | Lance la découverte de sources dans le dépôt |
| `yarn reconcile:admin-quality-matrix` | Découverte + réconciliation → génère les fichiers de propositions |
| `yarn validate:admin-quality-impact-map` | Vérifie la cohérence de la carte d'impact |
| `yarn test:scripts` | Lance les tests unitaires des scripts de réconciliation |
| `yarn admin:quality:agent` | Agent d'exécution deterministe (dry-run) |
| `yarn admin:quality:agent:apply` | Agent d'exécution deterministe (applique les actions) |

---

## Gardes-fou de fraîcheur de la matrice

Trois mécanismes complémentaires s'assurent que `admin-quality-matrix.json` reste cohérent et à jour.

### Famille 1 — Validation statique (cohérence interne du JSON)

```bash
yarn validate:admin-quality-matrix          # bloquant
yarn validate:admin-quality-matrix --warn   # avertissements seulement
```

Vérifie pour chaque entrée :
- `reviewedAt` est présent et non vide
- Les chemins dans `sourceRefs[].path` (e2e, strapi-api, route) existent sur disque
- Les fichiers listés dans `evidence[]` existent dans `openg7-org/`
- Cohérence `managementBucket` ↔ `summaryStatus` / `e2eStatus` :
  - `summaryStatus=oui` → `managementBucket` doit être `covered`
  - `managementBucket=covered` → `summaryStatus` doit être `oui`
  - `e2eStatus=oui` → `managementBucket` ne doit pas être `proof-gap`

### Famille 2 — Audit de fraîcheur git

```bash
yarn audit:admin-quality-staleness          # rapport lisible
yarn audit:admin-quality-staleness --json   # sortie JSON
yarn audit:admin-quality-staleness --fail   # exit 1 si entrées périmées
```

Pour chaque entrée avec `impactRules` et `reviewedAt`, vérifie si des commits ont touché les préfixes d'impact après la date de revue. Les entrées avec activité git post-revue sont signalées comme potentiellement périmées. Action attendue : mettre à jour `reviewedAt`, `observedGap` et `nextMove`.

### Famille 3 — Garde CI par PR (avertissement dans le commentaire)

Sur chaque PR touchant des entrées de la matrice, le workflow `pr-admin-quality-review.yml` :

1. **Valide la cohérence statique** (`--warn`) — les incohérences apparaissent dans les logs CI
2. **Compare `reviewedAt`** entre le SHA de base et le HEAD pour chaque entrée impactée
3. **Ajoute une section au commentaire PR** :
   - ✅ si toutes les entrées impactées ont leur `reviewedAt` mis à jour
   - ⚠️ avec la liste des entrées non revisitées sinon

Le garde CI est **non-bloquant** (avertissement) : il ne fait pas échouer la PR mais rend visible le manquement. Pour forcer un blocage, remplacer `--warn` par le mode strict dans le workflow.

---

## Tests et non-régression

Les tests des scripts de réconciliation se trouvent dans `scripts/__tests__/` et couvrent :

- `admin-quality-matrix-model.test.mjs` — fonctions utilitaires du modèle (normalisation, impact map)
- `format-pr-quality-comment.test.mjs` — rendu markdown du commentaire PR

Exécution :
```bash
yarn test:scripts
```

Les fixtures de test sont dans `scripts/__tests__/fixtures/` et représentent une matrice minimale connue. Ne pas modifier ces fixtures sans mettre à jour les tests correspondants.
