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
