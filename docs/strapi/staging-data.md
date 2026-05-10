# Données de staging pour Strapi v5

Ce guide explique comment peupler l'environnement de staging avec des données cohérentes sans réactiver l'exécution automatique des seeds Strapi. Depuis `strapi/src/bootstrap.ts`, les seeds ne sont déclenchés automatiquement que lorsque `STRAPI_ENV` (ou `NODE_ENV`) vaut `development`, `dev`, `integration` ou `test`, et si `STRAPI_SEED_AUTO` n'est pas désactivé. 【F:strapi/src/bootstrap.ts†L1-L15】【F:strapi/src/utils/seed-helpers.ts†L64-L85】

> **Préproduction :** pour verrouiller le comportement côté staging/préprod, positionnez `STRAPI_SEED_AUTO=false`, `STRAPI_SEED_ADMIN_ALLOWED=false` et `STRAPI_SEED_FAILURE_STRATEGY=fail-fast`, puis exécutez manuellement `yarn --cwd strapi seed:dev` lorsqu'une initialisation contrôlée est nécessaire. 【F:strapi/src/utils/seed-helpers.ts†L90-L115】【F:strapi/src/seed/02-admin-user.ts†L1-L20】【F:strapi/package.json†L7-L17】

## Option 1 — Exécuter les seeds manuellement (recommandé)

Utilisez cette approche lorsque la base staging doit rester alignée sur les données "de démo" fournies par les scripts de seed.

1. Préparez un fichier `.env` sur l'instance staging à partir de `strapi/.env.example`, en remplissant au minimum `STRAPI_ADMIN_EMAIL`, `STRAPI_ADMIN_PASSWORD` et `STRAPI_API_READONLY_TOKEN`. 【F:strapi/.env.example†L5-L19】
2. Exportez temporairement les variables suivantes avant d'appeler le script de seed. Le flag `STRAPI_SEED_ADMIN_ALLOWED` permet au seed `02-admin-user.ts` de créer l'utilisateur d'administration si nécessaire, et `STRAPI_SEED_FAILURE_STRATEGY=fail-fast` force l'arrêt immédiat en cas d'erreur afin de ne pas laisser la base dans un état partiellement peuplé. 【F:strapi/src/seed/02-admin-user.ts†L1-L20】【F:strapi/src/utils/seed-helpers.ts†L87-L101】

   ```bash
   STRAPI_ENV=staging \
   STRAPI_SEED_ADMIN_ALLOWED=true \
   STRAPI_SEED_FAILURE_STRATEGY=fail-fast \
   yarn workspace @openg7/strapi seed:dev
   ```

   Le script `seed:dev` compile Strapi en mode "headless", exécute `runSeeds()` puis s'arrête. 【F:strapi/package.json†L7-L17】【F:strapi/scripts/seed.ts†L1-L18】

3. Vérifiez les journaux Strapi : chaque seed annonce son succès ou remonte l'erreur qui a déclenché l'arrêt.
4. Repassez `STRAPI_SEED_ADMIN_ALLOWED=false` dans l'environnement staging pour empêcher la recréation accidentelle du compte admin lors de futurs déclenchements manuels.

> Astuce : si vous utilisez un pipeline CI/CD, encapsulez la commande ci-dessus dans un job manuel (ex. `manual_seed_staging`) afin de contrôler explicitement chaque exécution.

## Option 2 — Restaurer un dump anonymisé

Si votre staging doit refléter des données de production (mais anonymisées), maintenez un dump SQLite ou PostgreSQL nettoyé :

1. Exportez la base de production.
2. Anonymisez les champs sensibles (emails, numéros de téléphone, adresses, etc.) via un script dédié.
3. Stockez le dump chiffré dans un bucket restreint ou un coffre-fort de secrets.
4. Lors d'un déploiement staging, restaurez le dump puis exécutez `yarn workspace @openg7/strapi seed:dev` **sans** `STRAPI_SEED_ADMIN_ALLOWED` pour que seuls les contenus non sensibles soient régénérés.

Cette approche garantit des scénarios réalistes tout en évitant de relancer les seeds automatiques sur des environnements prod-like.
