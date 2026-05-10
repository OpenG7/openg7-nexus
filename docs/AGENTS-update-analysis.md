# Analyse des mises à jour à apporter à `AGENTS.md`

## 1. Harmoniser le registre des sélecteurs

- **Constat** : le tableau principal mélange les chemins `openg7-org/src/...` et des chemins plus génériques `src/app/...`, ce qui peut induire des erreurs lors du câblage final.
- **Proposition** : uniformiser tous les chemins vers la structure monorepo actuelle (par ex. `openg7-org/src/app/...` pour le front) et supprimer les reliquats `src/app/...` sans préfixe. Cela facilitera la vérification des sélecteurs avant déploiement.

## 2. Clore les entrées marquées « rename » ou « planned »

- **Constat** : plusieurs sélecteurs sont toujours listés en statut `rename` ou `planned` (ex. `og7-filters-toolbar`, `map-layer`, `map-tooltip`, `search-box`).
- **Proposition** : mettre à jour ces lignes pour refléter l’état réel (OK ou retiré), ajouter les fichiers manquants si implémentés, ou documenter un plan de livraison si certains restent différés. Cela verrouillera la surface de test E2E avant production.

## 3. Mettre à jour la checklist de pré-merge et les variables d’environnement

- **Constat** : la checklist Codex et la section Strapi rappellent les seeds et le contrat API, mais gagneraient à préciser les prérequis de déploiement (tokens RO, flags, exécution obligatoire des scripts `yarn predeploy:cms-cache` / `prebuild:web`).
- **Proposition** : compléter la checklist avec les étapes de build et de cache CMS attendues en préprod/prod, rappeler l’obligation de committer le snapshot OpenAPI, et aligner les variables `STRAPI_*`/`API_URL` sur les environnements ciblés.
