# Contributing to Afro.tools

Thank you for helping expand AI-ready coverage for African APIs.

---

## What you can contribute

- **New spec** — a `provider.json` + `schema.json` + `canonical_example.ts` for a provider/capability not yet in the registry
- **Fix** — correcting a field, improving gotchas, or fixing a compilation error
- **Docs** — improving ATSS.md, README, or this file
- **Integration report** — you integrated a provider from its spec: tell us whether it matched the API (below)

---

## Report an integration

The maintainers cannot test every provider in production. If you integrated one from its spec —
in sandbox or in production — [open an integration report](https://github.com/afrotools/afrotools/issues/new?template=integration-report.yml), whether it worked or not.
One report covers a whole flow of one provider (e.g. payment init, status check, webhook): list
each capability you used with its own result.
With the Afro.tools MCP, ask your agent: it calls `report_integration` and gives you a pre-filled
link; you choose the environment and the outcome, check that no secret is in it, and submit.
The agent never submits anything itself.

- **It worked** — a maintainer checks the report and records it as the proof of each capability
  that worked: `status: "verified"` with `verification.method: "community_report"` and a link to
  your issue (ATSS.md § verified). You are credited as a contributor.
- **A spec is wrong** — the report becomes a fix: the field, status code or gotcha is corrected
  from your response and the provider's docs.

---

## Prerequisites

- Node.js 20+
- Python 3.9+ (for live API verification) — `pip install jsonschema` (`test:live` checks responses
  with it), plus `pip install certifi` if you hit a TLS certificate error (common on macOS
  python.org builds)
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

- `category`: `payment`, `communications` (SMS, WhatsApp, USSD, voice, email) `identity` (KYC, document verification, AML) or `logistics` (delivery, couriers, parcel tracking)
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

All 10 fields are required. Providers in the `communications` category also require
`channels` — a non-empty array of the channels the provider's docs document, among
`sms`, `whatsapp`, `ussd`, `voice`, `email` (e.g. `"channels": ["sms", "whatsapp"]`).
If the provider already has a `provider.json`, do not overwrite it.

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
using `auth` config from each `schema.json`, calls the actual API, and checks each response against
the spec: the HTTP status, the whole `response_schema` (types, nested fields, the `oneOf` branch the
response matches) and `success_condition` when the spec has one.

You do not need to write this file by hand — ask an AI agent to generate it. Share the
`schema.json` files and the list of capability folders, then review the result and commit it.

Fixture format:

```json
{
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
- `sandbox_base_url` — replaces the production host with the sandbox host for all requests. Not
  needed when `provider.json` declares `environments.sandbox` (ATSS 1.1), which `test:live` reads
  first — as it reads the token request from the spec's `auth.token_exchange`
- `store_as` — stores the full response under a name so later steps can reference it
- `$store_as_value.field.nested` — references a value from a previous step's stored response
- `auth_secondary_env` — a second env var the run needs: the password half of `basic` auth, or a
  second credential (e.g. a partner ID) that steps send through `$env:NAME` in their `headers`
- `$env:NAME` — references an environment variable (typically in a step's `headers`)
- `content_type` (per step) — `application/json` (default), `application/x-www-form-urlencoded`, or
  `multipart/form-data` (nested objects/arrays are sent as JSON strings; file uploads aren't supported)
- `skip_auth` (per step) — don't send the schema-derived auth on this step: use it for a
  token-exchange call that carries its own credentials in `headers`, or an unauthenticated endpoint
- `wait_seconds` (per step) — pause before the step, e.g. so an async job created by an earlier
  step is visible before its status is read
- `expected_status` (per step) — HTTP status codes that count as success (default: any 2xx). A step
  fails when the call doesn't succeed, unless its error is listed in `acceptable_error_codes`. A
  non-2xx expected status (a negative test) checks the status only: `response_schema` describes a success
- `acceptable_error_codes` (per step) — prefixes of the response's `details` that are an expected
  sandbox error, not a failure

A run fails (exit 1) when any step gets an unexpected HTTP status, gets a response that breaks
`response_schema` or `success_condition`, or is skipped: missing schema, a `$name.field` from an
earlier step that returned nothing (in `path_params`, `query_params`, `body` or `headers`), an empty
path param, or an `endpoint.url` placeholder no `path_params` fills. Elsewhere, an unset `$env:NAME`
is sent as an empty string.

**Run it:**

```bash
export PROVIDER_CREDENTIALS="..."   # the env var declared in auth.env_var —
                                    # or each one of auth.credentials (ATSS 1.1)
npm run test:live -- --provider {slug} --report live-report.json
```

Output:
- ✅ The call succeeded and the response matches the spec
- ❌ Where the response breaks `response_schema` (path and reason) or `success_condition` → fix the
  spec or the fixture
- ⚠️  Field present in the response, absent from the spec → worth adding to `response_schema`, not
  blocking

`--report` writes a JSON report: per step, the HTTP status, the result, the errors and the
`spec_hash` that was tested, with the date and the registry commit. The `spec_hash` of a `pass` step
is the value its `verification` block records; an `expected_error` step proves nothing about the
response. The report never contains a response value. Attach it to your PR, or link the GitHub Actions run, which keeps it as an artifact.

**Tips:**
- The script only ever targets a sandbox. If the provider has no sandbox
  (`"sandbox": false` in `provider.json`), it **refuses to run** — there is no override.
  Verify a no-sandbox provider through a working integration in `afrotools/examples` instead.
- Commit `live_test_fixtures.json` alongside `provider.json` — it contains no credentials,
  only test shapes and sequencing logic. Other contributors benefit from it.
- You can also trigger this from GitHub Actions (`Live test` workflow, manual dispatch) if
  you'd rather not run it locally. It only works for a provider that already has a GitHub
  Environment set up with its credentials — that's a repo-settings action a maintainer does
  once per provider (see the comment header in `.github/workflows/live-test.yml` for the exact
  steps). If your provider doesn't have one yet, ask a maintainer to add it, or just run
  `test:live` locally instead — you don't need to wait for it.

If you skip live verification, add this gotcha to every spec whose response was not verified:

```
"response_schema not verified against live API — validate field names and types before shipping."
```

### 8. Set status

Set `"status": "draft"` while working, `"ready"` once validation passes and you are satisfied
with the spec. Never set `"verified"` — that is reserved for maintainers.

**How a `ready` spec becomes `verified` (this is not automatic — someone has to act):**

- **Provider has a sandbox** (`provider.json.sandbox: true`) — write `live_test_fixtures.json`
  (§ 7) and make sure `npm run test:live -- --provider {slug}` passes. Link the passing run
  (local output or the GitHub Actions run URL) in your PR description. A maintainer reviews
  and flips the status.
- **Provider has no sandbox** — verification requires a working integration in
  `afrotools/examples`. If you can't build one yourself, say so in the PR; it stays `ready`
  (visible in the MCP, with an explicit "not yet verified" warning to agents) until someone does.

- **Someone integrated it** — an accepted [integration report](#report-an-integration) is
  enough, in sandbox or in production.

The maintainer records the proof in the spec's `verification` block (method, environment, date,
link, `spec_hash` — see ATSS.md § Blocks added in ATSS 1.1). `npm run validate` rejects a
`verified` spec without it, and a verified spec edited afterwards until it is verified again.

If your PR adds a spec and none of these paths applies yet, that's fine — `ready` is a real, useful
state. Don't block a spec's merge on getting it to `verified`.

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
