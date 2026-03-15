# OpenG7

![OpenG7 Platform](docs/assets/banner-openg7-nexus.png)

Open-source platform for exploring interprovincial exchanges, company intelligence, and operational trade planning.

## Investor Pitch

OpenG7 turns fragmented ecosystem, trade, and company data into a usable operational platform. Instead of working across disconnected spreadsheets, CMS entries, and ad hoc dashboards, teams get a shared product surface for discovery, mapping, imports, alerts, and observability.

Funding this repository helps deliver:
- Decision-grade visibility across companies, sectors, corridors, and statistics
- A vendor-neutral stack built on Angular, Strapi, and shared API contracts
- Faster onboarding and safer operations through seeds, selectors, docs, and tooling
- A stronger bridge between product UX, content operations, and integration workflows

Near-term funding unlocks:
- Better data ingestion and import workflows
- Stronger analytics, alerting, and feed experiences
- More resilient SSR, runtime configuration, and search integration
- Hardening of admin and operator tooling for real production use

How to support:
- GitHub Sponsors
- Pilot partnerships
- Data and integration partnerships
- In-kind infrastructure or expert review

---

**Languages:** [English](#english) | [Français](#francais)

<a id="english"></a>

## English

### What it is

OpenG7 is an open-source monorepo for an interprovincial exchange platform. It combines:
- an Angular front-end in `openg7-org/`
- a Strapi CMS in `strapi/`
- shared API contracts in `packages/contracts/`
- shared tooling and validation utilities in `packages/` and `tools/`

The platform already includes a trade map, company and import workflows, search, feed experiences, account areas, and operational admin surfaces.

### Why it exists

Trade and ecosystem workflows usually fail at the handoff points: fragmented data, slow content updates, disconnected operational tools, and no shared view of what is happening across sectors and corridors.

OpenG7 exists to provide:
- a unified product surface for exploration, discovery, and monitoring
- shared contracts between front-end and CMS
- reusable UI hooks and selectors for instrumentation and testing
- a documented platform foundation that can grow across multiple repos and packages

### What it enables

- Company discovery and directory experiences
- Interprovincial trade and corridor mapping
- Search, saved searches, favorites, and alerts
- Feed and detail pages for opportunities, alerts, and indicators
- Company import and bulk import workflows
- Admin operations endpoints for runtime health, backups, imports, and security

### Repository Structure

- `openg7-org/`: Angular application, SSR/runtime config, Playwright and unit tests
- `strapi/`: CMS, seeds, policies, backend APIs, and integration scripts
- `packages/contracts/`: shared API contracts and validation
- `packages/tooling/`: repo-level tooling such as selector validation
- `docs/`: onboarding, architecture, frontend, Strapi, ecosystem, and roadmap docs
- `infra/`: deployment and infrastructure manifests

### Getting Started

1. Enable Corepack and verify Yarn:
   ```bash
   corepack enable
   yarn --version
   ```
2. Install dependencies:
   ```bash
   yarn install
   ```
3. If you want custom local credentials, create `strapi/.env` and set `STRAPI_ADMIN_*`.
   For a simple local setup without external services, prefer local-friendly values such as `DATABASE_CLIENT=sqlite`.
4. Start Strapi:
   ```bash
   yarn dev:cms
   ```
5. Start the Angular front-end in a second terminal:
   ```bash
   yarn dev:web
   ```
6. In development, Strapi seeds create or update the admin account automatically from `STRAPI_ADMIN_*`.

> On Windows, `Run-Installer-pwsh.cmd` runs `install-dev-basics_robuste.ps1` to prepare the environment and offers a menu for the main `yarn` commands.

Useful repo-level scripts:
- `yarn test:e2e`: run the full Playwright end-to-end suite from the monorepo root
- `yarn test:e2e:smoke`: run the critical smoke journey only
- `yarn test:e2e:regression`: run the broader regression journey
- `yarn predeploy:preprod`: run pre-production checks plus the smoke E2E gate
- `yarn predeploy:preprod:full`: run the same checks plus the full E2E suite

Detailed guides live in `docs/`:
- `docs/getting-started.md`: onboarding and local setup details
- `docs/frontend/`: Angular architecture, selectors, UX notes
- `docs/strapi/`: CMS conventions and seed behavior
- `docs/first-contribution.md`: first PR checklist
- `docs/roadmap.md`: roadmap and priorities

### Ops Dashboard

The platform includes admin operations surfaces for monitoring runtime health and platform status.

- Frontend route: `/admin/ops` for the admin UI
- API endpoints:
  - `GET /api/admin/ops/health`
  - `GET /api/admin/ops/backups`
  - `GET /api/admin/ops/imports`
  - `GET /api/admin/ops/security`
- API policy: `global::owner-admin-ops`
- API access: roles `Admin` and `Owner`
- Frontend access to `/admin/ops`: currently admin-only

### Where does code live?

- Read `CHARTER.md` for scope and non-goals
- Use `docs/ecosystem/ECOSYSTEM-MAP.md` to find the canonical repo for a capability
- If logic must be shared across repos, create a shared `@openg7/*` package instead of copying it
- This platform is primarily orchestration and integration, not the canonical home for every domain concern

### Contributing

Read `CONTRIBUTING.md` for the workflow, required checks, and secret management policy.
The code of conduct in `CODE_OF_CONDUCT.md` applies to all community spaces.
Support and governance details live in `SUPPORT.md`.

Community first steps:
- Use the issue and PR templates
- Look for `good first issue` and `help wanted`
- Add screenshots for visible UI changes
- Document any configuration or security impact in your change

### License & Security

- License: MIT (`LICENSE`)
- Responsible disclosure: see `SECURITY.md`

---

<a id="francais"></a>

## Français

### Ce que c'est

OpenG7 est un monorepo open source pour une plateforme d'exploration des échanges interprovinciaux. Il regroupe :
- un front Angular dans `openg7-org/`
- un CMS Strapi dans `strapi/`
- des contrats d'API partagés dans `packages/contracts/`
- des outils partagés de validation et de support dans `packages/` et `tools/`

La plateforme inclut déjà une carte, des parcours entreprises et importation, de la recherche, des flux feed, des espaces compte, et des surfaces d'administration opérationnelle.

### Pourquoi ce projet existe

Les parcours métier échouent souvent aux points de friction : données dispersées, mises à jour de contenu lentes, outils d'exploitation déconnectés, et faible visibilité commune sur ce qui se passe entre secteurs, corridors et entreprises.

OpenG7 sert à fournir :
- une surface produit unifiée pour explorer, découvrir et suivre l'activité
- des contrats partagés entre le front et le CMS
- des hooks UI et sélecteurs réutilisables pour l'instrumentation et les tests
- une base plateforme documentée qui peut évoluer à travers plusieurs repos et packages

### Ce que ça permet

- Découverte d'entreprises et expériences de répertoire
- Cartographie des corridors et échanges interprovinciaux
- Recherche, recherches enregistrées, favoris et alertes
- Feed et pages de détail pour opportunités, alertes et indicateurs
- Parcours d'import d'entreprises et bulk import
- Endpoints d'ops admin pour la santé runtime, les backups, les imports et la sécurité

### Structure du dépôt

- `openg7-org/` : application Angular, SSR, configuration runtime, tests Playwright et unitaires
- `strapi/` : CMS, seeds, policies, APIs backend et scripts d'intégration
- `packages/contracts/` : contrats d'API et validation
- `packages/tooling/` : outillage transverse comme la validation des sélecteurs
- `docs/` : onboarding, architecture, frontend, Strapi, écosystème et roadmap
- `infra/` : manifests de déploiement et infrastructure

### Pour commencer

1. Activez Corepack et vérifiez Yarn :
   ```bash
   corepack enable
   yarn --version
   ```
2. Installez les dépendances :
   ```bash
   yarn install
   ```
3. Si vous voulez des identifiants locaux personnalisés, créez `strapi/.env` et définissez `STRAPI_ADMIN_*`.
   Pour un setup local simple sans services externes, privilégiez des valeurs locales comme `DATABASE_CLIENT=sqlite`.
4. Lancez Strapi :
   ```bash
   yarn dev:cms
   ```
5. Lancez le front Angular dans un second terminal :
   ```bash
   yarn dev:web
   ```
6. En développement, les seeds Strapi créent ou mettent à jour automatiquement le compte admin à partir de `STRAPI_ADMIN_*`.

> Sous Windows, `Run-Installer-pwsh.cmd` exécute `install-dev-basics_robuste.ps1` pour préparer l'environnement et proposer un menu sur les principales commandes `yarn`.

Scripts utiles à la racine :
- `yarn test:e2e` : lance toute la suite Playwright depuis la racine du monorepo
- `yarn test:e2e:smoke` : lance uniquement le parcours critique smoke
- `yarn test:e2e:regression` : lance le parcours de régression plus large
- `yarn predeploy:preprod` : exécute les vérifications de préproduction puis le garde-fou E2E smoke
- `yarn predeploy:preprod:full` : exécute les mêmes vérifications puis toute la suite E2E

Guides détaillés dans `docs/` :
- `docs/getting-started.md` : onboarding et détails de setup local
- `docs/frontend/` : architecture Angular, sélecteurs, notes UX
- `docs/strapi/` : conventions CMS et comportement des seeds
- `docs/first-contribution.md` : checklist de première PR
- `docs/roadmap.md` : feuille de route et priorités

### Tableau de bord Ops

La plateforme inclut des surfaces d'exploitation pour suivre la santé runtime et l'état opérationnel.

- Route frontend : `/admin/ops` pour l'interface d'administration
- Endpoints API :
  - `GET /api/admin/ops/health`
  - `GET /api/admin/ops/backups`
  - `GET /api/admin/ops/imports`
  - `GET /api/admin/ops/security`
- Policy API : `global::owner-admin-ops`
- Accès API : rôles `Admin` et `Owner`
- Accès frontend à `/admin/ops` : actuellement réservé aux admins

### Où vit le code ?

- Lisez `CHARTER.md` pour le périmètre et les non-objectifs
- Utilisez `docs/ecosystem/ECOSYSTEM-MAP.md` pour identifier le repo canonique d'une capacité
- Si une logique doit être partagée entre plusieurs repos, créez un package `@openg7/*` au lieu de copier
- La plateforme est avant tout une couche d'orchestration et d'intégration, pas le foyer canonique de chaque domaine

### Contribuer

Lisez `CONTRIBUTING.md` pour le workflow, les vérifications attendues et la politique de gestion des secrets.
Le code de conduite dans `CODE_OF_CONDUCT.md` s'applique à tous les espaces communautaires.
Les détails de support et de gouvernance sont dans `SUPPORT.md`.

Premiers pas communautaires :
- utilisez les templates d'issues et de PR
- regardez les labels `good first issue` et `help wanted`
- ajoutez des captures pour les changements UI visibles
- documentez tout impact de configuration ou de sécurité

### Licence & sécurité

- Licence : MIT (`LICENSE`)
- Divulgation responsable : voir `SECURITY.md`
