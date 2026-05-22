# Taches d'automatisation de la matrice QA admin

Ce document decoupe les ajouts necessaires pour reduire au maximum les operations manuelles autour de `/admin/quality`.

Etat verifie: l'ingestion autonome, le recalcul automatique cible, le stockage du dernier plan et la creation de missions pilote cote Strapi existent deja. Les lots ci-dessous distinguent donc ce qui est livre de ce qui reste a brancher dans la CI, l'UI ou la gouvernance.

## Lot 1 - Ingestion autonome des impacts

Statut: livre.

Objectif: permettre a Strapi de deduire les entrees de matrice impactees a partir de `changedFiles`, meme si `impactedEntryIds` est absent du payload CI.

Travail livre:

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

Statut: livre cote Strapi et expose cote front.

Objectif: ne plus attendre un clic manuel sur `Generer le plan QA` apres un merge.

Travail livre:

- lancer un recalcul cible sur `resolvedEntryIds` a la fin de l'ingestion;
- stocker le dernier plan genere dans une collection ou un champ dedie;
- exposer ce plan dans `GET /api/admin/quality/matrix`;
- afficher dans le front la date du dernier recalcul automatique;
- conserver le bouton comme action `Regenerer maintenant`.

Garde-fou:

- le recalcul automatique produit un plan, pas une application automatique des voyants.

## Lot 3 - Proof manifest CI

Statut: branchement CI principal livre, extension E2E dediee restante.

Objectif: remplacer la lecture humaine des artifacts par une preuve machine-readable.

Travail livre:

- `POST /api/admin/quality/matrix/ingest` accepte `proofManifest`;
- Strapi persiste une decision de mission `proof-manifest` par entree connue;
- les entrees du manifest sont ajoutees au recalcul automatique cible.
- le workflow `.github/workflows/ci-validate.yml` genere et publie l'artifact `matrix-proof-manifest.json` apres validations reussies;
- sur `push main`, `ci-validate.yml` republie le manifest vers `POST /api/admin/quality/matrix/ingest` quand les secrets d'ingestion sont configures.

Travail restant:

- etendre le manifest aux workflows E2E/unitaires dedies hors `ci-validate` si une preuve plus fine par parcours devient necessaire;
- rattacher un lien artifact plus precis si GitHub expose une URL d'artifact stable au moment de la generation.

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

Statut: missions pilote Strapi livre, tickets externes restant.

Objectif: transformer le backlog pilote par la matrice en travail executable sans recopie manuelle.

Travail livre:

- creer ou mettre a jour une mission admin quality pour chaque commande pilote dont la priorite n'est pas `later`;
- dedoublonner les missions pilote via `entryId::core`;
- inclure `targetFiles`, `suggestedCommands`, `expectedEvidence` dans le prompt operateur.

Travail restant:

- creer ou mettre a jour un ticket externe si un outil de suivi est branche;
- affiner la deduplication si plusieurs `actionType` simultanes doivent coexister pour une meme entree;
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

Statut: source canonique matrice livree, validation de divergence livree.

Objectif: eviter la divergence entre le script CI et Strapi.

Travail livre:

- `openg7-org/src/assets/data/admin-quality-matrix.json` porte les `impactRules` de chaque entree;
- `tools/admin-quality-matrix-impact-map.json` est regenere depuis la matrice par `yarn generate:admin-quality-impact-map`;
- `yarn validate:admin-quality-impact-map` echoue si l'artefact derive diverge;
- `scripts/resolve-admin-quality-matrix-impact.mjs` lit les regles depuis la matrice.

Travail restant:

- brancher `validate:admin-quality-impact-map` dans le workflow CI si la verification doit devenir bloquante.

## Lot 11 - Scanner de besoins metier

Statut: socle livre.

Objectif: rapatrier automatiquement les signaux de besoins depuis le repo sans modifier la matrice sans revue.

Travail livre:

- `yarn discover:admin-quality-needs` scanne docs, E2E, routes Angular, selectors, APIs Strapi et i18n;
- le rapport liste les `sourceRefs` decouvertes par entree;
- le rapport isole les sources non mappees pour alimenter les futures propositions de creation ou de split d'entree.

Travail restant:

- transformer les propositions du rapport en PR ou en decisions Strapi;
- ajouter une vue de revue dans `/admin/quality`.

## Ordre recommande

1. Ajouter le lot 4 pour commenter l'impact sur PR avant merge.
2. Finaliser le lot 5 seulement si un outil de tickets externe doit etre synchronise.
3. Ajouter le lot 6 pour lancer les validations depuis l'admin.
4. Ajouter le lot 9 avant toute auto-application de statut.
5. Etendre le lot 3 aux workflows E2E dedies si les preuves `ci-validate` sont trop larges.
6. Ajouter le lot 7 seulement quand l'audit trail du lot 9 est en place.
