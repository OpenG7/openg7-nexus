# `/importation` page UX blueprint

This document describes the envisioned user experience for the importation workspace of the OpenG7 platform. The page is part of the logged-in product surface and helps procurement analysts, policy specialists, and trade officers understand incoming goods flows, request dataset enrichments, and coordinate actions with their teams.

## 1. Page objectives

- Provide a high-level snapshot of the country's import composition across time, origin markets, and HS sections.
- Allow deep investigation of specific commodities with filtering, comparison, and anomaly detection tools.
- Connect quantitative insights with qualitative context (news, alerts, partner notes) surfaced from Strapi content.
- Streamline collaboration by exposing assignment workflows, shared watchlists, and export options.

## 2. Information architecture & layout

| Fold           | Section                     | Purpose                                                                                                           |
| -------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Above the fold | Overview header + KPI tiles | Show last-updated timestamp, total import value, YOY delta, and quick filters (region, HS section, partner type). |
| Fold 1         | Flow map + timeline         | Visualise import flows on a choropleth map, with timeline scrubber for month/quarter selection.                   |
| Fold 2         | Commodity deep dive         | Tabs for "Top commodities", "Emerging trends", and "Risk flags" with sortable tables and sparkline chips.         |
| Fold 3         | Supplier intelligence       | Cards highlighting strategic suppliers, dependency scores, and diversification recommendations.                   |
| Fold 4         | Collaboration hub           | Shared watchlists, recent annotations, assignment panel, and export actions.                                      |
| Bottom         | Knowledge base & next steps | Strapi-powered articles, alerts, and CTA to request an enriched dataset.                                          |

The page uses the authenticated shell layout (`<og7-app-shell>`) with a persistent left navigation. Breadcrumb: `Tableau de bord / Commerce extérieur / Importation`.

### 2.1 Above-the-fold structure

- **Title block**: `Importations — Vue consolidée` with meta info (last refresh, data provider).
- **Quick filters**: segmented controls for `Période` (Mois, Trimestre, Année), `Origine` (global, blocs économiques), `Section SH` multi-select chip tray.
- **KPI tiles**: four responsive cards showing total value, variation, top origin, and risk index. Tiles include sparkline mini-charts.

### 2.2 Flow map & timeline

- Map occupies left two-thirds; right panel houses timeline + legend.
- Timeline scrubber stacked under map with play/pause for animated playback.
- `Compare` mode toggled via button: allows selecting two periods to show delta map (diverging colour scale) and stats.

### 2.3 Commodity deep dive

- Tab bar with counts (e.g., `Top produits (25)`), sticky below hero when scrolling.
- Each tab uses a table component with pinned columns on desktop and card layout on mobile.
- Row interactions open a side drawer with extended metrics, supply chain notes, and export buttons (`CSV`, `JSON`, `Looker`).

### 2.4 Collaboration hub

- Shows shared watchlists (chips with owners, last activity) and ability to create new.
- Recent annotations feed displays avatars, timestamp, excerpt, and link to the annotated entity.
- Assignment panel integrates with task service: dropdown for assignee, due date picker, status pill.
- Export actions (download, schedule report, push to BI) grouped in a ghost button + dropdown.

### 2.5 Knowledge base & CTA

- Pull Strapi entries tagged `importation-insights` (FR/EN) with thumbnail, title, summary.
- CTA card `Demander un enrichissement` with button opening request modal.

## 3. Data dependencies

### 3.1 API contracts

- `GET /api/import-flows?period={month|quarter|year}&origin={...}&hsSections=[]`: returns aggregate flows grouped by partner + HS section with timeline series.
- `GET /api/import-commodities?filters=...`: paginated dataset with rankings, risk scores, forecast deltas.
- `GET /api/import-risk-flags`: curated alerts (text, severity, linked commodity IDs).
- `GET /api/import-suppliers`: strategic supplier profiles with dependency metrics.
- `POST /api/watchlists` / `PATCH /api/watchlists/:id`: manage watchlists (requires `editor` role).
- `GET /api/annotations?context=importation`: fetch timeline of collaborative notes.

All endpoints require authenticated tokens and respect feature flag `importationModule`.

### 3.2 Strapi content modeling

- Collection type `importation-article` (title, summary, rich body, language, tags, related commodities).
- Component `collaboration.watchlist` for seedable watchlist templates (name, description, default filters).
- Component `knowledge.ctaCard` (title, subtitle, primaryLink, icon) for the bottom CTA.

## 4. Angular implementation sketch

```text
src/app/domains/trade/importation/
├─ importation.routes.ts
├─ importation.page.ts
├─ importation.page.html
├─ importation.page.scss
├─ components/
│  ├─ overview-header/
│  ├─ flow-map-panel/
│  ├─ timeline-scrubber/
│  ├─ commodity-table/
│  ├─ supplier-cards/
│  ├─ collaboration-hub/
│  └─ knowledge-section/
├─ services/
│  ├─ importation-filters.store.ts
│  ├─ importation-analytics.service.ts
│  └─ importation-permissions.service.ts
└─ data-access/
   ├─ importation-api.client.ts
   └─ importation.viewmodel.mapper.ts
```

- Route guarded by `canMatchFeature('importationModule')` and `canMatchRole(['analyst', 'admin'])`.
- Resolver prefetches baseline flows + commodities for the default period to avoid loading flashes.
- `importation-filters.store` uses Angular signals to manage filter state, derived selectors for KPI computations, and persists selections to query params.
- Components rely on `@openg7/ui` primitives (chips, segmented controls, data tables) and support skeleton states.

## 5. Key interactions

- **Filter persistence**: last-used filters stored in local storage (`importation:lastFilters`) and synced when the user re-enters the page.
- **Drilldown**: clicking a region on the map refines filters to that origin and auto-scrolls to the commodity table with highlight.
- **Anomaly detection**: risk flags appear as badges on table rows; clicking opens modal with explanation, recommended actions, and link to supplier profile.
- **Collaboration**: `@` mention inside annotations triggers user lookup; watchers receive notifications via the global notification service.
- **Exports**: selecting "Schedule report" opens modal letting users configure frequency, format, and recipients. Backend uses background job queue.

## 6. Visual system

- Primary palette uses deep navy background for the map, contrasted with teal and coral flow lines.
- KPI tiles adopt glassmorphism overlay on desktop (`backdrop-filter`) while falling back to solid surfaces on mobile.
- Iconography: import-specific icons sourced from `@openg7/ui/icons` set (`og7-icon-ship`, `og7-icon-container`).
- Map uses D3 canvas layer; ensure accessible colour contrast with legend text at ≥ 4.5:1.

## 7. Accessibility & performance

- Provide text alternatives for map insights (`aria-describedby` summarising top three origins based on current filters).
- Ensure keyboard navigation for timeline scrubber (arrow keys adjust, space toggles play/pause).
- Lazy-load heavy analytical modules and use `IntersectionObserver` to defer Strapi article fetch until near viewport.
- Prefetch data when user hovers related navigation link (`/exportation` or `/importation`) for improved perceived speed.

## 8. Analytics & telemetry

- Fire `importation_page_viewed` with properties `{ period, originScope, hsSectionCount, userRole }`.
- Track filter changes via `importation_filter_updated` (debounced) and map interactions via `importation_map_drilldown`.
- Log collaboration events (`watchlist_created`, `annotation_posted`) for adoption metrics.
- Integrate performance marks for initial data load (`performance.mark('importation.initialDataLoaded')`).

## 9. Open questions

1. Should the flow map support bilateral comparison (imports vs exports) in the same view or via toggle?
2. What retention policy applies to scheduled reports and generated exports?
3. Do we need to expose HS6-level detail or stop at HS4 for performance and confidentiality reasons?
4. How do we integrate near-real-time customs alerts (RSS, email ingestion) into the collaboration feed?
