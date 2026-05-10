# Intégrations facultatives à brancher

Cette note regroupe les chantiers "bonus" encore ouverts après la livraison du socle Angular, utiles pour boucler l'expérience produit (observabilité, enrichissements UI, automatisations).

## Observabilité & analytics

- **Connecter le service `AnalyticsService` à une plateforme (Matomo, GA4, Segment, etc.)** afin de sortir du simple `CustomEvent` émis côté navigateur. Cela inclut l'implémentation de la méthode `emit` avec un connecteur réel ou un dispatcher serveur.
- **Déclencher les événements de suivi restés en "placeholder"** :
  - `opportunity_connect_clicked` sur la page d'accueil (`Og7HomePageComponent`) ;
  - événement d'achèvement dans la page "mise en relation" (`Og7IntroBillboardPage`).

## Enrichissements du panneau partenaire

Plusieurs sections du panneau `partner-details-panel` affichent encore des messages d'attente. À brancher :

- **Pipeline analytics** (remplissage du slot `pipelineTemplate`).
- **Recommandations Incoterms** (`incotermsTemplate`).
- **Programmes de financement contextualisés** (`financingTemplate`).
- **Workflows conformité / ESG** (`complianceTemplate`).
- **Planification de rendez-vous** (`schedulerTemplate`).
- **Génération & distribution des QR partenaires** (les QR restent en état "à générer").

## Micro-copy & traductions

Les fichiers `en.json` / `fr.json` exposent des placeholders ("Pipeline analytics will display here once tracked", etc.). Ils servent de rappel pour l'activation des modules ci-dessus : prévoir la mise à jour des traductions lorsque les intégrations seront effectives.
