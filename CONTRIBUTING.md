# Contributing to Afro.tools

Thank you for helping expand AI-ready coverage for African APIs.

---

## What you can contribute

- **New spec** — a `provider.json` + `schema.json` + `canonical_example.ts` for a provider/capability not yet in the registry
- **Fix** — correcting a field, improving gotchas, or fixing a compilation error
- **Docs** — improving ATSS.md, README, or this file

---

## Prerequisites

- Node.js 20+
- `npm install` at the repo root

---

## Adding a spec

### 1. Create a branch

```bash
git pull origin main

# New provider (all capabilities in one PR):
git checkout -b spec/{provider_slug}

# Adding capabilities to an existing provider:
git checkout -b spec/{provider_slug}-{short-description}
# e.g. spec/wave-payouts, spec/nimbasms-contacts
```

### 2. Create the folder structure

```
specs/{category}/{provider_slug}/
├── provider.json                ← create once per provider
└── {capability}/
    ├── schema.json
    └── canonical_example.ts
```

- `category`: `payment` or `sms`
- `provider_slug`: lowercase. Single-word providers use no separator (e.g. `wave`, `nimbasms`). Compound or geographic variants may use hyphens (e.g. `orangemoney-mali`).
- `capability`: snake_case verb (e.g. `create_payment`, `send_message`)

### 3. Add `provider.json`

Create `specs/{category}/{provider_slug}/provider.json` if it does not already exist:

```json
{
  "slug": "wave",
  "name": "Wave",
  "category": "payment",
  "country_code": ["SN", "CI", "ML"],
  "website": "https://www.wave.com",
  "docs_url": "https://docs.wave.com/business",
  "docs_public": true,
  "sandbox": false,
  "description": "One factual sentence describing the provider.",
  "example_prompt": "Full integration scenario for AI agents."
}
```

All 10 fields are required. If the provider already has a `provider.json`, do not overwrite it.

### 4. Add `schema.json`

Use `schema.template.json` as a starting point. See [ATSS.md](./ATSS.md) for field rules.

> **Do not include** `provider_slug`, `provider_name`, `category`, `country_code`, `sandbox`,
> `docs_url`, or `docs_public` in `schema.json` — these fields have been moved to `provider.json`.

### 5. Add `canonical_example.ts`

- TypeScript strict — must compile with `tsc --noEmit`
- Native fetch only — no npm imports
- All credentials via `process.env`, checked at the top with an explicit `throw`
- Explicit TypeScript interfaces for input, response, and error types
- Export the main function
- Include a usage comment block at the bottom

### 6. Validate

```bash
npm run validate:changed   # faster during development — only validates changed specs
npm run validate           # full registry check — run before opening a PR
```

Must pass with zero errors.

### 7. Set status

Set `"status": "draft"` while working, `"ready"` once validation passes and you are satisfied
with the spec. Never set `"verified"` — that is reserved for maintainers.

### 8. Open a PR

Fill in the PR template. The CI workflow will re-run validation.

### 9. After merge

Update `CHANGELOG.md` under `## [Unreleased]`.

---

## Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

| Type | When to use |
|---|---|
| `feat(provider)` | Adding a new spec |
| `fix(provider)` | Correcting a spec |
| `docs` | Documentation changes |
| `plugin(skill)` | Updating a skill in `plugin/skills/` |
| `chore` | Tooling, CI, deps |

Examples:
```
feat(wave): add create_checkout_session spec
fix(wave): correct webhook auth field
docs: update ATSS gotcha writing guide
plugin(new): add live API verification phase
```

---

## Updating plugin skills

The Claude Code plugin is distributed via the marketplace. When a user installs it,
the skill files are **frozen in a local cache** at that git commit. Updates pushed to
the repo do not propagate automatically — users keep running the cached version until
they explicitly refresh.

### If your PR touches `plugin/skills/`

After your PR is merged, anyone using the plugin must refresh their cache to get
the new skill version:

```bash
claude plugin update afrotools
```

Until they do, their agent will run the old skill. Document this in your PR description
so reviewers know to update.

### For contributors working in this repo

If you pull changes that include skill updates (any commit with type `plugin(skill)`),
run the update command before your next `/afrotools:*` invocation:

```bash
git pull origin main
claude plugin update afrotools   # refresh cache to match current repo
```

### Long-term solution (not yet implemented)

The proper fix is a `plugin/plugin.json` manifest with a `version` field. Every PR
that touches `plugin/skills/` should bump that version — Claude Code will then detect
the version mismatch and prompt users to update automatically, without any manual step.

This is tracked as a future improvement. When implemented:
1. Add `plugin/plugin.json` with `{ "version": "x.y.z" }`
2. Any PR touching `plugin/skills/` must bump the version as part of the change
3. CI should fail if skills changed but version was not bumped

---

## Rules

- Every capability folder must contain exactly `schema.json` + `canonical_example.ts` — nothing else
- Every provider directory must have a `provider.json`
- Never add `provider_slug`, `category`, `country_code`, `sandbox`, `docs_url`, or `docs_public` to `schema.json`
- Never hardcode API keys or secrets
- Never add `package.json` inside a spec folder
- Never use `require()` or npm imports in `canonical_example.ts`
- Never push directly to `main` — all changes go via PR
- Squash merge only

---

## Questions

Open an issue or start a discussion in the repo.
