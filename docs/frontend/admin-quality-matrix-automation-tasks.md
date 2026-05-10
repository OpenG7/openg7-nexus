# Taches d'automatisation de la matrice QA admin

Ce document decoupe les ajouts necessaires pour reduire au maximum les operations manuelles autour de `/admin/quality`.

## Lot 1 - Ingestion autonome des impacts

Statut: demarre.

Objectif: permettre a Strapi de deduire les entrees de matrice impactees a partir de `changedFiles`, meme si `impactedEntryIds` est absent du payload CI.

Travail inclus:

- ajouter un resolveur d'impact cote `POST /api/admin/quality/matrix/ingest`;
- reutiliser les memes familles de prefixes que le script CI `scripts/resolve-admin-quality-matrix-impact.mjs`;
- combiner les entrees explicites et les entrees deduites;
- retourner `impactMode`, `impactReason`, `providedEntryIds`, `derivedEntryIds`, `resolvedEntryIds`;
- couvrir le cas par le test d'integration Strapi.

Critere de sortie:

```bash
yarn --cwd strapi test:integration:admin-quality-matrix
```

## Lot 2 - Recalcul automatique apres ingestion

Objectif: ne plus attendre un clic manuel sur `Generer le plan QA` apres un merge.

Travail prevu:

- lancer un recalcul cible sur `resolvedEntryIds` a la fin de l'ingestion;
- stocker le dernier plan genere dans une collection ou un champ dedie;
- exposer ce plan dans `GET /api/admin/quality/matrix`;
- afficher dans le front la date du dernier recalcul automatique;
- conserver le bouton comme action `Regenerer maintenant`.

Garde-fou:

- le recalcul automatique produit un plan, pas une application automatique des voyants.

## Lot 3 - Proof manifest CI

Objectif: remplacer la lecture humaine des artifacts par une preuve machine-readable.

Travail prevu:

- generer un artifact `matrix-proof-manifest.json` dans les workflows E2E/unitaires critiques;
- inclure `commitSha`, `workflowRunId`, `entryIds`, `checks`, `specs`, `artifactUrl`, `status`;
- faire lire ce manifeste par Strapi;
- rattacher automatiquement les preuves aux lignes de matrice concernees.

Critere de sortie:

- une ligne de matrice peut afficher `preuve CI verifiee` avec un lien vers le run et l'artifact.

## Lot 4 - Commentaire d'impact automatique sur PR

Objectif: informer le developpeur avant merge des lignes de matrice impactees et des preuves attendues.

Travail prevu:

- executer le mapping d'impact sur chaque PR;
- commenter les `entryId` impactes;
- lister les commandes recommandees;
- signaler les fichiers produit sans mapping specifique;
- bloquer ou avertir si une ligne critique change sans preuve.

## Lot 5 - Creation automatique de missions ou tickets

Objectif: transformer le backlog pilote par la matrice en travail executable sans recopie manuelle.

Travail prevu:

- creer ou mettre a jour une mission admin ops pour chaque commande `now` ou `blocked`;
- dedoublonner par `entryId` + `actionType`;
- inclure `targetFiles`, `suggestedCommands`, `expectedEvidence`;
- exposer le lien mission/ticket dans le drawer `/admin/quality`.

## Lot 6 - Lancement des validations depuis l'UI

Objectif: eviter de copier les commandes du plan QA dans un terminal.

Travail prevu:

- ajouter une action `Lancer les validations` dans le drawer;
- declencher un workflow GitHub Actions cible par `entryId`;
- suivre le run depuis le proof desk;
- rattacher automatiquement les artifacts au plan QA.

## Lot 7 - Auto-application controlee des propositions simples

Objectif: appliquer automatiquement seulement les promotions a tres faible risque.

Conditions minimales:

- preuve CI verte;
- `matrix-proof-manifest.json` present;
- `confidence` elevee;
- aucun resultat bloque;
- impact cible, pas global;
- statut non critique;
- aucune decision produit requise.

Interdictions:

- `blocked-conflicting-signals`;
- `blocked-insufficient-proof`;
- changement `hors MVP`;
- ligne securite/RBAC/compliance;
- modification de contrat API non validee.

## Lot 8 - Balayage nocturne

Objectif: eviter qu'une matrice devienne silencieusement vieille.

Travail prevu:

- lancer un recalcul complet planifie;
- detecter les preuves expirees;
- detecter les lignes sans revue recente;
- produire un rapport quotidien;
- notifier les Owner/Admin si des lignes critiques restent bloquees.

## Lot 9 - Audit trail et rollback

Objectif: rendre chaque automatisation explicable et reversible.

Travail prevu:

- enregistrer `correlationId`, `commitSha`, `workflowRunId`, `actor`, `reason`;
- stocker `previousStatus`, `nextStatus`, `evidenceRefs`;
- exposer l'historique dans le drawer;
- ajouter une action de rollback admin.

## Lot 10 - Cartographie d'impact partagee

Objectif: eviter la divergence entre le script CI et Strapi.

Travail prevu:

- extraire la map d'impact dans un module partage ou un fichier JSON versionne;
- consommer la meme source depuis `scripts/resolve-admin-quality-matrix-impact.mjs` et Strapi;
- ajouter un test qui compare les deux sorties sur un jeu de chemins reference.

## Ordre recommande

1. Terminer le lot 1.
2. Ajouter le lot 2 pour supprimer le clic de recalcul courant.
3. Ajouter le lot 3 pour rendre les preuves exploitables automatiquement.
4. Ajouter les lots 4 et 5 pour transformer le plan en travail sans recopie.
5. Ajouter le lot 6 pour lancer les validations depuis l'admin.
6. Ajouter le lot 7 seulement quand l'audit trail du lot 9 est en place.
