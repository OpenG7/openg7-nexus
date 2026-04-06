# Covered Needs Audit

## Run context

- `Audit date`: `2026-04-05`
- `Command`:

```bash
yarn --cwd openg7-org exec playwright test \
  e2e/use-case-audit.spec.ts \
  e2e/use-case-audit-gap-coverage.spec.ts \
  e2e/rbac-access.spec.ts \
  e2e/search.spec.ts \
  e2e/saved-searches.spec.ts \
  e2e/corridors-realtime.spec.ts \
  e2e/resilience.spec.ts \
  e2e/notification-panel.spec.ts \
  e2e/notification-preferences.spec.ts \
  e2e/linkup-workflow.spec.ts \
  e2e/importation-analytics.spec.ts \
  e2e/admin-trust-visibility.spec.ts \
  e2e/admin-ops-observability.spec.ts \
  e2e/hydrocarbon-business-journey.spec.ts \
  e2e/hydrocarbon-feed-navigation.spec.ts \
  --workers=1 --reporter=dot
```

- `Result`: `33 passed`

## Executive verdict

The currently targeted E2E proof set is green and demonstrates that the main implemented OpenG7 Nexus journeys are covered across:

- public discovery
- authenticated company onboarding and imports
- account and session management
- RBAC and protected-route behavior
- search and saved searches
- corridor-driven navigation
- resilience on critical failures
- in-app notifications
- notification preference persistence
- editable linkup detail workflow on existing connections
- importation analytics
- trust visibility and formal review decisions
- admin ops observability
- OpenG7-specific hydrocarbon signal journeys

This is a strong audit of `covered needs`. It is not a claim that every business need of the product is fully closed.

## Covered needs proved by E2E

| Domain | Covered need | Current verdict | Main E2E evidence |
| --- | --- | --- | --- |
| Public discovery | Understand value proposition, sectors, pricing and statistics | `proved` | `e2e/use-case-audit.spec.ts` |
| Company onboarding | Complete company registration stepper and final submission | `proved` | `e2e/use-case-audit-gap-coverage.spec.ts` |
| Imports | Manual import, bulk import, importation entry surfaces | `proved` | `e2e/use-case-audit.spec.ts` |
| Importation analytics | Compare mode, comparison target, origin drilldown, annotations, watchlist creation, report scheduling | `proved` | `e2e/importation-analytics.spec.ts` |
| Account | Profile shell, export, active sessions, favorites | `proved` | `e2e/use-case-audit.spec.ts` |
| Account persistence | Profile save, password change, email change request, persistence after reload | `proved` | `e2e/use-case-audit-gap-coverage.spec.ts` |
| Session continuity | Protected-route persistence after hard reload | `proved` | `e2e/use-case-audit-gap-coverage.spec.ts` |
| RBAC | `visitor -> login`, `editor -> denied on admin`, `editor -> /pro`, `admin -> admin surfaces`, atypical account states | `proved` | `e2e/rbac-access.spec.ts` |
| Search | Quick search, keyboard selection, navigation, persistence in saved searches | `proved` | `e2e/search.spec.ts`, `e2e/saved-searches.spec.ts` |
| Corridor navigation | `home-corridors-realtime -> /feed -> corridor context -> derived filters -> filtered items` | `proved` | `e2e/corridors-realtime.spec.ts` |
| Resilience | Session expiration redirect, protected network failure, critical empty state, mobile-critical navigation | `proved` | `e2e/resilience.spec.ts` |
| Notifications | Header bell, unread counter, mark-read, inbox, mark-all-read, clear-read | `proved` | `e2e/notification-panel.spec.ts` |
| Notification preferences | Channel toggles, frequency, webhook enable or disable, save, and reload persistence | `proved` | `e2e/notification-preferences.spec.ts` |
| Linkup workflow | Existing linkup detail, internal note save, manual status update, and persistence back into history | `proved` | `e2e/linkup-workflow.spec.ts`, `e2e/use-case-audit.spec.ts` |
| Trust | `admin/trust -> review queue -> correction request or rejection -> public trust visibility on /partners/:id` | `proved` | `e2e/admin-trust-visibility.spec.ts`, `e2e/use-case-audit-gap-coverage.spec.ts` |
| Admin ops | `/admin/ops` visible snapshot, explicit refresh, explicit error, last valid snapshot preserved | `proved` | `e2e/admin-ops-observability.spec.ts` |
| OpenG7-specific value | Hydrocarbon signal journey from filtered feed to detail navigation | `proved` | `e2e/hydrocarbon-business-journey.spec.ts`, `e2e/hydrocarbon-feed-navigation.spec.ts` |
| Network and admin surfaces | Partner detail, enterprise page, company moderation shell, ops dashboard shell | `proved` | `e2e/use-case-audit.spec.ts` |

## Domains still only partially proved

| Remaining-gap bucket | Domain | Current status | What remains outside solid proof |
| --- | --- | --- | --- |
| Implemented but still weakly proved | Notification preference depth | `partial` | severity and source filters, quiet hours, and richer preference-matrix behavior are not yet proved in frontend E2E |
| Implemented but still weakly proved | Quality breadth | `partial` | broad a11y, richer offline behavior, large responsive sweep, and perceived-performance proof are still missing |
| Partially implemented workflow | Business object lifecycle | `partial` | editing, archiving, and durable enrichment flows for opportunities, companies, and partners |
| Partially implemented workflow | Linkup workflow depth | `partial` | direct creation remains outside current MVP; acceptance/refusal, messaging, attachments, and richer workflow branching remain unproved |
| Present in fragments, not yet decision-grade | Advanced discovery | `partial` | advanced filters, sorting, side-by-side comparison, deeper discovery drilldowns |
| Present in fragments, not yet decision-grade | Rich geospatial interaction | `partial` | direct map interactions, layers, richer geospatial drilldowns, decision-focused map behaviors |
| Present in fragments, not yet decision-grade | Observability depth | `partial` | provenance surfaces, audit trails of sensitive actions, and user-visible analytics trails remain outside current frontend UI |
| Present in fragments, not yet decision-grade | OpenG7 domain depth | `partial` | capacities, interprovincial dependencies, and explicit essential-service prioritization remain only partly demonstrated |

## Product-scope limits, not test omissions

- Direct linkup creation should not be forced into E2E while [`../../docs/frontend/linkup-functional-analysis.md`](../../docs/frontend/linkup-functional-analysis.md) still places it outside the current MVP.
- Observability proof should stay anchored to visible frontend surfaces such as `/admin/ops` until provenance or audit-trail UI is intentionally exposed.

## Recommended next work

Recommended execution order is:

- first, close proof gaps on already implemented surfaces
- then, close workflows that already have visible shells but not a durable lifecycle
- finally, raise fragmented product-map areas to decision-grade flows before proving them

| Domain | Gap type | Needs product work first? | Next recommended move | Priority |
| --- | --- | --- | --- | --- |
| Quality breadth | Weak proof on quality dimension | `no` | Add a narrow proof pack for mobile-critical navigation, basic a11y smoke, and key reload or offline edge cases | `P1` |
| Notification preference depth | Weak proof on implemented surface | `no` | Add frontend E2E for severity and source filters, quiet hours, and any remaining preference-matrix rules | `P1` |
| Business object lifecycle | Partially implemented workflow | `yes` | Pick one canonical lifecycle first, preferably opportunity archive and enrichment, then prove transition durability | `P2` |
| Advanced discovery | Present in fragments, not yet decision-grade | `yes` | Choose one high-value drilldown combining advanced filters, sorting, and detail navigation, then prove it end to end | `P2` |
| Observability depth | Present in fragments, not yet decision-grade | `yes` | Expose one user-visible provenance or audit-trail surface for a sensitive action, then add targeted E2E | `P2` |
| Linkup workflow depth | Partially implemented workflow | `yes` | Revisit only if the product scope expands beyond the current MVP toward acceptance or refusal branches, messaging, or attachment handling | `P3` |
| OpenG7 domain depth | Present in fragments, not yet decision-grade | `yes` | Expose one explicit prioritization journey such as essential-service or interprovincial-dependency triage, then prove it | `P3` |
| Rich geospatial interaction | Present in fragments, not yet decision-grade | `yes` | Define one direct map action that changes downstream context and prove it through feed or sector navigation | `P3` |

## Overall conclusion

As of `2026-04-05`, the covered-needs audit is strong and current: the proof set used for the implemented high-value journeys is green (`33 passed`) and supports a credible statement of what OpenG7 Nexus demonstrably covers in E2E today.

The remaining gaps now fall into four clearer buckets:

- implemented but still weakly proved surfaces or quality dimensions, such as notification-preference depth or broader quality proof
- partially implemented workflows whose main UI exists but whose lifecycle is not yet closed, such as business-object lifecycle management or future linkup branching beyond the current MVP
- product-map needs that are present in fragments but not yet exposed as decision-grade user flows, such as advanced discovery, richer geospatial interaction, explicit provenance, and deeper OpenG7 prioritization logic
- scope-deliberate exclusions that should not be mislabeled as missing tests
