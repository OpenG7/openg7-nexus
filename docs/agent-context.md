# Contexte système OpenG7 — généré le 2026-05-23T21:53:22.297Z

> Ce fichier est généré automatiquement par `yarn docs:agent`.
> Ne pas modifier manuellement — relancer la commande pour mettre à jour.

---

## Documentation architecturale

### Écosystème (carte des dépôts)

# OpenG7 Ecosystem Map

This repository (`openg7-nexus`) is the orchestration and integration layer. It consumes canonical capabilities from other repos. Domain logic must not be duplicated here.

## Capability -> Canonical Repository

| Capability            | Canonical repo                    | Notes                                             |
| --------------------- | --------------------------------- | ------------------------------------------------- |
| evidence_capsules     | openg7-open-evidence              | Claim -> evidence capsule definitions and formats |
| audit_trail           | openg7-audit-ledger               | Audit event schema, hashing/signing               |
| attention_signals     | openg7-attention-metrics          | Signal definitions and aggregation                |
| friction_guardrails   | openg7-friction-engine            | UX/process friction rules                         |
| ranking_policy        | openg7-ranking-policy             | Ranking rules and provenance                      |
| privacy_methods       | openg7-privacy-lab                | Privacy-by-design methods                         |
| community_thermometer | openg7-community-health-dashboard | Community health metrics                          |

## What is allowed in openg7-nexus

- Integration glue: adapters, clients, wiring for canonical capabilities
- UI composition and feature orchestration
- Platform-specific contracts and runtime config used by the web app or CMS

## What is not allowed here

- Canonical domain schemas, policies, or evidence/audit/metric logic
- Duplicated implementations that should live in a shared `@openg7/*` package
- Re-implementations of canonical repos under new folder names

## Fast Decision Guide

1. Is this domain-defining or reusable across repos? Put it in the canonical repo.
2. Is it only integration or delivery for the platform? It can live here.
3. If in doubt, create a shared package instead of copying.

---

### Architecture Angular (structure domaines)

# Angular app structure — domain-first layout

L'application Angular est désormais organisée autour d'un dossier `src/app/domains/` qui regroupe tout le code lié à un domaine fonctionnel (pages, composants de section, services dédiés, state). Les éléments transverses vivent dans `src/app/shared/`.

```
src/app/
├─ app.component.*
├─ app.routes.ts
├─ core/                     # services et utilitaires transverses
├─ domains/
│  ├─ auth/
│  │  └─ pages/              # login, register, forgot/reset-password, etc.
│  ├─ admin/
│  │  └─ pages/              # admin dashboard, confiance, prévisualisations CMS
│  ├─ account/
│  │  └─ pages/              # profil, favoris, onboarding entreprise
│  ├─ developer/
│  │  └─ pages/              # pages de démonstration (_dev)
│  ├─ enterprise/
│  │  ├─ og7-entreprise.*    # page publique d'une entreprise
│  │  └─ pages/              # parcours d'inscription entreprise
│  ├─ feed/
│  │  └─ feature/            # routes + composants du flux social
│  ├─ home/
│  │  ├─ feature/            # sections de la homepage (hero, statistiques, carte…)
│  │  └─ pages/              # composition de la homepage
│  ├─ marketing/
│  │  └─ pages/              # pages marketing (features, pricing…)
│  ├─ matchmaking/
│  │  ├─ og7-mise-en-relation/
│  │  │  └─ components/      # stepper d'introduction
│  │  └─ sections/           # panneaux de mise en relation
│  ├─ opportunities/
│  │  ├─ sections/           # section « matches » réutilisable
│  │  └─ pages/              # demos timeline opportunité
│  ├─ search/
│  │  └─ feature/            # quick search modal / services associés
│  ├─ statistics/
│  │  └─ pages/              # pages stats publiques
│  └─ static/
│     └─ pages/              # privacy, legal, faq…
├─ shared/
│  ├─ components/            # UI transverses (CTA, hero, formulaires…)
│  ├─ directives/            # directives utilitaires (Ctrl+K, décorations…)
│  └─ styles/                # styles globaux réutilisables
├─ state/                    # signals stores
└─ store/                    # NgRx
```

### Comment lire/écrire du code avec cette structure ?

- **Domaine = point d'entrée** : lorsque l'on ajoute une page ou un composant métier, on crée (ou réutilise) un sous-dossier dans `domains/<domaine>/` et on y place pages, services spécifiques et tests associés.
- **Pages standalone** : toutes les routes chargées dynamiquement depuis `app.routes.ts` vivent sous `domains/<domaine>/pages/` avec un fichier `<slug>.page.ts` qui exporte un composant standalone.
- **Sections réutilisables** : les composants partagés entre plusieurs domaines mais spécifiques à un contexte restent dans le domaine concerné (ex. `domains/opportunities/sections`).
- **Transverse vs. spécifique** : si un composant est réutilisé dans plusieurs domaines non liés, il doit migrer vers `shared/components` et être consommé via l'alias `@app/shared/...`.

### Aliases TypeScript

Pour faciliter les imports après ce refactoring, `tsconfig.json` expose trois alias :

- `@app/*` → `src/app/*`
- `@app/domains/*` → `src/app/domains/*`
- `@app/shared/*` → `src/app/shared/*`

L'objectif est de supprimer les imports relatifs fragiles (`../../..`) dans les nouvelles contributions.

---

### Gouvernance matrice qualité (règles, propositions, workflow CI)

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
| `yarn export:admin-quality-matrix --dry-

[... tronqué]

---

### Agent admin-quality (commandes, actions allowlistées)

# Agent admin-quality

L'agent admin-quality est un orchestrateur local/CI-safe pour faire avancer la matrice `/admin/quality` sans donner carte blanche au code automatique.

Il ne remplace pas la decision produit. Il execute uniquement des actions deterministes allowlistees, produit des preuves, puis s'arrete quand une entree exige une vraie surface produit, un arbitrage de scope ou une revue humaine.

## Commandes

Dry-run, sans modifier les fichiers:

```bash
yarn admin:quality:agent
```

Execution des actions allowlistees:

```bash
yarn admin:quality:agent:apply
```

Boucle plus large avec prebuild et build web:

```bash
yarn admin:quality:agent -- --apply --full
```

Entrer par une ligne de matrice precise:

```bash
yarn admin:quality:agent -- --entry-id advanced-discovery
```

Limiter a une action:

```bash
yarn admin:quality:agent -- --apply --action validate-selectors
```

## Actions allowlistees

- `sync-checklist` -> `yarn sync:checklist`, `yarn checklist:verify`
- `generate-quality-actions` -> `yarn generate:quality-actions`, `yarn validate:quality-actions`
- `generate-sitemap` -> `yarn generate:sitemap`, `yarn workspace @openg7/web validate:sitemap`
- `codegen-contracts` -> `yarn codegen`, `yarn test`
- `validate-selectors` -> `yarn validate:selectors`
- `validate-quality-actions` -> `yarn validate:quality-actions`
- `validate-sitemap` -> `yarn workspace @openg7/web validate:sitemap`
- `checklist-verify` -> `yarn checklist:verify`
- `admin-quality-integration` -> `yarn --cwd strapi test:integration:admin-quality-matrix`
- `lint` -> `yarn lint`
- `prebuild-web` -> `yarn prebuild:web` avec `--include-heavy` ou `--full`
- `build-web` -> `yarn build:web` avec `--full`

## Sorties

Chaque execution ecrit:

- `admin-quality-agent-report.json`
- `admin-quality-agent-report.md`
- `matrix-proof-manifest.json`

Le rapport contient les entrees impactees, les actions lancees ou planifiees, les commandes, les statuts, les fichiers modifies detectes et les entrees bloquees par decision produit.

## Ingestion Strapi

L'agent peut publier le manifest vers `POST /api/admin/quality/matrix/ingest`:

```bash
yarn admin:quality:agent -- --apply --ingest \
  --ingest-url http://localhost:1337/api/admin/quality/matrix/ingest \
  --ingest-token "$STRAPI_ADMIN_QUALITY_INGEST_TOKEN"
```

Variables reconnues si les options CLI sont absentes:

- `ADMIN_QUALITY_MATRIX_INGEST_URL`
- `ADMIN_QUALITY_MATRIX_INGEST_TOKEN`
- `STRAPI_ADMIN_QUALITY_INGEST_TOKEN`

## Garde-fous

- Dry-run par defaut.
- Aucune commande libre n'est acceptee: seules les actions allowlistees peuvent tourner.
- Les actions lourdes demandent `--include-heavy` ou `--full`.
- `--strict` fait echouer le process si des entrees bloquees restent ouvertes.
- Les entrees `product-gap` ou `scope-limit` restent bloquees tant qu'une decision humaine ou produit manque.
- L'ingestion Strapi est optionnelle et exige un token bearer.

## Role dans la boucle verte

L'agent ferme les ecarts mecaniques: selecteurs, checklist, sitemap, discovery, contrats, validations et preuve machine-readable. Quand une ligne reste rouge parce qu'il manque une vraie fonctionnalite, il la laisse visible dans le rapport au lieu de forcer un faux vert.

---

### Sync matrice qualité ↔ Strapi (ingest, recalcul)

# Admin-Quality Matrix Sync

Pour le mode operateur complet de la page `/admin/quality`, voir aussi [`../frontend/admin-quality-matrix-manual.md`](../frontend/admin-quality-matrix-manual.md).

Ce guide couvre le signal post-merge qui maintient la console `admin/quality` en etat `Refresh matrice` lorsqu'un merge sur `main` touche une surface suivie par la matrice. L'ingestion lance aussi un recalcul cible et stocke le dernier plan QA, sans appliquer automatiquement les voyants.

## Vue d'ensemble

La chaine repose sur quatre maillons:

1. Strapi sert la matrice via `GET /api/admin/quality/matrix`.
2. GitHub Actions publie un signal de merge via `.github/workflows/admin-quality-matrix-sync.yml` sur `POST /api/admin/quality/matrix/ingest`.
3. Strapi deduit les lignes impactees, enregistre le signal repo, accepte un `proofManifest` optionnel, lance un recalcul cible, stocke `lastRecalculation` et cree/met a jour une mission pilote.
4. Le front marque une ligne `Refresh matrice` quand `repoSignalAt` ou une mission cloturee est plus recente que `reviewedAt`, et affiche le dernier `Plan auto` quand il existe.

Le workflow ne reecrit pas directement les colonnes metier. Il publie un fait horodate, et Strapi produit un plan QA exploitable qui force une relecture humaine de la ligne impactee.

L'endpoint d'ingestion accepte des `impactedEntryIds` explicites, mais peut aussi les deduire depuis `changedFiles`. La reponse expose `impactMode`, `impactReason`, `providedEntryIds`, `derivedEntryIds` et `resolvedEntryIds` pour diagnostiquer le mapping applique.

L'endpoint accepte aussi `proofManifest` avec `commitSha`, `workflowRunId`, `workflow`, `generatedAt`, `entryIds`, `checks`, `specs`, `artifactUrl` et `status`. Le workflow `.github/workflows/ci-validate.yml` genere `matrix-proof-manifest.json` apres validations reussies, l'upload comme artifact et le republie vers Strapi sur `push main` quand les secrets d'ingestion sont configures.

## Secrets requis

### Cote Strapi

- `STRAPI_ADMIN_QUALITY_INGEST_TOKEN`

Usage:

- secret bearer attendu par `POST /api/admin/quality/matrix/ingest`
- configure par environnement, jamais committe

Exemple:

```env
STRAPI_ADMIN_QUALITY_INGEST_TOKEN=change-me-long-random-token
```

### Cote GitHub Actions

- `ADMIN_QUALITY_MATRIX_INGEST_URL`
- `ADMIN_QUALITY_MATRIX_INGEST_TOKEN`

Usage:

- `ADMIN_QUALITY_MATRIX_INGEST_URL` pointe vers l'endpoint de l'environnement cible
- `ADMIN_QUALITY_MATRIX_INGEST_TOKEN` doit etre strictement identique a `STRAPI_ADMIN_QUALITY_INGEST_TOKEN`

Exemple preprod:

```txt
ADMIN_QUALITY_MATRIX_INGEST_URL=https://cms.preprod.openg7.org/api/admin/quality/matrix/ingest
ADMIN_QUALITY_MATRIX_INGEST_TOKEN=<meme valeur que STRAPI_ADMIN_QUALITY_INGEST_TOKEN cote preprod>
```

Exemple prod:

```txt
ADMIN_QUALITY_MATRIX_INGEST_URL=https://cms.openg7.org/api/admin/quality/matrix/ingest
ADMIN_QUALITY_MATRIX_INGEST_TOKEN=<meme valeur que STRAPI_ADMIN_QUALITY_INGEST_TOKEN cote prod>
```

## Branchement initial

1. Definir `STRAPI_ADMIN_QUALITY_INGEST_TOKEN` dans le runtime Strapi de l'environnement vise.
2. Ajouter dans GitHub les secrets `ADMIN_QUALITY_MATRIX_INGEST_URL` et `ADMIN_QUALITY_MATRIX_INGEST_TOKEN`.
3. Verifier que `.github/workflows/admin-quality-matrix-sync.yml` est actif sur `push` vers `main`.
4. Faire un merge test qui touche une surface mappee.
5. Confirmer dans `admin/quality` que la ligne correspondante passe en `Refresh matrice` et qu'un badge `Plan auto` apparait apres ingestion.

## Rotation des secrets

La rotation doit etre atomique par environnement.

1. Generer un nouveau token aleatoire.
2. Mettre a jour `STRAPI_ADMIN_QUALITY_INGEST_TOKEN` dans l'environnement Strapi cible.
3. Mettre a jour `ADMIN_QUALITY_MATRIX_INGEST_TOKEN` dans GitHub Actions avec exactement la meme valeur.
4. Lancer un merge test ou un `workflow_dispatch` de verification.
5. Verifier que le workflow publie toujours `200` sur l'endpoint d'ingestion.

Regle:

- ne pas reutiliser le meme token entre preprod et prod
- ne pas changer l'URL GitHub pour pointer par erreur vers un autre environnement

## Diagnostic rapide

### Le workflow ne publie rien

Verifier:

1. que `ADMIN_QUALITY_MATRIX_INGEST_URL` existe dans les secrets du repo
2. que `ADMIN_QUALITY_MATRIX_INGEST_TOKEN` existe aussi
3. que le merge a bien eu lieu sur `main`

Comportement attendu:

- si un secret manque, le workflow skippe proprement la publication

### Le workflow publie mais Strapi renvoie `401`

Verifier:

1. que `ADMIN_QUALITY_MATRIX_INGEST_TOKEN` cote GitHub est identique a `STRAPI_ADMIN_QUALITY_INGEST_TOKEN`
2. qu'il n'y a ni espaces ni retour ligne parasite dans la valeur du secret

### Le workflow publie `200` mais la mauvaise ligne remonte

Verifier:

1. les `impactRules` canoniques dans `openg7-org/src/assets/data/admin-quality-matrix.json`
2. l'artefact derive `tools/admin-quality-matrix-impact-map.json`
3. les fichiers reels modifies par le merge
4. si le changement aurait du etre traite comme impact global plutot que cible

### Le workflow publie `200` mais aucun plan auto n'apparait

Verifier:

1. que `resolvedEntryIds` contient au moins une entree existante dans Strapi
2. que la reponse d'ingestion contient `recalculation.generatedAt`
3. que `GET /api/admin/quality/matrix` retourne `entries[].lastRecalculation`

### Les propositions de besoins ne remontent pas

Verifier:

1. que le script a ete lance avec `yarn reconcile:admin-quality-matrix -- --ingest`;
2. que l'URL cible pointe vers `POST /api/admin/quality/matrix/proposals/ingest`;
3. que le bearer token correspond a `STRAPI_ADMIN_QUALITY_INGEST_TOKEN`;
4. que `GET /api/admin/quality/matrix/proposals` retourne les propositions stockees.

## Validations a lancer

Localement:

```bash
yarn --cwd strapi test:integration:admin-quality-matrix
node scripts/resolve-admin-quality-matrix-impact.mjs openg7-org/src/app/domains/feed/feature/feed.page.ts
yarn reconcile:admin-quality-matrix
```

En CI:

- `.github/workflows/ci-valid

[... tronqué]

---

### APIs temps réel Strapi

# Realtime and social APIs (Strapi)

Updated: 2026-02-10

This document describes the backend APIs implemented in `strapi/src/api/feed`, `strapi/src/api/corridors`, and `strapi/src/api/connection`.

## 1. Authentication and session model

- `GET /api/feed`, `POST /api/feed`, `GET /api/feed/stream`, and all `/api/connections*` routes require an authenticated JWT.
- Feed endpoints additionally validate the active session token (`sid` / `sv`) via `strapi/src/utils/auth-sessions.ts`.
- `GET /api/feed/highlights` and `GET /api/corridors/realtime` are public read endpoints.

## 2. Feed API

## 2.1 `GET /api/feed`

Purpose: authenticated paginated feed with cursor support.

Query parameters:

- `limit` (1..100, default `20`)
- `sort` (`NEWEST`, `URGENCY`, `VOLUME`, `CREDIBILITY`)
- `type` (`OFFER`, `REQUEST`, `ALERT`, `TENDER`, `CAPACITY`, `INDICATOR`)
- `mode` (`EXPORT`, `IMPORT`, `BOTH`)
- `sector` or `sectorId`
- `fromProvince` or `fromProvinceId`
- `toProvince` or `toProvinceId`
- `q` (search text)
- `cursor` (opaque base64url token returned by previous page)

Response:

- `data`: array of normalized feed items
- `cursor`: next cursor or `null`

Notes:

- Cursor + sort must match; mismatch returns `400`.
- Only `status=confirmed` items are returned.

## 2.2 `POST /api/feed`

Purpose: authenticated feed item creation.

Accepted payload keys (`data` wrapper optional):

- `type`, `title`, `summary`, `mode`
- `sectorId`, `fromProvinceId`, `toProvinceId`
- `quantity` (`value`, `unit`)
- `urgency`, `credibility`
- `tags`, `accessibilitySummary`, `geo`

Validation highlights:

- `title` min length `3`
- `summary` min length `10`
- `quantity` requires positive numeric `value` and supported `unit`

Idempotency:

- `Idempotency-Key` header is supported.
- If a matching item already exists for the same user + key, API returns that existing item.

Success response:

- `201` with `data` item.
- Broadcasts `feed.item.created` to SSE clients.

## 2.3 `GET /api/feed/highlights`

Purpose: public home highlights endpoint aligned with front filters.

Query parameters:

- `scope`: `canada` (default), `g7`, `world`
- `filter`: `all` (default), `offer`, `request`, `labor`, `transport`
- `q` or `search`
- `limit` (1..100, default `20`)
- Optional explicit overrides: `type`, `tag`

Response:

- `data`: filtered highlight items
- `meta`: `{ scope, filter, search, limit, count }`

Caching:

- `Cache-Control: public, max-age=30, stale-while-revalidate=30`

## 2.4 `GET /api/feed/stream`

Purpose: authenticated Server-Sent Events stream for feed updates.

SSE behavior:

- Content type: `text/event-stream; charset=utf-8`
- Heartbeat every `15s`
- Envelope shape:
  - `eventId`
  - `type` (`feed.item.created`, `feed.item.updated`, `feed.item.deleted`)
  - `payload`
  - `cursor` (optional)

## 3. Corridors realtime API

## 3.1 `GET /api/corridors/realtime`

Purpose: public payload for `HomeCorridorsRealtimeService`.

Query parameters:

- `limit` (1..12, default `5`)

Response shape:

- `titleKey`, `subtitleKey`
- `items[]` with `{ id, label, route, meta }`
- `status` with `{ level, labelKey }`
- `cta` with `{ labelKey }`
- `timestamp`

Fallback behavior:

- On query/build failure, returns a safe empty snapshot instead of hard failing.
- Success cache header: `Cache-Control: public, max-age=15, stale-while-revalidate=30`.

## 4. Connections API

## 4.1 `POST /api/connections`

Purpose: create a persistent connection entry for current user.

Required payload (`data` wrapper optional):

- `match`
- `buyer_profile`
- `supplier_profile`
- `intro_message` (20..2000 chars)
- `meeting_proposal` (1..8 ISO datetimes)

Optional payload:

- `locale` (`fr` or `en`)
- `attachments` (`nda`, `rfq`)
- `logistics_plan` (`incoterm`, `transports`)

Response:

- `201` with created connection and initial stage/status history.

## 4.2 `GET /api/connections`

Purpose: paginated history for current authenticated user.

Query parameters:

- `limit` (1..100, default `20`)
- `offset` (defa

[... tronqué]

---

### Dispatch Codex (opérations via IA)

# Admin Ops AI Dispatch

This guide documents the Strapi backend endpoint used to trigger provider-specific GitHub Actions workflows from an owner/admin surface.

## Endpoint

- `GET /api/admin/ops/ai/proofs`
- `POST /api/admin/ops/ai/dispatch`
- Compatibility alias: `POST /api/admin/ops/codex/dispatch`
- Auth: authenticated user with role `Admin` or `Owner`
- Policy: `global::owner-admin-ops`

## Proof telemetry response

`GET /api/admin/ops/ai/proofs` returns the latest observable GitHub evidence for each provider workflow. The response is read-only and meant for Mission Control / Ops dashboards.

```json
{
  "data": {
    "generatedAt": "2026-04-30T12:00:00.000Z",
    "providers": [
      {
        "provider": "codex",
        "label": "Codex",
        "workflow": "codex-pr.yml",
        "state": "completed",
        "summary": "Workflow #51 completed with 2 artifact(s) and PR #321.",
        "run": {
          "id": 501,
          "number": 51,
          "url": "https://github.com/OpenG7/openg7-nexus/actions/runs/501",
          "status": "completed",
          "conclusion": "success",
          "branch": "codex/qa-proof-501",
          "createdAt": "2026-04-30T00:00:00.000Z",
          "updatedAt": "2026-04-30T00:08:00.000Z"
        },
        "artifacts": [
          {
            "id": 9001,
            "name": "playwright-report",
            "sizeBytes": 2048,
            "expired": false,
            "url": "https://github.com/OpenG7/openg7-nexus/actions/runs/501#artifacts"
          }
        ],
        "pullRequest": {
          "number": 321,
          "title": "Codex QA proof package",
          "url": "https://github.com/OpenG7/openg7-nexus/pull/321",
          "state": "open",
          "merged": false,
          "branch": "codex/qa-proof-501"
        }
      }
    ]
  }
}
```

States are intentionally coarse:

- `queued` -> the workflow has been accepted by GitHub and is waiting to start.
- `in-progress` -> the provider lane is actively generating proof.
- `completed` -> the latest run finished successfully and artifacts/PR evidence can be reviewed.
- `failed` -> the latest run finished but did not conclude successfully.
- `unavailable` -> no run is observable yet or GitHub monitoring is not configured.

## Request payload

```json
{
  "provider": "copilot",
  "task": "Fix the login empty state and add a focused test.",
  "scope": "openg7-org",
  "baseBranch": "main",
  "draftPr": true,
  "model": "gpt-5.4",
  "effort": "medium"
}
```

## Validation rules

- `provider` accepts `codex`, `copilot`, `claude`, or `gemini`. Omit it to keep the legacy `codex` default.
- `provider` is used by Strapi to select the target workflow and is not forwarded to GitHub Actions.
- `task` is required and trimmed to 2000 characters.
- `scope` must belong to the allowlist resolved for the selected provider.
- `baseBranch` must belong to the branch allowlist resolved for the selected provider.
- `draftPr` defaults to `true`.
- `model` and `effort` are optional pass-through fields.

## Environment variables

- `OPS_CODEX_DISPATCH_ENABLED` - set to `true` to enable the endpoint.
- `OPS_CODEX_GITHUB_TOKEN` - GitHub token or GitHub App installation token used to call the Actions API.
- `OPS_CODEX_GITHUB_OWNER` - repository owner.
- `OPS_CODEX_GITHUB_REPO` - repository name.
- `OPS_CODEX_GITHUB_WORKFLOW` - workflow file or workflow identifier, default `codex-pr.yml`.
- `OPS_CODEX_GITHUB_REF` - git ref used for the dispatch API call, default `main`.
- `OPS_CODEX_GITHUB_API_URL` - defaults to `https://api.github.com`; override for GitHub Enterprise.
- `OPS_CODEX_ALLOWED_SCOPES` - comma-separated allowlist of workflow scopes.
- `OPS_CODEX_ALLOWED_BASE_BRANCHES` - comma-separated allowlist of base branches accepted from callers.
- `OPS_CODEX_TIMEOUT_MS` - outbound GitHub API timeout in milliseconds.

Optional multi-provider overrides use the `OPS_AI_*` namespace:

- `OPS_AI_GITHUB_TOKEN`, `OPS_AI_GITHUB_OWNER`, `OPS_AI_GITHUB_REPO`, `OPS_AI_GITHUB_API_URL`
- `OPS_AI_ALLOWED_SCOPES`, `OPS_AI_ALLOWED_BASE_BRANCHES`, `OPS_AI_TIMEOUT_MS`
- `OPS_AI_<PROVIDER>_DISPATCH_ENABLED`
- `OPS_AI_<PROVIDER>_GITHUB_WORKFLOW`
- `OPS_AI_<PROVIDER>_GITHUB_REF`

`<PROVIDER>` can be `COPILOT`, `CLAUDE`, or `GEMINI`. Non-Codex providers fall back to `OPS_AI_*` first and then to the legacy `OPS_CODEX_*` values for shared GitHub owner/repo/token settings.

## Workflow files and provider secrets

- `codex` -> `.github/workflows/codex-pr.yml` using `OPENAI_API_KEY`
- `claude` -> `.github/workflows/claude-pr.yml` using `ANTHROPIC_API_KEY`
- `gemini` -> `.github/workflows/gemini-pr.yml` using `GEMINI_API_KEY` by default; adapt the workflow if you prefer Vertex AI or Gemini Code Assist via repository variables
- `copilot` -> `.github/workflows/copilot-pr.yml` is a guarded placeholder that fails fast on purpose; keep `OPS_AI_COPILOT_DISPATCH_ENABLED=false` until GitHub exposes a stable automation surface for Copilot branch-and-PR runs in this reposit

[... tronqué]

---

### Cas d'usage métier

# Cas d'usage en langage courant pour OpenG7

## Pourquoi ce document

OpenG7 traite des situations metier qui peuvent vite devenir techniques. Avant de parler API, ecrans, schemas ou automatisation, il faut souvent partir d'une phrase simple que tout le monde comprend.

Ce document sert a cadrer un besoin en langage courant :

- qui vit la situation ;
- ce qui se passe ;
- ce qui bloque ou ce qui devient possible ;
- ce que la plateforme doit permettre ;
- quelles informations minimales il faut capturer.

L'objectif est d'avoir un point de depart partage entre produit, operations, partenaires, design, donnees et developpement.

## Comment utiliser ce format

Un bon cas d'usage de depart tient en une page et repond a ces questions :

1. Qui est l'acteur principal ?
2. Quel evenement declenche le besoin ?
3. Quel est l'impact concret sur le terrain ?
4. Que veut faire l'acteur dans OpenG7 ?
5. Qui doit voir l'information ou pouvoir reagir ?
6. Quelles donnees minimales faut-il saisir ?
7. A quoi ressemble un bon resultat ?

## Reperes simples

Pour enrichir la plateforme, on peut partir de quatre types de situations :

- `alerte` : quelque chose bloque, ralentit ou change brutalement ;
- `opportunite` : un volume, une capacite ou une ressource devient disponible ;
- `besoin` : un acteur cherche une solution, un fournisseur, un transporteur ou un acheteur ;
- `mise en relation` : la plateforme aide deux ou plusieurs acteurs a se trouver rapidement.

Un meme cas d'usage peut combiner plusieurs types. Par exemple, une fermeture logistique peut creer a la fois une alerte, un besoin de remplacement et une opportunite ailleurs.

## Exemple 1 - Hydro-Quebec a des surplus d'electricite

### Situation

Hydro-Quebec dispose d'un surplus d'electricite sur une periode donnee. Son enjeu n'est pas seulement de declarer ce surplus, mais d'eviter qu'une capacite disponible reste inutilisee alors qu'elle pourrait aider d'autres acteurs. Elle veut donc rendre cette disponibilite visible, compréhensible et assez precise pour declencher une reaction utile.

### Ce que cela veut dire en langage courant

- une organisation vient sur la plateforme parce qu'elle cherche a transformer une capacite disponible en possibilite concrete pour d'autres ;
- elle commence par se rendre identifiable, parce qu'une information strategique n'a de valeur que si sa source est claire ;
- elle complete son profil pour inspirer confiance avant meme de publier le surplus ;
- elle declare ensuite la disponibilite parce qu'elle veut passer d'un constat interne a un signal partage ;
- elle precise ou, quand, en quelle quantite et sous quelles contraintes, parce qu'un surplus mal cadre provoque surtout des echanges inutiles ;
- elle publie enfin l'information pour que les acteurs capables d'acheter, d'absorber ou de redistribuer puissent se reconnaitre dans le cas et reagir rapidement.

### Si un acheteur soumet une demande pour une quantite precise

Le vrai parcours ne s'arrete pas au moment ou un acheteur dit : `je veux acheter 150 MW` ou `je peux absorber 40 pour cent du volume disponible`. A partir de ce moment, la question change. On ne cherche plus seulement a rendre un surplus visible. On cherche a accompagner une relation d'affaires jusqu'au point ou les deux parties savent clairement si elles vont avancer ensemble, partiellement, plus tard, ou pas du tout.

En langage simple :

- un acheteur se manifeste parce qu'il pense que ce surplus peut repondre a un besoin reel de son cote ;
- le vendeur veut savoir si la demande est serieuse, solvable et compatible avec ses contraintes ;
- l'acheteur veut savoir si le volume promis est reellement disponible, accessible et livrable dans sa fenetre de temps ;
- les deux parties ont besoin d'un espace ou clarifier la quantite, les dates, le point de livraison, les contraintes de transport, le cadre reglementaire et les conditions commerciales ;
- tant que ces elements ne sont pas clarifies, il ne s'agit pas encore d'une relation d'affaires aboutie mais d'une intention en cours de qualification.

### Comment le systeme peut accompagner la relation jusqu'au bout

Le systeme peut accompagner la relation en faisant evoluer le cas d'un simple signal vers un dossier partage et suivi.

1. Il capte l'intention initiale.
   L'acheteur indique la quantite souhaitee, la periode, ses contraintes majeures et son niveau d'urgence.

2. Il qualifie la demande.
   Le systeme aide a verifier si la demande est compatible avec le surplus publie : volume, calendrier, zone, interconnexion, cadre contractuel, priorites du vendeur.

3. Il ouvre un espace de clarification.
   Les deux parties peuvent poser des questions, joindre des documents, demander des precisions, reformuler la quantite ou proposer un decoupage du volume.

4. Il rend visible l'etat de la relation.
   Par exemple : `nouvelle marque d'interet`, `en qualification`, `en discussion`, `cond

[... tronqué]

---

### Roadmap

# Feuille de route (aperçu)

Cette feuille de route synthétique aide la communauté à prioriser les contributions. Les échéances sont indicatives.

## Q4 2025 — Stabilisation & ouverture

- **Observabilité produit** : instrumentation des principaux parcours et hooks `[data-og7]` restants.
- **Accessibilité** : audits ARIA sur les composants map et formulaires (contrast, focus, lecteurs d'écran).
- **Documentation** : compléter les exemples SSR/Strapi (preview, tokens read-only) et guides d'intégration.

## Q1 2026 — Fonctionnalités

- **Recherche** : indexation Meilisearch/OpenSearch pour les entreprises et échanges, avec filtres avancés.
- **Mode pro** : flags UI pour fonctionnalités avancées (tableaux comparatifs, exports sécurisés).
- **Collaboration** : amélioration des workflows d'onboarding multi-rôle et notifications.

## Backlog ouvert

- **Good first issues** : petits correctifs UI, libellés i18n manquants, améliorations de documentation.
- **Help wanted** : intégration de tests E2E ciblés et optimisation des seeds Strapi pour la pré-production.

Les contributions nouvelles sont évaluées selon l'impact utilisateur, la maintenance long terme et l'alignement avec ces priorités.

---

## Endpoints Strapi disponibles

```
  GET    /users/me/profile                                            → account-profile.me
  GET    /users/me/profile/export                                     → account-profile.exportMe
  GET    /users/me/profile/sessions                                   → account-profile.sessionsMe
  POST   /users/me/profile/sessions/logout-others                     → account-profile.logoutOtherSessions
  PUT    /users/me/profile                                            → account-profile.updateMe
  POST   /users/me/profile/email-change                               → account-profile.requestEmailChange
  GET    /admin/ops/health                                            → admin-ops.health
  GET    /admin/ops/backups                                           → admin-ops.backups
  GET    /admin/ops/imports                                           → admin-ops.imports
  GET    /admin/ops/security                                          → admin-ops.security
  GET    /admin/ops/audit-log                                         → admin-ops.auditLog
  GET    /admin/ops/ai/proofs                                         → admin-ops.proofs
  POST   /admin/ops/ai/dispatch                                       → admin-ops.dispatchCodexWorkflow
  POST   /admin/ops/codex/dispatch                                    → admin-ops.dispatchCodexWorkflow
  GET    /admin/quality/matrix                                        → admin-quality-matrix.snapshot
  POST   /admin/quality/matrix/recalculate                            → admin-quality-matrix.recalculate
  POST   /admin/quality/matrix/apply-proposal                         → admin-quality-matrix.applyProposal
  GET    /admin/quality/matrix/proposals                              → admin-quality-matrix.listNeedProposals
  PATCH  /admin/quality/matrix/proposals/:proposalId                  → admin-quality-matrix.patchNeedProposal
  POST   /admin/quality/matrix/proposals/ingest                       → admin-quality-matrix.ingestNeedProposals
  POST   /admin/quality/matrix/ingest                                 → admin-quality-matrix.ingest
  GET    /admin/quality/matrix/export                                 → admin-quality-matrix.exportMatrix
  PATCH  /admin/quality/matrix/entries/:entryId                       → admin-quality-matrix.editMatrixEntry
  POST   /admin/quality/matrix/entries/:entryId/agent-suggest         → admin-quality-matrix.agentSuggestNarrative
  POST   /admin/quality/matrix/chat                                   → admin-quality-matrix.chatWithAgent
  GET    /admin/quality/mission-decisions                             → admin-quality-mission-decision.list
  PUT    /admin/quality/mission-decisions/:recommendationId           → admin-quality-mission-decision.upsert
  DELETE /admin/quality/mission-decisions/:recommendationId           → admin-quality-mission-decision.delete
  POST   /analytics/events                                            → analytics.events
  POST   /import/companies                                            → company-import.importCompanies
  POST   /import/companies/bulk-import                                → company-import-bulk.start
  GET    /import/companies/jobs/:jobId                                → company-import-bulk.status
  POST   /import/companies/jobs/:jobId/cancel                         → company-import-bulk.cancel
  GET    /import/companies/jobs/:jobId/report                         → company-import-bulk.report
  GET    /import/companies/jobs/:jobId/errors                         → company-import-bulk.errors
  GET    /import/companies/jobs/:jobId/events                         → company-import-bulk.events
  POST   /connections                                                 → connection.create
  GET    /connections                                                 → connection.history
  GET    /connections/:id                                             → connection.findOne
  PATCH  /connections/:id/status                                      → connection.updateStatus
  GET    /corridors/realtime                                          → corridors.realtime
  GET    /feed                                                        → feed.index
  POST   /feed                                                        → feed.create
  GET    /feed/highlights                                             → feed.highlights
  GET    /feed/stream                                                 → feed.stream
  GET    /feed/:id                                                    → feed.findOne
  GET    /users/me/feed-actions                                       → feed-action.me
  POST   /users/me/feed-actions                                       → feed-action.createMe
  GET    /homepage/preview                                            → homepage.preview
  GET    /hydrocarbon-signals                                         → hydrocarbon-signal.find
  GET    /hydrocarbon-signals/:id                                     → hydrocarbon-signal.findOne
  GET    /import-flows                                                → importation.flows
  GET    /import-commodities                                          → importation.commodities
  GET    /import-risk-flags                                           → importation.riskFlags
  GET    /import-suppliers                                            → importation.suppliers
  GET    /import-knowledge                                            → importation.knowledge
  GET    /import-annotations                                          → importation.annotations
  GET    /import-watchlists                                           → importation.watchlists
  POST   /import-watchlists                                           → importation.createWatchlist
  PUT    /import-watchlists/:id                                       → importation.updateWatchlist
  POST   /import-reports/schedule                                     → importation.scheduleReport
  GET    /projects                                                    → national-project.find
  GET    /projects/:id                                                → national-project.findOne
  POST   /projects                                                    → national-project.create
  PUT    /projects/:id                                                → national-project.update
  DELETE /projects/:id                                                → national-project.delete
  GET    /users/me/opportunity-offers                                 → opportunity-offer.me
  POST   /users/me/opportunity-offers                                 → opportunity-offer.createMe
  POST   /users/me/opportunity-offer-attachments                      → opportunity-offer.uploadAttachment
  GET    /users/me/saved-searches                                     → saved-search.me
  POST   /users/me/saved-searches                                     → saved-search.createMe
  PATCH  /users/me/saved-searches/:id                                 → saved-search.updateMe
  DELETE /users/me/saved-searches/:id                                 → saved-search.deleteMe
  GET    /search                                                      → search.index
  GET    /statistics                                                  → statistics.find
  GET    /users/me/alerts                                             → user-alert.me
  POST   /users/me/alerts                                             → user-alert.createMe
  POST   /users/me/alerts/generate                                    → user-alert.generateFromSavedSearches
  PATCH  /users/me/alerts/:id/read                                    → user-alert.markReadMe
  PATCH  /users/me/alerts/read-all                                    → user-alert.markAllReadMe
  DELETE /users/me/alerts/read                                        → user-alert.deleteReadMe
  DELETE /users/me/alerts/:id                                         → user-alert.deleteMe
  GET    /users/me/favorites                                          → user-favorite.me
  POST   /users/me/favorites                                          → user-favorite.createMe
  DELETE /users/me/favorites/:id                                      → user-favorite.deleteMe
```

---

## Domaines Angular et pages

```
  account            alerts.page, favorites.page, profile.page, saved-searches.page
  admin              admin-ops.page, admin-quality.page, admin-trust.page, admin.page, admin-quality-workspace-drawer.component
  auth               access-denied.page, account-open.page, auth-callback.page, forgot-password.page, login.page, register.page, reset-password.page
  developer          component-lab.page, openlayers-demo.page
  enterprise         company-register.page
  feed               feed-draft-prefill.helpers, feed-item-query, feed-item.helpers, feed-offer-submission.helpers, feed-route-filters, feed.page, feed.routes
  home               home.page
  importation        importation.page
  marketing          features.page, pricing.page, strategic-sectors.models, strategic-sectors.page
  matchmaking        linkup-detail.page, linkup-history.page, linkup.page
  opportunities      
  partners           partner-details.page
  search             search-api.service, search-history.store, search-keyboard.manager, search.service
  static             credits.page, faq.page, governance.page, legal.page, privacy.page, terms.page
  statistics         statistics.page
```

---

## Packages @openg7 (public API)

```
  @openg7/admin-quality (25 modules) : ./lib/admin-quality.tokens, ./lib/data-access/admin-ai-providers, ./lib/data-access/admin-quality-agent-actions, ./lib/data-access/admin-quality-agent-advisor.service, ./lib/data-access/admin-ops.service, ./lib/data-access/admin-quality-browser.service, ./lib/data-access/admin-quality-matrix.service, ./lib/data-access/admin-quality-mission-decisions.service, ./lib/feature/admin-quality-workspace-drawer.component, ./lib/pages/admin-navigation-pills.component, ./lib/pages/admin-quality-agent-panel.component, ./lib/pages/admin-quality-action-registry, ./lib/pages/admin-quality-combobox.component, ./lib/pages/admin-quality-command-rail.component, ./lib/pages/admin-quality-coverage-matrix.component, ./lib/pages/admin-quality-delegation, ./lib/pages/admin-quality-domain-icon.component, ./lib/pages/admin-quality-mission-actions, ./lib/pages/admin-quality-mission-control, ./lib/pages/admin-quality-mission-control.component, ./lib/pages/admin-quality-mission-task-planner, ./lib/pages/admin-quality-agent-chat.component, ./lib/pages/admin-quality-entry-edit.component, ./lib/pages/admin-quality-needs-proposal-panel.component, ./lib/pages/admin-quality.page
```
