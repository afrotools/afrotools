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
- Python 3.9+ (for live API verification)
- `npm install` at the repo root

---

## Adding a spec

You can add a spec manually (steps below) or use the `/afrotools:new` skill to automate
the process. The skill reads the provider's API documentation and scaffolds `provider.json`,
`schema.json`, and `canonical_example.ts` for every capability it finds, then runs validation.

Before invoking the skill, always refresh it to the latest version:

```bash
claude plugin update afrotools
```

Then point it at the provider's docs URL — category and provider slug are inferred
automatically and do not need to be passed:

```
/afrotools:new https://docs.example.com/api
```

If the provider's docs are behind a login or not publicly accessible, point the skill at a
local file instead:

```
/afrotools:new ./my-provider-docs.html
```

The local file can be any documentation format the provider gave you — an OpenAPI/Swagger
JSON or YAML file, a PDF, an exported HTML page, or a Postman collection. Save it locally
and point the skill at it directly.

Whether you use the skill or work manually, the live API verification step (§ 7 below)
applies to both.

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

### 7. Verify response schemas against the live API (strongly recommended)

Static validation checks structure and compilation, but it cannot catch mismatched field
names, wrong types, or sandbox-specific gaps in `response_schema`. Live verification
catches real discrepancies before they mislead AI agents.

**How it works:**

Create a `live_test_fixtures.json` file in the provider directory
(`specs/{category}/{provider_slug}/live_test_fixtures.json`) that describes the test steps
and their payloads. The generic `scripts/test_live.py` script reads this file, authenticates
using `auth` config from each `schema.json`, calls the actual API, and diffs the response
against the spec's `response_schema`.

You do not need to write this file by hand — ask an AI agent to generate it from the
`schema.json` files and the capability folder list. Ask it to order steps so resources are
created before they are referenced, use `$ts` for unique values (references, emails), and
wire cross-step dependencies with `$step_name.data.field`. Review the result, fill in any
provider-specific test values (phone numbers, bank codes, amounts), then commit it.

Fixture format:

```json
{
  "oauth2_token_url": "https://idp.example.com/token",
  "sandbox_base_url": "https://sandbox-api.example.com",
  "steps": [
    {
      "capability": "list_customers",
      "query_params": { "page": 1, "size": 10 }
    },
    {
      "capability": "create_customer",
      "body": { "email": "test@afrotools.dev", "name": { "first": "Test", "last": "User" } },
      "store_as": "customer"
    },
    {
      "capability": "create_charge",
      "body": {
        "customer_id": "$customer.data.id",
        "amount": 1,
        "currency": "GHS"
      }
    }
  ]
}
```

Key fixture fields:
- `oauth2_token_url` — required when `auth.type == "oauth2"`
- `sandbox_base_url` — replaces the production host with the sandbox host for all requests
- `store_as` — stores the full response under a name so later steps can reference it
- `$step_name.field.nested` — references a value from a previous step's stored response
- `auth_secondary_env` — required when `auth.type == "basic"` needs two env vars

**Run it:**

```bash
export PROVIDER_CREDENTIALS="..."   # the env var declared in auth.env_var
npm run test:live -- --provider {slug}
```

Output:
- ✅ Field present in spec and response
- ❌ Required field missing from response → fix the spec or the fixture
- 〰  Optional field absent from response → likely conditional; add a description to the field
- ⚠️  Field present in response, absent from spec → add it to `response_schema`

**Tips:**
- Use a sandbox key or minimal test amounts — never a production key with real funds.
- If the provider has no sandbox (`"sandbox": false` in `provider.json`), the script prints a
  warning before running. Proceed with care.
- Commit `live_test_fixtures.json` alongside `provider.json` — it contains no credentials,
  only test shapes and sequencing logic. Other contributors benefit from it.

If you skip live verification, add this gotcha to every spec whose response was not verified:

```
"response_schema not verified against live API — validate field names and types before shipping."
```

### 8. Set status

Set `"status": "draft"` while working, `"ready"` once validation passes and you are satisfied
with the spec. Never set `"verified"` — that is reserved for maintainers.

### 9. Open a PR

Fill in the PR template. The CI workflow will re-run validation.

### 10. After merge

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
