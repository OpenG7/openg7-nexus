# Contribuer à OpenG7

Merci de votre intérêt pour le projet ! Ce guide résume les règles pour contribuer efficacement et en toute sécurité.

## Préparer votre environnement

- Node.js 20 LTS et Corepack activé (`yarn@4.9.4`).
- PostgreSQL disponible en local ; renseignez les variables `DATABASE_*` dans `strapi/.env`.
- Copiez et adaptez les fichiers `.env.example` dans `strapi/` et `openg7-org/` (tokens d’API, comptes admin, flags runtime).

## Cycle de développement

1. **Installer les dépendances** : `yarn install` à la racine du monorepo.
2. **Lancer les services** :
   - CMS : `yarn dev:cms`
   - Front Angular : `yarn dev:web`
   - Full-stack : `yarn dev:all`
3. **Mettre à jour les contrats** : `yarn codegen && yarn test` (génération + tests du package `@openg7/contracts`).
4. **Valider avant PR** (ordre recommandé) :
   - `yarn lint`
   - `yarn format:check`
   - `yarn validate:selectors`
   - `yarn codegen && yarn test`
   - `yarn predeploy:cms-cache`
   - `yarn prebuild:web`

## Branches et revue

- Travaillez sur une branche dédiée, ouvrez une PR décrivant clairement le scope et les tests passés.
- Respectez les sélecteurs officiels `[data-og7="*"]` et l’architecture Angular signal-first documentée dans `docs/frontend/`.
- Les changements de schéma Strapi doivent être synchronisés dans `packages/contracts/spec/openapi.json` avant revue.
- Utilisez le modèle de PR `.github/pull_request_template.md` et référencez l'issue liée (`good first issue` / `help wanted` si applicable).

## Standards de code

- TypeScript strict, ESLint et Prettier sont la référence.
- Pas de secrets committés : utilisez les variables d’environnement et `.env.example` comme référence publique.
- Les seeds Strapi doivent rester idempotents et sécurisés (voir `strapi/src/seed/`).

## Signalement de vulnérabilité

Consultez `SECURITY.md` pour le canal de divulgation responsable.
