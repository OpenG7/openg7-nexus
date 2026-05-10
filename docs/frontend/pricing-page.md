# `/pricing` page blueprint

This document imagines the dedicated pricing experience for the OpenG7 platform. It outlines the target layout, data dependencies, interactions, and analytics hooks so the design and development teams can converge on the same mental model before building the Angular views and Strapi content types.

## 0. Implementation snapshot (2026-02-10)

The current implementation in `src/app/domains/marketing/pages/pricing.page.ts` and `src/app/domains/marketing/pages/pricing.page.html` now includes:

- Auth-aware plan state:
  - current plan badge and ring
  - recommended next plan badge and emphasis
- Mobile-first matrix rendering:
  - stacked cards on mobile (`data-og7="pricing-matrix-mobile"`)
  - desktop table kept for large screens (`data-og7="pricing-matrix-desktop"`)
- Sticky conversion bar:
  - fixed bottom CTA module (`data-og7="pricing-sticky-cta"`)
  - billing cycle quick toggle (`data-og7="pricing-sticky-cycle"`)
- Additional testing hooks:
  - `data-og7-plan` and `data-og7-plan-state` on each plan card
- New i18n labels:
  - `pages.pricing.planCards.currentLabel`
  - `pages.pricing.planCards.recommendedLabel`

The rest of this document remains the target blueprint and can be delivered incrementally.

## 1. Page goals

- Help visitors understand the value ladder between the **Explorer (free)**, **Analyst (paid)**, and **Enterprise (custom)** plans.
- Provide enough detail for procurement teams (feature matrix, security posture, service-level guarantees).
- Make it effortless to start a paid journey (self-serve checkout for Analyst, sales contact for Enterprise) while maintaining a low-friction path to keep using the free tier.
- Surface social proof and risk-reversal elements (testimonials, FAQ, compliance badges) to reduce hesitation.

## 2. Information architecture & layout

| Fold           | Section                        | Purpose                                                                             |
| -------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| Above the fold | Hero + plan switcher           | Immediate clarity, highlight Analyst differentiators, CTA "Start Analyst trial".    |
| Fold 1         | Pricing cards                  | Three tiers with concise description, key metrics, and CTAs.                        |
| Fold 2         | Feature comparison             | Matrix showing availability (checkmark, dash) for strategic capabilities.           |
| Fold 3         | Usage-based add-ons            | Showcase optional modules (data export API, premium support) with per-unit pricing. |
| Fold 4         | Testimonials carousel          | Two quotes from provincial partners and one from a sustainability team.             |
| Fold 5         | FAQ + compliance badges        | Address procurement questions and show SOC2 / ISO icons.                            |
| Bottom         | Secondary CTA & contact banner | Sticky support CTA, fallback email + phone.                                         |

The base layout uses the shared marketing shell (`<og7-marketing-layout>`): top navigation, sticky header when scrolling, and the standard footer with legal links. A breadcrumb (`Home / Pricing`) appears below the hero to assist deep-linked visitors.

## 3. Content modeling (Strapi)

Create a new single type `pricing-page` with the following schema:

- `hero`: component `marketing.hero` (title, subtitle, background illustration, primary CTA link, secondary CTA link).
- `plans`: repeatable component `marketing.planCard` with fields:
  - `planKey`: enum (`explorer`, `analyst`, `enterprise`).
  - `monthlyPrice`, `yearlyPrice`, `priceCurrency`.
  - `description`, `highlightedFeatures` (array of short bullet strings).
  - `ctaLabel`, `ctaType` (`internalLink`, `externalLink`, `contactModal`).
  - `ctaTarget` (URL or route segment).
- `featureMatrix`: dynamic zone with components `marketing.featureRow` (`label`, `explorer`, `analyst`, `enterprise`, `tooltip`).
- `addons`: component `marketing.addonCard` (`title`, `description`, `unitPrice`, `unitName`, `badge`).
- `testimonials`: relation to `marketing.testimonial` entries, enabling translation of quotes and attribution.
- `faqEntries`: component `marketing.faqItem` (`question`, `answer`, `category`).
- `complianceBadges`: media list (SVG icons) with alt text and legal copy.

All textual fields support localisation (`fr`, `en`). The Strapi draft & publish flow allows marketing to preview changes before deploying.

## 4. Angular implementation sketch

### 4.1 Route & resolver

- Add a lazy-loaded route in `src/app/domains/marketing/pricing/pricing.routes.ts`.
- The `PricingPageResolver` fetches `pricing-page` from Strapi via the existing `CmsPageService` and exposes typed view models (plan pricing, feature flags, addons).
- Guard the route with `canMatchFeature('marketingSite')` to keep staging deployments configurable.

### 4.2 Component structure

```
src/app/domains/marketing/pricing/
├─ pricing.page.ts        // standalone component wiring sections
├─ pricing.page.html      // layout composition
├─ pricing.page.scss      // themed styles (CSS variables, dark-mode support)
├─ pricing-hero.component.*
├─ pricing-plan-card.component.*
├─ pricing-feature-table.component.*
├─ pricing-addons.component.*
├─ pricing-testimonials.component.*
└─ pricing-faq.component.*
```

Each leaf component receives inputs from the page container, favouring `signal` inputs for reactivity. Animations leverage Angular's built-in `@trigger` definitions to fade cards and slide the comparison table on scroll.

### 4.3 Interactions & state

- **Billing toggle**: a segmented control (Monthly / Annual) sits in the hero. Toggling updates a signal `billingCycle` consumed by `pricing-plan-card` to display the correct price. Annual pricing shows the equivalent monthly cost and highlights the discount (computed from plan metadata).
- **Plan cards**:
  - Explorer → CTA opens the signup modal (`AuthFacade.openSignup()`), preserving the intended next URL `/app/dashboard` after authentication.
  - Analyst → CTA points to `/checkout?plan=analyst&cycle={billingCycle}`; disable button if the user already has an active subscription (`SubscriptionFacade.isActive('analyst')`).
  - Enterprise → CTA triggers `ContactModalService.open({ topic: 'enterprise-pricing' })` and pre-fills form with page context.
- **Feature table**: hover tooltips use the shared `og7-tooltip` directive. Rows are grouped (Data, Collaboration, Support). On mobile, the table collapses into accordions per row with plan badges stacked vertically.
- **Testimonials**: slider with auto-play (6-second interval) and manual controls for accessibility (`aria-live="polite"`).
- **FAQ**: accordions with deep links (`/pricing#faq-data-security`). Query params `?scroll=plan-analyst` allow marketing campaigns to scroll to a specific section after load.

## 5. Visual & brand cues

- Colour palette: Analyst accents use the teal gradient (`--og7-accent-teal`), Explorer sticks to neutral blues, Enterprise uses gold highlights.
- Icons: inline SVGs pulled from `@openg7/ui/icons` to avoid layout shifts.
- Background: hero includes a subtle animated line chart referencing interprovincial trade flows.
- Ensure 12-column grid alignment with 80px gutters on desktop, collapsing to 4 columns on tablets and a single column on mobile.

## 6. Analytics & experimentation

- Fire `pricing_page_viewed` event on init with `planCount`, `hasActiveSubscription`, and `billingCycle` properties.
- Track CTA interactions (`pricing_cta_clicked`) with `planKey`, `ctaType`, `billingCycle`, `authState` to inform conversion funnels.
- Expose experiment slots (`pricing.hero.cta`, `pricing.planCard.copy`) controlled by the feature flag service; fallback to baseline copy when experiments are inactive.
- Record scroll depth quartiles using the global analytics service; send once per session.

## 7. Performance & accessibility

- Lazy-load testimonial images via `ngOptimizedImage`.
- Prefetch `/checkout` chunk when the Analyst CTA enters the viewport (IntersectionObserver).
- Ensure a minimum colour contrast ratio of 4.5:1 on all text; test both light and dark themes.
- Provide keyboard focus states for billing toggle and CTA buttons; arrow keys should navigate plan cards when focused.
- Use semantic landmarks (`<main>`, `<section aria-labelledby=...>`) and ensure heading hierarchy (`h1` in hero, `h2` for major sections).

## 8. Roll-out checklist

1. Seed `pricing-page` content in Strapi with FR/EN translations and publish draft.
2. Implement the Angular domain folder, components, and route wiring; cover the resolver with unit tests mocking Strapi responses.
3. Connect analytics events and verify they respect RBAC gating for premium analytics.
4. Run Lighthouse (desktop + mobile) and axe audits; fix regressions before release.
5. Prepare marketing copy for release notes and update `/app/dashboard` banner to advertise the Analyst trial.
