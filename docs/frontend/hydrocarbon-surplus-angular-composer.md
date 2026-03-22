# UI Angular — Composer `hydrocarbon-surplus-offer`

## 1. Objectif

Ce document décrit le contenu UI exact du drawer Angular permettant a une entreprise d'hydrocarbures de publier un surplus de barils ou un ralentissement d'ecoulement depuis l'Alberta.

Il s'appuie sur les composants existants du domaine Feed :

- `FeedPublishSectionComponent`
- `Og7DynamicPublicationFormComponent`
- `PublicationFormConfigService`
- `PublicationFormMapperService`

## 2. Points d'entree

L'utilisateur ouvre le drawer via le bouton principal du feed :

- composant : `openg7-org/src/app/domains/feed/feature/feed-publish-section/feed-publish-section.component.html`
- hook UI : `[data-og7="action"][data-og7-id="feed-open-publish-drawer"]`

Une fois le drawer ouvert :

1. l'utilisateur bascule sur le mode `Template`
2. il selectionne la carte `hydrocarbon-surplus-offer`
3. le formulaire dynamique charge sa configuration JSON

## 3. Comportement du drawer

### 3.1 Mode picker

Le drawer conserve deux modes :

- `Generic composer`
- `Template`

Pour ce cas d'usage, le parcours attendu est :

- clic sur `[data-og7-id="feed-publish-mode-template"]`
- clic sur `[data-og7-id="feed-template-hydrocarbon-surplus-offer"]`

### 3.2 Etats utilisateur

- anonyme : affichage du gate d'authentification
- authentifie : affichage du formulaire dynamique
- hors ligne : soumission bloquee avec message `feed.error.offline`
- succes : fermeture du drawer et publication dans le feed
- erreur backend : affichage d'un statut d'erreur non bloquant

## 4. Structure UI exacte du formulaire

Le template `hydrocarbon-surplus-offer` est rendu par :

- `openg7-org/src/app/domains/feed/feature/dynamic-publication-form/og7-dynamic-publication-form.component.ts`
- `openg7-org/src/app/domains/feed/feature/dynamic-publication-form/og7-dynamic-publication-form.component.html`

### 4.1 Section `signal`

But : cadrer rapidement le signal metier.

Champs rendus :

- `title`
- `summary`
- `companyName`
- `publicationType`
- `productType`
- `businessReason`

Affichage recommande :

- `title` pleine largeur
- `summary` pleine largeur
- `companyName`, `publicationType`, `productType`, `businessReason` en grille 2 colonnes desktop, 1 colonne mobile

### 4.2 Section `volume`

But : qualifier l'amplitude du signal et son urgence.

Champs rendus :

- `volumeBarrels`
- `minimumLotBarrels`
- `availableFrom`
- `availableUntil`
- `estimatedDelayDays` uniquement si `publicationType = slowdown`
- `storagePressureLevel`

Comportements :

- `availableUntil` doit etre posterieure ou egale a `availableFrom`
- `estimatedDelayDays` n'apparait que pour un ralentissement
- `storagePressureLevel` donne le ton de priorisation dans l'UI et dans les metadonnees

### 4.3 Section `routing`

But : dire d'ou part le volume, vers quels debouches, et sous quelles contraintes.

Champs rendus :

- `fromProvinceId` pre-rempli a `AB`
- `toProvinceId` optionnel pour une cible prioritaire
- `originSite`
- `qualityGrade`
- `logisticsMode`
- `targetScope`

Comportements :

- `logisticsMode` est un multiselect
- `targetScope` est un multiselect cible marche/provinces
- le champ `toProvinceId` alimente le routage principal du feed si une cible nette existe

### 4.4 Section `commercial`

But : donner assez d'information pour une prise de contact utile sans imposer un contrat complet.

Champs rendus :

- `priceReference`
- `responseDeadline`
- `notes`

### 4.5 Section `contact`

But : permettre une activation rapide du bon interlocuteur.

Champs rendus :

- `contactChannel`
- `tags`

## 5. Rendu et microcopie

### 5.1 Titre de carte template

Texte attendu :

- FR : `Publier un surplus ou un ralentissement de barils`
- EN : `Publish an oil surplus or barrel slowdown`

### 5.2 Description de carte template

Texte attendu :

- FR : `Structurez un signal petrolier Alberta -> debouches afin d'activer rapidement acheteurs, stockeurs ou transporteurs.`
- EN : `Structure an Alberta oil signal so buyers, storage operators, or logistics partners can react quickly.`

### 5.3 Exemples de titres

- `48 000 barils disponibles suite a un ralentissement logistique en Alberta`
- `Surplus WCS court terme disponible pour raffineries de l'Ontario`
- `Fenetre de redirection de brut albertain avant saturation de stockage`

## 6. Mapping Angular attendu

### 6.1 Selection du template

Le template est charge par `PublicationFormConfigService.list()` et apparait automatiquement :

- dans le drawer de publication
- dans les filtres de template du stream si necessaire
- dans la carte de metadonnees de detail

### 6.2 Soumission

La soumission suit cette chaine :

1. `Og7DynamicPublicationFormComponent` emet les valeurs brutes
2. `FeedPublishSectionComponent.handleTemplateSubmitted()` appelle `PublicationFormMapperService.map()`
3. le resultat est envoye a `FeedRealtimeService.publishDraft()`
4. les metadonnees `publicationForm` et `extensions` sont jointes au payload

## 7. Hooks UI a verifier

- `[data-og7="feed-publish-section"]`
- `[data-og7="feed-publish-drawer"]`
- `[data-og7="feed-publish-mode-picker"]`
- `[data-og7="feed-publish-template-list"]`
- `[data-og7-id="feed-template-hydrocarbon-surplus-offer"]`
- `[data-og7="dynamic-publication-form"]`
- `[data-og7="publication-metadata-card"]`

## 8. Experience mobile

- toutes les sections passent en une colonne
- les groupes radio restent tactiles avec zones de clic larges
- les multiselects `logisticsMode` et `targetScope` doivent rester scrollables sans casser le drawer
- le CTA de soumission reste visible en bas du formulaire

## 9. Resultat visuel attendu dans le feed

Apres publication, la carte feed doit exposer au minimum :

- un titre explicite
- un resume actionnable
- `fromProvinceId = AB`
- eventuellement `toProvinceId`
- `quantity = volumeBarrels` avec unite `bbl`
- metadonnees detaillees visibles dans la fiche detail

## 10. Limites actuelles

- le `FeedComposerDraft` ne porte pas encore nativement tous les champs hydrocarbures
- les champs avances restent donc dans `metadata.extensions`
- si le backend veut exploiter ces champs sans parsing supplementaire, un endpoint specialise ou une persistence structuree est recommande

## 11. Vue dediee et client front

La feature dispose maintenant d'une vue dediee cote front :

- route : `/feed/hydrocarbons`
- entree visible : menu `Plus d'options` du header
- panneau specialise : consommation directe de `StrapiClient.hydrocarbonSignals()` dans `FeedPage`

Le parcours complet devient :

1. ouvrir le menu header
2. cliquer sur `Flux hydrocarbures`
3. consulter la vue feed specialisee
4. lire a droite le panneau `Signaux structures` issu de `/api/hydrocarbon-signals`
5. ouvrir ou publier un signal depuis le feed

Ce point d'entree combine :

- le stream feed generique
- les filtres et templates existants
- une lecture specialisee des signaux hydrocarbures deja projetes cote Strapi