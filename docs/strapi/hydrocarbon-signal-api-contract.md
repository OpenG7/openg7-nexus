# Strapi / API — Contrat pour `hydrocarbon-surplus-offer`

## 1. Objectif

Ce document propose le contrat backend pour persister et exposer les publications de type `hydrocarbon-surplus-offer` soumises depuis le feed Angular.

Le but est de ne plus traiter le signal uniquement comme un brouillon generique `FeedComposerDraft`, mais comme une publication energie structuree, exploitable par Strapi, le feed, les analytics et la moderation.

## 2. Positionnement

Le front poste deja :

- un `draft` minimal compatible feed
- `metadata.publicationForm`
- `metadata.extensions`

Ce contrat recommande de conserver la compatibilite descendante avec `POST /api/feed`, tout en ajoutant une structure persistante explicite pour les signaux hydrocarbures.

## 3. Endpoint recommande

### 3.1 Publication

Option de continuité recommandée :

- `POST /api/feed?formKey=hydrocarbon-surplus-offer`

Body :

```json
{
  "type": "OFFER",
  "sectorId": "energy",
  "title": "Alberta crude surplus following corridor slowdown",
  "summary": "48,000 barrels are temporarily available after a slowdown on the primary outbound corridor.",
  "fromProvinceId": "ab",
  "toProvinceId": "on",
  "mode": "EXPORT",
  "quantity": {
    "value": 48000,
    "unit": "bbl"
  },
  "tags": ["alberta", "surplus-window", "slowdown", "crude-oil"],
  "metadata": {
    "publicationForm": {
      "formKey": "hydrocarbon-surplus-offer",
      "schemaVersion": 1
    },
    "extensions": {
      "companyName": "Northern Prairie Energy",
      "publicationType": "slowdown",
      "productType": "crude-oil",
      "businessReason": "transport-disruption",
      "originSite": "Edmonton terminal cluster",
      "qualityGrade": "wcs",
      "logisticsMode": ["rail", "storage-transfer"],
      "targetScope": ["sk", "mb", "refining-network"],
      "availableFrom": "2026-03-25",
      "availableUntil": "2026-04-04",
      "minimumLotBarrels": 12000,
      "estimatedDelayDays": 10,
      "storagePressureLevel": "high",
      "priceReference": "WCS less transport differential",
      "responseDeadline": "2026-03-30",
      "contactChannel": "Crude desk",
      "notes": "Priority routing required before storage reaches critical threshold."
    }
  }
}
```

### 3.2 Lecture feed

Le `GET /api/feed` doit renvoyer ces metadonnees sans perte :

- `metadata.publicationForm.formKey`
- `metadata.publicationForm.schemaVersion`
- `metadata.extensions.*`

### 3.3 Filtrage

Filtres recommandes :

- `formKey=hydrocarbon-surplus-offer`
- `sector=energy`
- `fromProvince=ab`
- `metadata.extensions.publicationType=surplus|slowdown`
- `metadata.extensions.productType=crude-oil|bitumen|synthetic-crude|diesel|other`
- `metadata.extensions.storagePressureLevel=low|medium|high|critical`

## 4. Modele Strapi recommande

## 4.1 Option A — persistance dans la collection feed existante

Ajouter ou confirmer dans le schema feed :

- `metadata` JSON
- `formKey` string indexe
- `schemaVersion` integer

Avantages :

- zero rupture du contrat existant
- mise en oeuvre rapide
- aligne avec le front actuel

Limites :

- validation metier faible cote CMS
- requetes analytiques plus couteuses sur `metadata.extensions`

## 4.2 Option B — collection type specialisee `hydrocarbon-signal`

Creer un content type Strapi dedie :

```json
{
  "kind": "collectionType",
  "collectionName": "hydrocarbon_signals",
  "info": {
    "singularName": "hydrocarbon-signal",
    "pluralName": "hydrocarbon-signals",
    "displayName": "Hydrocarbon Signal"
  },
  "options": {
    "draftAndPublish": true
  },
  "attributes": {
    "title": { "type": "string", "required": true },
    "summary": { "type": "text", "required": true },
    "companyName": { "type": "string", "required": true },
    "publicationType": { "type": "enumeration", "enum": ["surplus", "slowdown"], "required": true },
    "productType": { "type": "enumeration", "enum": ["crude-oil", "bitumen", "synthetic-crude", "diesel", "other"], "required": true },
    "businessReason": { "type": "enumeration", "enum": ["surplus-stock", "demand-slowdown", "transport-disruption", "buyer-outage", "price-window"], "required": true },
    "volumeBarrels": { "type": "integer", "required": true, "min": 1 },
    "minimumLotBarrels": { "type": "integer", "min": 1 },
    "availableFrom": { "type": "date", "required": true },
    "availableUntil": { "type": "date", "required": true },
    "estimatedDelayDays": { "type": "integer", "min": 0 },
    "originProvince": { "type": "relation", "relation": "oneToOne", "target": "api::province.province" },
    "targetProvince": { "type": "relation", "relation": "oneToOne", "target": "api::province.province" },
    "originSite": { "type": "string", "required": true },
    "qualityGrade": { "type": "enumeration", "enum": ["wcs", "wti-linked", "synthetic-blend", "other"], "required": true },
    "logisticsMode": { "type": "json", "required": true },
    "targetScope": { "type": "json" },
    "storagePressureLevel": { "type": "enumeration", "enum": ["low", "medium", "high", "critical"], "default": "medium" },
    "priceReference": { "type": "string" },
    "responseDeadline": { "type": "date" },
    "contactChannel": { "type": "string", "required": true },
    "notes": { "type": "text" },
    "feedItemId": { "type": "string" }
  }
}
```

Avantages :

- validation et indexation metier claires
- meilleures possibilites d'analyse et moderation
- seeds et contenus de demo plus propres

Limites :

- necessite un mapping entre `feed` et `hydrocarbon-signal`
- augmente la surface CMS

## 5. Strategie recommande pour le MVP

1. garder `POST /api/feed`
2. persister `metadata` intact dans l'item feed
3. ajouter un hook backend qui duplique ou projette le signal dans `hydrocarbon-signal` si le `formKey` correspond

Cette approche permet :

- compatibilite front immediate
- stockage specialise cote CMS
- evolution vers analytics ou moderation sans casser le flux existant

## 6. Validations backend minimales

- `title.length >= 3`
- `summary.length >= 10`
- `quantity.value > 0`
- `quantity.unit = bbl` pour ce formulaire
- `availableUntil >= availableFrom`
- si `publicationType = slowdown`, alors au moins un de ces champs doit exister :
  - `estimatedDelayDays`
  - `notes`
  - `storagePressureLevel`
- `fromProvinceId = ab` autorise par defaut mais pas force si extension future multi-province

## 7. Permissions et moderation

Rôles recommandes :

- `authenticated + feed.publish`
- role supplementaire optionnel `energy.publish`

Moderation recommandee :

- revue manuelle si `storagePressureLevel = critical`
- revue si `volumeBarrels` depasse un seuil metier configurable
- journalisation des modifications de `availableUntil`, `volumeBarrels`, `targetScope`

## 8. Seeds de demonstration

Ajouter un seed de demo Strapi avec au moins trois signaux :

1. surplus WCS Alberta -> Ontario
2. ralentissement logistique Alberta -> Prairies
3. bitume disponible avec besoin de stockage transitoire

Chaque seed doit inclure :

- FR/EN si la collection est localisable
- tags metier
- dates plausibles
- niveaux de pression de stockage differencies

## 9. OpenAPI recommande

Le snapshot `packages/contracts/spec/openapi.json` devrait documenter :

- l'unite `bbl`
- `metadata.publicationForm`
- `metadata.extensions` pour `hydrocarbon-surplus-offer`
- les enums metier `publicationType`, `productType`, `businessReason`, `storagePressureLevel`

## 10. Evolution cible

Quand le backend sera pret, deux options restent propres :

- continuer a publier sur `/api/feed` avec projection metier cote serveur
- exposer un endpoint specialise `POST /api/hydrocarbon-signals` et laisser le serveur creer l'item feed derive

Pour le MVP actuel, la premiere option est la moins risquee.

## 11. Surface effectivement branchee

La plateforme expose maintenant une surface exploitable de bout en bout :

- lecture liste : `GET /api/hydrocarbon-signals`
- lecture detail : `GET /api/hydrocarbon-signals/:id`
- client front type : `StrapiClient.hydrocarbonSignals()`
- vue front specialisee : `/feed/hydrocarbons`

Le contrat est consomme a deux niveaux :

1. le feed classique continue de lire `GET /api/feed`
2. le panneau specialise de la vue hydrocarbures lit `GET /api/hydrocarbon-signals`

Cette separation garde le feed compatible tout en exposant une lecture metier plus stable pour les cas petroliers.

## 12. Validation automatisee

Un test d'integration dedie a ete ajoute dans `strapi/scripts/test-hydrocarbon-signals-api-integration.js`.

Il verifie :

- la disponibilite publique de la liste
- le filtrage par `publicationType`, `originProvinceId`, `limit`
- la resolution detail par identifiant
- le `404` sur signal inconnu