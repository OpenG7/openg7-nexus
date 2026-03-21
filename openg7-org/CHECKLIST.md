# Codex Checklist

- [x] Créer l'arborescence d'accès & sécurité (section 3) sous `src/app/...`.
- [x] Générer les composants listés en 1) avec leurs selectors HTML respectifs.
- [x] Implémenter les signals locaux & formulaires typés dans chaque composant.
- [x] Brancher NgRx pour les slices globales et workflows documentés : `auth`, `user`, `catalog`, `map`, `companyImportBulk`, `connections`, `feed`, `statistics`.
- [x] Configurer i18n (loader HTTP, fichiers `fr.json` / `en.json`).
- [x] Activer les interceptors `auth`, `csrf`, `error`.
- [x] Protéger les routes (`canMatch` + RBAC UI).
- [x] Configurer SSR (TransferState, aucun accès direct à `window`).
- [x] Côté Strapi : créer les fichiers de seed (section 5), rendre les scripts idempotents.
- [x] Écrire des tests rapides (E2E/ciblage via `data-og7*`).
