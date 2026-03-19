# OpenG7 Web

Angular 21 SSR application for the OpenG7 platform.

## Common Commands

From `openg7-org/`:

```bash
yarn start
yarn build
yarn build:preprod
yarn serve:ssr:openg7-org
yarn test
yarn e2e
```

Root-level equivalents:

```bash
yarn dev:web
yarn build:web
yarn test:e2e
yarn test:e2e:smoke
yarn test:e2e:regression
```

## Local Development

Start the Angular dev server:

```bash
yarn start
```

The app is served on `http://localhost:4200/`.

For a full-stack loop, run Strapi separately from the monorepo root with `yarn dev:cms`, or launch both services together with `yarn dev:all`.

## SSR And Preprod Build

`yarn build:preprod` generates the runtime manifest and sitemap, then builds the production Angular bundle.

To exercise the Express SSR entry point locally:

```bash
yarn build:preprod
yarn serve:ssr:openg7-org
```

This starts `dist/openg7-org/server/server.mjs`.

## Testing

- `yarn test`: Karma unit tests
- `yarn e2e`: full Playwright suite
- `yarn e2e:smoke`: critical smoke journey
- `yarn e2e:regression`: broader regression journey

## Documentation

- [SSR deployment notes](docs/ssr-deployment.md)
- [Quick search modal](../docs/frontend/quick-search-modal.md)
- [Homepage preview workflow](../docs/frontend/homepage-preview.md)
- [Frontend documentation index](../docs/frontend/README.md)

## MapLibre

The global MapLibre stylesheet is wired through `angular.json` via `node_modules/maplibre-gl/dist/maplibre-gl.css`.
