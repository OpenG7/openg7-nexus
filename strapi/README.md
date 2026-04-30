# OpenG7 Strapi CMS

This Strapi workspace manages the content, seed data, and admin configuration for the OpenG7 platform.

📚 See `../docs/strapi-workspaces.md` for the responsibilities and operational guidelines of the official CMS workspace.

## Development commands

```bash
yarn install
yarn strapi develop          # launches Strapi with the bootstrap seeding
```

To re-run the seeders without starting the HTTP server you can use:

```bash
yarn seed:dev                # executes the seed pipeline against the local database
```

> **Note:** `runSeeds()` is automatically invoked from `strapi/src/bootstrap.ts` when `NODE_ENV` or `STRAPI_ENV` is set to `development`, `dev`, `integration`, or `test`, unless `STRAPI_SEED_AUTO=false` is provided. Production workloads should set `STRAPI_SEED_AUTO=false` and trigger the dedicated seed job instead (see [Seeding in multi-pod environments](#seeding-in-multi-pod-environments)).

## Required environment variables

The seed process expects several environment variables to be defined before running the CMS (see [`./.env.example`](./.env.example) for a ready-to-copy template):

| Variable                                                                                                                                       | Description                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `STRAPI_ADMIN_EMAIL`                                                                                                                           | Email address for the initial admin user. Used when `STRAPI_SEED_ADMIN_ALLOWED=true`.                                       |
| `STRAPI_ADMIN_PASSWORD`                                                                                                                        | Strong password for the initial admin user.                                                                                 |
| `STRAPI_WEB_ADMIN_ROLE`                                                                                                                        | Optional. Users-permissions role assigned to the mirrored web account for `STRAPI_ADMIN_EMAIL` (default: `Owner`).          |
| `STRAPI_SEED_ADMIN_ALLOWED`                                                                                                                    | Must be `true` to allow creation of the bootstrap admin account.                                                            |
| `STRAPI_API_READONLY_TOKEN`                                                                                                                    | Token string that will be used to create the read-only API access key.                                                      |
| `STRAPI_SEED_AUTO`                                                                                                                             | Optional flag. Set to `false` to skip automatic seeding from bootstrap, `true` to force it.                                 |
| `OPS_CODEX_DISPATCH_ENABLED`, `OPS_CODEX_GITHUB_*`, `OPS_CODEX_ALLOWED_*`, `OPS_CODEX_TIMEOUT_MS`                                              | Optional. Enables the owner/admin endpoint that dispatches `.github/workflows/codex-pr.yml` through the GitHub Actions API. |
| `APP_KEYS` / `SESSION_KEYS`                                                                                                                    | Comma separated secrets used by Koa for cookie signing and session encryption.                                              |
| `STRAPI_SESSION_DRIVER`                                                                                                                        | Defaults to `redis`. Set to `memory` locally if you do not run Redis.                                                       |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`                                                                                       | Connection parameters for the shared Redis instance powering sessions and rate limiting.                                    |
| `RATE_LIMIT_ENABLED`, `RATE_LIMIT_INTERVAL_MS`, `RATE_LIMIT_MAX`                                                                               | Control the Redis-backed throttling middleware.                                                                             |
| `ACTIVATION_EMAIL_COOLDOWN_ENABLED`, `ACTIVATION_EMAIL_COOLDOWN_MS`, `ACTIVATION_EMAIL_COOLDOWN_PREFIX`, `ACTIVATION_EMAIL_COOLDOWN_USE_REDIS` | Server-side cooldown for `POST /api/auth/send-email-confirmation` (default: 120s).                                          |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_REQUIRE_TLS`, `SMTP_USERNAME`, `SMTP_PASSWORD`                                                  | SMTP transport used by the Strapi email plugin (HostPapa for `notify@openg7.org`).                                          |
| `SMTP_DEFAULT_FROM_NAME`                                                                                                                       | Display name used by users-permissions email templates when defaults are seeded.                                            |
| `SMTP_DEFAULT_FROM`, `SMTP_DEFAULT_REPLY_TO`                                                                                                   | Default sender and reply-to headers used by transactional emails.                                                           |

Ensure these variables are exported in your shell (or defined in a `.env` file that Strapi loads) before running the development commands above.

## SMTP (HostPapa)

- The Strapi email plugin is configured with `@strapi/provider-email-nodemailer` and defaults to the sender `notify@openg7.org`.
- HostPapa usually supports `mail.papamail.net` over port `465` (SSL) or port `587` (STARTTLS). If your DNS exposes a domain endpoint, use `mail.openg7.org` instead.
- If `SMTP_PASSWORD` contains `#` (or spaces/special characters), wrap it in quotes in `.env` (example: `SMTP_PASSWORD="abc#123"`), otherwise dotenv may truncate the value.
- For account confirmation and password-reset flows, also verify sender values in the Strapi admin panel under email templates.

## Database strategy for multi-instance deployments

- All environments (local, staging, production) now target a managed Postgres instance. Populate `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_SCHEMA`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` before running the CMS. 【F:strapi/.env.example†L36-L48】【F:strapi/config/database.ts†L39-L66】
- TLS support is available through `DATABASE_SSL=true`. Optionally set `DATABASE_SSL_REJECT_UNAUTHORIZED=false` and `DATABASE_SSL_CA` if your provider uses a custom certificate chain. 【F:strapi/.env.example†L44-L46】【F:strapi/config/database.ts†L47-L64】
- Connection pooling is enabled by default and can be tuned via `DATABASE_POOL_MIN` / `DATABASE_POOL_MAX`. 【F:strapi/.env.example†L47-L48】【F:strapi/config/database.ts†L28-L36】
- The Node driver for PostgreSQL (`pg`) ships with the workspace dependencies, ensuring runtime containers do not need to install it ad-hoc. 【F:strapi/package.json†L16-L35】

## Object storage for uploads

- Media assets are uploaded to S3-compatible storage by default. Set `UPLOAD_PROVIDER=aws-s3` alongside `UPLOAD_S3_BUCKET`, `UPLOAD_S3_REGION`, `UPLOAD_S3_ACCESS_KEY_ID` and `UPLOAD_S3_SECRET_ACCESS_KEY`. Optional variables (`UPLOAD_S3_ENDPOINT`, `UPLOAD_S3_FORCE_PATH_STYLE`, `UPLOAD_S3_BASE_URL`, `UPLOAD_S3_PREFIX`, `UPLOAD_S3_ACL`) help target Backblaze or custom CDNs. 【F:strapi/.env.example†L61-L71】【F:strapi/config/plugins.ts†L1-L47】
- Removing the persistent volume claim keeps every Strapi pod stateless—scaling horizontally no longer requires a shared filesystem. Ensure your deployment injects the S3 credentials via Kubernetes Secrets (see `infra/kubernetes/strapi.yaml`). 【F:infra/kubernetes/strapi.yaml†L20-L214】

This split allows container images to distinguish between build-time artefacts (generated by `strapi build`) and runtime configuration (driven entirely by environment variables), removing the tight coupling to SQLite that prevented multi-instance deployments.

## Preproduction safeguards

- Set `STRAPI_SEED_AUTO=false` and `STRAPI_SEED_ADMIN_ALLOWED=false` in preproduction so the bootstrap never reseeds content implicitly. Combine this with `STRAPI_SEED_FAILURE_STRATEGY=fail-fast` to abort immediately if a manual run encounters an error. 【F:strapi/src/utils/seed-helpers.ts†L90-L115】【F:strapi/src/seed/02-admin-user.ts†L1-L20】
- Trigger a controlled seed only when required by running `yarn --cwd strapi seed:dev`, which executes `runSeeds()` without starting the HTTP server. 【F:strapi/package.json†L7-L17】【F:strapi/scripts/seed.ts†L1-L18】
- Provide Redis credentials via the environment before scaling Strapi horizontally so admin sessions and throttling state are shared across pods. 【F:strapi/config/server.ts†L1-L132】【F:strapi/config/middlewares.ts†L1-L200】

## Horizontal scaling & session store

The new `config/server.ts` and `config/middlewares.ts` files expose Redis-backed session and rate-limiting configuration. When `STRAPI_SESSION_DRIVER=redis`, Strapi will:

1. Store signed admin sessions in Redis instead of the in-memory Koa store.
2. Share throttling counters via the same Redis cluster, removing the need for sticky sessions on the load balancer.
3. Automatically disable the Redis store when `STRAPI_SESSION_DRIVER` is set to `memory` (useful for local development).

Make sure the Redis credentials are available to every Strapi pod. The Kubernetes manifests in `infra/kubernetes/strapi.yaml` illustrate how to inject those variables alongside `STRAPI_SEED_AUTO=false`, the seed job and the S3 object storage configuration. 【F:infra/kubernetes/strapi.yaml†L1-L214】

## Seeding in multi-pod environments

Automatic seeding is now disabled by default whenever `STRAPI_ENV`/`NODE_ENV` resolves to production. Configure your deployment to run a single Kubernetes `Job` that executes `yarn seed:dev` against the production database when a reseed is required. The provided manifest (`infra/kubernetes/strapi.yaml`) includes an example `Job` wired with the correct service account and environment variables. 【F:strapi/src/utils/seed-helpers.ts†L90-L115】【F:infra/kubernetes/strapi.yaml†L128-L210】

## Search engine integration

The quick-search experience relies on an external search engine (Meilisearch or OpenSearch). Configure the following variables in your Strapi environment so lifecycle hooks can keep the indices synchronised and the `/api/search` endpoint can proxy queries:

| Variable                        | Development (Meilisearch)       | Production (OpenSearch)                   |
| ------------------------------- | ------------------------------- | ----------------------------------------- |
| `SEARCH_ENGINE_URL`             | `http://localhost:7700`         | `https://search.prod.openg7.org`          |
| `SEARCH_ENGINE_DRIVER`          | `meilisearch`                   | `opensearch`                              |
| `SEARCH_ENGINE_API_KEY`         | `masterKey` (or your local key) | Read/write API key provisioned for Strapi |
| `SEARCH_ENGINE_AUTH_HEADER`     | `X-Meili-API-Key`               | `Authorization`                           |
| `SEARCH_ENGINE_AUTH_SCHEME`     | _(leave empty)_                 | `Bearer` (or your preferred scheme)       |
| `SEARCH_ENGINE_INDEX_COMPANIES` | `companies`                     | `og7-companies`                           |
| `SEARCH_ENGINE_INDEX_EXCHANGES` | `exchanges`                     | `og7-exchanges`                           |

> **Note:** when using Meilisearch the authentication header differs from OpenSearch. Setting `SEARCH_ENGINE_AUTH_HEADER=X-Meili-API-Key` and leaving `SEARCH_ENGINE_AUTH_SCHEME` blank ensures the API key is sent in the format expected by Meilisearch.

After updating the environment, restart Strapi so new lifecycle hooks index existing data. You can re-run `yarn seed:dev` to bootstrap demo content into the search engine.

## Seed coverage

The seed files located in `strapi/src/seed/` initialise:

- Locales (`fr`, `en`).
- User roles and permissions, including authenticated/pro roles.
- The initial admin user and API tokens (guarded by env vars).
- Taxonomies (provinces, territories, sectors).
- Homepage layout, demo companies, exchanges, and feature flags.
- Additional demo data such as national projects, statistics, and permissions.

All seeders are idempotent, making them safe to re-run during development or integration testing.

The admin seed now provisions both:

- the Strapi Admin panel account (`admin::user`), and
- a mirrored Content API account (`plugin::users-permissions.user`) for the same email/password,
  so `contact@openg7.org` can authenticate from `@openg7/web` via `POST /api/auth/local`.

## Runtime APIs delivered in this sprint

Strapi now exposes additional backend endpoints used directly by authenticated users and home widgets:

- Feed domain:
  - `GET /api/feed`
  - `POST /api/feed`
  - `GET /api/feed/highlights`
  - `GET /api/feed/stream` (SSE)
- Realtime corridors:
  - `GET /api/corridors/realtime`
- Persistent connections:
  - `POST /api/connections`
  - `GET /api/connections`
  - `GET /api/connections/:id`
  - `PATCH /api/connections/:id/status`
- Owner/Admin operations:
  - `GET /api/admin/ops/health`
  - `GET /api/admin/ops/backups`
  - `GET /api/admin/ops/imports`
  - `GET /api/admin/ops/security`
  - `POST /api/admin/ops/codex/dispatch`
  - Guarded by policy: `global::owner-admin-ops`

For the Codex dispatch payload, environment variables, and the expected GitHub workflow contract, see `../docs/strapi/admin-ops-codex-dispatch.md`.

For payload details, auth model, filters, and transition rules, see `../docs/strapi/realtime-apis.md`.

## Integration tests for runtime APIs

Run from monorepo root:

```bash
yarn workspace @openg7/strapi test:integration:feed
yarn workspace @openg7/strapi test:integration:corridors
yarn workspace @openg7/strapi test:integration:connections
yarn workspace @openg7/strapi test:integration:admin-ops
```
