# Cas d'usage — Entreprise d'hydrocarbures (Alberta) publiant un surplus ou un ralentissement de barils

## 1. Contexte

Ce cas d'usage décrit le besoin d'une entreprise pétrolière basée en Alberta qui souhaite signaler sur OpenG7 :

- un surplus ponctuel de production ou de stock disponible ;
- un ralentissement de sortie, de transport ou d'écoulement des barils ;
- une fenêtre commerciale durant laquelle des acheteurs, transporteurs ou partenaires de raffinage peuvent se positionner.

L'objectif n'est pas seulement d'afficher une alerte statique, mais de transformer une variation opérationnelle en opportunité économique traçable, partageable et exploitable dans le feed métier.

## 2. Objectifs métier

- Donner de la visibilité rapide à un surplus de brut ou de dérivés disponibles.
- Alerter l'écosystème quand un ralentissement logistique ou commercial crée un stock excédentaire.
- Accélérer la mise en relation avec des acheteurs interprovinciaux, des raffineries, des opérateurs logistiques ou des partenaires d'entreposage.
- Conserver un historique structuré de l'événement et des réponses reçues.
- Alimenter les tableaux de bord feed, cartes sectorielles et alertes marché avec des données opérationnelles concrètes.

## 3. Persona principal

| Persona | Rôle | Besoin immédiat | Critère de succès |
| --- | --- | --- | --- |
| Responsable commercial énergie | Valoriser un volume disponible non écoulé | Publier vite une opportunité crédible et ciblée | Première prise de contact en moins de 24 h |
| Responsable opérations / terminal | Signaler un ralentissement de sortie | Trouver une solution de délestage, stockage ou redirection | Réduction du stock immobilisé |
| Analyste marché interne | Documenter le contexte du signal | Comparer l'événement à la demande régionale et aux prix | Traçabilité complète |

## 4. Déclencheurs du cas d'usage

Le cas est déclenché lorsqu'au moins une des conditions suivantes survient :

- baisse soudaine de la demande sur une route ou un corridor de distribution ;
- ralentissement ferroviaire, pipeline, camionnage ou capacité terminale ;
- arrêt partiel d'un acheteur habituel ou d'une raffinerie ;
- arbitrage de prix défavorable entraînant une accumulation temporaire ;
- besoin d'écouler rapidement un volume avant une date limite de stockage ou de maintenance.

## 5. Scénario fonctionnel principal

### 5.1 Publication d'un surplus

1. Le responsable d'une entreprise pétrolière albertaine ouvre le module Feed ou Publication d'opportunité.
2. Il choisit un modèle de publication de type `hydrocarbon-surplus-offer`.
3. Il renseigne le contexte : type de produit, volume en barils, qualité, localisation, fenêtre de disponibilité, contrainte logistique et prix indicatif.
4. Il précise la cause du signal : surplus de stock, baisse de cadence d'enlèvement, ralentissement logistique, maintenance chez un acheteur, ou combinaison de facteurs.
5. La plateforme génère une carte opportunité visible dans le feed, avec ciblage sectoriel `energy` et rattachement géographique Alberta -> provinces ou marchés cibles.
6. Les acheteurs ou partenaires intéressés ouvrent la fiche détail, consultent les données, puis initient une réponse ou une mise en relation.
7. L'émetteur suit les réponses, ferme l'opportunité ou met à jour les volumes restants.

### 5.2 Publication d'un ralentissement de barils

1. L'utilisateur détecte qu'un ralentissement réduit le débit sortant ou retarde l'écoulement du brut.
2. Il publie non pas une simple alerte, mais un signal opérationnel monétisable : volume immobilisé, durée estimée, impact sur les stocks, options de redirection.
3. Le signal est classé comme opportunité, avec un niveau de criticité et une date d'expiration.
4. Les acteurs pouvant absorber, transporter, raffiner ou stocker le volume reçoivent un contexte suffisant pour réagir.

## 6. Informations à collecter dans le formulaire

### 6.1 Champs métier obligatoires

- `companyName`
- `publicationType`: `surplus` | `slowdown`
- `productType`: `crude-oil` | `bitumen` | `synthetic-crude` | `diesel` | `other`
- `volumeBarrels`
- `availableFrom`
- `availableUntil`
- `originProvince`: `AB`
- `originSite`: terminal, site de stockage ou zone de chargement
- `targetScope`: province, corridor ou marchés visés
- `qualityGrade`: ex. WCS, WTI-linked, blend interne
- `logisticsMode`: pipeline | rail | truck | storage-transfer | mixed
- `businessReason`: surplus stock | demand slowdown | transport disruption | buyer outage | price window

### 6.2 Champs recommandés

- `priceReference`
- `minimumLotBarrels`
- `deliveryTerms`
- `estimatedDelayDays`
- `storagePressureLevel`: low | medium | high | critical
- `responseDeadline`
- `contactRole`
- `certifications`
- `notes`

### 6.3 Champs dérivés pour analytics

- `sector = energy`
- `commodityFamily = hydrocarbons`
- `signalSeverity`
- `inventoryPressureScore`
- `crossProvinceOpportunity = true|false`
- `marketDirection = surplus|constrained-outflow`

## 7. Règles métier

- Une publication `surplus` doit inclure un volume strictement positif en barils.
- Une publication `slowdown` doit inclure soit une estimation de délai, soit un indicateur de réduction de capacité, soit un volume immobilisé.
- La date de fin doit être supérieure à la date de début.
- Si `storagePressureLevel = critical`, la publication reçoit une priorité élevée dans le feed.
- Une même entreprise peut publier plusieurs signaux, mais les doublons sur la même fenêtre doivent être fusionnés ou détectés.
- Une publication expirée n'est plus promue dans le feed principal, mais reste visible dans l'historique.

## 8. Résultat attendu côté produit

### 8.1 Dans le feed

La carte publiée doit permettre de comprendre en quelques secondes :

- qu'il s'agit d'un surplus ou d'un ralentissement ;
- quel volume est concerné ;
- sur quelle période ;
- depuis l'Alberta vers quels débouchés ;
- quel niveau d'urgence s'applique.

Exemple de résumé visible :

> Producteur albertain avec `48 000` barils disponibles sur `10 jours` suite à un ralentissement logistique. Recherche acheteurs, stockage transitoire ou redirection interprovinciale.

### 8.2 Dans la fiche détail

La page détail doit afficher :

- le contexte opérationnel complet ;
- les contraintes de qualité et logistique ;
- la chronologie du signal ;
- les options de réponse (`demander contact`, `proposer enlèvement`, `signaler capacité de stockage`, `partager`).

## 9. Intégration UX OpenG7

### 9.1 Point d'entrée recommandé

- feed composer dynamique ;
- publication guidée depuis un tableau de bord sectoriel énergie ;
- création assistée depuis une alerte marché ou un indicateur pétrole.

### 9.2 Comportement UI attendu

- formulaire dynamique basé sur configuration JSON ;
- préremplissage du secteur `energy` et de la province `AB` ;
- affichage d'un aperçu de carte avant publication ;
- mode brouillon pour validation interne avant diffusion ;
- mise à jour post-publication pour ajuster le volume restant.

## 10. Événements applicatifs à tracer

- `hydrocarbon_signal_started`
- `hydrocarbon_signal_draft_saved`
- `hydrocarbon_signal_published`
- `hydrocarbon_signal_updated`
- `hydrocarbon_signal_response_opened`
- `hydrocarbon_signal_contact_requested`
- `hydrocarbon_signal_closed`

Propriétés minimales :

- `publicationType`
- `productType`
- `volumeBarrels`
- `originProvince`
- `targetScope`
- `signalSeverity`
- `storagePressureLevel`
- `companyType`

## 11. Proposition de mapping technique

Ce cas d'usage s'aligne avec l'approche décrite dans `docs/frontend/feed-dynamic-form-config.md` et justifie l'ajout d'un nouveau modèle de formulaire.

Clé suggérée :

- `hydrocarbon-surplus-offer`

Payload métier cible :

```json
{
  "type": "OPPORTUNITY",
  "sector": "energy",
  "commodityFamily": "hydrocarbons",
  "publicationType": "surplus",
  "productType": "crude-oil",
  "originProvince": "AB",
  "volumeBarrels": 48000,
  "availableFrom": "2026-03-25",
  "availableUntil": "2026-04-04",
  "qualityGrade": "WCS",
  "logisticsMode": ["rail", "storage-transfer"],
  "businessReason": "transport disruption",
  "storagePressureLevel": "high",
  "targetScope": ["SK", "MB", "ON"],
  "notes": "Volume disponible suite a une baisse de cadence de sortie sur corridor principal."
}
```

## 12. Bénéfices attendus

- Meilleure visibilité des déséquilibres énergétiques réels entre provinces.
- Réduction du temps entre détection d'un surplus et activation de partenaires.
- Enrichissement du feed avec des signaux concrets à forte valeur économique.
- Traçabilité exploitable pour analytics, alerting et futures recommandations IA.

## 13. Risques et points d'attention

- Sensibilité commerciale : certains volumes ou grades peuvent nécessiter une visibilité restreinte.
- Conformité : vérifier les règles de diffusion selon la nature du produit et des partenaires.
- Qualité des données : une publication vague sur la qualité ou la logistique sera peu actionnable.
- Déduplication : éviter plusieurs publications concurrentes pour le même stock.

## 14. Extension recommandée

Après validation métier, ce cas d'usage peut être décliné pour :

- gaz naturel ;
- propane et GPL ;
- carburants raffinés ;
- surplus d'électricité ou ralentissements de capacité réseau ;
- signaux inverses de type `shortage-request` quand une province cherche à couvrir un déficit.

## 15. Artefacts associés

Les artefacts ajoutés dans le dépôt pour opérationnaliser ce cas d'usage sont :

- template dynamique Angular : `openg7-org/src/app/domains/feed/feature/form-config/forms/hydrocarbon-surplus-offer.json`
- note UI Angular : `docs/frontend/hydrocarbon-surplus-angular-composer.md`
- contrat backend / Strapi proposé : `docs/strapi/hydrocarbon-signal-api-contract.md`
- client front type : `openg7-org/src/app/core/api/strapi-client.ts`
- vue specialisee : `/feed/hydrocarbons` via `FeedPage`
- point d'entree visible : menu header `Flux hydrocarbures`
- test E2E de navigation : `openg7-org/e2e/hydrocarbon-feed-navigation.spec.ts`