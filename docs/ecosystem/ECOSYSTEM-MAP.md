# OpenG7 Ecosystem Map

This repository (`openg7-nexus`) is the orchestration and integration layer. It consumes canonical capabilities from other repos. Domain logic must not be duplicated here.

## Capability -> Canonical Repository

| Capability | Canonical repo | Notes |
| --- | --- | --- |
| evidence_capsules | openg7-open-evidence | Claim -> evidence capsule definitions and formats |
| audit_trail | openg7-audit-ledger | Audit event schema, hashing/signing |
| attention_signals | openg7-attention-metrics | Signal definitions and aggregation |
| friction_guardrails | openg7-friction-engine | UX/process friction rules |
| ranking_policy | openg7-ranking-policy | Ranking rules and provenance |
| privacy_methods | openg7-privacy-lab | Privacy-by-design methods |
| community_thermometer | openg7-community-health-dashboard | Community health metrics |

## What is allowed in openg7-nexus

- Integration glue: adapters, clients, wiring for canonical capabilities
- UI composition and feature orchestration
- Platform-specific contracts and runtime config used by the web app or CMS

## What is not allowed here

- Canonical domain schemas, policies, or evidence/audit/metric logic
- Duplicated implementations that should live in a shared `@openg7/*` package
- Re-implementations of canonical repos under new folder names

## Fast Decision Guide

1. Is this domain-defining or reusable across repos? Put it in the canonical repo.
2. Is it only integration or delivery for the platform? It can live here.
3. If in doubt, create a shared package instead of copying.
