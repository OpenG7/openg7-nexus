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

- `Supplemental date`: `2026-04-06`
- `Command`:

```bash
yarn exec playwright test e2e/feed-deeplink-persistence.spec.ts --workers=1 --reporter=dot
```

- `Result`: `1 passed`
- `What this adds`: a second focused advanced-discovery proof on `/feed`, covering direct entry with query-param filters already set, control and active-chip hydration from the deep link, filtered list stability across hard reload, and authoritative clear-filters behavior that resets both the UI state and the URL.

- `Supplemental date`: `2026-04-06`
- `Command`:

```bash
yarn exec playwright test e2e/quality-breadth-accessibility.spec.ts e2e/quality-breadth-responsive-sweep.spec.ts --workers=1 --reporter=dot
```

- `Result`: `6 passed`
- `What this adds`: two focused follow-on quality-breadth proof suites, covering keyboard-only operation of critical feed, profile, and admin-trust actions with labeled controls and announced feed state, plus a mobile-to-tablet responsive sweep across feed opportunity detail, statistics, and partner trust surfaces with stable CTA reachability and no horizontal overflow.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/opportunity-archive-lifecycle.spec.ts e2e/feed-advanced-discovery-comparison.spec.ts --workers=1 --reporter=dot
```

- `Result`: `2 passed`
- `What this adds`: the first durable business-object lifecycle proof on `/feed`, covering archive-state persistence from opportunity detail back to the list, across reload, and on reopened detail, plus a stronger advanced-discovery comparison proof across two explicit filter combinations with preserved query-param state through detail navigation.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/feed-source-context-drilldown.spec.ts --workers=1 --reporter=dot
```

- `Result`: `1 passed`
- `What this adds`: a source-context drilldown proof on `/feed`, covering corridor-derived context carried from `home-corridors-realtime`, one refined search deep link layered on top of that context, filtered narrowing, detail navigation, browser back, and reload while the corridor context and refined discovery state remain coherent.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/quality-breadth-screenreader-status.spec.ts --workers=1 --reporter=dot
```

- `Result`: `3 passed`
- `What this adds`: a focused announced-status proof pack across `/feed`, `/login`, and `/profile`, covering live feed status plus inline and toast error alerts on feed load failure, polite session-expired notice plus assertive API-failure announcement on login, and profile save failure then recovery announced through alert and status toasts.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/quality-breadth-perceived-performance.spec.ts --workers=1 --reporter=dot
```

- `Result`: `3 passed`
- `What this adds`: a focused perceived-performance proof pack spanning delayed opportunity-detail hydration on `/feed/opportunities/:itemId`, a delayed client-side scope handoff on `/statistics`, and delayed-load plus create-retry coherence on `/saved-searches`, proving explicit loading feedback appears before the next state resolves and that persistence is not implied before the retry succeeds.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/quality-breadth-offline-queueing.spec.ts --workers=1 --reporter=dot
```

- `Result`: `3 passed`
- `What this adds`: a focused offline-queueing proof pack across `/profile`, `/saved-searches`, and `/feed/indicators/:id`, covering local profile edits that survive an offline-like save failure until a successful retry, one saved-search create draft that stays visible without a false persisted row and resolves to exactly one entry after retry, and one locally restored indicator-alert draft that reopens in offline state after reload before being retried into a durable subscribed rule.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/quality-breadth-form-error-recovery.spec.ts --workers=1 --reporter=dot
```

- `Result`: `3 passed`
- `What this adds`: a focused form-error-recovery proof pack across `/login`, `/profile`, and `/feed/opportunities/:itemId`, covering invalid-to-valid correction on login credentials, webhook validation recovery before profile save, and opportunity-offer drawer validation recovery into a single clean success state without lingering global errors.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/feed-stacked-filters-drilldown.spec.ts --workers=1 --reporter=dot
```

- `Result`: `1 passed`
- `What this adds`: a focused advanced-discovery drilldown proof on `/feed`, covering one light deep link that is intentionally stacked into a narrower query, detail navigation with preserved query params, browser-back rehydration, and one-filter unwind that broadens results without losing the remaining stacked context.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/feed-context-switch-comparison.spec.ts --workers=1 --reporter=dot
```

- `Result`: `1 passed`
- `What this adds`: a focused inherited-context comparison proof on `/feed`, covering one refined `home-feed-panels` entry and one refined `corridors-realtime` entry, with preserved source params through detail navigation and browser-back, plus a clear contrast between highlighted home-panel context and corridor-derived province chips.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/opportunity-enrichment-lifecycle.spec.ts --workers=1 --reporter=dot
```

- `Result`: `1 passed`
- `What this adds`: a focused opportunity-enrichment lifecycle proof on `/feed/opportunities/:itemId`, covering queued report submission, header rehydration into `view-my-report` and `report-another` actions, reopen-from-list continuity, and reload persistence into a readable pending-report view.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/quality-breadth-drawer-focus-return.spec.ts --workers=1 --reporter=dot
```

- `Result`: `1 passed`
- `What this adds`: a focused drawer-keyboard proof on `/feed/opportunities/:itemId`, covering keyboard open on the offer drawer, forward tab navigation inside the dialog, wrap from the last actionable control back to the first, Escape close, opener focus return, and a second reopen-close cycle without focus loss.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/feed-source-context-unwind.spec.ts --workers=1 --reporter=dot
```

- `Result`: `1 passed`
- `What this adds`: a focused inherited-source unwind proof on `/feed`, covering a corridor-derived entry context, one explicit search refinement layered on top, removal of only that explicit refinement, and reload persistence while the `source` frame and derived province context remain intact.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/feed-view-context-refinement.spec.ts --workers=1 --reporter=dot
```

- `Result`: `1 passed`
- `What this adds`: a focused route-view refinement proof on `/feed/hydrocarbons`, covering one explicit search refinement layered on top of the dedicated hydrocarbon defaults, preserved detail navigation, browser-back rehydration, reload persistence, and continued visibility of the hydrocarbon panel plus route-derived filter frame.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/admin-ops-provenance-trail.spec.ts e2e/admin-ops-observability.spec.ts --workers=1 --reporter=dot
```

- `Result`: `4 passed`
- `What this adds`: a focused observability-depth proof on `/admin/ops`, covering visible provenance metadata per snapshot source, coherent provenance refresh on successful reload, preserved-last-good provenance state on failed refresh, and confirmation that the existing operational snapshot behavior remains intact on the same screen.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/company-or-partner-enrichment-lifecycle.spec.ts --workers=1 --reporter=dot
```

- `Result`: `1 passed`
- `What this adds`: a focused non-feed business-object lifecycle proof spanning `/admin/trust` and `/partners/:id`, covering one richer trust-enrichment cycle with correction-request decision, added evidence source, added reliability-history entry, admin reload and reopen continuity, a second approval decision on the same company, and public partner-detail persistence after reopen and reload.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/quality-breadth-offline-edge-continuity.spec.ts --workers=1 --reporter=dot
```

- `Result`: `1 passed`
- `What this adds`: a focused offline-continuity proof on `/feed/indicators/:itemId`, covering one locally restored indicator-alert draft through drawer close, navigation interruption to another route, browser-back return, hard reload, eventual retry, and a final reopened success view without stranded offline state.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/quality-breadth-announcement-continuity.spec.ts --workers=1 --reporter=dot
```

- `Result`: `1 passed`
- `What this adds`: a focused announcement-continuity proof on `/feed/alerts/:itemId`, covering one local alert-update failure surfaced as an assertive alert, a successful resubmission surfaced as a polite status, navigation away and back, hard reload, and a reopened pending-report view with no stale or duplicated local status announcements.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/quality-breadth-cross-surface-a11y-depth.spec.ts --workers=1 --reporter=dot
```

- `Result`: `3 passed`
- `What this adds`: a focused notification accessibility-depth proof pack spanning the header panel and `/alerts`, covering keyboard-only open and read on header notifications, Escape-close focus return to the trigger, assertive batch-action error announcement plus retry recovery in the alerts inbox, and keyboard-usable item-level read and delete actions while the list mutates.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/quality-breadth-importation-a11y-depth.spec.ts --workers=1 --reporter=dot
```

- `Result`: `2 passed`
- `What this adds`: a focused importation accessibility-depth proof pack on `/importation`, covering a labeled compare filter with keyboard-only invalid-to-valid recovery into durable query-param state, plus assertive collaboration-form validation errors and keyboard-only corrected submission for watchlist creation and report scheduling.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/quality-breadth-auth-recovery-depth.spec.ts --workers=1 --reporter=dot
```

- `Result`: `2 passed`
- `What this adds`: a focused auth-recovery quality pack across `/forgot-password` and `/reset-password`, covering keyboard-only invalid-submit recovery, assertive API-failure feedback plus error toasts, success-state confirmation plus success toasts, durable reset-token hydration from the route, mismatch correction before retry, and successful redirect completion back to `/login`.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/quality-breadth-importation-responsive.spec.ts --workers=1 --reporter=dot
```

- `Result`: `2 passed`
- `What this adds`: a focused importation responsive sweep across narrow mobile and tablet landscape, covering page-level no-overflow stability, reachable compare controls on mobile, durable compare-state update without layout breakage, visible collaboration actions on narrow viewports, and stable flow drilldown plus collaboration-card rendering on tablet.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/quality-breadth-saved-searches-a11y-depth.spec.ts --workers=1 --reporter=dot
```

- `Result`: `2 passed`
- `What this adds`: a focused saved-searches accessibility-depth proof on `/saved-searches`, covering keyboard-triggered invalid-to-valid creation recovery with described-by field errors, plus inline update failure announcement with assertive page feedback, visual-state rollback, and clean retry recovery on notify and frequency controls.

- `Supplemental date`: `2026-04-07`
- `Command`:

```bash
yarn exec playwright test e2e/feed-decision-path-depth.spec.ts --workers=1 --reporter=dot
```

- `Result`: `1 passed`
- `What this adds`: a focused deeper discovery decision-path proof on `/feed/hydrocarbons`, covering one `home-feed-panels` inherited entry layered onto the dedicated hydrocarbon route, one explicit search refinement, detail navigation, browser-back rehydration, removal of only that explicit refinement while the route-view and inherited context remain visible, and hard-reload persistence with the highlighted item still legible.

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

The `2026-04-06` to `2026-04-07` supplemental proof set does not change the core E2E verdict, but it does reduce uncertainty around several previously weaker areas: linkup quality breadth below the E2E layer, notification-preference matrix depth within targeted E2E, cross-surface quality breadth on feed, profile, admin trust, statistics, partner detail, importation, auth recovery, and saved searches under transient failure, delayed hydration, keyboard access, responsive stress, accessible error announcement, announced status semantics, perceived-performance handoff, richer offline queueing behavior, invalid-to-valid form recovery, drawer focus-return behavior, and deeper keyboard-plus-error semantics on the notifications header panel, `/alerts` inbox, `/importation` collaboration filters and forms, auth recovery screens, `/saved-searches` creation and inline update flows, and importation responsive layouts, advanced-discovery continuity on `/feed` through roundtrip, deep-link persistence, comparison-oriented drilldown, stacked-filter drilldown with single-filter unwind, inherited-context switching between entry points, corridor-derived source-context refinement, explicit source-context unwind without collapsing the inherited frame, dedicated route-view refinement on `/feed/hydrocarbons`, and one visible provenance trail on `/admin/ops`, plus two concrete business-object lifecycles on opportunities via durable archive and persisted queued reporting.

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
| Implemented but still weakly proved | Quality breadth | `partial` | targeted proof now covers transient recovery, an offline-like save-and-retry path, transient feed publish failure with resilient resubmission, explicit delayed-hydration loading feedback, delayed client-side handoff on statistics, truthful create-retry behavior on saved searches, richer offline queueing across profile, saved searches, and indicator alerts, one stronger offline continuity path on indicator alerts through navigation interruption plus reload before retry, invalid-to-valid form recovery across login, profile, feed offer flows, importation collaboration forms, auth recovery screens, and saved-search creation, drawer focus return and repeatable keyboard reopen on feed opportunity detail, keyboard-only operation of critical feed, profile, admin-trust, header-notification, alerts-inbox, importation compare-plus-collaboration controls, auth recovery submission flows, and saved-search notify toggles, labeled statistics filters with named complementary regions, labeled importation compare input, described-by linkage on reset-password errors and saved-search required-field errors, mobile-to-tablet responsive stability on feed opportunity detail, statistics, partner trust, and importation surfaces, baseline control semantics on profile, accessible login error announcements, assertive batch-error semantics plus retry recovery on `/alerts`, assertive importation validation semantics, assertive forgot-password and reset-password API feedback with success completion, assertive saved-search inline update error semantics with rollback-correct retry behavior, stronger local announcement continuity on alert detail through error-to-success transitions plus navigation and reload, and mobile keyboard navigation, but broader a11y depth and some additional offline breadth on other surfaces are still missing |
| Partially implemented workflow | Business object lifecycle | `partial` | two concrete opportunity lifecycles are now proved through durable archive and persisted queued reporting on `/feed`, and one richer non-feed trust-enrichment lifecycle is now proved across `/admin/trust` and `/partners/:id`, but broader company and partner editing beyond trust plus other object types remain outside strong proof |
| Partially implemented workflow | Linkup workflow depth | `partial` | direct creation remains outside current MVP; acceptance/refusal, messaging, attachments, and richer workflow branching remain unproved |
| Present in fragments, not yet decision-grade | Advanced discovery | `partial` | feed filter-sort-detail roundtrip, deep-link persistence with clear-filter reset, a comparison-oriented two-combination drilldown, one stacked-filter drilldown with partial unwind, one inherited-context switch comparison between home panels and corridor entry, corridor-derived source-context refinement, one explicit source-context unwind, one dedicated hydrocarbon route-view refinement, and one longer route-view-plus-inherited-context decision path with selective unwind are now proved, but cross-surface discovery chains remain outside strong proof |
| Present in fragments, not yet decision-grade | Rich geospatial interaction | `partial` | direct map interactions, layers, richer geospatial drilldowns, decision-focused map behaviors |
| Present in fragments, not yet decision-grade | Observability depth | `partial` | one visible provenance trail is now proved on `/admin/ops`, but broader audit trails of sensitive actions and user-visible analytics trails remain outside current frontend UI |
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
| Quality breadth | Weak proof on quality dimension | `no` | Extend the current proof pack beyond transient recovery, offline-like save retry, transient offer resubmission, current perceived-performance handoff coverage, current offline queueing coverage, current form-error-recovery coverage, current drawer-focus-return coverage, current keyboard-only checks, current announced-status coverage, and current mobile-to-tablet responsive coverage into broader a11y depth and remaining offline edge cases | `P1` |
| Advanced discovery | Present in fragments, not yet decision-grade | `no` | Extend the now-proved roundtrip, deep-link persistence, comparison drilldown, stacked-filter drilldown with partial unwind, inherited-context comparison, source-context refinement, source-context unwind, route-view refinement, and longer decision-path proof into one cross-surface discovery chain such as a direct map-to-feed transition | `P2` |
| Observability depth | Present in fragments, not yet decision-grade | `yes` | Extend the newly proved `/admin/ops` provenance surface into a second visible audit-trail or action-history signal tied to a sensitive admin or moderation action | `P2` |
| Linkup workflow depth | Partially implemented workflow | `yes` | Revisit only if the product scope expands beyond the current MVP toward acceptance or refusal branches, messaging, or attachment handling | `P3` |
| OpenG7 domain depth | Present in fragments, not yet decision-grade | `yes` | Expose one explicit prioritization journey such as essential-service or interprovincial-dependency triage, then prove it | `P3` |
| Rich geospatial interaction | Present in fragments, not yet decision-grade | `yes` | Define one direct map action that changes downstream context and prove it through feed or sector navigation | `P3` |

## Next 5 exact proofs to add after the latest feed, lifecycle, and quality-breadth proofs

This is the most profitable next-proof order if the goal is to reduce uncertainty quickly without reopening too much product scope.

| Order | Proposed spec file | Exact flow to prove | Exact assertions to add | Needs product work first? | Suggested owner |
| --- | --- | --- | --- | --- | --- |
| 1 | `e2e/admin-ops-action-audit-trail.spec.ts` | `/admin/ops -> trigger or inspect one sensitive admin action with user-visible history metadata` | observability advances from static provenance into one coherent user-visible audit trail | `yes` | `Frontend + E2E` |
| 2 | `e2e/essential-service-prioritization.spec.ts` | one explicit essential-service or interprovincial-dependency prioritization journey from exposed OpenG7 signals into downstream context | deeper OpenG7 domain logic becomes visible as a decision-grade workflow rather than fragmented indicators | `yes` | `Frontend + E2E` |
| 3 | `e2e/map-to-feed-decision-chain.spec.ts` | one direct map interaction that changes downstream feed or sector context and survives detail navigation | richer geospatial interaction starts behaving like a decision-grade chain instead of a static visualization | `yes` | `Frontend + E2E` |
| 4 | `e2e/quality-breadth-cross-surface-a11y-depth.spec.ts` | one additional accessible state flow on a different high-value surface such as auth recovery, importation, or notifications | quality breadth moves beyond the current cluster of feed, profile, login, statistics, and partner trust proofs | `no` | `E2E` |
| 5 | `e2e/linkup-workflow-branch-depth.spec.ts` | one visible linkup branch such as acceptance, refusal, or richer status history once exposed in the current MVP surface | linkup depth advances from note-and-status persistence into one clearer branching workflow with durable history evidence | `yes` | `Frontend + E2E` |

Operationally, the first and fifth are proof-only work on already exposed surfaces. The second, third, and fourth are the next best product-following proofs, but they should follow visible product closure because observability beyond static provenance, deeper OpenG7 prioritization, and direct map-driven decision chains are not yet surfaced enough.

## Overall conclusion

As of `2026-04-07`, the covered-needs audit remains strong and current: the main E2E proof set used for the implemented high-value journeys is green (`33 passed`), the focused supplemental Angular proof for the implemented matchmaking surfaces is green (`22 SUCCESS`), the focused supplemental notification-preferences E2E suite is green (`7 passed`), the focused quality-breadth proof pack is green (`10 passed`), the focused supplemental advanced-discovery feed proofs are green (`1 passed` each for roundtrip and deep-link persistence), the two new quality-breadth follow-on suites are green (`6 passed`), the lifecycle-plus-discovery supplement is green (`2 passed`), the new source-context drilldown proof is green (`1 passed`), the new announced-status quality pack is green (`3 passed`), the new perceived-performance quality pack is green (`3 passed`), the new offline-queueing quality pack is green (`3 passed`), the new form-error-recovery quality pack is green (`3 passed`), the new stacked-filter drilldown proof is green (`1 passed`), the new inherited-context comparison proof is green (`1 passed`), the new opportunity-enrichment lifecycle proof is green (`1 passed`), the new drawer-focus-return proof is green (`1 passed`), the new source-context-unwind proof is green (`1 passed`), the new route-view refinement proof is green (`1 passed`), the new admin-ops provenance supplement is green (`4 passed`), the new company-or-partner enrichment lifecycle proof is green (`1 passed`), the new offline-edge continuity proof is green (`1 passed`), the new announcement-continuity proof is green (`1 passed`), the new notification accessibility-depth proof is green (`3 passed`), the new importation accessibility-depth proof is green (`2 passed`), the new auth-recovery quality proof is green (`2 passed`), the new importation responsive proof is green (`2 passed`), the new saved-searches accessibility-depth proof is green (`2 passed`), and the new decision-path-depth proof is green (`1 passed`).

The remaining gaps now fall into four clearer buckets:

- implemented but still weakly proved surfaces or quality dimensions, such as broader quality proof beyond the now-better-covered linkup workflow
- partially implemented workflows whose main UI exists but whose lifecycle is only partly closed, such as richer business-object enrichment beyond the newly proved archive and queued-report paths or future linkup branching beyond the current MVP
- product-map needs that are present in fragments but not yet exposed as decision-grade user flows, such as richer stacked advanced discovery, richer geospatial interaction, explicit provenance, and deeper OpenG7 prioritization logic
- scope-deliberate exclusions that should not be mislabeled as missing tests
