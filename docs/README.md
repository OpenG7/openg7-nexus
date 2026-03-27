# Documentation centrale du monorepo

Ce dossier regroupe les guides fonctionnels et techniques du projet, organisés par workspace ou thématique transversale. Les sous-dossiers existants :

- `frontend/` — notes pour l'application Angular (`openg7-org`).
- `strapi/` — documentation liée au CMS Strapi (`strapi`).
- `tooling/` — références transverses (scripts, configuration CI/CD, conventions partagées).

## Guides transverses

- [`cas-d-usage-en-langage-courant.md`](./cas-d-usage-en-langage-courant.md) — point de départ simple pour décrire un besoin métier avant de le décliner en specs produit ou techniques.
- [`getting-started.md`](./getting-started.md) — parcours d'installation rapide du monorepo et liens vers les workspaces.

## Ajouter un nouveau guide

1. Choisir le sous-dossier correspondant au workspace concerné. Créer le dossier si nécessaire.
2. Nommer les fichiers en `kebab-case` avec une extension explicite (`.md`, `.drawio`, etc.).
3. Mettre à jour cette page si une nouvelle catégorie permanente est ajoutée.

Les guides existants restent accessibles via les chemins relatifs depuis la racine du dépôt (`docs/<workspace>/...`).
