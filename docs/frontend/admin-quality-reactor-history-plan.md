# Plan de travail — Historique comparatif du réacteur qualité

Date : 12 septembre 2026. Statut : proposé, programmation non commencée.

Base vérifiée : `main` au commit `7d617a4`, intégrant les PR #114 (fiabilité) et #115 (explications). Le répertoire de travail était propre avant l'ajout de ce plan.

**Objectif et périmètre du MVP**

Permettre à un administrateur de comprendre ce qui a changé entre les deux dernières évaluations enregistrées du réacteur : couverture, catégories, priorités et fraîcheur des révisions. Ajouter une action **« Voir les changements »**, reliée aux domaines concernés dans la matrice.

Une évaluation enregistrée constate les données effectives de Strapi à un instant donné. Elle ne certifie pas de nouveaux tests et ne transforme pas une proposition de recalcul en changement appliqué.

Le MVP compare uniquement les deux dernières versions distinctes du portefeuille courant. La navigation dans un historique long, la restauration d'une ancienne matrice, les notifications automatiques et les graphiques chronologiques sont reportés. La correction mobile connue fait partie du travail préalable.

**Point de départ constaté**

- Le réacteur expose déjà les causes de son état, des filtres exacts et les références par domaine. Son indicateur de tendance reste explicitement indisponible.
- Strapi conserve un journal d'édition par entrée et un dernier plan de recalcul, mais aucun historique global des diagnostics.
- `generatedAt` dépend actuellement de dates éditoriales : ce champ ne peut pas servir d'identifiant de version ou de preuve de réévaluation.
- La fraîcheur dépend des révisions, des signaux du dépôt et des décisions de mission terminées. Le passage du temps peut donc changer le diagnostic sans changement de catégorie.
- La validation précédente a détecté un débordement horizontal sur mobile après ouverture du panneau. La cause CSS exacte et sa correction restent à confirmer sur `main` ; les anciens résultats de tests ne constituent pas une nouvelle recette de cette branche.

**Ordre de réalisation**

| Lot | Travail et livrable                                                            | Dépendance                          | Condition de sortie                                                                   |
| --- | ------------------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------- |
| 0   | Reproduire et corriger le débordement mobile ; stabiliser la recette existante | Aucune                              | Les huit scénarios E2E du réacteur passent, dont FR/EN à 390 px et mouvement réduit   |
| 1   | Définir le contrat d'évaluation et les règles de comparaison                   | Aucune ; peut avancer avec le lot 0 | Exemples avant/après documentés, règles versionnées et cas non comparables définis    |
| 2   | Ajouter la persistance, la capture et l'API d'historique                       | Lot 1                               | Versions cohérentes, persistantes, dédupliquées et protégées par les droits existants |
| 3   | Implémenter le comparateur métier pur                                          | Lot 1 ; peut avancer avec le lot 2  | Résultats déterministes, changements de périmètre séparés et tests de limites réussis |
| 4   | Intégrer la comparaison et « Voir les changements » dans Angular               | Lots 0, 2 et 3                      | Parcours complet accessible, traduit et relié aux bonnes lignes                       |
| 5   | Effectuer la recette, préparer le déploiement et transmettre les connaissances | Lots 2 à 4                          | Tests requis réussis, initialisation documentée et aucune tendance infondée           |

**Lot 0 — Fermer le contrôle mobile restant**

- Rejouer `openg7-org/e2e/admin-quality-reactor.spec.ts` sur la base fusionnée.
- Mesurer le débordement du réacteur et de ses descendants, panneau fermé puis ouvert. La combinaison `inset: 4%` et `width: 100%` du SVG orbital est une piste à vérifier, pas une cause établie.
- Corriger l'élément responsable en préservant l'affichage des textes, des boutons et du focus. Conserver les assertions de largeur et de mouvement réduit.
- Vérifier les parcours clavier, l'affichage desktop et mobile FR/EN, puis conserver les captures de recette.

**Lot 1 — Définir ce que représente une version**

Contrat proposé : identifiant de snapshot, séquence monotone par périmètre, date serveur `capturedAt`, `schemaVersion`, `rulesVersion`, empreinte canonique, provenance du déclenchement, entrées normalisées et résultats du diagnostic à la capture.

Pour chaque entrée, conserver les informations nécessaires à l'explication : identifiant stable, libellé, catégorie, priorité, statuts, date de révision, références de preuve, signaux du dépôt et décisions ou confirmations utilisées pour la fraîcheur. Ne pas enregistrer les secrets, conversations ou prompts sans rapport avec le diagnostic.

Les règles de classification et de fraîcheur doivent être réutilisables par le serveur et Angular sans importer un composant Angular dans Strapi. Prévoir leur extraction dans un module métier pur partagé, avec tests de parité pendant la transition et mise à jour des contrats HTTP.

Décisions retenues pour la comparaison :

- Apparier les entrées par `entryId`, jamais par leur libellé. Un renommage conserve son identité ; un nouvel identifiant produit un ajout et un retrait, sauf correspondance explicite.
- Afficher les taux et les dénominateurs avant/après. Exprimer leur différence en **points de pourcentage**.
- Séparer les changements sur les domaines communs, les domaines ajoutés et les domaines retirés. Une lacune retirée du périmètre n'est pas une lacune résolue.
- Distinguer nouvellement couvert, couverture perdue, autre changement de catégorie, priorité modifiée, révision renouvelée et révision arrivée à échéance. Ne pas ordonner arbitrairement les catégories non couvertes comme une échelle de progrès.
- Figer les résultats historiques à `capturedAt`. Consulter une ancienne version aujourd'hui ne doit pas modifier rétroactivement son état.
- Avant deux versions comparables, afficher « Historique insuffisant ». Si les règles diffèrent ou si aucun domaine n'est commun, ne pas qualifier de tendance.
- Pour le MVP, qualifier la tendance de **couverture sur les domaines communs** : hausse, baisse ou inchangée. Les priorités et la fraîcheur sont des variations séparées ; elles ne sont pas masquées par une hausse de couverture.

**Lot 2 — Capturer les états effectifs dans Strapi**

- Extraire un service de lecture canonique du portefeuille et de ses décisions pertinentes. Garantir l'exhaustivité par pagination : les plafonds actuels de lecture ne doivent pas inventer des suppressions de domaines.
- Ajouter une persistance dédiée aux évaluations, avec ordre monotone et conservation des deux dernières versions distinctes pour le MVP. Ce stockage ne remplace pas un journal d'audit complet.
- Regrouper les écritures métier et la capture dans une transaction ; vérifier les mécanismes de concurrence avec les bases prises en charge. Une capture ne doit jamais mélanger deux opérations ou conserver une mutation partiellement échouée.
- Dédupliquer les répétitions d'une même opération et les captures successives identiques. L'empreinte inclut les données utiles, les résultats de fraîcheur et la version des règles ; elle exclut l'heure de capture seule, l'ordre des listes et les métadonnées de proposition de recalcul. La séquence A → B → A reste trois évaluations distinctes dans le temps : ne pas rendre l'empreinte globalement unique.
- Brancher la capture après les changements réellement appliqués : édition d'entrée, application de proposition, ingestion effective, acceptation d'un besoin modifiant le portefeuille, et modification ou suppression d'une décision affectant la fraîcheur.
- Un recalcul préparatoire conserve son rôle de proposition. Il ne produit pas une version présentant les valeurs proposées comme appliquées.
- Prévoir `POST /api/admin/quality/matrix/evaluations` pour une réévaluation explicite, notamment lorsque seule l'expiration d'une revue change l'état. Le serveur lit ses propres données ; le navigateur ne lui fournit pas un diagnostic à considérer comme fiable.
- Prévoir `GET /api/admin/quality/matrix/history?limit=2`, strictement en lecture. Un GET, un export et un chargement de page ne créent pas de version.
- Réutiliser la politique `global::owner-admin-ops` et les contrôles existants d'ingestion. Ne pas exposer de CRUD public sur les snapshots.
- Initialiser une première référence par une opération explicite et idempotente sur les données effectives. Ne pas reconstruire un passé fictif depuis le JSON exporté ou les dates d'édition.

L'action de réévaluation renverra la matrice et l'identifiant d'évaluation cohérents entre eux. En cas d'échec, conserver l'ancienne comparaison avec ses dates et signaler l'échec. Si le diagnostic courant a évolué depuis la dernière capture, indiquer qu'une réévaluation est nécessaire ; ne pas présenter l'ancienne comparaison comme une mesure de l'état actuel.

**Lot 3 — Calculer des différences explicables**

Produire un résultat typé comprenant les versions comparées, la comparabilité, les compteurs avant/après, les variations de couverture globale et à périmètre commun, les ajouts/retraits et les changements détaillés par domaine.

Cas de référence :

| Situation                                            | Résultat attendu                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 6/15 couverts puis 8/15, mêmes domaines              | Deux domaines nouvellement couverts ; +13,3 points de couverture                                       |
| 6/15 couverts puis 6/14 après retrait d'une lacune   | Hausse du taux global expliquée par le périmètre ; aucune nouvelle couverture sur les domaines communs |
| Catégories identiques, une revue expire              | Couverture inchangée ; une révision arrivée à échéance                                                 |
| Catégories identiques, preuves référencées modifiées | Changement de références traçable, sans conclure à une réussite de test                                |
| Changement de `rulesVersion`                         | Comparaison descriptive disponible, qualification de tendance suspendue                                |
| Première capture ou données incomplètes              | Historique insuffisant ou indisponible, jamais une tendance positive par défaut                        |

**Lot 4 — Donner accès aux changements dans Angular**

- Ajouter les contrats d'historique au port du package et à l'adaptateur HTTP de l'application, avec gestion explicite des erreurs.
- Ajouter un panneau standalone, signal-first et OnPush pour les deux versions, leurs dates, la provenance utile et les groupes de changements. Prévoir les traductions FR/EN et enregistrer les nouveaux sélecteurs dans le [registre Nexus](../agents/selector-registry.md).
- Relier « Voir les changements » à ce panneau. Le chargement de l'historique ne doit pas empêcher l'accès à la matrice courante.
- Réutiliser le principe des filtres exacts : une action ouvre les identifiants concernés, retire les filtres contradictoires, affiche un bandeau réinitialisable et déplace le focus vers la matrice.
- Afficher les domaines retirés dans la comparaison historique ; ne pas tenter de les ouvrir comme des lignes encore présentes dans la matrice.
- Gérer zéro version, une version, absence de changement, versions non comparables, erreur API et comparaison devenue ancienne. Préserver les références historiques même si le domaine a depuis été renommé.

**Lot 5 — Validation et transfert de connaissances**

- Tests métier : identités stables, périmètre ajouté/retiré, catégories inconnues, arrondis, comparaisons mixtes, dates limites et changement de règles.
- Tests API : refus des accès non autorisés, persistance après redémarrage, transaction annulée, opérations concurrentes, répétition d'ingestion, A → B → A, absence de capture sur GET/proposition/erreur et lecture exhaustive du portefeuille.
- Tests Angular : chargement indépendant, messages d'erreur, état sans historique, filtres exacts, domaines retirés et cohérence avec la matrice affichée.
- E2E : parcours existants plus deux évaluations comparables, expiration seule, changement de périmètre, erreur de capture, FR/EN, clavier et mobile avec mouvement réduit.
- Utiliser Node 22 conformément au dépôt et une base de test isolée. Conserver le contrôle de base existant de Playwright.
- Avant la PR : exécuter les validations du dépôt applicables (lint, format, sélecteurs, génération et validation des contrats, builds Angular/Strapi, tests ciblés et smoke). Documenter les commandes, résultats et éventuelles limites de la recette.
- Documenter le schéma, les déclencheurs, la rétention limitée, l'initialisation et les cas non comparables. Fournir un exemple avant/après avec la chaîne « événement → données enregistrées → différence affichée ».
- Déployer le backend compatible avant le frontend. Prévoir un retour à l'indicateur « historique indisponible » sans modifier les classements métier si l'historique doit être désactivé.

**Repères dans le dépôt**

| Zone                                | Fichiers existants à reprendre                                                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lecture et mutations de la matrice  | `strapi/src/api/admin-quality-matrix/controllers/admin-quality-matrix.ts` et `routes/admin-quality-matrix.ts`                                                                                          |
| Données persistées des entrées      | `strapi/src/api/admin-quality-matrix/content-types/admin-quality-matrix-entry/schema.ts`                                                                                                               |
| Décisions contribuant au diagnostic | `strapi/src/api/admin-quality-mission-decision/controllers/admin-quality-mission-decision.ts`                                                                                                          |
| Droits et tests API                 | `strapi/src/seed/01-roles-permissions.ts`, `strapi/scripts/test-admin-quality-matrix-api-integration.js`                                                                                               |
| Contrats HTTP                       | `packages/contracts/spec/openapi.json`, modèles du package et adaptateur HTTP de l'application                                                                                                         |
| Règles du réacteur                  | `packages/admin-quality/src/lib/pages/admin-quality-reactor-state.ts`, `admin-quality-reactor-explanations.ts`, `admin-quality-review-freshness.ts`                                                    |
| Port et intégration Angular         | `packages/admin-quality/src/lib/admin-quality.tokens.ts`, `packages/admin-quality/src/lib/pages/admin-quality.page.ts`, `openg7-org/src/app/domains/admin/data-access/admin-quality-matrix.service.ts` |
| Recette navigateur                  | `openg7-org/e2e/admin-quality-reactor.spec.ts` et `openg7-org/playwright.config.ts`                                                                                                                    |

**Découpage de livraison proposé**

1. PR de correction mobile et recette du réacteur existant, depuis `main`.
2. PR des contrats, règles partagées, persistance, API et comparateur, sans activer l'interface d'historique.
3. PR du panneau, de l'indicateur de couverture comparée et de la recette complète, après intégration du backend.

Charge indicative : **7 à 10 jours de développement et recette**, à affiner à la fin du lot 1. Le principal facteur d'incertitude est l'atomicité des écritures existantes et leur capture cohérente ; les lots 2 et 3 peuvent avancer en parallèle.

Le travail sera terminé quand deux évaluations réelles permettront d'expliquer chaque variation affichée, de retrouver les bons domaines et de distinguer sans ambiguïté changement produit, changement de périmètre et vieillissement d'une révision, avec la recette mobile complète réussie.
