## Summary

Describe the change (scope, motivation, user or technical impact).

## Details / decisions

- Design choices or tradeoffs
- Documentation or configuration impact

## Anti-duplication checklist

- [ ] I reviewed docs/ecosystem/ECOSYSTEM-MAP.md
- [ ] I confirmed whether this capability already has a canonical repo
- [ ] If reusable by 2+ repos, I proposed a shared @openg7/\* package instead of copy/paste
- [ ] I did not introduce canonical domain logic into openg7-nexus

## Tests

- [ ] `yarn lint`
- [ ] `yarn format:check`
- [ ] `yarn validate:selectors`
- [ ] `yarn codegen && yarn test`
- [ ] `yarn predeploy:cms-cache`
- [ ] `yarn prebuild:web`
- [ ] Other (specify):

## Review

- [ ] Docs updated (README, docs, or comments)
- [ ] Screenshot attached if UI
- [ ] Linked issue referenced
