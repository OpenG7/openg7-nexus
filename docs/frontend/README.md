# Documentation front-end (`openg7-org`)

Ce dossier centralise les guides et analyses pour l'application Angular :

- `angular-domain-structure.md` — organisation du code `src/app` (layout domain-first, alias TypeScript).
- `hydrocarbures-surplus-baril-use-case.md` — cas d'usage métier pour la publication d'un surplus ou d'un ralentissement de barils par une entreprise albertaine.
- `hydrocarbon-surplus-angular-composer.md` — contenu UI détaillé du drawer Angular pour le template `hydrocarbon-surplus-offer`.
- `homepage-preview.md` — flux de prévisualisation depuis Strapi.
- `pricing-page.md` — blueprint fonctionnel et contenu pour la page marketing `/pricing`.
- `importation-page.md` — UX blueprint pour l'espace applicatif `/importation` (analystes importations).
- `i18n-guidelines.md` — bonnes pratiques de traduction et gestion des locales.
- `login-ux-review.md` — retour d'expérience UX sur le parcours d'authentification.
- `optional-integrations.md` — connecteurs optionnels (analytics, sentry, chat, etc.).
- `opentofu-standardisation-analysis.md` — pistes d'automatisation infra depuis le front.
- `quick-search-modal.md` — fonctionnement du module de recherche rapide.
- `search-state-management.md` — stratégie de state management pour la recherche.
- `api-error-message-localization.md` — clarification de la stratégie i18n pour les messages d'erreur API.
- `reviews/` — retours de revue détaillés (ex. `opportunity-matches-review.md`, `linkup-302.md`).
- `../openg7-org/docs/ssr-deployment.md` — pipeline SSR Angular + Docker multi-stage.

## Ajouter un nouveau document

1. Vérifier s'il existe déjà un thème similaire (structure, analytics, UI, etc.).
2. Ajouter le fichier ici, ou créer un sous-dossier si plusieurs documents couvrent le même thème.
3. Mettre à jour cette page si une nouvelle catégorie pérenne est introduite.
