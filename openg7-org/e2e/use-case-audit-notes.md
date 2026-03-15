# Use-Case Audit Notes

This note complements `e2e/use-case-audit.spec.ts`.

## Covered by the audit spec

- Public discovery surfaces: `features`, `sectors`, `pricing`, `statistics`
- Authenticated company flows: company registration surface, manual import, bulk import
- Importation flows: overview, map, commodities, suppliers, watchlists, report scheduling
- Account flows: profile shell, export, active sessions, favorites
- Network/admin flows: linkups, partner details, enterprise page, company moderation, ops dashboard

## Product gaps observed during E2E stabilization

1. `src/app/domains/enterprise/pages/company-register.page.html`
The template binds `formControlName` values from nested groups (`general`, `logos`, `capacities`) without the corresponding `formGroup` / `formGroupName` wrappers. The audit therefore validates the page surface only, not the end-to-end submission of the full stepper.

2. Auth persistence across full reloads
After an interactive login, protected routes reached through a hard document navigation can lose the authenticated session during bootstrap restore. The audit works around this by re-authenticating before each protected route reached through a fresh navigation.

3. `src/app/domains/account/pages/profile.page.*`
The main profile form and security subforms did not enter a dirty/submittable state through browser-driven input automation, even though visible field values changed. The audit covers profile read/export/session/favorites use cases, but not profile save, password change, or email change persistence.

4. `src/app/domains/admin/pages/admin-trust.page.html`
The page nests forms inside another form. In browser automation this makes the final "Save changes" persistence flow unsafe/flaky. The audit verifies trust-source editing at UI level, but not backend persistence for that page.
