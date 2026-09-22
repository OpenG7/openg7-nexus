# Architecture de Nexus

## Mission et propriétaires

Nexus compose la plateforme et intègre les capacités canoniques décrites dans la
[carte de l’écosystème](docs/ecosystem/ECOSYSTEM-MAP.md). Il possède adaptateurs,
UI, configuration runtime et contrats de livraison; les règles canoniques d’autres
projets ne sont pas dupliquées. [AGENTS.md](AGENTS.md) oriente les lectures par tâche.

## Workspaces existants

<!-- prettier-ignore -->
| Workspace | Responsabilité |
| --- | --- |
| openg7-org / @openg7/web | Angular standalone, SSR Express, signals, i18n, cartes et UI de domaine |
| strapi / @openg7/strapi | Contenus, permissions serveur, schémas, seeds, persistance et médias |
| packages/contracts | OpenAPI versionné, types/clients générés, tests de contrats |
| packages/admin-quality, packages/admin-ai | Surfaces et contrats administratifs partagés |
| packages/tooling | Contrôles de sélecteurs, qualité et artefacts |
| infra | Déploiement et services techniques |

Les manifests locaux font foi pour versions et commandes. Les dossiers cités
comme exemples ou cibles dans un guide ne prouvent pas une implémentation.

## Dépendances et composition

Web → contrats API → Strapi → adaptateurs de stockage/services. Les primitives
partagées ne dépendent pas des pages, du routeur, de HTTP ou du métier. Le domaine
garde ses modèles/UI privés; les capacités transversales passent par API publique.
core et shared n’importent pas domains.

Dans le front : pages → feature/templates → UI domaine → patterns/composites
partagés → primitives/tokens. Atomic Design classe une responsabilité et une
portée, sans migration massive des chemins existants. Signals pour l’état local;
NgRx pour le global réellement partagé. Règles détaillées : [frontend](docs/agents/frontend.md).

## Données, sécurité et contrats

Strapi décide des autorisations et valide les données. Le navigateur n’est pas
une frontière de confiance. Contrats, erreurs et compatibilité évoluent ensemble
dans producteurs et consommateurs; les types générés suivent OpenAPI. Les seeds
sont idempotents et protégés par cible/environnement.
Voir [backend](docs/agents/backend.md) pour migrations de contrat, droits et seeds.

## Sources et vérification

- Sélecteurs : [registre](docs/agents/selector-registry.md), validé par tooling.
- Opérations feed : [blueprints](docs/agents/feed-blueprints.md), sorties et tests.
- Commandes et preuves : [validation](docs/agents/validation.md).
- Démarrage : [guide](docs/getting-started.md); conteneurs : [Docker](docs/docker-compose.md).

Mettre à jour le propriétaire lorsqu’une frontière change. Les anciens snippets
et étapes de génération sont archivés dans
[l’instantané historique](docs/archive/agents-before-standard-2026-09-21.md);
ils ne prescrivent aucune action. Les registres utiles ont été conservés et
les chemins obsolètes doivent être confrontés au code avant modification.
