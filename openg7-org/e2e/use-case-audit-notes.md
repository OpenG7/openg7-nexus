# Use-Case Audit Notes

This note complements `e2e/use-case-audit.spec.ts`.

## Covered by the audit spec

- Public discovery surfaces: `features`, `sectors`, `pricing`, `statistics`
- Authenticated company flows: company registration surface, manual import, bulk import
- Importation flows: overview, map, commodities, suppliers, watchlists, report scheduling
- Account flows: profile shell, export, active sessions, favorites
- Network/admin flows: linkups, partner details, enterprise page, company moderation, ops dashboard

## Gap-closure E2E coverage

The gaps previously tracked below are now covered by the dedicated regression spec `e2e/use-case-audit-gap-coverage.spec.ts`.

1. `src/app/domains/enterprise/pages/company-register.page.html`
The full stepper submission is now exercised end-to-end, including nested `general`, `capacities`, and `logos` groups and the final `POST /api/companies` payload.

2. Auth persistence across full reloads
Protected routes are now covered through hard reloads with persisted local session restoration. The regression spec verifies `/profile` survives a full reload and still grants access to other protected pages such as `/favorites`.

3. `src/app/domains/account/pages/profile.page.*`
The regression spec now covers profile persistence end-to-end: profile save, password change, email-change request, and state restoration after reload.

4. `src/app/domains/admin/pages/admin-trust.page.html`
The admin trust page now has a full persistence path in E2E, including adding a verification source, adding a trust-history entry, saving, and validating the persisted state after reload.
