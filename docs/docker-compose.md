# Docker Compose local

Ce guide lance une stack locale complete pour valider les images et les integrations sans dependance cloud.

## Services

- `web` : Angular SSR sur http://localhost:4000
- `strapi` : Strapi sur http://localhost:1337
- `postgres` : base CMS locale
- `redis` : sessions Strapi, rate limit et cooldowns
- `meilisearch` : moteur de recherche local sur http://localhost:7700
- `minio` : stockage S3 compatible sur http://localhost:9000, console http://localhost:9001
- `strapi-seed` : job one-shot qui initialise les roles, contenus demo, compte admin et token API

## Demarrage

Depuis la racine du repo :

```bash
yarn docker:up
```

Le premier demarrage construit les images, initialise Minio, lance le seed Strapi puis demarre le CMS et le SSR.

Identifiants locaux :

- Strapi admin : `contact@openg7.org`
- Mot de passe : `ChangeMe123!`
- Token front read-only : `og7_frontend_readonly_token`

## Commandes utiles

```bash
yarn docker:logs
yarn docker:seed
yarn docker:down
```

Pour supprimer aussi les donnees locales :

```bash
docker compose down -v
```

## Configuration front SSR

Le conteneur `web` regenere `runtime-config.js` au demarrage afin que la meme image puisse etre reutilisee avec d'autres variables d'environnement.

Deux URLs API sont supportees :

- `API_URL` : URL publique exposee au navigateur, par defaut `http://localhost:1337`.
- `SSR_API_URL` : URL interne utilisee par le rendu serveur, par defaut `http://strapi:1337`.

En production, gardez `API_URL` sur le domaine public du CMS et `SSR_API_URL` sur le service interne de l'orchestrateur.

## Notes de production

Cette stack est faite pour le developpement et la validation locale. Pour une preproduction ou production, garder les images mais remplacer les services locaux par :

- Postgres manage avec backups ;
- Redis manage ou stateful supervise ;
- S3/Backblaze au lieu de Minio local ;
- Meilisearch/OpenSearch manage ;
- secrets injectes par l'orchestrateur ;
- TLS et reverse proxy/CDN hors Compose.
