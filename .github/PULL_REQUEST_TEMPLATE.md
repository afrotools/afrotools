## Summary

<!-- What does this PR add or change? One sentence. -->

## Spec checklist

<!-- If this PR adds or modifies a spec, complete the checklist below. -->

- [ ] Folder: `specs/{category}/{provider_slug}/{capability}/`
- [ ] Contains exactly `schema.json` + `canonical_example.ts` — nothing else
- [ ] All required ATSS fields present in `schema.json`
- [ ] `gotchas[]` has at least 1 specific, actionable entry
- [ ] `canonical_example.ts` uses native fetch only (no npm imports)
- [ ] `canonical_example.ts` reads credentials from `process.env`
- [ ] `npm run validate` passes with zero errors
- [ ] `status` set to `draft` or `compliant` (never `verified`)

## Type of change

- [ ] New spec
- [ ] Fix (schema field, gotcha, TypeScript error)
- [ ] Docs
- [ ] Tooling / CI
