# Contributing to Afro.tools

Thank you for helping expand AI-ready coverage for African APIs.

---

## What you can contribute

- **New spec** — a `schema.json` + `canonical_example.ts` for a provider/capability not yet in the registry
- **Fix** — correcting a field, improving gotchas, or fixing a compilation error
- **Docs** — improving ATSS.md, README, or this file

---

## Prerequisites

- Node.js 20+
- `npm install` at the repo root

---

## Adding a spec

1. **Create a branch**
   ```bash
   git checkout -b spec/{provider}-{capability}
   ```

2. **Create the folder**
   ```
   specs/{category}/{provider_slug}/{capability}/
   ```
   - `category`: `payment` or `sms`
   - `provider_slug`: lowercase, no dashes, no spaces (e.g. `paycard`, `wave`, `nimbasms`)
   - `capability`: snake_case verb (e.g. `create_payment`, `send_otp`)

3. **Add `schema.json`**
   Use `schema.template.json` as a starting point. See [ATSS.md](./ATSS.md) for field rules.

4. **Add `canonical_example.ts`**
   - TypeScript strict — must compile with `tsc --noEmit`
   - Native fetch only — no npm imports
   - All credentials via `process.env`
   - Export the main function
   - Include a usage comment block at the bottom

5. **Validate**
   ```bash
   npm run validate
   ```
   Must pass with zero errors.

6. **Set status**
   Set `"status": "draft"` while working, `"compliant"` once validation passes.
   Never set `"verified"` — that is reserved for maintainers.

7. **Open a PR**
   Fill in the PR template. The CI workflow will re-run validation.

8. **After merge**
   Update `CHANGELOG.md` under `## [Unreleased]`.

---

## Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

| Type | When to use |
|---|---|
| `feat(provider)` | Adding a new spec |
| `fix(provider)` | Correcting a spec |
| `docs` | Documentation changes |
| `chore` | Tooling, CI, deps |

Examples:
```
feat(paycard): add create_payment spec
fix(wave): correct webhook auth field
docs: update ATSS gotcha writing guide
```

---

## Rules

- Every spec folder must contain exactly `schema.json` + `canonical_example.ts` — nothing else
- Never hardcode API keys or secrets
- Never add `package.json` inside a spec folder
- Never use `require()` or npm imports in `canonical_example.ts`
- Never push directly to `main` — all changes go via PR
- Squash merge only

---

## Questions

Open an issue or start a discussion in the repo.
