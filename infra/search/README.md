# Moteur de recherche managé

L'application OpenG7 s'appuie sur un moteur de recherche externe pour indexer les entreprises et les échanges interprovinciaux. Ce dossier fournit un plan de déploiement pour un cluster managé (AWS OpenSearch Service ou Meilisearch Cloud) capable d'encaisser un trafic multiplié lors du sommet.

## Objectifs

- Fournir un cluster haute disponibilité (multi-AZ) avec montée en charge automatique.
- Garantir des sauvegardes horaires et quotidiennes.
- Surveiller la fraîcheur des index `companies` et `exchanges`.

## Architecture recommandée

- **AWS OpenSearch Service** (serverless collection ou domaine géré `m6g.large.search` multi-AZ).
- `AutoTune` activé pour ajuster CPU/mémoire.
- Stockage EBS chiffré avec snapshots automatiques (fenêtre 02:00 UTC).
- Accès restreint via Security Groups (pods Strapi + workers de sync).
- Tableau de bord CloudWatch (latence, `ClusterStatus`, saturation JVMMemoryPressure).

## Provisioning Terraform

Le fichier [`opensearch.tf`](./opensearch.tf) décrit un exemple de domaine OpenSearch géré avec auto scaling.

- Domaine `openg7-search` en 3 AZ (ca-central-1a/b/c).
- Instances data `m6g.large.search`, 3 nœuds minimum, 6 maximum.
- Instances UltraWarm optionnelles pour l'historique.
- Règles IAM pour autoriser Strapi (`indexer` lambda ou worker) à signer les requêtes.
- Snapshots vers le bucket S3 `openg7-search-backups`.

## Sync des index

1. Configurer les webhooks Strapi (`afterCreate/afterUpdate/afterDelete`) pour pousser les mutations vers une file (`indexing-jobs`).
2. Un worker Node.js (ou Lambda) dépile les jobs et appelle OpenSearch avec signature SigV4.
3. `companies` et `exchanges` sont indexés avec mapping explicite (`keyword` + `text`, champs géographiques pour la carte).
4. Les purges (DELETE) déclenchent également la purge Varnish via le webhook `PURGE /cache`.

## Monitoring

- Alarmes CloudWatch sur `ClusterStatus.red`, `FreeStorageSpace`, `SearchLatency`.
- Grafana/Prometheus : exporter les métriques via `opensearch_exporter` et dashboards dédiés.
- Alerting Slack/Email lorsque la latence > 500 ms sur p95.

## Tests de charge

- Rejouer un trafic x5 avec K6 (`k6 run scripts/search-heavy.js`).
- Vérifier la dérive des index (delta < 5s entre Strapi et OpenSearch via `/_cat/indices`).

## Plan de reprise

- Snapshots quotidiens conservés 30 jours.
- Procédure de restauration via `aws opensearchservice start-domain-maintenance` + `restore_snapshot`.
- Documenter l'escalade (SRE on-call) dans `docs/runbooks/search-outage.md`.
