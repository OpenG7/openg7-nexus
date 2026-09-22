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

Select checks from [the validation matrix](../docs/agents/validation.md) for the
changed surface. List commands actually run, results and justified omissions.
Documentation only: node scripts/check-project-standards.mjs and git diff --check.
Seed and release commands require the corresponding authorized environment.

## Review

- [ ] Docs updated (README, docs, or comments)
- [ ] Screenshot attached if UI
- [ ] Linked issue referenced
