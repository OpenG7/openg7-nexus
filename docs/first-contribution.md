# Première contribution

Bienvenue ! Ce guide propose un parcours rapide pour livrer une première PR en toute confiance.

## 1. Choisir une issue adaptée

- Consultez les tickets labellisés `good first issue` ou `help wanted` dans le tracker GitHub.
- Préférez les sujets bien cadrés (description claire, critères d'acceptation, surface réduite).
- Si le ticket est flou, proposez un plan en commentaire avant de coder.

## 2. Préparer l'environnement en 15 minutes

```bash
yarn install
yarn dev:cms   # Strapi sur http://localhost:1337
yarn dev:web   # Front Angular sur http://localhost:4200
```

- Copiez les `.env.example` dans `strapi/` et `openg7-org/`, puis renseignez les valeurs requises (tokens API, comptes admin, flags).
- En local (`development`), la seed crée un admin par défaut (`contact@openg7.org` / `change-me`) si aucun compte n'existe. Vous pouvez surcharger avec `STRAPI_ADMIN_EMAIL`/`STRAPI_ADMIN_PASSWORD`.

## 3. Déroulé suggéré

1. Forkez le dépôt et créez une branche dédiée (`feature/<slug>` ou `fix/<slug>`).
2. Reproduisez le bug ou validez le besoin fonctionnel en local.
3. Implémentez une solution minimale, en suivant les conventions :
   - Sélecteurs `[data-og7]` et préfixe `og7-` pour les composants Angular.
   - Seeds Strapi idempotents et sécurisés (pas de secrets committés).
4. Ajoutez/ajustez les tests pertinents.
5. Vérifiez les checks rapides avant PR :
   - `yarn lint`
   - `yarn format:check`
   - `yarn validate:selectors`
   - `yarn codegen && yarn test`

## 4. Ouvrir la PR

- Remplissez le modèle de PR (résumé, impact, tests exécutés).
- Mentionnez les labels proposés par le mainteneur (`good first issue`, `help wanted`).
- Ajoutez des captures d'écran pour les changements UI perceptibles.

## 5. Attentes pendant la revue

- Un mainteneur répond généralement sous 5 jours ouvrés pour les premiers retours.
- Les suggestions de refactor ou d'accessibilité sont fréquentes : justifiez vos arbitrages.
- Les commits doivent rester petits et lisibles ; rebasez si nécessaire avant merge.
