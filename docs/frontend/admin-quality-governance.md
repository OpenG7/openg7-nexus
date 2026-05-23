# Admin Quality — Gouvernance et règles d'auto-application

Ce document décrit les règles de gouvernance pour le processus de découverte automatique des besoins dans la matrice admin quality, les critères d'auto-application, et les responsabilités de l'opérateur.

## Source de vérité : la base de données Strapi

> La DB est la source de vérité éditoriale. Le fichier JSON est un snapshot généré automatiquement.

Depuis la migration DB-as-source-of-truth :

- **Les champs éditoriaux** (`observedGap`, `nextMove`, `managementBucket`, `priority`, etc.) sont modifiés dans Strapi (via l'interface `/admin/quality` ou l'API `PATCH /admin/quality/matrix/entries/:entryId`).
- **`admin-quality-matrix.json`** est un snapshot exporté — il ne doit pas être modifié manuellement. Modifier ce fichier à la main puis redémarrer Strapi **ne synchronisera pas** les champs (le seed 16 saute si la DB contient déjà des entrées).
- **Le snapshot est régénéré** par `yarn export:admin-quality-matrix` (ou par le workflow CI `sync-admin-quality-matrix-export.yml`). Ce snapshot alimente les gardes-fou CI, la carte d'impact, et les scripts de découverte.

### Cycle de vie d'une modification éditoriale

```
Modification dans la console admin  ──→  DB Strapi (source de vérité)
                                              │
                       yarn export:admin-quality-matrix
                                              │
                                     admin-quality-matrix.json
                                     admin-quality-matrix-impact-map.json
                                              │
                                         git commit + push
```

Le workflow CI `sync-admin-quality-matrix-export.yml` automatise les étapes export + commit (déclenché manuellement ou chaque lundi à 06:00 UTC).

---

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
| `suggest-narrative` | Suggestion IA pour `observedGap` et `nextMove` d'une entrée | Oui — appliqué automatiquement lors de l'acceptation |

Les propositions `suggest-narrative` sont créées par l'endpoint `POST /admin/quality/matrix/entries/:entryId/agent-suggest` (ou le script `yarn agent:admin-quality-narrative`). Elles apparaissent dans l'onglet **Propositions** avec le badge **✦ IA** et un diff de la valeur suggérée. Accepter une telle proposition écrit immédiatement `observedGap` et/ou `nextMove` dans la DB.

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

## Interface opérateur `/admin/quality`

### Onglet Propositions

L'onglet **Propositions** de la console admin quality permet de :

- Filtrer par statut : `A traiter`, `Acceptées`, `Rejetées`, `Toutes`
- Voir le diff de chaque proposition (payload structuré)
- Accepter ou rejeter avec confirmation
- Identifier les suggestions IA via le badge **✦ IA** (type `suggest-narrative`)

Ordre de priorité recommandé :
1. `suggest-narrative` — vérifier et accepter les suggestions IA si pertinentes (appliqué immédiatement dans la DB)
2. `add-source-ref` avec confiance `high` — validation rapide des signaux les plus sûrs
3. `mark-stale` — identifier les entrées sans couverture active
4. `create-entry` avec confiance `medium` — valider si la source représente un besoin réel
5. `create-entry` avec confiance `low` — déprioriser, potentiellement rejeter en bloc

### Composant d'édition inline (`og7-admin-quality-entry-edit`)

Le composant `<og7-admin-quality-entry-edit>` permet d'éditer les champs éditoriaux d'une entrée directement dans la console :

- **Ecart observé** (`observedGap`) et **Prochaine action** (`nextMove`) via textarea
- **Bucket** (`managementBucket`) et **Priorité** (`priority`) via select
- **Necessite travail produit** (`needsProductWorkFirst`) via checkbox
- **Revue le** (`reviewedAt`) via date picker
- Bouton **✦ Suggérer via IA** : déclenche `POST /admin/quality/matrix/entries/:id/agent-suggest` et crée des propositions `suggest-narrative`
- Boutons **Appliquer suggestion IA** : copie `agentObservedGap` / `agentNextMove` dans le champ local pour révision avant sauvegarde

Les modifications sont sauvegardées via `PATCH /admin/quality/matrix/entries/:id` et écrites directement en DB. Exporter ensuite le snapshot avec `yarn export:admin-quality-matrix`.

---

## Modification d'une entrée de la matrice

### Via l'interface admin (recommandé)

1. Ouvrir `/admin/quality`
2. Sélectionner l'entrée à modifier
3. Utiliser le composant d'édition inline (`og7-admin-quality-entry-edit`) — modifier `observedGap`, `nextMove`, `managementBucket`, `priority`, `needsProductWorkFirst`, `reviewedAt`
4. Optionnel : cliquer **✦ Suggérer via IA** pour générer des propositions `suggest-narrative` et les accepter
5. Exporter le snapshot mis à jour :
```bash
yarn export:admin-quality-matrix
git add openg7-org/src/assets/data/admin-quality-matrix.json tools/admin-quality-matrix-impact-map.json
git commit -m "chore(quality): sync matrix snapshot"
```

### Via l'API (scripts ou CLI)

```bash
# Modifier un champ éditorial
curl -X PATCH https://<strapi>/api/admin/quality/matrix/entries/MON-ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"observedGap":"...", "nextMove":"...", "reviewedAt":"2026-05-23"}'

# Générer des suggestions IA pour toutes les entrées
yarn agent:admin-quality-narrative --all --url https://<strapi>

# Exporter le snapshot vers le JSON
yarn export:admin-quality-matrix --url https://<strapi>
```

### Ajouter une nouvelle entrée

Les nouvelles entrées sont ajoutées via la DB. Le seed `16-admin-quality-matrix.ts` bootstrappe la DB au premier démarrage Strapi depuis le JSON. Pour créer une entrée manuellement :

1. Ajouter l'entrée dans `admin-quality-matrix.json` avec les champs obligatoires (`id`, `domain`, `need`, `reviewedAt`)
2. Redémarrer Strapi avec `STRAPI_SEED_AUTO=true` (ou lancer `yarn --cwd strapi sync:admin-quality-matrix`)
3. Vérifier dans l'interface admin que l'entrée est présente
4. Exporter ensuite le snapshot via `yarn export:admin-quality-matrix`

---

## Commandes opérateur

| Commande | Description |
|----------|-------------|
| `yarn export:admin-quality-matrix` | **Exporte le snapshot DB → JSON** (source de vérité = DB) |
| `yarn export:admin-quality-matrix --dry-run` | Affiche le snapshot sans écrire de fichier |
| `yarn agent:admin-quality-narrative --entry ID` | Génère des suggestions IA pour une entrée spécifique |
| `yarn agent:admin-quality-narrative --all` | Génère des suggestions IA pour toutes les entrées |
| `yarn agent:admin-quality-narrative --all --dry-run` | Liste les entrées sans appel API |
| `yarn --cwd strapi sync:admin-quality-matrix` | Re-synchronise le JSON → DB (écrase les modifications DB) |
| `yarn discover:admin-quality-needs` | Lance la découverte de sources dans le dépôt |
| `yarn reconcile:admin-quality-matrix` | Découverte + réconciliation → génère les fichiers de propositions |
| `yarn validate:admin-quality-matrix` | Valide la cohérence statique du snapshot JSON |
| `yarn audit:admin-quality-staleness` | Audit de fraîcheur git par rapport aux `reviewedAt` |
| `yarn validate:admin-quality-impact-map` | Vérifie la cohérence de la carte d'impact |
| `yarn test:scripts` | Lance les tests unitaires des scripts de réconciliation |
| `yarn admin:quality:agent` | Agent d'exécution deterministe (dry-run) |
| `yarn admin:quality:agent:apply` | Agent d'exécution deterministe (applique les actions) |

### Variables d'environnement pour les scripts d'export/agent

| Variable | Description |
|----------|-------------|
| `STRAPI_URL` | URL de l'instance Strapi (défaut : `http://localhost:1337`) |
| `STRAPI_EXPORT_TOKEN` | Token d'API Strapi avec droits Admin/Owner |
| `STRAPI_OWNER_JWT` | Fallback : JWT de session Owner |

### Secrets GitHub Actions

| Secret | Utilisé par |
|--------|-------------|
| `ADMIN_QUALITY_MATRIX_EXPORT_URL` | `sync-admin-quality-matrix-export.yml` |
| `ADMIN_QUALITY_MATRIX_EXPORT_TOKEN` | `sync-admin-quality-matrix-export.yml` |
| `ADMIN_QUALITY_MATRIX_INGEST_URL` | `admin-quality-matrix-sync.yml` |
| `ADMIN_QUALITY_MATRIX_INGEST_TOKEN` | `admin-quality-matrix-sync.yml` |

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
