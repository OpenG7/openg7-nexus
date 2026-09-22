# OpenG7 Nexus — consignes

## Mission

Intégrer et orchestrer les capacités OpenG7 dans la plateforme Angular/Strapi :
cartographie, feed économique, mise en relation et administration. Les domaines
canoniques de l’écosystème restent propriétaires de leurs règles. Monorepo
applicatif existant : openg7-org, strapi, packages, infra et tooling.

<!-- openg7:common:start -->

## Socle commun OpenG7

<!-- openg7-standard: 1 -->

- Respecter la mission du dépôt. Le code, les manifests et les tests décrivent
  l'existant; une architecture cible ou une roadmap ne prouve pas une livraison.
- Avant modification : `git status --short`, instructions des chemins concernés,
  code utile et équivalents existants. Préserver les changements de l'utilisateur.
- Lire uniquement les références déclenchées par le chemin ou le sujet traité,
  même pour un test ou un package. Chercher avec `rg`, lire la section utile;
  ne pas charger tout `docs/`, les registres ou les historiques par défaut.
- Réutiliser les contrats publics; éviter cycles, imports privés entre domaines,
  duplication métier et refactorisations étrangères à la demande.
- Ne placer aucun secret ni donnée privée inutile dans Git, sorties, logs, tests
  ou documentation. Exemples synthétiques; droits vérifiés côté serveur.
- Respecter l'autorisation déjà donnée et son périmètre. Préparer et vérifier les
  changements locaux autorisés; une demande de code n'autorise pas une opération
  de production, un envoi externe, une publication ou une destruction de données.
- Commit, push et ouverture de PR seulement dans le cadre demandé par l’utilisateur;
  une autorisation déjà donnée reste valable pour cette même opération et portée.
- Pour un effet externe : cible, droits, entrées/sorties, limites, idempotence,
  audit et reprise explicites. Réconcilier un résultat incertain avant de relancer.
- Choisir les validations selon le changement et les scripts réellement présents.
  Tester le comportement et les échecs pertinents; une modification documentaire
  seule ne déclenche pas les suites applicatives, les seeds ou un déploiement.
- Mettre à jour la référence propriétaire et les consommateurs d'un contrat dans
  le même changement. Les différences locales justifient une mission, une stack
  effective ou un risque métier; elles ne recopient pas le socle.
- Terminer par le diff, les contrôles applicables et `git diff --check`. Rapporter
  résultat, validations exécutées, limites et opérations restantes, sans faux succès.

<!-- openg7:common:end -->

## Périmètre local

- Composition UI et adaptateurs permis; aucune copie de logique canonique
  d’évidence, audit, métriques, ranking ou confidentialité d’un autre dépôt.
- Angular standalone/signal-first, SSR, i18n FR/EN; Strapi reste autoritaire pour
  droits et données. Les packages publics définissent les contrats partagés.
- Les registres de sélecteurs et blueprints appartiennent à Nexus. Les maintenir
  avec code/tests, sans imposer leur lecture pour une tâche étrangère à l’UI.
- Aucun seed de production ou création d’admin/token implicite; vérifier cible
  et gardes dans le code. Un plan historique ne vaut ni livraison ni autorisation.

## Lectures selon la tâche

<!-- prettier-ignore -->
| Déclencheur | Référence |
| --- | --- |
| Frontière ou intégration interprojet | [Architecture](ARCHITECTURE.md), [propriétaires](docs/ecosystem/ECOSYSTEM-MAP.md) |
| Angular/UI/SSR/état/accessibilité, y compris packages | [Frontend](docs/agents/frontend.md) |
| Composant/hook ajouté ou modifié | Entrées utiles du [registre](docs/agents/selector-registry.md) |
| Strapi, données, API, droits, contrat partagé | [Backend et contrats](docs/agents/backend.md) |
| Feed, opportunité, alerte ou indicateur | Section utile des [blueprints](docs/agents/feed-blueprints.md) |
| Quality Reactor | [Explications](docs/frontend/admin-quality-reactor-explanations.md) et registre utile |
| Docker/déploiement | [Docker](docs/docker-compose.md), runbook de cible |
| Choix des contrôles | [Validation](docs/agents/validation.md) |

## Validation

Consignes : `node scripts/check-project-standards.mjs` et `git diff --check`.
Registre : `node packages/tooling/bin/validate-selectors.mjs`.
Pour le code, appliquer la matrice liée; manifests/CI définissent les commandes.

## Maintenance

Appliquer le [standard](docs/standards/README.md). Les consignes opérationnelles
sont dans docs/agents; conserver le contexte généré docs/agent-context.md pour
son usage applicatif, sans l’injecter systématiquement dans une tâche de code.
