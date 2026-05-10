# Audit de la documentation (février 2025)

Objectif : vérifier l'utilité et l'actualité des guides présents dans `docs/` et identifier les actions de rafraîchissement. L'audit couvre les sous-dossiers `frontend/`, `strapi/`, `tooling/` ainsi que les guides racine.

## Synthèse rapide

- Les guides racine (`docs/README.md`, `getting-started.md`) restent pertinents pour l'onboarding ; seule la dépendance base de données a été alignée sur l'usage Postgres exclusif de Strapi v5.
- La documentation front-end est structurée par sujet (architecture, i18n, prévisualisation, UX) et demeure utile ; plusieurs pages de revue (`reviews/`) peuvent être regroupées ou taguées par version produit pour faciliter la navigation.
- Les notes Strapi insistent sur l'idempotence des seeds, le provisioning Postgres et la bascule away de l'ancien CMS ; elles sont conformes aux pratiques actuelles mais gagneraient à inclure un exemple de pipeline de migration de schéma.
- La section tooling couvre correctement la rotation des secrets et l'alignement des `.env`; aucun doublon détecté avec les README des workspaces, mais un rappel de validation préprod (scripts `predeploy:cms-cache` / `prebuild:web`) pourrait y être ajouté.

## État par document

### Racine `docs/`

| Document                  | Utilité actuelle                                                           | Action recommandée                                                                |
| ------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `docs/README.md`          | Point d'entrée clair listant les dossiers par thématique.                  | Aucune action ; conserver la structure.                                           |
| `docs/getting-started.md` | Guide d'onboarding mis à jour pour Node 20, Yarn 4.9.4 et Postgres requis. | Relecture semestrielle pour suivre les versions Node/Yarn et l'ordre des scripts. |

### Front-end (`docs/frontend/`)

| Document                                                                                                                                                                 | Utilité actuelle                                                                                                                          | Action recommandée                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/README.md`                                                                                                                                                     | Index des guides Angular (architecture, i18n, prévisualisation, pricing, importation, erreurs API, intégrations optionnelles, revues UX). | Ajouter un tag/version ou une date de dernière mise à jour pour chaque entrée afin de savoir quelles revues correspondent aux versions récentes du front.                                                                         |
| Guides métiers/UX (`importation-page.md`, `pricing-page.md`, `login-ux-review.md`, `forgot-password-page.md`, `quick-search-modal.md`)                                   | Détaillent les parcours et écrans ; utiles pour l'équipe produit/UX.                                                                      | Vérifier les captures ou flows par rapport aux routes actuelles (`/importation`, `/pricing`, `/login`, etc.) et archiver les revues antérieures dans un sous-dossier `archive/` si elles ne correspondent plus au design courant. |
| Architecture & technique (`angular-domain-structure.md`, `search-state-management.md`, `i18n-guidelines.md`, `homepage-preview.md`, `api-error-message-localization.md`) | Cadrent l'architecture domain-first, la gestion de l'état et la prévisualisation SSR/CSR ; toujours alignés avec l'app Angular SSR.       | Centraliser les conventions de sélecteurs data-og7 ici ou pointer vers `AGENTS.md` pour réduire la duplication des règles de test E2E.                                                                                            |
| Analyses/expérimentations (`optional-integrations.md`, `opentofu-standardisation-analysis.md`, `reviews/*`)                                                              | Répertorient des pistes et retours de revue ; pertinents mais fragmentés.                                                                 | Regrouper les analyses infra (`opentofu-*`) dans un dossier `experiments/` et ajouter un sommaire des revues pour identifier rapidement celles qui sont toujours actives.                                                         |

### Strapi (`docs/strapi/` et `docs/strapi-workspaces.md`)

| Document                                                                       | Utilité actuelle                                                                                                     | Action recommandée                                                                                                                            |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `strapi/README.md`                                                             | Index des guides Strapi (workspaces, staging, scaling, cache HTTP).                                                  | Conserver ; ajouter un lien direct vers les scripts de seed et la checklist AGENTS correspondante.                                            |
| `strapi/workspaces.md` & `strapi-workspaces.md`                                | Clarifient que le workspace officiel Strapi v5 remplace l'ancien CMS et décrivent les responsabilités par équipe.    | Fusionner ou croiser ces deux pages pour éviter les doublons et préciser le processus de migration de schéma (openapi + seeds).               |
| `strapi/database-scaling.md`, `strapi/http-cache.md`, `strapi/staging-data.md` | Documentent la montée en charge Postgres, les headers de cache et la gestion des données de staging sans seeds auto. | Ajouter des exemples de manifests Helm/Kubernetes récents (TLS, ExternalSecret) et un rappel sur `STRAPI_SEED_FAILURE_STRATEGY` pour préprod. |

### Tooling (`docs/tooling/`)

| Document                  | Utilité actuelle                                                                                 | Action recommandée                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `tooling/README.md`       | Présente la vocation des scripts partagés et conventions CI/CD.                                  | Aucun blocage ; compléter avec une mention des commandes `yarn validate:selectors` et `yarn predeploy:cms-cache` attendues avant PR.           |
| `tooling/environments.md` | Source unique de vérité pour la rotation des secrets et le mapping `.env` entre front et Strapi. | Ajouter une checklist rapide (5–6 points) à exécuter avant déploiement préprod/prod pour s'aligner avec `AGENTS.md` (tokens, preview, caches). |

## Prochaines étapes proposées

1. Mettre à jour ou archiver les pages de revue front (`docs/frontend/reviews/`) avec une étiquette de version produit (par exemple `2024-Q4`) pour distinguer les analyses historiques des chantiers en cours.
2. Fusionner `docs/strapi/workspaces.md` et `docs/strapi-workspaces.md` en un guide unique couvrant responsabilités, seeds et migrations de schéma Strapi v5.
3. Compléter `docs/tooling/environments.md` avec une mini-checklist de déploiement préprod/prod afin d'aligner la documentation avec les scripts obligatoires listés dans `AGENTS.md`.
