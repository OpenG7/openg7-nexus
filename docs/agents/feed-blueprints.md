# Blueprints Feed Nexus

À lire pour une opération feed, alerte, opportunité ou indicateur. Conserver
identifiants BLUEPRINT, données de sortie et traçabilité des tests lors d’un
changement. Les chemins sont relatifs à la racine. Les sections AS-IS sont
à confronter au code; TO-BE décrit une cible, pas une fonctionnalité livrée.

## BLUEPRINT - Operations UI Feed (tuile -> page detail)

- `BLUEPRINT-OP-01` Ouvrir le flux Feed : clic gauche sur le menu principal `Feed` -> verifier la route `/feed` et le stream des tuiles.
- `BLUEPRINT-OP-02` Ouvrir un detail Opportunite depuis une tuile : clic gauche sur une tuile de type opportunite (ex. `Short-term import of 300 MW`) -> verifier la route `/feed/opportunities/:id`.
- `BLUEPRINT-OP-03` Revenir de la page detail Opportunite vers la liste Feed : clic gauche sur le breadcrumb `Feed` dans le header sticky -> verifier retour `/feed`.
- `BLUEPRINT-OP-04` Proposer une offre depuis une Opportunite : clic gauche sur `Proposer une offre` -> dans le drawer, clic gauche dans chaque champ (`capacite`, `periode`, `prix/modalite`, `commentaire`, `piece jointe`) -> clic gauche sur `Envoyer`.
- `BLUEPRINT-OP-05` Enregistrer une Opportunite : clic gauche sur `Enregistrer` dans le header detail -> verifier changement d etat visuel (saved/sync).
- `BLUEPRINT-OP-06` Partager une Opportunite : clic gauche sur `Partager` dans le header detail -> verifier ouverture du share natif ou copie lien.
- `BLUEPRINT-OP-07` Changer d onglet Q/R sur Opportunite : clic gauche sur `Questions` ou `Offres recues` ou `Historique` -> verifier le contenu associe.
- `BLUEPRINT-OP-08` Ouvrir une alerte liee depuis l aside Opportunite : clic gauche sur une entree `Alerte` de la colonne droite -> verifier la route `/feed/alerts/:id`.
- `BLUEPRINT-OP-09` Ouvrir un detail Alerte depuis une tuile : clic gauche sur une tuile de type alerte (ex. `Ice storm risk on Ontario transmission lines`) -> verifier la route `/feed/alerts/:id`.
- `BLUEPRINT-OP-10` S abonner a une Alerte : clic gauche sur `S abonner` dans le header detail alerte -> verifier etat subscribed.
- `BLUEPRINT-OP-11` Partager une Alerte : clic gauche sur `Partager` -> verifier ouverture du share natif ou copie lien.
- `BLUEPRINT-OP-12` Signaler une mise a jour sur Alerte : clic gauche sur `Signaler une mise a jour` -> verifier retour d etat utilisateur.
- `BLUEPRINT-OP-13` Creer une opportunite liee depuis une Alerte : clic gauche sur `Creer une opportunite liee` (si visible) -> verifier navigation vers `/feed` avec query params pre-remplis.
- `BLUEPRINT-OP-14` Ouvrir une opportunite associee depuis l aside Alerte : clic gauche sur une entree de la carte `Opportunites associees` -> verifier `/feed/opportunities/:id`.
- `BLUEPRINT-OP-15` Ouvrir un detail Indicateur depuis une tuile : clic gauche sur une tuile de type indicateur (ex. `Spot electricity price up 12 percent`) -> verifier `/feed/indicators/:id`.
- `BLUEPRINT-OP-16` Changer la fenetre temporelle d un indicateur : clic gauche sur une chip `24h`, `72h` ou `7d` -> verifier rerender du chart.
- `BLUEPRINT-OP-17` Changer la granularite d un indicateur : clic gauche sur la chip/controle de granularite (`hour`, `15m`, `day`) -> verifier rerender serie.
- `BLUEPRINT-OP-18` S abonner a un indicateur : clic gauche sur `S abonner` dans le hero indicateur -> verifier etat subscribed.
- `BLUEPRINT-OP-19` Creer une alerte depuis un indicateur : clic gauche sur `Creer une alerte` -> dans le drawer, clic gauche sur les champs (`seuil`, `fenetre`, `frequence`) -> clic gauche sur `Creer/Envoyer`.
- `BLUEPRINT-OP-20` Ouvrir une alerte liee depuis la liste associee indicateur : clic gauche sur une entree `Alertes liees` -> verifier `/feed/alerts/:id`.
- `BLUEPRINT-OP-21` Ouvrir une opportunite liee depuis la liste associee indicateur : clic gauche sur une entree `Opportunites associees` -> verifier `/feed/opportunities/:id`.
- `BLUEPRINT-OP-22` Utiliser le fallback detail par id si la collection feed est indisponible : saisir directement une URL detail (`/feed/alerts/:id`, `/feed/opportunities/:id`, `/feed/indicators/:id`) dans la barre d adresse + Entrer -> verifier chargement du detail sans passer par la liste.

## BLUEPRINT Traceability Matrix (Tests)

<!-- prettier-ignore -->
| BLUEPRINT | Coverage | Specs |
| --- | --- | --- |
| `BLUEPRINT-OP-01` | Feed open + stream hydration | `openg7-org/src/app/domains/feed/feature/feed.page.spec.ts` |
| `BLUEPRINT-OP-02` | Tile -> opportunity detail route | `openg7-org/src/app/domains/feed/feature/feed.page.spec.ts` |
| `BLUEPRINT-OP-03` | Opportunity breadcrumb -> `/feed` | `openg7-org/src/app/domains/feed/feature/components/opportunity-detail-header.component.spec.ts` |
| `BLUEPRINT-OP-04` | Offer drawer fields + submit flow | `openg7-org/src/app/domains/feed/feature/components/opportunity-offer-drawer.component.spec.ts`, `openg7-org/src/app/domains/feed/feature/pages/feed-opportunity-detail.page.spec.ts` |
| `BLUEPRINT-OP-05` | Opportunity save state toggle | `openg7-org/src/app/domains/feed/feature/pages/feed-opportunity-detail.page.spec.ts` |
| `BLUEPRINT-OP-06` | Opportunity share action | `openg7-org/src/app/domains/feed/feature/pages/feed-opportunity-detail.page.spec.ts` |
| `BLUEPRINT-OP-07` | Q/R tabs + reply submit | `openg7-org/src/app/domains/feed/feature/components/opportunity-qna.component.spec.ts`, `openg7-org/src/app/domains/feed/feature/pages/feed-opportunity-detail.page.spec.ts` |
| `BLUEPRINT-OP-08` | Opportunity aside alert -> alert detail | `openg7-org/src/app/domains/feed/feature/components/opportunity-context-aside.component.spec.ts`, `openg7-org/src/app/domains/feed/feature/pages/feed-opportunity-detail.page.spec.ts` |
| `BLUEPRINT-OP-09` | Tile -> alert detail route | `openg7-org/src/app/domains/feed/feature/feed.page.spec.ts` |
| `BLUEPRINT-OP-10` | Alert subscribe toggle | `openg7-org/src/app/domains/feed/feature/pages/feed-alert-detail.page.spec.ts` |
| `BLUEPRINT-OP-11` | Alert share action | `openg7-org/src/app/domains/feed/feature/pages/feed-alert-detail.page.spec.ts` |
| `BLUEPRINT-OP-12` | Alert report update action | `openg7-org/src/app/domains/feed/feature/pages/feed-alert-detail.page.spec.ts` |
| `BLUEPRINT-OP-13` | Create linked opportunity query params | `openg7-org/src/app/domains/feed/feature/pages/feed-alert-detail.page.spec.ts` |
| `BLUEPRINT-OP-14` | Alert aside opportunity -> detail | `openg7-org/src/app/domains/feed/feature/pages/feed-alert-detail.page.spec.ts` |
| `BLUEPRINT-OP-15` | Tile -> indicator detail route | `openg7-org/src/app/domains/feed/feature/feed.page.spec.ts` |
| `BLUEPRINT-OP-16` | Indicator timeframe change -> rerender | `openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.spec.ts` |
| `BLUEPRINT-OP-17` | Indicator granularity change -> rerender | `openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.spec.ts` |
| `BLUEPRINT-OP-18` | Indicator subscribe action/state | `openg7-org/src/app/domains/feed/feature/components/indicator-hero.component.spec.ts`, `openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.spec.ts` |
| `BLUEPRINT-OP-19` | Indicator create alert drawer + mapped publish + retry | `openg7-org/src/app/domains/feed/feature/components/indicator-alert-drawer.component.spec.ts`, `openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.spec.ts`, `openg7-org/src/app/domains/feed/feature/components/indicator-hero.component.spec.ts` |
| `BLUEPRINT-OP-20` | Indicator related alert -> detail | `openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.spec.ts` |
| `BLUEPRINT-OP-21` | Indicator related opportunity -> detail | `openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.spec.ts` |
| `BLUEPRINT-OP-22` | Direct URL fallback by id (opportunity/alert/indicator) | `openg7-org/src/app/domains/feed/feature/pages/feed-opportunity-detail.page.spec.ts`, `openg7-org/src/app/domains/feed/feature/pages/feed-alert-detail.page.spec.ts`, `openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.spec.ts` |

## BLUEPRINT Data Outputs (mission-aligned)

### AS-IS - Proprietes expediées aujourd hui

- `GET /api/feed/:id` : `id` (path param).
- `GET /api/feed` : `cursor`, `fromProvince`, `toProvince`, `sector`, `type`, `mode`, `sort`, `q`.
- `POST /api/feed` : `type`, `title`, `summary`, `sectorId`, `fromProvinceId`, `toProvinceId`, `mode`, `quantity.value`, `quantity.unit`, `tags`.
- `BLUEPRINT-OP-19` (creer une alerte depuis un indicateur) publie via `POST /api/feed` avec mapping : `type=ALERT`, `title`, `summary`, `sectorId`, `fromProvinceId`, `toProvinceId`, `mode`, `tags`.
- Header HTTP : `Idempotency-Key` (publication feed).
- Navigation router (query params) : `type`, `mode`, `sector`, `fromProvince`, `toProvince`, `q`, `source`, `corridorId`, `priority`, `feedItemId`.
- `BLUEPRINT-OP-13` (creer opportunite liee depuis alerte) : `draftSource`, `draftAlertId`, `draftType`, `draftMode`, `draftSectorId`, `draftFromProvinceId`, `draftToProvinceId`, `draftTitle`, `draftSummary`, `draftTags`.
- Share Web API : `title`, `text`, `url`.
- Clipboard fallback : `url`.
- Analytics feed (dataLayer/custom event) : `event`, `itemId`, `type`, `source`, `reason`, `count`, `cursor`.
- Analytics carte -> feed corridor (`map_open_corridor_feed`) : `corridorId`, `sector`, `fromProvince`, `toProvince`, `mode`, `priority`, `decisionItemId`, `cmsKey`, `input`, `sourceRoute`, `targetRoute`.
- Analytics endpoint (si configure) : `event`, `detail`, `priority`, `timestamp`.
- Notification webhook/email (si active) : `notification.id`, `notification.type`, `notification.title`, `notification.message`, `notification.source`, `notification.createdAt`, `notification.metadata`, `recipient`.
- `GET /api/users/me/feed-actions` : `targetType`, `targetId`, `action` (query params optionnels).
- `POST /api/users/me/feed-actions` : `targetType`, `targetId`, `action`, `status`, `sourceRoute`, `targetRoute`, `metadata`, `occurredAt`, `correlationId`, `idempotencyKey`.
- `POST /api/users/me/opportunity-offers` : `opportunityId`, `opportunityTitle`, `opportunityRoute`, `feedItemId`, `recipientKind`, `recipientLabel`, `capacityMw`, `startDate`, `endDate`, `pricingModel`, `comment`, `attachmentId`, `attachmentName`, `submittedAt`, `correlationId`, `idempotencyKey`.
- `POST /api/users/me/opportunity-offer-attachments` : multipart `files`, sortie `id`, `name`, `mime`, `size`, `url`, `scanStatus` ; types autorises PDF/JPG/PNG/WebP, taille max configuree.
- Events UI locaux (non persistes backend) :
- `OpportunityOfferPayload` : `capacityMw`, `startDate`, `endDate`, `pricingModel`, `comment`, `attachmentFile`, `attachmentId`, `attachmentName` (upload multipart puis persistance via `/api/users/me/opportunity-offers`).
- `IndicatorAlertDraft` : `thresholdDirection`, `thresholdValue`, `window`, `frequency`, `notifyDelta`, `note`.
- Q/R opportunite : `content` (soumis localement).

### TO-BE - Proprietes a ajouter pour couvrir totalement mission + blueprints

- Renforcer la securite documentaire des offres : antivirus externe, quarantaine et expiration des fichiers orphelins.
- Durcir la persistance de creation d alerte indicateur (au-dela du mapping `POST /api/feed`) :
- `indicatorId`, `thresholdDirection`, `thresholdValue`, `window`, `frequency`, `notifyDelta`, `note`, `createdAt`, `deliveryChannels`.
- Persister le flux Q/R opportunite :
- `opportunityId`, `tab`, `content`, `authorId`, `authorLabel`, `createdAt`, `replyToMessageId`.
- Telemetrie blueprint explicite (trace operationnelle) :
- `blueprintOpId`, `sourceRoute`, `targetRoute`, `targetType`, `targetId`, `result`, `latencyMs`, `errorCode`, `connectionState`, `occurredAt`.
- Etat reseau/synchro utilisateur sur actions critiques :
- `syncState`, `retryCount`, `queuedOffline`, `lastSyncAt`.
- Correlation transversale UI/API :
- `correlationId`, `idempotencyKey`, `sessionId`.
- Conformite minimale (audit fonctionnel) :
- `consentVersion`, `policyVersion`, `locale`, `timezone`.

### Regle d evolution

- Toute nouvelle action BLUEPRINT qui envoie des donnees doit declarer explicitement ses proprietes de sortie dans cette section avant merge.
