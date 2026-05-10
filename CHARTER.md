# OpenG7 Platform Charter

## Purpose

OpenG7 Platform is the integration and orchestration layer for the OpenG7 ecosystem. It hosts the web app, CMS, shared runtime wiring, and delivery tooling that compose canonical capabilities from other repositories.

## Non-goals

This repository is not canonical for evidence, audit, privacy, metrics, ranking policy, or friction logic. Those capabilities must live in their respective canonical repositories:

- openg7-open-evidence
- openg7-audit-ledger
- openg7-privacy-lab
- openg7-attention-metrics
- openg7-ranking-policy
- openg7-friction-engine
- openg7-community-health-dashboard

## Public API / Contracts

- Platform integration contracts and runtime configuration used by the web app and CMS.
- Cross-repo interface adapters needed to consume canonical capabilities.

## Consumes

- Evidence capsules and claim mapping from openg7-open-evidence.
- Audit trail schema and signing rules from openg7-audit-ledger.
- Attention signals definitions from openg7-attention-metrics.
- Friction guardrails from openg7-friction-engine.
- Ranking policy and provenance rules from openg7-ranking-policy.
- Privacy methods and minimization patterns from openg7-privacy-lab.
- Community health aggregates from openg7-community-health-dashboard.

## Canonical for

- Orchestration and integration only.

## Decision Tree

1. Is the logic domain-defining or reusable across multiple repos? If yes, it belongs in the canonical repo.
2. Is this integration glue, UI wiring, or deployment-specific configuration? If yes, it can live here.
3. Would copying this logic create divergence or duplicated policy? If yes, create or extend a shared @openg7/\* package instead.
