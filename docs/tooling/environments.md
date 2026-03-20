# Configurations d'environnement

Ce guide centralise les fichiers `.env.example` fournis par les workspaces, les bonnes pratiques de rotation des secrets et le mapping des variables partagées entre les services Strapi et le front Angular.

## Fichiers modèles disponibles

| Workspace | Fichier | Commentaires |
| --- | --- | --- |
| `strapi` | `strapi/.env.example` | Variables nécessaires aux seeds (admin, jeton read-only), à la prévisualisation du front, à la configuration Postgres managée et au stockage objet S3/Backblaze en plus du moteur de recherche Meilisearch/OpenSearch. |
| `openg7-org` | `openg7-org/.env.example` | Regroupe les variables consommées à l'exécution par l'application Angular (URL du CMS, token read-only, token de prévisualisation, flags, etc.). |

Copiez ces fichiers en `.env` (ou chargez-les via `direnv`/`dotenvx`) avant d'exécuter `yarn dev:web`, `yarn dev:cms` ou `yarn --cwd strapi strapi develop`. Pensez à remplacer les valeurs d'exemple (`change-me`, `og7_frontend_readonly_token`, `preview-token`, etc.) par vos secrets locaux.

## Rotation des secrets

### Jeton API read-only (front → Strapi)

1. Générer une nouvelle valeur et l'assigner à `STRAPI_API_READONLY_TOKEN` dans `strapi/.env`. Cette variable est lue par les seeds pour créer le token read-only (`frontend-readonly`). 【F:strapi/.env.example†L9-L19】
2. Supprimer le token read-only existant via l'interface Strapi (Settings → API Tokens) ou directement en base.
3. Redémarrer Strapi (`yarn strapi develop` ou `yarn dev:cms`). Le seed `08-api-tokens.ts` le recréera avec la nouvelle valeur si aucun token homonyme n'existe. 【F:strapi/src/seed/08-api-tokens.ts†L1-L16】
4. Reporter la même valeur dans `openg7-org/.env` (`API_TOKEN`) pour que le front consomme le nouveau secret. 【F:openg7-org/.env.example†L6-L13】【F:openg7-org/src/app/core/config/runtime-config.service.ts†L17-L55】

### Token de prévisualisation de la homepage

1. Mettre à jour `PREVIEW_TOKEN` côté Strapi (`strapi/.env`). Le contrôleur `/api/homepage/preview` compare directement ce secret. 【F:strapi/.env.example†L21-L23】【F:strapi/src/api/homepage/controllers/homepage.ts†L11-L18】
2. Propager la même valeur dans `openg7-org/.env` (`HOMEPAGE_PREVIEW_TOKEN`) pour autoriser la page `/preview/homepage`. 【F:openg7-org/.env.example†L6-L13】【F:openg7-org/src/app/domains/admin/pages/preview/preview.page.ts†L65-L99】
3. Redémarrer le front si nécessaire (le runtime SSR charge `process.env` au démarrage). 【F:openg7-org/src/app/core/config/runtime-config.service.ts†L17-L40】

> Pour les déploiements préproduction, exécutez `yarn validate:preprod-runtime-config` avant le build : le script vérifie que `API_TOKEN` et `HOMEPAGE_PREVIEW_TOKEN` sont renseignés avec des secrets non placeholders afin que `runtime-config.js` expose bien les valeurs à Angular. 【F:openg7-org/scripts/validate-preprod-config.mjs†L1-L58】【F:openg7-org/config/runtime-config.template.json†L1-L19】

### Compte administrateur bootstrap (seeds)

1. Ajuster `STRAPI_ADMIN_EMAIL` et `STRAPI_ADMIN_PASSWORD` dans `strapi/.env`. 【F:strapi/.env.example†L9-L14】
2. Positionner `STRAPI_SEED_ADMIN_ALLOWED=true` le temps de la rotation. Cette garde évite de créer un compte en production par mégarde. 【F:strapi/.env.example†L12-L14】
3. Supprimer l'ancien compte (ou mettre à jour son email) via l'admin Strapi, puis redémarrer l'instance. Les seeds ne créent l'utilisateur que s'il n'existe pas déjà pour l'email donné. 【F:strapi/src/seed/02-admin-user.ts†L1-L19】
4. Revenir à `STRAPI_SEED_ADMIN_ALLOWED=false` en production une fois l'opération terminée.

### Base de données Strapi v5

1. **Client unique** : Strapi s'appuie désormais exclusivement sur Postgres (`DATABASE_CLIENT=postgres`). Fournissez `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_SCHEMA`, `DATABASE_USERNAME` et `DATABASE_PASSWORD` avant tout démarrage. 【F:strapi/.env.example†L36-L48】【F:strapi/config/database.ts†L39-L66】
2. **TLS & certificats** : activez `DATABASE_SSL=true` et ajustez `DATABASE_SSL_REJECT_UNAUTHORIZED` / `DATABASE_SSL_CA` lorsque le fournisseur impose une chaîne personnalisée. 【F:strapi/.env.example†L44-L46】【F:strapi/config/database.ts†L47-L64】
3. **Pool de connexions** : calibrez `DATABASE_POOL_MIN` / `DATABASE_POOL_MAX` en fonction du nombre de pods Strapi et des limites imposées par votre instance Postgres managée. 【F:strapi/.env.example†L47-L48】【F:strapi/config/database.ts†L28-L36】
4. **Pilotage via containers** : le driver officiel `pg` reste packagé directement dans le workspace pour éviter toute installation dynamique lors de la phase de build. 【F:strapi/package.json†L16-L35】

### Stockage des médias (plugin Upload)

1. **Stateless par défaut** : les uploads sont externalisés via le provider `@strapi/provider-upload-aws-s3`. Définissez `UPLOAD_PROVIDER=aws-s3` et renseignez les variables `UPLOAD_S3_BUCKET`, `UPLOAD_S3_REGION`, `UPLOAD_S3_ACCESS_KEY_ID`, `UPLOAD_S3_SECRET_ACCESS_KEY`. 【F:strapi/.env.example†L61-L71】【F:strapi/config/plugins.ts†L1-L47】
2. **Compatibilité Backblaze/S3 compatibles** : utilisez `UPLOAD_S3_ENDPOINT`, `UPLOAD_S3_FORCE_PATH_STYLE=true` et `UPLOAD_S3_BASE_URL` pour pointer vers un endpoint compatible (Backblaze, Scaleway...). `UPLOAD_S3_PREFIX` et `UPLOAD_S3_ACL` sont optionnels pour organiser les objets et contrôler la visibilité. 【F:strapi/.env.example†L65-L69】【F:strapi/config/plugins.ts†L17-L37】
3. **Rotation d'identifiants** : stockez les clés dans un gestionnaire de secrets (Vault) puis réappliquez les manifests. Strapi relira les valeurs lors du redémarrage sans nécessiter de synchronisation de volume partagé. 【F:infra/kubernetes/strapi.yaml†L20-L118】

## Variables partagées entre workspaces

| Source | Variable | Destination | Usage |
| --- | --- | --- | --- |
| `strapi/.env` | `STRAPI_API_READONLY_TOKEN` | `openg7-org/.env` → `API_TOKEN` | Jeton read-only injecté dans les appels HTTP du front. 【F:strapi/.env.example†L9-L19】【F:openg7-org/src/app/core/services/company.service.ts†L5-L140】|
| `strapi/.env` | `PREVIEW_TOKEN` | `openg7-org/.env` → `HOMEPAGE_PREVIEW_TOKEN` | Protection de l'endpoint `/api/homepage/preview` et de la page Angular associée. 【F:strapi/.env.example†L21-L23】【F:openg7-org/src/app/domains/admin/pages/preview/preview.page.ts†L65-L99】|
| Strapi | URL HTTP (`HOST` + `PORT`) | `openg7-org/.env` → `API_URL` (+ `API_WITH_CREDENTIALS`) | Base URL consommée par le `RuntimeConfigService` Angular et politique CORS par défaut côté client (`withCredentials`). 【F:strapi/.env.example†L5-L19】【F:openg7-org/.env.example†L5-L14】【F:openg7-org/src/app/core/config/runtime-config.service.ts†L17-L55】【F:openg7-org/src/app/core/http/http-client.service.ts†L1-L55】|
| Front | `HOME_FEED_PANEL_LIMITS` | `openg7-org/.env` → runtime Angular | Surcharge optionnelle du nombre de cartes affichées sur la home pour les panneaux `alerts`, `opportunities`, `indicators` (format JSON). Exemple : `{"alerts":3,"opportunities":6,"indicators":4}`. |

En alignant ces variables entre workspaces, on garantit que les seeds Strapi et le front SSR partagent une configuration cohérente (URL du CMS, secrets de prévisualisation et jetons API). Pour les pipelines préprod/prod, chargez les `.env` avec les valeurs de la cible avant d'exécuter `yarn predeploy:cms-cache` et `yarn prebuild:web` : cela valide que `STRAPI_API_READONLY_TOKEN`, `PREVIEW_TOKEN` et `API_URL` pointent tous vers l'instance Strapi attendue et que le runtime front embarque les bons flags.

### Exemple front : régler les volumes des panneaux home

Dans `openg7-org/.env`, vous pouvez définir :

```env
HOME_FEED_PANEL_LIMITS={"alerts":3,"opportunities":6,"indicators":4}
```

Le manifest navigateur (`public/runtime-config.js`) et le runtime SSR liront cette valeur automatiquement. Si le JSON est absent, incomplet ou invalide, le front réutilise les valeurs par défaut du workspace.

## Injection automatisée des secrets

- **Vault → Kubernetes** : les manifestes Strapi s'appuient désormais sur `ExternalSecret` pour hydrater `strapi-database`, `strapi-admin-secrets` et `strapi-upload` directement depuis Vault (`ClusterSecretStore` `vault-openg7`). Ajustez les chemins `remoteRef` selon votre arborescence Vault avant d'appliquer les manifests. 【F:infra/kubernetes/strapi.yaml†L119-L214】
- **Rotation continue** : mettez à jour les valeurs côté Vault ; l'opérateur External Secrets rafraîchira automatiquement les Secrets Kubernetes (`refreshInterval: 1h`). Redémarrez les pods Strapi uniquement si le changement concerne des connexions persistantes (Postgres, S3). 【F:infra/kubernetes/strapi.yaml†L119-L214】

## Préproduction — garde-fous seeds & manifeste runtime

- Désactivez le seed automatique dans l'environnement préproduction en positionnant `STRAPI_SEED_AUTO=false` et `STRAPI_SEED_ADMIN_ALLOWED=false`. Ajoutez `STRAPI_SEED_FAILURE_STRATEGY=fail-fast` pour stopper immédiatement si un script idempotent échoue. 【F:strapi/src/utils/seed-helpers.ts†L90-L115】【F:strapi/src/seed/02-admin-user.ts†L1-L20】
- Déclenchez ensuite l'initialisation Strapi uniquement au besoin via `yarn --cwd strapi seed:dev`, ce qui exécute `runSeeds()` sans lancer le serveur HTTP. 【F:strapi/package.json†L7-L17】【F:strapi/scripts/seed.ts†L1-L18】
- Conservez les secrets synchronisés entre Strapi et le front en régénérant `STRAPI_API_READONLY_TOKEN` et `PREVIEW_TOKEN`, puis en relançant `yarn validate:preprod-runtime-config` pour confirmer que `runtime-config.js` reflète les nouvelles valeurs consommées par `/preview/homepage`. 【F:strapi/.env.example†L9-L23】【F:openg7-org/scripts/validate-preprod-config.mjs†L1-L58】【F:openg7-org/src/app/domains/admin/pages/preview/preview.page.ts†L65-L99】
- Inspectez `openg7-org/config/runtime-config.template.json` pour vous assurer que les URLs, tokens et flags embarqués correspondent à la configuration attendue avant build SSR/browser. 【F:openg7-org/config/runtime-config.template.json†L1-L19】
- Testez la route `/preview/homepage` après rotation des secrets : l'endpoint Strapi refuse toute requête sans `PREVIEW_TOKEN` et la page Angular signale immédiatement une configuration incomplète (`API_URL`, token manquant). 【F:strapi/src/api/homepage/controllers/homepage.ts†L11-L23】【F:openg7-org/src/app/domains/admin/pages/preview/preview.page.ts†L65-L116】
- Vérifiez en amont du déploiement que les variables Postgres managées et les identifiants S3/compatibles sont bien renseignés ; sans elles, Strapi ne démarre pas et le provider Upload échoue. 【F:strapi/.env.example†L36-L71】【F:strapi/config/database.ts†L39-L66】【F:strapi/config/plugins.ts†L1-L47】

## Gouvernance & communication

- Traitez ce document comme **source unique de vérité** pour toute rotation de secrets ou alignement des fichiers `.env`. Lorsqu'une mise à jour est réalisée, partagez systématiquement ce lien avec l'équipe Ops (Slack `#ops-g7`) afin qu'elle applique la même procédure sur les environnements intermédiaires.
- Lors des cérémonies de release, ajoutez un rappel dans l'ordre du jour pour vérifier que les étapes de cette page ont été suivies et cochez la diffusion Ops avant de clôturer la revue des secrets.
