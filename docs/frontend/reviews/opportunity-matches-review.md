# OpportunityMatchesSection & Intro Modals — Code Review Notes

## Proposed PR Breakdown

### PR 1 — Consolidate confidence scoring math

- `OpportunityMatchesSection.confidencePercent()` clamps a raw match confidence between 0 and 1, multiplies by 100, and rounds the result before surfacing it. 【F:openg7-org/src/app/domains/opportunities/sections/opportunity-matches.section.ts†L201-L213】
- `Og7IntroBillboardContentComponent.scorePercent` reimplements the exact same clamping and rounding logic when rendering the partner introduction surface. 【F:openg7-org/src/app/domains/matchmaking/sections/og7-intro-billboard-content.component.ts†L171-L178】
- `PartnerDetailsPanelComponent.partnerTrustScore` applies the same 0–100 rounding recipe to partner trust data. 【F:openg7-org/src/app/shared/components/partner/partner-details-panel.component.ts†L150-L156】

➡️ Extract a shared helper (for example, `normalizeConfidencePercent(confidence?: number)` in `core/models/opportunity.ts`) so these surfaces cannot drift or clamp differently. This keeps analytics and UI messaging consistent.

### PR 2 — Centralize match filter taxonomies

- The section keeps local copies of the mode, province, and sector option lists (`MODE_OPTIONS`, `PROVINCE_OPTIONS`, `SECTOR_OPTIONS`) and does client-side filtering from them. 【F:openg7-org/src/app/domains/opportunities/sections/opportunity-matches.section.ts†L23-L104】
- The home "Global Filters" widget declares the same sector taxonomy array inline, plus hard-coded trade-mode `<option>` values. 【F:openg7-org/src/app/shared/components/filters/global-filters.component.ts†L33-L66】

➡️ Maintain a single source of truth for these enumerations (e.g., move to `core/models/opportunity.ts` or introduce `filters.constants.ts`) so future additions to sectors/provinces propagate across the UI.

### PR 3 — De-duplicate connect analytics events

- `OpportunityMatchesSection.handleConnect()` now bubbles the interaction without emitting analytics, leaving tracking to the parent surface. 【F:openg7-org/src/app/domains/opportunities/sections/opportunity-matches.section.ts†L130-L178】
- `Og7HomePageComponent.onConnectRequested()` calls `logOpportunityConnect()` which emits the event with `source: 'home_page'`. 【F:openg7-org/src/app/domains/home/pages/home/og7-home-page.component.ts†L111-L144】

➡️ Centralizing the tracking at the page layer prevents double counting and keeps `source` metadata consistent downstream.

## Additional Observations (backlog candidates)

- The section owns its own filter state even though the rest of the home experience already has `FiltersService`. If the intention is to keep matches in sync with the global filters, the duplication of state may cause mismatches. (No immediate action if they must diverge, but worth confirming.)
- Modal lifecycle management in `Og7IntroBillboardSection` is complex (`suspendAutoOpen`, manual symbols) and partially overlaps with the partner panel’s own dismissal hooks. If the UX ever expands, extracting a shared modal controller could cut repetition.
