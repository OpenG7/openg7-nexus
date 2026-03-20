# Déploiement SSR & pipeline multi-stage

Ce guide décrit comment empaqueter l'application Angular (`openg7-org`) dans deux images distinctes :

- **Image de build** : compile l'app via `ng build` (et génère `runtime-config.js`).
- **Image runtime** : n'embarque que les artefacts nécessaires à l'exécution du serveur Express SSR.

## 1. Scripts utiles

| Commande | Description |
| --- | --- |
| `yarn build:preprod` | Génère `public/runtime-config.js` puis lance `ng build` avec la configuration production. 【F:openg7-org/package.json†L6-L32】【F:openg7-org/scripts/generate-runtime-config.mjs†L1-L200】|
| `yarn serve:ssr:openg7-org` | Démarre `dist/openg7-org/server/server.mjs` (Express + Angular SSR). 【F:openg7-org/src/server.ts†L1-L126】|

## 2. Docker multi-stage

Le fichier [`openg7-org/Dockerfile`](../Dockerfile) fournit une base prête à l'emploi :

```Dockerfile
# Stage build : installe les dépendances workspace + build Angular
FROM node:20-bullseye AS build
WORKDIR /srv/openg7
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY packages ./packages
COPY openg7-org ./openg7-org
RUN corepack enable \
 && yarn install --immutable \
 && yarn --cwd openg7-org build:preprod

# Stage runtime : dépendances minimes + artefacts dist/
FROM node:20-bullseye-slim AS runtime
WORKDIR /srv/openg7
ENV NODE_ENV=production \
    PORT=4000
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY openg7-org/package.json openg7-org/package.json
RUN corepack enable \
 && yarn workspaces focus --production openg7-org
COPY --from=build /srv/openg7/openg7-org/dist/openg7-org ./openg7-org/dist/openg7-org
EXPOSE 4000
CMD ["node", "openg7-org/dist/openg7-org/server/server.mjs"]
```

Points clés :

1. `yarn install --immutable` s'exécute dans l'image de build pour compiler Angular et l'Express server SSR.
2. L'image runtime n'embarque que les dépendances nécessaires au serveur (`express`, `@angular/ssr`) grâce à `yarn workspaces focus --production`.
3. Le serveur Express lit les variables d'environnement (`process.env`) à l'initialisation pour injecter le CSP et les URLs API. 【F:openg7-org/src/server.ts†L1-L126】

## 3. Variables d'environnement runtime

Définissez au minimum les variables suivantes avant de démarrer le conteneur :

| Variable | Rôle |
| --- | --- |
| `API_URL` | Base URL du CMS Strapi (consommée par `runtime-config.js`). |
| `API_TOKEN` | Jeton read-only utilisé par le front pour interroger Strapi. |
| `HOMEPAGE_PREVIEW_TOKEN` | Token de prévisualisation de la homepage. |
| `HOME_FEED_PANEL_LIMITS` | Objet JSON optionnel pour surcharger le nombre de cartes affichées dans les panneaux home (`alerts`, `opportunities`, `indicators`). |
| `PORT` | Port HTTP exposé par le serveur Express (défaut `4000`). |

> Pour propager les valeurs, montez un fichier `.env` ou injectez-les via votre orchestrateur (Kubernetes, ECS, etc.). Le runtime Angular lit `window.__OG7_CONFIG__` côté navigateur et `process.env` côté SSR. 【F:openg7-org/src/server.ts†L1-L126】【F:openg7-org/scripts/generate-runtime-config.mjs†L1-L200】

Exemple d'override pour la home :

```env
HOME_FEED_PANEL_LIMITS={"alerts":3,"opportunities":6,"indicators":4}
```

Si la variable est absente ou invalide, l'application retombe sur les valeurs par défaut embarquées.

## 4. Validation avant release

1. Lancer `yarn build:preprod` localement pour vérifier que la génération SSR réussit.
2. Exécuter `node openg7-org/dist/openg7-org/server/server.mjs` avec un `.env` minimal pour valider l'injection runtime.
3. En CI/CD, garder deux étapes distinctes : `docker build` (image build) puis `docker build --target runtime` (image runtime) pour publier uniquement l'image allégée.

Ce flux garantit une séparation nette entre compilation Angular et exécution Node/Express, simplifiant les mises à jour de dépendances et les scans de sécurité.

## 5. Mise en production : load balancing & scaling horizontal

Le serveur SSR étant **stateless**, plusieurs réplicas peuvent être exécutés en parallèle derrière un équilibreur HTTP (ALB, GCLB, Nginx Ingress...). Les points d'attention :

1. **Check de santé dédié** — exposez `/healthz` (inclus dans le serveur Express) pour que l'équilibreur retire rapidement les pods dégradés.
2. **Secrets centralisés** — `API_URL`, `API_TOKEN` et `HOMEPAGE_PREVIEW_TOKEN` doivent être fournis via `Secret` Kubernetes ou Variables ECS, jamais en dur dans l'image.
3. **Auto-scaling** — activez un `HorizontalPodAutoscaler` sur la latence HTTP ou l'utilisation CPU pour absorber les pics de charge.

Le manifest `infra/kubernetes/frontend-ssr.yaml` fournit un exemple complet : déploiement multi-réplicas, service interne, ingress Nginx et HPA combinant métriques CPU et histogramme de latence. 【F:infra/kubernetes/frontend-ssr.yaml†L1-L134】
