// Intentionally empty: Playwright's webServer lifecycle already waits for the
// Angular app before the suite starts. Reintroducing a custom beforeAll probe
// here would create a second readiness gate with its own timeout semantics.
export {};
