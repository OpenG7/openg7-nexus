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

## Supplemental proof added after the audit

- `Supplemental date`: `2026-04-06`
- `Command`:

```bash
yarn test --watch=false --browsers=ChromeHeadless --include src/app/domains/matchmaking/**/*.spec.ts
```

- `Result`: `22 SUCCESS`
- `What this adds`: stronger non-E2E proof for the implemented linkup surfaces, especially retry behavior, filter reset behavior, note edge cases, pagination mapping, blank-note fallback, and non-404 error propagation across:
  - `src/app/domains/matchmaking/pages/linkup-detail/og7-linkup-detail-page.component.spec.ts`
  - `src/app/domains/matchmaking/pages/linkup-history/og7-linkup-history-page.component.spec.ts`
  - `src/app/domains/matchmaking/data-access/linkup-data.service.spec.ts`

- `Supplemental date`: `2026-04-06`
- `Command`:

```bash
yarn exec playwright test e2e/notification-preferences.spec.ts --workers=1 --reporter=dot
```

- `Result`: `7 passed`
- `What this adds`: deeper E2E proof for notification-preference behavior, covering severity filters, source filters, webhook HTTPS validation, quiet-hours validation, quiet-hours disable-and-clear behavior, and quiet-hours persistence in addition to the earlier channel, frequency, and webhook coverage.

- `Supplemental date`: `2026-04-06`
- `Command`:

```bash
yarn exec playwright test e2e/quality-breadth.spec.ts --workers=1 --reporter=dot
```

- `Result`: `10 passed`
- `What this adds`: a focused quality-breadth proof pack for transient failure recovery after reload, offline-like profile-save failure with local state preservation and successful retry, resilient opportunity-offer resubmission after a transient publish failure on feed detail, explicit loading-state feedback during delayed opportunity-detail hydration, tablet-safe stacked opportunity-detail rendering without horizontal overflow, keyboard-usable labeled filters and named complementary regions on the statistics workspace, narrow-tablet statistics rendering without horizontal overflow, baseline accessibility semantics on profile notification controls, accessible invalid-field and assertive API-error announcements on login, and keyboard-usable critical mobile navigation with correct menu state.

- `Supplemental date`: `2026-04-06`
- `Command`:

```bash
yarn exec playwright test e2e/feed-advanced-discovery-roundtrip.spec.ts --workers=1 --reporter=dot
```

- `Result`: `1 passed`
- `What this adds`: a focused advanced-discovery roundtrip proof on `/feed`, covering deep-linked type, sector, mode, sort, and from-province state, visible filtered narrowing, `VOLUME` ordering, navigation into an opportunity detail route, and a return to the same filtered feed context with query params and controls preserved.

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

The `2026-04-06` supplemental proof set does not change the core E2E verdict, but it does reduce uncertainty around three previously weaker areas: linkup quality breadth below the E2E layer, notification-preference matrix depth within targeted E2E, and cross-surface quality breadth on feed, statistics, and login under transient failure, delayed hydration, keyboard access, responsive stress, and accessible error announcement.

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
| Implemented but still weakly proved | Quality breadth | `partial` | targeted proof now covers transient recovery, an offline-like save-and-retry path, transient feed publish failure with resilient resubmission, explicit delayed-hydration loading feedback, tablet-safe stacked rendering without horizontal overflow on feed and statistics, keyboard-usable labeled statistics filters with named complementary regions, baseline control semantics on profile, accessible login error announcements, and mobile keyboard navigation, but broader a11y depth, richer offline behavior, a larger responsive sweep, and deeper perceived-performance proof are still missing |
| Partially implemented workflow | Business object lifecycle | `partial` | editing, archiving, and durable enrichment flows for opportunities, companies, and partners |
| Partially implemented workflow | Linkup workflow depth | `partial` | direct creation remains outside current MVP; acceptance/refusal, messaging, attachments, and richer workflow branching remain unproved |
| Present in fragments, not yet decision-grade | Advanced discovery | `partial` | one feed filter-sort-detail roundtrip is now proved, but side-by-side comparison, broader advanced filter combinations, and deeper discovery drilldowns remain outside strong proof |
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
| Quality breadth | Weak proof on quality dimension | `no` | Extend the new proof pack beyond transient recovery, offline-like save retry, transient offer resubmission, delayed-hydration loading feedback, current feed/statistics tablet coverage, current keyboard-access checks, and current login-error announcement coverage into richer offline behavior, wider responsive coverage, and perceived-performance checks | `P1` |
| Business object lifecycle | Partially implemented workflow | `yes` | Pick one canonical lifecycle first, preferably opportunity archive and enrichment, then prove transition durability | `P2` |
| Advanced discovery | Present in fragments, not yet decision-grade | `yes` | Choose one high-value drilldown combining advanced filters, sorting, and detail navigation, then prove it end to end | `P2` |
| Observability depth | Present in fragments, not yet decision-grade | `yes` | Expose one user-visible provenance or audit-trail surface for a sensitive action, then add targeted E2E | `P2` |
| Linkup workflow depth | Partially implemented workflow | `yes` | Revisit only if the product scope expands beyond the current MVP toward acceptance or refusal branches, messaging, or attachment handling | `P3` |
| OpenG7 domain depth | Present in fragments, not yet decision-grade | `yes` | Expose one explicit prioritization journey such as essential-service or interprovincial-dependency triage, then prove it | `P3` |
| Rich geospatial interaction | Present in fragments, not yet decision-grade | `yes` | Define one direct map action that changes downstream context and prove it through feed or sector navigation | `P3` |

## Next 5 exact proofs to add

This is the most profitable next-proof order if the goal is to reduce uncertainty quickly without reopening too much product scope.

| Order | Proposed spec file | Exact flow to prove | Exact assertions to add | Needs product work first? | Suggested owner |
| --- | --- | --- | --- | --- | --- |
| 1 | `e2e/feed-advanced-discovery-roundtrip.spec.ts` | `/feed -> apply type + sector + from province + mode + sort -> open one filtered opportunity -> return to /feed` | active-filter chips appear, filtered list narrows, sort changes the top of list, detail navigation preserves feed context when returning | `no` | `E2E` |
| 2 | `e2e/feed-deeplink-persistence.spec.ts` | load `/feed` with query-param filters already set -> verify controls and list -> hard reload -> clear filters | controls reflect URL state, filtered items stay aligned with the deep link after reload, clear-filters resets both UI state and query params | `no` | `E2E` |
| 3 | `e2e/quality-breadth-accessibility.spec.ts` | keyboard-only pass across `/feed`, `/profile`, and `/admin/trust` on critical controls and decision actions | visible focus remains trackable, critical controls are labeled, live or error messaging is announced, no primary action is mouse-only | `no` | `E2E` |
| 4 | `e2e/quality-breadth-responsive-sweep.spec.ts` | run `/feed/opportunities/:itemId`, `/statistics`, and `/partners/:id` at narrow mobile, tablet portrait, and tablet landscape widths | no horizontal overflow, primary CTA stays reachable, cards and asides reflow without clipping, sticky headers do not cover critical content | `no` | `E2E` |
| 5 | `e2e/opportunity-archive-lifecycle.spec.ts` | `/feed/opportunities/:itemId -> archive -> return to /feed -> reload -> reopen detail` | archive state is visible in detail and list views, the transition survives reload, and the archived item stays in a coherent lifecycle state | `yes` | `Frontend + E2E` |

Operationally, the first four are proof-only work on already exposed surfaces. The fifth is the next best lifecycle proof, but it should follow product closure because the current archive action still stops at a local saved-state signal.

## Overall conclusion

As of `2026-04-06`, the covered-needs audit remains strong and current: the main E2E proof set used for the implemented high-value journeys is green (`33 passed`), the focused supplemental Angular proof for the implemented matchmaking surfaces is green (`22 SUCCESS`), the focused supplemental notification-preferences E2E suite is green (`7 passed`), and the focused quality-breadth proof pack is green (`10 passed`).

The remaining gaps now fall into four clearer buckets:

- implemented but still weakly proved surfaces or quality dimensions, such as broader quality proof beyond the now-better-covered linkup workflow
- partially implemented workflows whose main UI exists but whose lifecycle is not yet closed, such as business-object lifecycle management or future linkup branching beyond the current MVP
- product-map needs that are present in fragments but not yet exposed as decision-grade user flows, such as advanced discovery, richer geospatial interaction, explicit provenance, and deeper OpenG7 prioritization logic
- scope-deliberate exclusions that should not be mislabeled as missing tests
