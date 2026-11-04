## Summary

<!-- What does this PR add or change? One sentence. -->

## Spec checklist

<!-- If this PR adds or modifies a spec, complete the checklist below. -->

- [ ] Folder: `specs/{category}/{provider_slug}/{capability}/`
- [ ] Contains exactly `schema.json` + `canonical_example.ts` — nothing else
- [ ] All required ATSS fields present in `schema.json`
- [ ] `gotchas[]` has at least 1 specific, actionable and sourced entry (ATSS.md § Gotchas — writing guide)
- [ ] `canonical_example.ts` uses native fetch only (no npm imports)
- [ ] `canonical_example.ts` reads credentials from `process.env`
- [ ] `npm run validate` passes with zero errors
- [ ] `status` set to `draft` or `ready` (never `verified`)

## Sources

<!-- For each gotcha or open question added or changed: the docs URL and section (for private docs, the file and where in it), the test run, the integration or the report. -->

## Type of change

- [ ] New spec
- [ ] Fix (schema field, gotcha, TypeScript error)
- [ ] Docs
- [ ] Tooling / CI
