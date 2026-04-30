# Codex Action v1 pour OpenG7

Ce guide formalise la premiere iteration recommandee pour un flux `demande backend -> workflow GitHub -> branche -> PR` base sur `openai/codex-action`.

## Objectif

La v1 ne cherche pas a construire une plateforme agentique complete. Elle vise un flux simple, audit-able et compatible GitHub :

- le front ne porte aucun secret OpenAI ;
- un backend fin valide la demande metier ;
- GitHub Actions execute Codex dans le depot ;
- les changements sont pousses sur une branche dediee ;
- une pull request est ouverte automatiquement.

Le workflow associe est dans [.github/workflows/codex-pr.yml](../../.github/workflows/codex-pr.yml).

## Secrets GitHub requis

- `OPENAI_API_KEY` : cle OpenAI stockee uniquement dans GitHub Secrets.

## Entrees du workflow

- `task` : instruction courte envoyee a Codex.
- `scope` : surface autorisee pour la premiere iteration (`openg7-org`, `strapi`, `packages-contracts`, `packages-tooling`, `repository-root`).
- `base_branch` : branche cible de la PR, `main` par defaut.
- `draft_pr` : ouvre la PR en brouillon.
- `model` et `effort` : options facultatives passees a Codex.

## Mode operatoire recommande

1. Le backend recoit une demande utilisateur ou operateur.
2. Il la valide contre une liste autorisee de scopes et de branches cibles.
3. Il declenche le workflow GitHub via `workflow_dispatch`.
4. GitHub Actions installe les dependances, execute `openai/codex-action`, puis ouvre ou met a jour une PR.
5. Les humains relisent la PR avant merge.

## Exemple de declenchement backend

Exemple REST GitHub pour declencher le workflow :

```http
POST /repos/OpenG7/openg7-platform/actions/workflows/codex-pr.yml/dispatches
Authorization: Bearer <github-app-token-ou-pat>
Accept: application/vnd.github+json
Content-Type: application/json

{
  "ref": "main",
  "inputs": {
    "task": "Corriger le message d'erreur de la page login et ajouter un test cible.",
    "scope": "openg7-org",
    "base_branch": "main",
    "draft_pr": "true",
    "model": "",
    "effort": ""
  }
}
```

Le backend doit rester fin : validation, autorisation, journalisation, declenchement. Il ne doit ni contenir la cle OpenAI ni executer Codex lui-meme dans cette premiere version.

## Garde-fous retenus en v1

- Declenchement manuel ou backend explicite, pas d'execution libre depuis le front.
- Runner Linux avec `safety-strategy: drop-sudo`.
- `sandbox: workspace-write` pour permettre des modifications limitees au depot.
- Prompt limite a une tache precise avec obligation de validation ciblee.
- PR obligatoire avant merge.

## Limites assumees

- Pas de sandbox metier externe ni de control plane dedie.
- Pas de file d'attente, priorisation ou orchestration multi-run.
- Pas de politique de revue automatique avancee au-dela du garde-fou GitHub habituel.

Si OpenG7 veut aller plus loin en v2, la suite logique est d'ajouter un backend de pilotage plus riche, puis d'evaluer un runtime agentique plus complet seulement si la charge operationnelle le justifie.
