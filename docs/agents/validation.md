# Validation Nexus

À lire pour choisir les contrôles du changement. Les scripts de
[package.json](../../package.json) et des workspaces font foi.

<!-- prettier-ignore -->
| Changement | Contrôles |
| --- | --- |
| Consignes/documentation | node scripts/check-project-standards.mjs; format ciblé; git diff --check |
| Registre/hooks | node packages/tooling/bin/validate-selectors.mjs; tests des consommateurs |
| UI/routage/SSR | yarn lint; tests front ciblés; yarn build:web; parcours E2E critique via yarn test:e2e:smoke |
| API/contrats | yarn codegen puis yarn test; tests Strapi et consommateurs concernés |
| Seeds/schéma | Tests d’idempotence/droits et exécution sur base locale dédiée autorisée |
| Release | Runbook de cible, puis yarn predeploy:preprod ou variante full selon la portée autorisée |

Le script yarn test racine couvre les contrats. yarn prebuild:web lance codegen
et tests de contrats; il ne compile pas le front et n’exécute pas ses tests.
Éviter de le répéter si ses mêmes contrôles viennent de réussir. yarn build:web
réalise le build Angular; lire son lifecycle avant d’interpréter les preuves.
Les seeds yarn predeploy:cms-cache écrivent des données : ce ne sont pas des
contrôles documentaires. Les E2E exigent navigateurs et environnement adaptés.

Si Node/paquets/binaire navigateur sont absents, signaler précisément le contrôle
non exécuté. Préférer les binaires compatibles avec le shell plutôt que modifier
la politique d’exécution globale. Aucune suite complète ni préparation de release
automatique pour une correction documentaire.
