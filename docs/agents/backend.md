# CMS, données et contrats Nexus

À lire pour Strapi, endpoint, autorisation, schéma, seed ou contrat partagé,
y compris les consommateurs front et tests. Complète [AGENTS.md](../../AGENTS.md).

## Autorité et frontières

Strapi possède validation, persistance, cycle de vie du contenu et permissions.
Le front consomme les contrats publics; les schémas OpenAPI/types partagés vivent
dans packages/contracts. Aucun domaine canonique d’un autre dépôt n’est recopié :
appliquer la [carte de l’écosystème](../ecosystem/ECOSYSTEM-MAP.md).

Rôles/API tokens à privilège minimal, lecture seule par défaut. Vérifier droits
côté serveur, y compris les routes admin et preview. Ni bouton masqué, guard,
flag ni token non vérifié ne suffit. Limiter origines CORS; protéger contre CSRF
les mutations avec cookie. Les secrets de preview restent côté serveur, sans log/URL
public ni cache partagé de brouillons. Voir [preview](../frontend/homepage-preview.md).

## Schémas et seeds

Conserver schémas JSON source, enums validés, cardinalités et contraintes
required/unique; champs sensibles private. Motiver index et relations par les
requêtes/cas réels. Prévoir données existantes et compatibilité avant évolution.

Seeds par upsert et clé stable, relançables sans doublons, locales fr/en pour les
textes. Vérifier ordre/locales/rôles/taxonomies dans le bootstrap effectif. Aucun
admin initial ni token écrit en production par défaut : valider les gardes
d’environnement dans le code (notamment STRAPI_SEED_ADMIN_ALLOWED) et la cible.
Secrets fournis par environnement, jamais codés en dur. Des données de démonstration
restent locales; ne pas traiter un seed comme un contrôle en lecture seule.

## Évolution du contrat

Toute modification d’endpoint/schéma met à jour producteurs, consommateurs, tests,
et packages/contracts/spec/openapi.json dans le même changement. Les types
générés se régénèrent à partir de la source. Ajout compatible : version mineure;
rupture : version majeure et migration explicite. Valider réponses, erreurs et droits.

Ne pas inférer la forme Strapi d’un exemple ancien : inspecter routes/controllers
et schémas actuels. Les noms historiques connections/exchanges/flows ne justifient
pas une migration générale ni la suppression d’un endpoint utilisé.
Pour une action feed, mettre à jour ses [données et tests](feed-blueprints.md).

## Lectures et validation

Configuration/seeds : [Strapi](../../strapi/README.md). Recherche/indexation :
[recherche](../../infra/search/README.md) si le changement l’active.
Déploiement : [Docker](../docker-compose.md) et runbook de la cible.
Exécuter les contrôles de la [matrice](validation.md), sans production implicite.
