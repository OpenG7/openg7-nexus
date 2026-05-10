# Review: `/linkup/302` UX & Behavior

## Observed behavior

- Navigating directly to `/linkup/302` shows the "match not found" empty state instead of the supplier profile.
- The quick actions shown on partner profiles build a link of the form `/linkup/<partnerId>` (e.g. `/linkup/302`).
- The linkup page only accepts **opportunity match IDs** (`OpportunityMatch.id`) in the route parameter and treats every other value as missing/invalid.

## Root cause analysis

- `PartnerQuickActionsComponent` derives its `connectLink` from the partner ID that is available in the profile card. That means the generated URL encodes the supplier ID rather than a match ID. 【F:openg7-org/src/app/domains/partners/partners/ui/partner-quick-actions.component.ts†L71-L80】
- `Og7LinkupPageComponent` parses the route parameter as a number and looks it up in the opportunity matches list, falling back to the `loadMatchById` API call. When the ID corresponds to a partner (e.g. `302`), no match is found and the empty state is displayed. 【F:openg7-org/src/app/domains/matchmaking/pages/linkup/og7-linkup-page.component.ts†L43-L159】
- Home page entry points pass a real match ID when they navigate to the linkup page, so the bug only appears for the links coming from partner profiles. 【F:openg7-org/src/app/domains/home/pages/home/og7-home-page.component.ts†L84-L99】

## UX impact

- Users who click "Connect" from a partner profile are sent to an empty screen, which breaks the main call-to-action and undermines trust in the matchmaking flow.
- The "match not found" copy is misleading in this context: the user started from a valid partner profile, so they expect continuity rather than an error message.

## Recommendations

1. Align the partner quick-action link with the contract expected by the linkup page. Two possible approaches:
   - Propagate the _match_ identifier into the partner quick actions (for example, by passing the active `OpportunityMatch` object down to the component) so the generated link remains `/linkup/<matchId>`.
   - Or, extend the linkup route handler so it can resolve a partner ID to a match (e.g. look for the first match where `seller.id === routeId`).
2. Regardless of the solution above, adjust the empty-state copy to acknowledge invalid IDs more gracefully ("Nous n'avons pas trouvé cette mise en relation"), and offer context-aware recovery actions (e.g. "Retour au profil partenaire" or "Explorer les opportunités") to keep the user engaged.

Addressing point (1) restores the happy path from partner profiles to the linkup experience. Point (2) ensures that users who still land on an unknown ID receive a clearer explanation and can continue exploring without friction.
