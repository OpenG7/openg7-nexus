# Strapi v5 — stratégie base de données & scalabilité

Ce guide décrit la marche à suivre pour exécuter le workspace `strapi/` sur plusieurs instances applicatives tout en garantissant la cohérence des seeds et des contenus.

## 1. Modes supportés

| Mode              | Client                     | Usage recommandé                                                                                                                                                             |
| ----------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL managé | `DATABASE_CLIENT=postgres` | Développement local via conteneur Postgres, préproduction, production et environnements multi-instances. Compatible TLS, pooling (`DATABASE_POOL_*`) et reprise automatique. |

> Les seeds restent idempotents : aucune donnée n'est dupliquée en relançant `yarn --cwd strapi seed:dev`, quel que soit le client utilisé. 【F:strapi/src/utils/seed-helpers.ts†L25-L44】

## 2. Variables d'environnement à renseigner

| Variable                                                              | Description                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `DATABASE_CLIENT`                                                     | Toujours `postgres`.                                                |
| `DATABASE_HOST` / `DATABASE_PORT`                                     | Adresse du serveur Postgres.                                        |
| `DATABASE_NAME` / `DATABASE_SCHEMA`                                   | Base et schéma ciblés.                                              |
| `DATABASE_USERNAME` / `DATABASE_PASSWORD`                             | Identifiants applicatifs.                                           |
| `DATABASE_POOL_MIN` / `DATABASE_POOL_MAX`                             | Taille du pool de connexions.                                       |
| `DATABASE_SSL`, `DATABASE_SSL_REJECT_UNAUTHORIZED`, `DATABASE_SSL_CA` | Contrôle TLS (activé par défaut sur de nombreux providers managés). |

Le fichier [`strapi/.env.example`](../../strapi/.env.example) fournit une base prête à l'emploi. 【F:strapi/.env.example†L36-L48】

## 3. Exemples de déploiement

### 3.1 Conteneur runtime (production)

```Dockerfile
# Stage build: compile Strapi (configuration en lecture seule)
FROM node:20-bullseye AS build
WORKDIR /srv/openg7
COPY package.json yarn.lock ./
COPY strapi/package.json strapi/package.json
COPY packages ./packages
COPY strapi ./strapi
RUN corepack enable \
 && yarn install --immutable \
 && yarn --cwd strapi build

# Stage runtime: uniquement les dépendances nécessaires
FROM node:20-bullseye-slim AS runtime
WORKDIR /srv/openg7
ENV NODE_ENV=production
COPY package.json yarn.lock ./
COPY strapi/package.json strapi/package.json
RUN corepack enable \
 && yarn workspaces focus --production @openg7/strapi
COPY --from=build /srv/openg7/strapi ./strapi
EXPOSE 1337
CMD ["yarn", "--cwd", "strapi", "start"]
```

Les variables `DATABASE_*` (et les secrets de seed) sont injectées au moment du déploiement : aucune donnée sensible n'est requise lors de l'étape de build, ce qui facilite la création d'images immuables. 【F:strapi/config/database.ts†L12-L60】

### 3.2 Déploiement multi-instances

1. Configurer la base Postgres partagée et appliquer les migrations (`strapi/database/migrations` le cas échéant).
2. Lancer une première instance en lecture/écriture afin qu'elle exécute automatiquement les seeds (si `STRAPI_SEED_AUTO=true`).
3. Démarrer les autres instances avec `STRAPI_SEED_AUTO=false` pour éviter que plusieurs noeuds écrivent simultanément lors d'un scale-out rapide. En production, ce flag est désormais désactivé par défaut quand `NODE_ENV`/`STRAPI_ENV` vaut `production`. 【F:strapi/src/utils/seed-helpers.ts†L90-L115】
4. Externaliser les médias via S3/Backblaze (`UPLOAD_PROVIDER=aws-s3` + clés associées) afin que chaque pod reste stateless. 【F:strapi/.env.example†L61-L71】【F:strapi/config/plugins.ts†L1-L47】
5. Utiliser un load balancer HTTP compatible WebSocket/Server-Sent Events si vous exploitez le panel admin Strapi en temps réel.
6. Fournir un Redis partagé pour stocker les sessions admin et le throttling (`STRAPI_SESSION_DRIVER=redis`). Les variables nécessaires (`REDIS_HOST`, `REDIS_PASSWORD`, `RATE_LIMIT_*`) sont documentées dans `strapi/.env.example`. 【F:strapi/config/middlewares.ts†L1-L200】【F:strapi/.env.example†L9-L40】

### 3.3 Manifestes Kubernetes de référence

Le dossier `infra/kubernetes/` contient des manifestes prêts à l'emploi :

- `redis.yaml` — déploiement d'un Redis stateful protégé par mot de passe et stockage persistant pour les sessions. 【F:infra/kubernetes/redis.yaml†L1-L109】
- `strapi.yaml` — déploiement Strapi avec `STRAPI_SEED_AUTO=false`, stockage objet S3, HPA, `ExternalSecret` Vault et job dédié `seed:dev`. 【F:infra/kubernetes/strapi.yaml†L1-L214】

Ces manifestes illustrent comment injecter `APP_KEYS`, `SESSION_KEYS`, le secret Redis et les paramètres Postgres tout en déclenchant un job unique pour rejouer les seeds.

## 4. Checklist de migration depuis SQLite

1. Exporter les contenus existants (`strapi export`, ou via un script `ts-node`).
2. Créer la base Postgres avec le schéma `DATABASE_SCHEMA` désiré.
3. Mettre à jour `.env` avec les variables Postgres et redémarrer l'instance.
4. Importer les contenus et relancer `yarn --cwd strapi seed:dev` pour réappliquer les taxonomies/roles idempotents.
5. Configurer le provider Upload en S3 (bucket, région, clés) puis redémarrer Strapi pour relier les assets existants. 【F:strapi/.env.example†L61-L71】【F:strapi/config/plugins.ts†L1-L47】
6. Vérifier que le front Angular pointe vers la nouvelle URL via `API_URL` et que les tokens read-only sont toujours valides. 【F:docs/tooling/environments.md†L56-L76】

Cette architecture garantit que Strapi peut être exécuté en haute disponibilité sans dépendre d'un volume partagé SQLite.
