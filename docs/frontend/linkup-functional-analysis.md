# Analyse fonctionnelle — Centre de mises en relation OpenG7

## 1. Contexte et objectifs

- **Contexte** : OpenG7 s'étend d'un moteur de recherche/cartographie vers un outil opérationnel pour les équipes économiques. Les mises en relation constituent un processus critique qui doit être centralisé et historisé.
- **Objectif principal** : fournir une expérience unifiée de suivi des mises en relation ("linkups") depuis leur création jusqu'à leur résolution, pour renforcer la crédibilité de la plateforme, faciliter le pilotage et préparer les fonctionnalités d'assistance IA.
- **Objectifs secondaires** :
  - Améliorer la traçabilité des interactions avec les entreprises partenaires.
  - Rendre visible l'état d'avancement de chaque mise en relation pour limiter les doublons et les pertes d'information.
  - Collecter les données structurées nécessaires à des recommandations futures (IA, rapports, visualisations).

## 2. Périmètre MVP

- Pages incluses :
  - **/linkups** : tableau de bord des mises en relation existantes.
  - **/linkups/:id** : fiche détaillée d'une mise en relation.
- Données manipulées : uniquement les mises en relation existantes (pas de création directe dans ce MVP).
- Fonctions hors périmètre MVP :
  - Edition avancée de conversations (messagerie en temps réel).
  - Génération automatique de rapports PDF/exports.
  - Visualisation cartographique des mises en relation.
  - Automatisation IA (recommandations proactives, scoring).

## 3. Personae et besoins clés

| Persona                                                  | Objectif                                           | Besoin principal                                              | Indicateurs d'adoption                               |
| -------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| **Chargé de mission économique** (utilisateur quotidien) | Suivre ses démarches auprès d'entreprises ciblées  | Voir rapidement le statut actuel et l'historique des échanges | Temps moyen pour identifier l'étape suivante < 1 min |
| **Responsable sectoriel**                                | Obtenir une vision consolidée par secteur/province | Filtrer/segmenter les mises en relation par critères métiers  | Couverture des filtres utilisés (>70 % des sessions) |
| **Partenaire institutionnel**                            | Vérifier l'efficacité du dispositif                | Accéder à des informations synthétiques et fiables            | Taux de dossiers mis à jour (< 7 jours)              |
| **Équipe IA / data** (interne)                           | Construire des modèles d'aide à la décision        | Accéder à des données historisées et structurées              | Volume d'événements exploitable (>90 % des linkups)  |

## 4. Données & structure attendue

### 4.1 Entité "Linkup"

Champs requis (MVP) :

- `id` (UUID)
- `createdAt`, `updatedAt`
- `originCompany` (référence entreprise émettrice)
- `targetCompany` (référence entreprise ciblée)
- `sectors` (1..n secteurs impliqués)
- `exchangeMode` (`import` | `export` | `both`)
- `status` (enum : `pending`, `in_discussion`, `completed`, `closed`)
- `statusUpdatedAt`
- `createdBy` (utilisateur OpenG7)
- `notesInternal` (texte riche court)
- `timelineEvents` (liste d'événements datés — voir §4.2)

Contraintes :

- `originCompany` et `targetCompany` doivent exister dans le catalogue.
- `statusUpdatedAt` obligatoire, mis à jour à chaque changement de statut.
- `timelineEvents.date` ≥ `createdAt`.

### 4.2 Entité "TimelineEvent"

Champs :

- `id` (UUID)
- `date` (ISO 8601)
- `channel` (`openg7` | `email` | `phone` | `meeting` | `other`)
- `summary` (texte court visible)
- `author` (utilisateur ou système)
- `visibility` (`internal` | `shared`) — MVP : `internal` par défaut.

Règles :

- Les événements sont ordonnés du plus récent au plus ancien côté backend pour simplifier l'affichage.
- Un événement "création" est généré automatiquement lors de la création de la mise en relation.

## 5. Parcours fonctionnels

### 5.1 Consulter l'historique des mises en relation

1. L'utilisateur navigue vers `/linkups` via le menu principal "Opérations".
2. La page charge la liste paginée des mises en relation auxquelles l'utilisateur a accès (filtrée selon ses permissions).
3. L'utilisateur applique des filtres (statut, mode d'échange, texte libre) pour réduire la liste.
4. L'utilisateur clique sur "Voir détails" pour ouvrir la fiche d'une mise en relation.

### 5.2 Examiner le détail d'une mise en relation

1. La page `/linkups/:id` charge la fiche détaillée.
2. L'en-tête affiche : entreprises, secteur principal, statut, dernière mise à jour.
3. La section "Timeline" liste les événements par ordre chronologique inverse, avec date, canal, résumé et auteur.
4. L'utilisateur peut ajouter/modifier des notes internes (MVP : textarea + bouton "Enregistrer").
5. Un bouton "Retour à la liste" renvoie vers `/linkups` en conservant les filtres précédents.

### 5.3 Mettre à jour le statut (extension proche)

- MVP : mise à jour manuelle depuis la fiche détail via un menu déroulant et confirmation.
- Contraintes : journaliser le changement (timeline + audit), déclencher notification optionnelle.

## 6. Règles métier et validations

- Statuts autorisés et transitions :
  - `pending` → `in_discussion` | `closed`
  - `in_discussion` → `completed` | `closed`
  - `completed` → (verrouillé, modifications uniquement par admin)
  - `closed` → `in_discussion` (réouverture exceptionnelle) | reste `closed`
- Toute modification du statut déclenche l'update de `statusUpdatedAt` et l'ajout d'un événement "StatusChanged".
- Les notes internes sont limitées à 5000 caractères, pas de HTML riche dans le MVP (texte brut stocké en Markdown).
- Les filtres côté liste sont cumulables et doivent persister dans l'URL via query params pour permettre le partage.
- Pagination par défaut : 25 éléments par page, tri descendant sur `statusUpdatedAt`.

## 7. UX et composants Angular

### 7.1 Page `/linkups`

- **Titre** : "Mises en relation"
- **Sous-titre** : "Suivez l’historique de vos connexions économiques et où chacune est rendue."
- **Barre de filtres** :
  - Toggle multi-sélection pour les statuts (chips colorées).
  - Boutons radio pour `exchangeMode` (`import`, `export`, `import+export`, `tous`).
  - Champ de recherche texte (nom entreprise, secteur, province) avec debounce 300 ms.
- **Tableau principal** (MatTable ou composant dédié) :
  - Colonnes : Entreprise A, Entreprise B, Secteur principal, Date de création, Statut (chip), Action.
  - Action "Voir détails" ouvre `/linkups/:id`.
- **Empty state** : message explicite et CTA "Créer une mise en relation" (même si non actif dans MVP, lien vers formulaire global).

### 7.2 Page `/linkups/:id`

- **Header** :
  - Cartouche résumant les entreprises, le type d'échange, le statut (avec couleur) et la dernière mise à jour.
  - Boutons : "Modifier le statut" (dropdown) et "Retour".
- **Sections** :
  - **Résumé** : listing des métadonnées clés (secteurs, provinces, contacts).
  - **Timeline** : carte verticale d'événements, affichant date + canal + résumé.
  - **Notes internes** : textarea + bouton d'enregistrement (MVP).
- **État de chargement** : skeletons pour header et timeline.
- **Gestion des erreurs** : message toast en cas d'échec de sauvegarde des notes, redirection 404 si `id` inconnu.

## 8. Architecture applicative (Angular signal-first)

- **Store local** (`src/app/domains/matchmaking/data-access/linkup.store.ts`) :
  - Expose des `signal()` pour `linkups`, `selectedLinkup`, `filters`.
  - `loadLinkups()` interroge l'API (Strapi) avec les query params dérivés des filtres.
  - `loadLinkup(id)` récupère la fiche détaillée.
  - `updateNotes(id, notes)` et `updateStatus(id, status)` renvoient des observables ou promesses selon convention.
- **Page list** (`src/app/domains/matchmaking/pages/linkup-history.page.ts`) :
  - Signals locaux `filterStatus`, `filterMode`, `searchTerm`.
  - `computed` `filteredLinkups` pour appliquer la recherche côté client si besoin.
  - Synchronisation des filtres ↔ query params via `Router` + `effect`.
- **Page détail** (`src/app/domains/matchmaking/pages/linkup-detail.page.ts`) :
  - Signal `linkupId` issu des params route.
  - Signal `isSavingNotes` pour gestion de l'état du bouton.
  - Effet pour recharger la fiche lors d'un refresh de statut/notes.
- **Composants UI réutilisables** :
  - `og7-linkup-status-chip` : badge coloré selon statut.
  - `og7-timeline` : composant vertical d'événements.

## 9. API & intégration backend

- **Endpoint liste** : `GET /api/linkups?filters[...]&pagination[...]&populate=...`
  - Paramètres : `status[in]=`, `exchangeMode=`, `search=` (appliqué sur entreprises, secteurs, provinces).
  - Réponse : données paginées (`meta.pagination`).
- **Endpoint détail** : `GET /api/linkups/:id?populate=timelineEvents,originCompany,targetCompany,sectors`
- **Endpoint notes** : `PUT /api/linkups/:id` avec payload partiel (`data.notesInternal`).
- **Endpoint statut** : `PUT /api/linkups/:id/status` (extension future pour isoler la logique métier).
- **Sécurité** :
  - Accès restreint aux rôles internes (ex. `authenticated` + permission spécifique `linkup.read`).
  - Journalisation des actions critiques (statut, notes) pour audit.

## 10. KPIs & instrumentation

- Taux de mises en relation mises à jour dans les 7 derniers jours.
- Nombre moyen d'événements par mise en relation.
- Temps moyen passé dans la page détail.
- Utilisation des filtres (statistiques d'événements UI pour prioriser les améliorations).

## 11. Backlog d'améliorations

1. **Messagerie intégrée** : convertir la section notes en fil de conversation multi-utilisateurs.
2. **Automatisation IA** : suggestions de relances, détection de doublons, scoring de probabilité de succès.
3. **Tableau de bord analytique** : graphiques par secteur, province, statut.
4. **Intégration carte** : visualisation géographique des mises en relation réussies.
5. **Exports & rapports** : génération CSV/PDF, partage sécurisé avec partenaires externes.
6. **Notifications** : alertes e-mail/Slack lors de changements de statut ou d'inactivité prolongée.

## 12. Risques & points d'attention

- **Qualité des données** : nécessité d'une discipline de saisie pour garantir la valeur future (IA, reporting).
- **Gestion des permissions** : s'assurer que les notes internes restent privées selon le rôle.
- **Performance** : prévoir pagination et lazy loading si le volume de linkups augmente (>10k).
- **Adoption** : accompagner le lancement avec un guide utilisateur et des formations rapides.

## 13. Livrables associés

- Spécifications API détaillées (OpenAPI) pour l'entité `linkup` et ses endpoints.
- Maquettes UI (Figma) pour la liste et la fiche détail.
- Plan de migration des données si des mises en relation existent déjà dans d'autres systèmes.
- Stratégie de seed Strapi pour des données de démonstration (ex. 10 linkups type) afin de valider l'UX.
