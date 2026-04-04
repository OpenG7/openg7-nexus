# Covered Needs Audit

## Run context

- `Audit date`: `2026-04-01`
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
  e2e/importation-analytics.spec.ts \
  e2e/admin-trust-visibility.spec.ts \
  e2e/admin-ops-observability.spec.ts \
  e2e/hydrocarbon-business-journey.spec.ts \
  e2e/hydrocarbon-feed-navigation.spec.ts \
  --workers=1 --reporter=dot
```

- `Result`: `29 passed`

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
- importation analytics
- trust visibility
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
| Trust | `admin/trust -> save -> public trust visibility on /partners/:id` | `proved` | `e2e/admin-trust-visibility.spec.ts`, `e2e/use-case-audit-gap-coverage.spec.ts` |
| Admin ops | `/admin/ops` visible snapshot, explicit refresh, explicit error, last valid snapshot preserved | `proved` | `e2e/admin-ops-observability.spec.ts` |
| OpenG7-specific value | Hydrocarbon signal journey from filtered feed to detail navigation | `proved` | `e2e/hydrocarbon-business-journey.spec.ts`, `e2e/hydrocarbon-feed-navigation.spec.ts` |
| Network and admin surfaces | Linkup history/detail visibility, partner detail, enterprise page, company moderation shell, ops dashboard shell | `proved` | `e2e/use-case-audit.spec.ts` |

## Domains still only partially proved

| Domain | Current status | What remains outside solid proof |
| --- | --- | --- |
| Advanced discovery | `partial` | advanced filters, sorting, side-by-side comparison, deeper discovery drilldowns |
| Rich geospatial interaction | `partial` | direct map interactions, layers, richer geospatial drilldowns, decision-focused map behaviors |
| Business object lifecycle | `partial` | editing, archiving, and durable enrichment flows for opportunities, companies, and partners |
| Linkup workflow | `partial` | direct creation remains outside current MVP; acceptance/refusal, messaging, attachments, formal workflow status remain unproved |
| Notification preferences | `partial` | email/webhook preferences and richer matrix behavior are not proved in frontend E2E |
| Trust workflow depth | `partial` | verification queue, formal rejection, and correction-request workflow are not exposed enough to prove |
| Observability depth | `partial` | provenance surfaces, audit trails of sensitive actions, and user-visible analytics trails remain outside current frontend UI |
| OpenG7 domain depth | `partial` | capacities, interprovincial dependencies, and explicit essential-service prioritization remain only partly demonstrated |
| Quality breadth | `partial` | broad a11y, richer offline behavior, large responsive sweep, and perceived-performance proof are still missing |

## Product-scope limits, not test omissions

- Direct linkup creation should not be forced into E2E while [`../../docs/frontend/linkup-functional-analysis.md`](../../docs/frontend/linkup-functional-analysis.md) still places it outside the current MVP.
- Observability proof should stay anchored to visible frontend surfaces such as `/admin/ops` until provenance or audit-trail UI is intentionally exposed.

## Overall conclusion

As of `2026-04-01`, the covered-needs audit is strong and current: the proof set used for the implemented high-value journeys is green (`29 passed`) and supports a credible statement of what OpenG7 Nexus demonstrably covers in E2E today.

The remaining gaps are now mostly of two kinds:

- deeper product-map needs that are only partially implemented or exposed
- scope-deliberate exclusions that should not be mislabeled as missing tests
