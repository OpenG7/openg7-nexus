# Admin-Quality Matrix Sync

Pour le mode operateur complet de la page `/admin/quality`, voir aussi [`../frontend/admin-quality-matrix-manual.md`](../frontend/admin-quality-matrix-manual.md).

Ce guide couvre le signal post-merge qui maintient la console `admin/quality` en etat `Refresh matrice` lorsqu'un merge sur `main` touche une surface suivie par la matrice.

## Vue d'ensemble

La chaine repose sur trois maillons:

1. Strapi sert la matrice via `GET /api/admin/quality/matrix`.
2. GitHub Actions publie un signal de merge via `.github/workflows/admin-quality-matrix-sync.yml` sur `POST /api/admin/quality/matrix/ingest`.
3. Le front marque une ligne `Refresh matrice` quand `repoSignalAt` ou une mission cloturee est plus recente que `reviewedAt`.

Le workflow ne reecrit pas directement les colonnes metier. Il publie un fait horodate qui force une relecture humaine de la ligne impactee.

L'endpoint d'ingestion accepte des `impactedEntryIds` explicites, mais peut aussi les deduire depuis `changedFiles`. La reponse expose `impactMode`, `impactReason`, `providedEntryIds`, `derivedEntryIds` et `resolvedEntryIds` pour diagnostiquer le mapping applique.

## Secrets requis

### Cote Strapi

- `STRAPI_ADMIN_QUALITY_INGEST_TOKEN`

Usage:
- secret bearer attendu par `POST /api/admin/quality/matrix/ingest`
- configure par environnement, jamais committe

Exemple:

```env
STRAPI_ADMIN_QUALITY_INGEST_TOKEN=change-me-long-random-token
```

### Cote GitHub Actions

- `ADMIN_QUALITY_MATRIX_INGEST_URL`
- `ADMIN_QUALITY_MATRIX_INGEST_TOKEN`

Usage:
- `ADMIN_QUALITY_MATRIX_INGEST_URL` pointe vers l'endpoint de l'environnement cible
- `ADMIN_QUALITY_MATRIX_INGEST_TOKEN` doit etre strictement identique a `STRAPI_ADMIN_QUALITY_INGEST_TOKEN`

Exemple preprod:

```txt
ADMIN_QUALITY_MATRIX_INGEST_URL=https://cms.preprod.openg7.org/api/admin/quality/matrix/ingest
ADMIN_QUALITY_MATRIX_INGEST_TOKEN=<meme valeur que STRAPI_ADMIN_QUALITY_INGEST_TOKEN cote preprod>
```

Exemple prod:

```txt
ADMIN_QUALITY_MATRIX_INGEST_URL=https://cms.openg7.org/api/admin/quality/matrix/ingest
ADMIN_QUALITY_MATRIX_INGEST_TOKEN=<meme valeur que STRAPI_ADMIN_QUALITY_INGEST_TOKEN cote prod>
```

## Branchement initial

1. Definir `STRAPI_ADMIN_QUALITY_INGEST_TOKEN` dans le runtime Strapi de l'environnement vise.
2. Ajouter dans GitHub les secrets `ADMIN_QUALITY_MATRIX_INGEST_URL` et `ADMIN_QUALITY_MATRIX_INGEST_TOKEN`.
3. Verifier que `.github/workflows/admin-quality-matrix-sync.yml` est actif sur `push` vers `main`.
4. Faire un merge test qui touche une surface mappee.
5. Confirmer dans `admin/quality` que la ligne correspondante passe en `Refresh matrice`.

## Rotation des secrets

La rotation doit etre atomique par environnement.

1. Generer un nouveau token aleatoire.
2. Mettre a jour `STRAPI_ADMIN_QUALITY_INGEST_TOKEN` dans l'environnement Strapi cible.
3. Mettre a jour `ADMIN_QUALITY_MATRIX_INGEST_TOKEN` dans GitHub Actions avec exactement la meme valeur.
4. Lancer un merge test ou un `workflow_dispatch` de verification.
5. Verifier que le workflow publie toujours `200` sur l'endpoint d'ingestion.

Regle:
- ne pas reutiliser le meme token entre preprod et prod
- ne pas changer l'URL GitHub pour pointer par erreur vers un autre environnement

## Diagnostic rapide

### Le workflow ne publie rien

Verifier:

1. que `ADMIN_QUALITY_MATRIX_INGEST_URL` existe dans les secrets du repo
2. que `ADMIN_QUALITY_MATRIX_INGEST_TOKEN` existe aussi
3. que le merge a bien eu lieu sur `main`

Comportement attendu:
- si un secret manque, le workflow skippe proprement la publication

### Le workflow publie mais Strapi renvoie `401`

Verifier:

1. que `ADMIN_QUALITY_MATRIX_INGEST_TOKEN` cote GitHub est identique a `STRAPI_ADMIN_QUALITY_INGEST_TOKEN`
2. qu'il n'y a ni espaces ni retour ligne parasite dans la valeur du secret

### Le workflow publie `200` mais la mauvaise ligne remonte

Verifier:

1. le mapping dans `scripts/resolve-admin-quality-matrix-impact.mjs`
2. les fichiers reels modifies par le merge
3. si le changement aurait du etre traite comme impact global plutot que cible

## Validations a lancer

Localement:

```bash
yarn --cwd strapi test:integration:admin-quality-matrix
node scripts/resolve-admin-quality-matrix-impact.mjs openg7-org/src/app/domains/feed/feature/feed.page.ts
```

En CI:

- `.github/workflows/ci-validate.yml` execute le test `test:integration:admin-quality-matrix`
- `.github/workflows/admin-quality-matrix-sync.yml` publie le signal post-merge

## Limites actuelles

- le mapping fichier -> domaine reste heuristique et doit rester aligne entre le script CI et Strapi
- le workflow signale qu'une ligne doit etre relue, mais ne modifie pas automatiquement les statuts metier
- la revue finale reste volontairement humaine